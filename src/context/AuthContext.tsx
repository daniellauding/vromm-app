import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, db } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';
import { Platform, Alert } from 'react-native';
import { AppAnalytics, trackUserProperties } from '../utils/analytics';
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
  refreshProfile: () => Promise<void>;
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
  forgotPassword: async () => {},
  refreshProfile: async () => {},
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
        .then((data) => setProfile(data))
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
          error,
        } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
        setInitialized(true);
        console.log('[AUTH_DEBUG_INIT] Initial session fetched', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
        });
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AUTH_STATE_DEBUG] Auth state changed:', {
        event: _event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      // If user just signed in, ensure they have a profile
      if (_event === 'SIGNED_IN' && session?.user) {
        console.log('[AUTH_STATE_DEBUG] User signed in, checking profile...');
        try {
          // Check if profile exists
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', session.user.id)
            .single();

          if (fetchError && fetchError.code === 'PGRST116') {
            console.log('[AUTH_STATE_DEBUG] No profile found, creating new profile...');
            // No profile found
            // Create profile with user metadata
            const metadata = session.user.user_metadata;
            const { error: createError } = await supabase.from('profiles').insert([
              {
                id: session.user.id,
                email: session.user.email, // FIX: Always save email to profiles
                full_name: metadata.full_name || session.user.email?.split('@')[0] || 'Unknown',
                role: metadata.role || 'student',
                location: metadata.location || 'Unknown',
                experience_level: metadata.experience_level || 'beginner',
                private_profile: metadata.private_profile || false,
              },
            ]);

            if (createError) {
              console.error('[AUTH_STATE_DEBUG] Error creating profile on sign in:', createError);
            } else {
              console.log('[AUTH_STATE_DEBUG] Profile created successfully');
            }
          } else {
            console.log('[AUTH_STATE_DEBUG] Profile already exists');
            
            // Check if user account is deleted
            if (profile?.account_status === 'deleted') {
              console.log('🚫 Deleted user attempted login:', session.user.email);
              await supabase.auth.signOut();
              Alert.alert(
                'Account Deleted', 
                'This account has been deleted. Please contact support if you believe this is an error.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
        } catch (err) {
          console.error('[AUTH_STATE_DEBUG] Error handling profile creation:', err);
        }
      }

      console.log(
        '[AUTH_STATE_DEBUG] Updating state - session:',
        !!session,
        'user:',
        !!session?.user,
      );
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
      console.log('[AUTH_STATE_DEBUG] State updated successfully');

      // Emit a global debug ping to help root navigation decide
      try {
        (global as any).__AUTH_LAST_EVENT__ = _event;
        (global as any).__AUTH_LAST_USER__ = session?.user?.id;
      } catch {}
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = React.useCallback(
    async (email: string, password: string, onSuccess?: () => void) => {
      console.log('Starting signup process for:', email);

      try {
        setLoading(true);

        const profileData = {
          full_name: email.split('@')[0],
          role: 'student' as UserRole,
          location: 'Unknown',
          experience_level: 'beginner' as ExperienceLevel,
          private_profile: false,
        };

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: profileData,
          },
        });

        console.log('Auth signup response:', { authData, authError });

        if (authError) throw authError;
        if (!authData.user?.id) throw new Error('User creation failed');

        // Remove profile creation from here since it will be handled on first sign in

        // Track signup event in the background
        try {
          AppAnalytics.trackSignUp('email').catch((err) => {
            console.warn('Analytics tracking failed:', err);
          });

          // Set user properties for analytics
          if (user.user) {
            trackUserProperties({
              id: user.user.id,
              role: profile?.role,
              experience_level: profile?.experience_level,
              location: profile?.location,
              has_active_subscription: profile?.has_active_subscription,
            }).catch((err) => {
              console.warn('User properties tracking failed:', err);
            });
          }
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }

        console.log('Signup successful for user:', authData.user.id);

        // Email confirmation is disabled in the dashboard, so we do not show any
        // confirmation dialog here. Invoke optional success callback directly.
        onSuccess?.();
      } catch (error) {
        console.error('Signup process failed:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signIn = React.useCallback(async (email: string, password: string) => {
    console.log('[AUTH_DEBUG] signIn called with email:', email);

    try {
      console.log('[AUTH_DEBUG] Setting loading to true');
      setLoading(true);

      console.log('[AUTH_DEBUG] Attempting Supabase auth...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      console.log('[AUTH_DEBUG] Supabase response:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        errorMessage: error?.message,
      });

      if (error) {
        console.log('[AUTH_DEBUG] Supabase auth error:', error);
        throw error;
      }

      // Check if email is confirmed
      if (data?.user && !data.user.email_confirmed_at) {
        console.log('[AUTH_DEBUG] Email not confirmed for user:', data.user.id);
        Alert.alert('Email Not Confirmed', 'Please confirm your email address before signing in.', [
          {
            text: 'Resend Confirmation',
            onPress: async () => {
              try {
                const { error } = await supabase.auth.resend({
                  type: 'signup',
                  email: email,
                });
                if (error) throw error;
                Alert.alert('Success', 'Confirmation email resent. Please check your inbox.');
              } catch (err) {
                console.error('Error resending confirmation:', err);
                Alert.alert('Error', 'Failed to resend confirmation email. Please try again.');
              }
            },
          },
          { text: 'OK' },
        ]);
        throw new Error('Please confirm your email before signing in');
      }

      console.log('[AUTH_DEBUG] Authentication successful, clearing content cache...');
      // Clear content cache to ensure fresh data
      await clearContentCache();

      // Only track signin event if successful
      if (data?.user) {
        console.log('[AUTH_DEBUG] Tracking sign-in analytics...');
        try {
          AppAnalytics.trackSignIn('email').catch((err) => {
            console.warn('Analytics tracking failed:', err);
          });

          // Set user properties for analytics
          if (data?.user) {
            trackUserProperties({
              id: data.user.id,
              role: profile?.role,
              experience_level: profile?.experience_level,
              location: profile?.location,
              has_active_subscription: profile?.has_active_subscription,
            }).catch((err) => {
              console.warn('User properties tracking failed:', err);
            });
          }
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }
      }

      console.log('[AUTH_DEBUG] signIn process completed successfully');
    } catch (error) {
      console.log('[AUTH_DEBUG] signIn failed, throwing error:', error);
      throw error;
    } finally {
      console.log('[AUTH_DEBUG] Setting loading to false');
      setLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      setLoading(true);

      // Track sign out analytics
      AppAnalytics.trackSignOut().catch((err) => {
        console.warn('Sign out analytics failed:', err);
      });

      // Clear content cache before signout
      await clearContentCache();

      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('Error signing out:', error);
      }

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
  }, []);

  const updateProfile = React.useCallback(
    async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('No user logged in');
      try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

        if (error) throw error;
        setProfile((prev) => (prev ? { ...prev, ...updates } : null));

        // Track profile update in the background
        try {
          AppAnalytics.trackProfileUpdate().catch((err) => {
            console.warn('Analytics tracking failed:', err);
          });
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }
      } catch (error) {
        console.error('Profile update failed:', error);
        throw error;
      }
    },
    [user?.id],
  );

  const resetPassword = React.useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'korvagen://reset-password',
    });
    if (error) throw error;
  }, []);

  const forgotPassword = React.useCallback(async (email: string) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'vrommapp://reset-password',
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Password Reset Email Sent',
        'Check your email for a link to reset your password.',
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while sending the reset email');
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  }, [user?.id]);

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
    forgotPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
