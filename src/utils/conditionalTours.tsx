// CONDITIONAL TOUR SYSTEM - DISABLED TO PREVENT CONSOLE FLOODING
// Handles role-based and data-based tour triggers

import { supabase } from '../lib/supabase';

// FEATURE FLAG: Disable all conditional tours to prevent performance issues
const CONDITIONAL_TOURS_ENABLED = false;

// Define TourStep interface locally to avoid import issues
interface TourStep {
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
  } | null;
}

export interface ConditionalTourConfig {
  tourKey: string;
  condition: 'role' | 'student_count' | 'profile_completed' | 'custom';
  requiredValue?: string | number;
  customCheck?: () => Promise<boolean>;
  priority: number; // Higher = shown first
}

// Pre-defined conditional tours
export const CONDITIONAL_TOURS: ConditionalTourConfig[] = [
  {
    tourKey: 'instructor_student_switch',
    condition: 'role',
    requiredValue: 'instructor', 
    priority: 10,
  },
  {
    tourKey: 'instructor_with_students',
    condition: 'student_count',
    requiredValue: 1, // Has at least 1 student
    priority: 9,
  },
  {
    tourKey: 'admin_controls',
    condition: 'role', 
    requiredValue: 'admin',
    priority: 8,
  }
];

export class ConditionalTourManager {
  private static instance: ConditionalTourManager;
  
  static getInstance(): ConditionalTourManager {
    if (!ConditionalTourManager.instance) {
      ConditionalTourManager.instance = new ConditionalTourManager();
    }
    return ConditionalTourManager.instance;
  }

  /**
   * Check if user meets conditions for any conditional tours
   */
  async checkEligibleTours(userId: string): Promise<string[]> {
    const eligibleTours: string[] = [];

    try {
      // Get user profile and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', userId)
        .single();

      if (!profile) return eligibleTours;

      // Check each conditional tour
      for (const tour of CONDITIONAL_TOURS) {
        const isEligible = await this.checkTourCondition(userId, profile, tour);
        if (isEligible) {
          eligibleTours.push(tour.tourKey);
        }
      }

      // Sort by priority (higher first)
      return eligibleTours.sort((a, b) => {
        const tourA = CONDITIONAL_TOURS.find(t => t.tourKey === a);
        const tourB = CONDITIONAL_TOURS.find(t => t.tourKey === b);
        return (tourB?.priority || 0) - (tourA?.priority || 0);
      });

    } catch (error) {
      console.error('Error checking conditional tours:', error);
      return [];
    }
  }

  /**
   * Check if user meets specific tour condition
   */
  private async checkTourCondition(
    userId: string, 
    profile: any, 
    tour: ConditionalTourConfig
  ): Promise<boolean> {
    try {
      switch (tour.condition) {
        case 'role':
          return profile.role === tour.requiredValue;
          
        case 'student_count':
          const { data: students } = await supabase
            .from('user_relationships')
            .select('id')
            .eq('instructor_id', userId)
            .eq('status', 'active');
          return (students?.length || 0) >= (tour.requiredValue as number);

        case 'profile_completed':
          return !!(profile.full_name && profile.email);
          
        case 'custom':
          return tour.customCheck ? await tour.customCheck() : false;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking tour condition:', error);
      return false;
    }
  }

  /**
   * Load conditional tour steps from database with role filtering
   */
  async loadConditionalTourSteps(tourKey: string, userRole: string): Promise<TourStep[]> {
    try {
      const { data: tourSteps } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'tour')
        .eq('key', `tour.conditional.${tourKey}`)
        .contains('platforms', ['mobile'])
        .eq('active', true)
        .order('order_index');

      if (!tourSteps) return [];

      // Additional role-based filtering for conditional tours
      const roleFilteredSteps = tourSteps.filter(step => {
        const isInstructorTour = step.key.includes('instructor');
        const isAdminTour = step.key.includes('admin');
        
        // Only show instructor tours to instructors/admins
        if (isInstructorTour && !['instructor', 'admin', 'school'].includes(userRole)) {
          return false;
        }

        // Only show admin tours to admins
        if (isAdminTour && userRole !== 'admin') {
          return false;
        }

        return true;
      });

      // Role filtering applied

      return roleFilteredSteps.map(step => ({
        id: step.id,
        title: typeof step.title === 'object' ? step.title.en || step.title.sv || '' : step.title,
        content: typeof step.body === 'object' ? step.body.en || step.body.sv || '' : step.body,
        targetScreen: this.parseTargetScreen(step.target),
        targetElement: step.target,
        targetCoords: null, // Will be set when element is measured
      }));
    } catch (error) {
      console.error('Error loading conditional tour steps:', error);
      return [];
    }
  }

  /**
   * Parse target into screen name
   */
  private parseTargetScreen(target: string): string {
    if (target.includes('Tab')) return target;
    if (target.includes('Screen')) return target.split('.')[0];
    if (target.includes('Header')) return 'Header';
    return 'HomeTab'; // Default
  }

  /**
   * Start a conditional tour if user is eligible
   */
  async triggerConditionalTour(userId: string, tourContext: any, userRole: string): Promise<boolean> {
    // DISABLED: Conditional tours cause console flooding
    if (!CONDITIONAL_TOURS_ENABLED) {
      return false;
    }
    
    const eligibleTours = await this.checkEligibleTours(userId);
    
    if (eligibleTours.length === 0) {
      return false;
    }

    // Start the highest priority tour
    const tourKey = eligibleTours[0];
    const steps = await this.loadConditionalTourSteps(tourKey, userRole);
    
    if (steps.length === 0) {
      return false;
    }
    
    // Start the tour using the tour context
    tourContext.startCustomTour(steps, tourKey);
    return true;
  }
}

// Export singleton instance
export const conditionalTourManager = ConditionalTourManager.getInstance();

// Hook for components to use conditional tours
export const useConditionalTours = () => {
  const triggerConditionalTour = async (userId: string, tourContext: any, userRole: string) => {
    // DISABLED: Conditional tours cause performance issues
    if (!CONDITIONAL_TOURS_ENABLED) {
      return false;
    }
    return await conditionalTourManager.triggerConditionalTour(userId, tourContext, userRole);
  };

  const checkEligibleTours = async (userId: string) => {
    return await conditionalTourManager.checkEligibleTours(userId);
  };

  return {
    triggerConditionalTour,
    checkEligibleTours,
  };
};
