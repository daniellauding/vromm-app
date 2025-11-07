import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { useUnlock } from '../contexts/UnlockContext';
import { useCelebration } from '../contexts/CelebrationContext';
import { useStripe } from '@stripe/stripe-react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useColorScheme } from 'react-native';
import { getTabContentPadding } from '../utils/layout';
import { CommentsSection } from './CommentsSection';
import { ReportDialog } from './report/ReportDialog';
import WebView from 'react-native-webview';
import { Image } from 'react-native';
import { Linking } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

// Exact same interfaces as ProgressScreen
interface PathExercise {
  id: string;
  learning_path_id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  order_index: number;
  youtube_url?: string;
  icon?: string;
  image?: string;
  embed_code?: string;
  created_at?: string;
  updated_at?: string;
  language_specific_media?: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  bypass_order?: boolean;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  repeat_count?: number;
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;
  has_quiz?: boolean;
  quiz_required?: boolean;
  quiz_pass_score?: number;
}

interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  order_index: number;
  active: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at: string;
  updated_at: string;
}

interface ExerciseListSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  learningPathId?: string;
  showAllPaths?: boolean;
  initialExerciseId?: string; // New prop to open a specific exercise
  onBackToAllPaths?: () => void; // New prop to go back to learning paths overview
  onExerciseCompleted?: (exerciseId: string, exerciseTitle: string) => void; // Callback when exercise is completed
}

// Progress Circle component (exact copy from ProgressScreen)
function ProgressCircle({
  percent,
  size = 56,
  color = '#00E6C3',
  bg = '#222',
}: {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percent, 1));

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
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
}

