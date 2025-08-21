import React, { useEffect, useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tokens } from '../tokens';
import { useTranslation } from '../contexts/TranslationContext';
import { TabParamList, RootStackParamList } from '../types/navigation';
import {
  Platform,
  useColorScheme,
  TouchableOpacity,
  ViewStyle,
  View,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  ColorSchemeName,
  TextStyle,
  Image,
  Share,
} from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { HomeIcon, MapIcon, ProfileIcon, PractiseIcon } from './icons/TabIcons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, YStack, XStack, Text, Card } from 'tamagui';
import { logNavigation, logInfo, logError } from '../utils/logger';
import { useNavigationState, useNavigation, CommonActions } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useCreateRoute } from '../contexts/CreateRouteContext';
import { ActionSheetModal } from './ActionSheet';
import { BetaInfoModal } from './BetaInfoModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomWebView from './CustomWebView';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import services for badge counts
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/explore/MapScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { useAuth } from '../context/AuthContext';
import { UsersScreen } from '../screens/UsersScreen';
import { RouteDetailScreen } from '../screens/RouteDetailScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { CreateRouteScreen } from '../screens/CreateRouteScreen';
import { SavedRoutes } from '../screens/HomeScreen/SavedRoutes';
import { CommunityFeedScreen } from '../screens/CommunityFeedScreen';
import { CreatedRoutes } from '../screens/HomeScreen/CreatedRoutes';
import { NearByRoutes } from '../screens/HomeScreen/NearByRoutes';
import { DrivenRoutes } from '../screens/HomeScreen/DrivenRoutes';
import { RouteListScreen } from '../screens/RouteListScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 64;
const TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_INSET;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width

// Nested stack under Home tab to keep tab bar visible across app screens
const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
    <HomeStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    <HomeStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <HomeStack.Screen name="UsersScreen" component={UsersScreen} />
    <HomeStack.Screen name="RouteDetail" component={RouteDetailScreen as any} />
    <HomeStack.Screen name="Messages" component={MessagesScreen} />
    <HomeStack.Screen name="Events" component={EventsScreen} />
    <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    <HomeStack.Screen name="CreateEvent" component={CreateEventScreen} />
    <HomeStack.Screen name="CreateRoute" component={CreateRouteScreen} />
    <HomeStack.Screen name="RouteList" component={RouteListScreen as any} />
    <HomeStack.Screen name="SavedRoutes" component={SavedRoutes} />
    <HomeStack.Screen name="CommunityFeedScreen" component={CommunityFeedScreen} />
    <HomeStack.Screen name="CreatedRoutes" component={CreatedRoutes} />
    <HomeStack.Screen name="NearByRoutes" component={NearByRoutes} />
    <HomeStack.Screen name="DrivenRoutes" component={DrivenRoutes} />
  </HomeStack.Navigator>
);

