import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTour, TourAction } from '../contexts/TourContext';
import { useAuth } from '../context/AuthContext';

interface UseScreenTourOptions {
  /** Screen identifier for tour tracking */
  screenId: string;
  /** Delay before showing tour (ms) - allows screen to settle */
  delay?: number;
  /** Whether to auto-trigger tour on first visit */
  autoTrigger?: boolean;
  /** Custom user role override */
  userRole?: string;
  /** Callback when tour starts */
  onTourStart?: () => void;
  /** Callback when tour ends */
  onTourEnd?: () => void;
}

/**
 * Hook for screens to integrate with the tour system.
 * Automatically triggers screen-specific tours on first visit.
 *
 * @example
 * ```tsx
 * function ProgressScreen() {
 *   const { triggerTour, isTourActive } = useScreenTour({
 *     screenId: 'ProgressScreen',
 *     delay: 500,
 *   });
 *
 *   // Tour will auto-trigger on first visit
 *   // Or manually trigger with: triggerTour()
 * }
 * ```
 */
export function useScreenTour({
  screenId,
  delay = 800,
  autoTrigger = true,
  userRole,
  onTourStart,
  onTourEnd,
}: UseScreenTourOptions) {
  const { profile } = useAuth();
  const {
    isActive,
    currentTourId,
    startScreenTour,
    hasSeenScreenTour,
    resetScreenTour,
    setScrollHandler,
  } = useTour();

  const hasTriggeredRef = useRef(false);
  const isMountedRef = useRef(true);

  // Track if tour is active for this specific screen
  const isTourActive = isActive && currentTourId === `screen.${screenId}`;

  // Manually trigger the screen tour
  const triggerTour = useCallback(async () => {
    if (!isMountedRef.current) return false;

    const role = userRole || profile?.role || 'student';
    const started = await startScreenTour(screenId, role);

    if (started && onTourStart) {
      onTourStart();
    }

    return started;
  }, [screenId, userRole, profile?.role, startScreenTour, onTourStart]);

  // Force show tour (reset and trigger)
  const forceShowTour = useCallback(async () => {
    await resetScreenTour(screenId);
    hasTriggeredRef.current = false;
    return triggerTour();
  }, [screenId, resetScreenTour, triggerTour]);

  // Check if user has seen this tour
  const checkHasSeenTour = useCallback(async () => {
    return hasSeenScreenTour(screenId);
  }, [screenId, hasSeenScreenTour]);

  // Register scroll handler for this screen (call from the screen component)
  const registerScrollHandler = useCallback(
    (handler: (elementId: string, offset?: number) => Promise<boolean>) => {
      setScrollHandler(screenId, handler);
    },
    [screenId, setScrollHandler],
  );

  // Auto-trigger on screen focus (first visit only)
  useFocusEffect(
    useCallback(() => {
      if (!autoTrigger || hasTriggeredRef.current) return;

      const timer = setTimeout(async () => {
        if (!isMountedRef.current) return;

        // Check if user has already seen this tour
        const hasSeen = await hasSeenScreenTour(screenId);
        if (hasSeen) {
          console.log(`🎯 [useScreenTour] User already saw tour for ${screenId}`);
          hasTriggeredRef.current = true;
          return;
        }

        // Trigger the tour
        hasTriggeredRef.current = true;
        const started = await startScreenTour(screenId, userRole || profile?.role);

        if (started && onTourStart) {
          onTourStart();
        }
      }, delay);

      return () => clearTimeout(timer);
    }, [screenId, delay, autoTrigger, userRole, profile?.role, hasSeenScreenTour, startScreenTour, onTourStart]),
  );

  // Track tour end
  useEffect(() => {
    if (!isActive && currentTourId === null && hasTriggeredRef.current && onTourEnd) {
      onTourEnd();
    }
  }, [isActive, currentTourId, onTourEnd]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    /** Whether tour is currently active for this screen */
    isTourActive,
    /** Manually trigger the screen tour */
    triggerTour,
    /** Force show tour (resets seen status) */
    forceShowTour,
    /** Check if user has seen this tour */
    checkHasSeenTour,
    /** Register a scroll handler for auto-scrolling to elements */
    registerScrollHandler,
    /** Reset this screen's tour seen status */
    resetTour: () => resetScreenTour(screenId),
  };
}

/**
 * Hook for registering the tour navigation handler.
 * Should be called in TabNavigator or App.tsx.
 *
 * @example
 * ```tsx
 * function TabNavigator() {
 *   const navigation = useNavigation();
 *
 *   useTourNavigationHandler({
 *     navigate: (screen, params) => navigation.navigate(screen, params),
 *     openSheet: (sheetId) => { ... },
 *   });
 * }
 * ```
 */
export function useTourNavigationHandler(handlers: {
  navigate?: (screen: string, params?: Record<string, any>) => Promise<boolean> | boolean;
  openSheet?: (sheetId: string, params?: Record<string, any>) => Promise<boolean> | boolean;
  openModal?: (modalId: string, params?: Record<string, any>) => Promise<boolean> | boolean;
  pressElement?: (elementId: string) => Promise<boolean> | boolean;
}) {
  const { setNavigationHandler } = useTour();

  useEffect(() => {
    setNavigationHandler(async (action: TourAction): Promise<boolean> => {
      try {
        switch (action.type) {
          case 'navigate':
            if (handlers.navigate && action.target) {
              const result = await handlers.navigate(action.target, action.params);
              return result !== false;
            }
            return false;

          case 'openSheet':
            if (handlers.openSheet && action.target) {
              const result = await handlers.openSheet(action.target, action.params);
              return result !== false;
            }
            return false;

          case 'openModal':
            if (handlers.openModal && action.target) {
              const result = await handlers.openModal(action.target, action.params);
              return result !== false;
            }
            return false;

          case 'press':
            if (handlers.pressElement && action.target) {
              const result = await handlers.pressElement(action.target);
              return result !== false;
            }
            return false;

          case 'scrollTo':
            // Scroll actions are handled by screen-specific handlers
            return true;

          case 'waitFor':
            // Wait actions just add delays
            if (action.delay) {
              await new Promise(resolve => setTimeout(resolve, action.delay));
            }
            return true;

          default:
            console.warn(`🎯 [useTourNavigationHandler] Unknown action type: ${action.type}`);
            return false;
        }
      } catch (error) {
        console.error('🎯 [useTourNavigationHandler] Error executing action:', error);
        return false;
      }
    });
  }, [setNavigationHandler, handlers]);
}
