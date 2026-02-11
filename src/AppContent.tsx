import { View, useColorScheme, Platform, NativeModules, AppState } from 'react-native';
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
import { GlobalCelebrationModal } from './components/GlobalCelebrationModal';
import { PromotionModal } from './components/PromotionModal';
import type { NavigationContainerRef } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingScreen } from './components/LoadingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecording } from './contexts/RecordingContext';
import { useModal } from './contexts/ModalContext';
import { CreateRouteSheet } from './components/CreateRouteSheet';
import { BetaTestingSheetModal } from './components/BetaTestingSheet';
import { ActionSheetModal } from './components/ActionSheet';
import { shouldShowInteractiveOnboarding } from './components/OnboardingInteractive';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    analyticsModule = require('@react-native-firebase/analytics').default;
  } else {
    analyticsModule = () => ({
      setAnalyticsCollectionEnabled: async () => {},
      logScreenView: async () => {},
      app: null,
    });
  }
} catch (error) {
  analyticsModule = () => ({
    setAnalyticsCollectionEnabled: async () => {},
    logScreenView: async () => {},
    app: null,
  });
}

const analytics = analyticsModule;

// Auth screens
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
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
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={options} />
    </Stack.Navigator>
  );
}

function AuthenticatedAppContent() {
  const authData = useAuth();
  const { showToast } = useToast();
  const { t, refreshTranslations } = useTranslation();
  
  // Get contexts - these hooks must be called unconditionally
  // They will throw if not within providers, which is expected
  const recordingContext = useRecording();
  const modalContext = useModal();
  
  // Extract functions from contexts with optional chaining for safety
  const startRecording = recordingContext?.startRecording;
  const showModal = modalContext?.showModal;
  const hideModal = modalContext?.hideModal;

  useEffect(() => {
    if (!authData?.user?.id) {
      return;
    }

    registerForPushNotificationsAsync(showToast, t).then(async (token) => {

      console.log('Token received:', token);
      console.log('Error details:', token?.includes('Error') ? token : 'No error');

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

  // Refresh translations on mount to ensure we have the latest
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        await refreshTranslations();
      } catch (error) {
        console.error('❌ [AppContent] Error refreshing translations:', error);
      }
    };
    loadTranslations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log('🎯 [AuthenticatedAppContent] Rendering');

  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: Platform.OS === 'android' ? insets.bottom : 0,
      }}
    >
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
      </Stack.Navigator>
    </View>
  );
}