// Hamburger Drawer Component
const HamburgerDrawer = ({
  isOpen,
  onClose,
  colorScheme,
  navigation,
  onNavigateHome,
  onOpenBetaInfo,
  onOpenBetaWebView,
  onOpenBuyCoffee,
  onOpenAbout,
  unreadMessageCount,
  unreadNotificationCount,
  unreadEventCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  colorScheme: ColorSchemeName;
  navigation: any;
  onNavigateHome: (screen: string, params?: any) => void;
  onOpenBetaInfo: () => void;
  onOpenBetaWebView: () => void;
  onOpenBuyCoffee: () => void;
  onOpenAbout: () => void;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  unreadEventCount: number;
}) => {
  const { t } = useTranslation();
  const { signOut, user, profile } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  // WebViews are handled at TabNavigator level

  // Track what was seen when drawer was last opened (for menu badge only)
  const [seenMessageCount, setSeenMessageCount] = useState(0);
  const [seenNotificationCount, setSeenNotificationCount] = useState(0);
  const [seenEventCount, setSeenEventCount] = useState(0);

  const onOpenBuyCoffeeLocal = () => {
    console.log('[Drawer] Open Buy Me a Coffee tapped');
    onOpenBuyCoffee();
    onClose();
  };

  const onOpenBetaWebViewLocal = () => {
    console.log('[Drawer] Open Beta Website tapped');
    onOpenBetaWebView();
    onClose();
  };

  const onOpenAboutLocal = () => {
    console.log('[Drawer] About tapped');
    onOpenAbout();
    onClose();
  };

  const onShareApp = async () => {
    console.log('[Drawer] Share App tapped');
    try {
      await Share.share({
        message: 'Check out Vromm – smarter driving practice: https://www.vromm.se',
        url: 'https://www.vromm.se',
        title: 'Vromm',
      });
    } catch (e) {
      console.error('Failed to share app', e);
    } finally {
      onClose();
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('[Drawer] Logout tapped');
      await signOut();
      console.log('[Drawer] Logout success');
    } catch (e) {
      console.error('Error during sign out from drawer:', e);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH - DRAWER_WIDTH,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      // Update "seen" counts when drawer opens (for menu badge tracking)
      setSeenMessageCount(unreadMessageCount);
      setSeenNotificationCount(unreadNotificationCount);
      setSeenEventCount(unreadEventCount);
      console.log('📬 Updated seen counts when drawer opened:', {
        messages: unreadMessageCount,
        notifications: unreadNotificationCount,
        events: unreadEventCount
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isOpen]);

  const menuItems = [
    { icon: 'user', label: t('drawer.myProfile') || 'My Profile', action: () => { if (user?.id) { onNavigateHome('PublicProfile', { userId: user.id }); } onClose(); } },
    { icon: 'settings', label: t('drawer.settings') || 'Settings', action: () => { onNavigateHome('ProfileScreen'); onClose(); } },
    { icon: 'users', label: t('drawer.users') || 'Users', action: () => { onNavigateHome('UsersScreen'); onClose(); } },
    { 
      icon: 'message-circle', 
      label: t('drawer.messages') || 'Messages', 
      action: () => { onNavigateHome('Messages'); onClose(); },
      badge: unreadMessageCount,
      badgeColor: '#EF4444'
    },
    { 
      icon: 'calendar', 
      label: t('drawer.events') || 'Events', 
      action: () => { onNavigateHome('Events'); onClose(); },
      badge: unreadEventCount,
      badgeColor: '#EF4444'
    },
    { 
      icon: 'bell', 
      label: t('drawer.notifications') || 'Notifications', 
      action: () => { onNavigateHome('Notifications'); onClose(); },
      badge: unreadNotificationCount,
      badgeColor: '#EF4444'
    },
    { icon: 'globe', label: t('drawer.betaWebsite') || 'Beta Website', action: () => onOpenBetaWebViewLocal() },
    { icon: 'coffee', label: t('drawer.buyMeCoffee') || 'Buy Me a Coffee', action: () => onOpenBuyCoffeeLocal() },
    { icon: 'share', label: t('drawer.shareApp') || 'Share App', action: () => onShareApp() },
    { icon: 'info', label: t('drawer.about') || 'About', action: () => onOpenAboutLocal() },
    { icon: 'log-out', label: t('drawer.logout') || 'Logout', action: () => handleSignOut(), danger: true },
  ];

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          opacity: overlayOpacity,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: slideAnim,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: -2, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 8,
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <YStack flex={1} padding="$4" gap="$2">
            {/* Profile Header */}
            <Card padding="$3" marginBottom="$2">
              <TouchableOpacity
                onPress={() => { 
                  if (user?.id) { onNavigateHome('PublicProfile', { userId: user.id }); }
                  onClose();
                }}
                accessibilityLabel="View public profile"
              >
                <XStack alignItems="center" gap="$3">
                  {profile?.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#EEEEEE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="user" size={22} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                    </View>
                  )}
                  <YStack>
                    <Text fontSize="$5" fontWeight="600">{profile?.full_name || user?.email || 'User'}</Text>
                    <Text fontSize="$2" color="$gray10">{user?.email}</Text>
                  </YStack>
                </XStack>
              </TouchableOpacity>
            </Card>

            {/* Menu Items */}
            {menuItems.map((item, index) => (
              <Card key={index} padding="$3" marginBottom="$1" pressStyle={{ opacity: 0.7 }}>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      item.action();
                    } catch (err) {
                      console.error('[Drawer] Menu item error:', err);
                    }
                  }}
                  accessibilityLabel={item.label}
                >
                  <XStack alignItems="center" gap="$3" justifyContent="space-between">
                    <XStack alignItems="center" gap="$3">
                      <Feather
                        name={item.icon as any}
                        size={20}
                        color={
                          (item as any).danger ? '#FF4444' : colorScheme === 'dark' ? '#FFFFFF' : '#000000'
                        }
                      />
                      <Text fontSize="$4" color={(item as any).danger ? '#FF4444' : undefined}>
                        {item.label}
                      </Text>
                    </XStack>
                    {/* Badge for items with unread counts */}
                    {(item as any).badge > 0 && (
                      <View
                        style={{
                          backgroundColor: (item as any).badgeColor || '#EF4444',
                          borderRadius: 10,
                          minWidth: 20,
                          height: 20,
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 6,
                        }}
                      >
                        <Text fontSize={10} fontWeight="bold" color="#FFFFFF" textAlign="center">
                          {(item as any).badge > 99 ? '99+' : (item as any).badge}
                        </Text>
                      </View>
                    )}
                  </XStack>
                </TouchableOpacity>
              </Card>
            ))}
          </YStack>
        </SafeAreaView>
      </Animated.View>

      {/* WebViews moved to TabNavigator */}
    </Modal>
  );
};

