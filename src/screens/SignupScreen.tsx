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

export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const { t, clearCache } = useTranslation();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    clearCache();
    console.log('[SIGNUP] Forcing translation refresh');
  }, []);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      setError(t('auth.signUp.error.emptyFields'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.signUp.error.passwordMismatch'));
      return;
    }
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
    <Screen scroll>
      <YStack f={1} gap={32} width="100%">
        <Header title={t('auth.signUp.title')} showBack={true} />

        <YStack gap={24} width="100%">
          <Text size="md" intent="muted">
            {t('auth.signUp.subtitle')}
          </Text>

          <YStack gap={24}>
            <YStack gap={16}>
              <FormField
                label={t('auth.signUp.emailLabel')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('auth.signUp.emailPlaceholder')}
                autoComplete="email"
              />

              <FormField
                label={t('auth.signUp.passwordLabel')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t('auth.signUp.passwordPlaceholder')}
                autoComplete="password-new"
              />

              <FormField
                label={t('auth.signUp.confirmPasswordLabel')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
                autoComplete="password-new"
              />
            </YStack>

            {error ? (
              <Text size="sm" intent="error" textAlign="center">
                {error}
              </Text>
            ) : null}

            <YStack gap={16} width="100%">
              <Button onPress={handleSignup} disabled={loading} variant="primary" size="lg">
                {loading ? t('auth.signUp.loading') : t('auth.signUp.signUpButton')}
              </Button>
            </YStack>
          </YStack>
        </YStack>

        <XStack justifyContent="center" alignItems="center" gap={8}>
          <Text size="md" intent="muted">
            {t('auth.signUp.hasAccount')}
          </Text>
          <Button
            variant="link"
            size="md"
            onPress={() => navigation.navigate('Login')}
            paddingVertical={0}
            height="auto"
          >
            {t('auth.signUp.signInLink')}
          </Button>
        </XStack>
      </YStack>
    </Screen>
  );
}
