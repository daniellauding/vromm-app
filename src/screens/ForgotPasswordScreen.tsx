import { useState } from 'react';
import { YStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { useLanguage } from '../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Button } from '../components/Button';
import { Text } from '../components/Text';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();

  const handleResetPassword = async () => {
    if (!email) {
      setError(t('auth.resetPassword.error.emptyEmail'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <YStack f={1} gap={16}>
        <Header title={t('auth.resetPassword.title')} />
        
        <YStack gap={32}>
          <Text size="md" intent="muted">
            {t('auth.resetPassword.subtitle')}
          </Text>

          <YStack gap={24}>
            <FormField
              label={t('auth.resetPassword.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.resetPassword.emailPlaceholder')}
              autoComplete="email"
            />

            {error ? (
              <Text size="sm" intent="error" textAlign="center">
                {error}
              </Text>
            ) : null}

            {success ? (
              <Text size="sm" intent="success" textAlign="center">
                {t('auth.resetPassword.success')}
              </Text>
            ) : null}

            <YStack gap={16}>
              <Button
                onPress={handleResetPassword}
                disabled={loading}
                variant="primary"
                size="lg"
              >
                {loading ? t('auth.resetPassword.loading') : t('auth.resetPassword.resetButton')}
              </Button>

              <Button
                onPress={() => navigation.navigate('Login')}
                variant="secondary"
                size="md"
              >
                {t('auth.resetPassword.backToLogin')}
              </Button>
            </YStack>
          </YStack>
        </YStack>
      </YStack>
    </Screen>
  );
} 