// Custom tab bar button component with color scheme support
const CustomTabBarButton = (props: BottomTabBarButtonProps) => {
  const { accessibilityState, children, onPress, style } = props;
  const isSelected = accessibilityState?.selected;
  const colorScheme = useColorScheme();

  return (
    <View style={style as ViewStyle}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          {
            display: 'flex',
            width: 64,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderRadius: 12,
            gap: 4,
          },
          isSelected && {
            backgroundColor:
              colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(105,227,196,0.15)', // Light teal background for light mode
          },
        ]}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
};

// Empty screen placeholder for the central tab
const NoopScreen = () => null;

export function TabNavigator() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const { showModal } = useModal();
  const createRouteContext = useCreateRoute();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBetaInfoOpen, setIsBetaInfoOpen] = useState(false);
  const [showBuyCoffee, setShowBuyCoffee] = useState(false);
  const [showBetaWebView, setShowBetaWebView] = useState(false);
  const [showAboutWebView, setShowAboutWebView] = useState(false);

  // Badge counts state for menu icon
  const [totalBadgeCount, setTotalBadgeCount] = useState(0);
  
  // Track what was seen when drawer was last opened (for menu badge only)
  const [seenMessageCount, setSeenMessageCount] = useState(0);
  const [seenNotificationCount, setSeenNotificationCount] = useState(0);
  const [seenEventCount, setSeenEventCount] = useState(0);
  // Refs used by background updaters to prevent stale closures
  const seenMessageCountRef = React.useRef(0);
  const seenNotificationCountRef = React.useRef(0);
  const seenEventCountRef = React.useRef(0);
  const seenInitializedRef = React.useRef(false);

  const STORAGE_KEYS = {
    messages: 'menu_seen_message_count',
    notifications: 'menu_seen_notification_count',
    events: 'menu_seen_event_count',
  } as const;

  // Root stack navigation (for global actions) and tab navigation (to switch tabs / nested screens)
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabNavigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  // Track navigation state changes
  const navigationState = useNavigationState((state) => state);
  const prevRouteRef = React.useRef<string | null>(null);

  // Badge counts state for main component
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadEventCount, setUnreadEventCount] = useState(0);

  // Load and update badge counts
  const loadBadgeCounts = async () => {
    try {
      // Load message count
      const messageCount = await messageService.getUnreadCount();
      setUnreadMessageCount(messageCount);
      
      // Load notification count
      const notificationCount = await notificationService.getUnreadCount();
      setUnreadNotificationCount(notificationCount);
      
      // Load event invitation count
      const { data: { user } } = await supabase.auth.getUser();
      let eventCount = 0;
      if (user) {
        const { data: eventInvitations } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'invited');
        eventCount = eventInvitations?.length || 0;
      }
      setUnreadEventCount(eventCount);

      // First-run initialization
      if (!seenInitializedRef.current) {
        seenMessageCountRef.current = messageCount;
        seenNotificationCountRef.current = notificationCount;
        seenEventCountRef.current = eventCount;
        setSeenMessageCount(messageCount);
        setSeenNotificationCount(notificationCount);
        setSeenEventCount(eventCount);
        try {
          await AsyncStorage.multiSet([
            [STORAGE_KEYS.messages, String(messageCount)],
            [STORAGE_KEYS.notifications, String(notificationCount)],
            [STORAGE_KEYS.events, String(eventCount)],
          ]);
        } catch {}
        seenInitializedRef.current = true;
        setTotalBadgeCount(0);
        return;
      }

      // Calculate new items since drawer was last opened
      const newMessages = Math.max(0, messageCount - seenMessageCountRef.current);
      const newNotifications = Math.max(0, notificationCount - seenNotificationCountRef.current);
      const newEvents = Math.max(0, eventCount - seenEventCountRef.current);
      
      const total = newMessages + newNotifications + newEvents;
      setTotalBadgeCount(total);
      
      console.log('📊 Menu badge calculation:', {
        total,
        newMessages,
        newNotifications,
        newEvents,
        seen: { messages: seenMessageCountRef.current, notifications: seenNotificationCountRef.current, events: seenEventCountRef.current }
      });
    } catch (error) {
      console.error('Error loading badge counts:', error);
    }
  };

  // Subscribe to real-time updates for menu badge
  useEffect(() => {
    // Load persisted seen counts on mount
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          STORAGE_KEYS.messages,
          STORAGE_KEYS.notifications,
          STORAGE_KEYS.events,
        ]);
        const msg = parseInt(entries[0]?.[1] || '', 10);
        const noti = parseInt(entries[1]?.[1] || '', 10);
        const evt = parseInt(entries[2]?.[1] || '', 10);
        if (!Number.isNaN(msg) && !Number.isNaN(noti) && !Number.isNaN(evt)) {
          seenMessageCountRef.current = msg;
          seenNotificationCountRef.current = noti;
          seenEventCountRef.current = evt;
          setSeenMessageCount(msg);
          setSeenNotificationCount(noti);
          setSeenEventCount(evt);
          seenInitializedRef.current = true;
        } else {
          seenInitializedRef.current = false;
        }
      } catch (e) {
        console.warn('Failed to load persisted seen counts', e);
      }
    })();

    loadBadgeCounts();

    // Subscribe to message updates
    const messageSubscription = messageService.subscribeToConversations(() => {
      loadBadgeCounts();
    });

    // Subscribe to notification updates
    const notificationSubscription = notificationService.subscribeToNotifications(() => {
      loadBadgeCounts();
    });

    // Subscribe to event invitation updates
    const eventSubscription = supabase
      .channel('event-invitations-menu')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `status=eq.invited`,
        },
        () => {
          loadBadgeCounts();
        },
      )
      .subscribe();

    // Periodic refresh
    const refreshInterval = setInterval(() => {
      loadBadgeCounts();
    }, 15000);

    return () => {
      if (messageSubscription?.unsubscribe) {
        messageSubscription.unsubscribe();
      }
      if (notificationSubscription?.unsubscribe) {
        notificationSubscription.unsubscribe();
      }
      supabase.removeChannel(eventSubscription);
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (navigationState) {
      const currentRoute = navigationState.routes[navigationState.index]?.name;

      if (currentRoute && prevRouteRef.current && currentRoute !== prevRouteRef.current) {
        // Log navigation between tabs
        logNavigation(prevRouteRef.current, currentRoute);
        logInfo(`Tab navigation: ${prevRouteRef.current} → ${currentRoute}`, {
          fromTab: prevRouteRef.current,
          toTab: currentRoute,
          timestamp: Date.now(),
        });
      }

      prevRouteRef.current = currentRoute;
    }
  }, [navigationState]);

  // Log tab navigator mount and set up global navigation handler
  const handleCreateRoute = (routeData?: any) => {
    console.log('🎯 ==================== TAB NAVIGATOR - CREATE ROUTE ====================');
    console.log('🎯 Central button handleCreateRoute called with:', {
      hasRouteData: !!routeData,
      routeDataType: typeof routeData,
      waypointCount: routeData?.waypoints?.length || 0,
      hasNavigation: !!navigation,
      hasContext: !!createRouteContext,
    });

    try {
      if (routeData) {
        // This is recorded route data from RecordDrivingSheet
        console.log('🎯 Processing recorded route data with context integration...');
        console.log('🎯 Route data details:', {
          waypoints: routeData.waypoints?.length || 0,
          name: routeData.name,
          description: routeData.description?.substring(0, 50) + '...',
          hasRoutePath: !!routeData.routePath,
          routePathLength: routeData.routePath?.length || 0,
        });

        // Check if user was in CreateRoute before recording
        const recordingContext = createRouteContext.getAndClearRecordingContext();
        const hasPersistedState = !!createRouteContext.persistedState;

        console.log('🎯 Context check:', {
          recordingContext,
          hasPersistedState,
          shouldMerge: recordingContext !== null || hasPersistedState,
        });

        if (recordingContext !== null || hasPersistedState) {
          // User came from CreateRoute - merge recorded data with persisted state
          console.log('🎯 Merging recorded data with persisted state');

          const mergedState = createRouteContext.mergeRecordedData(routeData);
          if (mergedState) {
            // Update the persisted state with merged data
            createRouteContext.saveState(mergedState);

            // Mark as coming from recording for state restoration
            createRouteContext.markFromRecording();

            console.log('🎯 State merged and marked for restoration');
          }

          // Navigate to nested CreateRoute via root (keeps tab bar visible)
          (navigation as any).navigate('MainTabs', {
            screen: 'HomeTab',
            params: { screen: 'CreateRoute' },
          });
          console.log('🎯 ✅ Navigated to CreateRoute for state restoration');
        } else {
          // Fresh recording, not from CreateRoute context
          console.log('🎯 Fresh recording - navigating with route data directly');
          (navigation as any).navigate('MainTabs', {
            screen: 'HomeTab',
            params: {
              screen: 'CreateRoute',
              params: {
            routeId: undefined,
            initialWaypoints: routeData.waypoints,
            initialName: routeData.name,
            initialDescription: routeData.description,
            initialSearchCoordinates: routeData.searchCoordinates,
            initialRoutePath: routeData.routePath,
            initialStartPoint: routeData.startPoint,
            initialEndPoint: routeData.endPoint,
              },
            },
          });
          console.log('🎯 ✅ Navigation to CreateRoute completed with direct route data');
        }
      } else {
        // No route data - fresh CreateRoute
        console.log('🎯 Navigating to empty CreateRoute screen...');
        createRouteContext.clearState(); // Clear any existing state
        (navigation as any).navigate('MainTabs', {
          screen: 'HomeTab',
          params: { screen: 'CreateRoute', params: { routeId: undefined } },
        });
        console.log('🎯 ✅ Navigation to CreateRoute completed without route data');
      }
    } catch (error) {
      console.error('🎯 ❌ Navigation error:', error);
      console.error('🎯 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
      });
    }
  };

  useEffect(() => {
    logInfo('TabNavigator mounted', { colorScheme });

    // Set up global navigation handler for route recording with context support
    (global as any).navigateToCreateRoute = (routeData: any) => {
      console.log('🌐 Global navigation handler called with route data from TabNavigator');
      handleCreateRoute(routeData);
    };

    return () => {
      logInfo('TabNavigator unmounted');
      // Clean up global handler
      delete (global as any).navigateToCreateRoute;
    };
  }, [colorScheme, handleCreateRoute]);

  const navigateHomeStack = useCallback((screen: string, params?: any) => {
    try {
      (navigation as any).navigate('MainTabs', {
        screen: 'HomeTab',
        params: { screen, params },
      });
    } catch (e) {
      console.error('[Drawer] navigateHomeStack error:', e);
    }
  }, [navigation]);

  const tabBarStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TOTAL_HEIGHT,
    paddingTop: 8,
    paddingBottom: BOTTOM_INSET,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: colorScheme === 'dark' ? theme.background?.val || '#1A1A1A' : '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colorScheme === 'dark' ? theme.borderColor?.val || '#333333' : '#E5E5E5',
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    elevation: 8,
    shadowColor: tokens.color.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 100,
  } as const;

  const screenOptions: import('@react-navigation/bottom-tabs').BottomTabNavigationOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarLabelStyle: {
      fontSize: 10,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontWeight: '500' as TextStyle['fontWeight'],
    },
    tabBarActiveTintColor: '#69e3c4',
    tabBarInactiveTintColor: colorScheme === 'dark' ? '#8E8E93' : '#6B7280', // Better contrast for light mode
    tabBarButton: (props: BottomTabBarButtonProps) => <CustomTabBarButton {...props} />,
  };



  // (moved to top-level to avoid recreation on every render)

  return (
    <View style={{ flex: 1 }}>

      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            title: t('navigation.home'),
                          tabBarIcon: ({ color, size }) => (
                <HomeIcon color={color} size={size} />
              ),
          }}
          listeners={{
            tabPress: () => {
              logInfo('Home tab pressed');
            },
          }}
        />
        <Tab.Screen
          name="ProgressTab"
          component={ProgressScreen}
          options={{
            title: t('navigation.progress'),
                          tabBarIcon: ({ color, size }) => (
                <PractiseIcon color={color} size={size} />
              ),
          }}
          listeners={{
            tabPress: () => {
              logInfo('Progress tab pressed');
            },
          }}
        />
        {/* Central Create Route tab - custom button inside tab bar */}
        <Tab.Screen
          name="CreateRouteTab"
          component={NoopScreen}
          options={{
            title: '',
            tabBarLabel: '',
            tabBarButton: (props: BottomTabBarButtonProps) => (
              <View style={props.style as ViewStyle}>
                <TouchableOpacity
                  accessibilityLabel="Create route or record driving"
                  onPress={() => {
                    console.log('🎯 Central Create Route tab button pressed');
                    showModal(<ActionSheetModal onCreateRoute={handleCreateRoute} />);
                  }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colorScheme === 'dark' ? '#1A3D3D' : '#69e3c4',
                    justifyContent: 'center',
                    alignItems: 'center',
                    elevation: 8,
                    shadowColor: colorScheme === 'dark' ? '#000' : '#333',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.2,
                    shadowRadius: 6,
                    marginTop: -12, // raise slightly to feel floating
                    borderWidth: colorScheme === 'light' ? 2 : 0,
                    borderColor: colorScheme === 'light' ? '#FFFFFF' : 'transparent',
                  }}
                >
                  <Feather name="plus" size={24} color={colorScheme === 'dark' ? 'white' : '#1A3D3D'} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="MapTab"
          component={MapScreen}
          options={{
            title: t('navigation.map'),
                          tabBarIcon: ({ color, size }) => (
                <MapIcon color={color} size={size} />
              ),
          }}
          listeners={{
            tabPress: () => {
              logInfo('Map tab pressed');
            },
          }}
        />
        {/* Profile removed from tabs; accessible via drawer */}
        {/* Rightmost tab: opens the hamburger drawer */}
        <Tab.Screen
          name="MenuTab"
          component={NoopScreen}
          options={{
            title: '',
            tabBarLabel: '',
            tabBarButton: (props: BottomTabBarButtonProps) => (
              <View style={props.style as ViewStyle}>
                <TouchableOpacity
                  accessibilityLabel="Open menu"
                  onPress={() => {
                    logInfo('Hamburger menu tab pressed');
                    // Update seen counts when opening drawer (for menu badge tracking)
                    setSeenMessageCount(unreadMessageCount);
                    setSeenNotificationCount(unreadNotificationCount);
                    setSeenEventCount(unreadEventCount);
                    seenMessageCountRef.current = unreadMessageCount;
                    seenNotificationCountRef.current = unreadNotificationCount;
                    seenEventCountRef.current = unreadEventCount;
                    // Immediately hide combined badge on open and persist seen
                    AsyncStorage.multiSet([
                      [STORAGE_KEYS.messages, String(unreadMessageCount)],
                      [STORAGE_KEYS.notifications, String(unreadNotificationCount)],
                      [STORAGE_KEYS.events, String(unreadEventCount)],
                    ]).catch(() => {});
                    // Immediately hide combined badge on open
                    setTotalBadgeCount(0);
                    setIsDrawerOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    width: 64,
                    height: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    borderRadius: 12,
                    position: 'relative',
                  }}
                >
                  <Feather name="menu" size={22} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                  
                  {/* Combined badge for menu icon */}
                  {totalBadgeCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: '#EF4444',
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                      }}
                    >
                      <Text fontSize={10} fontWeight="bold" color="#FFFFFF" textAlign="center">
                        {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ),
          }}
        />
      </Tab.Navigator>

      {/* Hamburger Drawer */}
      <HamburgerDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          // On close, treat everything as seen and hide combined badge
          setSeenMessageCount(unreadMessageCount);
          setSeenNotificationCount(unreadNotificationCount);
          setSeenEventCount(unreadEventCount);
          seenMessageCountRef.current = unreadMessageCount;
          seenNotificationCountRef.current = unreadNotificationCount;
          seenEventCountRef.current = unreadEventCount;
          AsyncStorage.multiSet([
            [STORAGE_KEYS.messages, String(unreadMessageCount)],
            [STORAGE_KEYS.notifications, String(unreadNotificationCount)],
            [STORAGE_KEYS.events, String(unreadEventCount)],
          ]).catch(() => {});
          setTotalBadgeCount(0);
          setIsDrawerOpen(false);
        }}
        colorScheme={colorScheme}
        navigation={navigation}
        onNavigateHome={navigateHomeStack}
        onOpenBetaInfo={() => setIsBetaInfoOpen(true)}
        onOpenBetaWebView={() => setShowBetaWebView(true)}
        onOpenBuyCoffee={() => setShowBuyCoffee(true)}
        onOpenAbout={() => setShowAboutWebView(true)}
        unreadMessageCount={unreadMessageCount}
        unreadNotificationCount={unreadNotificationCount}
        unreadEventCount={unreadEventCount}
      />

      <BetaInfoModal visible={isBetaInfoOpen} onClose={() => setIsBetaInfoOpen(false)} />
      {/* Embedded WebViews at root (outside drawer) */}
      <CustomWebView
        isVisible={showBuyCoffee}
        onClose={() => setShowBuyCoffee(false)}
        url="https://app.vromm.se/buymeacoffee"
        title="Buy Me a Coffee ☕"
      />
      <CustomWebView
        isVisible={showBetaWebView}
        onClose={() => setShowBetaWebView(false)}
        url="https://vromm.se/beta-test"
        title="Beta Program"
      />
      <CustomWebView
        isVisible={showAboutWebView}
        onClose={() => setShowAboutWebView(false)}
        url="https://vromm.se/"
        title="Vromm"
      />
    </View>
  );
}
