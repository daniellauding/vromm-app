import { useState, useEffect } from 'react';
import { YStack, XStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { useTranslation } from '../contexts/TranslationContext';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { useColorScheme, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useToast } from '../contexts/ToastContext';

WebBrowser.maybeCompleteAuthSession();

export function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const { t, clearCache } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const [oauthLoading, setOauthLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    clearCache();
    console.log('[SIGNUP] Forcing translation refresh');
  }, [clearCache]);

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
      await signUp(email, password);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    if (oauthLoading) return;
    try {
      setOauthLoading(true);
      const redirectTo = makeRedirectUri({ scheme: 'myapp', path: 'redirect' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: 'public_profile email',
        },
      });
      if (error) throw error;
      const authUrl = data?.url;
      if (!authUrl) throw new Error('No auth URL from Supabase');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type !== 'success') return; // silent cancel

      // Inform user about the known issue requiring app restart
      const title = t('auth.facebookLoginKnownIssueTitle') || 'Login Notice';
      const message =
        t('auth.facebookLoginKnownIssueMessage') ||
        'Facebook login succeeded. Due to a temporary issue, please restart the app to complete the login.';
      showToast({ title, message, type: 'info', duration: 6000 });
    } catch (e) {
      const msg = (e as Error)?.message?.toLowerCase?.() || '';
      if (msg.includes('cancel')) return;
      Alert.alert('Error', 'Facebook login failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (oauthLoading) return;
    try {
      setOauthLoading(true);
      const redirectTo = makeRedirectUri({ scheme: 'myapp', path: 'redirect' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: 'openid email profile',
        },
      });
      if (error) throw error;
      const authUrl = data?.url;
      if (!authUrl) throw new Error('No auth URL from Supabase');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type !== 'success') return; // silent cancel
    } catch (e) {
      const msg = (e as Error)?.message?.toLowerCase?.() || '';
      if (msg.includes('cancel')) return;
      Alert.alert('Error', 'Google login failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <Screen scroll>
      <YStack f={1} gap={32} width="100%">
        <Header title={t('auth.signUp.title')} showBack={true} />

        <YStack gap={24} width="100%">
          <Text size="md" intent="muted">
            {t('auth.signUp.subtitle')}
          </Text>

          <YStack gap={24}>
            <YStack gap={8}>
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

            <YStack gap={16} width="100%">
              <Button onPress={handleSignup} disabled={loading} variant="primary" size="lg">
                {loading ? t('auth.signUp.loading') : t('auth.signUp.signUpButton')}
              </Button>
            </YStack>
          </YStack>
        </YStack>

        {/* Social sign-up options */}
        <XStack
          justifyContent="space-around"
          alignItems="center"
          marginTop={16}
          paddingHorizontal={60}
          width="100%"
        >
          <Button
            size="md"
            backgroundColor="transparent"
            borderWidth={0}
            onPress={handleGoogleSignup}
            disabled={oauthLoading}
            accessibilityLabel="Continue with Google"
            accessibilityRole="button"
            pressStyle={{ scale: 0.95, backgroundColor: 'transparent' }}
          >
            <Ionicons name="logo-google" size={32} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          </Button>

          <Button
            size="md"
            backgroundColor="transparent"
            borderWidth={0}
            onPress={handleFacebookSignup}
            disabled={oauthLoading}
            accessibilityLabel="Continue with Facebook"
            accessibilityRole="button"
            pressStyle={{ scale: 0.95, backgroundColor: 'transparent' }}
          >
            <Ionicons name="logo-facebook" size={32} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          </Button>

          <Button
            size="md"
            backgroundColor="transparent"
            borderWidth={0}
            onPress={() => {
              // TODO: Implement Apple signup
              console.log('Apple signup not implemented yet');
            }}
            disabled={oauthLoading}
            accessibilityLabel="Continue with Apple"
            accessibilityRole="button"
            pressStyle={{ scale: 0.95, backgroundColor: 'transparent' }}
          >
            <Ionicons
              name="logo-apple"
              size={32}
              color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            />
          </Button>
        </XStack>

        <XStack justifyContent="center" alignItems="center" gap={8}>
          <Text size="md" intent="muted">
            {t('auth.signUp.hasAccount')}
          </Text>
          <Button
            variant="link"
            size="md"
            onPress={() => navigation.replace('Login')}
            paddingVertical={0}
            height="auto"
          >
            {t('auth.signUp.signInLink')}
          </Button>
        </XStack>
      </YStack>
    </Screen>
  );
}
