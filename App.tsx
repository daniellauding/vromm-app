import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider, Theme } from 'tamagui';

import { config } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { TranslationProvider } from './src/contexts/TranslationContext';
import { RootStackParamList } from './src/types/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, Platform, NativeModules, View } from 'react-native';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { supabase } from './src/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { setupTranslationSubscription } from './src/services/translationService';
import { ModalProvider } from './src/contexts/ModalContext';

// Disable reanimated warnings about reading values during render

// Use lazy import to prevent NativeEventEmitter errors
let analyticsModule: any;
try {
  if (NativeModules.RNFBAnalyticsModule) {
    analyticsModule = require('@react-native-firebase/analytics').default;
  } else {
    analyticsModule = () => ({
      setAnalyticsCollectionEnabled: async () => true,
      logScreenView: async () => {},
      app: null
    });
    console.log('[Firebase] Using mock analytics in App.tsx');
  }
} catch (error) {
  analyticsModule = () => ({
    setAnalyticsCollectionEnabled: async () => true,
    logScreenView: async () => {},
    app: null
  });
  console.log('[Firebase] Error initializing analytics in App.tsx:', error);
}

const analytics = analyticsModule;

// Auth screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

// Main app screens
import { TabNavigator } from './src/components/TabNavigator';
import { RouteDetailScreen } from './src/screens/RouteDetailScreen';
import { CreateRouteScreen } from './src/screens/CreateRouteScreen';
import { AddReviewScreen } from './src/screens/AddReviewScreen';
import { OnboardingDemoScreen } from './src/screens/OnboardingDemoScreen';
import { TranslationDemoScreen } from './src/screens/TranslationDemoScreen';
import { ContentDemoScreen } from './src/screens/ContentDemoScreen';
import { RouteListScreen } from './src/screens/RouteListScreen';
import { LicensePlanScreen } from './src/screens/LicensePlanScreen';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { PublicProfileScreen } from './src/screens/PublicProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const colorScheme = useColorScheme();

  // Enable analytics collection when the app starts
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Check if the analytics module is available
        if (!analytics().app) {
          console.log('Firebase Analytics not available');
          return;
        }
        
        // Make sure analytics collection is enabled
        await analytics().setAnalyticsCollectionEnabled(true);
        console.log('Firebase Analytics initialized');
      } catch (error) {
        console.error('Failed to initialize analytics:', error);
      }
    };

    initializeAnalytics();
  }, []);

  // Initialize translation service with real-time updates
  useEffect(() => {
    // Set up real-time translation updates
    const cleanup = setupTranslationSubscription();

    console.log('[APP] Translation subscription initialized');

    // Clean up subscription when app unmounts
    return cleanup;
  }, []);

  // Check for database tables on startup
  useEffect(() => {
    const checkDatabaseTables = async () => {
      try {
        // Check if onboarding_slides table exists
        const { error } = await supabase.from('onboarding_slides').select('id').limit(1);

        if (error && error.code === '42P01') {
          console.log('===================================================');
          console.log('⚠️ The onboarding_slides table is missing in your database!');
          console.log('To create it, run the Supabase migration:');
          console.log('supabase migration up');
          console.log('or manually execute the SQL in:');
          console.log('supabase/migrations/20240511000000_onboarding_slides.sql');
          console.log('===================================================');
        }
      } catch (error) {
        console.error('Error checking database tables:', error);
      }
    };

    checkDatabaseTables();
  }, []);

  console.log('[DEBUG] AppContent rendering');
  console.log('[DEBUG] Auth state:', { isAuthenticated: !!user });

  // Don't render anything while auth is loading to prevent flash of wrong screens
  if (authLoading) {
    return null;
  }

  return (
    <NavigationContainer
      onStateChange={state => {
        console.log('[DEBUG] Navigation state:', state);
        
        // Track screen views for analytics - works on both iOS and Android
        if (state) {
          const route = state.routes[state.index];
          const screen_name = route.name;
          const screen_class = route.name;
          
          try {
            // Using React Native Firebase analytics
            if (analytics().app) {
              analytics()
                .logScreenView({
                  screen_name,
                  screen_class,
                })
                .catch(err => console.log('Analytics error:', err));
            }
          } catch (error) {
            console.log('Analytics not available for screen view');
          }
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false
        }}
      >
        {!user ? (
          // Auth stack
          <>
            <Stack.Screen
              name="SplashScreen"
              component={SplashScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: false
              }}
            />
          </>
        ) : (
          // Main app stack - NOTE: MainTabs must come first, Onboarding second to prevent crashes
          <>
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="RouteDetail"
              component={RouteDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateRoute"
              component={CreateRouteScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddReview"
              component={AddReviewScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OnboardingDemo"
              component={OnboardingDemoScreen}
              options={{
                headerShown: true,
                title: 'Onboarding Content'
              }}
            />
            <Stack.Screen
              name="TranslationDemo"
              component={TranslationDemoScreen}
              options={{
                headerShown: true,
                title: 'Translation Admin'
              }}
            />
            <Stack.Screen
              name="ContentDemo"
              component={ContentDemoScreen}
              options={{
                headerShown: true,
                title: 'Content Demo'
              }}
            />
            <Stack.Screen
              name="RouteList"
              component={RouteListScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="LicensePlanScreen"
              component={LicensePlanScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="RoleSelectionScreen"
              component={RoleSelectionScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="PublicProfile"
              component={PublicProfileScreen}
              options={{
                headerShown: false
              }}
            />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
          'Rubik-BlackItalic': require('./assets/fonts/Rubik/static/Rubik-BlackItalic.ttf')
        });
        console.log('Fonts loaded successfully');
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Or a loading screen
  }

  console.log('[DEBUG] App rendering');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
          <Theme>
            <TranslationProvider>
              <AuthProvider>
                <LocationProvider>
                  <ModalProvider>
                    <AppContent />
                  </ModalProvider>
                </LocationProvider>
              </AuthProvider>
            </TranslationProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Suppress Reanimated warnings in dev mode
if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Silence Reanimated warnings about reading values during render
    if (
      typeof args[0] === 'string' &&
      args[0].includes('[Reanimated] Reading from `value` during component render')
    ) {
      return;
    }
    originalWarn(...args);
  };
}
