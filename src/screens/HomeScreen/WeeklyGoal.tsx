import React, { useState, useEffect, useRef } from 'react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { TouchableOpacity, Modal, Alert, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useTranslation } from '../../contexts/TranslationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCelebration } from '../../contexts/CelebrationContext';

interface DayProgress {
  day: string;
  date: string;
  completed: boolean;
  progress: number;
  exercises: number;
}

interface WeeklyGoalProps {
  activeUserId?: string | null;
  onDateSelected?: (date: Date) => void;
  selectedDate?: Date;
}

interface GoalSettings {
  dailyGoal: number;
  goalType: 'weekly' | 'monthly';
  weeklyTarget: number;
  monthlyTarget: number;
}

// ProgressCircle component for individual days
const DayProgressCircle = ({
  progress,
  size = 32,
  color = '#00E6C3',
  bg = '#E5E5E5',
  completed = false,
}: {
  progress: number;
  size?: number;
  color?: string;
  bg?: string;
  completed?: boolean;
}) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = Math.max(0, Math.min(progress, 1));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={completed ? '#01E6C3' : color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progressValue)}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
};

// Get week's dates based on offset (0 = current week, -1 = last week, etc.)
const getWeekDates = (weekOffset: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for consistent comparison

  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Calculate days to get to Monday

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(0, 0, 0, 0); // Ensure consistent time for comparison
    weekDates.push(date);
  }

  return weekDates;
};

