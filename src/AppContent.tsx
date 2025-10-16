import { useColorScheme, Platform, NativeModules, AppState } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { useAuth } from './context/AuthContext';
import { RootStackParamList } from './types/navigation';

import { supabase } from './lib/supabase';
import { StatusBar } from 'expo-status-bar';
import { setupTranslationSubscription } from './services/translationService';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { useTranslation } from './contexts/TranslationContext';
import { clearOldCrashReports } from './components/ErrorBoundary';
import { NetworkAlert } from './components/NetworkAlert';
import { logInfo, logWarn, logError } from './utils/logger';
import { pushNotificationService } from './services/pushNotificationService';
import { registerInvitationModalOpener } from './utils/invitationModalBridge';
import { AppAnalytics } from './utils/analytics';
import { TourOverlay } from './components/TourOverlay';
import { PromotionalModal, usePromotionalModal } from './components/PromotionalModal';
import { GlobalCelebrationModal } from './components/GlobalCelebrationModal';
import type { NavigationContainerRef } from '@react-navigation/native';

import { LoadingScreen } from './components/LoadingScreen';

// Define a compatible type for WebBrowser dismiss helpers to avoid any-casts
type WebBrowserCompat = typeof WebBrowser & {
  dismissAuthSession?: () => Promise<void>;
  dismissBrowser?: () => Promise<void>;
};

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
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

// Main app screens
import { TabNavigator } from './components/TabNavigator';
import { RouteDetailScreen } from './screens/RouteDetailScreen';
import { CreateRouteScreen } from './screens/CreateRouteScreen';
import { AddReviewScreen } from './screens/AddReviewScreen';
import { OnboardingDemoScreen } from './screens/OnboardingDemoScreen';
import { TranslationDemoScreen } from './screens/TranslationDemoScreen';
import { ContentDemoScreen } from './screens/ContentDemoScreen';
import { RouteListScreen } from './screens/RouteListScreen';
import { LicensePlanScreen } from './screens/LicensePlanScreen';
import { RoleSelectionScreen } from './screens/RoleSelectionScreen';
import { SearchScreen } from './screens/SearchScreen';
import { PublicProfileScreen } from './screens/PublicProfileScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { UsersScreen } from './screens/UsersScreen';
import { AuthGate } from './screens/AuthGate';

// Messaging screens
import { MessagesScreen } from './screens/MessagesScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { NewMessageScreen } from './screens/NewMessageScreen';

// Events screens
import { EventsScreen } from './screens/EventsScreen';
import { EventDetailScreen } from './screens/EventDetailScreen';
import { CreateEventScreen } from './screens/CreateEventScreen';
import { InviteUsersScreen } from './screens/InviteUsersScreen';

// Exercise screens
import { RouteExerciseScreen } from './screens/RouteExerciseScreen';

// Student Management
import { StudentManagementScreen } from './screens/StudentManagementScreen';

// Global Invitation Notification
import { UnifiedInvitationModal } from './components/UnifiedInvitationModal';
import { GlobalRecordingWidget } from './components/GlobalRecordingWidget';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Track if we've already shown the push notification toast to avoid duplicates
let hasShownPushNotificationToast = false;

async function registerForPushNotificationsAsync(
  showToast?: (toast: {
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }) => void,
  t?: (key: string) => string,
) {
  let token;

  // Force refresh translations to ensure they're loaded
  // await refreshTranslations();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('myNotificationChannel', {
      name: 'A channel is needed for the permissions prompt to appear',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      // Only show toast once per app session
      if (showToast && !hasShownPushNotificationToast) {
        hasShownPushNotificationToast = true;
        showToast({
          title: t?.('pushNotifications.title') || 'Push Notifications',
          message:
            t?.('pushNotifications.failedToken') ||
            'Failed to get push token for push notification!',
          type: 'error',
        });
      } else if (!showToast) {
        alert(
          t?.('pushNotifications.failedToken') || 'Failed to get push token for push notification!',
        );
      }
      return;
    }
    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    // EAS projectId is used here.
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e) {
      token = `${e}`;
    }
  } else {
    // Only show toast once per app session (for simulator warning)
    if (showToast && !hasShownPushNotificationToast) {
      hasShownPushNotificationToast = true;
      showToast({
        title: t?.('pushNotifications.title') || 'Push Notifications',
        message:
          t?.('pushNotifications.physicalDevice') ||
          'Must use physical device for Push Notifications',
        type: 'info',
      });
    } else if (!showToast) {
      alert(
        t?.('pushNotifications.physicalDevice') ||
          'Must use physical device for Push Notifications',
      );
    }
  }

  return token;
}

