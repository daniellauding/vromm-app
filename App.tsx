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
import { useColorScheme, Platform, NativeModules, View, AppState } from 'react-native';
import * as Font from 'expo-font';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './src/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { setupTranslationSubscription } from './src/services/translationService';
import { ModalProvider } from './src/contexts/ModalContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { CreateRouteProvider } from './src/contexts/CreateRouteContext';
import { MessagingProvider } from './src/contexts/MessagingContext';
import { ErrorBoundary, clearOldCrashReports } from './src/components/ErrorBoundary';
import { logInfo, logWarn, logError, logNavigation } from './src/utils/logger';
import { pushNotificationService } from './src/services/pushNotificationService';

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
      app: null,
    });
    console.log('[Firebase] Using mock analytics in App.tsx');
  }
} catch (error) {
  analyticsModule = () => ({
    setAnalyticsCollectionEnabled: async () => true,
    logScreenView: async () => {},
    app: null,
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
import { UsersScreen } from './src/screens/UsersScreen';

// Messaging screens
import { MessagesScreen } from './src/screens/MessagesScreen';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { NewMessageScreen } from './src/screens/NewMessageScreen';

// Exercise screens
import { RouteExerciseScreen } from './src/screens/RouteExerciseScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user, loading: authLoading, initialized } = useAuth();
  const colorScheme = useColorScheme();
  const navigationRef = useRef<any>();

  // Add app-level logging and crash monitoring
  useEffect(() => {
    logInfo('App started', {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      colorScheme,
      timestamp: new Date().toISOString(),
    });

    // Clear old crash reports
    clearOldCrashReports().catch((error) => {
      logError('Failed to clear old crash reports', error);
    });

    // Monitor app state changes
    const handleAppStateChange = (nextAppState: string) => {
      logInfo(`App state changed to: ${nextAppState}`, { 
        previousState: AppState.currentState,
        nextState: nextAppState 
      });

      if (nextAppState === 'background') {
        logWarn('App went to background - potential memory pressure point');
      } else if (nextAppState === 'active') {
        logInfo('App became active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      logInfo('App cleanup completed');
    };
  }, [colorScheme]);

  // Set up push notification navigation reference
  useEffect(() => {
    if (navigationRef.current) {
      pushNotificationService.setNavigationRef(navigationRef);
      logInfo('Push notification navigation reference set');
    }
  }, [navigationRef.current]);

  // Enable analytics collection when the app starts
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Check if the analytics module is available
        if (!analytics().app) {
          logWarn('Firebase Analytics not available');
          return;
        }

        // Make sure analytics collection is enabled
        await analytics().setAnalyticsCollectionEnabled(true);
        logInfo('Firebase Analytics initialized');
      } catch (error) {
        logError('Failed to initialize analytics', error);
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

  console.log('[APP_DEBUG] AppContent rendering');
  console.log('[APP_DEBUG] Auth state:', { 
    isAuthenticated: !!user, 
    authLoading, 
    initialized,
    userId: user?.id,
    userEmail: user?.email
  });

  // Only return null during initial app startup, not during login attempts
  // This prevents navigation stack from being destroyed during authentication
  if (authLoading && !initialized) {
    logInfo('Initial auth check in progress');
    // Import LoadingScreen dynamically to avoid circular imports
    const LoadingScreen = require('./src/components/LoadingScreen').LoadingScreen;
    return (
      <LoadingScreen 
        message="Starting app..."
        showAfterMs={1000}
        timeout={15000}
        onTimeout={() => {
          logWarn('App startup timeout - forcing navigation');
          // Could force navigation or show error here
        }}
      />
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        const currentRoute = state?.routes[state?.index || 0]?.name;
        
        logInfo('Navigation state changed', {
          currentRoute,
          routeCount: state?.routes?.length,
          stackIndex: state?.index,
          timestamp: Date.now(),
        });

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
                .catch((err) => logWarn('Analytics error', err));
            }
          } catch (error) {
            logWarn('Analytics not available for screen view', error);
          }
        }
      }}
    >
      <ToastProvider>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!user ? (
            // Auth stack
            <>
              <Stack.Screen
                name="SplashScreen"
                component={SplashScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Signup"
                component={SignupScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{
                  headerShown: false,
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
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{
                  headerShown: false,
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
              <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
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
                  title: 'Onboarding Content',
                }}
              />
              <Stack.Screen
                name="TranslationDemo"
                component={TranslationDemoScreen}
                options={{
                  headerShown: true,
                  title: 'Translation Admin',
                }}
              />
              <Stack.Screen
                name="ContentDemo"
                component={ContentDemoScreen}
                options={{
                  headerShown: true,
                  title: 'Content Demo',
                }}
              />
              <Stack.Screen
                name="RouteList"
                component={RouteListScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="LicensePlanScreen"
                component={LicensePlanScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="RoleSelectionScreen"
                component={RoleSelectionScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="PublicProfile"
                component={PublicProfileScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="UsersScreen"
                component={UsersScreen}
                options={{
                  headerShown: false,
                }}
              />
              
              {/* Messaging screens */}
              <Stack.Screen
                name="Messages"
                component={MessagesScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Conversation"
                component={ConversationScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="NewMessage"
                component={NewMessageScreen}
                options={{
                  headerShown: false,
                }}
              />
              
              {/* Exercise screens */}
              <Stack.Screen
                name="RouteExercise"
                component={RouteExerciseScreen}
                options={{
                  headerShown: false,
                }}
              />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ToastProvider>
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
          'Rubik-BlackItalic': require('./assets/fonts/Rubik/static/Rubik-BlackItalic.ttf'),
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
    const LoadingScreen = require('./src/components/LoadingScreen').LoadingScreen;
    return (
      <LoadingScreen 
        message="Loading fonts..."
        showAfterMs={500}
        timeout={10000}
        onTimeout={() => {
          logWarn('Font loading timeout - continuing without custom fonts');
          setFontsLoaded(true); // Force continue
        }}
      />
    );
  }

  console.log('[DEBUG] App rendering');

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
            <Theme>
              <TranslationProvider>
                <AuthProvider>
                  <LocationProvider>
                    <CreateRouteProvider>
                      <ModalProvider>
                        <MessagingProvider>
                          <AppContent />
                        </MessagingProvider>
                      </ModalProvider>
                    </CreateRouteProvider>
                  </LocationProvider>
                </AuthProvider>
              </TranslationProvider>
            </Theme>
          </TamaguiProvider>
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
            'This is a known issue with Tamagui token configuration.'
          );
        }
      }
      return;
    }
    
    originalWarn(...args);
  };
}
