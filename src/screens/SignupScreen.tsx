import { useState } from 'react';
import { Form, YStack } from 'tamagui';
import { Button, Input, Text } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      await signUp(email, password);
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
        <Text fontSize="$6" fontWeight="bold">Create Account</Text>
        
        <Form onSubmit={handleSignup}>
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
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Create Account'}
            </Button>
          </YStack>
        </Form>
        
        <Button
          variant="outlined"
          onPress={() => navigation.navigate('Login')}
        >
          Already have an account? Sign in
        </Button>
      </YStack>
    </SafeAreaView>
  );
} 