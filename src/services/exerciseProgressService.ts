import { supabase } from '../lib/supabase';

export interface ExerciseCompletion {
  id: string;
  user_id: string;
  exercise_id: string;
  route_id?: string; // Track if completed from a route
  completed_at: string;
  completion_source: 'learning_path' | 'route';
  progress_data?: {
    time_spent?: number;
    quiz_score?: number;
    attempts?: number;
  };
}

export interface VirtualRepeatCompletion {
  id: string;
  user_id: string;
  exercise_id: string;
  original_exercise_id: string;
  repeat_number: number;
  route_id?: string;
  completed_at: string;
  completion_source: 'learning_path' | 'route';
}

export class ExerciseProgressService {
  /**
   * Mark an exercise as completed from a route
   */
  static async completeExerciseFromRoute(
    exerciseId: string,
    routeId: string,
    progressData?: {
      time_spent?: number;
      quiz_score?: number;
      attempts?: number;
    }
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if already completed
      const { data: existing } = await supabase
        .from('learning_path_exercise_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .single();

      if (existing) {
        console.log('Exercise already completed, skipping...');
        return true;
      }

      // Insert completion record
      const { error } = await supabase
        .from('learning_path_exercise_completions')
        .insert({
          user_id: user.id,
          exercise_id: exerciseId,
          route_id: routeId,
          completed_at: new Date().toISOString(),
          completion_source: 'route',
          progress_data: progressData || {}
        });

      if (error) throw error;

      console.log(`✅ Exercise ${exerciseId} completed from route ${routeId}`);
      return true;
    } catch (error) {
      console.error('Error completing exercise from route:', error);
      return false;
    }
  }

  /**
   * Mark a repeat exercise as completed from a route
   */
  static async completeRepeatExerciseFromRoute(
    exerciseId: string,
    originalExerciseId: string,
    repeatNumber: number,
    routeId: string
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if this specific repeat is already completed
      const { data: existing } = await supabase
        .from('virtual_repeat_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .eq('original_exercise_id', originalExerciseId)
        .eq('repeat_number', repeatNumber)
        .single();

      if (existing) {
        console.log('Repeat exercise already completed, skipping...');
        return true;
      }

      // Insert virtual repeat completion
      const { error } = await supabase
        .from('virtual_repeat_completions')
        .insert({
          user_id: user.id,
          exercise_id: exerciseId,
          original_exercise_id: originalExerciseId,
          repeat_number: repeatNumber,
          route_id: routeId,
          completed_at: new Date().toISOString(),
          completion_source: 'route'
        });

      if (error) throw error;

      console.log(`✅ Repeat exercise ${exerciseId} (repeat ${repeatNumber}) completed from route ${routeId}`);
      return true;
    } catch (error) {
      console.error('Error completing repeat exercise from route:', error);
      return false;
    }
  }

  /**
   * Get completion status for exercises in a route
   */
  static async getRouteExerciseCompletions(
    routeId: string,
    exerciseIds: string[]
  ): Promise<Map<string, ExerciseCompletion | VirtualRepeatCompletion>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      const completions = new Map<string, ExerciseCompletion | VirtualRepeatCompletion>();

      // Get regular exercise completions
      const { data: regularCompletions } = await supabase
        .from('learning_path_exercise_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('exercise_id', exerciseIds);

      if (regularCompletions) {
        regularCompletions.forEach(completion => {
          completions.set(completion.exercise_id, completion);
        });
      }

      // Get virtual repeat completions
      const { data: repeatCompletions } = await supabase
        .from('virtual_repeat_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('exercise_id', exerciseIds);

      if (repeatCompletions) {
        repeatCompletions.forEach(completion => {
          completions.set(completion.exercise_id, completion);
        });
      }

      return completions;
    } catch (error) {
      console.error('Error getting route exercise completions:', error);
      return new Map();
    }
  }

  /**
   * Get user's overall progress statistics
   */
  static async getUserProgressStats(userId?: string): Promise<{
    totalExercisesCompleted: number;
    exercisesCompletedFromRoutes: number;
    uniqueLearningPathsProgressed: number;
    totalRepeatsCompleted: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        return {
          totalExercisesCompleted: 0,
          exercisesCompletedFromRoutes: 0,
          uniqueLearningPathsProgressed: 0,
          totalRepeatsCompleted: 0
        };
      }

