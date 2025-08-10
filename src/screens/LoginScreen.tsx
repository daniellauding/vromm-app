import { useState, useEffect } from 'react';
import { Alert, TouchableOpacity, useColorScheme } from 'react-native';
import { YStack, XStack, View } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { FormField } from '../components/FormField';
import { Header } from '../components/Header';
import { useTranslation } from '../contexts/TranslationContext';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const { signIn } = useAuth();
  const { t, clearCache } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();

  // Note: Removed clearCache() call that was causing logger errors

  const handleLogin = async () => {
    console.log('[LOGIN_DEBUG] Starting login process...');
    console.log('[LOGIN_DEBUG] Email:', email);
    console.log('[LOGIN_DEBUG] Password length:', password.length);

    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setError('');

    // Client-side validation
    if (!email) {
      setEmailError(t('auth.invalidEmail') || 'Please enter an email address');
      console.log('[LOGIN_DEBUG] Email validation failed: empty email');
      hasError = true;
    }
    if (!password) {
      setPasswordError(t('auth.invalidPassword') || 'Please enter a password');
      console.log('[LOGIN_DEBUG] Password validation failed: empty password');
      hasError = true;
    }

    if (hasError) {
      console.log('[LOGIN_DEBUG] Client validation failed, stopping login attempt');
      return;
    }

    console.log('[LOGIN_DEBUG] Client validation passed, attempting sign in...');

    try {
      setLoading(true);
      setError('');
      setPasswordError('');

      console.log('[LOGIN_DEBUG] Calling signIn function...');
      await signIn(email, password);
      console.log('[LOGIN_DEBUG] signIn completed successfully');
    } catch (err) {
      const error = err as Error;
      console.log('[LOGIN_DEBUG] signIn failed with error:', error.message);

      // Check for specific error types
      if (error.message && error.message.toLowerCase().includes('invalid login credentials')) {
        setPasswordError(t('auth.invalidCredentials') || 'Invalid email or password');
        console.log('[LOGIN_DEBUG] Setting password error for invalid credentials');
      } else if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        setError(error.message);
        console.log('[LOGIN_DEBUG] Setting general error for unconfirmed email');
      } else {
        setError(error.message);
        console.log('[LOGIN_DEBUG] Setting general error:', error.message);
      }
    } finally {
      setLoading(false);
      console.log('[LOGIN_DEBUG] Login process completed, loading set to false');
    }
  };

  const handleGoogleLogin = async () => {
    if (oauthLoading) return;

    try {
      setOauthLoading(true);
      console.log('Google login pressed');
      // Web OAuth flow via Supabase (works on iOS/Android/web with one Web Client ID in Supabase)
      const redirectTo = makeRedirectUri({ scheme: 'myapp' });
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
      if (result.type !== 'success') {
        // Silent cancel/close
        return;
      }
      // Session should be set by Supabase deep link handler
      console.log('✅ Google OAuth initiated; waiting for Supabase session');
    } catch (error) {
      console.error('Google login error:', error);
      const msg = (error as Error)?.message?.toLowerCase?.() || '';
      if (msg.includes('cancel')) return; // Silent cancel
      Alert.alert('Error', 'Google login failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (oauthLoading) return;
    try {
      setOauthLoading(true);
      console.log('Apple login pressed');
      
      // 1) Create nonce and hash
      const bytes = await Crypto.getRandomBytesAsync(16);
      const rawNonce = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      // 2) Native Apple sign-in to obtain identity token
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('No identityToken from Apple');
      }

      // 3) Exchange with Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;

      console.log('✅ Apple Sign-In successful (Supabase session set)');
    } catch (error) {
      console.error('Apple login error:', error);
      const msg = (error as Error)?.message?.toLowerCase?.() || '';
      if (msg.includes('canceled') || msg.includes('cancelled')) return; // Silent cancel
      Alert.alert('Error', 'Apple login failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (oauthLoading) return;
    
    try {
      setOauthLoading(true);
      console.log('Facebook login pressed');
      const redirectTo = makeRedirectUri({ scheme: 'myapp' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      const authUrl = data?.url;
      if (!authUrl) throw new Error('No auth URL from Supabase');

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type !== 'success') {
        // Silent cancel/close
        return;
      }

      // Session should be set via deep link; optionally verify
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Facebook authentication did not complete');
      }
      console.log('✅ Facebook Sign-In successful');
    } catch (error) {
      console.error('Facebook login error:', error);
      const msg = (error as Error)?.message?.toLowerCase?.() || '';
      if (msg.includes('cancel')) return; // Silent cancel
      Alert.alert('Error', 'Facebook login failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <Screen scroll>
      <YStack f={1} gap={32} width="100%">
        <Header title={t('auth.signIn.title')} showBack={true} />

        <YStack gap={24} width="100%">
          <YStack gap={16}>
            <FormField
              label={t('auth.signIn.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth.signIn.emailPlaceholder')}
              autoComplete="email"
              error={emailError}
            />

            <FormField
              label={t('auth.signIn.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('auth.signIn.passwordPlaceholder')}
              autoComplete="password"
              error={passwordError}
            />
          </YStack>

          {error && !passwordError ? (
            <Text size="sm" intent="error" textAlign="center">
              {error}
            </Text>
          ) : null}

          <YStack gap={16} width="100%">
            <Button onPress={handleLogin} disabled={loading} variant="primary" size="lg">
              {loading ? t('auth.signIn.loading') : t('auth.signIn.signInButton')}
            </Button>

            <Button onPress={() => navigation.navigate('ForgotPassword')} variant="link" size="md">
              {t('auth.signIn.forgotPassword')}
            </Button>

            {/* OAuth Login Buttons */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
                marginTop: 20,
                paddingHorizontal: 60,
                width: '100%',
              }}
            >
              <TouchableOpacity 
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#F5F5F5',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }}
                onPress={handleGoogleLogin}
                activeOpacity={0.7}
                disabled={oauthLoading}
                accessibilityLabel="Sign in with Google"
                accessibilityRole="button"
              >
                <Ionicons name="logo-google" size={24} color="#4285F4" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#F5F5F5',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }}
                onPress={handleAppleLogin}
                activeOpacity={0.7}
                disabled={oauthLoading}
                accessibilityLabel="Sign in with Apple"
                accessibilityRole="button"
              >
                <Ionicons 
                  name="logo-apple" 
                  size={24} 
                  color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#F5F5F5',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }}
                onPress={handleFacebookLogin}
                activeOpacity={0.7}
                disabled={oauthLoading}
                accessibilityLabel="Sign in with Facebook"
                accessibilityRole="button"
              >
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              </TouchableOpacity>
            </View>
          </YStack>
        </YStack>

        <XStack justifyContent="center" alignItems="center" gap={0}>
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
