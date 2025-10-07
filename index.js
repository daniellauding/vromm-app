import { registerRootComponent } from 'expo';
import App from './App';
import { NativeModules } from 'react-native';

// Only initialize Firebase if the native modules are available
const firebaseModulesAvailable = NativeModules.RNFBAnalyticsModule && NativeModules.RNFBAppModule;

// Initialize Firebase only if native modules are available
if (firebaseModulesAvailable) {
  try {
    require('@react-native-firebase/app');
    console.log('Firebase initialized successfully');

    // Enable debug mode for development
    if (__DEV__) {
      globalThis.RNFBDebug = true;
    }
  } catch (error) {
    console.log('Failed to initialize Firebase:', error);
  }
} else {
  console.log('Firebase native modules not available, skipping initialization');
}

// Register the app
registerRootComponent(App);
