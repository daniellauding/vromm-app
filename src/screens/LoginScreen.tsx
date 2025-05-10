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

  useEffect(() => {
    clearCache();
    console.log('[LOGIN] Forcing translation refresh');
  }, []);

  const handleLogin = async () => {
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setError('');
    if (!email) {
      setEmailError(t('auth.invalidEmail'));
      console.log('LoginScreen: Email is empty, setting email error');
      hasError = true;
    }
    if (!password) {
      setPasswordError(t('auth.invalidPassword'));
      console.log('LoginScreen: Password is empty, setting password error');
      hasError = true;
    }
    if (hasError) {
      console.log('LoginScreen: Validation error, not attempting sign in');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setPasswordError('');
      await signIn(email, password);
    } catch (err) {
      const error = err as Error;
      if (error.message && error.message.toLowerCase().includes('invalid login credentials')) {
        setPasswordError(t('auth.invalidCredentials'));
        console.log('LoginScreen: Invalid credentials, setting password error');
      } else {
        setError(error.message);
        console.log('LoginScreen: Other error:', error.message);
      }
    } finally {
      setLoading(false);
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
