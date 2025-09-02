// SCREEN-SPECIFIC TOUR SYSTEM - DISABLED TO PREVENT CONSOLE FLOODING
// Triggers tours when entering specific screens

import { supabase } from '../lib/supabase';

// FEATURE FLAG: Disable all screen tours to prevent performance issues
const SCREEN_TOURS_ENABLED = false;

// Define TourStep interface locally
interface TourStep {
  id: string;
  title: string;
  content: string;
  targetScreen: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'center' | 'left' | 'right';
  targetCoords?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface ScreenTourConfig {
  screenName: string;
  tourKey: string;
  steps: TourStep[];
  triggerCondition?: 'first_visit' | 'always' | 'feature_available';
  requiredData?: any;
}

// Pre-defined screen tours
export const SCREEN_TOURS: ScreenTourConfig[] = [
  {
    screenName: 'RouteDetailScreen',
    tourKey: 'route_detail_features',
    triggerCondition: 'first_visit',
    steps: [
      {
        id: 'route-save',
        title: 'Save This Route',
        content: 'Bookmark routes you like! Tap here to save this route to your personal collection for easy access later.',
        targetScreen: 'RouteDetailScreen',
        targetElement: 'RouteDetailScreen.SaveButton',
      },
      {
        id: 'route-map',
        title: 'Interactive Route Map',
        content: 'This shows the exact route path with waypoints. You can explore the route visually before driving it.',
        targetScreen: 'RouteDetailScreen', 
        targetElement: 'RouteDetailScreen.MapCard',
      },
      {
        id: 'route-exercises',
        title: 'Practice Exercises',
        content: 'Complete these exercises to improve specific driving skills along this route. Track your progress and master each technique!',
        targetScreen: 'RouteDetailScreen',
        targetElement: 'RouteDetailScreen.ExercisesCard',
      }
    ]
  },
  {
    screenName: 'ProgressScreen',
    tourKey: 'progress_features',
    triggerCondition: 'first_visit',
    steps: [
      {
        id: 'progress-overview',
        title: 'Your Learning Progress',
        content: 'Each card shows a learning path with your completion percentage. Tap any path to see detailed exercises and track your skills development.',
        targetScreen: 'ProgressScreen',
        targetElement: 'ProgressScreen.FirstPath',
      },
      {
        id: 'filter-button',
        title: 'Filter Learning Paths',
        content: 'Customize what learning paths you see based on your vehicle type, license, experience level, and more. Filters save automatically!',
        targetScreen: 'ProgressScreen',
        targetElement: 'ProgressScreen.FilterButton',
      }
    ]
  },
  {
    screenName: 'ExerciseDetail',
    tourKey: 'exercise_actions',
    triggerCondition: 'feature_available',
    steps: [
      {
        id: 'mark-complete',
        title: 'Mark Exercise Complete',
        content: 'Tap here to mark this exercise as completed! This tracks your progress and unlocks new learning content.',
        targetScreen: 'ExerciseDetail',
        targetElement: 'ExerciseDetail.MarkCompleteButton',
      },
      {
        id: 'repeat-exercises',
        title: 'Practice Repetitions',
        content: 'Some exercises require multiple repetitions to master. Track your progress through each repetition here.',
        targetScreen: 'ExerciseDetail',
        targetElement: 'ExerciseDetail.RepeatSection',
      }
    ]
  }
];

export class ScreenTourManager {
  private static visitedScreens = new Set<string>();
  
  /**
   * Check if a screen tour should be triggered
   */
  static shouldShowScreenTour(screenName: string, tourContext: any, forceShow: boolean = false): ScreenTourConfig | null {
    const screenTour = SCREEN_TOURS.find(tour => tour.screenName === screenName);
    if (!screenTour) return null;

    // If force showing (from drawer button), always show
    if (forceShow) {
      return screenTour;
    }

    switch (screenTour.triggerCondition) {
      case 'first_visit':
        if (this.visitedScreens.has(screenName)) {
          return null;
        }
        this.visitedScreens.add(screenName);
        return screenTour;
        
      case 'always':
        return screenTour;
        
      case 'feature_available':
        // Check if required features/data are available
        return screenTour.requiredData ? screenTour : null;
        
      default:
        return null;
    }
  }

  /**
   * Trigger a screen tour with role filtering
   */
  static async triggerScreenTour(screenName: string, tourContext: any, userRole?: string, forceShow: boolean = false): Promise<boolean> {
    // DISABLED: Screen tours cause console flooding and performance issues
    if (!SCREEN_TOURS_ENABLED) {
      return false;
    }
    
    try {
      // Map screen names to SQL key patterns
      const screenKeyMapping: Record<string, string> = {
        'RouteDetailScreen': 'route_detail',
        'ProgressScreen': 'progress', 
        'ExerciseDetail': 'exercise',
        'MapScreen': 'map'
      };

      const keyPattern = screenKeyMapping[screenName] || screenName.toLowerCase();
      
      // Load screen-specific tours from database with role filtering
      const { data: screenTours, error: screenToursError } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'tour')
        .eq('active', true)
        .ilike('key', `tour.screen.${keyPattern}%`)
        .order('order_index');

      // Database query completed

      if (!screenTours || screenTours.length === 0) {
        return false;
      }

      // Filter based on user role  
      const roleFilteredTours = screenTours.filter(tour => {
        const isInstructorTour = tour.key.includes('instructor') || tour.key.includes('conditional');
        
        // Students should not see instructor tours
        if (userRole === 'student' && isInstructorTour) {
          return false;
        }

        return true;
      });

      if (roleFilteredTours.length === 0) {
        return false;
      }

      // Convert to TourStep format
      const tourSteps = roleFilteredTours.map(step => ({
        id: step.id,
        title: typeof step.title === 'object' ? step.title.en || step.title.sv || '' : step.title,
        content: typeof step.body === 'object' ? step.body.en || step.body.sv || '' : step.body,
        targetScreen: screenName,
        targetElement: step.target,
        targetCoords: null,
      }));

      // Starting screen tour
      
      // Start the custom tour using tour context
      if (tourSteps.length > 0) {
        tourContext.startCustomTour(tourSteps, `screen_${keyPattern}_${userRole}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading screen tour:', error);
      return false;
    }
  }

  /**
   * Reset visited screens (for testing)
   */
  static resetVisitedScreens() {
    this.visitedScreens.clear();
  }
}

// Hook for components to use screen tours
export const useScreenTours = () => {
  const triggerScreenTour = async (screenName: string, tourContext: any, userRole?: string, forceShow?: boolean) => {
    // DISABLED: Screen tours cause console flooding
    if (!SCREEN_TOURS_ENABLED) {
      return false;
    }
    return await ScreenTourManager.triggerScreenTour(screenName, tourContext, userRole, forceShow || false);
  };

  const resetVisitedScreens = () => {
    ScreenTourManager.resetVisitedScreens();
  };

  return {
    triggerScreenTour,
    resetVisitedScreens,
  };
};
