import { supabase } from '../lib/supabase';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  photo?: string;
  familyName?: string;
  givenName?: string;
}

export interface GoogleSignInResult {
  success: boolean;
  user?: GoogleUser;
  error?: string;
}

// Lazy-load the native module to avoid crashes in environments without it (e.g., Expo Go)
let googleSignInModule: any | null = null;
async function getGoogleSignInModule() {
  if (googleSignInModule) return googleSignInModule;

  const { NativeModules, Platform } = require('react-native');
  const hasNativeModule = Platform.OS !== 'web' && NativeModules?.RNGoogleSignin;

  if (!hasNativeModule) {
    throw new Error('Google Sign-In native module unavailable (Expo Go or web)');
  }

  googleSignInModule = await import('@react-native-google-signin/google-signin');
  return googleSignInModule;
}

class GoogleSignInService {
  private isConfigured = false;

  /**
   * Initialize Google Sign-In configuration
   * Call this once when the app starts
   */
  async configure() {
    if (this.isConfigured) return;

    try {
      // iOS OAuth client ID from GoogleService-Info.plist (CLIENT_ID)
      const IOS_CLIENT_ID =
        '380014826230-1tnnca8r2p14p3uo6ou1dhcank58lskc.apps.googleusercontent.com';

      const { GoogleSignin } = await getGoogleSignInModule();
      GoogleSignin.configure({
        webClientId: '380014826230-9oj2214epv1b9vbsq3skeig0mfkh71nj.apps.googleusercontent.com',
        // Only need idToken for Supabase; keep it simple to avoid invalid_audience
        iosClientId: IOS_CLIENT_ID,
        scopes: ['openid', 'email', 'profile'],
      } as any);

      this.isConfigured = true;
      console.log('✅ Google Sign-In configured successfully');
    } catch (error) {
      console.error('❌ Google Sign-In configuration failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is already signed in to Google
   */
  async isSignedIn(): Promise<boolean> {
    try {
      await this.ensureConfigured();
      const { GoogleSignin } = await getGoogleSignInModule();
      return await GoogleSignin.isSignedIn();
    } catch (error) {
      console.error('Error checking Google sign-in status:', error);
      return false;
    }
  }

  /**
   * Sign in with Google
   */
  async signIn(): Promise<GoogleSignInResult> {
    try {
      await this.ensureConfigured();

      const { GoogleSignin } = await getGoogleSignInModule();

      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices();

      // Perform the sign in
      const userInfo = await GoogleSignin.signIn();

      if (!userInfo.data?.user) {
        throw new Error('No user data received from Google');
      }

      const googleUser: GoogleUser = {
        id: userInfo.data.user.id,
        name: userInfo.data.user.name || '',
        email: userInfo.data.user.email,
        photo: userInfo.data.user.photo || undefined,
        familyName: userInfo.data.user.familyName || undefined,
        givenName: userInfo.data.user.givenName || undefined,
      };

      console.log('✅ Google Sign-In successful:', googleUser.email);

      // Now sign in to Supabase with Google token
      if (userInfo.data?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        if (error) {
          console.error('❌ Supabase Google auth failed:', error);
          throw error;
        }

        console.log('✅ Supabase authentication successful');
      }

      return {
        success: true,
        user: googleUser,
      };
    } catch (error: any) {
      console.error('❌ Google Sign-In failed:', error);

      const fallbackMessage = error?.message?.includes('native module unavailable')
        ? 'Google Sign-In is unavailable in Expo Go. Please use a dev build.'
        : 'Google Sign-In failed';

      let errorMessage = fallbackMessage;

      try {
        const mod = await getGoogleSignInModule();
        if (error && typeof error === 'object' && 'code' in error) {
          switch ((error as any).code) {
            case mod.statusCodes.SIGN_IN_CANCELLED:
              errorMessage = 'Sign-in was cancelled';
              break;
            case mod.statusCodes.IN_PROGRESS:
              errorMessage = 'Sign-in is already in progress';
              break;
            case mod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
              errorMessage = 'Google Play Services not available';
              break;
            default:
              errorMessage = error.message || fallbackMessage;
          }
        }
      } catch {
        // Module not available; keep fallback message
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    try {
      await this.ensureConfigured();
      const { GoogleSignin } = await getGoogleSignInModule();
      await GoogleSignin.signOut();
      console.log('✅ Google Sign-Out successful');
    } catch (error) {
      console.error('❌ Google Sign-Out failed:', error);
      throw error;
    }
  }

  /**
   * Revoke access (stronger than sign out)
   */
  async revokeAccess(): Promise<void> {
    try {
      await this.ensureConfigured();
      const { GoogleSignin } = await getGoogleSignInModule();
      await GoogleSignin.revokeAccess();
      console.log('✅ Google access revoked');
    } catch (error) {
      console.error('❌ Google revoke access failed:', error);
      throw error;
    }
  }

  /**
   * Get current signed-in user info
   */
  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      await this.ensureConfigured();
      const { GoogleSignin } = await getGoogleSignInModule();
      const userInfo = await GoogleSignin.getCurrentUser();

      if (!userInfo?.user) return null;

      return {
        id: userInfo.user.id,
        name: userInfo.user.name || '',
        email: userInfo.user.email,
        photo: userInfo.user.photo || undefined,
        familyName: userInfo.user.familyName || undefined,
        givenName: userInfo.user.givenName || undefined,
      };
    } catch (error) {
      console.error('Error getting current Google user:', error);
      return null;
    }
  }

  /**
   * Ensure Google Sign-In is configured before use
   */
  private async ensureConfigured(): Promise<void> {
    if (!this.isConfigured) {
      await this.configure();
    }
  }
}

// Export singleton instance
export const googleSignInService = new GoogleSignInService();
export default googleSignInService;
