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
  Pressable,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  ColorSchemeName,
  TextStyle,
  Image,
  Share,
  ActivityIndicator,
} from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { HomeIcon, MapIcon, ProfileIcon, PractiseIcon } from './icons/TabIcons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, YStack, XStack, Text, Card } from 'tamagui';
import { logNavigation, logInfo, logError } from '../utils/logger';
import { AppAnalytics } from '../utils/analytics';
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
import {
  TAB_BAR_HEIGHT as NAV_TAB_BAR_HEIGHT,
  BOTTOM_SAFE_INSET as NAV_BOTTOM_SAFE_INSET,
} from '../utils/layout';
import { useTranslation as useAppTranslation } from '../contexts/TranslationContext';

// Import services for badge counts
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import { getPendingInvitations } from '../services/invitationService_v2';
import { supabase } from '../lib/supabase';
// Screen tours import DISABLED
// import { useScreenTours } from '../utils/screenTours';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/explore/MapScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { useAuth } from '../context/AuthContext';
// Tour imports partially re-enabled for HomeScreen tours only
import { useTour } from '../contexts/TourContext';
import { useTourTarget } from './TourOverlay';
// import { UsersScreen } from '../screens/UsersScreen';
import { RouteDetailScreen } from '../screens/RouteDetailScreen';
// import { MessagesScreen } from '../screens/MessagesScreen';
// import { EventsScreen } from '../screens/EventsScreen';
// import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CreateEventScreen } from '../screens/CreateEventScreen';
import { CreateRouteScreen } from '../screens/CreateRouteScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { SavedRoutes } from '../screens/HomeScreen/SavedRoutes';
import { CommunityFeedScreen } from '../screens/CommunityFeedScreen';
import { CreatedRoutes } from '../screens/HomeScreen/CreatedRoutes';
import { NearByRoutes } from '../screens/HomeScreen/NearByRoutes';
import { DrivenRoutes } from '../screens/HomeScreen/DrivenRoutes';
import { RouteListScreen } from '../screens/RouteListScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator();
const MenuStack = createNativeStackNavigator();
const MapStack = createNativeStackNavigator();

const BOTTOM_INSET = NAV_BOTTOM_SAFE_INSET;
const TAB_BAR_HEIGHT = NAV_TAB_BAR_HEIGHT;
const TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_INSET;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width

// Nested stack under Home tab to keep tab bar visible across app screens
const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
    <HomeStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    <HomeStack.Screen name="ProfileScreen" component={ProfileScreen} />
    {/* <HomeStack.Screen name="UsersScreen" component={UsersScreen} /> */}
    <HomeStack.Screen name="RouteDetail" component={RouteDetailScreen as any} />
    {/* <HomeStack.Screen name="Messages" component={MessagesScreen} />
    <HomeStack.Screen name="Events" component={EventsScreen} />
    <HomeStack.Screen name="Notifications" component={NotificationsScreen} /> */}
    <HomeStack.Screen name="CreateEvent" component={CreateEventScreen} />
    <HomeStack.Screen name="CreateRoute" component={CreateRouteScreen} />
    <HomeStack.Screen name="Conversation" component={ConversationScreen} />
    <HomeStack.Screen name="EventDetail" component={EventDetailScreen} />
    <HomeStack.Screen name="RouteList" component={RouteListScreen as any} />
    <HomeStack.Screen name="SavedRoutes" component={SavedRoutes} />
    <HomeStack.Screen name="CommunityFeedScreen" component={CommunityFeedScreen} />
    <HomeStack.Screen name="CreatedRoutes" component={CreatedRoutes} />
    <HomeStack.Screen name="NearByRoutes" component={NearByRoutes} />
    <HomeStack.Screen name="DrivenRoutes" component={DrivenRoutes} />
  </HomeStack.Navigator>
);

// Stack for Map tab to keep Map tab active when opening detail screens
const MapStackNavigator = () => (
  <MapStack.Navigator screenOptions={{ headerShown: false }}>
    <MapStack.Screen name="MapScreen" component={MapScreen} />
    <MapStack.Screen name="RouteDetail" component={RouteDetailScreen as any} />
  </MapStack.Navigator>
);

