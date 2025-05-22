import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tokens } from '../tokens';
import { useTranslation } from '../contexts/TranslationContext';
import { TabParamList } from '../types/navigation';
import { Platform, useColorScheme, TouchableOpacity, ViewStyle, View } from 'react-native';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { HomeIcon, MapIcon, ProfileIcon, PractiseIcon } from './icons/TabIcons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
            backgroundColor: '#2D3130'
          }
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
  const isDark = colorScheme === 'dark';

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
    backgroundColor: '#1F1F1F',
    borderTopWidth: 1,
    borderTopColor: tokens.color.backgroundPress,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
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
          fontSize: 10,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          fontWeight: '500',
        },
        // Active/Inactive colors
        tabBarActiveTintColor: '#9DBCB7',
        tabBarInactiveTintColor: '#A5A5A5',
        // Header style
        headerStyle: {
          backgroundColor: tokens.color.background,
          borderBottomWidth: 1,
          borderBottomColor: tokens.color.backgroundPress,
          elevation: 0,
          shadowOpacity: 0
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: '#9DBCB7'
        },
        // Use custom tab bar button
        tabBarButton: (props) => <CustomTabBarButton {...props} />
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon
              color={color}
              size={24}
            />
          )
        }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{
          title: t('navigation.progress'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <PractiseIcon
              color={color}
              size={24}
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
            <MapIcon
              color={color}
              size={24}
            />
          )
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        options={{
          title: t('navigation.profile'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <ProfileIcon
              color={color}
              size={24}
            />
          )
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
              <Stack.Screen 
                name="ProfileScreen" 
                component={ProfileScreen} 
              />
            </Stack.Navigator>
          );
        }}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
