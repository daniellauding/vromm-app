import { useState } from 'react';
import { Form, YStack } from 'tamagui';
import { Button, Input, Text } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signIn(email, password);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack f={1} padding="$4" space="$4">
        <Text fontSize="$6" fontWeight="bold">Login</Text>
        
        <Form onSubmit={handleLogin}>
          <YStack space="$4">
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text color="$red10" fontSize="$3">{error}</Text>
            ) : null}

            <Button 
              themeInverse
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Sign In'}
            </Button>
          </YStack>
        </Form>
        
        <Button
          variant="outlined"
          onPress={() => navigation.navigate('Signup')}
        >
          Need an account? Sign up
        </Button>
      </YStack>
    </SafeAreaView>
  );
} 