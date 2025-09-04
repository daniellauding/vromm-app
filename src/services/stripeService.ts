import { initStripe, useStripe } from '@stripe/stripe-react-native';

// Stripe configuration - keys should be set via environment variables
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

// Initialize Stripe
export const initializeStripe = async () => {
  try {
    await initStripe({
      publishableKey: STRIPE_PUBLISHABLE_KEY,
      merchantIdentifier: 'merchant.se.vromm.app', // Your merchant ID
      urlScheme: 'vromm', // Your app's URL scheme
    });
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Stripe:', error);
  }
};

// Stripe payment service
export const stripeService = {
  // Create payment intent (this should call your backend/Supabase Edge Function)
  createPaymentIntent: async (amount: number, currency: string = 'USD', metadata: any = {}) => {
    try {
      // In a real app, this would call your backend endpoint or Supabase Edge Function
      // Example: await supabase.functions.invoke('create-payment-intent', { body: { amount, currency, metadata }})
      
      // For testing, simulate the backend response
      const response = {
        paymentIntent: `pi_test_${Math.random().toString(36).substr(2, 9)}`,
        ephemeralKey: `ek_test_${Math.random().toString(36).substr(2, 9)}`,
        customer: `cus_test_${Math.random().toString(36).substr(2, 9)}`,
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        clientSecret: `pi_test_${Math.random().toString(36).substr(2, 9)}_secret_test`
      };
      
      console.log('💳 Created payment intent (simulated):', {
        amount,
        currency,
        metadata,
        paymentIntent: response.paymentIntent
      });
      
      return response;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },

  // Process payment with PaymentSheet
  processPayment: async (amount: number, description: string, metadata: any = {}) => {
    try {
      console.log('💳 Processing payment:', { amount, description, metadata });
      
      // Create payment intent
      const paymentData = await stripeService.createPaymentIntent(amount, 'USD', metadata);
      
      return {
        success: true,
        paymentIntentId: paymentData.paymentIntent,
        clientSecret: paymentData.clientSecret
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }
};

// Hook for using Stripe in components
export const useStripePayment = () => {
  const stripe = useStripe();
  
  const presentPaymentSheet = async (clientSecret: string) => {
    try {
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }
      
      // For testing, simulate successful payment
      console.log('💳 Simulating Stripe PaymentSheet with clientSecret:', clientSecret);
      
      // In a real implementation, this would show the actual Stripe PaymentSheet:
      // const { error } = await stripe.presentPaymentSheet();
      
      // Simulate user completing payment
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      return { success: true };
    } catch (error) {
      console.error('Error presenting payment sheet:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed' 
      };
    }
  };
  
  return {
    stripe,
    presentPaymentSheet
  };
};
