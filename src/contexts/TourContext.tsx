import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);

  const shouldShowTour = useCallback(async (): Promise<boolean> => {
    try {
      if (!user?.id) {
        console.log('🎯 [TourContext] No user ID - showing tour');
        return true;
      }

      // Check user's profile for tour completion (USER-BASED)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('tour_completed, tour_content_hash')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('🎯 [TourContext] Error checking user profile:', error);
        return true; // Show tour on error
      }

      // Check if tour content has been updated
      const { data } = await supabase
        .from('content')
        .select('updated_at')
        .eq('content_type', 'tour')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      const latestUpdate = data?.[0]?.updated_at;

      console.log('🎯 [TourContext] User-based tour status check:', { 
        userId: user.id,
        userTourCompleted: profile?.tour_completed,
        userContentHash: profile?.tour_content_hash,
        latestUpdate,
        contentUpdated: latestUpdate && profile?.tour_content_hash && latestUpdate !== profile?.tour_content_hash
      });

      // Show tour if user never completed it
      if (!profile?.tour_completed) {
        console.log('🎯 [TourContext] User has not completed tour - showing');
        return true;
      }

      // Show tour if content has been updated since user last saw it
      if (latestUpdate && profile?.tour_content_hash && latestUpdate !== profile?.tour_content_hash) {
        console.log('🎯 [TourContext] Tour content updated for user - showing');
        return true;
      }

      console.log('🎯 [TourContext] User has completed current tour - not showing');
      return false;
    } catch (error) {
      console.error('Error checking tour status:', error);
      return true; // Show tour on error
    }
  }, [user?.id]);

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
      // Save to AsyncStorage for backup
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
      
      // Get current content hash
      const { data } = await supabase
        .from('content')
        .select('updated_at')
        .eq('content_type', 'tour')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      const latestUpdate = data?.[0]?.updated_at;

      // Save to user's profile (USER-BASED)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            tour_completed: true,
            tour_content_hash: latestUpdate,
          })
          .eq('id', user.id);

        if (error) {
          console.error('🎯 [TourContext] Error saving tour completion to profile:', error);
        } else {
          console.log('🎯 [TourContext] Tour completion saved to user profile:', user.id);
        }
      }

      // Also save to AsyncStorage for backup
      if (latestUpdate) {
        await AsyncStorage.setItem(TOUR_CONTENT_HASH_KEY, latestUpdate);
      }
    } catch (error) {
      console.error('Error saving tour completion:', error);
    }
  }, [user?.id]);

  const resetTour = useCallback(async () => {
    try {
      // Reset AsyncStorage
      await AsyncStorage.removeItem(TOUR_STORAGE_KEY);
      await AsyncStorage.removeItem(TOUR_CONTENT_HASH_KEY);
      
      // Reset user's profile (USER-BASED)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({
            tour_completed: false,
            tour_content_hash: null,
          })
          .eq('id', user.id);

        if (error) {
          console.error('🎯 [TourContext] Error resetting tour in profile:', error);
        } else {
          console.log('🎯 [TourContext] Tour reset in user profile:', user.id);
        }
      }
      
      setIsActive(false);
      setCurrentStep(0);
      setSteps([]);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, [user?.id]);

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
