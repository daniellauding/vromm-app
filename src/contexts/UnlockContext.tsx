import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface UnlockContextType {
  unlockedPaths: string[];
  unlockedExercises: string[];
  userPayments: any[];
  addUnlockedPath: (pathId: string) => Promise<void>;
  addUnlockedExercise: (exerciseId: string) => void;
  loadUserPayments: (userId: string) => Promise<void>;
  loadUnlockedContent: (userId: string) => Promise<void>;
  isPathUnlocked: (pathId: string) => boolean;
  isExerciseUnlocked: (exerciseId: string) => boolean;
  hasPathPayment: (pathId: string) => boolean;
  hasExercisePayment: (exerciseId: string) => boolean;
}

const UnlockContext = createContext<UnlockContextType | undefined>(undefined);

export function UnlockProvider({ children }: { children: React.ReactNode }) {
  const [unlockedPaths, setUnlockedPaths] = useState<string[]>([]);
  const [unlockedExercises, setUnlockedExercises] = useState<string[]>([]);
  const [userPayments, setUserPayments] = useState<any[]>([]);

  const addUnlockedPath = useCallback(async (pathId: string) => {
    setUnlockedPaths(prev => {
      if (!prev.includes(pathId)) {
        const updated = [...prev, pathId];
        // Store in AsyncStorage for persistence
        AsyncStorage.setItem('vromm_unlocked_paths', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    // Also save to database for persistence
    try {
      const { error } = await supabase
        .from('user_unlocked_content')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content_id: pathId,
          content_type: 'learning_path',
          unlocked_at: new Date().toISOString(),
          unlock_method: 'password'
        });

      if (error) {
        console.error('Error saving password unlock to database:', error);
      } else {
        console.log('✅ [UnlockContext] Password unlock saved to database:', pathId);
      }
    } catch (error) {
      console.error('Error saving password unlock:', error);
    }
  }, []);

  const addUnlockedExercise = useCallback(async (exerciseId: string) => {
    setUnlockedExercises(prev => {
      if (!prev.includes(exerciseId)) {
        const updated = [...prev, exerciseId];
        // Store in AsyncStorage for persistence
        AsyncStorage.setItem('vromm_unlocked_exercises', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    // Also save to database for persistence
    try {
      const { error } = await supabase
        .from('user_unlocked_content')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content_id: exerciseId,
          content_type: 'exercise',
          unlocked_at: new Date().toISOString(),
          unlock_method: 'password'
        });

      if (error) {
        console.error('Error saving exercise password unlock to database:', error);
      } else {
        console.log('✅ [UnlockContext] Exercise password unlock saved to database:', exerciseId);
      }
    } catch (error) {
      console.error('Error saving exercise password unlock:', error);
    }
  }, []);

  const loadUserPayments = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      const { data: payments, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (!error && payments) {
        setUserPayments(payments);
        console.log('🔓 [UnlockContext] Loaded user payments:', payments.length, payments.map(p => ({
          id: p.id,
          learning_path_id: p.learning_path_id,
          metadata: p.metadata,
          status: p.status,
          amount: p.amount
        })));
      }
    } catch (error) {
      console.error('Error loading user payments:', error);
    }
  }, []);

  const loadUnlockedContent = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      // Load from database first (most authoritative)
      const { data, error } = await supabase
        .from('user_unlocked_content')
        .select('content_id, content_type, unlock_method')
        .eq('user_id', userId);

      if (!error && data) {
        const paths = data
          .filter(item => item.content_type === 'learning_path')
          .map(item => item.content_id);
        const exercises = data
          .filter(item => item.content_type === 'exercise')
          .map(item => item.content_id);

        setUnlockedPaths(paths);
        setUnlockedExercises(exercises);
        
        // Also store in AsyncStorage for offline access
        AsyncStorage.setItem('vromm_unlocked_paths', JSON.stringify(paths));
        AsyncStorage.setItem('vromm_unlocked_exercises', JSON.stringify(exercises));
        
        console.log('🔓 [UnlockContext] Loaded unlocked content from database:', {
          paths: paths.length,
          exercises: exercises.length,
          data: data.map(item => ({
            content_id: item.content_id,
            content_type: item.content_type,
            unlock_method: item.unlock_method
          }))
        });
      } else {
        console.log('🔓 [UnlockContext] No database data, loading from AsyncStorage fallback');
        
        // Load from AsyncStorage as fallback if database fails
        const [savedPaths, savedExercises] = await Promise.all([
          AsyncStorage.getItem('vromm_unlocked_paths'),
          AsyncStorage.getItem('vromm_unlocked_exercises'),
        ]);

        if (savedPaths) {
          const paths = JSON.parse(savedPaths);
          setUnlockedPaths(paths);
          console.log('🔓 [UnlockContext] Loaded paths from AsyncStorage:', paths);
        }

        if (savedExercises) {
          const exercises = JSON.parse(savedExercises);
          setUnlockedExercises(exercises);
          console.log('🔓 [UnlockContext] Loaded exercises from AsyncStorage:', exercises);
        }
      }
    } catch (error) {
      console.error('Error loading unlocked content:', error);
      
      // Fallback to AsyncStorage on error
      try {
        const [savedPaths, savedExercises] = await Promise.all([
          AsyncStorage.getItem('vromm_unlocked_paths'),
          AsyncStorage.getItem('vromm_unlocked_exercises'),
        ]);

        if (savedPaths) {
          const paths = JSON.parse(savedPaths);
          setUnlockedPaths(paths);
        }

        if (savedExercises) {
          const exercises = JSON.parse(savedExercises);
          setUnlockedExercises(exercises);
        }
      } catch (fallbackError) {
        console.error('Error loading from AsyncStorage fallback:', fallbackError);
      }
    }
  }, []);

  const isPathUnlocked = useCallback((pathId: string) => {
    return unlockedPaths.includes(pathId);
  }, [unlockedPaths]);

  const isExerciseUnlocked = useCallback((exerciseId: string) => {
    return unlockedExercises.includes(exerciseId);
  }, [unlockedExercises]);

  const hasPathPayment = useCallback((pathId: string) => {
    return userPayments.some(
      payment => {
        // Check both direct field and metadata field
        const hasDirectField = payment.learning_path_id === pathId;
        const hasMetadataField = payment.metadata?.path_id === pathId;
        const hasFeatureKey = payment.metadata?.feature_key === `learning_path_${pathId}`;
        
        return (hasDirectField || hasMetadataField || hasFeatureKey) && payment.status === 'completed';
      }
    );
  }, [userPayments]);

  const hasExercisePayment = useCallback((exerciseId: string) => {
    return userPayments.some(
      payment => payment.exercise_id === exerciseId && payment.status === 'completed'
    );
  }, [userPayments]);

  const value: UnlockContextType = {
    unlockedPaths,
    unlockedExercises,
    userPayments,
    addUnlockedPath,
    addUnlockedExercise,
    loadUserPayments,
    loadUnlockedContent,
    isPathUnlocked,
    isExerciseUnlocked,
    hasPathPayment,
    hasExercisePayment,
  };

  return <UnlockContext.Provider value={value}>{children}</UnlockContext.Provider>;
}

export function useUnlock() {
  const context = useContext(UnlockContext);
  if (context === undefined) {
    throw new Error('useUnlock must be used within an UnlockProvider');
  }
  return context;
}
