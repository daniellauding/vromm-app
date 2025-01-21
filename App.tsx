import { TamaguiProvider, Theme, useTheme } from 'tamagui';
import { config } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateRouteScreen } from './src/screens/CreateRouteScreen';
import { RouteDetailScreen } from './src/screens/RouteDetailScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { RootStackParamList } from './src/types/navigation';
import { TabNavigator } from './src/components/TabNavigator';
import { useColorScheme } from 'react-native';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user, loading } = useAuth();
  const theme = useTheme();
  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log('AppContent mounted:', { user, loading, platform: Platform.OS });
  }, []);

  if (loading) {
    console.log('Loading state...');
    return null;
  }

  console.log('Rendering navigation, user:', user);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.background.val,
          },
          headerTintColor: theme.color.val,
          contentStyle: {
            backgroundColor: theme.background.val,
          },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="RouteDetail" 
              component={RouteDetailScreen}
              options={{ headerShown: true }}
            />
            <Stack.Screen 
              name="CreateRoute" 
              component={CreateRouteScreen}
              options={{ headerShown: true }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log('App mounted');
  }, []);

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config}>
        <Theme name={colorScheme === 'dark' ? 'dark' : 'light'}>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </LanguageProvider>
        </Theme>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
} 