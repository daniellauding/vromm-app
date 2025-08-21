import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { HomeIcon, MapIcon, ProfileIcon, PractiseIcon } from './icons/TabIcons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, YStack, XStack, Text, Card } from 'tamagui';
import { logNavigation, logInfo, logError } from '../utils/logger';
import { useNavigationState, useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useCreateRoute } from '../contexts/CreateRouteContext';
import { ActionSheetModal } from './ActionSheet';
import { BetaInfoModal } from './BetaInfoModal';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomWebView from './CustomWebView';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/explore/MapScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 64;
const TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_INSET;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width

// Hamburger Drawer Component
const HamburgerDrawer = ({
  isOpen,
  onClose,
  colorScheme,
  navigation,
  onOpenBetaInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  colorScheme: ColorSchemeName;
  navigation: any;
  onOpenBetaInfo: () => void;
}) => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  const [showBuyCoffee, setShowBuyCoffee] = useState(false);
  const [showBetaWebView, setShowBetaWebView] = useState(false);

  const onOpenBuyCoffee = () => {
    console.log('[Drawer] Open Buy Me a Coffee tapped');
    setShowBuyCoffee(true);
  };

  const onOpenBetaWebView = () => {
    console.log('[Drawer] Open Beta Website tapped');
    setShowBetaWebView(true);
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
    { icon: 'zap', label: t('drawer.betaInfo') || 'Beta Program', action: () => onOpenBetaInfo() },
    { icon: 'globe', label: t('drawer.betaWebsite') || 'Beta Website', action: () => onOpenBetaWebView() },
    { icon: 'coffee', label: t('drawer.buyMeCoffee') || 'Buy Me a Coffee', action: () => onOpenBuyCoffee() },
    { icon: 'settings', label: t('drawer.settings') || 'Settings', action: () => {} },
    { icon: 'help-circle', label: t('drawer.help') || 'Help & Support', action: () => {} },
    { icon: 'star', label: t('drawer.rateApp') || 'Rate App', action: () => {} },
    { icon: 'share', label: t('drawer.shareApp') || 'Share App', action: () => {} },
    { icon: 'info', label: t('drawer.about') || 'About', action: () => {} },
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
            {/* Drawer Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize="$6" fontWeight="bold">
                {t('drawer.menu') || 'Menu'}
              </Text>
              <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu">
                <Feather
                  name="x"
                  size={24}
                  color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                />
              </TouchableOpacity>
            </XStack>

            {/* Menu Items */}
            {menuItems.map((item, index) => (
              <Card key={index} padding="$3" marginBottom="$1" pressStyle={{ opacity: 0.7 }}>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      item.action();
                      // Keep drawer open for WebViews so user can close them with the X and return here
                      if ((item as any).danger) {
                        // Logout should close the drawer
                        onClose();
                      }
                    } catch (err) {
                      console.error('[Drawer] Menu item error:', err);
                    }
                  }}
                  accessibilityLabel={item.label}
                >
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
                </TouchableOpacity>
              </Card>
            ))}
          </YStack>
        </SafeAreaView>
      </Animated.View>

      {/* Embedded WebViews */}
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

  // Get access to the parent (root) navigation to navigate to CreateRoute
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Track navigation state changes
  const navigationState = useNavigationState((state) => state);
  const prevRouteRef = React.useRef<string | null>(null);

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

          // Navigate back to CreateRoute - it will restore the merged state
          navigation.navigate('CreateRoute', {});
          console.log('🎯 ✅ Navigated to CreateRoute for state restoration');
        } else {
          // Fresh recording, not from CreateRoute context
          console.log('🎯 Fresh recording - navigating with route data directly');
          navigation.navigate('CreateRoute', {
            routeId: undefined,
            initialWaypoints: routeData.waypoints,
            initialName: routeData.name,
            initialDescription: routeData.description,
            initialSearchCoordinates: routeData.searchCoordinates,
            initialRoutePath: routeData.routePath,
            initialStartPoint: routeData.startPoint,
            initialEndPoint: routeData.endPoint,
          });
          console.log('🎯 ✅ Navigation to CreateRoute completed with direct route data');
        }
      } else {
        // No route data - fresh CreateRoute
        console.log('🎯 Navigating to empty CreateRoute screen...');
        createRouteContext.clearState(); // Clear any existing state
        navigation.navigate('CreateRoute', { routeId: undefined });
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



  return (
    <View style={{ flex: 1 }}>

      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
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
        <Tab.Screen
          name="ProfileTab"
          options={{
            title: t('navigation.profile'),
                          tabBarIcon: ({ color, size }) => (
                <ProfileIcon color={color} size={size} />
              ),
          }}
          listeners={{
            tabPress: () => {
              logInfo('Profile tab pressed');
            },
          }}
        >
          {() => {
            const { user } = useAuth();

            if (!user?.id) {
              return <ProfileScreen />;
            }

            // Create a nested stack navigator for profile-related screens
            return (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="PublicProfile"
                  component={PublicProfileScreen}
                  initialParams={{ userId: user.id }}
                />
                <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
              </Stack.Navigator>
            );
          }}
        </Tab.Screen>
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
                  }}
                >
                  <Feather name="menu" size={22} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
      </Tab.Navigator>

      {/* Hamburger Drawer */}
      <HamburgerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        colorScheme={colorScheme}
        navigation={navigation}
        onOpenBetaInfo={() => setIsBetaInfoOpen(true)}
      />

      <BetaInfoModal visible={isBetaInfoOpen} onClose={() => setIsBetaInfoOpen(false)} />
    </View>
  );
}
