import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('🧪 [Test Function] Request received')
    console.log('🧪 [Test Function] Method:', req.method)
    console.log('🧪 [Test Function] URL:', req.url)
    
    // Check environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripePublishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY')
    
    console.log('🧪 [Test Function] Environment check:', {
      hasSecretKey: !!stripeSecretKey,
      hasPublishableKey: !!stripePublishableKey,
      secretKeyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 7) : 'none',
      publishableKeyPrefix: stripePublishableKey ? stripePublishableKey.substring(0, 7) : 'none'
    })
    
    // Try to parse body
    let body = null;
    try {
      const bodyText = await req.text();
      console.log('🧪 [Test Function] Raw body:', bodyText);
      if (bodyText) {
        body = JSON.parse(bodyText);
        console.log('🧪 [Test Function] Parsed body:', body);
      }
    } catch (parseError) {
      console.log('🧪 [Test Function] Body parse error:', parseError);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function working!',
        environment: {
          hasSecretKey: !!stripeSecretKey,
          hasPublishableKey: !!stripePublishableKey
        },
        receivedBody: body
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('🧪 [Test Function] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Test function error',
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
