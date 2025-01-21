import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TamaguiProvider } from 'tamagui';
import { config } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { RootStackParamList } from './types/navigation';

// Auth screens
import { LoginScreen } from './screens/LoginScreen';
import { SignupScreen } from './screens/SignupScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';

// Main app screens
import { TabNavigator } from './components/TabNavigator';
import { RouteDetailScreen } from './screens/RouteDetailScreen';
import { CreateRouteScreen } from './screens/CreateRouteScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { user } = useAuth();

  console.log('[DEBUG] AppContent rendering');
  console.log('[DEBUG] Auth state:', { isAuthenticated: !!user });

  return (
    <NavigationContainer
      onStateChange={(state) => {
        console.log('[DEBUG] Navigation state:', state);
      }}
    >
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
        }}
      >
        {!user ? (
          // Auth stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen}
              options={{
                headerShown: false,
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
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="RouteDetail" 
              component={RouteDetailScreen}
              options={{ 
                headerShown: true,
              }}
            />
            <Stack.Screen 
              name="CreateRoute" 
              component={CreateRouteScreen}
              options={{ 
                headerShown: true,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  console.log('[DEBUG] App rendering');
  
  return (
    <TamaguiProvider config={config}>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </TamaguiProvider>
  );
} 