// Stack for Menu tab so drawer destinations live here (keeps Menu tab active)
const MenuStackNavigator = () => (
  <MenuStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
    <MenuStack.Screen name="MenuRoot" component={NoopScreen} />
    <MenuStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    <MenuStack.Screen name="ProfileScreen" component={ProfileScreen} />
    {/* <MenuStack.Screen name="UsersScreen" component={UsersScreen} /> */}
    {/* <MenuStack.Screen name="Messages" component={MessagesScreen} />
    <MenuStack.Screen name="Events" component={EventsScreen} />
    <MenuStack.Screen name="Notifications" component={NotificationsScreen} /> */}
    <MenuStack.Screen name="Conversation" component={ConversationScreen} />
    <MenuStack.Screen name="EventDetail" component={EventDetailScreen} />
    <MenuStack.Screen name="CreateEvent" component={CreateEventScreen} />
  </MenuStack.Navigator>
);

// Hamburger Drawer Component
const HamburgerDrawer = ({
  isOpen,
  onClose,
  theme,
  navigation,
  onNavigateHome,
  onBeginNavigate,
  activeMenuScreen,
  onOpenBetaInfo,
  onOpenBetaWebView,
  onOpenBuyCoffee,
  onOpenAbout,
  onOpenLanguage,
  onStartTour,
  unreadMessageCount,
  unreadNotificationCount,
  unreadEventCount,
  pendingInvitationsCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: any;
  navigation: any;
  onNavigateHome: (screen: string, params?: any) => void;
  onBeginNavigate: () => void;
  activeMenuScreen: string | null;
  onOpenBetaInfo: () => void;
  onOpenBetaWebView: () => void;
  onOpenBuyCoffee: () => void;
  onOpenAbout: () => void;
  onOpenLanguage: () => void;
  onStartTour: () => void;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  unreadEventCount: number;
  pendingInvitationsCount: number;
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

  const onOpenLanguageLocal = () => {
    console.log('[Drawer] Language tapped');
    onOpenLanguage();
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
        events: unreadEventCount,
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
    {
      // icon: 'user',
      target: 'PublicProfile',
      label: t('drawer.myProfile') || 'My Profile',
      action: () => {
        onBeginNavigate();
        if (user?.id) {
          onNavigateHome('PublicProfile', { userId: user.id });
        }
        onClose();
      },
    },
    {
      // icon: 'settings',
      target: 'ProfileScreen',
      label: t('drawer.settings') || 'Settings',
      action: () => {
        onBeginNavigate();
        onNavigateHome('ProfileScreen');
        onClose();
      },
      badge: pendingInvitationsCount,
      badgeColor: '#FF4444',
    },
    // {
    //   icon: 'users',
    //   target: 'UsersScreen',
    //   label: t('drawer.users') || 'Users',
    //   action: () => {
    //     onBeginNavigate();
    //     onNavigateHome('UsersScreen');
    //     onClose();
    //   },
    // },
    // {
    //   icon: 'message-circle',
    //   target: 'Messages',
    //   label: t('drawer.messages') || 'Messages',
    //   action: () => {
    //     onBeginNavigate();
    //     onNavigateHome('Messages');
    //     onClose();
    //   },
    //   badge: unreadMessageCount,
    //   badgeColor: '#EF4444',
    // },
    // {
    //   icon: 'calendar',
    //   target: 'Events',
    //   label: t('drawer.events') || 'Events',
    //   action: () => {
    //     onBeginNavigate();
    //     onNavigateHome('Events');
    //     onClose();
    //   },
    //   badge: unreadEventCount,
    //   badgeColor: '#EF4444',
    // },
    // {
    //   icon: 'bell',
    //   target: 'Notifications',
    //   label: t('drawer.notifications') || 'Notifications',
    //   action: () => {
    //     onBeginNavigate();
    //     onNavigateHome('Notifications');
    //     onClose();
    //   },
    //   badge: unreadNotificationCount,
    //   badgeColor: '#EF4444',
    // },
    {
      // icon: 'globe',
      label: t('drawer.betaWebsite') || 'Beta Website',
      action: () => onOpenBetaWebViewLocal(),
    },
    // {
    //   icon: 'globe',
    //   label: t('settings.language.title') || 'Language',
    //   action: () => onOpenLanguageLocal(),
    // },
    {
      // icon: 'coffee',
      label: t('drawer.buyMeCoffee') || 'Buy Me a Coffee',
      action: () => onOpenBuyCoffeeLocal(),
    },
    // { 
    //   icon: 'help-circle', 
    //   label: 'Start Tour', 
    //   action: () => {
    //     console.log('[Drawer] Start Tour tapped');
    //     onClose();
    //     // Small delay to let drawer close, then start tour for current screen
    //     setTimeout(() => {
    //       onStartTour();
    //     }, 300);
    //   }
    // }, // DISABLED: Tours causing performance issues
    {
      // icon: 'share',
      label: t('drawer.shareApp') || 'Share App',
      action: () => onShareApp()
    },
    { 
      // icon: 'info',
      label: t('drawer.about') || 'About',
      action: () => onOpenAboutLocal()
    },
    {
      // icon: 'log-out',
      label: t('drawer.logout') || 'Logout',
      action: () => handleSignOut(),
      // danger: true,
    },
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
          backgroundColor: theme.background?.val || '#FFFFFF',
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
                  if (user?.id) {
                    onNavigateHome('PublicProfile', { userId: user.id });
                  }
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
                        backgroundColor: theme.backgroundHover?.val || '#EEEEEE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather
                        name="user"
                        size={22}
                        color={theme.color?.val || '#000000'}
                      />
                    </View>
                  )}
                  <YStack>
                    <Text fontSize="$5" fontWeight="600">
                      {profile?.full_name || user?.email || 'User'}
                    </Text>
                    <Text fontSize="$2" color="$gray10">
                      {user?.email}
                    </Text>
                  </YStack>
                </XStack>
              </TouchableOpacity>
            </Card>

            {/* Menu Items */}
            {menuItems.map((item, index) => (
              <Card
                key={index}
                padding="$3"
                marginBottom="$1"
                pressStyle={{ opacity: 0.7 }}
                backgroundColor={
                  activeMenuScreen &&
                  (item as any).target &&
                  activeMenuScreen === (item as any).target
                    ? 'rgba(105,227,196,0.12)'
                    : undefined
                }
              >
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
                        name={(item as any).icon as any}
                        size={20}
                        color={
                          (item as any).danger
                            ? '#FF4444'
                            : activeMenuScreen &&
                                (item as any).target &&
                                activeMenuScreen === (item as any).target
                              ? '#69e3c4'
                              : theme.color?.val || '#000000'
                        }
                      />
                      <Text
                        fontSize="$4"
                        color={
                          (item as any).danger
                            ? '#FF4444'
                            : activeMenuScreen &&
                                (item as any).target &&
                                activeMenuScreen === (item as any).target
                              ? '#69e3c4'
                              : undefined
                        }
                        fontWeight={
                          activeMenuScreen &&
                          (item as any).target &&
                          activeMenuScreen === (item as any).target
                            ? '700'
                            : undefined
                        }
                      >
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

// Custom tab bar button component with color scheme support and HomeScreen tour highlighting
const CustomTabBarButton = (props: BottomTabBarButtonProps & { isHighlighted?: boolean; tourTargetId?: string }) => {
  const { accessibilityState, children, onPress, style, isHighlighted, tourTargetId } = props;
  const isSelected = accessibilityState?.selected;
  
  // Register this button for tour targeting (HomeScreen tours only)  
  const tourRef = tourTargetId ? useTourTarget(tourTargetId) : null;

  return (
    <View style={[
      style as ViewStyle, 
      { 
        alignItems: 'center', 
        justifyContent: 'center',
        flex: 1, // ✅ Ensure equal distribution
      }
    ]}>
      <TouchableOpacity
        ref={tourRef}
        onPress={onPress}
        style={[
          {
            display: 'flex',
            width: '100%',  // ✅ Take full width of container
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderRadius: 12,
          },
          isSelected && {
            backgroundColor: 'rgba(105,227,196,0.15)',
          },
          // ✅ Simplified tour highlighting - let TourOverlay handle main highlight
          isHighlighted && {
            backgroundColor: 'rgba(0, 230, 195, 0.15)',
          },
        ]}
      >
        <View style={{ 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',  // ✅ Center content within button
        }}>
          {children}
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Empty screen placeholder for the central tab
const NoopScreen = () => null;

export function TabNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { showModal } = useModal();
  const { language, setLanguage } = useAppTranslation();
  const { user } = useAuth();
  const createRouteContext = useCreateRoute();
  // Tour context RE-ENABLED for HomeScreen tours only
  const { isActive: tourActive, currentStep, steps, nextStep, prevStep, endTour, startDatabaseTour, resetTour, startCustomTour } = useTour();
  // Screen tours still DISABLED
  // const { triggerScreenTour } = useScreenTours();
  
  // Helper function to check if a tab should be highlighted during tour - RE-ENABLED for HomeScreen
  const isTabHighlighted = (tabTarget: string): boolean => {
    if (!tourActive || typeof currentStep !== 'number' || !steps[currentStep]) return false;
    const step = steps[currentStep];
    return step.targetScreen === tabTarget || step.targetElement === tabTarget;
  };
  
  // Get current step object
  const getCurrentStepObject = () => {
    if (!tourActive || typeof currentStep !== 'number' || !steps[currentStep]) return null;
    return steps[currentStep];
  };
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBetaInfoOpen, setIsBetaInfoOpen] = useState(false);
  const [showBuyCoffee, setShowBuyCoffee] = useState(false);
  const [showBetaWebView, setShowBetaWebView] = useState(false);
  const [showAboutWebView, setShowAboutWebView] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [isNavigatingFromDrawer, setIsNavigatingFromDrawer] = useState(false);
  const [isTabResetting, setIsTabResetting] = useState(false);
  const [activeMenuScreen, setActiveMenuScreen] = useState<string | null>(null);
  const [homeTabKey, setHomeTabKey] = useState(0);
  const [progressTabKey, setProgressTabKey] = useState(0);
  const [mapTabKey, setMapTabKey] = useState(0);

  // Badge counts state for menu icon
  const [totalBadgeCount, setTotalBadgeCount] = useState(0);

  // Track what was seen when drawer was last opened (for menu badge only)
  const [seenMessageCount, setSeenMessageCount] = useState(0);
  const [seenNotificationCount, setSeenNotificationCount] = useState(0);
  const [seenEventCount, setSeenEventCount] = useState(0);

  // State for hiding tab bar on specific screens
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
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

  // HomeScreen tours RE-ENABLED, others disabled to prevent console flooding
  const handleStartTourForCurrentScreen = async () => {
    try {
      // Get current route name from navigation state
      const getCurrentRouteName = (navState: any): string | null => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        if (!route) return null;
        if (route.state) {
          return getCurrentRouteName(route.state);
        }
        return route.name;
      };

      const currentRouteName = getCurrentRouteName(navigationState);

      // Get user profile for role
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      const userRole = userProfile?.role || 'student';

      // Start HomeScreen tours if we're on HomeScreen (detect better)
      const isOnHomeScreen = currentRouteName === 'HomeScreen' || 
                            (currentRouteName === 'MainTabs' && 
                             navigationState?.routes?.[navigationState.index]?.name === 'HomeTab');
      
      if (isOnHomeScreen || !currentRouteName) {
        await resetTour();
        setTimeout(() => {
          startDatabaseTour('HomeScreen', userRole);
        }, 500);
      } else {
        console.log('[TabNavigator] Non-HomeScreen tours disabled:', currentRouteName);
      }
    } catch (error) {
      console.error('[TabNavigator] Error starting HomeScreen tour:', error);
    }
  };

  // Badge counts state for main component
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadEventCount, setUnreadEventCount] = useState(0);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      // Load pending invitations count
      let invitationCount = 0;
      if (user) {
        const pendingInvitations = await getPendingInvitations(user.id);
        invitationCount = pendingInvitations?.length || 0;
      }
      setPendingInvitationsCount(invitationCount);

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

    // Subscribe to pending invitations updates
    const invitationSubscription = supabase
      .channel('pending-invitations-menu')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_invitations',
          filter: `status=eq.pending`,
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
      supabase.removeChannel(invitationSubscription);
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

      // Log full active route path for debugging
      try {
        const getActivePath = (state: any): string => {
          if (!state || !state.routes || state.index == null) return '';
          const route = state.routes[state.index];
          const child = (route.state || (route as any).nested)?.state;
          const name = route.name;
          return child ? `${name} > ${getActivePath(child)}` : name;
        };
        const path = getActivePath(navigationState as any);
        if (path) console.log('[NAV][ActivePath]', path);
      } catch {}

      prevRouteRef.current = currentRoute;
    }
  }, [navigationState]);

  // Clear brief loader after drawer navigation completes
  useEffect(() => {
    if (!isDrawerOpen && isNavigatingFromDrawer) {
      const t = setTimeout(() => setIsNavigatingFromDrawer(false), 350);
      return () => clearTimeout(t);
    }
  }, [isDrawerOpen, isNavigatingFromDrawer]);

  // Fallback: clear loader on any nav state change shortly after
  useEffect(() => {
    if (isNavigatingFromDrawer) {
      const t = setTimeout(() => setIsNavigatingFromDrawer(false), 400);
      return () => clearTimeout(t);
    }
  }, [navigationState, isNavigatingFromDrawer]);

  // Handle maximizing wizard to full CreateRouteScreen
  const handleMaximizeWizard = useCallback(
    (wizardData: any) => {
      console.log('🔍 TabNavigator handling wizard maximize');

      // Navigate to CreateRouteScreen with wizard data pre-filled
      (navigation as any).navigate('MainTabs', {
        screen: 'HomeTab',
        params: {
          screen: 'CreateRoute',
          params: {
            routeId: undefined, // New route
            initialWaypoints: wizardData.waypoints,
            initialName: wizardData.name,
            initialDescription: wizardData.description,
            initialSearchCoordinates:
              wizardData.waypoints.length > 0
                ? `${wizardData.waypoints[0].latitude.toFixed(6)}, ${wizardData.waypoints[0].longitude.toFixed(6)}`
                : '',
            initialRoutePath: wizardData.routePath,
            initialStartPoint:
              wizardData.waypoints.length > 0
                ? {
                    latitude: wizardData.waypoints[0].latitude,
                    longitude: wizardData.waypoints[0].longitude,
                  }
                : undefined,
            initialEndPoint:
              wizardData.waypoints.length > 1
                ? {
                    latitude: wizardData.waypoints[wizardData.waypoints.length - 1].latitude,
                    longitude: wizardData.waypoints[wizardData.waypoints.length - 1].longitude,
                  }
                : undefined,
          },
        },
      });
    },
    [navigation],
  );

  const handleCreateEvent = useCallback(() => {
    console.log('🎉 TabNavigator handling create event');

    // Navigate directly to CreateEventScreen (not through HomeTab)
    navigation.navigate('CreateEvent', {
      eventId: undefined, // New event
    });
  }, [navigation]);

  const handleNavigateToMap = useCallback((routeId: string) => {
    console.log('🗺️ TabNavigator handling navigate to map with route:', routeId);
    
    // Navigate to MapTab with the route ID
    (navigation as any).navigate('MainTabs', {
      screen: 'MapTab',
      params: {
        screen: 'MapScreen',
        params: {
          selectedRouteId: routeId,
        },
      },
    });
  }, [navigation]);

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
    // TabNavigator mounted

    // Set up global navigation handler for route recording with context support
    (global as any).navigateToCreateRoute = (routeData: any) => {
      handleCreateRoute(routeData);
    };

    return () => {
      // TabNavigator unmounted
      // Clean up global handler
      delete (global as any).navigateToCreateRoute;
    };
  }, []); // Removed handleCreateRoute dependency to prevent recreating

  // Navigation listener to hide tab bar on specific screens and track navigation
  useEffect(() => {
    let previousRouteName: string | null = null;

    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (!state) return;

      // Get the current route name from nested navigation
      const getCurrentRouteName = (navState: any): string | null => {
        if (!navState) return null;

        const route = navState.routes[navState.index];
        if (!route) return null;

        // If this route has nested state, recurse
        if (route.state) {
          return getCurrentRouteName(route.state);
        }

        return route.name;
      };

      const currentRouteName = getCurrentRouteName(state);

      // Track navigation flow in Firebase Analytics
      if (currentRouteName && previousRouteName && currentRouteName !== previousRouteName) {
        AppAnalytics.trackNavigation(previousRouteName, currentRouteName, 'tab_navigation').catch(() => {
          // Silently fail analytics
        });
        logNavigation(previousRouteName, currentRouteName);
      }
      
      previousRouteName = currentRouteName;

      // List of screens that should hide the tab bar
      const hideTabBarScreens = [
        'CreateRoute',
        'RouteDetail',
        'ConversationScreen',
        'Conversation',
        'PublicProfile',
        'ProfileScreen',
        'EventDetail',
      ];

      const shouldHideTabBar = hideTabBarScreens.includes(currentRouteName || '');
      setIsTabBarVisible(!shouldHideTabBar);
    });

    return unsubscribe;
  }, [navigation]);

  const navigateHomeStack = useCallback(
    (screen: string, params?: any) => {
      try {
        // If destination is a drawer item, keep MenuTab active; else use HomeTab
        const menuScreens = new Set([
          'PublicProfile',
          'ProfileScreen',
          // 'UsersScreen',
          'Messages',
          'Events',
          'Notifications',
        ]);
        if (menuScreens.has(screen)) {
          setActiveMenuScreen(screen);
          console.log('[NAV][Drawer] → MainTabs > MenuTab >', screen, params || '(no params)');
          (navigation as any).navigate('MainTabs', {
            screen: 'MenuTab',
            params: { screen, params },
          });
        } else {
          console.log('[NAV] → MainTabs > HomeTab >', screen, params || '(no params)');
          (navigation as any).navigate('MainTabs', {
            screen: 'HomeTab',
            params: { screen, params },
          });
        }
      } catch (e) {
        console.error('[Drawer] navigateHomeStack error:', e);
      }
    },
    [navigation],
  );

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
    backgroundColor: theme.background?.val || '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.borderColor?.val || '#E5E5E5',
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    elevation: 8,
    shadowColor: tokens.color.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 50, // ✅ Reduced from 100 to be below tour overlay (z-index: 10000)
  } as const;

  const screenOptions: import('@react-navigation/bottom-tabs').BottomTabNavigationOptions = {
    headerShown: false,
    tabBarStyle: isTabBarVisible ? tabBarStyle : { display: 'none' },
    tabBarLabelStyle: {
      fontSize: 10,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontWeight: '500' as TextStyle['fontWeight'],
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 0,
      alignSelf: 'center',
      width: '100%',
    },
    tabBarActiveTintColor: theme.primary?.val || '#69e3c4',
    tabBarInactiveTintColor: theme.colorHover?.val || '#6B7280',
    tabBarButton: (props: BottomTabBarButtonProps) => <CustomTabBarButton {...props} isHighlighted={false} tourTargetId="MenuTab" />,
  };

  // (moved to top-level to avoid recreation on every render)

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="HomeTab"
          options={{
            title: t('navigation.home'),
            tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
            tabBarButton: (props: BottomTabBarButtonProps) => (
              <CustomTabBarButton 
                {...props} 
                isHighlighted={isTabHighlighted('HomeTab') || isTabHighlighted('GettingStarted.LicensePlan')}
                tourTargetId="HomeTab"
              />
            ),
          }}
          listeners={({ navigation: nav }) => ({
            tabPress: () => {
              const resetKey = Date.now();
              if ((tabNavigation as any).isFocused && (tabNavigation as any).isFocused()) {
                logInfo('Home tab reselected → refreshing');
                setHomeTabKey((k) => k + 1);
                try {
                  setIsTabResetting(true);
                  console.log('[NAV][HomeTab] navigate → MainTabs > HomeTab > HomeScreen (reset)');
                  (navigation as any).navigate('MainTabs', {
                    screen: 'HomeTab',
                    params: { screen: 'HomeScreen', params: { resetKey } },
                  });
                  setTimeout(() => setIsTabResetting(false), 300);
                } catch {}
              } else {
                logInfo('Home tab pressed');
                try {
                  setHomeTabKey((k) => k + 1);
                  setIsTabResetting(true);
                  console.log('[NAV][HomeTab] select → MainTabs > HomeTab > HomeScreen (reset)');
                  (navigation as any).navigate('MainTabs', {
                    screen: 'HomeTab',
                    params: { screen: 'HomeScreen', params: { resetKey } },
                  });
                  setTimeout(() => setIsTabResetting(false), 300);
                } catch {}
              }
            },
          })}
        >
          {() => <HomeStackNavigator key={`home-${homeTabKey}`} />}
        </Tab.Screen>
        <Tab.Screen
          name="ProgressTab"
          options={{
            title: t('navigation.progress'),
            tabBarIcon: ({ color, size }) => <PractiseIcon color={color} size={size} />,
            tabBarButton: (props: BottomTabBarButtonProps) => (
              <CustomTabBarButton 
                {...props} 
                isHighlighted={isTabHighlighted('ProgressTab')}
                tourTargetId="ProgressTab"
              />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              if ((navigation as any).isFocused && (navigation as any).isFocused()) {
                logInfo('Progress tab reselected → go to overview');
                setProgressTabKey((k) => k + 1);
                try {
                  // Force to Progress overview by switching to ProgressTab from root
                  (navigation as any).navigate('ProgressTab');
                } catch {}
              } else {
                logInfo('Progress tab pressed');
              }
            },
          })}
        >
          {(props: any) => <ProgressScreen key={`progress-${progressTabKey}`} {...props} />}
        </Tab.Screen>
        {/* Central Create Route tab - custom button inside tab bar */}
        <Tab.Screen
          name="CreateRouteTab"
          component={NoopScreen}
          options={{
            title: '',
            tabBarLabel: '',
            tabBarButton: (props: BottomTabBarButtonProps) => {
              const isHighlighted = isTabHighlighted('CreateRouteTab'); // Tour highlighting enabled for HomeScreen tours
              const createRouteRef = useTourTarget('CreateRouteTab');
              return (
                <View style={props.style as ViewStyle}>
                  <TouchableOpacity
                    ref={createRouteRef}
                    accessibilityLabel="Create route or record driving"
                    onPress={() => {
                      console.log('🎯 Central Create Route tab button pressed');
                      showModal(
                        <ActionSheetModal
                          onCreateRoute={handleCreateRoute}
                          onMaximizeWizard={handleMaximizeWizard}
                          onCreateEvent={handleCreateEvent}
                          onNavigateToMap={handleNavigateToMap}
                        />,
                      );
                    }}
                    style={[
                      {
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: theme.primary?.val || '#69e3c4',
                        justifyContent: 'center',
                        alignItems: 'center',
                        elevation: 8,
                        shadowColor: '#333',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        marginTop: -12, // raise slightly to feel floating
                        borderWidth: 2,
                        borderColor: theme.background?.val || '#FFFFFF',
                      },
                      // ✅ Simplified tour highlighting - let TourOverlay handle main highlight
                      isHighlighted && {
                        backgroundColor: theme.primaryHover?.val || '#00E6C3',
                      },
                    ]}
                  >
                    <Feather
                      name="plus"
                      size={24}
                      color={isHighlighted ? '#000' : '#1A3D3D'}
                    />
                  </TouchableOpacity>
                </View>
              );
            },
          }}
        />
        <Tab.Screen
          name="MapTab"
          options={{
            title: t('navigation.map'),
            tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
            popToTopOnBlur: true,
            tabBarButton: (props: BottomTabBarButtonProps) => (
              <CustomTabBarButton 
                {...props} 
                isHighlighted={isTabHighlighted('MapTab')}
                tourTargetId="MapTab"
              />
            ),
          }}
          listeners={({ navigation, route }) => ({
            tabPress: () => {
              if ((navigation as any).isFocused && (navigation as any).isFocused()) {
                logInfo('Map tab reselected → refreshing');
                setMapTabKey((k) => k + 1);
              } else {
                logInfo('Map tab pressed');
              }
            },
          })}
        >
          {() => <MapStackNavigator key={`map-${mapTabKey}`} />}
        </Tab.Screen>
        {/* Profile removed from tabs; accessible via drawer */}
        {/* Rightmost tab: opens the hamburger drawer */}
        <Tab.Screen
          name="MenuTab"
          component={MenuStackNavigator}
          options={{
            title: '',
            tabBarLabel: '',
            tabBarButton: (props: BottomTabBarButtonProps) => {
              const isHighlighted = isTabHighlighted('MenuTab'); // Tour highlighting enabled for HomeScreen tours
              const menuRef = useTourTarget('MenuTab');
              return (
                <View style={[
                  props.style as ViewStyle,
                  { alignItems: 'center', justifyContent: 'center', flex: 1 }
                ]}>
                  <TouchableOpacity
                    ref={menuRef}
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
                      console.log('[NAV][Drawer] open');
                      setIsDrawerOpen(true);
                    }}
                    style={[
                      {
                        display: 'flex',
                        width: '100%',
                        height: 56,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                        borderRadius: 12,
                        position: 'relative',
                      },
                      // ✅ Simplified tour highlighting - let TourOverlay handle main highlight
                      isHighlighted && {
                        backgroundColor: 'rgba(0, 230, 195, 0.15)',
                      },
                    ]}
                  >
                    <Feather
                      name="menu"
                      size={22}
                        color={
                        isHighlighted 
                          ? (theme.primaryHover?.val || '#00E6C3')
                          : // Consider the menu tab active when drawer is open or a menu screen is active
                          isDrawerOpen || !!activeMenuScreen
                            ? (theme.primary?.val || '#69e3c4')
                            : theme.color?.val || '#000000'
                      }
                    />

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
                          borderColor: theme.background?.val || '#FFFFFF',
                        }}
                      >
                        <Text fontSize={10} fontWeight="bold" color="#FFFFFF" textAlign="center">
                          {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            },
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
        theme={theme}
        navigation={navigation}
        onNavigateHome={navigateHomeStack}
        onBeginNavigate={() => setIsNavigatingFromDrawer(true)}
        activeMenuScreen={activeMenuScreen}
        onOpenBetaInfo={() => setIsBetaInfoOpen(true)}
        onOpenBetaWebView={() => setShowBetaWebView(true)}
        onOpenBuyCoffee={() => setShowBuyCoffee(true)}
        onOpenAbout={() => setShowAboutWebView(true)}
        onOpenLanguage={() => setShowLanguageSheet(true)}
        onStartTour={handleStartTourForCurrentScreen}
        unreadMessageCount={unreadMessageCount}
        unreadNotificationCount={unreadNotificationCount}
        unreadEventCount={unreadEventCount}
        pendingInvitationsCount={pendingInvitationsCount}
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

      {/* Language bottom sheet matching Profile screen style */}
      <Modal
        visible={showLanguageSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSheet(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowLanguageSheet(false)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor={theme.background?.val || '#FFFFFF'}
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
          >
            <Text fontSize={28} fontWeight="700">
              {t('settings.language.title') || 'Choose language'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLanguage('en');
                setShowLanguageSheet(false);
              }}
            >
              <View
                style={{
                  backgroundColor: '#0A84FF',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text color="#FFF" fontWeight="800" fontStyle="italic">
                  ENGLISH
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setLanguage('sv');
                setShowLanguageSheet(false);
              }}
            >
              <View
                style={{
                  backgroundColor: theme.primary?.val || '#0C5F5F',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text color="#FFF" fontWeight="800" fontStyle="italic">
                  SVENSKA
                </Text>
              </View>
            </TouchableOpacity>
          </YStack>
        </Pressable>
      </Modal>

      {/* Lightweight navigation spinner overlay when launching drawer destinations or tab resets */}
      {(isNavigatingFromDrawer || isTabResetting) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.15)',
          }}
          pointerEvents="none"
        >
          <ActivityIndicator size="small" color={theme.color?.val || '#000000'} />
        </View>
      )}

      {/* Tour Overlay moved to app root level for proper DOM hierarchy */}
    </View>
  );
}
