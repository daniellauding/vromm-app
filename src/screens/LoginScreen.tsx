import { useState, useEffect } from 'react';
import { YStack, XStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { useTranslation } from '../contexts/TranslationContext';
import { Button } from '../components/Button';
import { Text } from '../components/Text';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const { signIn } = useAuth();
  const { t, clearCache } = useTranslation();
  const navigation = useNavigation<NavigationProp>();

  // Note: Removed clearCache() call that was causing logger errors

  const handleLogin = async () => {
    console.log('[LOGIN_DEBUG] Starting login process...');
    console.log('[LOGIN_DEBUG] Email:', email);
    console.log('[LOGIN_DEBUG] Password length:', password.length);
    
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setError('');
    
    // Client-side validation
    if (!email) {
      setEmailError(t('auth.invalidEmail') || 'Please enter an email address');
      console.log('[LOGIN_DEBUG] Email validation failed: empty email');
      hasError = true;
    }
    if (!password) {
      setPasswordError(t('auth.invalidPassword') || 'Please enter a password');
      console.log('[LOGIN_DEBUG] Password validation failed: empty password');
      hasError = true;
    }
    
    if (hasError) {
      console.log('[LOGIN_DEBUG] Client validation failed, stopping login attempt');
      return;
    }

    console.log('[LOGIN_DEBUG] Client validation passed, attempting sign in...');
    
    try {
      setLoading(true);
      setError('');
      setPasswordError('');
      
      console.log('[LOGIN_DEBUG] Calling signIn function...');
      await signIn(email, password);
      console.log('[LOGIN_DEBUG] signIn completed successfully');
      
    } catch (err) {
      const error = err as Error;
      console.log('[LOGIN_DEBUG] signIn failed with error:', error.message);
      
      // Check for specific error types
      if (error.message && error.message.toLowerCase().includes('invalid login credentials')) {
        setPasswordError(t('auth.invalidCredentials') || 'Invalid email or password');
        console.log('[LOGIN_DEBUG] Setting password error for invalid credentials');
      } else if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        setError(error.message);
        console.log('[LOGIN_DEBUG] Setting general error for unconfirmed email');
      } else {
        setError(error.message);
        console.log('[LOGIN_DEBUG] Setting general error:', error.message);
      }
    } finally {
      setLoading(false);
      console.log('[LOGIN_DEBUG] Login process completed, loading set to false');
    }
  };

  return (
    <Screen scroll>
      <YStack f={1} gap={32} width="100%">
        <Header title={t('auth.signIn.title')} showBack={true} />

        <YStack gap={24} width="100%">
          <YStack gap={16}>
            <FormField
              label={t('auth.signIn.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.signIn.emailPlaceholder')}
              autoComplete="email"
              error={emailError}
            />

            <FormField
              label={t('auth.signIn.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('auth.signIn.passwordPlaceholder')}
              autoComplete="password"
              error={passwordError}
            />
          </YStack>

          {error && !passwordError ? (
            <Text size="sm" intent="error" textAlign="center">
              {error}
            </Text>
          ) : null}

          <YStack gap={16} width="100%">
            <Button onPress={handleLogin} disabled={loading} variant="primary" size="lg">
              {loading ? t('auth.signIn.loading') : t('auth.signIn.signInButton')}
            </Button>

            <Button onPress={() => navigation.navigate('ForgotPassword')} variant="link" size="md">
              {t('auth.signIn.forgotPassword')}
            </Button>
          </YStack>
        </YStack>

        <XStack justifyContent="center" alignItems="center" gap={0}>
          <Text size="md" intent="muted">
            {t('auth.signIn.noAccount')}
          </Text>
          <Button
            variant="link"
            size="md"
            onPress={() => navigation.navigate('Signup')}
            paddingVertical={0}
            height="auto"
          >
            {t('auth.signIn.signUpLink')}
          </Button>
        </XStack>
      </YStack>
    </Screen>
  );
}
