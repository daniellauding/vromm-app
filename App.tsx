import { TamaguiProvider, Theme } from 'tamagui';
import config from './src/tamagui.config';
import { AuthProvider } from './src/context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateRouteScreen } from './src/screens/CreateRouteScreen';
import { RouteDetailScreen } from './src/screens/RouteDetailScreen';
import { useAuth } from './src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { RootStackParamList } from './src/types/navigation';
import { TabNavigator } from './src/navigation/TabNavigator';

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('AppContent mounted:', { user, loading, platform: Platform.OS });
  }, []);

  if (loading) {
    console.log('Loading state...');
    return null;
  }

  console.log('Rendering navigation, user:', user);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        <>
          <Stack.Screen 
            name="Tabs" 
            component={TabNavigator}
          />
          <Stack.Group screenOptions={{ headerShown: true }}>
            <Stack.Screen 
              name="CreateRoute" 
              component={CreateRouteScreen}
              options={{
                title: 'Create Route',
                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
              }}
            />
            <Stack.Screen 
              name="RouteDetail" 
              component={RouteDetailScreen}
              options={{
                title: 'Route Details',
              }}
            />
          </Stack.Group>
        </>
      ) : (
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    console.log('App mounted');
  }, []);

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config}>
        <Theme name="light">
          <AuthProvider>
            <NavigationContainer
              documentTitle={{
                formatter: (options, route) =>
                  `${options?.title ?? route?.name} - Korvagen`,
              }}
            >
              <AppContent />
            </NavigationContainer>
          </AuthProvider>
        </Theme>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
} 