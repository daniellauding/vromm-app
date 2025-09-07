import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface UnlockContextType {
  unlockedPaths: string[];
  unlockedExercises: string[];
  userPayments: any[];
  addUnlockedPath: (pathId: string) => void;
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

  const addUnlockedPath = useCallback((pathId: string) => {
    setUnlockedPaths(prev => {
      if (!prev.includes(pathId)) {
        const updated = [...prev, pathId];
        // Store in AsyncStorage for persistence
        AsyncStorage.setItem('vromm_unlocked_paths', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  const addUnlockedExercise = useCallback((exerciseId: string) => {
    setUnlockedExercises(prev => {
      if (!prev.includes(exerciseId)) {
        const updated = [...prev, exerciseId];
        // Store in AsyncStorage for persistence
        AsyncStorage.setItem('vromm_unlocked_exercises', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
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
        console.log('🔓 [UnlockContext] Loaded user payments:', payments.length);
      }
    } catch (error) {
      console.error('Error loading user payments:', error);
    }
  }, []);

  const loadUnlockedContent = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      // Load from database
      const { data, error } = await supabase
        .from('user_unlocked_content')
        .select('content_id, content_type')
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
        
        // Also store in AsyncStorage
        AsyncStorage.setItem('vromm_unlocked_paths', JSON.stringify(paths));
        AsyncStorage.setItem('vromm_unlocked_exercises', JSON.stringify(exercises));
        
        console.log('🔓 [UnlockContext] Loaded unlocked content:', {
          paths: paths.length,
          exercises: exercises.length
        });
      }

      // Load from AsyncStorage as fallback
      const [savedPaths, savedExercises] = await Promise.all([
        AsyncStorage.getItem('vromm_unlocked_paths'),
        AsyncStorage.getItem('vromm_unlocked_exercises'),
      ]);

      if (savedPaths) {
        const paths = JSON.parse(savedPaths);
        setUnlockedPaths(prev => [...new Set([...prev, ...paths])]);
      }

      if (savedExercises) {
        const exercises = JSON.parse(savedExercises);
        setUnlockedExercises(prev => [...new Set([...prev, ...exercises])]);
      }
    } catch (error) {
      console.error('Error loading unlocked content:', error);
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
      payment => payment.learning_path_id === pathId && payment.status === 'completed'
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
