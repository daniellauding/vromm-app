import * as Analytics from 'expo-firebase-analytics';
import { Platform } from 'react-native';

// Initialize Firebase Analytics with safety checks
const initializeAnalytics = async () => {
  try {
    await Analytics.setAnalyticsCollectionEnabled(true);
    await Analytics.setUserProperties({
      platform: Platform.OS,
      app_version: Platform.Version.toString(),
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
        await Analytics.logEvent(eventName, properties);
      }
    } catch (error) {
      console.warn(`Failed to log event ${eventName}:`, error);
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
      console.warn('Failed to set user properties:', error);
    }
  }
};

export { safeAnalytics as Analytics }; 