function UnauthenticatedAppContent() {
  const options = React.useMemo(
    () => ({
      headerShown: false,
    }),
    [],
  );
  return (
    <Stack.Navigator initialRouteName="SplashScreen" screenOptions={options}>
      <Stack.Screen name="AuthGate" component={AuthGate} />
      <Stack.Screen name="SplashScreen" component={SplashScreen} options={options} />
      <Stack.Screen name="Login" component={LoginScreen} options={options} />
      <Stack.Screen name="Signup" component={SignupScreen} options={options} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={options} />
    </Stack.Navigator>
  );
}

function AuthenticatedAppContent() {
  const authData = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authData?.user?.id) {
      return;
    }

    registerForPushNotificationsAsync(showToast, t).then(async (token) => {
      try {
        if (!token || !authData?.user?.id || token.includes('Error')) {
          return;
        }

        const resp = await supabase.from('user_push_tokens').upsert(
          {
            user_id: authData.user.id,
            token: token,
            device_type: Platform.OS,
          },
          {
            onConflict: 'user_id,token',
          },
        );

        const { error } = resp;

        if (error) {
          console.error('Error storing push token:', error);
        }
      } catch (error) {
        console.error('Failed to store push token:', error);
      }
    });
  }, [authData?.user?.id, showToast, t]);

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
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
        options={{
          headerShown: false,
          presentation: 'modal',
          animationTypeForReplace: 'push',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="AddReview" component={AddReviewScreen} options={{ headerShown: false }} />
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
    </Stack.Navigator>
  );
}

