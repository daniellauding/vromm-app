import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider, Theme } from 'tamagui';
import { config } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { LocationProvider } from './src/context/LocationContext';
import { RootStackParamList } from './src/types/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

// Auth screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';

// Main app screens
import { TabNavigator } from './src/components/TabNavigator';
import { RouteDetailScreen } from './src/screens/RouteDetailScreen';
import { CreateRouteScreen } from './src/screens/CreateRouteScreen';
import { AddReviewScreen } from './src/screens/AddReviewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  console.log('[DEBUG] AppContent rendering');
  console.log('[DEBUG] Auth state:', { isAuthenticated: !!user });

  return (
    <NavigationContainer
      onStateChange={state => {
        console.log('[DEBUG] Navigation state:', state);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false
        }}
      >
        {!user ? (
          // Auth stack
          <>
            <Stack.Screen
              name="SplashScreen"
              component={SplashScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: false
              }}
            />
          </>
        ) : (
          // Main app stack
          <>
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{
                headerShown: false
              }}
            />
            <Stack.Screen
              name="RouteDetail"
              component={RouteDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateRoute"
              component={CreateRouteScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddReview"
              component={AddReviewScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Rubik-Regular': require('./assets/fonts/Rubik/static/Rubik-Regular.ttf'),
          'Rubik-Medium': require('./assets/fonts/Rubik/static/Rubik-Medium.ttf'),
          'Rubik-SemiBold': require('./assets/fonts/Rubik/static/Rubik-SemiBold.ttf'),
          'Rubik-Bold': require('./assets/fonts/Rubik/static/Rubik-Bold.ttf'),
          'Rubik-ExtraBold': require('./assets/fonts/Rubik/static/Rubik-ExtraBold.ttf'),
          'Rubik-Black': require('./assets/fonts/Rubik/static/Rubik-Black.ttf')
        });
        console.log('Fonts loaded successfully');
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Or a loading screen
  }

  console.log('[DEBUG] App rendering');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={config}>
          <Theme name={colorScheme === 'dark' ? 'dark' : 'light'}>
            <LanguageProvider>
              <AuthProvider>
                <LocationProvider>
                  <AppContent />
                </LocationProvider>
              </AuthProvider>
            </LanguageProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
