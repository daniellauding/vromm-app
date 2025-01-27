import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, db } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';
import { Platform } from 'react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];
type ExperienceLevel = Database['public']['Enums']['experience_level'];

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load profile data
  useEffect(() => {
    if (user?.id) {
      db.profiles.get(user.id)
        .then(data => setProfile(data))
        .catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('AuthProvider mounted');
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', { event: _event, session });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('Starting signup process for:', email);
    
    try {
      // Include profile data in the signup metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
            role: 'student',
            location: 'Unknown',
            experience_level: 'beginner',
            private_profile: false,
          }
        }
      });

      console.log('Auth signup response:', { authData, authError });

      if (authError) throw authError;
      if (!authData.user?.id) throw new Error('User creation failed');

      // No need to create profile separately as it will be handled by Supabase's triggers
      console.log('Signup successful for user:', authData.user.id);
    } catch (error) {
      console.error('Signup process failed:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Explicitly clear all state
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) throw new Error('No user logged in');
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (error) throw error;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'korvagen://reset-password',
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        profile,
        loading, 
        initialized, 
        signIn, 
        signUp, 
        signOut,
        updateProfile,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 