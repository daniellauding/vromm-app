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
      // ⚠️ IMPORTANT: Replace with your actual Web Client ID
      // 
      // TO GET YOUR WEB CLIENT ID:
      // 1. Go to Firebase Console: https://console.firebase.google.com/
      // 2. Select your project (vromm-app or korvagen)
      // 3. Go to Project Settings (gear icon) > General tab
      // 4. Scroll down to "Your apps" section
      // 5. Click on the Web app (not Android/iOS)
      // 6. Copy the "Web client ID" from Firebase SDK snippet
      // 
      // It should look like: "123456789012-abcdefghijklmnopqrstuvwxyz1234567.apps.googleusercontent.com"
      
      const WEB_CLIENT_ID = '380014826230-9oj2rnkcp2jgv6vr8o8erjfp5g5l7d8c.apps.googleusercontent.com';
      
      if (WEB_CLIENT_ID === 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com') {
        throw new Error(
          '🚨 Google Sign-In not configured!\n\n' +
          'Please replace WEB_CLIENT_ID in src/services/googleSignInService.ts\n' +
          'with your actual Web Client ID from Firebase Console.\n\n' +
          'See comments in the file for detailed instructions.'
        );
      }
      
      const { GoogleSignin } = await getGoogleSignInModule();
      GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID, // From Firebase Console
        offlineAccess: true, // To get refresh token
        hostedDomain: '', // Optional: restrict to specific domain
        forceCodeForRefreshToken: true, // Android only
      });

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

      const { GoogleSignin, statusCodes } = await getGoogleSignInModule();

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
      
      const fallbackMessage =
        error?.message?.includes('native module unavailable')
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