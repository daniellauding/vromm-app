import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Pressable,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { YStack } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { FormField } from '../FormField';
import { Button } from '../Button';
import { Text } from '../Text';
import { Eye, EyeOff } from 'lucide-react-native';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { AppAnalytics } from '../../utils/analytics';

type AuthProvider = 'email' | 'google' | 'apple' | 'facebook' | null;

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangePasswordSheet: React.FC<ChangePasswordSheetProps> = ({ visible, onClose }) => {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Auth provider check
  const [provider, setProvider] = useState<AuthProvider>(null);
  const [providerLoading, setProviderLoading] = useState(true);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset password (forgot)
  const [showResetFlow, setShowResetFlow] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Animation
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      checkAuthProvider();
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Reset state
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setShowResetFlow(false);
      setResetEmailSent(false);
      onClose();
    });
  }, [onClose, backdropOpacity, sheetTranslateY]);

  const checkAuthProvider = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const authProvider = user.app_metadata?.provider as AuthProvider;
        setProvider(authProvider || 'email');
        if (user.email) setResetEmail(user.email);
      }
    } catch (error) {
      console.error('Error checking auth provider:', error);
    } finally {
      setProviderLoading(false);
    }
  };

  const validateChangePassword = (): string | null => {
    if (!currentPassword) return 'Current password is required';
    if (!newPassword) return 'New password is required';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword === currentPassword)
      return 'New password must be different from current password';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleChangePassword = async () => {
    const error = validateChangePassword();
    if (error) {
      showToast({ title: t('common.error'), message: error, type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User email not found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      showToast({ title: t('common.success'), message: t('auth.changePassword'), type: 'success' });
      AppAnalytics.trackFeatureUsage('password_management', 'password_changed');
      handleClose();
    } catch (error: any) {
      console.error('Password change error:', error);
      showToast({
        title: t('common.error'),
        message: error.message || 'Failed to change password',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      showToast({
        title: t('common.error'),
        message: 'Please enter a valid email address',
        type: 'error',
      });
      return;
    }
    setResetSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://app.vromm.se/reset-password',
      });
      if (resetError) throw resetError;
      setResetEmailSent(true);
      showToast({
        title: t('common.success'),
        message: t('auth.sendResetEmail'),
        type: 'success',
      });
      AppAnalytics.trackFeatureUsage('password_management', 'reset_email_sent');
    } catch (err: any) {
      console.error('Password reset error:', err);
      showToast({
        title: t('common.error'),
        message: err.message || 'Failed to send reset email',
        type: 'error',
      });
    } finally {
      setResetSubmitting(false);
    }
  };

  const EyeToggle = ({
    visible: isVisible,
    onToggle,
  }: {
    visible: boolean;
    onToggle: () => void;
  }) => (
    <TouchableOpacity onPress={onToggle}>
      {isVisible ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
    </TouchableOpacity>
  );

  if (!visible) return null;

  const renderContent = () => {
    if (providerLoading) return null;

    // OAuth users
    if (provider && provider !== 'email') {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      return (
        <YStack gap="$3">
          <Text size="sm" color="$gray11">
            {t('auth.oauthPasswordMessage').replace('{provider}', providerName)}
          </Text>
          <Button onPress={handleClose} variant="outlined" size="lg">
            {t('auth.close')}
          </Button>
        </YStack>
      );
    }

    // Reset password flow (forgot password)
    if (showResetFlow) {
      if (resetEmailSent) {
        return (
          <YStack gap="$4">
            <Text size="sm" color="$color">
              {t('auth.resetEmailSentMessage').replace('{email}', resetEmail)}
            </Text>
            <Button onPress={handleClose} variant="primary" size="md">
              {t('auth.done')}
            </Button>
          </YStack>
        );
      }
      return (
        <YStack gap="$4">
          <Text size="sm" color="$gray11">
            {t('auth.resetPasswordDescription')}
          </Text>
          <FormField
            label={t('auth.email')}
            value={resetEmail}
            onChangeText={setResetEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            size="md"
          />
          <Button
            onPress={handleResetPassword}
            disabled={resetSubmitting}
            variant="primary"
            size="md"
          >
            {resetSubmitting ? t('auth.sendingResetLink') : t('auth.sendResetEmail')}
          </Button>
          {/* <TouchableOpacity onPress={() => setShowResetFlow(false)}>
            <Text size="sm" color="$blue10" textAlign="center">
              {t('auth.backToChangePassword')}
            </Text>
          </TouchableOpacity> */}
          <Button onPress={() => setShowResetFlow(false)} variant="link" size="sm">
            {t('auth.backToChangePassword')}
          </Button>
        </YStack>
      );
    }

    // Change password form
    return (
      <YStack gap="$4">
        <FormField
          label={t('auth.currentPassword')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showCurrentPassword}
          placeholder={t('auth.currentPasswordPlaceholder')}
          autoCapitalize="none"
          size="md"
          rightElement={
            <EyeToggle
              visible={showCurrentPassword}
              onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
            />
          }
        />
        <FormField
          label={t('auth.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          placeholder={t('auth.newPasswordPlaceholder')}
          autoCapitalize="none"
          size="md"
          rightElement={
            <EyeToggle
              visible={showNewPassword}
              onToggle={() => setShowNewPassword(!showNewPassword)}
            />
          }
        />
        <FormField
          label={t('auth.confirmNewPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          autoCapitalize="none"
          size="md"
          rightElement={
            <EyeToggle
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          }
        />
        <Button
          onPress={handleChangePassword}
          disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
          variant="primary"
          size="md"
        >
          {submitting ? t('auth.changingPassword') : t('auth.changePassword')}
        </Button>
        <Button onPress={() => setShowResetFlow(true)} variant="link" size="sm">
          {t('auth.forgotPassword')}
        </Button>
        {/* <TouchableOpacity onPress={() => setShowResetFlow(true)}>
          <Text size="sm" color="$blue10" textAlign="center">
            {t('auth.forgotPassword')}
          </Text>
        </TouchableOpacity> */}
      </YStack>
    );
  };

  return (
    <Modal transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Pressable style={{ flex: 1 }} onPress={handleClose} />
            <Animated.View style={{ transform: Platform.OS === 'web' ? undefined : [{ translateY: sheetTranslateY }], ...(Platform.OS === 'web' ? { top: sheetTranslateY } : {}) }}>
              <YStack
                backgroundColor="$background"
                padding="$4"
                paddingBottom={40}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <View style={{ alignItems: 'center', paddingBottom: 4 }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: '#ccc',
                    }}
                  />
                </View>
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  {showResetFlow ? t('auth.resetPassword') : t('auth.changePassword')}
                </Text>
                {renderContent()}
              </YStack>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};
