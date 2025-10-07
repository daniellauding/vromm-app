import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from './TranslationContext';
import { supabase } from '../lib/supabase';

// FEATURE FLAGS: Selective tour enabling to prevent performance issues
const TOURS_GLOBALLY_ENABLED = false;
const HOMESCREEN_TOURS_ENABLED = true; // HomeScreen tours work fine

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetScreen: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'center' | 'left' | 'right';
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
  targetCoords?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (steps?: TourStep[]) => void;
  startDatabaseTour: (screenContext?: string, userRole?: string) => Promise<void>;
  startCustomTour: (customSteps: TourStep[], tourKey?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  resetTour: () => Promise<void>;
  shouldShowTour: () => Promise<boolean>;
  measureElement: (
    targetId: string,
  ) => Promise<{ x: number; y: number; width: number; height: number } | null>;
  updateStepCoords: (
    stepIndex: number,
    coords: { x: number; y: number; width: number; height: number },
  ) => void;
  registerElement: (targetId: string, ref: any) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = 'vromm_app_tour_completed';
const TOUR_CONTENT_HASH_KEY = 'vromm_tour_content_hash';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);

  // Store ref registry for tour target elements
  const elementRefs = useRef<Map<string, any>>(new Map());

  // Function to register element for tour targeting
  const registerElement = useCallback((targetId: string, ref: any) => {
    elementRefs.current.set(targetId, ref);
  }, []);

  // Function to measure element position and size for React Native
  const measureElement = useCallback(
    async (
      targetId: string,
    ): Promise<{ x: number; y: number; width: number; height: number } | null> => {
      return new Promise((resolve) => {
        const ref = elementRefs.current.get(targetId);

        if (!ref || !ref.current) {
          resolve(null);
          return;
        }

        try {
          // Use React Native's measurement API
          ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
            const coords = { x, y, width, height };
            resolve(coords);
          });
        } catch (error) {
          console.error(`🎯 [TourContext] Error measuring element ${targetId}:`, error);
          resolve(null);
        }
      });
    },
    [],
  );

  // Function to update step coordinates
  const updateStepCoords = useCallback(
    (stepIndex: number, coords: { x: number; y: number; width: number; height: number }) => {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        if (newSteps[stepIndex]) {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            targetCoords: coords,
          };
        }
        return newSteps;
      });
    },
    [],
  );

  const shouldShowTour = useCallback(async (): Promise<boolean> => {
    try {
      if (!user?.id) {
        // No user ID - showing tour without logging
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

      // Tour status check completed without logging

      // Show tour if user never completed it
      if (!profile?.tour_completed) {
        // User has not completed tour - showing without logging
        return true;
      }

      // Show tour if content has been updated since user last saw it
      if (
        latestUpdate &&
        profile?.tour_content_hash &&
        latestUpdate !== profile?.tour_content_hash
      ) {
        // Tour content updated for user - showing without logging
        return true;
      }

      // User has completed current tour - not showing without logging
      return false;
    } catch (error) {
      console.error('Error checking tour status:', error);
      return true; // Show tour on error
    }
  }, [user?.id]);

  const startDatabaseTour = useCallback(
    async (screenContext?: string, userRole?: string) => {
      // Only allow HomeScreen tours, disable others
      if (!TOURS_GLOBALLY_ENABLED && screenContext !== 'HomeScreen') {
        return;
      }

      // Allow HomeScreen tours specifically
      if (!TOURS_GLOBALLY_ENABLED && !HOMESCREEN_TOURS_ENABLED) {
        return;
      }

      try {
        // Get user profile for role filtering
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        const currentUserRole = userRole || profile?.role || 'student';

        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('content_type', 'tour')
          .eq('active', true)
          .order('order_index');

        // Database query completed without logging

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          // Filter for mobile platforms and appropriate tours based on context
          const filteredContent = data.filter((item) => {
            if (!item.platforms) return false;
            const platforms =
              typeof item.platforms === 'string' ? JSON.parse(item.platforms) : item.platforms;
            const isMobile =
              Array.isArray(platforms) &&
              (platforms.includes('mobile') || platforms.includes('both'));

            if (!isMobile) return false;

            // Filter out inappropriate tours based on user role
            const isInstructorTour =
              item.key.includes('instructor') || item.key.includes('conditional');
            const isScreenTour = item.key.includes('screen.') || item.key.includes('tab.');

            // Students should not see instructor tours
            if (currentUserRole === 'student' && isInstructorTour) {
              return false;
            }

            // For HomeScreen context, only show main mobile tours (not screen/conditional tours)
            if (screenContext === 'HomeScreen') {
              if (isScreenTour || isInstructorTour) {
                return false;
              }
              // Only show basic mobile tours on HomeScreen
              return (
                item.key.startsWith('tour.mobile.') &&
                !item.key.includes('screen') &&
                !item.key.includes('conditional')
              );
            }

            // For other screen contexts, allow screen-specific tours
            return true;
          });

          // Content filtered without logging

          if (filteredContent.length > 0) {
            const dbSteps: TourStep[] = filteredContent.map((item) => ({
              id: item.id,
              title: (item.title as any)?.[language] || (item.title as any)?.en || 'Tour Step',
              content: (item.body as any)?.[language] || (item.body as any)?.en || 'Tour content',
              targetScreen: item.target || 'HomeTab',
              targetElement: item.target || undefined,
              position: (item.category as any) || 'center',
            }));

            setSteps(dbSteps);
            setCurrentStep(0);
            setIsActive(true);
            return;
          }
        }

        throw new Error('No mobile tour content in database');
      } catch (error) {
        console.error('Error loading tour from database:', error);
        // Fallback to default tour
        // Using fallback tour steps without logging
        const defaultSteps: TourStep[] = [
          {
            id: 'progress',
            title: t('tour.fallback.progress.title') || 'Track Your Progress',
            content:
              t('tour.fallback.progress.content') ||
              'Here you can see your learning progress and complete exercises. Tap the Progress tab to explore learning paths.',
            targetScreen: 'ProgressTab',
            position: 'top-right',
          },
          {
            id: 'create',
            title: t('tour.fallback.create.title') || 'Create Routes & Events',
            content:
              t('tour.fallback.create.content') ||
              'Add routes and events here using the central create button. Tap the plus button to get started!',
            targetScreen: 'HomeTab',
            position: 'bottom',
          },
          {
            id: 'menu',
            title: t('tour.fallback.menu.title') || 'Menu & Settings',
            content:
              t('tour.fallback.menu.content') ||
              'Access your profile, settings, and manage relationships through the menu tab.',
            targetScreen: 'MenuTab',
            position: 'bottom-right',
          },
        ];

        setSteps(defaultSteps);
        setCurrentStep(0);
        setIsActive(true);
      }
    },
    [language, t, user?.id],
  );

  const startTour = useCallback(
    (tourSteps?: TourStep[]) => {
      if (tourSteps) {
        setSteps(tourSteps);
        setCurrentStep(0);
        setIsActive(true);
      } else {
        // Load from database if no steps provided
        startDatabaseTour();
      }
    },
    [startDatabaseTour],
  );

  const startCustomTour = useCallback((customSteps: TourStep[]) => {
    // DISABLED: Custom tours cause console flooding (keep disabled even for HomeScreen)
    if (!TOURS_GLOBALLY_ENABLED) {
      return;
    }

    setSteps(customSteps);
    setCurrentStep(0);
    setIsActive(true);
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
          // Tour completion saved to user profile without logging
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
  }, [steps.length, endTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

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
          // Tour reset in user profile without logging
        }
      }

      setIsActive(false);
      setCurrentStep(0);
      setSteps([]);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, [user?.id]);

  const value: TourContextType = React.useMemo(
    () => ({
      isActive,
      currentStep,
      steps,
      startTour,
      startDatabaseTour,
      startCustomTour,
      nextStep,
      prevStep,
      endTour,
      resetTour,
      shouldShowTour,
      measureElement,
      updateStepCoords,
      registerElement,
    }),
    [
      isActive,
      currentStep,
      steps,
      startTour,
      startDatabaseTour,
      startCustomTour,
      nextStep,
      prevStep,
      endTour,
      resetTour,
      shouldShowTour,
      measureElement,
      updateStepCoords,
      registerElement,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
