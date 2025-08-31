import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider, Theme } from 'tamagui';

import config from './tamagui.config';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { StudentSwitchProvider } from './src/context/StudentSwitchContext';
import { TranslationProvider } from './src/contexts/TranslationContext';
import { RootStackParamList } from './src/types/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, Platform, NativeModules, View, AppState, DevSettings } from 'react-native';
import * as Font from 'expo-font';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './src/lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { setupTranslationSubscription } from './src/services/translationService';
import { ModalProvider } from './src/contexts/ModalContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { CreateRouteProvider } from './src/contexts/CreateRouteContext';
import { MessagingProvider } from './src/contexts/MessagingContext';
import { TourProvider } from './src/contexts/TourContext';
import { ErrorBoundary, clearOldCrashReports } from './src/components/ErrorBoundary';
import { NetworkAlert } from './src/components/NetworkAlert';
import { logInfo, logWarn, logError, logNavigation } from './src/utils/logger';
import { pushNotificationService } from './src/services/pushNotificationService';
import { googleSignInService } from './src/services/googleSignInService';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Updates from 'expo-updates';
import { CommonActions } from '@react-navigation/native';
import { registerInvitationModalOpener } from './src/utils/invitationModalBridge';
import { TourOverlay } from './src/components/TourOverlay';
import { PromotionalModal, usePromotionalModal } from './src/components/PromotionalModal';
import type { NavigationContainerRef } from '@react-navigation/native';

// Define a compatible type for WebBrowser dismiss helpers to avoid any-casts
type WebBrowserCompat = typeof WebBrowser & {
  dismissAuthSession?: () => Promise<void>;
  dismissBrowser?: () => Promise<void>;
};

// Disable reanimated warnings about reading values during render

// Ensure AuthSession can complete pending sessions on app launch
WebBrowser.maybeCompleteAuthSession();

