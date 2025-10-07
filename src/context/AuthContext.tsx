import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, db } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';
import { Alert } from 'react-native';
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
        .then((data) => {
          // Ensure email is populated from user if missing in profile
          if (data && !data.email && user.email) {
            const updatedProfile = { ...data, email: user.email };
            setProfile(updatedProfile);

            // Update the profile in database to fix the missing email
            supabase
              .from('profiles')
              .update({ email: user.email })
              .eq('id', user.id)
              .catch((err) => {
                console.warn('Failed to update profile email:', err);
              });
          } else if (data && data.email) {
            setProfile(data);
          } else {
            setProfile(data);
          }
        })
        .catch((err) => {
          console.error('❌ [AuthContext] Error fetching user profile:', err);
          // Don't set profile to null on error, keep existing profile if any
        });
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
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
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // If user just signed in, ensure they have a profile
      if (_event === 'SIGNED_IN' && session?.user) {
        try {
          // Check if profile exists
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id, full_name, role, account_status')
            .eq('id', session.user.id)
            .single();

          if (fetchError && fetchError.code === 'PGRST116') {
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
            }
          } else {
            // Check if user account is deleted
            if (profile?.account_status === 'deleted') {
              await supabase.auth.signOut();
              Alert.alert(
                'Account Deleted',
                'This account has been deleted. Please contact support if you believe this is an error.',
                [{ text: 'OK' }],
              );
              return;
            }
          }
        } catch (err) {
          console.error('[AUTH_STATE_DEBUG] Error handling profile creation:', err);
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);

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

        if (authError) throw authError;
        if (!authData.user?.id) throw new Error('User creation failed');

        // Create user profile using our simple function
        try {
          const { error: profileError } = await supabase.rpc('ensure_profile_exists');

          if (profileError) {
            console.warn('Profile creation failed:', profileError);
            // Don't throw here - user is created, profile can be created later
          }
        } catch (profileError) {
          console.warn('Profile creation failed:', profileError);
          // Don't throw here - user is created, profile can be created later
        }

        // CRITICAL: Ensure email is set in profile immediately after signup
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ email: email })
            .eq('id', authData.user.id);

          if (updateError) {
            console.warn('Failed to update profile email:', updateError);
          }
        } catch (emailUpdateError) {
          console.warn('Failed to ensure email in profile:', emailUpdateError);
        }

        // Track signup event in the background
        try {
          AppAnalytics.trackSignUp('email').catch((err) => {
            console.warn('Analytics tracking failed:', err);
          });
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }

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
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      // Check if email is confirmed
      if (data?.user && !data.user.email_confirmed_at) {
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

      // Clear content cache to ensure fresh data
      await clearContentCache();

      // Only track signin event if successful
      if (data?.user) {
        try {
          AppAnalytics.trackSignIn('email').catch((err) => {
            console.warn('Analytics tracking failed:', err);
          });
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }
      }
    } catch (error) {
      console.log('[AUTH_DEBUG] signIn failed, throwing error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      setLoading(true);

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
  const contextValue: AuthContextData = React.useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
