/**
 * WatchService - Handles Apple Watch connectivity and data sync
 *
 * This service bridges the React Native app with the watchOS companion app
 * using react-native-watch-connectivity. It syncs:
 * - User stats (exercises completed, streaks, etc.)
 * - Learning paths and exercises
 * - Weekly goals
 * - Routes
 * - Achievements
 */

import { Platform, NativeModules } from 'react-native';
import { supabase } from '../lib/supabase';

// Check IMMEDIATELY if native module exists - this must happen before any require
const WATCH_MODULE_AVAILABLE = Platform.OS === 'ios' && !!NativeModules.RNWatch;

// Only attempt to load the module if native code is available
let watchModule: any = null;

const getWatchModule = () => {
  if (!WATCH_MODULE_AVAILABLE) {
    return null;
  }

  if (watchModule) return watchModule;

  try {
    watchModule = require('react-native-watch-connectivity');
    return watchModule;
  } catch (error) {
    console.warn('[WatchService] Failed to load watch module:', error);
    return null;
  }
};

// Log once at startup
if (Platform.OS === 'ios') {
  console.log('[WatchService] Native module available:', WATCH_MODULE_AVAILABLE);
}

// Types for Watch data (simplified versions for watch)
interface WatchUserStats {
  totalDistanceKm: number;
  totalDrivingTime: number;
  totalPoints: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  routesCompleted: number;
  exercisesCompleted: number;
  achievementsUnlocked: number;
  lastSyncDate: string;
}

interface WatchTodayStats {
  distanceKm: number;
  drivingTime: number;
  pointsEarned: number;
  routesCompleted: number;
  exercisesCompleted: number;
}

interface WatchLearningPath {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isLocked: boolean;
  totalExercises: number;
  completedExercises: number;
  exercises: WatchExercise[];
}

interface WatchExercise {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  duration: string | null;
  isCompleted: boolean;
  hasQuiz: boolean;
  orderIndex: number;
  youtubeUrl: string | null;
  repeatCount: number | null;
  completedRepeats: number | null;
}

interface WatchWeeklyGoal {
  dailyTarget: number;
  weekDays: WatchDayProgress[];
  currentWeekStart: string;
}

interface WatchDayProgress {
  dayOfWeek: number;
  completed: number;
  date: string;
}

interface WatchRoute {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  distanceKm: number | null;
  estimatedMinutes: number | null;
  waypoints: { latitude: number; longitude: number; title: string | null }[];
  isPublic: boolean;
  creatorName: string | null;
  exerciseCount: number;
}

interface WatchAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number | null;
  target: number | null;
  category: string;
}

interface WatchStreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

class WatchServiceClass {
  private isInitialized = false;
  private messageSubscription: (() => void) | null = null;
  private reachabilitySubscription: (() => void) | null = null;
  private currentUserId: string | null = null;
  private currentLanguage: 'en' | 'sv' = 'en';

  /**
   * Initialize the Watch service - call this when app starts
   */
  async initialize(language: 'en' | 'sv' = 'en') {
    if (Platform.OS !== 'ios') {
      console.log('[WatchService] Not iOS, skipping initialization');
      return;
    }

    const watch = getWatchModule();
    if (!watch) {
      console.log('[WatchService] Watch module not available, skipping initialization');
      return;
    }

    if (this.isInitialized) {
      console.log('[WatchService] Already initialized');
      return;
    }

    this.currentLanguage = language;

    try {
      const isInstalled = await watch.getIsWatchAppInstalled();
      console.log('[WatchService] Watch app installed:', isInstalled);

      if (!isInstalled) {
        console.log('[WatchService] Watch app not installed, skipping setup');
        return;
      }

      // Listen for messages from Watch
      this.messageSubscription = watch.watchEvents.on('message', this.handleWatchMessage);

      // Listen for reachability changes
      this.reachabilitySubscription = watch.watchEvents.on('reachability', this.handleReachabilityChange);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;

      this.isInitialized = true;
      console.log('[WatchService] Initialized successfully');

      // Send initial data if watch is reachable
      const isReachable = await watch.getReachability();
      if (isReachable && this.currentUserId) {
        await this.sendFullSync();
      }
    } catch (error) {
      console.error('[WatchService] Failed to initialize:', error);
    }
  }

  /**
   * Update the current language for localized content
   */
  setLanguage(language: 'en' | 'sv') {
    this.currentLanguage = language;
  }

