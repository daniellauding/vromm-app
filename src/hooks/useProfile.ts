import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadProfile = async () => {
      try {
        const data = await db.profiles.get(user.id);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return;
    
    try {
      const updated = await db.profiles.update(user.id, updates);
      setProfile(updated);
      return updated;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update profile');
    }
  };

  return { profile, loading, error, updateProfile };
} 