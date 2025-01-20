import { useState, useCallback } from 'react';
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
  const [lastAttempt, setLastAttempt] = useState(0);
  const { signUp } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleSignup = useCallback(async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastAttempt < 60000) { // 60 seconds
      setError('Please wait a minute before trying again');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setLastAttempt(now);
      console.log('Starting signup...');
      await signUp(email, password);
      console.log('Signup completed successfully');
    } catch (err) {
      console.error('Signup error:', err);
      const error = err as Error;
      if (error.message.includes('security purposes')) {
        setError('Please wait a minute before trying again');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, lastAttempt, signUp]);

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
              placeholder="Password (min 6 characters)"
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
              disabled={loading || (Date.now() - lastAttempt < 60000)}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
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