  /**
   * Update current user ID (call on auth state change)
   */
  async setCurrentUser(userId: string | null) {
    this.currentUserId = userId;

    const watch = getWatchModule();
    if (userId && watch) {
      const isReachable = await watch.getReachability();
      if (isReachable) {
        await this.sendFullSync();
      }
    }
  }

  /**
   * Clean up subscriptions
   */
  destroy() {
    if (this.messageSubscription) {
      this.messageSubscription();
      this.messageSubscription = null;
    }
    if (this.reachabilitySubscription) {
      this.reachabilitySubscription();
      this.reachabilitySubscription = null;
    }
    this.isInitialized = false;
    console.log('[WatchService] Destroyed');
  }

  // ============================================
  // Message Handlers
  // ============================================

  private handleWatchMessage = async (message: Record<string, unknown>) => {
    console.log('[WatchService] Received message:', message);

    const type = message.type as string;

    try {
      switch (type) {
        case 'requestFullSync':
          await this.sendFullSync();
          break;

        case 'requestStats':
          await this.sendStats();
          break;

        case 'requestLearningPaths':
          await this.sendLearningPaths();
          break;

        case 'completeExercise':
          await this.handleCompleteExercise(
            message.exerciseId as string,
            message.pathId as string,
          );
          break;

        case 'quickAction':
          await this.handleQuickAction(
            message.action as string,
            message as Record<string, unknown>,
          );
          break;

        default:
          console.log('[WatchService] Unknown message type:', type);
      }
    } catch (error) {
      console.error('[WatchService] Error handling message:', error);
    }
  };

  private handleReachabilityChange = async (reachable: boolean) => {
    console.log('[WatchService] Reachability changed:', reachable);

    if (reachable && this.currentUserId) {
      // Watch became reachable, send fresh data
      await this.sendFullSync();
    }
  };

  // ============================================
  // Data Senders
  // ============================================

  /**
   * Send all data to Watch (full sync)
   */
  async sendFullSync() {
    if (!this.currentUserId) {
      console.log('[WatchService] No user, skipping full sync');
      return;
    }

    const watch = getWatchModule();
    if (!watch) {
      console.log('[WatchService] Watch module not available, skipping full sync');
      return;
    }

    console.log('[WatchService] Starting full sync...');

    try {
      const [userStats, todayStats, weeklyGoal, learningPaths, achievements, routes, streakInfo] =
        await Promise.all([
          this.fetchUserStats(),
          this.fetchTodayStats(),
          this.fetchWeeklyGoal(),
          this.fetchLearningPaths(),
          this.fetchAchievements(),
          this.fetchNearbyRoutes(),
          this.fetchStreakInfo(),
        ]);

      const payload = {
        type: 'fullSync',
        userStats: JSON.stringify(userStats),
        todayStats: JSON.stringify(todayStats),
        weeklyGoal: JSON.stringify(weeklyGoal),
        learningPaths: JSON.stringify(learningPaths),
        currentLearningPath: JSON.stringify(learningPaths[0] || null),
        achievements: JSON.stringify(achievements),
        nearbyRoutes: JSON.stringify(routes),
        streakInfo: JSON.stringify(streakInfo),
      };

      // Use application context for background sync
      await watch.updateApplicationContext(payload);

      // Also try direct message if reachable
      const isReachable = await watch.getReachability();
      if (isReachable) {
        await watch.sendMessage(payload);
      }

      console.log('[WatchService] Full sync complete');
    } catch (error) {
      console.error('[WatchService] Full sync failed:', error);
    }
  }

  /**
   * Send just stats to Watch
   */
  async sendStats() {
    if (!this.currentUserId) return;

    const watch = getWatchModule();
    if (!watch) return;

    try {
      const [userStats, todayStats, streakInfo] = await Promise.all([
        this.fetchUserStats(),
        this.fetchTodayStats(),
        this.fetchStreakInfo(),
      ]);

      await watch.sendMessage({
        type: 'statsUpdate',
        userStats: JSON.stringify(userStats),
        todayStats: JSON.stringify(todayStats),
        streakInfo: JSON.stringify(streakInfo),
      });
    } catch (error) {
      console.error('[WatchService] Send stats failed:', error);
    }
  }

  /**
   * Send learning paths to Watch
   */
  async sendLearningPaths() {
    if (!this.currentUserId) return;

    const watch = getWatchModule();
    if (!watch) return;

    try {
      const learningPaths = await this.fetchLearningPaths();

      await watch.sendMessage({
        type: 'learningPathsUpdate',
        learningPaths: JSON.stringify(learningPaths),
        currentLearningPath: JSON.stringify(learningPaths[0] || null),
      });
    } catch (error) {
      console.error('[WatchService] Send learning paths failed:', error);
    }
  }

