import { TamaguiProvider } from 'tamagui';
import config from './tamagui.config';
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
import { RootStackParamList } from './src/types/navigation';
import { TabNavigator } from './src/navigation/TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

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
                presentation: 'modal',
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
        // Non-authenticated stack
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
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config}>
        <AuthProvider>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </AuthProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
} 