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

// Helper function to track user properties when user data changes
export const trackUserProperties = async (userData: {
  id: string;
  role?: string;
  experience_level?: string;
  location?: string;
  has_active_subscription?: boolean;
}) => {
  try {
    await Analytics.setUserId(userData.id);
    
    if (userData.role) {
      await Analytics.setUserRole(userData.role);
    }
    
    if (userData.experience_level) {
      await Analytics.setUserExperienceLevel(userData.experience_level);
    }
    
    if (userData.location) {
      await Analytics.setUserLocation(userData.location);
    }
    
    if (typeof userData.has_active_subscription === 'boolean') {
      await Analytics.setUserSubscriptionStatus(userData.has_active_subscription);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to track user properties:', error);
    }
  }
};

// Helper function to wrap async functions with analytics
export const withAnalytics = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  eventName: string,
  getProperties?: (...args: T) => Record<string, any>
) => {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);
      
      // Track success
      const properties = getProperties ? getProperties(...args) : {};
      await safeLogEvent(`${eventName}_success`, properties);
      
      return result;
    } catch (error) {
      // Track error
      const properties = getProperties ? getProperties(...args) : {};
      await safeLogEvent(`${eventName}_error`, {
        ...properties,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  };
};

export const AppAnalytics = {
  // Authentication Events
  trackSignIn: async (method: string) => {
    await safeLogEvent('sign_in', { method });
  },
  trackSignUp: async (method: string) => {
    await safeLogEvent('sign_up', { method });
  },
  trackSignOut: async () => {
    await safeLogEvent('sign_out');
  },

  // Route Events
  trackRouteCreate: async (routeType: string, difficulty?: string) => {
    await safeLogEvent('route_create', { route_type: routeType, difficulty });
  },
  trackRouteEdit: async (routeId: string) => {
    await safeLogEvent('route_edit', { route_id: routeId });
  },
  trackRouteDelete: async (routeId: string) => {
    await safeLogEvent('route_delete', { route_id: routeId });
  },
  trackRouteView: async (routeId: string) => {
    await safeLogEvent('route_view', { route_id: routeId });
  },
  trackRouteStart: async (routeId: string) => {
    await safeLogEvent('route_start', { route_id: routeId });
  },
  trackRouteFilter: async (filters: Record<string, any>) => {
    await safeLogEvent('route_filter', { filters });
  },
  trackRouteShare: async (routeId: string, method: string) => {
    await safeLogEvent('route_share', { route_id: routeId, share_method: method });
  },

  // Review Events
  trackReviewSubmit: async (routeId: string, rating: number) => {
    await safeLogEvent('review_submit', { route_id: routeId, rating });
  },
  trackReviewDelete: async (reviewId: string) => {
    await safeLogEvent('review_delete', { review_id: reviewId });
  },

  // Event Events
  trackEventCreate: async (eventType: string, visibility: string) => {
    await safeLogEvent('event_create', { event_type: eventType, visibility });
  },
  trackEventEdit: async (eventId: string) => {
    await safeLogEvent('event_edit', { event_id: eventId });
  },
  trackEventDelete: async (eventId: string) => {
    await safeLogEvent('event_delete', { event_id: eventId });
  },
  trackEventJoin: async (eventId: string) => {
    await safeLogEvent('event_join', { event_id: eventId });
  },
  trackEventLeave: async (eventId: string) => {
    await safeLogEvent('event_leave', { event_id: eventId });
  },
  trackEventInvite: async (eventId: string, inviteCount: number) => {
    await safeLogEvent('event_invite', { event_id: eventId, invite_count: inviteCount });
  },

  // Messaging Events
  trackMessageSend: async (conversationId: string) => {
    await safeLogEvent('message_send', { conversation_id: conversationId });
  },
  trackConversationStart: async (otherUserId: string) => {
    await safeLogEvent('conversation_start', { other_user_id: otherUserId });
  },
  trackConversationDelete: async (conversationId: string) => {
    await safeLogEvent('conversation_delete', { conversation_id: conversationId });
  },

  // Relationship Events
  trackSupervisorInvite: async (targetUserId: string) => {
    await safeLogEvent('supervisor_invite', { target_user_id: targetUserId });
  },
  trackStudentInvite: async (targetUserId: string) => {
    await safeLogEvent('student_invite', { target_user_id: targetUserId });
  },
  trackInvitationAccept: async (invitationId: string, relationshipType: string) => {
    await safeLogEvent('invitation_accept', { invitation_id: invitationId, relationship_type: relationshipType });
  },
  trackInvitationReject: async (invitationId: string, relationshipType: string) => {
    await safeLogEvent('invitation_reject', { invitation_id: invitationId, relationship_type: relationshipType });
  },

  // Profile Events
  trackProfileUpdate: async (fieldsUpdated: string[]) => {
    await safeLogEvent('profile_update', { fields_updated: fieldsUpdated });
  },
  trackAvatarUpload: async () => {
    await safeLogEvent('avatar_upload');
  },
  trackAvatarDelete: async () => {
    await safeLogEvent('avatar_delete');
  },
  trackRoleChange: async (newRole: string) => {
    await safeLogEvent('role_change', { new_role: newRole });
  },

  // Content Engagement
  trackSearch: async (searchTerm: string, resultCount: number) => {
    await safeLogEvent('search', { search_term: searchTerm, result_count: resultCount });
  },
  trackContentShare: async (contentType: string, contentId: string, method: string) => {
    await safeLogEvent('content_share', { content_type: contentType, content_id: contentId, share_method: method });
  },
  trackContentBookmark: async (contentType: string, contentId: string) => {
    await safeLogEvent('content_bookmark', { content_type: contentType, content_id: contentId });
  },

  // App Usage Events
  trackScreenView: async (screenName: string) => {
    await safeLogEvent('screen_view', { screen_name: screenName });
  },
  trackFeatureDiscovery: async (featureName: string) => {
    await safeLogEvent('feature_discovery', { feature_name: featureName });
  },
  trackOnboardingComplete: async (step: string) => {
    await safeLogEvent('onboarding_complete', { step });
  },
  trackAppOpen: async () => {
    await safeLogEvent('app_open');
  },
  trackAppBackground: async () => {
    await safeLogEvent('app_background');
  },

  // Error Events
  trackError: async (errorType: string, errorMessage: string, context?: string) => {
    await safeLogEvent('app_error', { error_type: errorType, error_message: errorMessage, context });
  },

  // Legacy Events (keeping for backward compatibility)
  trackTodoCreate: async () => {
    await safeLogEvent('todo_create');
  },
  trackTodoComplete: async () => {
    await safeLogEvent('todo_complete');
  },
};
