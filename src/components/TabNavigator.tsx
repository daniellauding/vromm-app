import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { tokens } from '../tokens';
import { useLanguage } from '../context/LanguageContext';
import { TabParamList } from '../types/navigation';
import { Platform } from 'react-native';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 56;
const TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_INSET;

export function TabNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        // Tab bar style
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: TOTAL_HEIGHT,
          paddingTop: 8,
          paddingBottom: BOTTOM_INSET,
          backgroundColor: tokens.color.white,
          borderTopWidth: 1,
          borderTopColor: tokens.color.gray200,
          elevation: 8,
          shadowColor: tokens.color.gray900,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          zIndex: 100,
        },
        // Label style
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          fontWeight: '500',
          paddingBottom: 4,
        },
        // Active/Inactive colors
        tabBarActiveTintColor: tokens.color.indigo600,
        tabBarInactiveTintColor: tokens.color.gray400,
        // Header style
        headerStyle: {
          backgroundColor: tokens.color.white,
          borderBottomWidth: 1,
          borderBottomColor: tokens.color.gray200,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: tokens.color.gray900,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          headerTitle: t('navigation.home'),
          tabBarIcon: ({ color, focused }) => (
            <Feather 
              name="home" 
              size={24} 
              color={color}
              style={{ 
                opacity: focused ? 1 : 0.8,
                marginBottom: -4,
              }} 
            />
          ),
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
                marginBottom: -4,
              }} 
            />
          ),
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
                marginBottom: -4,
              }} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 