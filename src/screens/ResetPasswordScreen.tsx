import { useState } from 'react';
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
import { trackEvent } from '../lib/analytics';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react-native';

type ResetPasswordRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const route = useRoute<ResetPasswordRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  
  // Get token from URL params
  const token = route.params?.token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate inputs
  const validatePassword = (): string | null => {
    if (!newPassword) return t('auth.passwordRequired') || 'Password is required';
    if (newPassword.length < 8)
      return t('auth.passwordTooShort') || 'Password must be at least 8 characters';
    if (newPassword !== confirmPassword)
      return t('auth.passwordsDoNotMatch') || 'Passwords do not match';
    return null;
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setError('');

    // Validate inputs
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if token exists
    if (!token) {
      showToast({
        title: t('errors.title') || 'Error',
        message: t('auth.invalidResetLink') || 'Invalid password reset link',
        type: 'error',
      });
      navigation.navigate('Login');
      return;
    }

    setLoading(true);

    try {
      // Update password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Success!
      showToast({
        title: t('common.success') || 'Success',
        message: t('auth.passwordResetSuccess') || 'Password reset successfully',
        type: 'success',
      });

      // Track analytics
      trackEvent('password_reset_success');

      // Navigate to Login
      navigation.navigate('Login');
    } catch (err) {
      const errorMessage =
        (err as Error)?.message || t('auth.passwordResetFailed') || 'Failed to reset password';
      setError(errorMessage);
      showToast({
        title: t('errors.title') || 'Error',
        message: errorMessage,
        type: 'error',
      });
      trackEvent('password_reset_failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <YStack flex={1} padding="$4" gap="$4">
        {/* Header with back button */}
        <Header
          title={t('auth.resetPassword') || 'Reset Password'}
          leftButton={
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <XStack alignItems="center" gap="$2">
                <ArrowLeft size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                <Text fontSize="$4" fontWeight="500">
                  {t('common.back') || 'Back'}
                </Text>
              </XStack>
            </TouchableOpacity>
          }
        />

        <YStack flex={1} justifyContent="center" gap="$4" maxWidth={400} width="100%" alignSelf="center">
          {/* Instructions */}
          <Text fontSize="$4" color="$gray11" textAlign="center">
            {t('auth.resetPasswordInstructions') || 'Enter your new password below.'}
          </Text>

          {/* New Password Field */}
          <FormField
            label={t('auth.newPassword') || 'New Password'}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder={t('auth.enterNewPassword') || 'Enter new password'}
            autoCapitalize="none"
            rightIcon={
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
            label={t('auth.confirmPassword') || 'Confirm Password'}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder={t('auth.enterPasswordAgain') || 'Enter password again'}
            autoCapitalize="none"
            rightIcon={
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
            loading={loading}
            size="large"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {t('auth.resetPasswordButton') || 'Reset Password'}
          </Button>

          {/* Back to Login Link */}
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text fontSize="$3" color="$blue10" textAlign="center">
              {t('auth.backToLogin') || 'Back to Login'}
            </Text>
          </TouchableOpacity>
        </YStack>
      </YStack>
    </Screen>
  );
}
