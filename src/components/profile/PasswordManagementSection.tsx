import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { YStack, XStack, Input as TamaguiInput } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { Button } from '../Button';
import { Text } from '../Text';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useToast } from '../../contexts/ToastContext';
import { trackEvent } from '../../utils/analytics';

type AuthProvider = 'email' | 'google' | 'apple' | 'facebook' | null;

export const PasswordManagementSection: React.FC = () => {
  const [provider, setProvider] = useState<AuthProvider>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'change' | 'reset'>('change');
  
  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Reset password form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
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
        // Pre-fill email for reset form
        setResetEmail(user.email || '');
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
      // Step 1: Verify current password by attempting sign-in
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

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Success
      showToast({ title: 'Success', message: 'Password changed successfully', type: 'success' });
      trackEvent('password_change_success');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setExpanded(false);
    } catch (error: any) {
      console.error('Password change error:', error);
      showToast({ 
        title: 'Error',
        message: error.message || 'Failed to change password', 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      showToast({ title: 'Error', message: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://app.vromm.se/reset-password',
      });

      if (error) throw error;

      // Success
      setResetEmailSent(true);
      showToast({ 
        title: 'Success',
        message: 'Password reset email sent! Check your inbox.', 
        type: 'success' 
      });
      trackEvent('password_reset_email_sent');
    } catch (error: any) {
      console.error('Password reset error:', error);
      showToast({ 
        title: 'Error',
        message: error.message || 'Failed to send reset email', 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <YStack padding="$4">
        <Text size="sm" color="$gray11">Loading...</Text>
      </YStack>
    );
  }

  // OAuth users cannot manage passwords
  if (provider && provider !== 'email') {
    return (
      <YStack padding="$4" backgroundColor="$gray2" borderRadius="$4" marginVertical="$2">
        <XStack alignItems="center" marginBottom="$2">
          <Lock size={20} color="#6B7280" />
          <Text size="md" weight="semibold" marginLeft="$2">
            Security
          </Text>
        </XStack>
        <Text size="sm" color="$gray11">
          You signed in with {provider.charAt(0).toUpperCase() + provider.slice(1)}.
        </Text>
        <Text size="sm" color="$gray11" marginTop="$1">
          Password management is not available for social sign-in accounts.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack padding="$4" marginVertical="$2">
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center">
            <Lock size={20} color="#6B7280" />
            <Text size="md" weight="semibold" marginLeft="$2">
              Security
            </Text>
          </XStack>
          <Text color="$gray11">{expanded ? '−' : '+'}</Text>
        </XStack>
      </TouchableOpacity>

      {expanded && (
        <YStack marginTop="$4" gap="$4">
          {/* Mode Toggle */}
          <XStack borderBottomWidth={1} borderBottomColor="$gray6">
            <TouchableOpacity
              style={{ flex: 1, paddingBottom: 8 }}
              onPress={() => setMode('change')}
            >
              <Text
                textAlign="center"
                color={mode === 'change' ? '$blue10' : '$gray11'}
                weight={mode === 'change' ? 'semibold' : 'normal'}
              >
                Change Password
              </Text>
              {mode === 'change' && (
                <View
                  style={{
                    height: 2,
                    backgroundColor: '#3b82f6',
                    marginTop: 8,
                  }}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingBottom: 8 }}
              onPress={() => setMode('reset')}
            >
              <Text
                textAlign="center"
                color={mode === 'reset' ? '$blue10' : '$gray11'}
                weight={mode === 'reset' ? 'semibold' : 'normal'}
              >
                Reset Password
              </Text>
              {mode === 'reset' && (
                <View
                  style={{
                    height: 2,
                    backgroundColor: '#3b82f6',
                    marginTop: 8,
                  }}
                />
              )}
            </TouchableOpacity>
          </XStack>

          {/* Change Password Form */}
          {mode === 'change' && (
            <YStack gap="$4">
              <YStack gap="$2">
                <Text size="sm" weight="medium">Current Password</Text>
                <XStack position="relative">
                  <TamaguiInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    placeholder="Enter current password"
                    autoCapitalize="none"
                    flex={1}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 12,
                    }}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} color="#6B7280" />
                    ) : (
                      <Eye size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text size="sm" weight="medium">New Password</Text>
                <XStack position="relative">
                  <TamaguiInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password (min 8 characters)"
                    autoCapitalize="none"
                    flex={1}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 12,
                    }}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff size={20} color="#6B7280" />
                    ) : (
                      <Eye size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                </XStack>
              </YStack>

              <YStack gap="$2">
                <Text size="sm" weight="medium">Confirm New Password</Text>
                <XStack position="relative">
                  <TamaguiInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Confirm new password"
                    autoCapitalize="none"
                    flex={1}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 12,
                    }}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#6B7280" />
                    ) : (
                      <Eye size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                </XStack>
              </YStack>

              <XStack gap="$2">
                <Button
                  variant="outlined"
                  onPress={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setExpanded(false);
                  }}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleChangePassword}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? 'Changing...' : 'Change Password'}
                </Button>
              </XStack>
            </YStack>
          )}

          {/* Reset Password Form */}
          {mode === 'reset' && (
            <YStack gap="$4">
              {!resetEmailSent ? (
                <>
                  <Text size="sm" color="$gray11">
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>
                  <YStack gap="$2">
                    <Text size="sm" weight="medium">Email Address</Text>
                    <XStack position="relative">
                      <TamaguiInput
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        placeholder="your@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        flex={1}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: 12,
                        }}
                      >
                        <Mail size={20} color="#6B7280" />
                      </View>
                    </XStack>
                  </YStack>

                  <XStack gap="$2">
                    <Button
                      variant="outlined"
                      onPress={() => setExpanded(false)}
                      disabled={submitting}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onPress={handleResetPassword}
                      disabled={submitting}
                      style={{ flex: 1 }}
                    >
                      {submitting ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </XStack>
                </>
              ) : (
                <YStack backgroundColor="$green2" padding="$4" borderRadius="$4">
                  <Text size="md" weight="semibold" color="$green11" marginBottom="$2">
                    ✓ Email Sent!
                  </Text>
                  <Text size="sm" color="$green11">
                    Check your inbox at {resetEmail} for a password reset link.
                  </Text>
                  <Button
                    variant="outlined"
                    onPress={() => {
                      setResetEmailSent(false);
                      setExpanded(false);
                    }}
                    size="sm"
                    marginTop="$4"
                  >
                    Done
                  </Button>
                </YStack>
              )}
            </YStack>
          )}
        </YStack>
      )}
    </YStack>
  );
};
