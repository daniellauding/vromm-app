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

export const AppAnalytics = {
  trackSignIn: async (method: string) => {
    await safeLogEvent('sign_in', { method });
  },
  trackSignUp: async (method: string) => {
    await safeLogEvent('sign_up', { method });
  },
  trackRouteCreate: async (routeType: string) => {
    await safeLogEvent('route_create', { route_type: routeType });
  },
  trackRouteEdit: async (routeId: string) => {
    await safeLogEvent('route_edit', { route_id: routeId });
  },
  trackRouteView: async (routeId: string) => {
    await safeLogEvent('route_view', { route_id: routeId });
  },
  trackRouteFilter: async (filters: Record<string, any>) => {
    await safeLogEvent('route_filter', { filters });
  },
  trackReviewSubmit: async (routeId: string, rating: number) => {
    await safeLogEvent('review_submit', { route_id: routeId, rating });
  },
  trackTodoCreate: async () => {
    await safeLogEvent('todo_create');
  },
  trackTodoComplete: async () => {
    await safeLogEvent('todo_complete');
  },
  trackProfileUpdate: async () => {
    await safeLogEvent('profile_update');
  },
  trackSearch: async (searchTerm: string) => {
    await safeLogEvent('search', { search_term: searchTerm });
  },
}; 