function AppContent() {
  const { user, loading: authLoading, initialized } = useAuth();
  const colorScheme = useColorScheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const [authKey, setAuthKey] = useState(0);

  // Global unified invitation notification state
  const [showGlobalInvitationNotification, setShowGlobalInvitationNotification] = useState(false);

  // Global promotional modal state
  const {
    showModal: showPromotionalModal,
    modalContentType,
    setShowModal: setShowPromotionalModal,
    checkForPromotionalContent,
  } = usePromotionalModal();

  // Global unified invitation checking function
  const checkForGlobalInvitations = React.useCallback(async () => {
    if (!user?.email || !user?.id) {
      return;
    }

    try {
      // Check for relationship invitations from pending_invitations table
      const { data: relationshipInvitations, error: relError } = await supabase
        .from('pending_invitations')
        .select('id, invited_by, created_at')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (relError) {
        return;
      }

      // Check for relationship invitations from notifications table
      const { data: notificationRelationshipInvitations, error: notifRelError } = await supabase
        .from('notifications')
        .select('id, created_at')
        .eq('user_id', user.id)
        .in('type', ['supervisor_invitation', 'student_invitation'])
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (notifRelError) {
        return;
      }

      // Check for collection invitations
      const { data: collectionInvitations, error: colError } = await supabase
        .from('collection_invitations')
        .select('id, created_at')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (colError) {
        return;
      }

      // Check for notification-based collection invitations
      const { data: notificationInvitations, error: notifError } = await supabase
        .from('notifications')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('type', 'collection_invitation')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (notifError) {
        return;
      }

      const totalInvitations =
        (relationshipInvitations?.length || 0) +
        (notificationRelationshipInvitations?.length || 0) +
        (collectionInvitations?.length || 0) +
        (notificationInvitations?.length || 0);

      console.log(
        relationshipInvitations,
        notificationRelationshipInvitations,
        collectionInvitations,
        notificationInvitations,
      );

      console.log('Total invitations:', totalInvitations);

      if (totalInvitations > 0) {
        console.log('Set 1');
        setShowGlobalInvitationNotification(true);
      } else if (totalInvitations === 0) {
        // If no invitations, check for promotional content
        setTimeout(async () => {
          const result = await checkForPromotionalContent('modal');
        }, 1000);
      }
    } catch (error) {
      console.error('🌍 Global invitation check error:', error);
    }
  }, [user?.email, user?.id, checkForPromotionalContent]);

  // Register opener so other parts can open modal instantly without prop drilling
  useEffect(() => {
    registerInvitationModalOpener(() => setShowGlobalInvitationNotification(true));
  }, []);

  // Set up global invitation subscription
  useEffect(() => {
    if (!user?.email) {
      return;
    }

    // Check immediately when user is available
    checkForGlobalInvitations();

    // Set up real-time subscription to pending invitations
    const invitationSubscription = supabase
      .channel('global_pending_invitations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_invitations',
        },
        (payload: any) => {
          try {
            const row = payload?.new;
            const targetEmail = (row?.email || '').toLowerCase();
            if (targetEmail === (user.email || '').toLowerCase() && row?.status === 'pending') {
              setTimeout(() => setShowGlobalInvitationNotification(true), 150);
            }
          } catch (e) {
            console.log('🌍 Global: INSERT handler error', e);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_invitations',
        },
        (payload: any) => {
          try {
            const row = payload?.new;
            const targetEmail = (row?.email || '').toLowerCase();
            if (targetEmail === (user.email || '').toLowerCase()) {
              setTimeout(() => checkForGlobalInvitations(), 250);
            }
          } catch (e) {
            console.log('🌍 Global: UPDATE handler error', e);
          }
        },
      )
      .subscribe();

    // Fallback: open modal if a notification insert arrives for invitation types
    const notifSubscription = supabase
      .channel('global_invitation_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          try {
            const row = payload?.new;
            if (row?.type === 'supervisor_invitation' || row?.type === 'student_invitation') {
              console.log('Set 2');
              setShowGlobalInvitationNotification(true);
            } else if (row?.type === 'collection_invitation') {
              console.log('Set 3');
              setShowGlobalInvitationNotification(true);
            }
          } catch {}
        },
      )
      .subscribe();

    // Collection invitation subscription
    const collectionInvitationSubscription = supabase
      .channel('global_collection_invitations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collection_invitations',
          filter: `invited_user_id=eq.${user.id}`,
        },
        (payload: any) => {
          try {
            const row = payload?.new;
            if (row?.status === 'pending') {
              console.log('Set 4');
              setTimeout(() => setShowGlobalInvitationNotification(true), 150);
            }
          } catch (e) {
            console.log('📁 Collection invitation INSERT handler error', e);
          }
        },
      )
      .subscribe();

    return () => {
      invitationSubscription.unsubscribe();
      notifSubscription.unsubscribe();
      collectionInvitationSubscription.unsubscribe();
    };
  }, [user?.email, user?.id, checkForGlobalInvitations]);

  // React Native doesn't have window, use a different approach for cross-component communication
  // The NotificationBell will trigger checkForGlobalInvitations directly via the subscription

  // Add app-level logging and crash monitoring
  useEffect(() => {
    // Clear old crash reports
    clearOldCrashReports().catch((error) => {
      logError('Failed to clear old crash reports', error);
    });

    // Monitor app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        logWarn('App went to background - potential memory pressure point');
      } else if (nextAppState === 'active') {
        logInfo('App became active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [colorScheme]);

  // Set up push notification navigation reference
  useEffect(() => {
    if (navigationRef.current) {
      pushNotificationService.setNavigationRef(navigationRef);
      logInfo('Push notification navigation reference set');
    }
  }, []);

  // Enable analytics collection when the app starts
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Check if the analytics module is available
        if (!analytics().app) {
          return;
        }

        // Make sure analytics collection is enabled
        await analytics().setAnalyticsCollectionEnabled(true);
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
  }, []);

  // Simple fallback: just dismiss browser and let React's conditional rendering handle navigation
  useEffect(() => {
    if (initialized && user) {
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
        if (
          currentRoute === 'Login' ||
          currentRoute === 'SplashScreen' ||
          currentRoute === 'Signup'
        ) {
          Updates.reloadAsync().catch((e) => console.warn('Updates.reloadAsync failed', e));
        }
      }, 1200);
    }
  }, [initialized, user]);

  // Simple Supabase auth state logger
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
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

  // Initialize Firebase Analytics session tracking
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Start session tracking when app initializes
        await AppAnalytics.startSession();
        logInfo('Firebase Analytics session started');
      } catch (error) {
        logWarn('Failed to start Firebase Analytics session', error as Error);
      }
    };

    initializeAnalytics();

    // End session when app is about to close
    const handleAppTermination = async () => {
      try {
        await AppAnalytics.endSession();
      } catch (error) {
        // Silently fail session end tracking
      }
    };

    // Clean up session on unmount
    return () => {
      handleAppTermination();
    };
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

  // Only return null during initial app startup, not during login attempts
  // This prevents navigation stack from being destroyed during authentication
  if (authLoading && !initialized) {
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

  console.log('showGlobalInvitationNotification', showGlobalInvitationNotification);

  return (
    <>
      <NetworkAlert />

      {/* Global Unified Invitation Modal (outside navigator for top-most priority) */}
      <UnifiedInvitationModal
        visible={showGlobalInvitationNotification}
        onClose={() => {
          setShowGlobalInvitationNotification(false);
        }}
        onInvitationHandled={() => {
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
          {!user ? <UnauthenticatedAppContent /> : <AuthenticatedAppContent />}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          {/* Tour overlay - rendered at app level */}
          <TourOverlay />

          {/* Promotional modal - rendered at app level */}
          <PromotionalModal
            visible={showPromotionalModal}
            onClose={() => setShowPromotionalModal(false)}
            contentType={modalContentType}
          />

          {/* Global Recording Widget - rendered at app level */}
          <GlobalRecordingWidget />

          {/* Global Celebration Modal - rendered at app level */}
          <GlobalCelebrationModal />
        </ToastProvider>
      </NavigationContainer>
    </>
  );
}

export default AppContent;
