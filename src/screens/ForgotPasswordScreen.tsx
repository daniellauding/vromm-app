import { useState, useEffect } from 'react';
import { YStack, XStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { useTranslation } from '../contexts/TranslationContext';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { supabase } from '../lib/supabase';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const { t, clearCache } = useTranslation();
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    clearCache();
    console.log('[FORGOT_PASSWORD] Forcing translation refresh');
  }, []);

  const handleResetPassword = async () => {
    if (!email) {
      setMessage(t('auth.resetPassword.error.emptyEmail'));
      setIsError(true);
      return;
    }

    try {
      setLoading(true);
      setIsError(false);
      setMessage('');

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'com.vromm.app://reset-password'
      });

      if (error) {
        throw error;
      }

      setMessage(t('auth.resetPassword.success'));
    } catch (err) {
      const error = err as Error;
      setMessage(error.message);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <YStack f={1} gap={32} width="100%">
        <Header title={t('auth.resetPassword.title')} showBack={true} />

        <YStack gap={24} width="100%">
          <Text size="md" intent="muted">
            {t('auth.resetPassword.subtitle')}
          </Text>

          <YStack gap={16}>
            <FormField
              label={t('auth.resetPassword.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.resetPassword.emailPlaceholder')}
              autoComplete="email"
            />
          </YStack>

          {message ? (
            <Text size="sm" intent={isError ? 'error' : 'success'} textAlign="center">
              {message}
            </Text>
          ) : null}

          <YStack gap={16} width="100%">
            <Button onPress={handleResetPassword} disabled={loading} variant="primary" size="lg">
              {loading ? t('auth.resetPassword.loading') : t('auth.resetPassword.resetButton')}
            </Button>

            <Button onPress={() => navigation.navigate('Login')} variant="secondary" size="md">
              {t('auth.resetPassword.backToLogin')}
            </Button>
          </YStack>
        </YStack>
      </YStack>
    </Screen>
  );
}
