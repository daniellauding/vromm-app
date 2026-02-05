import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from './TranslationContext';
import { supabase } from '../lib/supabase';

// FEATURE FLAGS: Control tour behavior
const TOURS_GLOBALLY_ENABLED = true; // Enable tours globally
const SCREEN_SPECIFIC_TOURS_ENABLED = true; // Enable per-screen tours

// Navigation action types for tour steps
export type TourActionType = 'navigate' | 'openSheet' | 'openModal' | 'scrollTo' | 'press' | 'waitFor';

export interface TourAction {
  type: TourActionType;
  target?: string; // screen name, sheet id, element id, or tab name
  params?: Record<string, any>; // navigation params or action config
  delay?: number; // ms delay before/after action
}

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

  // NEW: Action to execute when pressing "Next"
  action?: TourAction;

  // NEW: Pre-step action (execute before showing this step)
  preAction?: TourAction;

  // NEW: Auto-scroll to element before highlighting
  scrollToElement?: boolean;
  scrollOffset?: number; // offset from top when scrolling

  // NEW: Wait for element to be visible
  waitForElement?: boolean;
  waitTimeout?: number; // ms to wait for element
}

// Navigation handler type - will be set by the app's navigation
export type NavigationHandler = (action: TourAction) => Promise<boolean>;

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  currentTourId: string | null;

  // Core tour functions
  startTour: (steps?: TourStep[], tourId?: string) => void;
  startDatabaseTour: (screenContext?: string, userRole?: string) => Promise<void>;
  startScreenTour: (screenId: string, userRole?: string) => Promise<boolean>;
  startCustomTour: (customSteps: TourStep[], tourKey?: string) => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  endTour: () => void;
  dismissTour: () => void; // Close temporarily - can see again
  skipTour: () => Promise<void>; // Close permanently - never see again
  resetTour: () => Promise<void>;
  resetScreenTour: (screenId: string) => Promise<void>;

  // Tour status functions
  shouldShowTour: () => Promise<boolean>;
  hasSeenScreenTour: (screenId: string) => Promise<boolean>;

  // Element targeting functions
  measureElement: (
    targetId: string,
  ) => Promise<{ x: number; y: number; width: number; height: number } | null>;
  updateStepCoords: (
    stepIndex: number,
    coords: { x: number; y: number; width: number; height: number },
  ) => void;
  registerElement: (targetId: string, ref: any) => void;

  // NEW: Navigation handler registration
  setNavigationHandler: (handler: NavigationHandler) => void;

  // NEW: Scroll handler registration
  setScrollHandler: (screenId: string, handler: (elementId: string, offset?: number) => Promise<boolean>) => void;

  // NEW: Press handler registration - for simulating button presses during tours
  registerPressHandler: (targetId: string, handler: () => Promise<void> | void) => void;
  unregisterPressHandler: (targetId: string) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = 'vromm_app_tour_completed';