  /**
   * Notify Watch of achievement unlock
   */
  async notifyAchievementUnlocked(achievement: WatchAchievement) {
    const watch = getWatchModule();
    if (!watch) return;

    try {
      const isReachable = await watch.getReachability();
      if (isReachable) {
        await watch.sendMessage({
          type: 'achievementUnlocked',
          achievement: JSON.stringify(achievement),
        });
      }
    } catch (error) {
      console.error('[WatchService] Notify achievement failed:', error);
    }
  }

  /**
   * Trigger celebration on Watch
   */
  async triggerCelebration(reason: string) {
    const watch = getWatchModule();
    if (!watch) return;

    try {
      const isReachable = await watch.getReachability();
      if (isReachable) {
        await watch.sendMessage({
          type: 'celebration',
          reason,
        });
      }
    } catch (error) {
      console.error('[WatchService] Trigger celebration failed:', error);
    }
  }

  // ============================================
  // Action Handlers
  // ============================================

  private async handleCompleteExercise(exerciseId: string, pathId: string) {
    if (!this.currentUserId) return;

    try {
      // Mark exercise as complete in database
      await supabase.from('learning_path_exercise_completions').upsert(
        {
          user_id: this.currentUserId,
          exercise_id: exerciseId,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,exercise_id',
        },
      );

      console.log('[WatchService] Exercise completed:', exerciseId);

      // Send updated learning paths back
      await this.sendLearningPaths();
      await this.sendStats();
    } catch (error) {
      console.error('[WatchService] Complete exercise failed:', error);
    }
  }

  private async handleQuickAction(action: string, data: Record<string, unknown>) {
    console.log('[WatchService] Quick action:', action, data);

    // These actions would typically trigger deep links or notifications
    // For now, we just log them - you can extend this to trigger in-app navigation
    switch (action) {
      case 'startRoute':
        console.log('[WatchService] Start route requested:', data.routeId);
        // TODO: Trigger route start in app
        break;

      case 'openLearningPath':
        console.log('[WatchService] Open learning path requested:', data.pathId);
        // TODO: Deep link to learning path
        break;

      case 'openExercise':
        console.log('[WatchService] Open exercise requested:', data.exerciseId);
        // TODO: Deep link to exercise
        break;

      case 'openRoute':
        console.log('[WatchService] Open route requested:', data.routeId);
        // TODO: Deep link to route
        break;

      case 'openActiveRoute':
        console.log('[WatchService] Open active route requested');
        // TODO: Deep link to active route
        break;

      case 'openRoutesOnPhone':
        console.log('[WatchService] Open routes list requested');
        // TODO: Deep link to routes screen
        break;

      default:
        console.log('[WatchService] Unknown quick action:', action);
    }
  }

  // ============================================
  // Data Fetchers
  // ============================================

  private getLocalizedText(
    text: string | { en: string; sv: string } | null | undefined,
  ): string {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text[this.currentLanguage] || text.en || '';
  }

