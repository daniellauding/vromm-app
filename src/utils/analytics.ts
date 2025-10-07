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

// Session tracking
let sessionStartTime: number | null = null;
let currentScreen: string | null = null;
let screenStartTime: number | null = null;

export const AppAnalytics = {
  // === SESSION MANAGEMENT ===
  startSession: async () => {
    sessionStartTime = Date.now();
    await safeLogEvent('session_start', {
      timestamp: sessionStartTime,
    });
  },

  endSession: async () => {
    if (sessionStartTime) {
      const duration = Date.now() - sessionStartTime;
      await safeLogEvent('session_end', {
        duration_ms: duration,
        duration_minutes: Math.round(duration / 60000),
      });
      sessionStartTime = null;
    }
  },

  // === SCREEN TRACKING ===
  trackScreenView: async (screenName: string, params?: Record<string, any>) => {
    // End previous screen timing
    if (currentScreen && screenStartTime) {
      const timeSpent = Date.now() - screenStartTime;
      await safeLogEvent('screen_time', {
        screen_name: currentScreen,
        time_spent_ms: timeSpent,
        time_spent_seconds: Math.round(timeSpent / 1000),
      });
    }

    // Start new screen tracking
    currentScreen = screenName;
    screenStartTime = Date.now();

    await safeLogEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenName,
      ...params,
    });
  },

  // === NAVIGATION FLOWS ===
  trackNavigation: async (fromScreen: string, toScreen: string, action?: string) => {
    await safeLogEvent('navigation', {
      from_screen: fromScreen,
      to_screen: toScreen,
      action: action || 'navigate',
    });
  },

  trackUserFlow: async (flowName: string, step: string, stepNumber?: number) => {
    await safeLogEvent('user_flow', {
      flow_name: flowName,
      step_name: step,
      step_number: stepNumber,
    });
  },

  // === USER INTERACTIONS ===
  trackButtonPress: async (
    buttonName: string,
    screenName: string,
    context?: Record<string, any>,
  ) => {
    await safeLogEvent('button_press', {
      button_name: buttonName,
      screen_name: screenName,
      ...context,
    });
  },

  trackSheetOpen: async (sheetName: string, triggerScreen: string) => {
    await safeLogEvent('sheet_open', {
      sheet_name: sheetName,
      trigger_screen: triggerScreen,
    });
  },

  trackSheetClose: async (sheetName: string, duration?: number) => {
    await safeLogEvent('sheet_close', {
      sheet_name: sheetName,
      duration_ms: duration,
    });
  },

  trackFeatureUsage: async (
    featureName: string,
    action: string,
    metadata?: Record<string, any>,
  ) => {
    await safeLogEvent('feature_usage', {
      feature_name: featureName,
      action,
      ...metadata,
    });
  },

  // === EXISTING METHODS (Enhanced) ===
  trackSignIn: async (method: string) => {
    await safeLogEvent('sign_in', { method });
    await AppAnalytics.trackUserFlow('authentication', 'sign_in_completed');
  },

  trackSignUp: async (method: string) => {
    await safeLogEvent('sign_up', { method });
    await AppAnalytics.trackUserFlow('authentication', 'sign_up_completed');
  },

  // === ROUTE ANALYTICS ===
  trackRouteCreate: async (routeType: string, metadata?: Record<string, any>) => {
    await safeLogEvent('route_create', {
      route_type: routeType,
      ...metadata,
    });
    await AppAnalytics.trackUserFlow('route_management', 'route_created');
  },

  trackRouteEdit: async (routeId: string) => {
    await safeLogEvent('route_edit', { route_id: routeId });
  },

  trackRouteView: async (routeId: string, viewContext?: string) => {
    await safeLogEvent('route_view', {
      route_id: routeId,
      view_context: viewContext,
    });
  },

  trackRouteStart: async (routeId: string) => {
    await safeLogEvent('route_start', { route_id: routeId });
    await AppAnalytics.trackUserFlow('route_engagement', 'route_started');
  },

  trackRouteRecordingStart: async (routeId?: string) => {
    await safeLogEvent('route_recording_start', { route_id: routeId });
    await AppAnalytics.trackUserFlow('route_recording', 'recording_started');
  },

  trackRouteRecordingEnd: async (routeId: string, duration: number, distance: number) => {
    await safeLogEvent('route_recording_end', {
      route_id: routeId,
      duration_seconds: Math.round(duration),
      distance_km: Math.round(distance * 100) / 100,
    });
    await AppAnalytics.trackUserFlow('route_recording', 'recording_completed');
  },

  trackRouteFilter: async (filters: Record<string, any>) => {
    await safeLogEvent('route_filter', { filters });
  },

  // === SOCIAL & COMMUNITY ===
  trackUserFollow: async (followedUserId: string) => {
    await safeLogEvent('user_follow', { followed_user_id: followedUserId });
    await AppAnalytics.trackUserFlow('social_engagement', 'user_followed');
  },

  trackUserUnfollow: async (unfollowedUserId: string) => {
    await safeLogEvent('user_unfollow', { unfollowed_user_id: unfollowedUserId });
  },

  trackReviewSubmit: async (routeId: string, rating: number) => {
    await safeLogEvent('review_submit', { route_id: routeId, rating });
    await AppAnalytics.trackUserFlow('social_engagement', 'review_submitted');
  },

  trackMessageSent: async (conversationId: string, messageType?: string) => {
    await safeLogEvent('message_sent', {
      conversation_id: conversationId,
      message_type: messageType || 'text',
    });
  },

  // === LEARNING & PROGRESS ===
  trackExerciseStart: async (exerciseId: string, routeId?: string) => {
    await safeLogEvent('exercise_start', {
      exercise_id: exerciseId,
      route_id: routeId,
    });
    await AppAnalytics.trackUserFlow('learning', 'exercise_started');
  },

  trackExerciseComplete: async (exerciseId: string, routeId?: string, timeSpent?: number) => {
    await safeLogEvent('exercise_complete', {
      exercise_id: exerciseId,
      route_id: routeId,
      time_spent_seconds: timeSpent,
    });
    await AppAnalytics.trackUserFlow('learning', 'exercise_completed');
  },

  trackTodoCreate: async () => {
    await safeLogEvent('todo_create');
  },

  trackTodoComplete: async () => {
    await safeLogEvent('todo_complete');
  },

  // === ONBOARDING ===
  trackOnboardingStart: async () => {
    await safeLogEvent('onboarding_start');
    await AppAnalytics.trackUserFlow('onboarding', 'started', 1);
  },

  trackOnboardingStep: async (stepName: string, stepNumber: number) => {
    await safeLogEvent('onboarding_step', {
      step_name: stepName,
      step_number: stepNumber,
    });
    await AppAnalytics.trackUserFlow('onboarding', stepName, stepNumber);
  },

  trackOnboardingComplete: async (totalSteps: number, timeSpent?: number) => {
    await safeLogEvent('onboarding_complete', {
      total_steps: totalSteps,
      time_spent_seconds: timeSpent,
    });
    await AppAnalytics.trackUserFlow('onboarding', 'completed', totalSteps);
  },

  trackOnboardingSkip: async (stepName: string, stepNumber: number) => {
    await safeLogEvent('onboarding_skip', {
      step_name: stepName,
      step_number: stepNumber,
    });
  },

  // === SEARCH & DISCOVERY ===
  trackSearch: async (searchTerm: string, resultCount?: number) => {
    await safeLogEvent('search', {
      search_term: searchTerm,
      result_count: resultCount,
    });
  },

  trackFilterUsage: async (
    filterType: string,
    filterValues: Record<string, any>,
    screenName: string,
  ) => {
    await safeLogEvent('filter_usage', {
      filter_type: filterType,
      filter_values: filterValues,
      screen_name: screenName,
    });
  },

  // === PROFILE & SETTINGS ===
  trackProfileUpdate: async (updateType?: string) => {
    await safeLogEvent('profile_update', {
      update_type: updateType,
    });
  },

  trackProfileView: async (viewedUserId: string, context?: string) => {
    await safeLogEvent('profile_view', {
      viewed_user_id: viewedUserId,
      view_context: context,
    });
  },

  // === ERRORS & DEBUGGING ===
  trackError: async (errorType: string, errorMessage: string, screenName?: string) => {
    await safeLogEvent('app_error', {
      error_type: errorType,
      error_message: errorMessage,
      screen_name: screenName,
    });
  },

  trackAppBackground: async () => {
    await safeLogEvent('app_background');
    if (currentScreen && screenStartTime) {
      const timeSpent = Date.now() - screenStartTime;
      await safeLogEvent('screen_time', {
        screen_name: currentScreen,
        time_spent_ms: timeSpent,
        time_spent_seconds: Math.round(timeSpent / 1000),
        reason: 'app_background',
      });
    }
  },

  trackAppForeground: async () => {
    await safeLogEvent('app_foreground');
    screenStartTime = Date.now(); // Reset screen timing
  },
};