function AppContent() {
  const { user, loading: authLoading, initialized } = useAuth();
  const colorScheme = useColorScheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const [authKey, setAuthKey] = useState(0);
  
  // Get contexts - these hooks must be called unconditionally
  const recordingContext = useRecording();
  const modalContext = useModal();

  // Global unified invitation notification state
  const [showGlobalInvitationNotification, setShowGlobalInvitationNotification] = useState(false);
  
  // Promotion modal state
  const [promotionContents, setPromotionContents] = useState<any[]>([]);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  // Ref to track modal state for navigation checks (avoids stale closure issues)
  const showPromotionModalRef = useRef(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    showPromotionModalRef.current = showPromotionModal;
  }, [showPromotionModal]);
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

      if (totalInvitations > 0) {
        setShowGlobalInvitationNotification(true);
      }
    } catch (error) {
      console.error('🌍 Global invitation check error:', error);
    }
  }, [user?.email, user?.id]);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload?.new;
          const targetEmail = (row?.email || '').toLowerCase();
          if (targetEmail === (user.email || '').toLowerCase() && row?.status === 'pending') {
            setTimeout(() => setShowGlobalInvitationNotification(true), 150);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload?.new;
          const targetEmail = (row?.email || '').toLowerCase();
          if (targetEmail === (user?.email || '').toLowerCase()) {
            setTimeout(() => checkForGlobalInvitations(), 250);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload?.new;
          if (row?.type === 'supervisor_invitation' || row?.type === 'student_invitation') {
            setShowGlobalInvitationNotification(true);
          } else if (row?.type === 'collection_invitation') {
            setShowGlobalInvitationNotification(true);
          }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload?.new;
          if (row?.status === 'pending') {
            setTimeout(() => setShowGlobalInvitationNotification(true), 150);
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

  // Handle OAuth deep links and password reset deep links
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        
        // Handle password reset deep links
        if (parsed.path === 'reset-password') {
          const token = (parsed.queryParams?.token as string) || '';
          if (token && navigationRef.current) {
            // Navigate to ResetPassword screen with token
            navigationRef.current.navigate('ResetPassword', { token });
          }
          return;
        }
        
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
    } = supabase.auth.onAuthStateChange((_event) => {
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
      } catch {
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

  // Check if modal should be shown based on conditions
  const shouldShowModal = React.useCallback(async (content: any, userId: string): Promise<boolean> => {
    if (!content || !userId) return false;

    const contentId = content.id;
    const storageKey = `promotion_modal_${contentId}_${userId}`;

    try {
      // Get stored data
      const storedData = await AsyncStorage.getItem(storageKey);
      const seenData = storedData ? JSON.parse(storedData) : null;

      // Check if content was updated (force reset from admin)
      if (seenData && content.updated_at) {
        const contentUpdatedAt = new Date(content.updated_at);
        const lastStoredUpdate = seenData.contentUpdatedAt ? new Date(seenData.contentUpdatedAt) : null;
        
        // If content was updated after we last saw it, reset the seen state
        if (!lastStoredUpdate || contentUpdatedAt > lastStoredUpdate) {
          // Clear the seen state to allow showing again
          await AsyncStorage.removeItem(storageKey);
          // Return true to show the modal
          return true;
        }
      }

      // Check frequency
      const frequency = content.modal_frequency || 'once';
      const now = new Date();
      
      if (seenData) {
        const lastSeen = new Date(seenData.lastSeen);
        const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));

        switch (frequency) {
          case 'once':
            // Already seen once, don't show again unless reset
            if (content.modal_reset_days && daysSinceLastSeen >= content.modal_reset_days) {
              // Reset period passed, allow showing again
              break;
            }
            return false;
          case 'daily':
            if (daysSinceLastSeen < 1) return false;
            break;
          case 'weekly':
            if (daysSinceLastSeen < 7) return false;
            break;
          case 'monthly':
            if (daysSinceLastSeen < 30) return false;
            break;
          case 'always':
            // Always show, no check needed
            break;
        }

        // Check max show count
        if (content.modal_max_show_count && seenData.showCount >= content.modal_max_show_count) {
          return false;
        }
      }

      // Check inactive days requirement
      if (content.modal_show_after_days) {
        // Get user's last login from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('updated_at, created_at')
          .eq('id', userId)
          .single();

        if (profile) {
          const lastActivity = profile.updated_at ? new Date(profile.updated_at) : new Date(profile.created_at);
          const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceActivity < content.modal_show_after_days) {
            return false; // User is too active, don't show
          }
        }
      }

      // Check app version
      if (content.modal_min_app_version) {
        const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || '0.0.0';
        const minVersion = content.modal_min_app_version;
        
        // Simple version comparison (assumes semantic versioning)
        const compareVersions = (v1: string, v2: string): number => {
          const parts1 = v1.split('.').map(Number);
          const parts2 = v2.split('.').map(Number);
          for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
          }
          return 0;
        };

        if (compareVersions(appVersion, minVersion) < 0) {
          return false; // App version too old
        }
      }

      // Check user segments (simplified - you may want to enhance this)
      if (content.modal_user_segments && content.modal_user_segments.length > 0) {
        const segments = content.modal_user_segments;
        if (!segments.includes('all_users')) {
          // Get user profile to determine segment
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at, updated_at')
            .eq('id', userId)
            .single();

          if (profile) {
            const createdAt = new Date(profile.created_at);
            const updatedAt = profile.updated_at ? new Date(profile.updated_at) : createdAt;
            const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const daysSinceUpdated = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

            let userSegment = 'returning_users';
            if (daysSinceCreated < 7) {
              userSegment = 'new_users';
            } else if (daysSinceUpdated > 30) {
              userSegment = 'inactive_users';
            }

            if (!segments.includes(userSegment)) {
              return false; // User doesn't match any selected segment
            }
          }
        }
      }

      return true;
    } catch (error) {
      logError('Error checking if modal should show', error as Error);
      return false;
    }
  }, []);

  // Track modal statistics
  const trackModalEvent = React.useCallback(async (
    contentId: string,
    eventType: 'opened' | 'viewed' | 'dismissed' | 'action_clicked' | 'next_clicked' | 'previous_clicked',
    actionType?: string
  ) => {
    if (!user?.id) return;
    
    // Fire and forget - don't block UI
    // Use an IIFE to handle the promise properly
    (async () => {
      try {
        const { error } = await supabase.from('promotion_modal_stats').insert({
          content_id: contentId,
          user_id: user.id,
          event_type: eventType,
          action_type: actionType || null,
          metadata: {
            app_version: Constants.expoConfig?.version || 'unknown',
            platform: Platform.OS,
          }
        });
        
        if (error) {
          logError('Error tracking modal event', error as Error);
        }
      } catch (error) {
        logError('Error tracking modal event', error as Error);
      }
    })();
  }, [user?.id]);

  // Store modal as seen
  const markModalAsSeen = React.useCallback(async (contentId: string, userId: string, contentUpdatedAt?: string) => {
    try {
      const storageKey = `promotion_modal_${contentId}_${userId}`;
      const storedData = await AsyncStorage.getItem(storageKey);
      const seenData = storedData ? JSON.parse(storedData) : { showCount: 0 };
      
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        lastSeen: new Date().toISOString(),
        showCount: (seenData.showCount || 0) + 1,
        contentUpdatedAt: contentUpdatedAt || new Date().toISOString() // Store content's updated_at timestamp
      }));
      
      // Track viewed event
      trackModalEvent(contentId, 'viewed');
    } catch (error) {
      logError('Error marking modal as seen', error as Error);
    }
  }, [trackModalEvent]);

  // Fetch and show promotion modal content
  useEffect(() => {
    const fetchPromotionContent = async () => {
      if (!user?.id) {
        return;
      }

      try {
        // IMPORTANT: Check if onboarding should be shown first - onboarding takes priority
        const shouldShowOnboarding = await shouldShowInteractiveOnboarding('interactive_onboarding', user.id);
        if (shouldShowOnboarding) {
          logInfo('Onboarding should be shown - skipping promotion modals');
          return; // Don't show promotion modals if onboarding is needed
        }

        // Fetch all active promotion content that should be shown as modal
        // Include YouTube fields for video support
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('content_type', 'promotion')
          .eq('active', true)
          .eq('is_modal', true)
          .overlaps('platforms', ['mobile'])
          .order('order_index', { ascending: true });

        if (error) {
          logError('Error fetching promotion content', error);
          return;
        }

        if (data && data.length > 0) {
          // Check all conditions for each modal in parallel for better performance
          const eligibilityChecks = await Promise.all(
            data.map(content => shouldShowModal(content, user.id))
          );
          
          // Filter to only eligible modals
          const eligibleModals = data.filter((_, index) => eligibilityChecks[index]);

          if (eligibleModals.length > 0) {
            setPromotionContents(eligibleModals);
            setCurrentModalIndex(0);
            setShowPromotionModal(true);
            // Track opened event for first modal
            trackModalEvent(eligibleModals[0].id, 'opened').catch(err => {
              logError('Error tracking modal opened', err as Error);
            });
            // Mark first modal as seen immediately when shown (fire and forget for performance)
            markModalAsSeen(eligibleModals[0].id, user.id, eligibleModals[0].updated_at).catch(err => {
              logError('Error marking modal as seen', err as Error);
            });
          }
        }
      } catch (error) {
        logError('Error in fetchPromotionContent', error);
      }
    };

    if (user && initialized) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        fetchPromotionContent();
      }, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initialized]); // Only depend on user.id and initialized to avoid unnecessary re-runs

  // Handle promotion modal actions
  const handlePromotionAction = React.useCallback(async (action: string, contentId?: string) => {
    logInfo('Promotion action pressed', { action, contentId });
    
    // Track action click if contentId provided
    if (contentId) {
      trackModalEvent(contentId, 'action_clicked', action).catch(err => {
        logError('Error tracking action click', err as Error);
      });
    }
    
    // Get fresh context values - these are from the component scope
    const currentShowModal = modalContext?.showModal;
    const currentHideModal = modalContext?.hideModal;
    const currentStartRecording = recordingContext?.startRecording;
    
    logInfo('Promotion action context check', { 
      hasShowModal: !!currentShowModal, 
      hasHideModal: !!currentHideModal, 
      hasStartRecording: !!currentStartRecording,
      hasNavigationRef: !!navigationRef.current 
    });
    
    try {
      switch (action) {
        case 'open_feedback':
          // Show BetaTestingSheetModal
          if (currentShowModal) {
            logInfo('Opening feedback modal via showModal');
            currentShowModal(
              <BetaTestingSheetModal
                onOpenBuyCoffee={() => {
                  Linking.openURL('https://buymeacoffee.com/vromm');
                }}
                onOpenBetaWebView={() => {
                  Linking.openURL('https://beta.vromm.se');
                }}
                onShareApp={async () => {
                  try {
                    const { Share } = await import('react-native');
                    await Share.share({
                      message: 'Check out Vromm - The future of driving education! https://vromm.se',
                      title: 'Share Vromm',
                    });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }}
                onOpenAbout={() => {
                  Linking.openURL('https://vromm.se/about');
                }}
              />
            );
          } else {
            logWarn('showModal not available, falling back to navigation');
            // Fallback: navigate to BetaTestingTab
            if (navigationRef.current) {
              navigationRef.current.navigate('MainTabs', { screen: 'BetaTestingTab' });
            } else {
              logError('Navigation ref not available for open_feedback', new Error('Navigation ref is null'));
            }
          }
          break;
        case 'open_mapview':
          // Navigate to MapTab which contains MapScreen
          logInfo('Navigating to MapTab');
          if (navigationRef.current) {
            navigationRef.current.navigate('MainTabs', { screen: 'MapTab' });
          } else {
            logError('Navigation ref not available for open_mapview', new Error('Navigation ref is null'));
          }
          break;
        case 'open_progress':
          // Navigate to ProgressTab
          logInfo('Navigating to ProgressTab');
          if (navigationRef.current) {
            navigationRef.current.navigate('MainTabs', { screen: 'ProgressTab' });
          } else {
            logError('Navigation ref not available for open_progress', new Error('Navigation ref is null'));
          }
          break;
        case 'create_route':
          // Show CreateRouteSheet modal
          logInfo('Opening create route modal');
          if (currentShowModal && currentHideModal) {
            currentShowModal(
              <CreateRouteSheet
                visible={true}
                onClose={() => {
                  if (currentHideModal) {
                    currentHideModal();
                  }
                }}
                onRouteCreated={(routeId) => {
                  logInfo('Route created from promotion modal', { routeId });
                  if (currentHideModal) {
                    currentHideModal();
                  }
                }}
              />
            );
          } else {
            logWarn('showModal/hideModal not available, falling back to navigation');
            // Fallback: navigate to CreateRoute screen
            if (navigationRef.current) {
              navigationRef.current.navigate('CreateRoute' as any);
            } else {
              logError('Navigation ref not available for create_route', new Error('Navigation ref is null'));
            }
          }
          break;
        case 'record_route':
          // Show ActionSheet first so user can see options and choose "Record Driving"
          logInfo('Opening ActionSheet for recording');
          if (currentShowModal && currentHideModal) {
            currentShowModal(
              <ActionSheetModal
                onCreateRoute={() => {
                  logInfo('Create route from ActionSheet');
                  if (currentHideModal) {
                    currentHideModal();
                  }
                }}
                onMaximizeWizard={() => {
                  logInfo('Maximize wizard from ActionSheet');
                  if (currentHideModal) {
                    currentHideModal();
                  }
                }}
                onCreateEvent={() => {
                  logInfo('Create event from ActionSheet');
                  if (currentHideModal) {
                    currentHideModal();
                  }
                }}
                onNavigateToMap={(routeId) => {
                  logInfo('Navigate to map from ActionSheet', { routeId });
                  if (currentHideModal) {
                    currentHideModal();
                  }
                  if (navigationRef.current) {
                    navigationRef.current.navigate('MainTabs', { screen: 'MapTab' });
                  }
                }}
              />
            );
          } else {
            logWarn('showModal/hideModal not available, falling back to navigation');
            // Fallback: navigate to MapTab
            if (navigationRef.current) {
              navigationRef.current.navigate('MainTabs', { screen: 'MapTab' });
            } else {
              logError('Navigation ref not available for record_route', new Error('Navigation ref is null'));
            }
          }
          break;
        case 'select_role':
          // Navigate to RoleSelectionScreen
          logInfo('Navigating to RoleSelectionScreen');
          if (navigationRef.current) {
            navigationRef.current.navigate('RoleSelectionScreen' as any);
          } else {
            logError('Navigation ref not available for select_role', new Error('Navigation ref is null'));
          }
          break;
        case 'select_connection':
          // Navigate to HomeTab with param to trigger connections modal
          logInfo('Navigating to HomeTab for connections');
          if (navigationRef.current) {
            navigationRef.current.navigate('MainTabs', { 
              screen: 'HomeTab',
              params: { openConnectionsModal: true }
            });
          } else {
            logError('Navigation ref not available for select_connection', new Error('Navigation ref is null'));
          }
          break;
        case 'buy_me_a_coffee':
          // Open Buy Me a Coffee link
          logInfo('Opening Buy Me a Coffee link');
          try {
            const canOpen = await Linking.canOpenURL('https://buymeacoffee.com/vromm');
            if (canOpen) {
              await Linking.openURL('https://buymeacoffee.com/vromm');
            } else {
              logWarn('Cannot open Buy Me a Coffee URL');
            }
          } catch (error) {
            logError('Error opening Buy Me a Coffee link', error as Error);
          }
          break;
        default:
          // Handle external URL actions (format: external_url:key)
          if (action.startsWith('external_url:')) {
            logWarn('External URL action should be handled in PromotionModal', { action });
          } else {
            logWarn('Unknown promotion action', { action });
          }
          break;
      }
    } catch (error) {
      logError('Error handling promotion action', error as Error);
    }
  }, [modalContext, recordingContext, trackModalEvent]); // Include contexts in deps to get fresh values

  // Only return null during initial app startup, not during login attempts
  // This prevents navigation stack from being destroyed during authentication

  console.log('🎯 [AppContent] Rendering', authLoading, initialized);
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

      {/* Promotion Modal - high priority, shown after app loads */}
      {user && promotionContents.length > 0 && (
        <PromotionModal
          visible={showPromotionModal}
          onClose={() => {
            const currentContent = promotionContents[currentModalIndex];
            if (currentContent) {
              // Track dismissed event
              trackModalEvent(currentContent.id, 'dismissed').catch(err => {
                logError('Error tracking modal dismissed', err as Error);
              });
            }
            setShowPromotionModal(false);
            setPromotionContents([]);
            setCurrentModalIndex(0);
          }}
          content={promotionContents[currentModalIndex]}
          onActionPress={(action) => {
            const currentContent = promotionContents[currentModalIndex];
            handlePromotionAction(action, currentContent?.id);
          }}
          onNext={() => {
            const currentContent = promotionContents[currentModalIndex];
            if (currentContent) {
              trackModalEvent(currentContent.id, 'next_clicked').catch(err => {
                logError('Error tracking next click', err as Error);
              });
            }
            if (currentModalIndex < promotionContents.length - 1) {
              const nextIndex = currentModalIndex + 1;
              setCurrentModalIndex(nextIndex);
              // Mark as seen asynchronously (fire and forget for performance)
              markModalAsSeen(promotionContents[nextIndex].id, user.id, promotionContents[nextIndex].updated_at).catch(err => {
                logError('Error marking modal as seen', err as Error);
              });
            } else {
              // Last modal, close
              setShowPromotionModal(false);
              setPromotionContents([]);
              setCurrentModalIndex(0);
            }
          }}
          onPrevious={() => {
            const currentContent = promotionContents[currentModalIndex];
            if (currentContent) {
              trackModalEvent(currentContent.id, 'previous_clicked').catch(err => {
                logError('Error tracking previous click', err as Error);
              });
            }
            if (currentModalIndex > 0) {
              setCurrentModalIndex(currentModalIndex - 1);
            }
          }}
          currentIndex={currentModalIndex}
          totalCount={promotionContents.length}
        />
      )}

      <NavigationContainer
        key={`${user ? 'nav-app' : 'nav-auth'}-${authKey}`}
        ref={navigationRef}
        onStateChange={async (state) => {
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

            // Check for eligible modals when navigating to new screens
            // Always check when navigating to HomeTab/MapTab/ProgressTab, even if a modal was just closed
            if (user?.id && (screen_name === 'HomeTab' || screen_name === 'MapTab' || screen_name === 'ProgressTab')) {
              // Small delay to let screen load, then check for modals
              setTimeout(async () => {
                try {
                  // Don't show if a modal is already visible (use ref to get current value)
                  if (showPromotionModalRef.current) {
                    logInfo('Modal already visible, skipping check');
                    return;
                  }

                  // IMPORTANT: Check if onboarding should be shown first - onboarding takes priority
                  const shouldShowOnboarding = await shouldShowInteractiveOnboarding('interactive_onboarding', user.id);
                  if (shouldShowOnboarding) {
                    logInfo('Onboarding should be shown - skipping promotion modals on navigation');
                    return; // Don't show promotion modals if onboarding is needed
                  }

                  logInfo('Checking for eligible modals on navigation', { screen_name });

                  const { data } = await supabase
                    .from('content')
                    .select('*')
                    .eq('content_type', 'promotion')
                    .eq('active', true)
                    .eq('is_modal', true)
                    .overlaps('platforms', ['mobile'])
                    .order('order_index', { ascending: true });

                  if (data && data.length > 0) {
                    const eligibilityChecks = await Promise.all(
                      data.map(content => shouldShowModal(content, user.id))
                    );
                    
                    const eligibleModals = data.filter((_, index) => eligibilityChecks[index]);

                    if (eligibleModals.length > 0) {
                      logInfo('Found eligible modals on navigation', { count: eligibleModals.length });
                      setPromotionContents(eligibleModals);
                      setCurrentModalIndex(0);
                      setShowPromotionModal(true);
                      markModalAsSeen(eligibleModals[0].id, user.id, eligibleModals[0].updated_at).catch(err => {
                        logError('Error marking modal as seen', err as Error);
                      });
                    } else {
                      logInfo('No eligible modals found on navigation');
                    }
                  }
                } catch (error) {
                  logError('Error checking for modals on navigation', error as Error);
                }
              }, 1000);
            }
          }
        }}
      >
        <ToastProvider>
          {!user ? <UnauthenticatedAppContent /> : <AuthenticatedAppContent />}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

          {/* Tour overlay - rendered at app level */}
          <TourOverlay />

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
