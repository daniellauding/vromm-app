import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { tokens } from '../tokens';
import { useTranslation } from '../contexts/TranslationContext';
import { TabParamList } from '../types/navigation';
import { Platform, useColorScheme } from 'react-native';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 56;
const TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_INSET;

export function TabNavigator() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const tabBarStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TOTAL_HEIGHT,
    paddingTop: 8,
    paddingBottom: BOTTOM_INSET,
    backgroundColor: '#1F1F1F',
    borderTopWidth: 1,
    borderTopColor: '#2D3130',
    elevation: 8,
    shadowColor: tokens.color.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 100
  } as const;

  return (
    <Tab.Navigator
      screenOptions={{
        // Tab bar style
        tabBarStyle,
        // Label style
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          fontWeight: '500',
          paddingBottom: 4
        },
        // Active/Inactive colors
        tabBarActiveTintColor: '#9DBCB7',
        tabBarInactiveTintColor: '#9DBCB7',
        // Header style
        headerStyle: {
          backgroundColor: '#1F1F1F',
          borderBottomWidth: 1,
          borderBottomColor: '#2D3130',
          elevation: 0,
          shadowOpacity: 0
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#9DBCB7'
        }
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="home"
              size={24}
              color={color}
              style={{
                opacity: focused ? 1 : 0.8,
                marginBottom: -4
              }}
            />
          )
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          title: t('navigation.map'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="map"
              size={24}
              color={color}
              style={{
                opacity: focused ? 1 : 0.8,
                marginBottom: -4
              }}
            />
          )
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Feather
              name="user"
              size={24}
              color={color}
              style={{
                opacity: focused ? 1 : 0.8,
                marginBottom: -4
              }}
            />
          )
        }}
      />
    </Tab.Navigator>
  );
}
