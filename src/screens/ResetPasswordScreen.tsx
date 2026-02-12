import { useState, useEffect } from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NavigationProp, RootStackParamList } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/TranslationContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

/** Map raw Supabase/network errors to user-friendly translation keys */
function getErrorKey(err: unknown): string {
  const msg = ((err as Error)?.message || '').toLowerCase();
  if (msg.includes('network request failed') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'auth.networkError';
  }
  if (msg.includes('expired') || msg.includes('invalid') || msg.includes('otp')) {
    return 'auth.expiredResetLink';
  }
  return 'auth.invalidResetLink';
}

export function ResetPasswordScreen() {
  const route = useRoute<ResetPasswordRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  // Get token from URL params (deep link: vromm://reset-password?token=xxx)
  const token = route.params?.token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState('');

  const verifyToken = async () => {
    setVerifying(true);
    setError('');

    if (!token) {
      // No token — check if we already have a valid session (e.g. from ConfirmationURL flow)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
        } else {
          setError(t('auth.invalidResetLink'));
        }
      } catch (err) {
        setError(t(getErrorKey(err)));
      }
      setVerifying(false);
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      if (error) throw error;
      setSessionReady(true);
    } catch (err) {
      const key = getErrorKey(err);
      setError(t(key));
    } finally {
      setVerifying(false);
    }
  };

  // Verify the OTP token on mount to establish a recovery session
  useEffect(() => {
    verifyToken();
  }, [token]);

  // Validate inputs
  const validatePassword = (): string | null => {
    if (!newPassword) return t('auth.passwordRequired');
    if (newPassword.length < 8) return t('auth.passwordTooShort');
    if (newPassword !== confirmPassword) return t('auth.passwordsDoNotMatch');
    return null;
  };

  const handleResetPassword = async () => {
    setError('');

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!sessionReady) {
      showToast({
        title: t('errors.title') || 'Error',
        message: t('auth.invalidResetLink'),
        type: 'error',
      });
      navigation.navigate('Login');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      showToast({
        title: t('common.success') || 'Success',
        message: t('auth.passwordResetSuccess'),
        type: 'success',
      });

      navigation.navigate('Login');
    } catch (err) {
      const key = getErrorKey(err);
      setError(t(key));
      showToast({
        title: t('errors.title') || 'Error',
        message: t(key),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <YStack flex={1} padding="$4" gap="$4">
        {/* Header with back button */}
        <Header
          title={t('auth.resetPassword')}
          leftElement={
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <XStack alignItems="center" gap="$2">
                <ArrowLeft size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                <Text fontSize="$4" fontWeight="500">
                  {t('common.back') || 'Tillbaka'}
                </Text>
              </XStack>
            </TouchableOpacity>
          }
        />

        <YStack flex={1} justifyContent="center" gap="$4" maxWidth={400} width="100%" alignSelf="center">
          {/* Verifying token state */}
          {verifying ? (
            <Text fontSize="$4" color="$gray11" textAlign="center">
              {t('auth.verifyingResetLink')}
            </Text>
          ) : !sessionReady ? (
            <YStack gap="$4" alignItems="center">
              <Text fontSize="$4" color="$red10" textAlign="center">
                {error || t('auth.invalidResetLink')}
              </Text>

              {/* Retry button for network errors */}
              {token && (
                <Button onPress={verifyToken} size="lg">
                  {t('auth.tryAgain')}
                </Button>
              )}

              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text fontSize="$3" color="$blue10" textAlign="center">
                  {t('auth.backToLogin')}
                </Text>
              </TouchableOpacity>
            </YStack>
          ) : (
          <>
          {/* Instructions */}
          <Text fontSize="$4" color="$gray11" textAlign="center">
            {t('auth.resetPasswordInstructions')}
          </Text>

          {/* New Password Field */}
          <FormField
            label={t('auth.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder={t('auth.enterNewPassword')}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? (
                  <EyeOff size={20} color={colorScheme === 'dark' ? '#fff' : '#666'} />
                ) : (
                  <Eye size={20} color={colorScheme === 'dark' ? '#fff' : '#666'} />
                )}
              </TouchableOpacity>
            }
          />

          {/* Confirm Password Field */}
          <FormField
            label={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder={t('auth.enterPasswordAgain')}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? (
                  <EyeOff size={20} color={colorScheme === 'dark' ? '#fff' : '#666'} />
                ) : (
                  <Eye size={20} color={colorScheme === 'dark' ? '#fff' : '#666'} />
                )}
              </TouchableOpacity>
            }
          />

          {/* Error Message */}
          {error ? (
            <Text fontSize="$3" color="$red10" textAlign="center">
              {error}
            </Text>
          ) : null}

          {/* Submit Button */}
          <Button
            onPress={handleResetPassword}
            size="lg"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading
              ? t('common.loading') || 'Laddar...'
              : t('auth.resetPasswordButton')}
          </Button>

          {/* Back to Login Link */}
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text fontSize="$3" color="$blue10" textAlign="center">
              {t('auth.backToLogin')}
            </Text>
          </TouchableOpacity>
          </>
          )}
        </YStack>
      </YStack>
    </Screen>
  );
}
