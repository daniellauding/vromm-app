import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('💳 [Edge Function] Payment intent request received')
    console.log('💳 [Edge Function] Request method:', req.method)
    console.log('💳 [Edge Function] Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripePublishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY')
    
    console.log('💳 [Edge Function] Environment check:', {
      hasSecretKey: !!stripeSecretKey,
      hasPublishableKey: !!stripePublishableKey,
      secretKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 7) : 'none',
      publishableKeyPrefix: stripePublishableKey ? stripePublishableKey.substring(0, 7) : 'none'
    })
    
    if (!stripeSecretKey) {
      console.error('💳 [Edge Function] Missing STRIPE_SECRET_KEY')
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    
    if (!stripePublishableKey) {
      console.error('💳 [Edge Function] Missing STRIPE_PUBLISHABLE_KEY')
      throw new Error('Missing STRIPE_PUBLISHABLE_KEY environment variable')
    }

    // Parse request body with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log('💳 [Edge Function] Raw request body:', bodyText);
      requestBody = JSON.parse(bodyText);
      console.log('💳 [Edge Function] Parsed request body:', requestBody);
    } catch (parseError) {
      console.error('💳 [Edge Function] Failed to parse request body:', parseError);
      throw new Error('Invalid request body format');
    }

    const { amount, currency = 'USD', metadata = {} } = requestBody;

    console.log('💳 [Edge Function] Extracted values:', { amount, currency, metadata });

    // Validate amount
    if (!amount || amount <= 0) {
      console.error('💳 [Edge Function] Invalid amount:', amount);
      throw new Error('Invalid amount');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid user token')
    }

    // Initialize Stripe with proper API version
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get user profile for customer creation
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    console.log('💳 [Edge Function] Creating customer for user:', user.id)

    // Create Stripe customer (simplified - no metadata search)
    let customer
    try {
      console.log('💳 [Edge Function] Creating new customer...')
      
      // Create new customer without metadata for now
      customer = await stripe.customers.create({
        name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: profile?.email || user.email || '',
      })
      console.log('💳 [Edge Function] Created new customer:', customer.id)
      
    } catch (customerError) {
      console.error('💳 [Edge Function] Customer creation error:', customerError)
      console.error('💳 [Edge Function] Customer error details:', {
        message: customerError.message,
        type: customerError.type,
        code: customerError.code
      })
      throw new Error(`Failed to create customer: ${customerError.message}`)
    }

    console.log('💳 [Edge Function] Creating ephemeral key...')

    // Create ephemeral key
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-10-16' }
    )

    console.log('💳 [Edge Function] Creating payment intent...')

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      customer: customer.id,
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: user.id,
        feature_key: metadata.feature_key || '',
        path_id: metadata.path_id || '',
        path_title: metadata.path_title || '',
        purchase_type: 'learning_path'
      }
    })

    console.log('✅ Created payment intent:', paymentIntent.id)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentClientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customerEphemeralKeySecret: ephemeralKey.secret,
        customer: customer.id,
        customerId: customer.id,
        publishableKey: stripePublishableKey,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error creating payment intent:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause,
      type: typeof error
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment intent',
        details: error.stack,
        type: error.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