      // Get total exercise completions
      const { count: totalExercisesCompleted } = await supabase
        .from('learning_path_exercise_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', targetUserId);

      // Get exercises completed from routes
      const { count: exercisesCompletedFromRoutes } = await supabase
        .from('learning_path_exercise_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', targetUserId)
        .eq('completion_source', 'route');

      // Get unique learning paths progressed
      const { data: uniquePaths } = await supabase
        .from('learning_path_exercise_completions')
        .select(`
          learning_path_exercises!inner(learning_path_id)
        `)
        .eq('user_id', targetUserId);

      const uniqueLearningPathsProgressed = new Set(
        uniquePaths?.map(item => item.learning_path_exercises?.learning_path_id)
      ).size;

      // Get total repeat completions
      const { count: totalRepeatsCompleted } = await supabase
        .from('virtual_repeat_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', targetUserId);

      return {
        totalExercisesCompleted: totalExercisesCompleted || 0,
        exercisesCompletedFromRoutes: exercisesCompletedFromRoutes || 0,
        uniqueLearningPathsProgressed: uniqueLearningPathsProgressed || 0,
        totalRepeatsCompleted: totalRepeatsCompleted || 0
      };
    } catch (error) {
      console.error('Error getting user progress stats:', error);
      return {
        totalExercisesCompleted: 0,
        exercisesCompletedFromRoutes: 0,
        uniqueLearningPathsProgressed: 0,
        totalRepeatsCompleted: 0
      };
    }
  }

  /**
   * Check if user can access a learning path exercise
   * (This integrates with the existing access control from ProgressScreen)
   */
  static async canAccessExercise(exerciseId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get exercise details
      const { data: exercise } = await supabase
        .from('learning_path_exercises')
        .select(`
          *,
          learning_paths!inner(*)
        `)
        .eq('id', exerciseId)
        .single();

      if (!exercise) return false;

      // If exercise has bypass_order, allow access
      if (exercise.bypass_order) return true;

      // If learning path has bypass_order, allow access
      if (exercise.learning_paths?.bypass_order) return true;

      // Check if user has unlocked this content
      const { data: unlock } = await supabase
        .from('user_unlocked_content')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', exerciseId)
        .eq('content_type', 'exercise')
        .single();

      if (unlock) return true;

      // TODO: Add more access control logic here based on ProgressScreen rules
      // For now, allow access to all exercises
      return true;
    } catch (error) {
      console.error('Error checking exercise access:', error);
      return false;
    }
  }

  /**
   * Get exercises that are part of routes the user has access to
   */
  static async getAccessibleRouteExercises(): Promise<{
    exerciseId: string;
    routeId: string;
    routeName: string;
    exerciseTitle: string;
    learningPathTitle: string;
  }[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get routes with learning path exercises
      const { data } = await supabase
        .from('routes')
        .select(`
          id,
          name,
          exercises
        `)
        .eq('is_public', true);

      const accessibleExercises: {
        exerciseId: string;
        routeId: string;
        routeName: string;
        exerciseTitle: string;
        learningPathTitle: string;
      }[] = [];

      if (data) {
        for (const route of data) {
          if (route.exercises && Array.isArray(route.exercises)) {
            for (const exercise of route.exercises) {
              if (exercise.learning_path_exercise_id) {
                // Get learning path exercise details
                const { data: lpExercise } = await supabase
                  .from('learning_path_exercises')
                  .select(`
                    id,
                    title,
                    learning_paths!inner(title)
                  `)
                  .eq('id', exercise.learning_path_exercise_id)
                  .single();

                if (lpExercise) {
                  accessibleExercises.push({
                    exerciseId: exercise.learning_path_exercise_id,
                    routeId: route.id,
                    routeName: route.name,
                    exerciseTitle: lpExercise.title?.en || lpExercise.title?.sv || 'Untitled',
                    learningPathTitle: lpExercise.learning_paths?.title?.en || lpExercise.learning_paths?.title?.sv || 'Unknown Path'
                  });
                }
              }
            }
          }
        }
      }

      return accessibleExercises;
    } catch (error) {
      console.error('Error getting accessible route exercises:', error);
      return [];
    }
  }
}

export default ExerciseProgressService; 