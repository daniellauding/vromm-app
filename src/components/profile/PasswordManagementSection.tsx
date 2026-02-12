import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { YStack } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { FormField } from '../FormField';
import { Button } from '../Button';
import { Text } from '../Text';
import { Eye, EyeOff } from 'lucide-react-native';
import { useToast } from '../../contexts/ToastContext';
import { AppAnalytics } from '../../utils/analytics';

type AuthProvider = 'email' | 'google' | 'apple' | 'facebook' | null;

interface PasswordManagementSectionProps {
  onResetPassword: () => void;
}

export const PasswordManagementSection: React.FC<PasswordManagementSectionProps> = ({
  onResetPassword,
}) => {
  const [provider, setProvider] = useState<AuthProvider>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    checkAuthProvider();
  }, []);

  const checkAuthProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const authProvider = user.app_metadata?.provider as AuthProvider;
        setProvider(authProvider || 'email');
      }
    } catch (error) {
      console.error('Error checking auth provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateChangePassword = (): string | null => {
    if (!currentPassword) return 'Current password is required';
    if (!newPassword) return 'New password is required';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword === currentPassword) return 'New password must be different from current password';
    if (newPassword !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleChangePassword = async () => {
    const error = validateChangePassword();
    if (error) {
      showToast({ title: 'Error', message: error, type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User email not found');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      showToast({ title: 'Success', message: 'Password changed successfully', type: 'success' });
      AppAnalytics.trackFeatureUsage('password_management', 'password_changed');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      showToast({
        title: 'Error',
        message: error.message || 'Failed to change password',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  // OAuth users cannot manage passwords
  if (provider && provider !== 'email') {
    return (
      <YStack gap="$2">
        <Text size="sm" fontWeight="400" color="$color">
          Password
        </Text>
        <Text size="sm" color="$gray11">
          You signed in with {provider.charAt(0).toUpperCase() + provider.slice(1)}.
          Password management is not available for social sign-in accounts.
        </Text>
      </YStack>
    );
  }

  const EyeToggle = ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => (
    <TouchableOpacity onPress={onToggle}>
      {visible ? (
        <EyeOff size={20} color="#6B7280" />
      ) : (
        <Eye size={20} color="#6B7280" />
      )}
    </TouchableOpacity>
  );

  return (
    <YStack gap="$4">
      <FormField
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry={!showCurrentPassword}
        placeholder="Enter current password"
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
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showNewPassword}
        placeholder="Min 8 characters"
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
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        placeholder="Confirm new password"
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
        size="lg"
      >
        {submitting ? 'Changing...' : 'Change Password'}
      </Button>

      <TouchableOpacity onPress={onResetPassword}>
        <Text size="sm" color="$blue10" textAlign="center">
          Forgot your password?
        </Text>
      </TouchableOpacity>
    </YStack>
  );
};
