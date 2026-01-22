import { supabase } from '../lib/supabase';
import {
  TheoryModule,
  TheorySection,
  TheorySectionCompletion,
  TheoryModuleProgress,
  TheoryQuizQuestion,
  TheoryQuizAnswer,
} from '../types/theory';

export class TheoryProgressService {
  /**
   * Fetch all active theory modules with their sections
   */
  static async getModules(): Promise<TheoryModule[]> {
    try {
      const { data, error } = await supabase
        .from('theory_modules')
        .select('*')
        .eq('active', true)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching theory modules:', error);
      return [];
    }
  }

  /**
   * Fetch sections for a specific module
   */
  static async getSections(moduleId: string): Promise<TheorySection[]> {
    try {
      const { data, error } = await supabase
        .from('theory_sections')
        .select('*')
        .eq('theory_module_id', moduleId)
        .order('order_index');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching theory sections:', error);
      return [];
    }
  }

  /**
   * Fetch a single section with its quiz questions
   */
  static async getSectionWithQuiz(sectionId: string): Promise<{
    section: TheorySection | null;
    questions: TheoryQuizQuestion[];
  }> {
    try {
      // Fetch section
      const { data: section, error: sectionError } = await supabase
        .from('theory_sections')
        .select('*')
        .eq('id', sectionId)
        .single();

      if (sectionError) throw sectionError;

      // Fetch quiz questions if section has quiz
      let questions: TheoryQuizQuestion[] = [];
      if (section?.has_quiz) {
        const { data: questionData, error: questionsError } = await supabase
          .from('theory_quiz_questions')
          .select('*, theory_quiz_answers(*)')
          .eq('section_id', sectionId)
          .order('order_index');

        if (questionsError) throw questionsError;

        questions = (questionData || []).map(q => ({
          ...q,
          answers: q.theory_quiz_answers || [],
        }));
      }

      return { section, questions };
    } catch (error) {
      console.error('Error fetching section with quiz:', error);
      return { section: null, questions: [] };
    }
  }

