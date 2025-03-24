import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, db } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';
import { Platform, Alert } from 'react-native';
import { AppAnalytics } from '../utils/analytics';
import { clearContentCache } from '../services/contentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];
type ExperienceLevel = Database['public']['Enums']['experience_level'];

export interface AuthContextData {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, onSuccess?: () => void) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

// Create context with default values
export const AuthContext = createContext<AuthContextData>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {},
  forgotPassword: async () => {}
});

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      db.profiles
        .get(user.id)
        .then(data => setProfile(data))
        .catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('AuthProvider mounted');
    // Get initial session
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', { event: _event, session });

      // If user just signed in, ensure they have a profile
      if (_event === 'SIGNED_IN' && session?.user) {
        try {
          // Check if profile exists
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (fetchError && fetchError.code === 'PGRST116') {
            // No profile found
            // Create profile with user metadata
            const metadata = session.user.user_metadata;
            const { error: createError } = await supabase.from('profiles').insert([
              {
                id: session.user.id,
                full_name: metadata.full_name || session.user.email?.split('@')[0] || 'Unknown',
                role: metadata.role || 'student',
                location: metadata.location || 'Unknown',
                experience_level: metadata.experience_level || 'beginner',
                private_profile: metadata.private_profile || false
              }
            ]);

            if (createError) {
              console.error('Error creating profile on sign in:', createError);
            }
          }
        } catch (err) {
          console.error('Error handling profile creation:', err);
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, onSuccess?: () => void) => {
    console.log('Starting signup process for:', email);

    try {
      setLoading(true);

      const profileData = {
        full_name: email.split('@')[0],
        role: 'student' as UserRole,
        location: 'Unknown',
        experience_level: 'beginner' as ExperienceLevel,
        private_profile: false
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: profileData
        }
      });

      console.log('Auth signup response:', { authData, authError });

      if (authError) throw authError;
      if (!authData.user?.id) throw new Error('User creation failed');

      // Remove profile creation from here since it will be handled on first sign in

      // Track signup event in the background
      try {
        AppAnalytics.trackSignUp('email').catch(err => {
          console.warn('Analytics tracking failed:', err);
        });
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError);
      }

      console.log('Signup successful for user:', authData.user.id);

      // Show confirmation alert
      Alert.alert(
        'Registration Successful',
        'Please check your email to confirm your account. The confirmation email might take a few minutes to arrive.',
        [
          {
            text: 'Resend Email',
            onPress: async () => {
              try {
                const { error } = await supabase.auth.resend({
                  type: 'signup',
                  email: email
                });
                if (error) throw error;
                Alert.alert('Success', 'Confirmation email resent. Please check your inbox.');
              } catch (err) {
                console.error('Error resending confirmation:', err);
                Alert.alert('Error', 'Failed to resend confirmation email. Please try again.');
              }
            }
          },
          {
            text: 'OK',
            onPress: () => {
              // Call the success callback if provided
              onSuccess?.();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Signup process failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if email is confirmed
      if (data?.user && !data.user.email_confirmed_at) {
        Alert.alert('Email Not Confirmed', 'Please confirm your email address before signing in.', [
          {
            text: 'Resend Confirmation',
            onPress: async () => {
              try {
                const { error } = await supabase.auth.resend({
                  type: 'signup',
                  email: email
                });
                if (error) throw error;
                Alert.alert('Success', 'Confirmation email resent. Please check your inbox.');
              } catch (err) {
                console.error('Error resending confirmation:', err);
                Alert.alert('Error', 'Failed to resend confirmation email. Please try again.');
              }
            }
          },
          { text: 'OK' }
        ]);
        throw new Error('Please confirm your email before signing in');
      }

      // Clear content cache to ensure fresh data
      await clearContentCache();

      // Only track signin event if successful
      if (data?.user) {
        try {
          AppAnalytics.trackSignIn('email').catch(err => {
            console.warn('Analytics tracking failed:', err);
          });
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // Clear content cache before signout
      await clearContentCache();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Explicitly clear all state
      setUser(null);
      setSession(null);
      setProfile(null);

      // Clear any user-specific data first to avoid race conditions
      try {
        await AsyncStorage.removeItem('user_profile');
      } catch (e) {
        console.error('Error clearing data before sign out:', e);
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) throw new Error('No user logged in');
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (error) throw error;
      setProfile(prev => (prev ? { ...prev, ...updates } : null));

      // Track profile update in the background
      try {
        AppAnalytics.trackProfileUpdate().catch(err => {
          console.warn('Analytics tracking failed:', err);
        });
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'korvagen://reset-password'
    });
    if (error) throw error;
  };

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'vrommapp://reset-password'
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Password Reset Email Sent',
        'Check your email for a link to reset your password.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while sending the reset email');
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Values for context provider
  const contextValue: AuthContextData = {
    user,
    session,
    profile,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    forgotPassword
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