// Use lazy import to prevent NativeEventEmitter errors
interface AnalyticsModuleFactory {
  (): {
    setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
    logScreenView: (params: { screen_name: string; screen_class: string }) => Promise<void>;
    app: unknown;
  };
}
let analyticsModule: AnalyticsModuleFactory;
try {
  if (NativeModules.RNFBAnalyticsModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    analyticsModule = require('@react-native-firebase/analytics').default;
  } else {
    analyticsModule = () => ({
      setAnalyticsCollectionEnabled: async () => {},
      logScreenView: async () => {},
      app: null,
    });
    console.log('[Firebase] Using mock analytics in App.tsx');
  }
} catch (error) {
  analyticsModule = () => ({
    setAnalyticsCollectionEnabled: async () => {},
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
import { ProfileScreen } from './src/screens/ProfileScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { AuthGate } from './src/screens/AuthGate';

// Messaging screens
import { MessagesScreen } from './src/screens/MessagesScreen';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { NewMessageScreen } from './src/screens/NewMessageScreen';

// Events screens
import { EventsScreen } from './src/screens/EventsScreen';
import { EventDetailScreen } from './src/screens/EventDetailScreen';
import { CreateEventScreen } from './src/screens/CreateEventScreen';
import { InviteUsersScreen } from './src/screens/InviteUsersScreen';
import { CommunityFeedScreen } from './src/screens/CommunityFeedScreen';

// Exercise screens
import { RouteExerciseScreen } from './src/screens/RouteExerciseScreen';

// Student Management
import { StudentManagementScreen } from './src/screens/StudentManagementScreen';

// Global Invitation Notification
import { InvitationNotification } from './src/components/InvitationNotification';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user, loading: authLoading, initialized } = useAuth();
  const colorScheme = useColorScheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const [authKey, setAuthKey] = useState(0);
  
  // Global invitation notification state
  const [showGlobalInvitationNotification, setShowGlobalInvitationNotification] = useState(false);
  
  // Global promotional modal state
  const { showModal: showPromotionalModal, modalContentType, setShowModal: setShowPromotionalModal, checkForPromotionalContent } = usePromotionalModal();
  
  // Debug: Force show global modal (remove in production)
  useEffect(() => {
    const handleShake = () => {
      console.log('🧪 Debug: Force showing global invitation modal');
      setShowGlobalInvitationNotification(true);
    };
    
    // Add shake gesture listener for debug (iOS only)
    if (__DEV__ && Platform.OS === 'ios') {
      const { DeviceMotion } = require('expo-sensors');
      // This is just for debug - you can remove this
    }
  }, []);

  // Global invitation checking function
  const checkForGlobalInvitations = async () => {
    console.log('🌍 [AppContent] checkForGlobalInvitations called for user:', user?.email);
    if (!user?.email) {
      console.log('🌍 [AppContent] No user email - skipping invitation check');
      return;
    }

    try {
      console.log('🌍 Checking for global invitations for:', user.email);
      
      const { data: invitations, error } = await supabase
        .from('pending_invitations')
        .select('id, invited_by, created_at')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🌍 Global invitation check error:', error);
        return;
      }

      console.log('🌍 Found pending invitations:', invitations?.length || 0);

      if (invitations && invitations.length > 0) {
        // Check if any of these invitations don't already have relationships
        let hasValidInvitation = false;
        const toCleanup: string[] = [];
        
        for (const inv of invitations) {
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(`and(student_id.eq.${user.id},supervisor_id.eq.${inv.invited_by}),and(student_id.eq.${inv.invited_by},supervisor_id.eq.${user.id})`)
            .limit(1);

          if (!existingRelationship || existingRelationship.length === 0) {
            hasValidInvitation = true;
            console.log('🌍 Valid invitation found:', inv.id);
          } else {
            console.log('🌍 Skipping invitation - relationship exists (will cleanup):', inv.id);
            toCleanup.push(inv.id);
          }
        }

        // Cleanup any pending invites that already have relationships
        if (toCleanup.length > 0) {
          try {
            await supabase.from('pending_invitations').delete().in('id', toCleanup);
            await supabase
              .from('notifications')
              .delete()
              .in('metadata->>invitation_id', toCleanup);
            console.log('🧹 Cleaned up stale invitations and related notifications:', toCleanup.length);
          } catch (cleanupErr) {
            console.warn('⚠️ Cleanup of stale invitations failed:', cleanupErr);
          }
        }

        if (hasValidInvitation && !showGlobalInvitationNotification) {
          console.log('🌍 Global invitation check: Found valid invitations, showing modal');
          setShowGlobalInvitationNotification(true);
        } else if (!hasValidInvitation) {
          console.log('🌍 No valid invitations found');
          
          // If no invitations, check for promotional content
          console.log('🎉 [AppContent] Checking for promotional content...');
          setTimeout(async () => {
            console.log('🎉 [AppContent] About to call checkForPromotionalContent...');
            const result = await checkForPromotionalContent('modal');
            console.log('🎉 [AppContent] checkForPromotionalContent result:', result);
          }, 1000);
        } else {
          console.log('🌍 Modal already showing, not triggering again');
        }
      }
    } catch (error) {
      console.error('🌍 Global invitation check error:', error);
    }
  };

  // Register opener so other parts can open modal instantly without prop drilling
  useEffect(() => {
    registerInvitationModalOpener(() => setShowGlobalInvitationNotification(true));
  }, []);

  // Set up global invitation subscription
  useEffect(() => {
    if (!user?.email) return;

    // Check immediately when user is available
    checkForGlobalInvitations();

    // Set up real-time subscription to pending invitations
    const invitationSubscription = supabase
      .channel('global_pending_invitations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pending_invitations',
      }, (payload: any) => {
        try {
          const row = payload?.new;
          const targetEmail = (row?.email || '').toLowerCase();
          if (targetEmail === (user.email || '').toLowerCase() && row?.status === 'pending') {
            console.log('🌍 Global: Pending invitation INSERT matches current user → opening modal');
            setTimeout(() => setShowGlobalInvitationNotification(true), 150);
          } else {
            console.log('🌍 Global: Invitation INSERT ignored (different email or status)', row?.email, row?.status);
          }
        } catch (e) {
          console.log('🌍 Global: INSERT handler error', e);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pending_invitations',
      }, (payload: any) => {
        try {
          const row = payload?.new;
          const targetEmail = (row?.email || '').toLowerCase();
          if (targetEmail === (user.email || '').toLowerCase()) {
            console.log('🌍 Global: Invitation UPDATE for current user, rechecking...');
            setTimeout(() => checkForGlobalInvitations(), 250);
          }
        } catch (e) {
          console.log('🌍 Global: UPDATE handler error', e);
        }
      })
      .subscribe();

    // Fallback: open modal if a notification insert arrives for invitation types
    const notifSubscription = supabase
      .channel('global_invitation_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        try {
          const row = payload?.new;
          if (row?.type === 'supervisor_invitation' || row?.type === 'student_invitation') {
            console.log('🌍 Fallback: Invitation notification inserted, opening modal');
            setShowGlobalInvitationNotification(true);
          }
        } catch {}
      })
      .subscribe();

    return () => {
      invitationSubscription.unsubscribe();
      notifSubscription.unsubscribe();
    };
  }, [user?.email, user?.id]);

  // React Native doesn't have window, use a different approach for cross-component communication
  // The NotificationBell will trigger checkForGlobalInvitations directly via the subscription

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
        nextState: nextAppState,
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

  // Handle OAuth deep links (Google/Facebook via AuthSession)
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        const code = (parsed.queryParams?.code as string) || '';
        let didSetSession = false;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            logError('OAuth exchange failed', error);
          } else {
            logInfo('OAuth code exchange succeeded');
            didSetSession = true;
          }
        } else {
          // Fallback for implicit flow: access_token in URL fragment
          const hashIndex = event.url.indexOf('#');
          if (hashIndex >= 0) {
            const fragment = event.url.substring(hashIndex + 1);
            const sp = new URLSearchParams(fragment);
            const access_token = sp.get('access_token') || '';
            const refresh_token = sp.get('refresh_token') || '';
            if (access_token) {
              const { error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (error) {
                logError('OAuth setSession (fragment) failed', error);
              } else {
                logInfo('OAuth session set from fragment tokens');
                didSetSession = true;
              }
            }
          }
        }

        if (didSetSession) {
          // Close the in-app browser modal if still open
          try {
            const WB = WebBrowser as WebBrowserCompat;
            if (WB.dismissAuthSession) {
              await WB.dismissAuthSession();
            } else if (WB.dismissBrowser) {
              await WB.dismissBrowser();
            }
          } catch (e) {
            console.warn('Dismiss browser failed after OAuth', e);
          }

          // Ensure the session is visible to the app before navigating
          try {
            await supabase.auth.getSession();
          } catch (e) {
            console.warn('getSession after OAuth failed', e);
          }

          // Do not navigate here; let React remount the navigator based on user state
        }
      } catch (e) {
        logError('Deep link handling error', e);
      }
    };

    // Subscribe to future deep links
    const sub = Linking.addEventListener('url', handleUrl);
    // Also handle the case where the app was cold-started via a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => {
      sub.remove();
    };
  }, []);

  // AGGRESSIVE DEBUG: Check for SIGNED_IN events and force navigation
  useEffect(() => {
    // Simple debug logging - let React handle everything
    console.log('[AUTH_WATCHER] Monitoring auth state changes...');
  }, []);

  // Simple fallback: just dismiss browser and let React's conditional rendering handle navigation
  useEffect(() => {
    console.log('[NAV_FALLBACK] useEffect triggered', {
      initialized,
      hasUser: !!user,
      userId: user?.id,
    });
    if (initialized && user) {
      console.log(
        '[NAV_FALLBACK] User authenticated, dismissing OAuth browser and letting React handle stack switch',
      );

      // Just dismiss the OAuth browser
      (async () => {
        try {
          const WB = WebBrowser as WebBrowserCompat;
          if (WB.dismissAuthSession) {
            await WB.dismissAuthSession();
          } else if (WB.dismissBrowser) {
            await WB.dismissBrowser();
          }
        } catch {
          // ignore dismissal errors
        }
      })();

      // Production-safe fallback: if React hasn't switched stacks shortly, force a full reload
      setTimeout(() => {
        const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name;
        console.log('[FALLBACK_CHECK] Current route after auth:', currentRoute);
        if (currentRoute === 'Login' || currentRoute === 'SplashScreen' || currentRoute === 'Signup') {
          console.log('[FALLBACK_CHECK] Still on auth route after sign-in, forcing app reload');
          Updates.reloadAsync().catch((e) => console.warn('Updates.reloadAsync failed', e));
        }
      }, 1200);
    }
  }, [initialized, user]);

  // Simple Supabase auth state logger 
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[SUPABASE_AUTH]', _event, 'hasSession:', !!session, 'hasUser:', !!session?.user);
      if (_event === 'SIGNED_IN') {
        console.log('[SUPABASE_AUTH] Login successful, waiting for React to switch navigation stack...');

        // Dismiss any auth browser just in case
        (async () => {
          try {
            const WB = WebBrowser as WebBrowserCompat;
            if (WB.dismissAuthSession) {
              await WB.dismissAuthSession();
            } else if (WB.dismissBrowser) {
              await WB.dismissBrowser();
            }
          } catch (e) {
            console.warn('Dismiss browser after SIGNED_IN failed', e);
          }

          // Do not navigate to AuthGate here; let React handle stack switching
        })();

        // Force a clean remount of NavigationContainer to avoid any stale stacks
        setAuthKey((k) => k + 1);
      }
      if (_event === 'SIGNED_OUT') {
        setAuthKey((k) => k + 1);
      }
    });
    return () => subscription.unsubscribe();
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
    userEmail: user?.email,
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
    <>
      <NetworkAlert />

      {/* Global Invitation Notification Modal (outside navigator for top-most priority) */}
      <InvitationNotification
        visible={showGlobalInvitationNotification}
        onClose={() => {
          console.log('🌍 Global invitation modal closed');
          setShowGlobalInvitationNotification(false);
        }}
        onInvitationHandled={() => {
          console.log('🌍 Global invitation handled - checking for more');
          // Close modal immediately; if more invites exist, we'll reopen
          setShowGlobalInvitationNotification(false);
          // Check for more invitations after handling one
          setTimeout(() => {
            checkForGlobalInvitations();
          }, 1000);
        }}
      />

      <NavigationContainer
        key={`${user ? 'nav-app' : 'nav-auth'}-${authKey}`}
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
                .catch((err: unknown) => logWarn('Analytics error', err as Error));
            }
          } catch (error) {
            logWarn('Analytics not available for screen view', error);
          }
        }
      }}
    >
      <ToastProvider>
        <Stack.Navigator
          initialRouteName={user ? 'MainTabs' : 'SplashScreen'}
          screenOptions={{
            headerShown: false,
          }}
        >
          {!user ? (
            // Auth stack
            <>
              <Stack.Screen name="AuthGate" component={AuthGate} />
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
              <Stack.Screen name="AuthGate" component={AuthGate} />
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
                name="ProfileScreen"
                component={ProfileScreen}
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

              {/* Events screens */}
              <Stack.Screen
                name="Events"
                component={EventsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="EventDetail"
                component={EventDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="CreateEvent"
                component={CreateEventScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="InviteUsers"
                component={InviteUsersScreen}
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="RouteExercise"
                component={RouteExerciseScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="StudentManagementScreen"
                component={StudentManagementScreen}
                options={{
                  headerShown: false,
                }}
              />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        
        {/* Tour overlay - rendered at app level */}
        <TourOverlay />
        
        {/* Promotional modal - rendered at app level */}
        <PromotionalModal
          visible={showPromotionalModal}
          onClose={() => setShowPromotionalModal(false)}
          contentType={modalContentType}
        />
      </ToastProvider>
          </NavigationContainer>
    </>
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

    // Initialize Google Sign-In (skip in Expo Go/web where the native module is unavailable)
    const initializeGoogleSignIn = async () => {
      try {
        if (Platform.OS !== 'web' && (NativeModules as any)?.RNGoogleSignin) {
        await googleSignInService.configure();
        console.log('✅ Google Sign-In initialized successfully');
        } else {
          console.log('ℹ️ Google Sign-In not available (Expo Go or web). Skipping initialization.');
        }
      } catch (error) {
        console.error('❌ Google Sign-In initialization failed:', error);
      }
    };

    initializeGoogleSignIn();
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
                  <StudentSwitchProvider>
                    <LocationProvider>
                      <CreateRouteProvider>
                        <ModalProvider>
                          <MessagingProvider>
                            <TourProvider>
                              <AppContent />
                            </TourProvider>
                          </MessagingProvider>
                        </ModalProvider>
                      </CreateRouteProvider>
                    </LocationProvider>
                  </StudentSwitchProvider>
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
              'This is a known issue with Tamagui token configuration.',
          );
        }
      }
      return;
    }

    originalWarn(...args);
  };
}
