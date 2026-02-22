// Web shim for @stripe/stripe-react-native
export const useStripe = () => ({
  initPaymentSheet: async () => ({ error: { message: 'Stripe not available on web' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Stripe not available on web' } }),
  confirmPayment: async () => ({ error: { message: 'Stripe not available on web' } }),
});

export const StripeProvider = ({ children }) => children;
export const CardField = () => null;
export const CardForm = () => null;
export default { StripeProvider, useStripe };
