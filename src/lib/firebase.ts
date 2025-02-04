import * as Analytics from 'expo-firebase-analytics';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Initialize Firebase Analytics with safety checks
const initializeAnalytics = async () => {
  try {
    // Check if we're running in development
    if (__DEV__) {
      console.log('Analytics disabled in development');
      return false;
    }

    // Enable analytics collection
    await Analytics.setAnalyticsCollectionEnabled(true);
    
    // Set basic user properties
    await Analytics.setUserProperties({
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version || 'unknown',
      build_number: (Constants.expoConfig?.ios?.buildNumber || 
                    Constants.expoConfig?.android?.versionCode || 
                    'unknown').toString()
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
      if (this.isInitialized) {
        await Analytics.logEvent(eventName, {
          ...properties,
          timestamp: new Date().toISOString()
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
      if (this.isInitialized) {
        await Analytics.setUserProperties(properties);
      }
    } catch (error) {
      // Only log warning in development
      if (__DEV__) {
        console.warn('Failed to set user properties:', error);
      }
    }
  }
};

export { safeAnalytics as Analytics }; 