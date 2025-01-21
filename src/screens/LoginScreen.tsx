import { useState } from 'react';
import { YStack, XStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { Text } from '../components/Text';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.signIn.error.emptyFields'));
      return;
    }
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
    <Screen>
      <YStack f={1} justifyContent="center" gap={32}>
        <YStack gap={8}>
          <Text size="3xl" weight="bold" textAlign="center">
            {t('auth.signIn.title')}
          </Text>
          <Text size="md" intent="muted" textAlign="center">
            {t('auth.signIn.slogan')}
          </Text>
        </YStack>

        <YStack gap={24}>
          <YStack gap={16}>
            <FormField
              label={t('auth.signIn.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.signIn.emailPlaceholder')}
              autoComplete="email"
            />

            <FormField
              label={t('auth.signIn.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('auth.signIn.passwordPlaceholder')}
              autoComplete="password"
            />
          </YStack>

          {error ? (
            <Text size="sm" intent="error" textAlign="center">
              {error}
            </Text>
          ) : null}

          <YStack gap={16}>
            <Button
              onPress={handleLogin}
              disabled={loading}
              variant="primary"
              size="lg"
            >
              {loading ? t('auth.signIn.loading') : t('auth.signIn.signInButton')}
            </Button>

            <Button
              onPress={() => navigation.navigate('ForgotPassword')}
              variant="secondary"
              size="md"
            >
              {t('auth.signIn.forgotPassword')}
            </Button>
          </YStack>
        </YStack>

        <XStack justifyContent="center" alignItems="center" gap={8}>
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