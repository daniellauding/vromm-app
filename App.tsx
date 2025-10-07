import { TamaguiProvider } from 'tamagui';

import { config } from './src/theme/components';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/components/ThemeProvider';
import { LocationProvider } from './src/context/LocationContext';
import { StudentSwitchProvider } from './src/context/StudentSwitchContext';
import { TranslationProvider } from './src/contexts/TranslationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, Platform, NativeModules } from 'react-native';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

import { ModalProvider } from './src/contexts/ModalContext';
import { CreateRouteProvider } from './src/contexts/CreateRouteContext';
import { RecordingProvider } from './src/contexts/RecordingContext';
import { MessagingProvider } from './src/contexts/MessagingContext';
import { TourProvider } from './src/contexts/TourContext';
import { UnlockProvider } from './src/contexts/UnlockContext';
import { CelebrationProvider } from './src/contexts/CelebrationContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { googleSignInService } from './src/services/googleSignInService';
import * as WebBrowser from 'expo-web-browser';
import AppContent from './src/AppContent';
import { StripeProvider } from '@stripe/stripe-react-native';
import { LoadingScreen } from './src/components/LoadingScreen';

// Disable reanimated warnings about reading values during render

// Ensure AuthSession can complete pending sessions on app launch
WebBrowser.maybeCompleteAuthSession();

// Use lazy import to prevent NativeEventEmitter errors
export default function App() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState('');

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Rubik-Regular': require('./assets/fonts/Rubik/static/Rubik-Regular.ttf'),
          'Rubik-Medium': require('./assets/fonts/Rubik/static/Rubik-Medium.ttf'),
          'Rubik-SemiBold': require('./assets/fonts/Rubik/static/Rubik-SemiBold.ttf'),
          'Rubik-Bold': require('./assets/fonts/Rubik/static/Rubik-Bold.ttf'),
          'Rubik-ExtraBold': require('./assets/fonts/Rubik/static/Rubik-ExtraBold.ttf'),
          'Rubik-Black': require('./assets/fonts/Rubik/static/Rubik-Black.ttf'),
          'Rubik-Italic': require('./assets/fonts/Rubik/static/Rubik-Italic.ttf'),
          'Rubik-MediumItalic': require('./assets/fonts/Rubik/static/Rubik-MediumItalic.ttf'),
          'Rubik-BoldItalic': require('./assets/fonts/Rubik/static/Rubik-BoldItalic.ttf'),
          'Rubik-ExtraBoldItalic': require('./assets/fonts/Rubik/static/Rubik-ExtraBoldItalic.ttf'),
          'Rubik-BlackItalic': require('./assets/fonts/Rubik/static/Rubik-BlackItalic.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
    }
    loadFonts();

    // Initialize Google Sign-In (skip in Expo Go/web where the native module is unavailable)
    const initializeGoogleSignIn = async () => {
      try {
        if (Platform.OS !== 'web' && (NativeModules as any)?.RNGoogleSignin) {
          await googleSignInService.configure();
        }
      } catch (error) {
        console.error('❌ Google Sign-In initialization failed:', error);
      }
    };

    // Initialize Stripe - fetch publishable key from environment or backend
    const initializeStripe = async () => {
      try {
        // In production, you might want to fetch this from your backend
        // For now, we'll get it from the Edge Function response or use environment
        const publishableKey =
          process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_Xr9mSHZSsJqaYS3q82xBNVtJ'; // Fallback test key

        setStripePublishableKey(publishableKey);
      } catch (error) {
        console.error('❌ Stripe initialization failed:', error);
      }
    };

    initializeGoogleSignIn();
    initializeStripe();
  }, []);

  if (!fontsLoaded) {
    return (
      <LoadingScreen
        message="Loading fonts..."
        showAfterMs={500}
        timeout={10000}
        onTimeout={() => {
          setFontsLoaded(true); // Force continue
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StripeProvider
            publishableKey={stripePublishableKey || 'pk_test_placeholder'}
            merchantIdentifier="merchant.se.vromm.app"
            urlScheme="vromm"
          >
            <TamaguiProvider
              config={config}
              defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
            >
              <TranslationProvider>
                <AuthProvider>
                  <ThemeProvider>
                    <StudentSwitchProvider>
                      <LocationProvider>
                        <CreateRouteProvider>
                          <RecordingProvider>
                            <ModalProvider>
                              <MessagingProvider>
                                <UnlockProvider>
                                  <CelebrationProvider>
                                    <TourProvider>
                                      <AppContent />
                                    </TourProvider>
                                  </CelebrationProvider>
                                </UnlockProvider>
                              </MessagingProvider>
                            </ModalProvider>
                          </RecordingProvider>
                        </CreateRouteProvider>
                      </LocationProvider>
                    </StudentSwitchProvider>
                  </ThemeProvider>
                </AuthProvider>
              </TranslationProvider>
            </TamaguiProvider>
          </StripeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Suppress development warnings
if (__DEV__) {
  const originalWarn = console.warn;
  const warningCounts = new Map<string, number>();
  const MAX_WARNINGS_PER_TYPE = 3;

  console.warn = (...args) => {
    const message = args.join(' ');

    // Silence Reanimated warnings about reading values during render
    if (
      typeof args[0] === 'string' &&
      args[0].includes('[Reanimated] Reading from `value` during component render')
    ) {
      return;
    }

    // Suppress repetitive font size warnings
    if (message.includes('No font size found') && message.includes('in size tokens')) {
      const warningKey = 'font-size-warning';
      const count = warningCounts.get(warningKey) || 0;

      if (count < MAX_WARNINGS_PER_TYPE) {
        warningCounts.set(warningKey, count + 1);
        originalWarn(...args);

        if (count === MAX_WARNINGS_PER_TYPE - 1) {
          originalWarn(
            '[SUPPRESSED] Further font size warnings will be suppressed. ' +
              'This is a known issue with Tamagui token configuration.',
          );
        }
      }
      return;
    }

    originalWarn(...args);
  };
}
