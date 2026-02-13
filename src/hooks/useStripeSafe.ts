import { useStripe } from '@stripe/stripe-react-native';
import { isLowEndDevice } from '../utils/deviceCapabilities';

// Cached at module level — constant for app lifetime
const _stripeDisabled = isLowEndDevice();

const noopStripe = {
  initPaymentSheet: async () => ({
    error: {
      code: 'DeviceUnsupported' as const,
      message: 'Payments not available on this device',
    },
  }),
  presentPaymentSheet: async () => ({
    error: {
      code: 'DeviceUnsupported' as const,
      message: 'Payments not available on this device',
    },
  }),
};

/**
 * Safe wrapper around useStripe() that returns no-op functions on low-end devices
 * where StripeProvider is not mounted (to avoid native TurboModule SIGSEGV crash).
 */
export function useStripeSafe() {
  // On low-end devices, StripeProvider is not mounted to avoid native crash.
  // _stripeDisabled is a module-level constant so this branch is stable across renders.
  if (_stripeDisabled) {
    return noopStripe;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useStripe();
}
