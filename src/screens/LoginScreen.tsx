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
import * as Linking from 'expo-linking';
import { googleSignInService } from '../services/googleSignInService';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { t, clearCache } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();

  // Note: Removed clearCache() call that was causing logger errors

  // Navigation is handled globally in App.tsx after session is set

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
      
      // Check if user account is deleted after successful auth
      console.log('[LOGIN_DEBUG] Checking user account status...');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_status, full_name')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.log('[LOGIN_DEBUG] Error checking profile:', profileError);
        } else if (profile?.account_status === 'deleted') {
          console.log('[LOGIN_DEBUG] User account is deleted, signing out...');
          await supabase.auth.signOut();
          setError('This account has been deleted. Please contact support if you believe this is an error.');
          return;
        }
        console.log('[LOGIN_DEBUG] User account status:', profile?.account_status);
      }
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
      console.log('[GOOGLE_NATIVE] Google login pressed');
      const result = await googleSignInService.signIn();
      if (!result.success) {
        console.log('[GOOGLE_NATIVE] Sign-in failed:', result.error);
        Alert.alert('Google Sign-In', result.error || 'Google sign-in failed');
        return;
      }
      console.log('[GOOGLE_NATIVE] Google native sign-in completed for:', result.user?.email);
      // App.tsx listens to Supabase SIGNED_IN and will remount the navigator
    } catch (e) {
      console.error('[GOOGLE_NATIVE] Error:', e);
      Alert.alert('Error', 'Google sign-in failed. Use a development build (not Expo Go).');
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
      const rawNonce = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
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
      console.log('[OAUTH][Facebook] redirectTo =', redirectTo);
      console.log('[OAUTH][Facebook] authUrl =', authUrl);
      if (!authUrl) throw new Error('No auth URL from Supabase');

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      console.log('[OAUTH][Facebook] WebBrowser result =', result);
      if (result.type !== 'success') return; // silent cancel
      if (result.url) {
        console.log('[OAUTH][Facebook] result.url =', result.url);
        const parsed = Linking.parse(result.url);
        console.log('[OAUTH][Facebook] parsed =', parsed);
        const code = (parsed.queryParams?.code as string) || '';
        console.log('[OAUTH][Facebook] code =', code ? '[present]' : '[missing]');
        let didSetSession = false;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          console.log('[OAUTH][Facebook] exchangeCode error =', error);
          if (error) throw error;
          // Ensure session object is available before navigating
          await supabase.auth.getSession();
          didSetSession = true;
        } else {
          const hashIndex = result.url.indexOf('#');
          if (hashIndex >= 0) {
            const fragment = result.url.substring(hashIndex + 1);
            const sp = new URLSearchParams(fragment);
            const access_token = sp.get('access_token') || '';
            const refresh_token = sp.get('refresh_token') || '';
            console.log('[OAUTH][Facebook] fragment tokens present =', Boolean(access_token));
            if (access_token) {
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token: refresh_token || '',
              });
              console.log('[OAUTH][Facebook] setSession error =', error);
              if (error) throw error;
              // Ensure session object is available before navigating
              await supabase.auth.getSession();
              didSetSession = true;
            }
          }
        }
        try {
          if (typeof WebBrowser.dismissAuthSession === 'function') {
            await WebBrowser.dismissAuthSession();
          } else if (typeof WebBrowser.dismissBrowser === 'function') {
            await WebBrowser.dismissBrowser();
          }
        } catch (e) {
          // ignore
        }
        // Navigation is centralized in App.tsx
      }
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
          <YStack gap={8}>
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
            <XStack 
              justifyContent="space-around" 
              alignItems="center" 
              marginTop={20} 
              paddingHorizontal={60}
              width="100%"
            >
              <Button
                size="md"
                backgroundColor="transparent"
                borderWidth={0}
                onPress={handleGoogleLogin}
                disabled={oauthLoading}
                accessibilityLabel="Sign in with Google"
                accessibilityRole="button"
                pressStyle={{ scale: 0.95, backgroundColor: 'transparent' }}
              >
                <Ionicons name="logo-google" size={32} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </Button>
              
              <Button
                size="md"
                backgroundColor="transparent"
                borderWidth={0}
                onPress={handleFacebookLogin}
                disabled={oauthLoading}
                accessibilityLabel="Sign in with Facebook"
                accessibilityRole="button"
                pressStyle={{ scale: 0.95, backgroundColor: 'transparent' }}
              >
                <Ionicons name="logo-facebook" size={32} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
              </Button>
              
              <Button
                size="md"
                backgroundColor="transparent"
                borderWidth={0}
                onPress={handleAppleLogin}
                disabled={oauthLoading}
                accessibilityLabel="Sign in with Apple"
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
          </YStack>
        </YStack>

        {/* Auth status debug */}
        {/* <XStack justifyContent="center" alignItems="center" gap={0} marginBottom={8}>
          <Text size="sm" intent={user ? 'success' : 'muted'}>
            {user ? `Signed in as ${user.email}` : 'Not signed in'}
          </Text>
        </XStack> */}

        <XStack justifyContent="center" alignItems="center" gap={0}>
          <Text size="md" intent="muted">
            {t('auth.signIn.noAccount')}
          </Text>
          <Button
            variant="link"
            size="md"
            onPress={() => navigation.replace('Signup')}
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