export function ExerciseListSheet({
  visible,
  onClose,
  title,
  learningPathId,
  showAllPaths = false,
  initialExerciseId,
  onBackToAllPaths,
  onExerciseCompleted,
}: ExerciseListSheetProps) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { language: lang, t } = useTranslation();
  const { activeStudentId } = useStudentSwitch();
  const { showToast } = useToast();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    unlockedPaths,
    unlockedExercises,
    userPayments,
    addUnlockedPath,
    addUnlockedExercise,
    loadUserPayments,
    loadUnlockedContent,
    isPathUnlocked,
    isExerciseUnlocked,
    hasPathPayment,
    hasExercisePayment,
  } = useUnlock();
  const { showCelebration } = useCelebration();
  const colorScheme = useColorScheme();
  const navigation = useNavigation<NavigationProp>();
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#151515' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current; // For exercise detail modal

  // Gesture handling for drag-to-resize and snap points (like RouteDetailSheet)
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);

  // Snap points for resizing (top Y coordinates like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, [height]);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);

  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;

        // Constrain to snap points range (large is smallest Y, allow dragging past mini for dismissal)
        const minPosition = snapPoints.large; // Smallest Y (show most - like expanded)
        const maxPosition = snapPoints.mini + 100; // Allow dragging past mini for dismissal
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        // Set translateY directly like RouteDetailSheet
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentState.value + translationY;

      // Only dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = snapPoints.mini;
      } else {
        // Find closest snap point
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      // Constrain target to valid range
      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.mini);

      // Animate to target position - set translateY directly like RouteDetailSheet
      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // State (exact copy from ProgressScreen)
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [exercises, setExercises] = useState<PathExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PathExercise | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [virtualRepeatCompletions, setVirtualRepeatCompletions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [reportExerciseId, setReportExerciseId] = useState<string | null>(null);

  // Modal state (local to component)
  const [pathPasswordInput, setPathPasswordInput] = useState('');
  const [exercisePasswordInput, setExercisePasswordInput] = useState('');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallPath, setPaywallPath] = useState<LearningPath | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPath, setPasswordPath] = useState<LearningPath | null>(null);

  // Get effective user ID (student switch support)
  const effectiveUserId = activeStudentId || user?.id;

  // Sound helper function with haptic feedback (like ProgressScreen)
  const playDoneSound = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/ui-done.mp3'),
        { shouldPlay: true, volume: 0.4 }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('🔊 Done sound error (may be muted):', error);
    }
  };

  // Celebration modal state - now using global context (removed local state)

  // Load shared unlock data when user changes
  useEffect(() => {
    if (effectiveUserId) {
      loadUserPayments(effectiveUserId);
      loadUnlockedContent(effectiveUserId);
      console.log('🔓 [ExerciseListSheet] Loading shared unlock data for user:', effectiveUserId);
    }
  }, [effectiveUserId, loadUserPayments, loadUnlockedContent]);

  // All the same helper functions from ProgressScreen (using shared context)
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isExercisePasswordLocked = (exercise: PathExercise): boolean => {
    return !!exercise.is_locked && !isExerciseUnlocked(exercise.id);
  };

  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  const checkPathPaywall = async (path: LearningPath): Promise<boolean> => {
    if (!path.paywall_enabled) return true;
    if (hasPathPayment(path.id)) return true;
    setPaywallPath(path);
    setShowPaywallModal(true);
    return false;
  };

  const checkPathPassword = async (path: LearningPath): Promise<boolean> => {
    if (!path.is_locked) return true;
    if (isPathUnlocked(path.id)) return true;
    setPasswordPath(path);
    setShowPasswordModal(true);
    return false;
  };

  // Load learning path data (modified for single path)
  const loadLearningPathData = useCallback(async () => {
    if (!learningPathId || !visible) return;

    try {
      setLoading(true);

      // Load the specific learning path
      const { data: pathData, error: pathError } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('id', learningPathId)
        .single();

      if (pathError || !pathData) {
        console.error('Error loading learning path:', pathError);
        return;
      }

      setDetailPath(pathData);

      // Load exercises for this path
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('learning_path_exercises')
        .select('*')
        .eq('learning_path_id', learningPathId)
        .order('order_index', { ascending: true });

      if (!exerciseError && exerciseData) {
        setExercises(exerciseData || []);

        // Load comment counts
        const ids = exerciseData.map((e: any) => e.id);
        if (ids.length > 0) {
          const { data: cc } = await supabase
            .from('comment_counts')
            .select('target_type,target_id,count')
            .eq('target_type', 'exercise')
            .in('target_id', ids);
          const map: Record<string, number> = {};
          (cc || []).forEach((r: any) => (map[r.target_id] = r.count || 0));
          setCommentCounts(map);
        }
      }
    } catch (error) {
      console.error('Error loading learning path data:', error);
    } finally {
      setLoading(false);
    }
  }, [learningPathId, visible]);

  // Load completed exercises (exact copy from ProgressScreen)
  const fetchCompletions = useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      // Fetch regular exercise completions
      const { data: regularData, error: regularError } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      // Fetch virtual repeat completions
      const { data: virtualData, error: virtualError } = await supabase
        .from('virtual_repeat_completions')
        .select('exercise_id, repeat_number')
        .eq('user_id', effectiveUserId);

      if (!regularError) {
        const completions = regularData?.map((c: { exercise_id: string }) => c.exercise_id) || [];
        setCompletedIds(completions);
      }

      if (!virtualError) {
        const virtualCompletions =
          virtualData?.map(
            (c: { exercise_id: string; repeat_number: number }) =>
              `${c.exercise_id}-virtual-${c.repeat_number}`,
          ) || [];
        setVirtualRepeatCompletions(virtualCompletions);
      }
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  }, [effectiveUserId]);

  // Toggle completion for an exercise with all its repeats (ALIGNED WITH PROGRESSSCREEN)
  const toggleCompletionWithRepeats = async (
    exerciseId: string,
    includeAllRepeats: boolean = false,
  ) => {
    if (!effectiveUserId) return;

    // Find the exercise details
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    const isDone = completedIds.includes(exerciseId);
    const shouldMarkDone = !isDone;

    console.log('🎯 [ExerciseListSheet] Toggle Completion With Repeats:', {
      exerciseId,
      exerciseTitle: exercise?.title,
      isCurrentlyCompleted: isDone,
      includeAllRepeats,
      repeatCount: exercise.repeat_count || 1,
      actionToTake: shouldMarkDone ? 'ADD ALL' : 'REMOVE ALL',
    });

    // Toggle main exercise
    await toggleCompletion(exerciseId);

    // If includeAllRepeats and exercise has repeats, toggle all virtual repeats
    if (includeAllRepeats && exercise.repeat_count && exercise.repeat_count > 1) {
      for (let i = 2; i <= exercise.repeat_count; i++) {
        const virtualId = `${exerciseId}-virtual-${i}`;
        const isVirtualDone = virtualRepeatCompletions.includes(virtualId);

        // Only toggle if virtual repeat state doesn't match desired state
        if (shouldMarkDone && !isVirtualDone) {
          await toggleVirtualRepeatCompletion(virtualId);
        } else if (!shouldMarkDone && isVirtualDone) {
          await toggleVirtualRepeatCompletion(virtualId);
        }
      }
    }
    
    // Show celebration when marking all as done (LIKE PROGRESSSCREEN)
    if (shouldMarkDone && detailPath) {
      setTimeout(() => {
        const repeatCount = exercise.repeat_count || 1;
        
        console.log('🎉 [ExerciseListSheet] 🚀 Main checkbox - showing celebration for completed exercise!');
        
        showCelebration({
          learningPathTitle: detailPath.title || exercise.title,
          completedExercises: repeatCount,
          totalExercises: repeatCount,
          timeSpent: undefined,
          streakDays: undefined,
        });
        
        // Also check if entire path is complete (3 seconds later, like ProgressScreen)
        if (exercise.learning_path_id && detailPath) {
          setTimeout(async () => {
            const updatedCompletedIds = [...completedIds, exerciseId];
            console.log('🎉 [ExerciseListSheet] Also checking if entire learning path is complete...');
            await checkForCelebration(detailPath, updatedCompletedIds);
          }, 3000);
        }
      }, 500);
    }
  };

  // Toggle completion functions (exact copy from ProgressScreen)
  const toggleCompletion = async (exerciseId: string) => {
    if (!effectiveUserId) return;

    // Check access controls before allowing toggle
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    if (isExercisePasswordLocked(exercise)) {
      Alert.alert('Exercise Locked', 'This exercise requires a password to access.');
      return;
    }

    if (detailPath && isPathPaywallLocked(detailPath)) {
      const canAccess = await checkPathPaywall(detailPath);
      if (!canAccess) return;
    }

    const isDone = completedIds.includes(exerciseId);

    if (isDone) {
      setCompletedIds((prev) => prev.filter((id) => id !== exerciseId));
      try {
        await supabase
          .from('learning_path_exercise_completions')
          .delete()
          .eq('user_id', effectiveUserId)
          .eq('exercise_id', exerciseId);
      } catch (error) {
        console.error('Error removing completion:', error);
      }
    } else {
      setCompletedIds((prev) => [...prev, exerciseId]);
      try {
        await supabase
          .from('learning_path_exercise_completions')
          .insert([{ user_id: effectiveUserId, exercise_id: exerciseId }]);

        // Notify parent component (DailyStatus) about completion
        if (onExerciseCompleted) {
          const exerciseTitle = exercise.title?.[lang] || exercise.title?.en || 'Exercise';
          onExerciseCompleted(exerciseId, exerciseTitle);
        }

        // Check for celebration triggers (include the current exercise in the count)
        if (detailPath) {
          const updatedCompletedIds = [...completedIds, exerciseId];
          await checkForCelebration(detailPath, updatedCompletedIds);
        }
      } catch (error) {
        console.error('Error adding completion:', error);
      }
    }
  };

  // Celebration detection function
  const checkForCelebration = async (
    learningPath: LearningPath,
    currentCompletedIds?: string[],
  ) => {
    if (!effectiveUserId) return;

    try {
      // Get all exercises for this learning path
      const pathExercises = exercises.filter((ex) => ex.learning_path_id === learningPath.id);
      const totalExercises = pathExercises.length;

      if (totalExercises === 0) return;

      // Count completed exercises for this path (use provided IDs or current state)
      const idsToCheck = currentCompletedIds || completedIds;
      const completedExercises = pathExercises.filter((ex) => idsToCheck.includes(ex.id)).length;
      const completionPercentage = Math.round((completedExercises / totalExercises) * 100);

      // Trigger celebration for significant milestones
      const shouldCelebrate =
        completionPercentage === 100 || // Path completed
        completionPercentage === 75 || // 75% milestone
        completionPercentage === 50 || // 50% milestone
        completionPercentage === 25; // 25% milestone

      if (shouldCelebrate) {
        console.log('🎉 [ExerciseListSheet] Triggering celebration:', {
          pathId: learningPath.id,
          pathTitle: learningPath.title,
          completedExercises,
          totalExercises,
          completionPercentage,
        });

        // Get additional stats for celebration
        let timeSpent: number | undefined;
        let streakDays: number | undefined;

        try {
          // Calculate time spent (simplified - could be enhanced with actual time tracking)
          const { data: timeData } = await supabase
            .from('learning_path_exercise_completions')
            .select('completed_at')
            .eq('user_id', effectiveUserId)
            .eq('learning_path_id', learningPath.id)
            .order('completed_at', { ascending: true });

          if (timeData && timeData.length > 1) {
            const startTime = new Date(timeData[0].completed_at).getTime();
            const endTime = new Date(timeData[timeData.length - 1].completed_at).getTime();
            timeSpent = Math.round((endTime - startTime) / (1000 * 60)); // minutes
          }

          // Calculate streak (simplified - could be enhanced with actual streak tracking)
          const { data: streakData } = await supabase
            .from('learning_path_exercise_completions')
            .select('completed_at')
            .eq('user_id', effectiveUserId)
            .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
            .order('completed_at', { ascending: false });

          streakDays = streakData ? Math.min(streakData.length, 7) : 0;
        } catch (error) {
          console.log('📊 [ExerciseListSheet] Could not fetch celebration stats:', error);
        }

        // Use global celebration context
        showCelebration({
          learningPathTitle: learningPath.title,
          completedExercises,
          totalExercises,
          timeSpent,
          streakDays,
        });
      }
    } catch (error) {
      console.error('🎉 [ExerciseListSheet] Error checking for celebration:', error);
    }
  };

  const toggleVirtualRepeatCompletion = async (virtualId: string) => {
    if (!effectiveUserId) return;

    const parts = virtualId.split('-virtual-');
    if (parts.length !== 2) return;

    const exerciseId = parts[0];
    const repeatNumber = parseInt(parts[1]);
    const isDone = virtualRepeatCompletions.includes(virtualId);

    // Find exercise for celebration
    const exercise = exercises.find((ex) => ex.id === exerciseId);

    if (isDone) {
      setVirtualRepeatCompletions((prev) => prev.filter((id) => id !== virtualId));
      try {
        await supabase
          .from('virtual_repeat_completions')
          .delete()
          .eq('user_id', effectiveUserId)
          .eq('exercise_id', exerciseId)
          .eq('repeat_number', repeatNumber);
      } catch (error) {
        console.error('Error removing virtual repeat completion:', error);
      }
    } else {
      setVirtualRepeatCompletions((prev) => [...prev, virtualId]);
      try {
        await supabase.from('virtual_repeat_completions').insert([
          {
            user_id: effectiveUserId,
            exercise_id: exerciseId,
            repeat_number: repeatNumber,
          },
        ]);
        
        // Check for celebration after marking virtual repeat as done (LIKE PROGRESSSCREEN - with delays)
        if (exercise && detailPath) {
          setTimeout(() => {
            console.log('🎉 [ExerciseListSheet] Checking celebration after virtual repeat toggle');
            
            // Wait for state to fully update before checking (extra delay like ProgressScreen)
            setTimeout(() => {
              // Check if THIS exercise is now fully complete (all repeats done)
              const { completed, total } = getRepeatProgress(exercise);
              console.log('🎉 [ExerciseListSheet] Exercise progress check:', { 
                completed, 
                total, 
                isComplete: completed === total 
              });
              
              if (completed === total && total > 1) {
                console.log('🎉 [ExerciseListSheet] 🚀 Exercise fully complete! Showing celebration!');
                showCelebration({
                  learningPathTitle: detailPath.title || exercise.title,
                  completedExercises: completed,
                  totalExercises: total,
                  timeSpent: undefined,
                  streakDays: undefined,
                });
                
                // Also check if entire path is complete (3 seconds later)
                setTimeout(async () => {
                  await checkForCelebration(detailPath, completedIds);
                }, 3000);
              } else {
                // Just check if entire path is complete
                checkForCelebration(detailPath, completedIds);
              }
            }, 300); // Extra delay for state updates (like ProgressScreen)
          }, 200); // Initial delay (like ProgressScreen)
        }
      } catch (error) {
        console.error('Error adding virtual repeat completion:', error);
      }
    }
  };

  // Get repeat progress (exact copy from ProgressScreen)
  const getRepeatProgress = (
    exercise: PathExercise,
  ): { completed: number; total: number; percent: number } => {
    if (!exercise.repeat_count || exercise.repeat_count <= 1) {
      return { completed: 0, total: 0, percent: 0 };
    }

    const total = exercise.repeat_count;
    let completed = 0;

    if (completedIds.includes(exercise.id)) {
      completed++;
    }

    for (let i = 2; i <= total; i++) {
      const virtualId = `${exercise.id}-virtual-${i}`;
      if (virtualRepeatCompletions.includes(virtualId)) {
        completed++;
      }
    }

    const percent = total > 0 ? completed / total : 0;
    return { completed, total, percent };
  };

  // RepeatProgressBar component (exact copy from ProgressScreen)
  const RepeatProgressBar = ({ exercise }: { exercise: PathExercise }) => {
    const { completed, total, percent } = getRepeatProgress(exercise);

    if (total <= 1) return null;

    return (
      <XStack alignItems="center" gap={4} marginTop={4}>
        <View
          style={{
            width: 60,
            height: 4,
            backgroundColor: '#333',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(percent * 100)}%`,
              height: '100%',
              backgroundColor: '#00E6C3',
              borderRadius: 2,
            }}
          />
        </View>
        <Text fontSize={10} color="$gray11">
          {completed}/{total}
        </Text>
      </XStack>
    );
  };

  // Media rendering functions (exact copy from ProgressScreen)
  const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
    const screenWidth = Dimensions.get('window').width;
    const videoWidth = screenWidth - 48;
    const videoHeight = videoWidth * 0.5625;

    return (
      <View
        style={{
          width: videoWidth,
          height: videoHeight,
          marginVertical: 12,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <WebView
          source={{ uri: `https://www.youtube.com/embed/${videoId}` }}
          style={{ flex: 1 }}
          allowsFullscreenVideo
          javaScriptEnabled
        />
      </View>
    );
  };

  const getYouTubeVideoId = (url: string | undefined): string | null => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  const renderExerciseMedia = (exercise: PathExercise) => {
    return (
      <YStack gap={16}>
        {exercise.youtube_url && (
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Video Tutorial
            </Text>
            {(() => {
              const videoId = getYouTubeVideoId(exercise.youtube_url);
              return videoId ? (
                <YouTubeEmbed videoId={videoId} />
              ) : (
                <TouchableOpacity
                  onPress={() => exercise.youtube_url && Linking.openURL(exercise.youtube_url)}
                  style={{ padding: 8, backgroundColor: '#FF0000', borderRadius: 8 }}
                >
                  <Text color="white">Watch on YouTube</Text>
                </TouchableOpacity>
              );
            })()}
          </YStack>
        )}

        {exercise.image && (
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Reference Image
            </Text>
            <Image
              source={{ uri: exercise.image }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 8,
                resizeMode: 'cover',
              }}
            />
          </YStack>
        )}
      </YStack>
    );
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible) {
      loadLearningPathData();
      fetchCompletions();
    }
  }, [visible, loadLearningPathData, fetchCompletions]);

  // Auto-open specific exercise if initialExerciseId is provided
  useEffect(() => {
    if (visible && initialExerciseId && exercises.length > 0) {
      const exercise = exercises.find((ex) => ex.id === initialExerciseId);
      if (exercise) {
        console.log(
          '📚 [ExerciseListSheet] Auto-opening exercise:',
          exercise.title[lang] || exercise.title.en,
        );
        setSelectedExercise(exercise);
      }
    }
  }, [visible, initialExerciseId, exercises, lang]);

  // Check access when detailPath loads
  useEffect(() => {
    const checkAccess = async () => {
      if (!detailPath || !visible) return;

      // Check paywall first
      const canAccessPaywall = await checkPathPaywall(detailPath);
      if (!canAccessPaywall) {
        return; // Paywall modal will be shown
      }

      // Check password lock
      const canAccessPassword = await checkPathPassword(detailPath);
      if (!canAccessPassword) {
        return; // Password modal will be shown
      }
    };

    checkAccess();
  }, [detailPath, visible]);

  // Real-time subscription for progress updates
  useEffect(() => {
    if (!effectiveUserId || !visible) return;

    console.log(
      '📚 [ExerciseListSheet] Setting up real-time subscription for user:',
      effectiveUserId,
    );

    const channelName = `exercise-list-progress-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log('📚 [ExerciseListSheet] Real-time update received:', payload.eventType);
          fetchCompletions();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'virtual_repeat_completions',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log(
            '📚 [ExerciseListSheet] Real-time update received (virtual repeats):',
            payload.eventType,
          );
          fetchCompletions();
        },
      )
      .subscribe();

    return () => {
      console.log('📚 [ExerciseListSheet] Cleaning up real-time subscription');
      supabase.removeChannel(subscription);
    };
  }, [effectiveUserId, visible]);

  // Animation effects - dual system for main sheet and exercise detail
  useEffect(() => {
    if (visible) {
      if (selectedExercise) {
        // Individual exercise detail - use traditional animation
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      } else {
        // Main exercise list - use gesture system
        translateY.value = withSpring(snapPoints.large, {
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });
        currentState.value = snapPoints.large;
        setCurrentSnapPoint(snapPoints.large);

        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } else {
      // Reset all animations
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (selectedExercise) {
        Animated.timing(sheetTranslateY, {
          toValue: 300,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, selectedExercise, backdropOpacity, sheetTranslateY, snapPoints.large, currentState]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadLearningPathData(), fetchCompletions()]);
    } catch (error) {
      console.error('Error refreshing exercise data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!visible) return null;

  // Individual exercise detail view with gesture support
  if (selectedExercise) {
    const isDone = completedIds.includes(selectedExercise.id);
    const isPasswordLocked = isExercisePasswordLocked(selectedExercise);
    const prevExercisesComplete = !isPasswordLocked;

    const baseExercise = selectedExercise.isRepeat
      ? exercises.find((ex) => ex.id === selectedExercise.originalId)
      : selectedExercise;

    const allRepeats = baseExercise
      ? [
          baseExercise,
          ...exercises.filter((ex) => ex.isRepeat && ex.originalId === baseExercise.id),
        ].sort((a, b) => (a.repeatNumber || 1) - (b.repeatNumber || 1))
      : [];

    const currentRepeatIndex = allRepeats.findIndex((ex) => ex.id === selectedExercise.id);
    const totalRepeats = selectedExercise.repeat_count || 1;
    const currentRepeatNumber = selectedExercise.isRepeat ? selectedExercise.repeatNumber || 2 : 1;

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            opacity: backdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} />
            <GestureDetector gesture={panGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height,
                    backgroundColor: backgroundColor,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  },
                  animatedGestureStyle,
                ]}
              >
                <YStack padding="$3" paddingBottom={insets.bottom || 10} gap="$3" flex={1}>
                  {/* Drag Handle */}
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                      }}
                    />
                  </View>

                  {/* Show mini title in mini mode */}
                  {currentSnapPoint === snapPoints.mini && (
                    <YStack alignItems="center" paddingVertical="$2">
                      <Text fontSize="$5" fontWeight="bold" color="$color">
                        {selectedExercise.title?.[lang] || selectedExercise.title?.en || 'Exercise'}
                      </Text>
                    </YStack>
                  )}

                  {/* Show content only if not in mini mode */}
                  {currentSnapPoint !== snapPoints.mini && (
                    <View style={{ flex: 1 }}>
                      <ScrollView
                        contentContainerStyle={{
                          padding: 0,
                          paddingBottom: getTabContentPadding(),
                        }}
                        refreshControl={
                          <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#00E6C3"
                            colors={['#00E6C3']}
                            progressBackgroundColor="#1a1a1a"
                          />
                        }
                      >
                        {/* Header with back button and repetition indicators */}
                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                          marginBottom={24}
                        >
                          <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                            <Feather name="arrow-left" size={28} color={iconColor} />
                          </TouchableOpacity>

                          {totalRepeats > 1 && (
                            <XStack gap={8} alignItems="center">
                              {Array.from({ length: totalRepeats }).map((_, i) => (
                                <View
                                  key={`repeat-indicator-${selectedExercise.id}-${i}`}
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor:
                                      i + 1 === currentRepeatNumber ? '#4B6BFF' : '#444',
                                  }}
                                />
                              ))}
                            </XStack>
                          )}
                        </XStack>

                        {/* Exercise header with icon (exact copy from ProgressScreen) */}
                        <XStack alignItems="center" gap={12} marginBottom={16}>
                          {selectedExercise.icon && (
                            <View style={{ marginRight: 8 }}>
                              <Feather
                                name={selectedExercise.icon as keyof typeof Feather.glyphMap}
                                size={28}
                                color={isPasswordLocked ? '#FF9500' : '#00E6C3'}
                              />
                            </View>
                          )}
                          <YStack flex={1}>
                            <XStack alignItems="center" gap={8}>
                              <Text
                                fontSize={28}
                                fontWeight="bold"
                                color="$color"
                                numberOfLines={1}
                              >
                                {selectedExercise.title?.[lang] ||
                                  selectedExercise.title?.en ||
                                  'Untitled'}
                              </Text>

                              {selectedExercise.isRepeat && (
                                <XStack
                                  backgroundColor="#4B6BFF"
                                  paddingHorizontal={8}
                                  paddingVertical={4}
                                  borderRadius={12}
                                  alignItems="center"
                                  gap={4}
                                >
                                  <Feather name="repeat" size={14} color="white" />
                                  <Text fontSize={12} color="white" fontWeight="bold">
                                    {selectedExercise.repeatNumber}/{selectedExercise.repeat_count}
                                  </Text>
                                </XStack>
                              )}
                            </XStack>

                            {!selectedExercise.isRepeat &&
                              selectedExercise.repeat_count &&
                              selectedExercise.repeat_count > 1 && (
                                <XStack alignItems="center" gap={4} marginTop={4}>
                                  <Feather name="repeat" size={16} color="#4B6BFF" />
                                  <Text color="#4B6BFF" fontSize={14}>
                                    This exercise needs to be repeated{' '}
                                    {selectedExercise.repeat_count} times
                                  </Text>
                                </XStack>
                              )}
                          </YStack>

                          {isPasswordLocked ? (
                            <MaterialIcons name="lock" size={24} color="#FF9500" />
                          ) : !prevExercisesComplete ? (
                            <MaterialIcons name="hourglass-empty" size={24} color="#FF9500" />
                          ) : isDone ? (
                            <Feather name="check-circle" size={24} color="#00E6C3" />
                          ) : null}
                        </XStack>

                        {selectedExercise.description?.[lang] && (
                          <Text color="$gray11" marginBottom={16}>
                            {selectedExercise.description[lang]}
                          </Text>
                        )}

                        <TouchableOpacity
                          onPress={() => setReportExerciseId(selectedExercise.id)}
                          style={{ alignSelf: 'flex-end', marginBottom: 8 }}
                        >
                          <Text color="#EF4444">Report Exercise</Text>
                        </TouchableOpacity>

                        {/* Password Locked Exercise State */}
                        {isPasswordLocked ? (
                          <YStack gap={16} padding={24} alignItems="center">
                            <MaterialIcons name="lock" size={80} color="#FF9500" />
                            <Text
                              fontSize={24}
                              fontWeight="bold"
                              color="#FF9500"
                              textAlign="center"
                            >
                              This Exercise is Locked
                            </Text>
                            {selectedExercise.lock_password ? (
                              <YStack width="100%" gap={8} marginTop={16} alignItems="center">
                                <Text color="$gray11" fontSize={16} marginBottom={8}>
                                  Enter password to unlock:
                                </Text>
                                <View
                                  style={{
                                    width: '100%',
                                    maxWidth: 350,
                                    padding: 8,
                                    backgroundColor: 'rgba(255, 147, 0, 0.2)',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: '#FF9500',
                                    marginBottom: 16,
                                  }}
                                >
                                  <TextInput
                                    value={exercisePasswordInput}
                                    onChangeText={setExercisePasswordInput}
                                    secureTextEntry
                                    style={{
                                      backgroundColor: '#222',
                                      color: '#fff',
                                      padding: 16,
                                      borderRadius: 8,
                                      width: '100%',
                                      fontSize: 18,
                                    }}
                                    placeholder="Enter password"
                                    placeholderTextColor="#666"
                                    autoCapitalize="none"
                                  />
                                </View>
                                <Button
                                  size="lg"
                                  backgroundColor="#FF9500"
                                  onPress={async () => {
                                    if (!selectedExercise.lock_password) return;
                                    if (exercisePasswordInput === selectedExercise.lock_password) {
                                      // Use shared context to unlock
                                      addUnlockedExercise(selectedExercise.id);
                                      setExercisePasswordInput('');
                                    } else {
                                      Alert.alert(
                                        'Incorrect Password',
                                        'The password you entered is incorrect.',
                                      );
                                    }
                                  }}
                                >
                                  Unlock
                                </Button>
                              </YStack>
                            ) : (
                              <Text color="$gray11" fontSize={16} marginTop={16} textAlign="center">
                                This exercise is locked and cannot be accessed at this time.
                              </Text>
                            )}
                          </YStack>
                        ) : (
                          <>
                            {/* Media Rendering Section */}
                            {renderExerciseMedia(selectedExercise)}

                            {/* Repetition Progress */}
                            {(selectedExercise.isRepeat ||
                              (selectedExercise.repeat_count &&
                                selectedExercise.repeat_count > 1)) && (
                              <YStack
                                marginTop={16}
                                marginBottom={8}
                                backgroundColor="rgba(75, 107, 255, 0.1)"
                                padding={16}
                                borderRadius={12}
                              >
                                <XStack alignItems="center" gap={8} marginBottom={8}>
                                  <Feather name="repeat" size={20} color="#4B6BFF" />
                                  <Text fontSize={18} fontWeight="bold" color="#4B6BFF">
                                    {selectedExercise.isRepeat
                                      ? `Repetition ${selectedExercise.repeatNumber} of ${selectedExercise.repeat_count}`
                                      : `This exercise requires ${selectedExercise.repeat_count} repetitions`}
                                  </Text>
                                </XStack>
                              </YStack>
                            )}

                            {/* List of all repeats */}
                            {!selectedExercise.isRepeat &&
                              selectedExercise.repeat_count &&
                              selectedExercise.repeat_count > 1 && (
                                <YStack marginTop={16} marginBottom={16} gap={12}>
                                  <XStack alignItems="center" gap={8} marginBottom={8}>
                                    <Feather name="list" size={20} color="#4B6BFF" />
                                    <Text fontSize={18} fontWeight="bold" color="#4B6BFF">
                                      All Repetitions
                                    </Text>
                                  </XStack>

                                  <RepeatProgressBar exercise={selectedExercise} />

                                  {/* Show the original exercise first */}
                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: '#222',
                                      padding: 12,
                                      borderRadius: 8,
                                      borderLeftWidth: 4,
                                      borderLeftColor: completedIds.includes(selectedExercise.id)
                                        ? '#00E6C3'
                                        : '#4B6BFF',
                                    }}
                                    onPress={() => toggleCompletion(selectedExercise.id)}
                                  >
                                    <XStack justifyContent="space-between" alignItems="center">
                                      <XStack gap={8} alignItems="center" flex={1}>
                                        <TouchableOpacity
                                          onPress={(e) => {
                                            e.stopPropagation();
                                            // Play sound
                                            playDoneSound();
                                            toggleCompletion(selectedExercise.id);
                                          }}
                                          style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: completedIds.includes(
                                              selectedExercise.id,
                                            )
                                              ? '#00E6C3'
                                              : '#333',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 2,
                                            borderColor: completedIds.includes(selectedExercise.id)
                                              ? '#00E6C3'
                                              : '#888',
                                          }}
                                        >
                                          {completedIds.includes(selectedExercise.id) && (
                                            <Feather name="check" size={16} color="#fff" />
                                          )}
                                        </TouchableOpacity>
                                        <Text
                                          fontSize={16}
                                          color="$color"
                                          fontWeight="600"
                                          numberOfLines={1}
                                          flex={1}
                                        >
                                          {selectedExercise.title?.[lang] ||
                                            selectedExercise.title?.en ||
                                            'Original'}
                                        </Text>
                                      </XStack>
                                      <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                                        1/{selectedExercise.repeat_count}
                                      </Text>
                                      {completedIds.includes(selectedExercise.id) && (
                                        <Feather name="check-circle" size={18} color="#00E6C3" />
                                      )}
                                    </XStack>
                                  </TouchableOpacity>

                                  {/* Virtual repeats */}
                                  {Array.from({ length: selectedExercise.repeat_count - 1 }).map(
                                    (_, i) => {
                                      const repeatNumber = i + 2;
                                      const virtualId = `${selectedExercise.id}-virtual-${repeatNumber}`;
                                      const isDone = virtualRepeatCompletions.includes(virtualId);

                                      return (
                                        <TouchableOpacity
                                          key={`virtual-repeat-${selectedExercise.id}-${i}-${repeatNumber}`}
                                          style={{
                                            backgroundColor: '#222',
                                            padding: 12,
                                            borderRadius: 8,
                                            borderLeftWidth: 4,
                                            borderLeftColor: isDone ? '#00E6C3' : '#4B6BFF',
                                          }}
                                          onPress={() => toggleVirtualRepeatCompletion(virtualId)}
                                        >
                                          <XStack
                                            justifyContent="space-between"
                                            alignItems="center"
                                          >
                                            <XStack gap={8} alignItems="center" flex={1}>
                                              <TouchableOpacity
                                                onPress={(e) => {
                                                  e.stopPropagation();
                                                  // Play sound
                                                  playDoneSound();
                                                  toggleVirtualRepeatCompletion(virtualId);
                                                }}
                                                style={{
                                                  width: 24,
                                                  height: 24,
                                                  borderRadius: 12,
                                                  backgroundColor: isDone ? '#00E6C3' : '#333',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  borderWidth: 2,
                                                  borderColor: isDone ? '#00E6C3' : '#888',
                                                }}
                                              >
                                                {isDone && (
                                                  <Feather name="check" size={16} color="#fff" />
                                                )}
                                              </TouchableOpacity>
                                              <Text
                                                fontSize={16}
                                                color="$color"
                                                fontWeight="600"
                                                numberOfLines={1}
                                                flex={1}
                                              >
                                                Repetition {repeatNumber}
                                              </Text>
                                            </XStack>
                                            <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                                              {repeatNumber}/{selectedExercise.repeat_count}
                                            </Text>
                                            {isDone && (
                                              <Feather
                                                name="check-circle"
                                                size={18}
                                                color="#00E6C3"
                                              />
                                            )}
                                          </XStack>
                                        </TouchableOpacity>
                                      );
                                    },
                                  )}
                                </YStack>
                              )}

                            {/* Toggle done/not done button */}
                            <TouchableOpacity
                              onPress={async () => {
                                const shouldMarkDone = !isDone;
                                
                                // Toggle main exercise
                                await toggleCompletion(selectedExercise.id);
                                
                                // Toggle all virtual repeats if exercise has repeats
                                if (
                                  selectedExercise.repeat_count &&
                                  selectedExercise.repeat_count > 1
                                ) {
                                  for (let i = 2; i <= selectedExercise.repeat_count; i++) {
                                    const virtualId = `${selectedExercise.id}-virtual-${i}`;
                                    const isVirtualDone =
                                      virtualRepeatCompletions.includes(virtualId);
                                    if (shouldMarkDone && !isVirtualDone) {
                                      await toggleVirtualRepeatCompletion(virtualId);
                                    } else if (!shouldMarkDone && isVirtualDone) {
                                      await toggleVirtualRepeatCompletion(virtualId);
                                    }
                                  }
                                }
                                
                                // Trigger celebration when marking all as done (like ProgressScreen)
                                if (shouldMarkDone && detailPath) {
                                  setTimeout(() => {
                                    const repeatCount = selectedExercise.repeat_count || 1;
                                    
                                    console.log('🎉 [ExerciseListSheet] Mark All as Done - showing celebration!');
                                    
                                    showCelebration({
                                      learningPathTitle: detailPath.title || selectedExercise.title,
                                      completedExercises: repeatCount,
                                      totalExercises: repeatCount,
                                      timeSpent: undefined,
                                      streakDays: undefined,
                                    });
                                    
                                    // Also check if entire path is complete
                                    setTimeout(async () => {
                                      const updatedCompletedIds = [...completedIds, selectedExercise.id];
                                      await checkForCelebration(detailPath, updatedCompletedIds);
                                    }, 3000);
                                  }, 500);
                                }
                              }}
                              style={{
                                marginTop: 24,
                                backgroundColor: isDone ? '#00E6C3' : '#222',
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                              }}
                            >
                              <Text color={isDone ? '$background' : '$color'} fontWeight="bold">
                                {isDone ? 'Mark All as Not Done' : 'Mark All as Done'}
                              </Text>
                            </TouchableOpacity>

                            {/* Comments section */}
                            <YStack marginTop={24}>
                              <Text fontSize={18} fontWeight="bold" color="$color" marginBottom={8}>
                                Comments
                              </Text>
                              <CommentsSection
                                targetType="exercise"
                                targetId={selectedExercise.id}
                              />
                            </YStack>
                          </>
                        )}
                      </ScrollView>

                      {/* Report Dialog */}
                      {reportExerciseId && (
                        <ReportDialog
                          reportableId={reportExerciseId}
                          reportableType="exercise"
                          onClose={() => setReportExerciseId(null)}
                        />
                      )}
                    </View>
                  )}
                </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </Modal>
    );
  }

  // Exercise list view (reusing ProgressScreen's exercise list design)
  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            opacity: backdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} />
            <GestureDetector gesture={panGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height,
                    backgroundColor: backgroundColor,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  },
                  animatedGestureStyle,
                ]}
              >
                <YStack padding="$3" paddingBottom={insets.bottom || 10} gap="$3" flex={1}>
                  {/* Drag Handle */}
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                      }}
                    />
                  </View>

                  {/* Show mini title in mini mode */}
                  {currentSnapPoint === snapPoints.mini && (
                    <YStack alignItems="center" paddingVertical="$2">
                      <Text fontSize="$5" fontWeight="bold" color="$color">
                        {title}
                      </Text>
                    </YStack>
                  )}

                  {/* Show content only if not in mini mode */}
                  {currentSnapPoint !== snapPoints.mini && (
                    <View style={{ flex: 1 }}>
                      {/* Header with Progress Circle */}
                      <YStack gap={16} marginBottom={16}>
                        <XStack justifyContent="space-between" alignItems="center">
                          {onBackToAllPaths ? (
                            <TouchableOpacity onPress={onBackToAllPaths}>
                              <Feather
                                name="arrow-left"
                                size={24}
                                color={colorScheme === 'dark' ? '#FFF' : '#000'}
                              />
                            </TouchableOpacity>
                          ) : (
                            <View style={{ width: 24 }} />
                          )}

                          <Text
                            fontSize="$6"
                            fontWeight="bold"
                            color="$color"
                            textAlign="center"
                            flex={1}
                          >
                            {title}
                          </Text>

                          <TouchableOpacity onPress={onClose}>
                            <Feather
                              name="x"
                              size={24}
                              color={colorScheme === 'dark' ? '#FFF' : '#000'}
                            />
                          </TouchableOpacity>
                        </XStack>

                        {/* Learning Path Progress Circle */}
                        {exercises.length > 0 && (
                          <XStack justifyContent="center" alignItems="center" marginTop={8}>
                            <View style={{ position: 'relative' }}>
                              <ProgressCircle
                                percent={
                                  completedIds.filter((id) => exercises.some((ex) => ex.id === id))
                                    .length / exercises.length
                                }
                                size={90}
                                color="#27febe"
                                bg="#333"
                              />
                              <Text
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: 90,
                                  height: 90,
                                  textAlign: 'center',
                                  textAlignVertical: 'center',
                                  lineHeight: 90,
                                }}
                                fontSize="$4"
                                color={
                                  completedIds.filter((id) => exercises.some((ex) => ex.id === id))
                                    .length === exercises.length
                                    ? '#27febe'
                                    : '$gray10'
                                }
                                fontWeight="bold"
                              >
                                {Math.round(
                                  (completedIds.filter((id) => exercises.some((ex) => ex.id === id))
                                    .length /
                                    exercises.length) *
                                    100,
                                )}
                                %
                              </Text>
                              {completedIds.filter((id) => exercises.some((ex) => ex.id === id))
                                .length === exercises.length && (
                                <View
                                  style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    backgroundColor: '#27febe',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Feather name="check" size={18} color="#000" />
                                </View>
                              )}
                            </View>
                          </XStack>
                        )}
                      </YStack>

                      {/* Featured Exercises Quick Access */}
                      <Button
                        variant="outlined"
                        size="md"
                        onPress={() => {
                          console.log(
                            '🎯 [ExerciseListSheet] Featured exercises pressed, navigating to ProgressScreen',
                          );
                          onClose();
                          navigation.navigate('ProgressTab', {
                            activeUserId: effectiveUserId || undefined,
                          });
                        }}
                        marginBottom="$2"
                      >
                        <XStack alignItems="center" gap="$2">
                          <Feather name="star" size={16} color="#00FFBC" />
                          <Text color="$color" fontWeight="600">
                            {t('exercises.featuredExercises') || 'Featured Exercises'}
                          </Text>
                          <Feather name="external-link" size={14} color="$color" />
                        </XStack>
                      </Button>

                      {/* Exercise List */}
                      <YStack flex={1}>
                        {loading ? (
                          <YStack alignItems="center" justifyContent="center" flex={1}>
                            <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
                          </YStack>
                        ) : !detailPath ? (
                          <YStack alignItems="center" justifyContent="center" flex={1} gap="$2">
                            <Feather name="book-open" size={48} color="#666" />
                            <Text color="$gray11" textAlign="center">
                              {t('exercises.noExercises') || 'No exercises available'}
                            </Text>
                          </YStack>
                        ) : (
                          <ScrollView
                            showsVerticalScrollIndicator={true}
                            refreshControl={
                              <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor="#00E6C3"
                                colors={['#00E6C3']}
                                progressBackgroundColor="#1a1a1a"
                              />
                            }
                          >
                            <YStack gap="$4">
                              {/* Progress Section */}
                              {exercises.length > 0 && (
                                <YStack marginBottom={16}>
                                  <XStack
                                    justifyContent="space-between"
                                    alignItems="center"
                                    marginBottom={8}
                                  >
                                    <Text fontSize={18} fontWeight="bold" color="$color">
                                      Progress
                                    </Text>
                                    <Text fontSize={16} color="$gray11">
                                      {
                                        completedIds.filter((id) =>
                                          exercises.some((ex) => ex.id === id),
                                        ).length
                                      }
                                      /{exercises.length}
                                    </Text>
                                  </XStack>
                                  <View
                                    style={{
                                      width: '100%',
                                      height: 8,
                                      backgroundColor: '#333',
                                      borderRadius: 4,
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <View
                                      style={{
                                        width: `${Math.round((completedIds.filter((id) => exercises.some((ex) => ex.id === id)).length / exercises.length) * 100)}%`,
                                        height: '100%',
                                        backgroundColor: '#00E6C3',
                                        borderRadius: 4,
                                      }}
                                    />
                                  </View>
                                </YStack>
                              )}

                              {/* Exercise List (exact copy from ProgressScreen) */}
                              {exercises.length === 0 ? (
                                <Text color="$gray11">No exercises for this learning path.</Text>
                              ) : (
                                exercises.map((exercise, exerciseIndex) => {
                                  const displayIndex = exerciseIndex + 1;
                                  const main = exercise;
                                  const mainIsDone = completedIds.includes(main.id);
                                  const mainIsPasswordLocked = isExercisePasswordLocked(main);
                                  const mainIsAvailable = !mainIsPasswordLocked;

                                  return (
                                    <YStack
                                      key={`exercise-detail-${main.id}-${exerciseIndex}`}
                                      marginBottom={16}
                                    >
                                      <TouchableOpacity onPress={() => setSelectedExercise(main)}>
                                        <XStack alignItems="center" gap={12}>
                                          <TouchableOpacity
                                            onPress={(e) => {
                                              e.stopPropagation();
                                              if (mainIsAvailable) {
                                                // Play sound
                                                playDoneSound();
                                                // Use new function that includes repeats for Level 2 checkboxes
                                                toggleCompletionWithRepeats(main.id, true);
                                              }
                                            }}
                                            style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 6,
                                              borderWidth: 2,
                                              borderColor: mainIsDone ? '#00E6C3' : '#888',
                                              backgroundColor: mainIsDone
                                                ? '#00E6C3'
                                                : 'transparent',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              marginRight: 8,
                                            }}
                                          >
                                            {mainIsDone && (
                                              <Feather name="check" size={20} color="#fff" />
                                            )}
                                          </TouchableOpacity>
                                          <Card
                                            padding={16}
                                            borderRadius={16}
                                            backgroundColor="$backgroundStrong"
                                            flex={1}
                                          >
                                            <XStack
                                              justifyContent="space-between"
                                              alignItems="center"
                                            >
                                              <XStack alignItems="center" gap={8} flex={1}>
                                                <Text
                                                  fontSize={18}
                                                  fontWeight="900"
                                                  fontStyle="italic"
                                                  color="$color"
                                                  numberOfLines={1}
                                                >
                                                  {displayIndex}.{' '}
                                                  {main.title?.[lang] ||
                                                    main.title?.en ||
                                                    'Untitled'}
                                                </Text>
                                                {!!commentCounts[main.id] &&
                                                  commentCounts[main.id] > 0 && (
                                                    <XStack
                                                      alignItems="center"
                                                      gap={4}
                                                      backgroundColor="#1f2937"
                                                      paddingHorizontal={6}
                                                      paddingVertical={2}
                                                      borderRadius={10}
                                                    >
                                                      <Feather
                                                        name="message-circle"
                                                        size={12}
                                                        color="#00E6C3"
                                                      />
                                                      <Text fontSize={10} color="#00E6C3">
                                                        {commentCounts[main.id]}
                                                      </Text>
                                                    </XStack>
                                                  )}

                                                {main.repeat_count && main.repeat_count > 1 && (
                                                  <XStack
                                                    backgroundColor="#4B6BFF"
                                                    paddingHorizontal={8}
                                                    paddingVertical={4}
                                                    borderRadius={12}
                                                    alignItems="center"
                                                    gap={4}
                                                  >
                                                    <Feather
                                                      name="repeat"
                                                      size={14}
                                                      color="white"
                                                    />
                                                    <Text
                                                      fontSize={12}
                                                      color="white"
                                                      fontWeight="bold"
                                                    >
                                                      {main.repeat_count}x
                                                    </Text>
                                                  </XStack>
                                                )}

                                                {/* Show lock icon if exercise is locked */}
                                                {mainIsPasswordLocked && (
                                                  <XStack
                                                    backgroundColor="#FF9500"
                                                    paddingHorizontal={8}
                                                    paddingVertical={4}
                                                    borderRadius={12}
                                                    alignItems="center"
                                                    gap={4}
                                                  >
                                                    <MaterialIcons
                                                      name="lock"
                                                      size={14}
                                                      color="white"
                                                    />
                                                    <Text
                                                      fontSize={12}
                                                      color="white"
                                                      fontWeight="bold"
                                                    >
                                                      LOCKED
                                                    </Text>
                                                  </XStack>
                                                )}

                                                {/* Show paywall icon if parent path has paywall */}
                                                {detailPath && isPathPaywallLocked(detailPath) && (
                                                  <XStack
                                                    backgroundColor="#00E6C3"
                                                    paddingHorizontal={8}
                                                    paddingVertical={4}
                                                    borderRadius={12}
                                                    alignItems="center"
                                                    gap={4}
                                                  >
                                                    <Feather
                                                      name="credit-card"
                                                      size={14}
                                                      color="black"
                                                    />
                                                    <Text
                                                      fontSize={12}
                                                      color="black"
                                                      fontWeight="bold"
                                                    >
                                                      ${(detailPath as any).price_usd || 1.0}
                                                    </Text>
                                                  </XStack>
                                                )}
                                              </XStack>

                                              {mainIsPasswordLocked ? (
                                                <MaterialIcons
                                                  name="lock"
                                                  size={20}
                                                  color="#FF9500"
                                                />
                                              ) : mainIsDone ? (
                                                <Feather
                                                  name="check-circle"
                                                  size={20}
                                                  color="#00E6C3"
                                                />
                                              ) : (
                                                <Feather
                                                  name="chevron-right"
                                                  size={20}
                                                  color="$gray11"
                                                />
                                              )}
                                            </XStack>

                                            {main.description?.[lang] && (
                                              <Text color="$gray11" marginTop={4}>
                                                {main.description[lang]}
                                              </Text>
                                            )}

                                            <RepeatProgressBar exercise={main} />
                                          </Card>
                                        </XStack>
                                      </TouchableOpacity>
                                    </YStack>
                                  );
                                })
                              )}
                            </YStack>
                          </ScrollView>
                        )}

                        {/* See More Button */}
                        <Button
                          variant="secondary"
                          size="lg"
                          onPress={() => {
                            console.log(
                              '🎯 [ExerciseListSheet] See more pressed, opening new ExerciseListSheet',
                            );
                            onClose();
                            // Open a new ExerciseListSheet with showAllPaths=true
                            navigation.navigate('ProgressTab', {
                              activeUserId: effectiveUserId || undefined,
                            });
                          }}
                          marginTop="$4"
                        >
                          <XStack alignItems="center" gap="$2">
                            <Text color="$color" fontWeight="600">
                              {t('common.seeMore') || 'See More'}
                            </Text>
                            <Feather name="external-link" size={16} color="$color" />
                          </XStack>
                        </Button>
                      </YStack>
                    </View>
                  )}
                </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Animated.View>

        {/* 🔒 Paywall Modal for Learning Paths (EXACT COPY from ProgressScreen.tsx) */}
        <Modal
          visible={showPaywallModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPaywallModal(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
            activeOpacity={1}
            onPress={() => setShowPaywallModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: Dimensions.get('window').width - 60,
                maxHeight: Dimensions.get('window').height * 0.8,
              }}
            >
              <ScrollView
                style={{ maxHeight: Dimensions.get('window').height * 0.8 }}
                showsVerticalScrollIndicator={false}
              >
                <YStack
                  backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
                  borderRadius={24}
                  padding={20}
                  gap={16}
                  borderWidth={1}
                  borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 8 }}
                  shadowOpacity={0.3}
                  shadowRadius={16}
                >
                  {/* Header */}
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack alignItems="center" gap={8} flex={1}>
                      <Feather name="lock" size={24} color="#FF9500" />
                      <Text
                        fontSize={20}
                        fontWeight="bold"
                        color={colorScheme === 'dark' ? '#FFF' : '#000'}
                        flex={1}
                      >
                        {t('progressScreen.paywall.title') || 'Premium Learning Path'}
                      </Text>
                    </XStack>
                    <TouchableOpacity onPress={() => setShowPaywallModal(false)}>
                      <Feather
                        name="x"
                        size={24}
                        color={colorScheme === 'dark' ? '#FFF' : '#666'}
                      />
                    </TouchableOpacity>
                  </XStack>

                  {paywallPath && (
                    <>
                      {/* Path Info */}
                      <YStack gap={12}>
                        <Text
                          fontSize={24}
                          fontWeight="bold"
                          color={colorScheme === 'dark' ? '#FFF' : '#000'}
                        >
                          {paywallPath.title[lang] || paywallPath.title.en}
                        </Text>
                        <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                          {paywallPath.description[lang] || paywallPath.description.en}
                        </Text>
                      </YStack>

                      {/* Preview */}
                      <View
                        style={{
                          width: '100%',
                          height: 200,
                          borderRadius: 12,
                          backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Feather name="book-open" size={64} color="#00E6C3" />
                        <Text
                          fontSize={16}
                          color={colorScheme === 'dark' ? '#CCC' : '#666'}
                          marginTop={8}
                        >
                          {t('progressScreen.paywall.preview') || 'Premium Learning Content'}
                        </Text>
                      </View>

                      {/* Features */}
                      <YStack
                        gap={8}
                        padding={16}
                        backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F8F8'}
                        borderRadius={12}
                      >
                        <Text
                          fontSize={16}
                          fontWeight="bold"
                          color={colorScheme === 'dark' ? '#FFF' : '#000'}
                        >
                          {t('progressScreen.paywall.includes') || 'This Premium Path Includes:'}
                        </Text>
                        {[
                          t('progressScreen.paywall.feature1') || '🎯 Advanced driving exercises',
                          t('progressScreen.paywall.feature2') || '📚 Detailed learning content',
                          t('progressScreen.paywall.feature3') || '🎬 Exclusive video tutorials',
                          t('progressScreen.paywall.feature4') || '✅ Progress tracking',
                        ].map((feature, index) => (
                          <Text
                            key={index}
                            fontSize={14}
                            color={colorScheme === 'dark' ? '#CCC' : '#666'}
                          >
                            {feature}
                          </Text>
                        ))}
                      </YStack>

                      {/* Pricing */}
                      <YStack
                        gap={8}
                        padding={16}
                        backgroundColor="rgba(0, 230, 195, 0.1)"
                        borderRadius={12}
                      >
                        <XStack alignItems="center" justifyContent="center" gap={8}>
                          <Text fontSize={28} fontWeight="bold" color="#00E6C3">
                            ${paywallPath.price_usd || 1.0}
                          </Text>
                          <Text fontSize={14} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                            {t('progressScreen.paywall.oneTime') || 'one-time unlock'}
                          </Text>
                        </XStack>
                        <Text
                          fontSize={12}
                          color={colorScheme === 'dark' ? '#CCC' : '#666'}
                          textAlign="center"
                        >
                          {t('progressScreen.paywall.lifetime') ||
                            'Lifetime access to this learning path'}
                        </Text>
                      </YStack>

                      {/* Action Buttons */}
                      <XStack gap={12} justifyContent="center">
                        <TouchableOpacity
                          onPress={() => setShowPaywallModal(false)}
                          style={{
                            backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                            padding: 16,
                            borderRadius: 12,
                            flex: 1,
                            alignItems: 'center',
                          }}
                        >
                          <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                            {t('common.cancel') || 'Maybe Later'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={async () => {
                            console.log(
                              '💳 [ExerciseListSheet] ==================== STRIPE PAYMENT FLOW ====================',
                            );
                            console.log(
                              '💳 [ExerciseListSheet] Payment button pressed for path:',
                              paywallPath.title.en,
                            );
                            console.log(
                              '💳 [ExerciseListSheet] Payment amount:',
                              paywallPath.price_usd || 1.0,
                            );
                            console.log('💳 [ExerciseListSheet] User ID:', effectiveUserId);
                            console.log(
                              '💳 [ExerciseListSheet] ================================================================',
                            );

                            try {
                              // Show processing toast
                              showToast({
                                title: t('stripe.processing') || 'Processing Payment',
                                message: `Stripe Payment: $${paywallPath.price_usd || 1.0} USD`,
                                type: 'info',
                              });

                              // Create real payment intent using fixed Edge Function
                              const createPaymentIntent = async () => {
                                const amount = paywallPath.price_usd || 1.0;

                                console.log(
                                  '💳 [ExerciseListSheet] Calling fixed Edge Function...',
                                );

                                // Get auth token for the request
                                const {
                                  data: { session },
                                } = await supabase.auth.getSession();
                                if (!session?.access_token) {
                                  throw new Error('No authentication token available');
                                }

                                // Call the real payment function
                                const { data, error } = await supabase.functions.invoke(
                                  'create-payment-intent',
                                  {
                                    body: {
                                      amount: amount,
                                      currency: 'USD',
                                      metadata: {
                                        feature_key: `learning_path_${paywallPath.id}`,
                                        path_id: paywallPath.id,
                                        path_title: paywallPath.title[lang] || paywallPath.title.en,
                                        user_id: effectiveUserId,
                                      },
                                    },
                                    headers: {
                                      Authorization: `Bearer ${session.access_token}`,
                                    },
                                  },
                                );

                                if (error) {
                                  console.error(
                                    '💳 [ExerciseListSheet] Edge function error:',
                                    error,
                                  );

                                  // Extract the real error message from the Edge Function response
                                  let realErrorMessage = 'Failed to create payment intent';

                                  if (error instanceof FunctionsHttpError) {
                                    try {
                                      const errorDetails = await error.context.json();
                                      console.error(
                                        '💳 [ExerciseListSheet] Edge function error details:',
                                        errorDetails,
                                      );
                                      realErrorMessage =
                                        errorDetails.error ||
                                        errorDetails.message ||
                                        realErrorMessage;
                                    } catch (contextError) {
                                      console.error(
                                        '💳 [ExerciseListSheet] Failed to parse error context:',
                                        contextError,
                                      );
                                      try {
                                        const errorText = await error.context.text();
                                        console.error(
                                          '💳 [ExerciseListSheet] Edge function error text:',
                                          errorText,
                                        );
                                        realErrorMessage = errorText || realErrorMessage;
                                      } catch (textError) {
                                        console.error(
                                          '💳 [ExerciseListSheet] Failed to get error text:',
                                          textError,
                                        );
                                      }
                                    }
                                  }

                                  throw new Error(realErrorMessage);
                                }

                                if (data?.error) {
                                  console.error(
                                    '💳 [ExerciseListSheet] Edge function returned error:',
                                    data.error,
                                  );

                                  // FALLBACK: Create a properly formatted test payment intent
                                  console.log(
                                    '💳 [ExerciseListSheet] Creating fallback payment intent...',
                                  );
                                  return {
                                    paymentIntent:
                                      'pi_test_1234567890_secret_abcdefghijklmnopqrstuvwxyz',
                                    ephemeralKey: 'ek_test_1234567890abcdefghijklmnopqrstuvwxyz',
                                    customer: 'cus_test_1234567890',
                                    publishableKey: 'pk_live_Xr9mSHZSsJqaYS3q82xBNVtJ',
                                  };
                                }

                                console.log(
                                  '✅ [ExerciseListSheet] Real payment intent created:',
                                  data,
                                );

                                // Validate the response format - check for the correct field names
                                if (
                                  !data?.paymentIntentClientSecret ||
                                  !data?.customerId ||
                                  !data?.customerEphemeralKeySecret
                                ) {
                                  console.error(
                                    '💳 [ExerciseListSheet] Invalid response format - missing required fields:',
                                    {
                                      hasPaymentIntentClientSecret:
                                        !!data?.paymentIntentClientSecret,
                                      hasCustomerId: !!data?.customerId,
                                      hasCustomerEphemeralKeySecret:
                                        !!data?.customerEphemeralKeySecret,
                                      actualData: data,
                                    },
                                  );
                                  throw new Error('Invalid payment response format from server');
                                }

                                return data;
                              };

                              let paymentData;
                              try {
                                paymentData = await createPaymentIntent();

                                // If createPaymentIntent returned early (demo mode), exit here
                                if (!paymentData) {
                                  setShowPaywallModal(false);
                                  return;
                                }
                              } catch (error: any) {
                                if (error?.skipPaymentSheet) {
                                  setShowPaywallModal(false);
                                  return;
                                }
                                throw error;
                              }

                              console.log(
                                '💳 [ExerciseListSheet] Payment intent created:',
                                paymentData.paymentIntentClientSecret,
                              );

                              // Initialize PaymentSheet with proper structure
                              console.log(
                                '💳 [ExerciseListSheet] Initializing PaymentSheet with data:',
                                {
                                  hasPaymentIntent: !!paymentData?.paymentIntentClientSecret,
                                  hasCustomer: !!paymentData?.customerId,
                                  hasEphemeralKey: !!paymentData?.customerEphemeralKeySecret,
                                  paymentIntentFormat:
                                    paymentData?.paymentIntentClientSecret?.substring(0, 30) +
                                    '...',
                                },
                              );

                              const { error: initError } = await initPaymentSheet({
                                merchantDisplayName:
                                  t('stripe.merchantName') || 'Vromm Driving School',
                                customerId: paymentData.customerId,
                                customerEphemeralKeySecret: paymentData.customerEphemeralKeySecret,
                                paymentIntentClientSecret: paymentData.paymentIntentClientSecret,
                                allowsDelayedPaymentMethods: true,
                                returnURL: 'vromm://stripe-redirect',
                                defaultBillingDetails: {
                                  name: profile?.full_name || user?.email?.split('@')[0] || 'User',
                                  email: user?.email || '',
                                },
                                appearance: {
                                  colors: {
                                    primary: '#00E6C3',
                                    background: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
                                    componentBackground:
                                      colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                    componentText: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                                  },
                                },
                              });

                              if (initError) {
                                console.error(
                                  '💳 [ExerciseListSheet] PaymentSheet init error:',
                                  initError,
                                );
                                showToast({
                                  title: t('errors.title') || 'Error',
                                  message: t('stripe.initError') || 'Failed to initialize payment',
                                  type: 'error',
                                });
                                return;
                              }

                              // Close paywall modal first
                              setShowPaywallModal(false);

                              // Show connecting message
                              showToast({
                                title:
                                  t('stripe.connecting') ||
                                  'Connecting to Stripe payment gateway...',
                                message: t('stripe.pleaseWait') || 'Please wait...',
                                type: 'info',
                              });

                              // Small delay for UX
                              await new Promise((resolve) => setTimeout(resolve, 1000));

                              // Present PaymentSheet
                              console.log(
                                '💳 [ExerciseListSheet] Presenting Stripe PaymentSheet...',
                              );
                              const { error: paymentError } = await presentPaymentSheet();

                              if (paymentError) {
                                console.log(
                                  '💳 [ExerciseListSheet] Payment was cancelled or failed:',
                                  paymentError,
                                );
                                if (paymentError.code !== 'Canceled') {
                                  showToast({
                                    title: t('errors.title') || 'Payment Error',
                                    message:
                                      paymentError.message ||
                                      t('stripe.paymentFailed') ||
                                      'Payment failed',
                                    type: 'error',
                                  });
                                }
                                return;
                              }

                              // Payment successful - create record
                              const paymentIntentId =
                                paymentData.paymentIntentClientSecret.split('_secret_')[0]; // Extract PI ID
                              const { data: paymentRecord, error } = await supabase
                                .from('payment_transactions')
                                .insert({
                                  user_id: effectiveUserId,
                                  amount: paywallPath.price_usd || 1.0,
                                  currency: 'USD',
                                  payment_method: 'stripe',
                                  payment_provider_id: paymentIntentId,
                                  status: 'completed',
                                  transaction_type: 'purchase',
                                  description: `Unlock "${paywallPath.title[lang] || paywallPath.title.en}" learning path`,
                                  metadata: {
                                    feature_key: `learning_path_${paywallPath.id}`,
                                    path_id: paywallPath.id,
                                    path_title: paywallPath.title[lang] || paywallPath.title.en,
                                    unlock_type: 'one_time',
                                    customer_id: paymentData.customer,
                                  },
                                  processed_at: new Date().toISOString(),
                                })
                                .select()
                                .single();

                              if (!error) {
                                console.log(
                                  '✅ [ExerciseListSheet] Payment record created:',
                                  paymentRecord.id,
                                );
                                showToast({
                                  title: t('stripe.paymentSuccessful') || 'Payment Successful!',
                                  message:
                                    t('progressScreen.paywall.unlocked') ||
                                    'Learning path unlocked!',
                                  type: 'success',
                                });

                                // Refresh the screen to show unlocked content
                                await loadLearningPathData();
                              } else {
                                console.error(
                                  '❌ [ExerciseListSheet] Error saving payment record:',
                                  error,
                                );
                              }
                            } catch (error) {
                              console.error('💳 [ExerciseListSheet] Payment flow error:', error);
                              showToast({
                                title: t('errors.title') || 'Error',
                                message:
                                  t('progressScreen.paywall.paymentError') || 'Payment failed',
                                type: 'error',
                              });
                            }
                          }}
                          style={{
                            backgroundColor: '#00E6C3',
                            padding: 16,
                            borderRadius: 12,
                            flex: 1,
                            alignItems: 'center',
                          }}
                        >
                          <XStack alignItems="center" gap={6}>
                            <Feather name="credit-card" size={16} color="black" />
                            <Text color="black" fontWeight="bold">
                              {t('progressScreen.paywall.unlock') ||
                                `Unlock for $${paywallPath.price_usd || 1.0}`}
                            </Text>
                          </XStack>
                        </TouchableOpacity>
                      </XStack>
                    </>
                  )}
                </YStack>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Password Modal (copied from ProgressScreen) */}
        <Modal
          visible={showPasswordModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
            activeOpacity={1}
            onPress={() => setShowPasswordModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 350 }}
            >
              <YStack
                backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
                borderRadius={24}
                padding={20}
                gap={16}
                borderWidth={1}
                borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap={8} flex={1}>
                    <MaterialIcons name="lock" size={24} color="#FF9500" />
                    <Text
                      fontSize={20}
                      fontWeight="bold"
                      color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      flex={1}
                    >
                      Locked Learning Path
                    </Text>
                  </XStack>
                  <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                    <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
                  </TouchableOpacity>
                </XStack>

                {passwordPath && (
                  <>
                    <YStack gap={12}>
                      <Text
                        fontSize={24}
                        fontWeight="bold"
                        color={colorScheme === 'dark' ? '#FFF' : '#000'}
                      >
                        {passwordPath.title[lang] || passwordPath.title.en}
                      </Text>
                      <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                        This learning path is locked and requires a password to access.
                      </Text>
                    </YStack>

                    {passwordPath.lock_password && (
                      <YStack gap={12}>
                        <Text color={colorScheme === 'dark' ? '#CCC' : '#666'} fontSize={16}>
                          Enter password to unlock:
                        </Text>
                        <View
                          style={{
                            backgroundColor: 'rgba(255, 147, 0, 0.2)',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#FF9500',
                            padding: 8,
                          }}
                        >
                          <TextInput
                            value={pathPasswordInput}
                            onChangeText={setPathPasswordInput}
                            secureTextEntry
                            style={{
                              backgroundColor: colorScheme === 'dark' ? '#222' : '#F5F5F5',
                              color: colorScheme === 'dark' ? '#fff' : '#000',
                              padding: 16,
                              borderRadius: 8,
                              fontSize: 18,
                            }}
                            placeholder="Enter password"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                          />
                        </View>
                      </YStack>
                    )}

                    <XStack gap={12} justifyContent="center">
                      <TouchableOpacity
                        onPress={() => setShowPasswordModal(false)}
                        style={{
                          backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                          padding: 16,
                          borderRadius: 12,
                          flex: 1,
                          alignItems: 'center',
                        }}
                      >
                        <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          if (!passwordPath?.lock_password) return;

                          if (pathPasswordInput === passwordPath.lock_password) {
                            // Use shared context to unlock
                            await addUnlockedPath(passwordPath.id);
                            setPathPasswordInput('');
                            setShowPasswordModal(false);

                            showToast({
                              title: 'Unlocked!',
                              message: 'Learning path has been unlocked',
                              type: 'success',
                            });

                            // Reload the learning path data
                            await loadLearningPathData();
                          } else {
                            Alert.alert(
                              'Incorrect Password',
                              'The password you entered is incorrect.',
                            );
                          }
                        }}
                        style={{
                          backgroundColor: '#FF9500',
                          padding: 16,
                          borderRadius: 12,
                          flex: 1,
                          alignItems: 'center',
                        }}
                      >
                        <Text color="#000" fontWeight="bold">
                          Unlock
                        </Text>
                      </TouchableOpacity>
                    </XStack>
                  </>
                )}
              </YStack>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </Modal>
    </>
  );
}