  /**
   * Mark a section as completed
   */
  static async completeSection(
    sectionId: string,
    timeSpentSeconds: number,
    quizScore?: number,
    quizAttempts: number = 0
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('theory_section_completions')
        .upsert({
          user_id: user.id,
          section_id: sectionId,
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpentSeconds,
          quiz_score: quizScore,
          quiz_attempts: quizAttempts,
        }, {
          onConflict: 'user_id,section_id',
        });

      if (error) throw error;

      // Update module progress
      await this.updateModuleProgress(sectionId);

      console.log(`✅ Theory section ${sectionId} completed`);
      return true;
    } catch (error) {
      console.error('Error completing theory section:', error);
      return false;
    }
  }

  /**
   * Update module progress after completing a section
   */
  private static async updateModuleProgress(sectionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the module for this section
      const { data: section } = await supabase
        .from('theory_sections')
        .select('theory_module_id')
        .eq('id', sectionId)
        .single();

      if (!section) return;

      const moduleId = section.theory_module_id;

      // Get total sections for the module
      const { count: totalSections } = await supabase
        .from('theory_sections')
        .select('*', { count: 'exact' })
        .eq('theory_module_id', moduleId);

      // Get completed sections for user
      const { data: completedSections } = await supabase
        .from('theory_section_completions')
        .select('section_id, quiz_score, time_spent_seconds')
        .eq('user_id', user.id)
        .in('section_id',
          (await supabase
            .from('theory_sections')
            .select('id')
            .eq('theory_module_id', moduleId)
          ).data?.map(s => s.id) || []
        );

      const sectionsCompleted = completedSections?.length || 0;
      const totalTime = completedSections?.reduce((sum, c) => sum + (c.time_spent_seconds || 0), 0) || 0;
      const scores = completedSections?.filter(c => c.quiz_score != null).map(c => c.quiz_score) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      // Upsert module progress
      const { error } = await supabase
        .from('theory_module_progress')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          sections_completed: sectionsCompleted,
          total_sections: totalSections || 0,
          average_quiz_score: avgScore,
          total_time_seconds: totalTime,
          completed_at: sectionsCompleted === totalSections ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,module_id',
        });

      if (error) console.error('Error updating module progress:', error);
    } catch (error) {
      console.error('Error updating module progress:', error);
    }
  }

  /**
   * Get user's completion status for sections in a module
   */
  static async getSectionCompletions(moduleId: string): Promise<Map<string, TheorySectionCompletion>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      // Get section IDs for this module
      const { data: sections } = await supabase
        .from('theory_sections')
        .select('id')
        .eq('theory_module_id', moduleId);

      if (!sections || sections.length === 0) return new Map();

      // Get completions
      const { data: completions } = await supabase
        .from('theory_section_completions')
        .select('*')
        .eq('user_id', user.id)
        .in('section_id', sections.map(s => s.id));

      const completionMap = new Map<string, TheorySectionCompletion>();
      completions?.forEach(c => completionMap.set(c.section_id, c));

      return completionMap;
    } catch (error) {
      console.error('Error getting section completions:', error);
      return new Map();
    }
  }

  /**
   * Get user's progress for all modules
   */
  static async getAllModuleProgress(): Promise<Map<string, TheoryModuleProgress>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      const { data } = await supabase
        .from('theory_module_progress')
        .select('*')
        .eq('user_id', user.id);

      const progressMap = new Map<string, TheoryModuleProgress>();
      data?.forEach(p => progressMap.set(p.module_id, p));

      return progressMap;
    } catch (error) {
      console.error('Error getting module progress:', error);
      return new Map();
    }
  }

  /**
   * Get user's overall theory statistics
   */
  static async getUserTheoryStats(): Promise<{
    totalModulesCompleted: number;
    totalSectionsCompleted: number;
    averageQuizScore: number | null;
    totalTimeSpent: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          totalModulesCompleted: 0,
          totalSectionsCompleted: 0,
          averageQuizScore: null,
          totalTimeSpent: 0,
        };
      }

      // Get module completions
      const { count: modulesCompleted } = await supabase
        .from('theory_module_progress')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      // Get section completions with stats
      const { data: sectionCompletions } = await supabase
        .from('theory_section_completions')
        .select('quiz_score, time_spent_seconds')
        .eq('user_id', user.id);

      const totalSections = sectionCompletions?.length || 0;
      const totalTime = sectionCompletions?.reduce((sum, c) => sum + (c.time_spent_seconds || 0), 0) || 0;
      const scores = sectionCompletions?.filter(c => c.quiz_score != null).map(c => c.quiz_score) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      return {
        totalModulesCompleted: modulesCompleted || 0,
        totalSectionsCompleted: totalSections,
        averageQuizScore: avgScore,
        totalTimeSpent: totalTime,
      };
    } catch (error) {
      console.error('Error getting user theory stats:', error);
      return {
        totalModulesCompleted: 0,
        totalSectionsCompleted: 0,
        averageQuizScore: null,
        totalTimeSpent: 0,
      };
    }
  }

  /**
   * Check if user can access a module (handles paywall and locks)
   */
  static async canAccessModule(moduleId: string, password?: string): Promise<{
    canAccess: boolean;
    reason?: 'locked' | 'paywall' | 'authenticated';
  }> {
    try {
      const { data: module } = await supabase
        .from('theory_modules')
        .select('is_locked, lock_password, paywall_enabled')
        .eq('id', moduleId)
        .single();

      if (!module) return { canAccess: false, reason: 'locked' };

      // Check password lock
      if (module.is_locked && module.lock_password) {
        if (!password || password !== module.lock_password) {
          return { canAccess: false, reason: 'locked' };
        }
      }

      // Check paywall
      if (module.paywall_enabled) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { canAccess: false, reason: 'authenticated' };

        // Check if user has purchased
        const { data: purchase } = await supabase
          .from('user_unlocked_content')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', moduleId)
          .eq('content_type', 'theory_module')
          .single();

        if (!purchase) return { canAccess: false, reason: 'paywall' };
      }

      return { canAccess: true };
    } catch (error) {
      console.error('Error checking module access:', error);
      return { canAccess: false, reason: 'locked' };
    }
  }
}

export default TheoryProgressService;
