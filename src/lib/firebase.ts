import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

// Create a conditional import for analytics
let analyticsModule: any;
try {
  // Only import if the native module is available
  if (NativeModules.RNFBAnalyticsModule) {
    analyticsModule = require('@react-native-firebase/analytics').default;
  } else {
    // Create a mock analytics object if native module not available
    analyticsModule = () => ({
      setAnalyticsCollectionEnabled: async () => true,
      setUserProperties: async () => {},
      logEvent: async () => {},
      app: null,
    });
    console.log('Using mock analytics module');
  }
} catch (error) {
  // Fallback to mock analytics
  analyticsModule = () => ({
    setAnalyticsCollectionEnabled: async () => true,
    setUserProperties: async () => {},
    logEvent: async () => {},
    app: null,
  });
  console.log('Error importing analytics, using mock:', error);
}

// Use our conditionally imported analytics
const analytics = analyticsModule;

// Check if Firebase is available
const isFirebaseAvailable = () => {
  return !!NativeModules.RNFBAnalyticsModule;
};

// Initialize Firebase Analytics with safety checks
const initializeAnalytics = async () => {
  try {
    // Check if we're running in development
    if (__DEV__) {
      console.log('Analytics disabled in development');
      return false;
    }

    // Check if Firebase Analytics is available
    if (!isFirebaseAvailable()) {
      console.log('Firebase Analytics native module not available');
      return false;
    }

    // Enable analytics collection
    await analytics().setAnalyticsCollectionEnabled(true);

    // Set basic user properties
    await analytics().setUserProperties({
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version || 'unknown',
      build_number: (
        Constants.expoConfig?.ios?.buildNumber ||
        Constants.expoConfig?.android?.versionCode ||
        'unknown'
      ).toString(),
    });

    return true;
  } catch (error) {
    console.warn('Failed to initialize Firebase Analytics:', error);
    return false;
  }
};

// Safe analytics wrapper
const safeAnalytics = {
  isInitialized: false,

  async logEvent(eventName: string, properties?: Record<string, any>) {
    try {
      if (!this.isInitialized) {
        this.isInitialized = await initializeAnalytics();
      }
      if (this.isInitialized && isFirebaseAvailable()) {
        await analytics().logEvent(eventName, {
          ...properties,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Only log warning in development
      if (__DEV__) {
        console.warn(`Failed to log event ${eventName}:`, error);
      }
    }
  },

  async setUserProperties(properties: Record<string, any>) {
    try {
      if (!this.isInitialized) {
        this.isInitialized = await initializeAnalytics();
      }
      if (this.isInitialized && isFirebaseAvailable()) {
        await analytics().setUserProperties(properties);
      }
    } catch (error) {
      // Only log warning in development
      if (__DEV__) {
        console.warn('Failed to set user properties:', error);
      }
    }
  },
};

export { safeAnalytics as Analytics };
