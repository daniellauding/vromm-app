import { Analytics } from '../lib/firebase';
import { Platform } from 'react-native';

const platform = Platform.OS; // 'ios' or 'android'

const safeLogEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  try {
    await Analytics.logEvent(eventName, {
      ...properties,
      platform,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // Silently fail individual analytics calls
    });
  } catch {
    // Silently fail if analytics isn't available
  }
};

// Temporarily disabled analytics to fix core functionality
export const AppAnalytics = {
  trackSignIn: async (method: string) => {},
  trackSignUp: async (method: string) => {},
  trackRouteCreate: async (routeType: string) => {},
  trackRouteEdit: async (routeId: string) => {},
  trackRouteView: async (routeId: string) => {},
  trackRouteFilter: async (filters: Record<string, any>) => {},
  trackReviewSubmit: async (routeId: string, rating: number) => {},
  trackTodoCreate: async () => {},
  trackTodoComplete: async () => {},
  trackProfileUpdate: async () => {},
  trackSearch: async (searchTerm: string) => {},
}; 