export const WeeklyGoal = React.memo(function WeeklyGoal({
  activeUserId,
  onDateSelected,
  selectedDate: externalSelectedDate,
}: WeeklyGoalProps) {
  const { user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { t } = useTranslation();
  const { showCelebration } = useCelebration();
  const colorScheme = useColorScheme();

  const [weeklyProgress, setWeeklyProgress] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(5); // Default goal: 5 exercises per week

  // Week navigation state
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  // Goal settings modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    dailyGoal: 5,
    goalType: 'weekly',
    weeklyTarget: 35, // 5 exercises × 7 days
    monthlyTarget: 150, // 5 exercises × 30 days
  });
  const [tempGoalSettings, setTempGoalSettings] = useState<GoalSettings>(goalSettings);

  // Celebration modal state - now using global context (removed local state)

  // Removed learning content sheet states - now handled by DailyStatus button

  // Use effective user ID (activeUserId prop, activeStudentId from context, or current user)
  const effectiveUserId = activeUserId || activeStudentId || user?.id || null;

  // Celebration detection function
  const checkForCelebration = React.useCallback(
    (progressData: DayProgress[]) => {
      if (!effectiveUserId) return;

      const completedDays = progressData.filter((day) => day.completed).length;
      const totalExercises = progressData.reduce((sum, day) => sum + day.exercises, 0);
      const weeklyProgressPercent = (completedDays / 7) * 100;

      // Check for different celebration triggers
      let shouldCelebrate = false;
      let celebrationTitle = '';

      if (completedDays === 7) {
        // Perfect week - all 7 days completed
        shouldCelebrate = true;
        celebrationTitle = t('celebration.perfectWeek.title') || 'Perfect Week! 🏆';
      } else if (completedDays >= 5 && weeklyProgressPercent >= 70) {
        // Weekly goal achieved (5+ days or 70%+ completion)
        shouldCelebrate = true;
        celebrationTitle = t('celebration.weeklyGoal.title') || 'Weekly Goal Achieved! 🎯';
      } else if (totalExercises >= weeklyGoal * 5) {
        // High exercise count milestone
        shouldCelebrate = true;
        celebrationTitle = t('celebration.exerciseMilestone.title') || 'Exercise Milestone! 💪';
      }

      if (shouldCelebrate) {
        // Use global celebration context
        showCelebration({
          learningPathTitle: { en: celebrationTitle, sv: celebrationTitle },
          completedExercises: completedDays,
          totalExercises: 7,
          timeSpent: totalExercises * 5, // Estimate 5 minutes per exercise
          streakDays: completedDays,
        });
      }
    },
    [effectiveUserId, showCelebration, weeklyGoal, t],
  );

  // Load weekly progress data
  const loadWeeklyProgress = React.useCallback(async () => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      const weekDates = getWeekDates(currentWeekOffset);

      // Get user's exercise completions for this week
      const startOfWeek = weekDates[0];
      const endOfWeek = weekDates[6];
      endOfWeek.setHours(23, 59, 59, 999); // End of Sunday

      const { data: completions, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id, completed_at')
        .eq('user_id', effectiveUserId)
        .gte('completed_at', startOfWeek.toISOString())
        .lte('completed_at', endOfWeek.toISOString());

      if (error) {
        setLoading(false);
        return;
      }

      // Group completions by date
      const completionsByDate: Record<string, number> = {};
      completions?.forEach((completion) => {
        const date = new Date(completion.completed_at).toDateString();
        completionsByDate[date] = (completionsByDate[date] || 0) + 1;
      });

      // Create day progress data
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const progressData: DayProgress[] = weekDates.map((date, index) => {
        const dateString = date.toDateString();
        const exercises = completionsByDate[dateString] || 0;
        const completed = exercises >= weeklyGoal;
        const progress = Math.min(exercises / weeklyGoal, 1);

        return {
          day: dayNames[index],
          date: date.toDateString(), // Use toDateString for consistent comparison
          completed,
          progress,
          exercises,
        };
      });

      setWeeklyProgress(progressData);

      // Check for celebration triggers
      checkForCelebration(progressData);
    } catch (error) {
      console.error('Error loading weekly progress:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, weeklyGoal, currentWeekOffset, checkForCelebration]);

  // Load progress when user changes or week changes
  useEffect(() => {
    loadWeeklyProgress();
  }, [loadWeeklyProgress]);

  // Load goal settings from AsyncStorage
  const loadGoalSettings = React.useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      const settingsKey = `weekly_goal_settings_${effectiveUserId}`;
      const saved = await AsyncStorage.getItem(settingsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setGoalSettings(parsed);
        setTempGoalSettings(parsed);
        setWeeklyGoal(parsed.dailyGoal);
      }
    } catch (error) {
      console.error('Error loading goal settings:', error);
    }
  }, [effectiveUserId]);

  // Save goal settings to AsyncStorage
  const saveGoalSettings = React.useCallback(
    async (settings: GoalSettings) => {
      if (!effectiveUserId) return;

      try {
        const settingsKey = `weekly_goal_settings_${effectiveUserId}`;
        await AsyncStorage.setItem(settingsKey, JSON.stringify(settings));
        setGoalSettings(settings);
        setWeeklyGoal(settings.dailyGoal);
      } catch (error) {
        console.error('Error saving goal settings:', error);
      }
    },
    [effectiveUserId],
  );

  // Load settings on mount
  useEffect(() => {
    loadGoalSettings();
  }, [effectiveUserId, loadGoalSettings]);

  // Handle goal settings modal
  const openGoalModal = React.useCallback(() => {
    setTempGoalSettings(goalSettings);
    setShowGoalModal(true);
  }, [goalSettings]);

  const closeGoalModal = React.useCallback(() => {
    setShowGoalModal(false);
    setTempGoalSettings(goalSettings);
  }, [goalSettings]);

  const saveGoalSettingsAndClose = React.useCallback(() => {
    if (tempGoalSettings.dailyGoal < 1 || tempGoalSettings.dailyGoal > 50) {
      Alert.alert('Invalid Goal', 'Daily goal must be between 1 and 50 exercises.');
      return;
    }

    const newSettings = {
      ...tempGoalSettings,
      weeklyTarget: tempGoalSettings.dailyGoal * 7,
      monthlyTarget: tempGoalSettings.dailyGoal * 30,
    };

    saveGoalSettings(newSettings);
    setShowGoalModal(false);
  }, [tempGoalSettings, saveGoalSettings]);

  // Animation ref for smooth transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Week navigation functions with smooth transitions
  const goToPreviousWeek = React.useCallback(() => {
    try {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentWeekOffset((prev) => {
          const newOffset = prev - 1;
          return newOffset;
        });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      console.error('🗓️ [WeeklyGoal] Error in goToPreviousWeek:', error);
    }
  }, [fadeAnim, setCurrentWeekOffset]);

  const goToNextWeek = React.useCallback(() => {
    try {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentWeekOffset((prev) => {
          const newOffset = prev + 1;
          return newOffset;
        });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      console.error('🗓️ [WeeklyGoal] Error in goToNextWeek:', error);
    }
  }, [fadeAnim, setCurrentWeekOffset]);

  // Swipe gesture for week navigation
  const swipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .minDistance(30) // Minimum distance before gesture activates
        .activeOffsetX([-30, 30]) // Only activate for horizontal swipes
        .failOffsetY([-30, 30]) // Fail if vertical movement is too much
        .onEnd((event) => {
          try {
            const { translationX, velocityX } = event;

            // Only respond to horizontal swipes with sufficient movement or velocity
            if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 500) {
              if (translationX > 0 || velocityX > 0) {
                // Swipe right - go to previous week
                runOnJS(goToPreviousWeek)();
              } else {
                // Swipe left - go to next week
                runOnJS(goToNextWeek)();
              }
            }
          } catch (error) {
            console.error('🗓️ [WeeklyGoal] Error in swipe gesture:', error);
          }
        }),
    [goToPreviousWeek, goToNextWeek],
  );

  // Calculate weekly stats
  const completedDays = React.useMemo(
    () => weeklyProgress.filter((day) => day.completed).length,
    [weeklyProgress],
  );
  const weeklyProgressPercent = (completedDays / 7) * 100;

  if (loading) {
    return null;
  }

  return (
    <YStack
      // backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8'}
      marginHorizontal="$0"
      marginBottom="$4"
      padding="$0"
      borderRadius="$4"
    >
      {/* Header */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$3"
        paddingHorizontal="$4"
      >
        <XStack alignItems="center" gap="$2">
          <Text fontSize="$5" fontWeight="bold" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
            {(() => {
              const translated = t('weeklyGoals.title');
              return translated === 'weeklyGoals.title' ? 'Weekly Goal' : translated;
            })()}
          </Text>
        </XStack>

        <XStack alignItems="center">
          {/* Simple percentage next to title */}
          <Text
            fontSize="$3"
            color={colorScheme === 'dark' ? '#CCC' : '#666'}
            fontWeight="300"
            paddingHorizontal="$2"
          >
            {Math.round(weeklyProgressPercent)}%
          </Text>
          <TouchableOpacity
            onPress={openGoalModal}
            style={{
              padding: 0,
              borderRadius: 12,
            }}
          >
            <Feather name="settings" size={14} color={colorScheme === 'dark' ? '#CCC' : '#666'} />
          </TouchableOpacity>
        </XStack>
      </XStack>

      {/* Days of the week with navigation arrows */}
      <XStack justifyContent="space-between" alignItems="center">
        {/* Previous Week Arrow */}
        <TouchableOpacity
          onPress={goToPreviousWeek}
          style={{
            padding: 8,
            borderRadius: 20,
            // backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
          }}
        >
          <Feather name="chevron-left" size={16} color={colorScheme === 'dark' ? '#CCC' : '#666'} />
        </TouchableOpacity>

        {/* Weekdays - Animated with Swipe Support */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <XStack
              flex={1}
              justifyContent="space-around"
              alignItems="center"
              paddingHorizontal="$0"
              gap="$2"
            >
              {weeklyProgress.length > 0
                ? weeklyProgress.map((day) => {
                    const today = new Date();
                    const todayString = today.toDateString();
                    const isToday = day.date === todayString;

                    // Check if this day is in the future
                    const dayDate = new Date(day.date);
                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);
                    const isFuture = dayDate > todayEnd;

                    const isSelected =
                      externalSelectedDate && day.date === externalSelectedDate.toDateString();

                    return (
                      <YStack
                        key={day.date}
                        alignItems="center"
                        gap="$1"
                        backgroundColor={
                          isSelected
                            ? 'rgba(0, 230, 195, 0.05)'
                            : colorScheme === 'dark'
                              ? '#1A1A1A'
                              : '#F8F8F8'
                        }
                        padding="$2"
                        borderRadius="$4"
                        style={{
                          padding: 4,
                          borderRadius: 16,
                          borderWidth: isSelected ? 2 : 2,
                          borderColor: isSelected ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                          // backgroundColor: isSelected
                          //   ? 'rgba(0, 230, 195, 0.15)'
                          //   : (colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8'),
                        }}
                      >
                        {/* Day circle */}
                        <TouchableOpacity
                          activeOpacity={isFuture ? 1 : 0.7}
                          disabled={isFuture}
                          style={{
                            alignItems: 'center',
                            opacity: isFuture ? 0.5 : 1,
                          }}
                          onPress={() => {
                            const selectedDayDate = new Date(day.date);
                            const today = new Date();

                            // If clicking the same selected date, go back to today
                            if (
                              externalSelectedDate &&
                              day.date === externalSelectedDate.toDateString()
                            ) {
                              if (onDateSelected) {
                                onDateSelected(today);
                              }
                              return;
                            }

                            // Otherwise, select the new date
                            if (onDateSelected) {
                              onDateSelected(selectedDayDate);
                            }
                          }}
                        >
                          <DayProgressCircle
                            progress={isFuture ? 0 : day.progress}
                            size={isToday ? 28 : 28}
                            color={
                              isFuture
                                ? colorScheme === 'dark'
                                  ? '#333'
                                  : '#DDD'
                                : day.completed
                                  ? '#01E6C3'
                                  : '#00E6C3'
                            }
                            bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                            completed={!isFuture && day.completed}
                          />
                          {day.exercises > 0 && !isFuture && (
                            <Text
                              fontSize={9}
                              fontWeight="bold"
                              color={day.completed ? '#01E6C3' : '#00E6C3'}
                              style={{ position: 'absolute', top: isToday ? 9 : 9 }}
                            >
                              {day.exercises}
                            </Text>
                          )}

                          {/* Day name and date */}
                          <YStack alignItems="center" gap="$0.5">
                            <Text
                              fontSize={isToday ? '$2' : '$2'}
                              color={
                                isFuture
                                  ? colorScheme === 'dark'
                                    ? '#444'
                                    : '#BBB'
                                  : isToday
                                    ? '#00E6C3'
                                    : colorScheme === 'dark'
                                      ? '#CCC'
                                      : '#666'
                              }
                              fontWeight={day.completed || isToday ? 'bold' : 'normal'}
                            >
                              {day.day}
                            </Text>

                            {/* Date - more prominent for today */}
                            <Text
                              fontSize={isToday ? '$2' : '$2'}
                              color={
                                isFuture
                                  ? colorScheme === 'dark'
                                    ? '#333'
                                    : '#CCC'
                                  : isToday
                                    ? '#00E6C3'
                                    : colorScheme === 'dark'
                                      ? '#AAA'
                                      : '#555'
                              }
                              fontWeight="600"
                            >
                              {new Date(day.date).getDate()}/
                              {String(new Date(day.date).getMonth() + 1).padStart(2, '0')}
                            </Text>
                          </YStack>
                        </TouchableOpacity>
                      </YStack>
                    );
                  })
                : // Placeholder circles while loading to prevent jumping
                  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, index) => (
                    <YStack key={`placeholder-${dayName}-${index}`} alignItems="center" gap="$1">
                      <DayProgressCircle
                        progress={0}
                        size={32}
                        color="#00E6C3"
                        bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                        completed={false}
                      />
                      <YStack alignItems="center" gap="$0.5">
                        <Text
                          fontSize="$2"
                          color={colorScheme === 'dark' ? '#555' : '#AAA'}
                          fontWeight="normal"
                        >
                          {dayName}
                        </Text>
                        <Text
                          fontSize="$1"
                          color={colorScheme === 'dark' ? '#444' : '#BBB'}
                          fontWeight="600"
                        >
                          -
                        </Text>
                      </YStack>
                    </YStack>
                  ))}
            </XStack>
          </Animated.View>
        </GestureDetector>

        {/* Next Week Arrow */}
        <TouchableOpacity
          onPress={goToNextWeek}
          style={{
            padding: 8,
            borderRadius: 20,
            // backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
          }}
        >
          <Feather
            name="chevron-right"
            size={16}
            color={colorScheme === 'dark' ? '#CCC' : '#666'}
          />
        </TouchableOpacity>
      </XStack>

      {/* Week info - show current week label and stats */}
      {/* <XStack justifyContent="center" alignItems="center" marginTop="$3">
        <TouchableOpacity
          onPress={goToCurrentWeek}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: weekInfo.isCurrentWeek ? '#00E6C3' : (colorScheme === 'dark' ? '#333' : '#E5E5E5'),
          }}
        >
          <Text 
            fontSize="$2" 
            fontWeight="600"
            color={weekInfo.isCurrentWeek ? '#000' : (colorScheme === 'dark' ? '#CCC' : '#666')}
          >
            {weekInfo.weekLabel}
          </Text>
        </TouchableOpacity>
      </XStack> */}

      {/* Goal Settings Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={closeGoalModal}
      >
        <BlurView
          style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
          intensity={10}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={closeGoalModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
            }}
          >
            {/* Modal Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text
                fontSize="$6"
                fontWeight="bold"
                color={colorScheme === 'dark' ? '#FFF' : '#000'}
              >
                {t('weeklyGoals.goalSettings') || 'Goal Settings'}
              </Text>
              <TouchableOpacity onPress={closeGoalModal}>
                <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
              </TouchableOpacity>
            </XStack>

            {/* Daily Goal Input */}
            <YStack gap="$3" marginBottom="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                {t('weeklyGoals.dailyGoal') || 'Daily Exercise Goal'}
              </Text>
              <Input
                value={tempGoalSettings.dailyGoal.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  setTempGoalSettings((prev) => ({
                    ...prev,
                    dailyGoal: num,
                    weeklyTarget: num * 7,
                    monthlyTarget: num * 30,
                  }));
                }}
                keyboardType="numeric"
                placeholder={t('weeklyGoals.enterDailyGoal') || 'Enter daily goal'}
                backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                borderColor={colorScheme === 'dark' ? '#444' : '#E5E5E5'}
                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                fontSize="$4"
                padding="$3"
              />
              <Text fontSize="$2" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                {t('weeklyGoals.target') || 'Target'}: {tempGoalSettings.dailyGoal * 7}{' '}
                {t('weeklyGoals.exercisesPerWeek') || 'exercises per week'},{' '}
                {tempGoalSettings.dailyGoal * 30}{' '}
                {t('weeklyGoals.exercisesPerMonth') || 'per month'}
              </Text>
            </YStack>

            {/* Goal Type Selection */}
            <YStack gap="$3" marginBottom="$4">
              <Text fontSize="$4" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                {t('weeklyGoals.goalType') || 'Goal Type'}
              </Text>
              <XStack gap="$2">
                <TouchableOpacity
                  onPress={() => setTempGoalSettings((prev) => ({ ...prev, goalType: 'weekly' }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      tempGoalSettings.goalType === 'weekly'
                        ? '#00E6C3'
                        : colorScheme === 'dark'
                          ? '#333'
                          : '#F5F5F5',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    color={
                      tempGoalSettings.goalType === 'weekly'
                        ? '#000'
                        : colorScheme === 'dark'
                          ? '#FFF'
                          : '#000'
                    }
                    fontWeight={tempGoalSettings.goalType === 'weekly' ? 'bold' : 'normal'}
                  >
                    {t('weeklyGoals.weekly') || 'Weekly'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTempGoalSettings((prev) => ({ ...prev, goalType: 'monthly' }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      tempGoalSettings.goalType === 'monthly'
                        ? '#00E6C3'
                        : colorScheme === 'dark'
                          ? '#333'
                          : '#F5F5F5',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    color={
                      tempGoalSettings.goalType === 'monthly'
                        ? '#000'
                        : colorScheme === 'dark'
                          ? '#FFF'
                          : '#000'
                    }
                    fontWeight={tempGoalSettings.goalType === 'monthly' ? 'bold' : 'normal'}
                  >
                    {t('weeklyGoals.monthly') || 'Monthly'}
                  </Text>
                </TouchableOpacity>
              </XStack>
            </YStack>

            {/* How it works section */}
            <YStack
              gap="$3"
              marginBottom="$4"
              padding="$3"
              backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F8F8'}
              borderRadius="$3"
            >
              <Text fontSize="$4" fontWeight="600" color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                📊 How Weekly Goals Work
              </Text>
              <Text fontSize="$3" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                • Complete exercises daily to fill your progress circles
              </Text>
              <Text fontSize="$3" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                • Green circles = daily goal achieved
              </Text>
              <Text fontSize="$3" color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                • Use arrows to view past or future weeks
              </Text>
            </YStack>

            {/* Action Buttons */}
            <XStack gap="$3" justifyContent="center">
              <TouchableOpacity
                onPress={closeGoalModal}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                  alignItems: 'center',
                }}
              >
                <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                  {t('weeklyGoals.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveGoalSettingsAndClose}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#00E6C3',
                  alignItems: 'center',
                }}
              >
                <Text color="#000" fontWeight="bold">
                  {t('weeklyGoals.saveGoals') || 'Save Goals'}
                </Text>
              </TouchableOpacity>
            </XStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Celebration Modal - now handled globally */}
    </YStack>
  );
});
