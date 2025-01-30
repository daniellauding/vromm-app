import { useState } from 'react';
import { YStack, XStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { Text } from '../components/Text';

export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();

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
      await signUp(email, password, () => {
        navigation.navigate('Login');
      });
      // Success message will be shown by Supabase's email confirmation
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <YStack f={1} gap={2}>
        <Header title={t('auth.signUp.title')} />
        
        <YStack gap={32}>
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

            <YStack gap={16}>
              <Button
                onPress={handleSignup}
                disabled={loading}
                variant="primary"
                size="lg"
              >
                {loading ? t('auth.signUp.loading') : t('auth.signUp.signUpButton')}
              </Button>

              <Button
                onPress={() => navigation.navigate('Login')}
                variant="secondary"
                size="md"
              >
                {t('auth.signUp.signInLink')}
              </Button>
            </YStack>
          </YStack>
        </YStack>
      </YStack>
    </Screen>
  );
} 