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
import { useAuthStrings } from '../hooks/useAuthStrings';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const { getString } = useAuthStrings();
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
    <Screen scroll>
      <YStack f={1} gap={32} width="100%">
        <Header title={getString('login_title', t('auth.signIn.title'))} showBack={true} />

        <YStack gap={24} width="100%">
          <YStack gap={16}>
            <FormField
              label={getString('signup_email_label', t('auth.signIn.emailLabel'))}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={getString('login_email_placeholder', t('auth.signIn.emailPlaceholder'))}
              autoComplete="email"
            />

            <FormField
              label={getString('password_label', t('auth.signIn.passwordLabel'))}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={getString(
                'login_password_placeholder',
                t('auth.signIn.passwordPlaceholder')
              )}
              autoComplete="password"
            />
          </YStack>

          {error ? (
            <Text size="sm" intent="error" textAlign="center">
              {error}
            </Text>
          ) : null}

          <YStack gap={16} width="100%">
            <Button onPress={handleLogin} disabled={loading} variant="primary" size="lg">
              {loading
                ? t('auth.signIn.loading')
                : getString('sign_in_button', t('auth.signIn.signInButton'))}
            </Button>

            <Button
              onPress={() => navigation.navigate('ForgotPassword')}
              variant="secondary"
              size="md"
            >
              {getString('forgot_password', t('auth.signIn.forgotPassword'))}
            </Button>
          </YStack>
        </YStack>

        <XStack justifyContent="center" alignItems="center" gap={8}>
          <Text size="md" intent="muted">
            {getString('no_account', t('auth.signIn.noAccount'))}
          </Text>
          <Button
            variant="link"
            size="md"
            onPress={() => navigation.navigate('Signup')}
            paddingVertical={0}
            height="auto"
          >
            {getString('create_account_button', t('auth.signIn.signUpLink'))}
          </Button>
        </XStack>
      </YStack>
    </Screen>
  );
}
