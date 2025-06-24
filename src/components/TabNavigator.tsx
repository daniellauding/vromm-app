import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tokens } from '../tokens';
import { useTranslation } from '../contexts/TranslationContext';
import { TabParamList } from '../types/navigation';
import { Platform, useColorScheme, TouchableOpacity, ViewStyle, View } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { HomeIcon, MapIcon, ProfileIcon, PractiseIcon } from './icons/TabIcons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'tamagui';
import { logNavigation, logInfo, logError } from '../utils/logger';
import { useNavigationState } from '@react-navigation/native';

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

// Custom tab bar button component
const CustomTabBarButton = (props: BottomTabBarButtonProps) => {
  const { accessibilityState, children, onPress, style } = props;
  const isSelected = accessibilityState?.selected;

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
            backgroundColor: 'rgba(255,255,255,0.8)',
          },
        ]}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
};

export function TabNavigator() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = useTheme();

  // Track navigation state changes
  const navigationState = useNavigationState(state => state);
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

  // Log tab navigator mount
  useEffect(() => {
    logInfo('TabNavigator mounted', { colorScheme });
    
    return () => {
      logInfo('TabNavigator unmounted');
    };
  }, [colorScheme]);

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

  const screenOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarLabelStyle: {
      fontSize: 10,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontWeight: '500',
    },
    tabBarActiveTintColor: '#69e3c4',
    tabBarInactiveTintColor: '#8E8E93',
    headerStyle: {
      backgroundColor: tokens.color.background,
      borderBottomWidth: 1,
      borderBottomColor: tokens.color.backgroundPress,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.primary?.val || '#007AFF',
    },
    tabBarButton: (props) => <CustomTabBarButton {...props} />,
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ focused, color, size }) => <HomeIcon focused={focused} color={color} size={size} />,
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
          tabBarIcon: ({ focused, color, size }) => <PractiseIcon focused={focused} color={color} size={size} />,
        }}
        listeners={{
          tabPress: () => {
            logInfo('Progress tab pressed');
          },
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          title: t('navigation.map'),
          tabBarIcon: ({ focused, color, size }) => <MapIcon focused={focused} color={color} size={size} />,
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
          tabBarIcon: ({ focused, color, size }) => <ProfileIcon focused={focused} color={color} size={size} />,
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
    </Tab.Navigator>
  );
}
