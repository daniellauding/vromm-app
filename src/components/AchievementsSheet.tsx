import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';
import Svg, { Circle } from 'react-native-svg';

const { height } = Dimensions.get('window');

interface AchievementsSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface Achievement {
  id: string;
  icon: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number; // 0-100
  target?: number;
  current?: number;
}

interface WeeklyGoal {
  week: string;
  target: number;
  completed: number;
  percentage: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

export function AchievementsSheet({ visible, onClose }: AchievementsSheetProps) {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const { t, language } = useTranslation();
  const { getEffectiveUserId } = useStudentSwitch();
  const effectiveUserId = getEffectiveUserId();

  // Gesture handling
  const translateY = useSharedValue(height);
  const backdropOpacityShared = useSharedValue(0);

  // Snap points (measured from bottom of screen)
  const snapPoints = useMemo(
    () => ({
      dismissed: height,
      mini: height * 0.7, // 30% visible
      small: height * 0.5, // 50% visible
      medium: height * 0.35, // 65% visible
      large: height * 0.1, // 90% visible (10% from top)
    }),
    [],
  );

  const [currentSnapPoint, setCurrentSnapPoint] = useState<'large' | 'medium' | 'small' | 'mini'>(
    'large',
  );

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  });
  const [totalExercises, setTotalExercises] = useState(0);
  const [completedExercises, setCompletedExercises] = useState(0);
  const [totalPaths, setTotalPaths] = useState(0);
  const [completedPaths, setCompletedPaths] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';

  // Helper to get translation with fallback
  const getT = (key: string, fallback: string): string => {
    const translation = t(key);
    // If translation returns the key itself, use fallback
    return translation === key ? fallback : translation;
  };

  // Open/close animations
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(snapPoints.large, { damping: 20 });
      backdropOpacityShared.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(height, { duration: 200 });
      backdropOpacityShared.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, backdropOpacityShared, snapPoints.large]);

  // Backdrop animated style
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityShared.value,
  }));

  // Sheet animated style
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Pan gesture
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      const newY = Math.max(
        snapPoints.large,
        Math.min(height, translateY.value + event.translationY),
      );
      translateY.value = newY;
    })
    .onEnd((event) => {
      const velocity = event.velocityY;
      const currentY = translateY.value;

      // Determine snap point based on velocity and position
      if (velocity > 500 || currentY > snapPoints.mini) {
        // Close
        translateY.value = withTiming(height, { duration: 200 });
        backdropOpacityShared.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else if (currentY > snapPoints.small) {
        translateY.value = withSpring(snapPoints.mini, { damping: 20 });
        runOnJS(setCurrentSnapPoint)('mini');
      } else if (currentY > snapPoints.medium) {
        translateY.value = withSpring(snapPoints.small, { damping: 20 });
        runOnJS(setCurrentSnapPoint)('small');
      } else if (currentY > snapPoints.large) {
        translateY.value = withSpring(snapPoints.medium, { damping: 20 });
        runOnJS(setCurrentSnapPoint)('medium');
      } else {
        translateY.value = withSpring(snapPoints.large, { damping: 20 });
        runOnJS(setCurrentSnapPoint)('large');
      }
    });

  const fetchWeeklyGoal = React.useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      // Get completions for this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: weekCompletions } = await supabase
        .from('learning_path_exercise_completions')
        .select('id')
        .eq('user_id', effectiveUserId)
        .gte('completed_at', startOfWeek.toISOString());

      const completed = weekCompletions?.length || 0;
      const target = 10; // Default weekly goal

      setWeeklyGoal({
        week: startOfWeek.toISOString(),
        target,
        completed,
        percentage: Math.round((completed / target) * 100),
      });
    } catch (error) {
      console.error('Error fetching weekly goal:', error);
    }
  }, [effectiveUserId]);

  const fetchStreakData = React.useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      const { data: completions } = await supabase
        .from('learning_path_exercise_completions')
        .select('completed_at')
        .eq('user_id', effectiveUserId)
        .order('completed_at', { ascending: false });

      if (!completions || completions.length === 0) {
        setStreakData({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });
        return;
      }

      // Calculate current streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastDate: Date | null = null;

      const uniqueDates = new Set<string>();
      completions.forEach((c) => {
        const date = new Date(c.completed_at);
        date.setHours(0, 0, 0, 0);
        uniqueDates.add(date.toISOString());
      });

      const sortedDates = Array.from(uniqueDates)
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      // Check current streak
      for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === currentStreak) {
          currentStreak++;
          lastDate = date;
        } else {
          break;
        }
      }

      // Calculate longest streak
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = sortedDates[i - 1];
          const currDate = sortedDates[i];
          const diff = Math.floor(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (diff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      setStreakData({
        currentStreak,
        longestStreak,
        lastActivityDate: lastDate ? lastDate.toISOString() : null,
      });
    } catch (error) {
      console.error('Error fetching streak data:', error);
    }
  }, [effectiveUserId]);

  // Fetch achievements data
  const fetchAchievementsData = React.useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      // Fetch all learning paths with exercises (using relationship)
      const { data: paths, error: pathsError } = await supabase
        .from('learning_paths')
        .select('id, learning_path_exercises(id, repeat_count, learning_path_id)')
        .eq('active', true);

      if (pathsError) {
        return;
      }

      if (!paths || paths.length === 0) {
        return;
      }

      const pathCount = paths?.length || 0;
      setTotalPaths(pathCount);

      // Flatten exercises from all paths
      const exercises = paths?.flatMap((path) => path.learning_path_exercises || []) || [];

      let totalEx = 0;
      exercises?.forEach((ex) => {
        totalEx += ex.repeat_count || 1;
      });

      setTotalExercises(totalEx);

      // Fetch completions (match Header.tsx query that works)
      const { data: completions } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      // Fetch virtual completions
      const { data: virtualCompletions } = await supabase
        .from('virtual_repeat_completions')
        .select('exercise_id, repeat_number')
        .eq('user_id', effectiveUserId);

      // Calculate completed exercises (count each repeat as one)
      const completedExerciseIds = new Set(completions?.map((c) => c.exercise_id) || []);
      let completedEx = 0;

      exercises?.forEach((ex) => {
        if (completedExerciseIds.has(ex.id)) {
          const repeatCount = ex.repeat_count || 1;
          if (repeatCount === 1) {
            // Simple exercise - count as 1
            completedEx += 1;
          } else {
            // Exercise with repeats - count base + virtual repeats
            const virtualDone =
              virtualCompletions?.filter((vc) => vc.exercise_id === ex.id).length || 0;
            completedEx += 1 + virtualDone; // Base + virtual repeats
          }
        }
      });

      setCompletedExercises(completedEx);

      // Calculate completed paths
      const pathsCompleted = new Set<string>();
      const pathExerciseMap = new Map<string, typeof exercises>();

      exercises?.forEach((ex) => {
        if (!pathExerciseMap.has(ex.learning_path_id)) {
          pathExerciseMap.set(ex.learning_path_id, []);
        }
        pathExerciseMap.get(ex.learning_path_id)!.push(ex);
      });

      pathExerciseMap.forEach((pathExercises, pathId) => {
        const allExercisesComplete = pathExercises.every((ex) => {
          const baseCompleted = completedExerciseIds.has(ex.id);
          if (!baseCompleted) return false;

          const repeatCount = ex.repeat_count || 1;
          if (repeatCount === 1) return true;

          const virtualDone =
            virtualCompletions?.filter((vc) => vc.exercise_id === ex.id).length || 0;
          return virtualDone + 1 >= repeatCount;
        });

        if (allExercisesComplete && pathExercises.length > 0) {
          pathsCompleted.add(pathId);
        }
      });

      setCompletedPaths(pathsCompleted.size);

      // Fetch route stats
      const { data: createdRoutes } = await supabase
        .from('routes')
        .select('id')
        .eq('creator_id', effectiveUserId);

      const { data: savedRoutes } = await supabase
        .from('saved_routes')
        .select('id')
        .eq('user_id', effectiveUserId);

      const { data: drivenRoutes } = await supabase
        .from('driven_routes')
        .select('id')
        .eq('user_id', effectiveUserId);

      const createdCount = createdRoutes?.length || 0;
      const savedCount = savedRoutes?.length || 0;
      const drivenCount = drivenRoutes?.length || 0;

      // Fetch daily status stats
      const { data: dailyStatuses } = await supabase
        .from('daily_status')
        .select('id')
        .eq('user_id', effectiveUserId);

      const statusCount = dailyStatuses?.length || 0;

      // Generate achievements
      const achievementsList: Achievement[] = [
        {
          id: 'first_exercise',
          icon: 'check-circle',
          title: { en: 'First Exercise', sv: 'Första övningen' },
          description: { en: 'Complete your first exercise', sv: 'Slutför din första övning' },
          unlocked: completedEx >= 1,
          progress: Math.min((completedEx / 1) * 100, 100),
          target: 1,
          current: completedEx,
        },
        {
          id: 'ten_exercises',
          icon: 'zap',
          title: { en: '10 Exercises', sv: '10 övningar' },
          description: { en: 'Complete 10 exercises', sv: 'Slutför 10 övningar' },
          unlocked: completedEx >= 10,
          progress: Math.min((completedEx / 10) * 100, 100),
          target: 10,
          current: completedEx,
        },
        {
          id: 'fifty_exercises',
          icon: 'award',
          title: { en: '50 Exercises', sv: '50 övningar' },
          description: { en: 'Complete 50 exercises', sv: 'Slutför 50 övningar' },
          unlocked: completedEx >= 50,
          progress: Math.min((completedEx / 50) * 100, 100),
          target: 50,
          current: completedEx,
        },
        {
          id: 'first_path',
          icon: 'flag',
          title: { en: 'First Path Complete', sv: 'Första lektionen klar' },
          description: {
            en: 'Complete your first learning path',
            sv: 'Slutför din första lektion',
          },
          unlocked: pathsCompleted.size >= 1,
          progress: Math.min((pathsCompleted.size / 1) * 100, 100),
          target: 1,
          current: pathsCompleted.size,
        },
        {
          id: 'all_paths',
          icon: 'award',
          title: { en: 'Master', sv: 'Mästare' },
          description: { en: 'Complete ALL learning paths', sv: 'Slutför ALLA lektioner' },
          unlocked: pathsCompleted.size >= pathCount && pathCount > 0,
          progress: pathCount > 0 ? Math.min((pathsCompleted.size / pathCount) * 100, 100) : 0,
          target: pathCount,
          current: pathsCompleted.size,
        },
        {
          id: 'streak_7',
          icon: 'activity',
          title: { en: '7 Day Streak', sv: '7 dagars streak' },
          description: {
            en: 'Complete exercises 7 days in a row',
            sv: 'Slutför övningar 7 dagar i rad',
          },
          unlocked: streakData.currentStreak >= 7,
          progress: Math.min((streakData.currentStreak / 7) * 100, 100),
          target: 7,
          current: streakData.currentStreak,
        },
        // Route achievements
        {
          id: 'first_route',
          icon: 'map',
          title: { en: 'First Route', sv: 'Första rutt' },
          description: { en: 'Create your first route', sv: 'Skapa din första rutt' },
          unlocked: createdCount >= 1,
          progress: Math.min((createdCount / 1) * 100, 100),
          target: 1,
          current: createdCount,
        },
        {
          id: 'five_routes',
          icon: 'map-pin',
          title: { en: '5 Routes', sv: '5 rutter' },
          description: { en: 'Create 5 routes', sv: 'Skapa 5 rutter' },
          unlocked: createdCount >= 5,
          progress: Math.min((createdCount / 5) * 100, 100),
          target: 5,
          current: createdCount,
        },
        {
          id: 'first_saved',
          icon: 'bookmark',
          title: { en: 'Route Collector', sv: 'Rutt samlare' },
          description: { en: 'Save your first route', sv: 'Spara din första rutt' },
          unlocked: savedCount >= 1,
          progress: Math.min((savedCount / 1) * 100, 100),
          target: 1,
          current: savedCount,
        },
        {
          id: 'first_driven',
          icon: 'navigation',
          title: { en: 'First Drive', sv: 'Första körningen' },
          description: { en: 'Complete your first route', sv: 'Slutför din första rutt' },
          unlocked: drivenCount >= 1,
          progress: Math.min((drivenCount / 1) * 100, 100),
          target: 1,
          current: drivenCount,
        },
        {
          id: 'ten_drives',
          icon: 'truck',
          title: { en: '10 Drives', sv: '10 körningar' },
          description: { en: 'Complete 10 routes', sv: 'Slutför 10 rutter' },
          unlocked: drivenCount >= 10,
          progress: Math.min((drivenCount / 10) * 100, 100),
          target: 10,
          current: drivenCount,
        },
        // Daily status achievements
        {
          id: 'first_status',
          icon: 'message-circle',
          title: { en: 'First Status', sv: 'Första statusen' },
          description: {
            en: 'Share your first daily status',
            sv: 'Dela din första dagliga status',
          },
          unlocked: statusCount >= 1,
          progress: Math.min((statusCount / 1) * 100, 100),
          target: 1,
          current: statusCount,
        },
        {
          id: 'week_statuses',
          icon: 'calendar',
          title: { en: 'Week Tracker', sv: 'Veckosamlare' },
          description: { en: 'Share 7 daily statuses', sv: 'Dela 7 dagliga statusar' },
          unlocked: statusCount >= 7,
          progress: Math.min((statusCount / 7) * 100, 100),
          target: 7,
          current: statusCount,
        },
      ];

      setAchievements(achievementsList);

      // Calculate weekly goal
      await fetchWeeklyGoal();

      // Calculate streak
      await fetchStreakData();
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  }, [effectiveUserId, fetchWeeklyGoal, fetchStreakData, streakData.currentStreak]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAchievementsData();
    setRefreshing(false);
  }, [fetchAchievementsData]);

  useEffect(() => {
    if (visible) {
      fetchAchievementsData();
    }
  }, [visible, effectiveUserId, fetchAchievementsData]);

  if (!visible) return null;

  const progressPercentage =
    totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <ReanimatedAnimated.View
            style={[
              {
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              },
              backdropStyle,
            ]}
          />
        </Pressable>

        {/* Sheet */}
        <GestureDetector gesture={panGesture}>
          <ReanimatedAnimated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: height,
                backgroundColor,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
              },
              sheetStyle,
            ]}
          >
            {/* Handle */}
            <View style={{ padding: 12, alignItems: 'center' }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: borderColor,
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <XStack
              paddingHorizontal="$4"
              paddingVertical="$3"
              alignItems="center"
              justifyContent="space-between"
              borderBottomWidth={1}
              borderBottomColor={borderColor}
            >
              <Text fontSize={22} fontWeight="bold" color={textColor}>
                {getT('achievements.title', language === 'sv' ? 'Prestationer' : 'Achievements')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={textColor} />
              </TouchableOpacity>
            </XStack>

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: insets.bottom + 80,
              }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
              <YStack gap="$4">
                {/* Overall Progress */}
                <Card
                  backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                  padding="$4"
                  borderRadius={16}
                >
                  <YStack gap="$3">
                    <Text fontSize={18} fontWeight="bold" color={textColor}>
                      {getT(
                        'achievements.overallProgress',
                        language === 'sv' ? 'Total Framsteg' : 'Overall Progress',
                      )}
                    </Text>

                    <XStack alignItems="center" gap="$3">
                      <View style={{ position: 'relative' }}>
                        <Svg width={80} height={80}>
                          <Circle
                            cx={40}
                            cy={40}
                            r={35}
                            stroke={borderColor}
                            strokeWidth={6}
                            fill="none"
                          />
                          <Circle
                            cx={40}
                            cy={40}
                            r={35}
                            stroke="#00E6C3"
                            strokeWidth={6}
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 35},${2 * Math.PI * 35}`}
                            strokeDashoffset={2 * Math.PI * 35 * (1 - progressPercentage / 100)}
                            strokeLinecap="round"
                            rotation="-90"
                            origin="40,40"
                          />
                        </Svg>
                        <Text
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 80,
                            height: 80,
                            textAlign: 'center',
                            lineHeight: 80,
                          }}
                          fontSize={16}
                          color="#00E6C3"
                          fontWeight="bold"
                        >
                          {progressPercentage}%
                        </Text>
                      </View>

                      <YStack flex={1}>
                        <Text fontSize={14} color={textColor} opacity={0.7}>
                          {completedExercises} / {totalExercises}{' '}
                          {getT(
                            'achievements.exercisesCompleted',
                            language === 'sv' ? 'övningar' : 'exercises',
                          )}
                        </Text>
                        <Text fontSize={14} color={textColor} opacity={0.7}>
                          {completedPaths} / {totalPaths}{' '}
                          {getT(
                            'achievements.pathsCompleted',
                            language === 'sv' ? 'lektioner' : 'paths',
                          )}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>

                {/* Streak */}
                <Card
                  backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                  padding="$4"
                  borderRadius={16}
                >
                  <YStack gap="$2">
                    <XStack alignItems="center" gap="$2">
                      <Feather name="activity" size={20} color="#FF6B35" />
                      <Text fontSize={18} fontWeight="bold" color={textColor}>
                        {getT('achievements.streak', language === 'sv' ? 'Streak' : 'Streak')}
                      </Text>
                    </XStack>

                    <XStack justifyContent="space-around" paddingTop="$2">
                      <YStack alignItems="center" gap="$1">
                        <Text fontSize={32} fontWeight="bold" color="#FF6B35">
                          {streakData.currentStreak}
                        </Text>
                        <Text fontSize={12} color={textColor} opacity={0.7}>
                          {getT(
                            'achievements.current',
                            language === 'sv' ? 'Nuvarande' : 'Current',
                          )}
                        </Text>
                      </YStack>

                      <View style={{ width: 1, height: '100%', backgroundColor: borderColor }} />

                      <YStack alignItems="center" gap="$1">
                        <Text fontSize={32} fontWeight="bold" color="#FFD700">
                          {streakData.longestStreak}
                        </Text>
                        <Text fontSize={12} color={textColor} opacity={0.7}>
                          {getT('achievements.longest', language === 'sv' ? 'Längsta' : 'Longest')}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>

                {/* Weekly Goal */}
                {weeklyGoal && (
                  <Card
                    backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                    padding="$4"
                    borderRadius={16}
                  >
                    <YStack gap="$2">
                      <XStack alignItems="center" justifyContent="space-between">
                        <XStack alignItems="center" gap="$2">
                          <Feather name="target" size={20} color="#4B6BFF" />
                          <Text fontSize={18} fontWeight="bold" color={textColor}>
                            {getT(
                              'achievements.weeklyGoal',
                              language === 'sv' ? 'Veckomål' : 'Weekly Goal',
                            )}
                          </Text>
                        </XStack>
                        <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                          {weeklyGoal.completed} / {weeklyGoal.target}
                        </Text>
                      </XStack>

                      <View
                        style={{
                          height: 8,
                          backgroundColor: borderColor,
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.min(weeklyGoal.percentage, 100)}%`,
                            backgroundColor: '#4B6BFF',
                          }}
                        />
                      </View>
                    </YStack>
                  </Card>
                )}

                {/* Achievements List */}
                <YStack gap="$2">
                  <Text fontSize={18} fontWeight="bold" color={textColor} paddingBottom="$2">
                    {getT(
                      'achievements.unlockable',
                      language === 'sv' ? 'Prestationer' : 'Achievements',
                    )}
                  </Text>

                  {achievements.map((achievement) => (
                    <Card
                      key={achievement.id}
                      backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                      padding="$3"
                      borderRadius={12}
                      opacity={achievement.unlocked ? 1 : 0.6}
                    >
                      <XStack alignItems="center" gap="$3">
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: achievement.unlocked ? '#00E6C3' : borderColor,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather
                            name={achievement.icon as any}
                            size={24}
                            color={achievement.unlocked ? '#000' : textColor}
                          />
                        </View>

                        <YStack flex={1} gap="$1">
                          <Text fontSize={16} fontWeight="bold" color={textColor}>
                            {achievement.title[language as keyof typeof achievement.title] ||
                              achievement.title.en}
                          </Text>
                          <Text fontSize={12} color={textColor} opacity={0.7}>
                            {achievement.description[
                              language as keyof typeof achievement.description
                            ] || achievement.description.en}
                          </Text>
                          {!achievement.unlocked &&
                            achievement.target &&
                            achievement.current !== undefined && (
                              <Text fontSize={12} color="#00E6C3">
                                {achievement.current} / {achievement.target}
                              </Text>
                            )}
                        </YStack>

                        {achievement.unlocked && (
                          <Feather name="check-circle" size={24} color="#00E6C3" />
                        )}
                      </XStack>
                    </Card>
                  ))}
                </YStack>
              </YStack>
            </ScrollView>
          </ReanimatedAnimated.View>
        </GestureDetector>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