const TOUR_CONTENT_HASH_KEY = 'vromm_tour_content_hash';
const SCREEN_TOURS_SEEN_KEY = 'vromm_screen_tours_seen';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language, t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentTourId, setCurrentTourId] = useState<string | null>(null);

  // Store ref registry for tour target elements
  const elementRefs = useRef<Map<string, any>>(new Map());

  // Navigation handler for cross-screen navigation
  const navigationHandlerRef = useRef<NavigationHandler | null>(null);

  // Scroll handlers per screen
  const scrollHandlersRef = useRef<Map<string, (elementId: string, offset?: number) => Promise<boolean>>>(new Map());

  // Press handlers for simulating button presses during tours
  const pressHandlersRef = useRef<Map<string, () => Promise<void> | void>>(new Map());

  // Set navigation handler (called by TabNavigator or App.tsx)
  const setNavigationHandler = useCallback((handler: NavigationHandler) => {
    navigationHandlerRef.current = handler;
  }, []);

  // Set scroll handler for a specific screen
  const setScrollHandler = useCallback((screenId: string, handler: (elementId: string, offset?: number) => Promise<boolean>) => {
    scrollHandlersRef.current.set(screenId, handler);
  }, []);

  // Register a press handler for a specific tour target
  const registerPressHandler = useCallback((targetId: string, handler: () => Promise<void> | void) => {
    pressHandlersRef.current.set(targetId, handler);
    console.log(`🎯 [TourContext] Registered press handler for: ${targetId}`);
  }, []);

  // Unregister a press handler
  const unregisterPressHandler = useCallback((targetId: string) => {
    pressHandlersRef.current.delete(targetId);
  }, []);

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

  // Execute a tour action (navigation, sheet opening, press, etc.)
  const executeAction = useCallback(async (action: TourAction): Promise<boolean> => {
    try {
      // Add delay if specified
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      // Handle press actions locally using registered press handlers
      if (action.type === 'press' && action.target) {
        const pressHandler = pressHandlersRef.current.get(action.target);
        if (pressHandler) {
          console.log(`🎯 [TourContext] Executing press handler for: ${action.target}`);
          await pressHandler();
          return true;
        } else {
          console.warn(`🎯 [TourContext] No press handler registered for: ${action.target}`);
          return false;
        }
      }

      // Handle other actions via navigation handler
      if (!navigationHandlerRef.current) {
        console.warn('🎯 [TourContext] No navigation handler registered');
        return false;
      }

      const success = await navigationHandlerRef.current(action);
      console.log(`🎯 [TourContext] Action ${action.type} to ${action.target}: ${success ? 'success' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('🎯 [TourContext] Error executing action:', error);
      return false;
    }
  }, []);

  // Scroll to element if needed
  const scrollToElementIfNeeded = useCallback(async (step: TourStep): Promise<boolean> => {
    if (!step.scrollToElement || !step.targetElement) {
      return true;
    }

    const scrollHandler = scrollHandlersRef.current.get(step.targetScreen);
    if (!scrollHandler) {
      console.warn(`🎯 [TourContext] No scroll handler for screen ${step.targetScreen}`);
      return true; // Continue anyway
    }

    try {
      return await scrollHandler(step.targetElement, step.scrollOffset);
    } catch (error) {
      console.error('🎯 [TourContext] Error scrolling to element:', error);
      return true; // Continue anyway
    }
  }, []);

  // Check if user has seen a specific screen's tour
  const hasSeenScreenTour = useCallback(async (screenId: string): Promise<boolean> => {
    if (!SCREEN_SPECIFIC_TOURS_ENABLED) return true;

    try {
      // First check user_tour_completions table
      if (user?.id) {
        const { data, error } = await supabase
          .from('user_tour_completions')
          .select('completed_tours')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.completed_tours) {
          const completedTours = data.completed_tours as string[];
          if (completedTours.includes(screenId) || completedTours.includes(`screen.${screenId}`)) {
            return true;
          }
        }
      }

      // Fallback to AsyncStorage
      const seenTours = await AsyncStorage.getItem(SCREEN_TOURS_SEEN_KEY);
      if (seenTours) {
        const parsed = JSON.parse(seenTours);
        return parsed[screenId] === true;
      }
      return false;
    } catch (error) {
      console.error('🎯 [TourContext] Error checking screen tour status:', error);
      return false;
    }
  }, [user?.id]);

  // Mark a screen tour as seen
  const markScreenTourSeen = useCallback(async (screenId: string) => {
    try {
      // Save to database
      if (user?.id) {
        // Get existing completions
        const { data: existing } = await supabase
          .from('user_tour_completions')
          .select('completed_tours')
          .eq('user_id', user.id)
          .single();

        const completedTours = (existing?.completed_tours as string[]) || [];
        const tourKey = `screen.${screenId}`;

        if (!completedTours.includes(tourKey)) {
          completedTours.push(tourKey);

          await supabase
            .from('user_tour_completions')
            .upsert({
              user_id: user.id,
              completed_tours: completedTours,
              last_tour_completed: tourKey,
              completed_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            });
        }
      }

      // Also save to AsyncStorage for backup
      const seenTours = await AsyncStorage.getItem(SCREEN_TOURS_SEEN_KEY);
      const parsed = seenTours ? JSON.parse(seenTours) : {};
      parsed[screenId] = true;
      await AsyncStorage.setItem(SCREEN_TOURS_SEEN_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('🎯 [TourContext] Error marking screen tour as seen:', error);
    }
  }, [user?.id]);

  // Reset a specific screen tour
  const resetScreenTour = useCallback(async (screenId: string) => {
    try {
      // Remove from database
      if (user?.id) {
        const { data: existing } = await supabase
          .from('user_tour_completions')
          .select('completed_tours')
          .eq('user_id', user.id)
          .single();

        if (existing?.completed_tours) {
          const completedTours = (existing.completed_tours as string[]).filter(
            t => t !== screenId && t !== `screen.${screenId}`
          );

          await supabase
            .from('user_tour_completions')
            .update({ completed_tours: completedTours })
            .eq('user_id', user.id);
        }
      }

      // Remove from AsyncStorage
      const seenTours = await AsyncStorage.getItem(SCREEN_TOURS_SEEN_KEY);
      if (seenTours) {
        const parsed = JSON.parse(seenTours);
        delete parsed[screenId];
        await AsyncStorage.setItem(SCREEN_TOURS_SEEN_KEY, JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('🎯 [TourContext] Error resetting screen tour:', error);
    }
  }, [user?.id]);

  const shouldShowTour = useCallback(async (): Promise<boolean> => {
    try {
      if (!user?.id) {
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
        return true;
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

      if (!profile?.tour_completed) {
        return true;
      }

      if (
        latestUpdate &&
        profile?.tour_content_hash &&
        latestUpdate !== profile?.tour_content_hash
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking tour status:', error);
      return true;
    }
  }, [user?.id]);

  // Start a screen-specific tour
  const startScreenTour = useCallback(
    async (screenId: string, userRole?: string): Promise<boolean> => {
      if (!SCREEN_SPECIFIC_TOURS_ENABLED || !TOURS_GLOBALLY_ENABLED) {
        return false;
      }

      // Check if user has already seen this screen's tour
      const hasSeen = await hasSeenScreenTour(screenId);
      if (hasSeen) {
        console.log(`🎯 [TourContext] User has already seen tour for ${screenId}`);
        return false;
      }

      try {
        // Get user profile for role filtering
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        const currentUserRole = userRole || profile?.role || 'student';

        // Fetch screen-specific tour content from database
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('content_type', 'tour')
          .eq('active', true)
          .or(`key.ilike.tour.screen.${screenId}%,key.ilike.tour.${screenId.toLowerCase()}%`)
          .order('order_index');

        if (error || !data || data.length === 0) {
          console.log(`🎯 [TourContext] No tour content found for screen ${screenId}`);
          return false;
        }

        // Filter for mobile and role
        const filteredContent = data.filter((item) => {
          if (!item.platforms) return true;
          const platforms =
            typeof item.platforms === 'string' ? JSON.parse(item.platforms) : item.platforms;
          const isMobile =
            !platforms || Array.isArray(platforms) &&
            (platforms.includes('mobile') || platforms.includes('both'));

          if (!isMobile) return false;

          // Filter by role if specified in item
          const itemRole = item.metadata?.role;
          if (itemRole && itemRole !== currentUserRole) {
            return false;
          }

          return true;
        });

        if (filteredContent.length === 0) {
          console.log(`🎯 [TourContext] No matching tour content for ${screenId} after filtering`);
          return false;
        }

        // Convert to TourStep format with action support
        const tourSteps: TourStep[] = filteredContent.map((item) => {
          const metadata = item.metadata || {};
          return {
            id: item.id,
            title: (item.title as any)?.[language] || (item.title as any)?.en || 'Tour Step',
            content: (item.body as any)?.[language] || (item.body as any)?.en || 'Tour content',
            targetScreen: item.target || screenId,
            targetElement: metadata.targetElement || item.target || undefined,
            position: (item.category as any) || metadata.position || 'center',
            action: metadata.action || undefined,
            preAction: metadata.preAction || undefined,
            scrollToElement: metadata.scrollToElement || false,
            scrollOffset: metadata.scrollOffset || 0,
            waitForElement: metadata.waitForElement || false,
            waitTimeout: metadata.waitTimeout || 3000,
          };
        });

        setSteps(tourSteps);
        setCurrentStep(0);
        setCurrentTourId(`screen.${screenId}`);
        setIsActive(true);

        console.log(`🎯 [TourContext] Started tour for screen ${screenId} with ${tourSteps.length} steps`);
        return true;
      } catch (error) {
        console.error(`🎯 [TourContext] Error starting screen tour for ${screenId}:`, error);
        return false;
      }
    },
    [language, user?.id, hasSeenScreenTour],
  );

  const startDatabaseTour = useCallback(
    async (screenContext?: string, userRole?: string) => {
      if (!TOURS_GLOBALLY_ENABLED) {
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

            if (currentUserRole === 'student' && isInstructorTour) {
              return false;
            }

            // For specific screen context, filter accordingly
            if (screenContext) {
              if (screenContext === 'HomeScreen') {
                if (isScreenTour || isInstructorTour) {
                  return false;
                }
                return (
                  item.key.startsWith('tour.mobile.') &&
                  !item.key.includes('screen') &&
                  !item.key.includes('conditional')
                );
              }
              // For other screens, show screen-specific tours
              return item.key.includes(screenContext.toLowerCase());
            }

            return true;
          });

          if (filteredContent.length > 0) {
            const dbSteps: TourStep[] = filteredContent.map((item) => {
              const metadata = item.metadata || {};
              return {
                id: item.id,
                title: (item.title as any)?.[language] || (item.title as any)?.en || 'Tour Step',
                content: (item.body as any)?.[language] || (item.body as any)?.en || 'Tour content',
                targetScreen: item.target || 'HomeTab',
                targetElement: metadata.targetElement || item.target || undefined,
                position: (item.category as any) || 'center',
                action: metadata.action || undefined,
                preAction: metadata.preAction || undefined,
                scrollToElement: metadata.scrollToElement || false,
                scrollOffset: metadata.scrollOffset || 0,
              };
            });

            setSteps(dbSteps);
            setCurrentStep(0);
            setCurrentTourId(screenContext ? `context.${screenContext}` : 'main');
            setIsActive(true);
            return;
          }
        }

        throw new Error('No mobile tour content in database');
      } catch (error) {
        console.error('Error loading tour from database:', error);
        // Fallback to default tour
        const defaultSteps: TourStep[] = [
          {
            id: 'progress',
            title: t('tour.fallback.progress.title') || 'Track Your Progress',
            content:
              t('tour.fallback.progress.content') ||
              'Here you can see your learning progress and complete exercises. Tap the Progress tab to explore learning paths.',
            targetScreen: 'ProgressTab',
            position: 'top',
            action: {
              type: 'navigate',
              target: 'ProgressTab',
            },
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
            position: 'bottom',
            action: {
              type: 'navigate',
              target: 'MenuTab',
            },
          },
        ];

        setSteps(defaultSteps);
        setCurrentStep(0);
        setCurrentTourId('fallback');
        setIsActive(true);
      }
    },
    [language, t, user?.id],
  );

  const startTour = useCallback(
    (tourSteps?: TourStep[], tourId?: string) => {
      if (tourSteps) {
        setSteps(tourSteps);
        setCurrentStep(0);
        setCurrentTourId(tourId || 'custom');
        setIsActive(true);
      } else {
        startDatabaseTour();
      }
    },
    [startDatabaseTour],
  );

  const startCustomTour = useCallback((customSteps: TourStep[], tourKey?: string) => {
    if (!TOURS_GLOBALLY_ENABLED) {
      return;
    }

    setSteps(customSteps);
    setCurrentStep(0);
    setCurrentTourId(tourKey || 'custom');
    setIsActive(true);
  }, []);

  // Dismiss tour temporarily - user can see it again later
  const dismissTour = useCallback(() => {
    console.log('🎯 [TourContext] Tour dismissed temporarily (will show again)');
    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    setCurrentTourId(null);
    // Note: NOT marking as seen, so it will show again on next visit
  }, []);

  // Skip tour permanently - marks as seen, won't show again
  const skipTour = useCallback(async () => {
    const tourIdToMark = currentTourId;
    console.log('🎯 [TourContext] Tour skipped permanently:', tourIdToMark);

    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    setCurrentTourId(null);

    try {
      // Mark screen tour as seen if it was a screen-specific tour
      if (tourIdToMark?.startsWith('screen.')) {
        const screenId = tourIdToMark.replace('screen.', '');
        await markScreenTourSeen(screenId);
      }
    } catch (error) {
      console.error('🎯 [TourContext] Error skipping tour:', error);
    }
  }, [currentTourId, markScreenTourSeen]);

  // End tour (completed all steps) - marks as seen
  const endTour = useCallback(async () => {
    const tourIdToMark = currentTourId;

    setIsActive(false);
    setCurrentStep(0);
    setSteps([]);
    setCurrentTourId(null);

    try {
      // Mark screen tour as seen if it was a screen-specific tour
      if (tourIdToMark?.startsWith('screen.')) {
        const screenId = tourIdToMark.replace('screen.', '');
        await markScreenTourSeen(screenId);
      }

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
        }
      }

      if (latestUpdate) {
        await AsyncStorage.setItem(TOUR_CONTENT_HASH_KEY, latestUpdate);
      }
    } catch (error) {
      console.error('Error saving tour completion:', error);
    }
  }, [user?.id, currentTourId, markScreenTourSeen]);

  // Enhanced nextStep with action execution
  const nextStep = useCallback(async () => {
    const currentStepObj = steps[currentStep];

    // Execute the current step's action if defined
    if (currentStepObj?.action) {
      const success = await executeAction(currentStepObj.action);
      if (!success) {
        console.warn('🎯 [TourContext] Action failed, continuing to next step anyway');
      }

      // Add small delay after action to let UI settle
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setCurrentStep((prev) => {
      const nextIndex = prev + 1;

      if (nextIndex < steps.length) {
        // Execute pre-action for the next step if defined
        const nextStepObj = steps[nextIndex];
        if (nextStepObj?.preAction) {
          executeAction(nextStepObj.preAction).then(() => {
            // Scroll to element if needed
            if (nextStepObj.scrollToElement) {
              scrollToElementIfNeeded(nextStepObj);
            }
          });
        } else if (nextStepObj?.scrollToElement) {
          scrollToElementIfNeeded(nextStepObj);
        }

        return nextIndex;
      } else {
        // Tour completed
        endTour();
        return prev;
      }
    });
  }, [steps, currentStep, endTour, executeAction, scrollToElementIfNeeded]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const resetTour = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOUR_STORAGE_KEY);
      await AsyncStorage.removeItem(TOUR_CONTENT_HASH_KEY);
      await AsyncStorage.removeItem(SCREEN_TOURS_SEEN_KEY);

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
        }

        // Also reset screen tours in user_tour_completions
        await supabase
          .from('user_tour_completions')
          .update({
            completed_tours: [],
            last_tour_completed: null,
          })
          .eq('user_id', user.id);
      }

      setIsActive(false);
      setCurrentStep(0);
      setSteps([]);
      setCurrentTourId(null);
    } catch (error) {
      console.error('Error resetting tour:', error);
    }
  }, [user?.id]);

  const value: TourContextType = React.useMemo(
    () => ({
      isActive,
      currentStep,
      steps,
      currentTourId,
      startTour,
      startDatabaseTour,
      startScreenTour,
      startCustomTour,
      nextStep,
      prevStep,
      endTour,
      dismissTour,
      skipTour,
      resetTour,
      resetScreenTour,
      shouldShowTour,
      hasSeenScreenTour,
      measureElement,
      updateStepCoords,
      registerElement,
      setNavigationHandler,
      setScrollHandler,
      registerPressHandler,
      unregisterPressHandler,
    }),
    [
      isActive,
      currentStep,
      steps,
      currentTourId,
      startTour,
      startDatabaseTour,
      startScreenTour,
      startCustomTour,
      nextStep,
      prevStep,
      endTour,
      dismissTour,
      skipTour,
      resetTour,
      resetScreenTour,
      shouldShowTour,
      hasSeenScreenTour,
      measureElement,
      updateStepCoords,
      registerElement,
      setNavigationHandler,
      setScrollHandler,
      registerPressHandler,
      unregisterPressHandler,
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