  private async fetchUserStats(): Promise<WatchUserStats> {
    if (!this.currentUserId) {
      return this.getDefaultUserStats();
    }

    try {
      // Get exercise completions count
      const { count: exercisesCompleted } = await supabase
        .from('learning_path_exercise_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.currentUserId);

      // Get profile for additional stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.currentUserId)
        .single();

      // Calculate streak (simplified - you may have a more sophisticated system)
      const { data: recentCompletions } = await supabase
        .from('learning_path_exercise_completions')
        .select('completed_at')
        .eq('user_id', this.currentUserId)
        .order('completed_at', { ascending: false })
        .limit(30);

      const streak = this.calculateStreak(recentCompletions || []);

      return {
        totalDistanceKm: profile?.total_distance_km || 0,
        totalDrivingTime: profile?.total_driving_time || 0,
        totalPoints: profile?.points || exercisesCompleted! * 10 || 0,
        currentLevel: Math.floor((exercisesCompleted || 0) / 5) + 1,
        currentStreak: streak.current,
        longestStreak: Math.max(streak.current, streak.longest),
        routesCompleted: profile?.routes_completed || 0,
        exercisesCompleted: exercisesCompleted || 0,
        achievementsUnlocked: profile?.achievements_count || 0,
        lastSyncDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[WatchService] Fetch user stats failed:', error);
      return this.getDefaultUserStats();
    }
  }

  private getDefaultUserStats(): WatchUserStats {
    return {
      totalDistanceKm: 0,
      totalDrivingTime: 0,
      totalPoints: 0,
      currentLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      routesCompleted: 0,
      exercisesCompleted: 0,
      achievementsUnlocked: 0,
      lastSyncDate: new Date().toISOString(),
    };
  }

  private async fetchTodayStats(): Promise<WatchTodayStats> {
    if (!this.currentUserId) {
      return { distanceKm: 0, drivingTime: 0, pointsEarned: 0, routesCompleted: 0, exercisesCompleted: 0 };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: exercisesToday } = await supabase
        .from('learning_path_exercise_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.currentUserId)
        .gte('completed_at', today.toISOString());

      return {
        distanceKm: 0, // Would come from recording sessions
        drivingTime: 0,
        pointsEarned: (exercisesToday || 0) * 10,
        routesCompleted: 0,
        exercisesCompleted: exercisesToday || 0,
      };
    } catch (error) {
      console.error('[WatchService] Fetch today stats failed:', error);
      return { distanceKm: 0, drivingTime: 0, pointsEarned: 0, routesCompleted: 0, exercisesCompleted: 0 };
    }
  }

  private async fetchWeeklyGoal(): Promise<WatchWeeklyGoal> {
    if (!this.currentUserId) {
      return this.getDefaultWeeklyGoal();
    }

    try {
      // Get the start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      // Get completions for this week
      const { data: completions } = await supabase
        .from('learning_path_exercise_completions')
        .select('completed_at')
        .eq('user_id', this.currentUserId)
        .gte('completed_at', weekStart.toISOString());

      // Group by day
      const weekDays: WatchDayProgress[] = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);

        const dayCompletions = (completions || []).filter((c) => {
          const completedDate = new Date(c.completed_at);
          return completedDate.toDateString() === dayDate.toDateString();
        });

        weekDays.push({
          dayOfWeek: i,
          completed: dayCompletions.length,
          date: dayDate.toISOString(),
        });
      }

      return {
        dailyTarget: 3, // Default goal - could be stored in profile
        weekDays,
        currentWeekStart: weekStart.toISOString(),
      };
    } catch (error) {
      console.error('[WatchService] Fetch weekly goal failed:', error);
      return this.getDefaultWeeklyGoal();
    }
  }

  private getDefaultWeeklyGoal(): WatchWeeklyGoal {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const dayOfWeek = weekStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + mondayOffset);

