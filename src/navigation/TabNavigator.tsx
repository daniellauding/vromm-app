import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Feather } from '@expo/vector-icons';
import { TabParamList } from '../types/navigation';
import { useTheme } from 'tamagui';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.blue10.val,
        tabBarInactiveTintColor: theme.gray11.val,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.gray5.val,
          backgroundColor: theme.background.val,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Routes',
          tabBarLabel: 'Routes',
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
} 