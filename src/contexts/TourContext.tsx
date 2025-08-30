import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface TourStep {
  id: string;
  title: string;
  content: string;
  targetScreen: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'center';
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps?: TourStep[]) => void;
  startDatabaseTour: () => Promise<void>;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  resetTour: () => Promise<void>;
  shouldShowTour: () => Promise<boolean>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = 'vromm_app_tour_completed';
const TOUR_CONTENT_HASH_KEY = 'vromm_tour_content_hash';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);

  const shouldShowTour = useCallback(async (): Promise<boolean> => {
    try {
      // Check if tour content has been updated
      const { data } = await supabase
        .from('content')
        .select('updated_at')
        .eq('content_type', 'tour')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      const latestUpdate = data?.[0]?.updated_at;
      const storedHash = await AsyncStorage.getItem(TOUR_CONTENT_HASH_KEY);
      const completed = await AsyncStorage.getItem(TOUR_STORAGE_KEY);

      console.log('🎯 [TourContext] Tour status check:', { 
        storageKey: TOUR_STORAGE_KEY, 
        storedValue: completed,
        latestUpdate,
        storedHash,
        contentUpdated: latestUpdate && storedHash && latestUpdate !== storedHash
      });

      // Show tour if never completed OR if content has been updated
      if (completed !== 'true') {
        return true; // Never completed
      }

      if (latestUpdate && storedHash && latestUpdate !== storedHash) {
        console.log('🎯 [TourContext] Tour content updated, showing tour again');
        return true; // Content updated
      }

      return false; // Already seen and no updates
    } catch (error) {
      console.error('Error checking tour status:', error);
      return true; // Show tour on error
    }
  }, []);

  const startTour = useCallback((tourSteps?: TourStep[]) => {
    if (tourSteps) {
      setSteps(tourSteps);
      setCurrentStep(0);
      setIsActive(true);
    } else {
      // Load from database if no steps provided
      startDatabaseTour();
    }
  }, []);

  const startDatabaseTour = useCallback(async () => {
    console.log('🎯 [TourContext] Starting database tour...');
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'tour')
        .eq('active', true)
        .order('order_index');

      console.log('🎯 [TourContext] Database query result:', { 
        error: error?.message, 
        dataLength: data?.length,
        data: data?.map(d => ({ id: d.id, title: d.title, target: d.target }))
      });

      if (error) {
        console.log('🎯 [TourContext] Database error, using fallback tour');
        throw error;
      }

      if (data && data.length > 0) {
        // Filter for mobile platforms in JavaScript
        const mobileContent = data.filter(item => {
          if (!item.platforms) return false;
          const platforms = typeof item.platforms === 'string' ? JSON.parse(item.platforms) : item.platforms;
          return Array.isArray(platforms) && (platforms.includes('mobile') || platforms.includes('both'));
        });

        console.log('🎯 [TourContext] Filtered mobile content:', mobileContent.length);

        if (mobileContent.length > 0) {
          const dbSteps: TourStep[] = mobileContent.map((item) => ({
            id: item.id,
            title: item.title?.en || 'Tour Step',
            content: item.body?.en || 'Tour content',
            targetScreen: item.target || 'HomeTab',
            targetElement: item.target || undefined,
            position: (item.category as any) || 'center',
          }));
          
          console.log('🎯 [TourContext] Setting database tour steps:', dbSteps.length);
          setSteps(dbSteps);
          setCurrentStep(0);
          setIsActive(true);
          console.log('🎯 [TourContext] Database tour activated!');
          return;
        }
      }
      
      console.log('🎯 [TourContext] No mobile tour content found, using fallback');
      throw new Error('No mobile tour content in database');
    } catch (error) {
      console.error('Error loading tour from database:', error);
      // Fallback to default tour
      console.log('🎯 [TourContext] Using fallback tour steps');
      const defaultSteps: TourStep[] = [
        {
          id: 'progress',
          title: 'Track Your Progress',
          content: 'Here you can see your learning progress and complete exercises. Tap the Progress tab to explore learning paths.',
          targetScreen: 'ProgressTab',
          position: 'top-right',
        },
        {
          id: 'create',
          title: 'Create Routes & Events',
          content: 'Add routes and events here using the central create button. Tap the plus button to get started!',
          targetScreen: 'HomeTab',
          position: 'bottom',
        },
        {
          id: 'menu',
          title: 'Menu & Settings',
          content: 'Access your profile, settings, and manage relationships through the menu tab.',
          targetScreen: 'MenuTab',
          position: 'bottom-right',
        },
      ];
      
      console.log('🎯 [TourContext] Setting fallback tour steps:', defaultSteps.length);
      setSteps(defaultSteps);
      setCurrentStep(0);
      setIsActive(true);
      console.log('🎯 [TourContext] Fallback tour activated!');
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < steps.length - 1) {
        return prev + 1;
      } else {
        // Tour completed
        endTour();
        return prev;
      }
    });
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const endTour = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    
    try {
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
      
      // Save current content hash to track updates
      const { data } = await supabase
        .from('content')
        .select('updated_at')
        .eq('content_type', 'tour')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (data?.[0]?.updated_at) {
        await AsyncStorage.setItem(TOUR_CONTENT_HASH_KEY, data[0].updated_at);
      }
    } catch (error) {
      console.error('Error saving tour completion:', error);
    }
  }, []);

  const resetTour = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOUR_STORAGE_KEY);
      setIsActive(false);
      setCurrentStep(0);
      setSteps([]);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, []);

  const value: TourContextType = {
    isActive,
    currentStep,
    steps,
    startTour,
    startDatabaseTour,
    nextStep,
    prevStep,
    endTour,
    resetTour,
    shouldShowTour,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