    return {
      dailyTarget: 3,
      weekDays: Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        completed: 0,
        date: new Date(weekStart.getTime() + i * 86400000).toISOString(),
      })),
      currentWeekStart: weekStart.toISOString(),
    };
  }

  private async fetchLearningPaths(): Promise<WatchLearningPath[]> {
    if (!this.currentUserId) return [];

    try {
      // Fetch learning paths with exercises
      const { data: paths } = await supabase
        .from('learning_paths')
        .select(
          `
          id,
          title,
          description,
          icon,
          image,
          order_index,
          is_locked,
          active,
          learning_path_exercises (
            id,
            order_index,
            exercise:exercises (
              id,
              title,
              description,
              icon,
              duration,
              has_quiz,
              youtube_url,
              repeat_count
            )
          )
        `,
        )
        .eq('active', true)
        .order('order_index');

      if (!paths) return [];

      // Fetch user's completions
      const { data: completions } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', this.currentUserId);

      const completedIds = new Set((completions || []).map((c) => c.exercise_id));

      return paths.map((path) => {
        const exercises = (path.learning_path_exercises || [])
          .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          .map((lpe: any) => {
            const ex = lpe.exercise;
            if (!ex) return null;

            return {
              id: ex.id,
              title: this.getLocalizedText(ex.title),
              description: this.getLocalizedText(ex.description),
              icon: ex.icon || 'car.fill',
              duration: ex.duration || null,
              isCompleted: completedIds.has(ex.id),
              hasQuiz: ex.has_quiz || false,
              orderIndex: lpe.order_index || 0,
              youtubeUrl: ex.youtube_url || null,
              repeatCount: ex.repeat_count || null,
              completedRepeats: null, // Would need virtual_repeat_completions query
            };
          })
          .filter(Boolean) as WatchExercise[];

        const completedCount = exercises.filter((e) => e.isCompleted).length;

        return {
          id: path.id,
          title: this.getLocalizedText(path.title),
          description: this.getLocalizedText(path.description),
          icon: path.icon || 'book.fill',
          imageUrl: path.image,
          orderIndex: path.order_index,
          isLocked: path.is_locked || false,
          totalExercises: exercises.length,
          completedExercises: completedCount,
          exercises,
        };
      });
    } catch (error) {
      console.error('[WatchService] Fetch learning paths failed:', error);
      return [];
    }
  }

  private async fetchAchievements(): Promise<WatchAchievement[]> {
    // Placeholder achievements - implement based on your achievements system
    // You would query your achievements table here

    const exerciseCount = await this.getExerciseCount();

    return [
      {
        id: '1',
        title: 'First Steps',
        description: 'Complete your first exercise',
        icon: 'star.fill',
        unlockedAt: exerciseCount >= 1 ? new Date().toISOString() : null,
        progress: Math.min(exerciseCount, 1),
        target: 1,
        category: 'milestone',
      },
      {
        id: '2',
        title: 'Getting Started',
        description: 'Complete 10 exercises',
        icon: 'flame.fill',
        unlockedAt: exerciseCount >= 10 ? new Date().toISOString() : null,
        progress: Math.min(exerciseCount, 10),
        target: 10,
        category: 'progress',
      },
      {
        id: '3',
        title: 'Road Scholar',
        description: 'Complete 50 exercises',
        icon: 'graduationcap.fill',
        unlockedAt: exerciseCount >= 50 ? new Date().toISOString() : null,
        progress: Math.min(exerciseCount, 50),
        target: 50,
        category: 'progress',
      },
    ];
  }

  private async getExerciseCount(): Promise<number> {
    if (!this.currentUserId) return 0;

    try {
      const { count } = await supabase
        .from('learning_path_exercise_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.currentUserId);

      return count || 0;
    } catch {
      return 0;
    }
  }

  private async fetchNearbyRoutes(): Promise<WatchRoute[]> {
    try {
      // Fetch public routes (simplified - you'd want location-based filtering)
      const { data: routes } = await supabase
        .from('routes')
        .select(
          `
          id,
          name,
          description,
          difficulty,
          is_public,
          metadata,
          waypoint_details,
          creator:profiles!routes_created_by_fkey (
            full_name
          )
        `,
        )
        .eq('is_public', true)
        .limit(10);

      if (!routes) return [];

      return routes.map((route) => {
        const waypoints = (route.waypoint_details || route.metadata?.waypoints || []).map(
          (wp: any) => ({
            latitude: wp.lat || wp.latitude,
            longitude: wp.lng || wp.longitude,
            title: wp.title || null,
          }),
        );

        return {
          id: route.id,
          name: route.name,
          description: route.description || null,
          difficulty: route.difficulty || null,
          distanceKm: null, // Calculate from waypoints if needed
          estimatedMinutes: null,
          waypoints,
          isPublic: route.is_public,
          creatorName: (route.creator as any)?.full_name || null,
          exerciseCount: 0, // Would need exercises query
        };
      });
    } catch (error) {
      console.error('[WatchService] Fetch routes failed:', error);
      return [];
    }
  }

  private async fetchStreakInfo(): Promise<WatchStreakInfo> {
    if (!this.currentUserId) {
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    try {
      const { data: completions } = await supabase
        .from('learning_path_exercise_completions')
        .select('completed_at')
        .eq('user_id', this.currentUserId)
        .order('completed_at', { ascending: false })
        .limit(60);

      const streak = this.calculateStreak(completions || []);

      return {
        currentStreak: streak.current,
        longestStreak: streak.longest,
        lastActivityDate: completions?.[0]?.completed_at || null,
      };
    } catch (error) {
      console.error('[WatchService] Fetch streak failed:', error);
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }
  }

  private calculateStreak(completions: { completed_at: string }[]): {
    current: number;
    longest: number;
  } {
    if (completions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique days with activity
    const activityDays = new Set<string>();
    for (const c of completions) {
      const date = new Date(c.completed_at);
      activityDays.add(date.toDateString());
    }

    const sortedDays = Array.from(activityDays)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDays.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if there's activity today or yesterday to continue streak
    const mostRecentDay = sortedDays[0];
    mostRecentDay.setHours(0, 0, 0, 0);

    if (
      mostRecentDay.getTime() === today.getTime() ||
      mostRecentDay.getTime() === yesterday.getTime()
    ) {
      currentStreak = 1;

      for (let i = 1; i < sortedDays.length; i++) {
        const currentDay = sortedDays[i - 1];
        const prevDay = sortedDays[i];

        currentDay.setHours(0, 0, 0, 0);
        prevDay.setHours(0, 0, 0, 0);

        const diff = (currentDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { current: currentStreak, longest: currentStreak };
  }
}

// Export singleton instance
export const WatchService = new WatchServiceClass();
