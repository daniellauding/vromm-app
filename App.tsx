import { useEffect, useState } from 'react';

import { TamaguiProvider } from 'tamagui';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, Platform, NativeModules } from 'react-native';
import * as Font from 'expo-font';

import { config } from './src/theme/components';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/components/ThemeProvider';
import { LocationProvider } from './src/context/LocationContext';
import { StudentSwitchProvider } from './src/context/StudentSwitchContext';
import { TranslationProvider } from './src/contexts/TranslationContext';
import { LoadingScreen } from './src/components/LoadingScreen';

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

        // On web, also register fonts under the "Rubik" family with proper weights
        // so Tamagui's CSS font-family: "Rubik" + font-weight works correctly
        if (Platform.OS === 'web') {
          const fontFaces = [
            { name: 'Rubik-Regular', weight: '400', style: 'normal' },
            { name: 'Rubik-Italic', weight: '400', style: 'italic' },
            { name: 'Rubik-Medium', weight: '500', style: 'normal' },
            { name: 'Rubik-MediumItalic', weight: '500', style: 'italic' },
            { name: 'Rubik-SemiBold', weight: '600', style: 'normal' },
            { name: 'Rubik-Bold', weight: '700', style: 'normal' },
            { name: 'Rubik-BoldItalic', weight: '700', style: 'italic' },
            { name: 'Rubik-ExtraBold', weight: '800', style: 'normal' },
            { name: 'Rubik-ExtraBoldItalic', weight: '800', style: 'italic' },
            { name: 'Rubik-Black', weight: '900', style: 'normal' },
            { name: 'Rubik-BlackItalic', weight: '900', style: 'italic' },
          ];

          // Get existing @font-face src URLs from the fonts expo-font already loaded
          const existingStyles = document.querySelectorAll('style[id^="expo-generated-fonts"]');
          const existingCSS = Array.from(existingStyles).map(s => s.textContent).join('\n');

          let css = '';
          for (const ff of fontFaces) {
            // Extract the src URL from expo-font's generated CSS
            const regex = new RegExp(`font-family:\\s*["']?${ff.name}["']?[^}]*src:\\s*([^;]+)`, 's');
            const match = existingCSS.match(regex);
            if (match) {
              css += `@font-face { font-family: "Rubik"; font-weight: ${ff.weight}; font-style: ${ff.style}; src: ${match[1]}; }\n`;
            }
          }

          if (css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
          }

          // Global font override: use !important but exclude icon font elements
          // Icon fonts (Feather, MaterialCommunityIcons, etc.) use inline font-family
          // which we must not override, so we use a MutationObserver to re-apply selectively
          const globalStyle = document.createElement('style');
          globalStyle.textContent = `
            *, *::before, *::after { font-family: "Rubik", "Rubik-Regular", system-ui, -apple-system, sans-serif !important; }
          `;
          document.head.appendChild(globalStyle);

          // Fix icon fonts: observe DOM for icon elements and restore their font-family
          const iconFontFamilies = ['feather', 'Feather', 'MaterialCommunityIcons', 'material-community', 'Ionicons', 'ionicons', 'FontAwesome', 'fontawesome', 'MaterialIcons', 'material-icons', 'SimpleLineIcons', 'Entypo', 'AntDesign', 'EvilIcons', 'Octicons', 'Zocial', 'Foundation'];
          const fixIconFonts = () => {
            const allElements = document.querySelectorAll('*');
            allElements.forEach((el) => {
              const inlineFont = (el as HTMLElement).style?.fontFamily;
              if (inlineFont && iconFontFamilies.some(f => inlineFont.includes(f))) {
                (el as HTMLElement).style.setProperty('font-family', inlineFont, 'important');
              }
            });
          };
          // Run once after initial render, then observe for changes
          setTimeout(fixIconFonts, 500);
          const observer = new MutationObserver(() => {
            requestAnimationFrame(fixIconFonts);
          });
          observer.observe(document.body, { childList: true, subtree: true });
        }

        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue even if fonts fail on web
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

  console.log('🎯 [App] Rendering');

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
                            <MessagingProvider>
                              <UnlockProvider>
                                <CelebrationProvider>
                                  <TourProvider>
                                    <AppContent />
                                  </TourProvider>
                                </CelebrationProvider>
                              </UnlockProvider>
                            </MessagingProvider>
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
