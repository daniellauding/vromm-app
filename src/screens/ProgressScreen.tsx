import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Modal as RNModal,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { YStack, XStack, Text, Card, Select, Image as TamaguiImage, Button } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TabParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import Svg, { Circle } from 'react-native-svg';
import WebView from 'react-native-webview';
import { Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useScreenLogger } from '../hooks/useScreenLogger';
import { getTabContentPadding } from '../utils/layout';
import { logNavigation, logError, logWarn, logInfo } from '../utils/logger';
import { CommentsSection } from '../components/CommentsSection';
import { ReportDialog } from '../components/report/ReportDialog';

// Define LearningPath type based on the learning_paths table with all fields
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon: string | null;
  image: string | null;
  youtube_url?: string;
  embed_code?: string;
  order_index: number;
  active: boolean;
  bypass_order: boolean; // NEW: Skip order requirements
  created_at: string;
  updated_at: string;

  // Access Control & Business Logic
  is_locked?: boolean;
  lock_password?: string | null;
  language_specific_media?: boolean;

  // Monetization (Paywall) - NEW
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;

  // Enhanced Categorization - EXTENDED
  platform?: string; // web/mobile/both
  type?: string; // learning/assessment/etc
  vehicle_type?: string;
  transmission_type?: string;
  license_type?: string;
  experience_level?: string;
  purpose?: string;
  user_profile?: string;
}

// Enhanced Exercise type with all fields
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

  // Access Control - EXTENDED
  is_locked?: boolean;
  lock_password?: string | null;
  bypass_order?: boolean; // NEW: Skip order requirements for this exercise

  // Monetization - NEW
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;

  // Repeat functionality (existing)
  repeat_count?: number;
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;

  // Quiz System - NEW
  has_quiz?: boolean;
  quiz_required?: boolean;
  quiz_pass_score?: number;
}

// NEW: Quiz-related interfaces
interface QuizQuestion {
  id: string;
  exercise_id: string;
  question_text: { en: string; sv: string };
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  image?: string;
  youtube_url?: string;
  embed_code?: string;
  order_index: number;
  required: boolean;
  points: number;
  explanation_text?: { en: string; sv: string };
  answers: QuizAnswer[];
}

interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: { en: string; sv: string };
  is_correct: boolean;
  image?: string;
  youtube_url?: string;
  embed_code?: string;
  order_index: number;
}

interface UserQuizSubmission {
  id: string;
  user_id: string;
  question_id: string;
  selected_answers: string[];
  is_correct: boolean;
  points_earned: number;
  time_spent: number;
  created_at: string;
}

// NEW: Quiz Attempt and Statistics interfaces
interface QuizAttempt {
  id: string;
  user_id: string;
  exercise_id: string;
  attempt_number: number;
  started_at: string;
  completed_at?: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_spent_seconds: number;
  is_completed: boolean;
  passed: boolean;
  pass_threshold: number;
}

interface QuizStatistics {
  id: string;
  user_id: string;
  exercise_id: string;
  total_attempts: number;
  total_completions: number;
  best_score_percentage: number;
  latest_score_percentage: number;
  total_time_spent_seconds: number;
  first_attempt_at?: string;
  latest_attempt_at?: string;
  first_passed_at?: string;
  times_passed: number;
  times_failed: number;
  current_streak: number;
  best_streak: number;
}

// NEW: Payment-related interface
interface UserPayment {
  id: string;
  user_id: string;
  learning_path_id?: string;
  exercise_id?: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  transaction_id: string;
  expires_at?: string;
  created_at: string;
}

// Use translation context that's available in the app
import { useTranslation } from '../contexts/TranslationContext';

// ProgressCircle component
interface ProgressCircleProps {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}

function ProgressCircle({
  percent,
  size = 56,
  color = '#00E6C3',
  bg = '#222',
}: ProgressCircleProps) {
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

// Define category types based on the learning_path_categories table with new ones
type CategoryType =
  | 'vehicle_type'
  | 'transmission_type'
  | 'license_type'
  | 'experience_level'
  | 'purpose'
  | 'user_profile'
  | 'platform' // NEW
  | 'type'; // NEW

interface CategoryOption {
  id: string;
  category: CategoryType;
  value: string;
  label: { en: string; sv: string };
  order_index: number;
  is_default: boolean;
}

export function ProgressScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TabParamList, 'ProgressTab'>>();
  const { language: lang, t } = useTranslation(); // Get user's language preference and t function
  const { profile, user: authUser } = useAuth(); // Get user profile for auth context
  const { selectedPathId, showDetail, activeUserId } = (route.params || {}) as any;
  const focusExerciseId: string | undefined = (route.params as any)?.focusExerciseId;
  
  // Use activeUserId from navigation if provided (for student switching)
  const effectiveUserId = activeUserId || authUser?.id;

  const [activePath, setActivePath] = useState<string>(selectedPathId || '');
  const [showDetailView, setShowDetailView] = useState<boolean>(!!showDetail);
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PathExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PathExercise | null>(null);
  const { user } = useAuth();
  
  // Debug logging for ProgressScreen
  console.log('📚 [ProgressScreen] Current user:', user?.id, user?.email);
  console.log('📚 [ProgressScreen] Effective user ID:', effectiveUserId);
  console.log('📚 [ProgressScreen] Profile:', profile);
  console.log('📚 [ProgressScreen] Route params:', route.params);
  console.log('📚 [ProgressScreen] Is viewing student data?', !!activeUserId);
  
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [pathProgress, setPathProgress] = useState<{ [pathId: string]: number }>({});

  // Add comprehensive logging
  const { logAction, logAsyncAction, logRenderIssue, logMemoryWarning } = useScreenLogger({
    screenName: 'ProgressScreen',
    trackPerformance: true,
    trackMemory: true,
  });

  // Add category filters with proper state - EXTENDED with new categories
  const [categoryOptions, setCategoryOptions] = useState<Record<CategoryType, CategoryOption[]>>({
    vehicle_type: [],
    transmission_type: [],
    license_type: [],
    experience_level: [],
    purpose: [],
    user_profile: [],
    platform: [], // NEW
    type: [], // NEW
  });

  // State for which categories are selected - EXTENDED
  const [categoryFilters, setCategoryFilters] = useState<Record<CategoryType, string>>({
    vehicle_type: '',
    transmission_type: '',
    license_type: '',
    experience_level: '',
    purpose: '',
    user_profile: '',
    platform: '', // NEW
    type: '', // NEW
  });

  // Add state for password inputs and unlocked items
  const [pathPasswordInput, setPathPasswordInput] = useState('');
  const [exercisePasswordInput, setExercisePasswordInput] = useState('');
  const [unlockedPaths, setUnlockedPaths] = useState<string[]>([]);
  const [unlockedExercises, setUnlockedExercises] = useState<string[]>([]);
  const [virtualRepeatCompletions, setVirtualRepeatCompletions] = useState<string[]>([]);

  // Add state for database-persisted unlocks
  const [persistedUnlocks, setPersistedUnlocks] = useState<{
    paths: string[];
    exercises: string[];
  }>({ paths: [], exercises: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [pathCommentCount, setPathCommentCount] = useState<number>(0);
  const [reportPath, setReportPath] = useState(false);
  const [reportExerciseId, setReportExerciseId] = useState<string | null>(null);

  // NEW: Payment and access control state
  const [userPayments, setUserPayments] = useState<UserPayment[]>([]);
  const [accessiblePaths, setAccessiblePaths] = useState<string[]>([]);
  const [accessibleExercises, setAccessibleExercises] = useState<string[]>([]);

  // NEW: Quiz system state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string[] }>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<{
    [key: number]: { isCorrect: boolean; correctAnswerId: string };
  }>({});
  const [currentQuizAttempt, setCurrentQuizAttempt] = useState<QuizAttempt | null>(null);
  const [quizStatistics, setQuizStatistics] = useState<QuizStatistics | null>(null);

  // NEW: Show all exercises toggle
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [allAvailableExercises, setAllAvailableExercises] = useState<
    (PathExercise & { source: 'database' | 'custom_route'; route_name?: string })[]
  >([]);

  // Load all exercises when toggle is enabled
  useEffect(() => {
    if (showAllExercises && user) {
      loadAllAvailableExercises();
    }
  }, [showAllExercises, user]);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [hasQuizQuestions, setHasQuizQuestions] = useState<{ [exerciseId: string]: boolean }>({});
  const [lastAuditByExercise, setLastAuditByExercise] = useState<Record<string, { action: string; actor_name: string | null; created_at: string }>>({});

    // Load categories from Supabase - RESTORED with proper error handling
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔍 Fetching categories from database...');
        
        const { data, error } = await supabase
          .from('learning_path_categories')
          .select('*')
          .order('order_index', { ascending: true });

        if (error) {
          console.error('❌ Error fetching categories:', error);
          // Use fallback defaults if database fails
          setDefaultFilters();
          return;
        }

        console.log('✅ Successfully fetched categories:', data?.length || 0);

        // Group by category type
        const groupedCategories: Record<CategoryType, CategoryOption[]> = {
          vehicle_type: [],
          transmission_type: [],
          license_type: [],
          experience_level: [],
          purpose: [],
          user_profile: [],
          platform: [],
          type: [],
        };

        // Add "All" option for each category
        for (const key of Object.keys(groupedCategories) as CategoryType[]) {
          groupedCategories[key].push({
            id: `all-${key}`,
            category: key,
            value: 'all',
            label: { en: 'All', sv: 'Alla' },
            order_index: 0,
            is_default: false,
          });
        }

        // Process categories from database
        data?.forEach((item) => {
          const category = item.category as CategoryType;
          if (groupedCategories[category]) {
            groupedCategories[category].push(item as CategoryOption);
          }
        });

        setCategoryOptions(groupedCategories);

        // Set defaults based on your actual data
        // Most learning paths have: Car, Manual, Standard License, Beginner, "Prepare for driving test"
        const defaultFilters: Record<CategoryType, string> = {
          vehicle_type: 'all', // Show all vehicle types
          transmission_type: 'all', // Show all transmission types  
          license_type: 'all', // Show all license types
          experience_level: 'all', // Show all experience levels
          purpose: 'all', // Show all purposes (learning, Signs & Situations, etc.)
          user_profile: 'all', // Show all user profiles
          platform: 'all', // Show all platforms
          type: 'all', // Show all content types
        };

        setCategoryFilters(defaultFilters);
        console.log('✅ Set default category filters:', defaultFilters);

      } catch (err) {
        console.error('💥 Exception fetching categories:', err);
        setDefaultFilters();
      }
    };

    // Helper function to set fallback defaults
    const setDefaultFilters = () => {
      console.log('⚠️ Using fallback category filters');
      setCategoryFilters({
        vehicle_type: 'all',
        transmission_type: 'all',
        license_type: 'all',
        experience_level: 'all',
        purpose: 'all',
        user_profile: 'all',
        platform: 'all',
        type: 'all',
      });
      
      // Set empty category options as fallback
      setCategoryOptions({
        vehicle_type: [],
        transmission_type: [],
        license_type: [],
        experience_level: [],
        purpose: [],
        user_profile: [],
        platform: [],
        type: [],
      });
    };

    fetchCategories();
  }, []);

  // Modal state for category filter selection
  const [activeFilterType, setActiveFilterType] = useState<CategoryType | null>(null);

  // Category labels for display - EXTENDED with translations
  const categoryLabels: Record<CategoryType, string> = {
    vehicle_type: t('filters.vehicleType') || 'Vehicle Type',
    transmission_type: t('filters.transmissionType') || 'Transmission',
    license_type: t('filters.licenseType') || 'License Type',
    experience_level: t('filters.experienceLevel') || 'Experience Level',
    purpose: t('filters.purpose') || 'Purpose',
    user_profile: t('filters.userProfile') || 'User Profile',
    platform: t('filters.platform') || 'Platform',
    type: t('filters.contentType') || 'Content Type',
  };

  // Filter option selection handler
  const handleFilterSelect = (filterType: CategoryType, value: string) => {
    setCategoryFilters((prev) => ({ ...prev, [filterType]: value }));
    setActiveFilterType(null);
  };

  // NEW: Load user payments and access control
  const loadUserAccess = async () => {
    if (!effectiveUserId) return;

    try {
      // Load user payments
      const { data: payments, error: paymentsError } = await supabase
        .from('user_payments')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('status', 'completed');

      if (!paymentsError && payments) {
        setUserPayments(payments);
      }

      // Load accessible paths using helper function
      const { data: pathsData, error: pathsError } = await supabase.rpc(
        'user_can_access_paths_bulk',
        { user_uuid: effectiveUserId },
      );

      if (!pathsError && pathsData) {
        setAccessiblePaths(pathsData);
      }

      // Load accessible exercises using helper function
      const { data: exercisesData, error: exercisesError } = await supabase.rpc(
        'user_can_access_exercises_bulk',
        { user_uuid: effectiveUserId },
      );

      if (!exercisesError && exercisesData) {
        setAccessibleExercises(exercisesData);
      }
    } catch (error) {
      console.error('Error loading user access:', error);
    }
  };

  // NEW: Quiz-related functions
  const fetchQuizQuestions = async (exerciseId: string): Promise<QuizQuestion[]> => {
    try {
      const { data: questions, error } = await supabase
        .from('exercise_quiz_questions')
        .select(
          `
          *,
          answers:exercise_quiz_answers(*)
        `,
        )
        .eq('exercise_id', exerciseId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching quiz questions:', error);
        return [];
      }

      // Check if exercise has quiz questions
      setHasQuizQuestions((prev) => ({
        ...prev,
        [exerciseId]: questions && questions.length > 0,
      }));

      return (questions || []).map((q) => ({
        ...q,
        answers: (q.answers || []).sort(
          (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index,
        ),
      }));
    } catch (error) {
      console.error('Error in fetchQuizQuestions:', error);
      return [];
    }
  };

  const startQuizAttempt = async (exerciseId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Get next attempt number
      const { data: existingAttempts } = await supabase
        .from('quiz_attempts')
        .select('attempt_number')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1;

      // Create new attempt
      const { data: newAttempt, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          exercise_id: exerciseId,
          attempt_number: attemptNumber,
          total_questions: quizQuestions.length,
          started_at: new Date().toISOString(),
          pass_threshold: selectedExercise?.quiz_pass_score || 70,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating quiz attempt:', error);
        return null;
      }

      setCurrentQuizAttempt(newAttempt);
      return newAttempt.id;
    } catch (error) {
      console.error('Error in startQuizAttempt:', error);
      return null;
    }
  };

  const saveQuizQuestionAttempt = async (
    questionId: string,
    selectedAnswerIds: string[],
    isCorrect: boolean,
    pointsEarned: number,
    timeSpent: number,
  ) => {
    if (!currentQuizAttempt) return;

    try {
      await supabase.from('quiz_question_attempts').insert({
        quiz_attempt_id: currentQuizAttempt.id,
        question_id: questionId,
        selected_answer_ids: selectedAnswerIds,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_spent_seconds: timeSpent,
      });
    } catch (error) {
      console.error('Error saving quiz question attempt:', error);
    }
  };

  const completeQuizAttempt = async (
    attemptId: string,
    finalScore: { correct: number; total: number },
  ) => {
    if (!selectedExercise) return;

    const scorePercentage = (finalScore.correct / finalScore.total) * 100;
    const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
    const passThreshold = selectedExercise.quiz_pass_score || 70;
    const passed = scorePercentage >= passThreshold;

    try {
      await supabase
        .from('quiz_attempts')
        .update({
          completed_at: new Date().toISOString(),
          correct_answers: finalScore.correct,
          score_percentage: scorePercentage,
          time_spent_seconds: timeSpent,
          is_completed: true,
          passed: passed,
        })
        .eq('id', attemptId);

      // Statistics are automatically updated via trigger
      await loadQuizStatistics(selectedExercise.id);
      await loadQuizHistory(selectedExercise.id);
    } catch (error) {
      console.error('Error completing quiz attempt:', error);
    }
  };

  const loadQuizStatistics = async (exerciseId: string) => {
    if (!user) return;

    try {
      const { data: stats, error } = await supabase
        .from('user_quiz_statistics')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .single();

      if (!error && stats) {
        setQuizStatistics(stats);
      }
    } catch (error) {
      console.error('Error loading quiz statistics:', error);
    }
  };

  const loadQuizHistory = async (exerciseId: string) => {
    if (!user) return;

    try {
      const { data: history, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (!error && history) {
        setQuizHistory(history);
      }
    } catch (error) {
      console.error('Error loading quiz history:', error);
    }
  };

  const navigateToQuiz = async (exercise: PathExercise) => {
    console.log('Starting quiz for exercise:', exercise.title.en);
    setQuizStartTime(Date.now());

    // 1. Fetch quiz questions
    const questions = await fetchQuizQuestions(exercise.id);
    if (questions.length === 0) {
      Alert.alert('No Quiz Available', 'This exercise does not have any quiz questions.');
      return;
    }

    // 2. Load user statistics and history
    await Promise.all([loadQuizStatistics(exercise.id), loadQuizHistory(exercise.id)]);

    // 3. Initialize quiz state
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore({ correct: 0, total: 0 });
    setShowAnswerFeedback({});

    // 4. Start new quiz attempt
    await startQuizAttempt(exercise.id);

    // 5. Show quiz
    setShowQuiz(true);
  };

  const handleAnswerSelect = async (answerIds: string[]) => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Find the selected answers
    const selectedAnswers = currentQuestion.answers.filter((answer) =>
      answerIds.includes(answer.id),
    );

    // Determine if the answer is correct
    let isCorrect = false;
    if (
      currentQuestion.question_type === 'single_choice' ||
      currentQuestion.question_type === 'true_false'
    ) {
      isCorrect = selectedAnswers.length === 1 && selectedAnswers[0].is_correct;
    } else if (currentQuestion.question_type === 'multiple_choice') {
      const correctAnswers = currentQuestion.answers.filter((answer) => answer.is_correct);
      isCorrect =
        selectedAnswers.length === correctAnswers.length &&
        selectedAnswers.every((answer) => answer.is_correct);
    }

    // Find the correct answer for feedback
    const correctAnswer = currentQuestion.answers.find((answer) => answer.is_correct);

    // Update UI feedback
    setShowAnswerFeedback((prev) => ({
      ...prev,
      [currentQuestionIndex]: {
        isCorrect,
        correctAnswerId: correctAnswer?.id || '',
      },
    }));

    // Store the answer
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answerIds,
    }));

    // Update score
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Save to database
    const timeSpent = 30; // You can track actual time spent per question
    const pointsEarned = isCorrect ? currentQuestion.points : 0;
    await saveQuizQuestionAttempt(
      currentQuestion.id,
      answerIds,
      isCorrect,
      pointsEarned,
      timeSpent,
    );
  };

  const handleQuizNext = async () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Complete quiz
      if (currentQuizAttempt) {
        await completeQuizAttempt(currentQuizAttempt.id, quizScore);
      }
      setQuizCompleted(true);
    }
  };

  const handleQuizPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore({ correct: 0, total: 0 });
    setShowAnswerFeedback({});
    setCurrentQuizAttempt(null);
    setQuizStartTime(Date.now());

    if (selectedExercise) {
      startQuizAttempt(selectedExercise.id);
    }
  };

  const closeQuiz = () => {
    console.log('Closing quiz and resetting state');
    setShowQuiz(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore({ correct: 0, total: 0 });
    setShowAnswerFeedback({});
    setCurrentQuizAttempt(null);
    setQuizStartTime(0);

    // Reload quiz statistics after closing
    if (selectedExercise) {
      loadQuizStatistics(selectedExercise.id);
    }
  };

  // Load quiz questions info for exercises when they change
  useEffect(() => {
    const loadQuizInfo = async () => {
      if (exercises.length > 0) {
        for (const exercise of exercises) {
          await fetchQuizQuestions(exercise.id);
        }
      }
    };
    loadQuizInfo();
  }, [exercises]);

  // Load the display name/email for the user whose progress is being viewed
  useEffect(() => {
    const loadViewingUser = async () => {
      try {
        if (!effectiveUserId) {
          setViewingUserName(null);
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', effectiveUserId)
          .single();
        setViewingUserName(data?.full_name || data?.email || null);
      } catch {
        setViewingUserName(null);
      }
    };
    loadViewingUser();
  }, [effectiveUserId]);

  // Refresh function for pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchLearningPaths(),
        fetchCompletions(),
        loadExistingUnlocks(),
        loadUserAccess(), // NEW
      ]);
    } catch (error) {
      console.error('Error refreshing progress data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate repeat progress for an exercise
  const getRepeatProgress = (
    exercise: PathExercise,
  ): { completed: number; total: number; percent: number } => {
    if (!exercise.repeat_count || exercise.repeat_count <= 1) {
      return { completed: 0, total: 0, percent: 0 };
    }

    const total = exercise.repeat_count;
    let completed = 0;

    // Check main exercise (repeat 1)
    if (completedIds.includes(exercise.id)) {
      completed++;
    }

    // Check virtual repeats (repeat 2+)
    for (let i = 2; i <= total; i++) {
      const virtualId = `${exercise.id}-virtual-${i}`;
      if (virtualRepeatCompletions.includes(virtualId)) {
        completed++;
      }
    }

    const percent = total > 0 ? completed / total : 0;
    return { completed, total, percent };
  };

  // Small progress bar component for repeats
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

  // Toggle completion for an exercise
  const toggleCompletion = async (exerciseId: string) => {
    if (!effectiveUserId) return;
    
    // Only allow completion toggling if user is viewing their own data or is a supervisor
    if (activeUserId && user?.id !== effectiveUserId) {
      // This is a supervisor viewing student data - they can toggle completions
      console.log('📚 Supervisor toggling completion for student:', effectiveUserId);
    }

    // Find the exercise details for debugging
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    const learningPath = paths.find((path) => path.id === exercise?.learning_path_id);

    const isDone = completedIds.includes(exerciseId);

    console.log('🎯 [ProgressScreen] Toggle Completion:', {
      exerciseId,
      exerciseTitle: exercise?.title,
      learningPathId: exercise?.learning_path_id,
      learningPathTitle: learningPath?.title,
      currentCompletions: completedIds.length,
      isCurrentlyCompleted: isDone,
      actionToTake: isDone ? 'REMOVE' : 'ADD',
    });

    // Update UI immediately for better user experience
    if (isDone) {
      // Mark as not done - update UI first
      setCompletedIds((prev) => prev.filter((id) => id !== exerciseId));

      // Then update database
      try {
        const { error } = await supabase
          .from('learning_path_exercise_completions')
          .delete()
          .eq('user_id', effectiveUserId)
          .eq('exercise_id', exerciseId);

        if (error) {
          console.error('❌ [ProgressScreen] Error removing completion:', error);
        } else {
          console.log('🔴 [ProgressScreen] Successfully removed completion');

          // Recalculate progress for affected learning path
          if (exercise?.learning_path_id) {
            const pathProgress = getPathProgress(exercise.learning_path_id);
            console.log('📊 [ProgressScreen] Learning Path Progress after removal:', {
              pathId: exercise.learning_path_id,
              pathTitle: learningPath?.title,
              progressPercent: pathProgress,
              remainingCompletions: completedIds.length - 1,
            });
          }
        }
      } catch (err) {
        console.error('ProgressScreen: Exception in toggleCompletion (remove)', err);
      }
    } else {
      // Mark as done - update UI first
      setCompletedIds((prev) => [...prev, exerciseId]);

      // Then update database
      try {
        const { error } = await supabase
          .from('learning_path_exercise_completions')
          .insert([{ user_id: effectiveUserId, exercise_id: exerciseId }]);

        if (error) {
          console.error('❌ [ProgressScreen] Error adding completion:', error);
        } else {
          console.log('🟢 [ProgressScreen] Successfully added completion');

          // Recalculate progress for affected learning path
          if (exercise?.learning_path_id) {
            const pathProgress = getPathProgress(exercise.learning_path_id);
            console.log('📊 [ProgressScreen] Learning Path Progress after addition:', {
              pathId: exercise.learning_path_id,
              pathTitle: learningPath?.title,
              progressPercent: pathProgress,
              totalCompletions: completedIds.length + 1,
            });
          }
        }
      } catch (err) {
        console.error('ProgressScreen: Exception in toggleCompletion (add)', err);
      }
    }
  };

  // NEW: Enhanced access control using Supabase helper functions
  const checkPathAccess = async (pathId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_can_access_path', {
        user_uuid: user.id,
        path_id: pathId,
      });

      return !error && data === true;
    } catch (error) {
      console.log('ProgressScreen: Error checking path access:', error);
      return false;
    }
  };

  const checkExerciseAccess = async (exerciseId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_can_access_exercise', {
        user_uuid: user.id,
        exercise_id: exerciseId,
      });

      return !error && data === true;
    } catch (error) {
      console.log('ProgressScreen: Error checking exercise access:', error);
      return false;
    }
  };

  // NEW: Check payment status
  const checkPaymentStatus = async (
    contentId: string,
    contentType: 'path' | 'exercise',
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const functionName =
        contentType === 'path' ? 'user_has_paid_for_path' : 'user_has_paid_for_exercise';
      const paramName = contentType === 'path' ? 'path_id' : 'exercise_id';

      const { data, error } = await supabase.rpc(functionName, {
        user_uuid: user.id,
        [paramName]: contentId,
      });

      return !error && data === true;
    } catch (error) {
      console.log('ProgressScreen: Error checking payment status:', error);
      return false;
    }
  };

  // Check if content is already unlocked in database
  // NEW: Load all exercises from both database and custom routes
  const loadAllAvailableExercises = async () => {
    if (!user) return;

    try {
      console.log('🔍 [ProgressScreen] Loading all available exercises...');

      // Get database exercises (learning path exercises)
      const { data: dbExercises, error: dbError } = await supabase
        .from('learning_path_exercises')
        .select('*')
        .order('title', { ascending: true });

      if (dbError) {
        console.error('❌ Error loading database exercises:', dbError);
      }

      // Get custom exercises from routes
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select('id, name, suggested_exercises')
        .not('suggested_exercises', 'is', null)
        .order('created_at', { ascending: false });

      if (routesError) {
        console.error('❌ Error loading custom routes:', routesError);
      }

      const allExercises: (PathExercise & {
        source: 'database' | 'custom_route';
        route_name?: string;
      })[] = [];

      // Add database exercises
      if (dbExercises) {
        dbExercises.forEach((exercise) => {
          allExercises.push({
            ...exercise,
            source: 'database',
            repeat_count: exercise.repeat_count || 1,
          });
        });
      }

      // Add custom exercises from routes
      if (routes) {
        routes.forEach((route) => {
          try {
            // Handle both string and array formats, with comprehensive error handling
            let exercises: any[] = [];
            if (typeof route.suggested_exercises === 'string') {
              // Clean the string and try to parse
              const cleanedString = route.suggested_exercises.trim();
              if (cleanedString && cleanedString !== 'null' && cleanedString !== '') {
                try {
                  exercises = JSON.parse(cleanedString);
                } catch (parseError) {
                  console.warn(
                    '⚠️ [ProgressScreen] Skipping malformed JSON in route:',
                    route.id,
                    'Error:',
                    parseError,
                  );
                  // Try to extract route name for debugging
                  console.warn('Route name:', route.name);
                  console.warn(
                    'First 100 chars of suggested_exercises:',
                    cleanedString.substring(0, 100),
                  );
                  return; // Skip this route entirely
                }
              }
            } else if (Array.isArray(route.suggested_exercises)) {
              exercises = route.suggested_exercises;
            }

            exercises.forEach((exercise: any) => {
              if (exercise.source === 'custom') {
                allExercises.push({
                  id: exercise.id,
                  learning_path_id: '', // Custom exercises don't belong to learning paths
                  title:
                    typeof exercise.title === 'string'
                      ? { en: exercise.title, sv: exercise.title }
                      : exercise.title,
                  description:
                    typeof exercise.description === 'string'
                      ? { en: exercise.description, sv: exercise.description }
                      : exercise.description,
                  order_index: 999, // Put custom exercises at the end
                  repeat_count: exercise.repetitions || 1,
                  has_quiz: exercise.has_quiz || false,
                  quiz_required: exercise.quiz_required || false,
                  source: 'custom_route',
                  route_name: route.name,
                  created_at: exercise.created_at || new Date().toISOString(),
                  updated_at: exercise.created_at || new Date().toISOString(),
                });
              }
            });
          } catch (error) {
            console.error('❌ Error parsing route exercises:', error);
          }
        });
      }

      console.log('✅ [ProgressScreen] Loaded all exercises:', {
        total: allExercises.length,
        database: allExercises.filter((e) => e.source === 'database').length,
        custom: allExercises.filter((e) => e.source === 'custom_route').length,
      });

      setAllAvailableExercises(allExercises);
    } catch (error) {
      console.error('❌ [ProgressScreen] Error loading all exercises:', error);
    }
  };

  const checkExistingUnlock = async (
    contentId: string,
    contentType: 'learning_path' | 'exercise',
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_unlocked_content')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .single();

      return !error && !!data;
    } catch (error) {
      console.log('ProgressScreen: Error checking existing unlock:', error);
      return false;
    }
  };

  // Store successful unlock in database
  const storeUnlock = async (contentId: string, contentType: 'learning_path' | 'exercise') => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_unlocked_content').insert({
        user_id: user.id,
        content_id: contentId,
        content_type: contentType,
      });

      if (error && error.code !== '23505') {
        // Ignore duplicate key errors
        console.log('ProgressScreen: Error storing unlock:', error);
      } else {
        console.log(`ProgressScreen: Successfully stored unlock for ${contentType}: ${contentId}`);
        // Update local persisted unlocks state
        setPersistedUnlocks((prev) => ({
          ...prev,
          [contentType === 'learning_path' ? 'paths' : 'exercises']: [
            ...prev[contentType === 'learning_path' ? 'paths' : 'exercises'],
            contentId,
          ],
        }));
      }
    } catch (error) {
      console.log('ProgressScreen: Error storing unlock:', error);
    }
  };

  // Load existing unlocks from database
  const loadExistingUnlocks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_unlocked_content')
        .select('content_id, content_type')
        .eq('user_id', user.id);

      if (!error && data) {
        const paths = data
          .filter((item) => item.content_type === 'learning_path')
          .map((item) => item.content_id);
        const exercises = data
          .filter((item) => item.content_type === 'exercise')
          .map((item) => item.content_id);

        setPersistedUnlocks({ paths, exercises });
        console.log(
          `ProgressScreen: Loaded ${paths.length} path unlocks and ${exercises.length} exercise unlocks from database`,
        );
      } else {
        console.log('ProgressScreen: No existing unlocks found or error:', error);
      }
    } catch (error) {
      console.log('ProgressScreen: Error loading existing unlocks:', error);
    }
  };

  // Toggle completion for virtual repeat exercises (save to new table)
  const toggleVirtualRepeatCompletion = async (virtualId: string) => {
    if (!effectiveUserId) return;

    // Parse virtualId: "exerciseId-virtual-2" -> exerciseId="exerciseId", repeatNumber=2
    const parts = virtualId.split('-virtual-');
    if (parts.length !== 2) {
      console.error('Invalid virtual ID format:', virtualId);
      return;
    }

    const exerciseId = parts[0];
    const repeatNumber = parseInt(parts[1]);

    if (isNaN(repeatNumber)) {
      console.error('Invalid repeat number in virtual ID:', virtualId);
      return;
    }

    // Find the exercise details for debugging
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    const learningPath = paths.find((path) => path.id === exercise?.learning_path_id);

    const isDone = virtualRepeatCompletions.includes(virtualId);

    console.log('🔄 [ProgressScreen] Toggle Virtual Repeat:', {
      virtualId,
      originalExerciseId: exerciseId,
      repeatNumber,
      exerciseTitle: exercise?.title,
      learningPathId: exercise?.learning_path_id,
      learningPathTitle: learningPath?.title,
      currentlyCompleted: isDone,
      totalVirtualCompletions: virtualRepeatCompletions.length,
      actionToTake: isDone ? 'REMOVE' : 'ADD',
    });

    // Update UI immediately for better user experience
    if (isDone) {
      // Mark as not done - update UI first
      setVirtualRepeatCompletions((prev) => prev.filter((id) => id !== virtualId));

      // Then update database using separate table
      try {
        const { error } = await supabase
          .from('virtual_repeat_completions')
          .delete()
          .eq('user_id', effectiveUserId)
          .eq('exercise_id', exerciseId)
          .eq('repeat_number', repeatNumber);

        if (error) {
          console.error('❌ [ProgressScreen] Error removing virtual repeat completion:', error);
          // Rollback UI change on error
          setVirtualRepeatCompletions((prev) => [...prev, virtualId]);
        } else {
          console.log('🔴 [ProgressScreen] Successfully removed virtual repeat completion');

          // Recalculate progress for affected learning path
          if (exercise?.learning_path_id) {
            const pathProgress = getPathProgress(exercise.learning_path_id);
            console.log(
              '📊 [ProgressScreen] Learning Path Progress after virtual repeat removal:',
              {
                pathId: exercise.learning_path_id,
                pathTitle: learningPath?.title,
                progressPercent: pathProgress,
                remainingVirtualCompletions: virtualRepeatCompletions.length - 1,
              },
            );
          }
        }
      } catch (err) {
        console.error('ProgressScreen: Exception in toggleVirtualRepeatCompletion (remove)', err);
        // Rollback UI change on error
        setVirtualRepeatCompletions((prev) => [...prev, virtualId]);
      }
    } else {
      // Mark as done - update UI first
      setVirtualRepeatCompletions((prev) => [...prev, virtualId]);

      // Then update database using separate table
      try {
        const { error } = await supabase.from('virtual_repeat_completions').insert([
          {
            user_id: effectiveUserId,
            exercise_id: exerciseId, // Use the original exercise ID (not virtual ID)
            repeat_number: repeatNumber,
          },
        ]);

        if (error) {
          console.error('❌ [ProgressScreen] Error adding virtual repeat completion:', error);
          // Rollback UI change on error
          setVirtualRepeatCompletions((prev) => prev.filter((id) => id !== virtualId));
        } else {
          console.log('🟢 [ProgressScreen] Successfully added virtual repeat completion');

          // Recalculate progress for affected learning path
          if (exercise?.learning_path_id) {
            const pathProgress = getPathProgress(exercise.learning_path_id);
            console.log(
              '📊 [ProgressScreen] Learning Path Progress after virtual repeat addition:',
              {
                pathId: exercise.learning_path_id,
                pathTitle: learningPath?.title,
                progressPercent: pathProgress,
                totalVirtualCompletions: virtualRepeatCompletions.length + 1,
              },
            );
          }
        }
      } catch (err) {
        console.error('ProgressScreen: Exception in toggleVirtualRepeatCompletion (add)', err);
        // Rollback UI change on error
        setVirtualRepeatCompletions((prev) => prev.filter((id) => id !== virtualId));
      }
    }
  };

  // Mark all exercises as complete or incomplete
  const handleMarkAllExercises = async (isComplete: boolean) => {
    if (!detailPath || !effectiveUserId) return;
    console.log(
      `ProgressScreen: Marking all exercises as ${isComplete ? 'complete' : 'incomplete'}`,
    );

    try {
      setLoading(true);
      // First get all exercise IDs for this learning path
      const { data: exercises } = await supabase
        .from('learning_path_exercises')
        .select('id')
        .eq('learning_path_id', detailPath.id);

      if (!exercises || exercises.length === 0) return;
      console.log(`ProgressScreen: Found ${exercises.length} exercises to mark`);

      const exerciseIds = exercises.map((ex) => ex.id);

      // Update local state immediately for better UI feedback
      if (isComplete) {
        // Add all completions (that don't exist yet)
        // First, filter out what's already completed
        const exercisesToComplete = exerciseIds.filter((id) => !completedIds.includes(id));
        console.log(`ProgressScreen: Adding ${exercisesToComplete.length} new completions`);

        // Update state immediately before database operation
        if (exercisesToComplete.length > 0) {
          setCompletedIds((prev) => [...prev, ...exercisesToComplete]);

          // Insert all completions at once
          const completions = exercisesToComplete.map((exercise_id) => ({
            user_id: effectiveUserId,
            exercise_id,
          }));

          const { error } = await supabase
            .from('learning_path_exercise_completions')
            .insert(completions);

          if (error) {
            console.error('ProgressScreen: Error in bulk insert', error);
          } else {
            console.log('ProgressScreen: Successfully added all completions');
          }
        }
      } else {
        // Mark all as incomplete - update state immediately
        console.log(`ProgressScreen: Removing ${exerciseIds.length} completions`);
        setCompletedIds((prev) => prev.filter((id) => !exerciseIds.includes(id)));

        // Delete all completions for this learning path
        const { error } = await supabase
          .from('learning_path_exercise_completions')
          .delete()
          .eq('user_id', effectiveUserId)
          .in('exercise_id', exerciseIds);

        if (error) {
          console.error('ProgressScreen: Error in bulk delete', error);
        } else {
          console.log('ProgressScreen: Successfully removed all completions');
        }
      }
    } catch (err) {
      console.error('Error marking all exercises:', err);
      setError('Failed to update exercises. Please try again.');

      // If there was an error, refresh completions to restore correct state
      fetchCompletions();
    } finally {
      setLoading(false);
    }
  };

  // Dedicated function to fetch completions
  const fetchCompletions = async () => {
    if (!effectiveUserId) return;
    
    try {
      setCompletionsLoading(true);
      console.log('🔍 Attempting to fetch exercise completions...');

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

      if (regularError) {
        console.error('❌ Error fetching regular completions:', regularError);
        setCompletedIds([]);
      } else {
        setCompletedIds(regularData?.map((c: { exercise_id: string }) => c.exercise_id) || []);
      }

      if (virtualError) {
        console.error('❌ Error fetching virtual completions:', virtualError);
        setVirtualRepeatCompletions([]);
      } else {
        // Convert virtual completions back to virtualId format: "exerciseId-virtual-2"
        const virtualCompletions = virtualData?.map(
          (c: { exercise_id: string; repeat_number: number }) =>
            `${c.exercise_id}-virtual-${c.repeat_number}`,
        ) || [];
        setVirtualRepeatCompletions(virtualCompletions);
      }

      console.log(
        `✅ Loaded ${regularData?.length || 0} regular completions and ${virtualData?.length || 0} virtual repeat completions`,
      );
    } catch (error) {
      console.error('💥 Critical error fetching completions:', error);
      // Set empty arrays to prevent crashes
      setCompletedIds([]);
      setVirtualRepeatCompletions([]);
    } finally {
      setCompletionsLoading(false);
    }
  };

  // Fetch completions and existing unlocks for the current user
  useEffect(() => {
    fetchCompletions();
    loadExistingUnlocks();

    // RESTORED: Real-time subscription for completions
    console.log('✅ Setting up real-time subscriptions');
    
    // Set up real-time subscription for completions
    if (effectiveUserId) {
      console.log('ProgressScreen: Setting up real-time subscription', effectiveUserId);

      // Create a unique channel name that includes the component instance
      const channelName = `progress-screen-completions-${Date.now()}`;
      console.log(`ProgressScreen: Creating channel ${channelName}`);

      const completionsSubscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'learning_path_exercise_completions',
            filter: `user_id=eq.${effectiveUserId}`,
          },
          (payload) => {
            console.log('ProgressScreen: Realtime update received:', payload.eventType);
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
          () => {
            console.log('ProgressScreen: Realtime update received (virtual repeats)');
            fetchCompletions();
          },
        )
        .subscribe((status) => {
          console.log(`ProgressScreen: Subscription status: ${status}`);
        });

      // Clean up subscription on unmount
      return () => {
        console.log(`ProgressScreen: Cleaning up subscription ${channelName}`);
        supabase.removeChannel(completionsSubscription);
      };
    }
  }, [effectiveUserId]);

  // History (audit) list support
  const [auditEntries, setAuditEntries] = useState<Array<{ exercise_id: string; repeat_number: number | null; action: string; actor_name: string | null; created_at: string }>>([]);
  const [exerciseInfoById, setExerciseInfoById] = useState<Record<string, { title: { en: string; sv: string }; repeat_count?: number; learning_path_id: string }>>({});

  const loadAudit = async () => {
    if (!effectiveUserId) return;
    try {
      const { data, error } = await supabase
        .from('exercise_completion_audit')
        .select('exercise_id, repeat_number, action, actor_name, created_at')
        .eq('student_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setAuditEntries(data as any);
        // Load exercise titles and repeat counts for context
        const ids = Array.from(new Set((data as any[]).map((d) => d.exercise_id)));
        if (ids.length > 0) {
          const { data: exData } = await supabase
            .from('learning_path_exercises')
            .select('id, title, repeat_count, learning_path_id')
            .in('id', ids);
          const map: Record<string, { title: { en: string; sv: string }; repeat_count?: number; learning_path_id: string }> = {};
          (exData || []).forEach((row: any) => {
            map[row.id] = {
              title: row.title || { en: 'Untitled', sv: 'Namnlös' },
              repeat_count: row.repeat_count || 1,
              learning_path_id: row.learning_path_id,
            };
          });
          setExerciseInfoById(map);
        } else {
          setExerciseInfoById({});
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (historyModalVisible) {
      loadAudit();
    }
  }, [historyModalVisible, effectiveUserId]);

  // Calculate percentage of completion for active path
  const calculatePathCompletion = (pathId: string): number => {
    if (!pathId) return 0;

    // Use an async function and await to properly handle the Promise
    const getExercisesAndCalculate = async () => {
      try {
        const { data, error } = await supabase
          .from('learning_path_exercises')
          .select('id')
          .eq('learning_path_id', pathId);

        if (error || !data) return 0;

        const exerciseIds = data.map((e: { id: string }) => e.id);
        if (exerciseIds.length === 0) return 0;

        const completed = exerciseIds.filter((id) => completedIds.includes(id)).length;
        return (completed / exerciseIds.length) * 100;
      } catch (err) {
        console.error('Error calculating path completion:', err);
        return 0;
      }
    };

    // For now just return 0, we'll update this in the UI when the data is available
    return 0;
  };

  // Filter paths based on selected categories with robust data value matching
  const filteredPaths = useMemo(() => {
    return paths.filter((path) => {
      // Handle variations in data values and allow null values
      const matchesVehicleType =
        categoryFilters.vehicle_type === 'all' ||
        !path.vehicle_type ||
        path.vehicle_type === categoryFilters.vehicle_type ||
        // Handle data variations
        (categoryFilters.vehicle_type === 'passenger_car' && path.vehicle_type === 'Car') ||
        (categoryFilters.vehicle_type === 'Car' && path.vehicle_type === 'passenger_car');
        
      const matchesTransmission =
        categoryFilters.transmission_type === 'all' ||
        !path.transmission_type ||
        path.transmission_type === categoryFilters.transmission_type ||
        // Handle data variations
        (categoryFilters.transmission_type === 'manual' && path.transmission_type === 'Manual') ||
        (categoryFilters.transmission_type === 'Manual' && path.transmission_type === 'manual');
        
      const matchesLicense =
        categoryFilters.license_type === 'all' ||
        !path.license_type ||
        path.license_type === categoryFilters.license_type ||
        // Handle data variations
        (categoryFilters.license_type === 'b' && path.license_type === 'Standard Driving License') ||
        (categoryFilters.license_type === 'Standard Driving License' && path.license_type === 'b');
        
      const matchesExperience =
        categoryFilters.experience_level === 'all' ||
        !path.experience_level ||
        path.experience_level === categoryFilters.experience_level ||
        // Handle data variations
        (categoryFilters.experience_level === 'beginner' && path.experience_level === 'Beginner') ||
        (categoryFilters.experience_level === 'Beginner' && path.experience_level === 'beginner');
        
      const matchesPurpose =
        categoryFilters.purpose === 'all' ||
        !path.purpose ||
        path.purpose === categoryFilters.purpose;
        
      const matchesUserProfile =
        categoryFilters.user_profile === 'all' ||
        !path.user_profile ||
        path.user_profile === categoryFilters.user_profile ||
        // "All" user profile matches any filter
        path.user_profile === 'All';
        
      const matchesPlatform =
        categoryFilters.platform === 'all' ||
        !path.platform ||
        path.platform === 'both' || // "both" platform matches any filter
        path.platform === categoryFilters.platform;
        
      const matchesType =
        categoryFilters.type === 'all' || 
        !path.type || 
        path.type === categoryFilters.type;

      return (
        matchesVehicleType &&
        matchesTransmission &&
        matchesLicense &&
        matchesExperience &&
        matchesPurpose &&
        matchesUserProfile &&
        matchesPlatform &&
        matchesType
      );
    });
  }, [paths, categoryFilters]);

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  // Add navigation listener to refresh data when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 [ProgressScreen] Screen focused - refreshing data');
      fetchCompletions();
      // Also refresh the exercises to get latest state
      if (showDetailView && detailPath) {
        const refreshExercises = async () => {
          const { data } = await supabase
            .from('learning_path_exercises')
            .select('*')
            .eq('learning_path_id', detailPath.id)
            .order('order_index', { ascending: true });
          if (data) {
            setExercises(data);
            if (focusExerciseId) {
              const found = (data as any[]).find((ex) => ex.id === focusExerciseId);
              if (found) setSelectedExercise(found as any);
            }
          }
        };
        refreshExercises();
      }
    });

    return unsubscribe;
  }, [navigation, showDetailView, detailPath]);

  // Populate exercisesByPath mapping for consistent progress calculation
  useEffect(() => {
    const fetchAllExercises = async () => {
      const map: { [pathId: string]: string[] } = {};
      for (const path of paths) {
        const { data } = await supabase
          .from('learning_path_exercises')
          .select('id')
          .eq('learning_path_id', path.id);
        map[path.id] = data ? data.map((e: { id: string }) => e.id) : [];
      }
      setExercisesByPath(map);
    };
    if (paths.length > 0) fetchAllExercises();
  }, [paths]);

  useEffect(() => {
    if (selectedPathId && paths.length > 0) {
      const path = paths.find((p) => p.id === selectedPathId);
      if (path) {
        setDetailPath(path);
        setShowDetailView(!!showDetail);
      }
    }
  }, [selectedPathId, showDetail, paths]);

  useEffect(() => {
    if (showDetailView && detailPath) {
      // Fetch exercises for the selected learning path
      const fetchExercises = async () => {
        const { data, error } = await supabase
          .from('learning_path_exercises')
          .select('*')
          .eq('learning_path_id', detailPath.id)
          .order('order_index', { ascending: true });
        if (!error && data) {
          // Just use the exercises as they come from the database
          // Don't create fake repeat exercises - only work with real database entries
          setExercises(data || []);
          try {
            const ids = (data || []).map((e: any) => e.id);
            if (ids.length > 0) {
              const { data: cc } = await supabase
                .from('comment_counts')
                .select('target_type,target_id,count')
                .eq('target_type', 'exercise')
                .in('target_id', ids);
              const map: Record<string, number> = {};
              (cc || []).forEach((r: any) => (map[r.target_id] = r.count || 0));
              setCommentCounts(map);
              const total = ids.reduce((sum: number, id: string) => sum + (map[id] || 0), 0);
              setPathCommentCount(total);
            } else {
              setCommentCounts({});
              setPathCommentCount(0);
            }
          } catch {
            setCommentCounts({});
            setPathCommentCount(0);
          }
        } else {
          setExercises([]);
        }
      };
      fetchExercises();
    }
  }, [showDetailView, detailPath]);

  const fetchLearningPaths = async () => {
    try {
      setLoading(true);
      console.log('🔍 Attempting to fetch learning paths...');
      
      // Add timeout and error handling
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Successfully fetched learning paths:', data?.length || 0);
      setPaths(data || []);
      
      // Set the first path as active by default if no selectedPathId
      if (data && data.length > 0 && !selectedPathId) {
        setActivePath(data[0].id);
      }
    } catch (err) {
      console.error('💥 Critical error fetching learning paths:', err);
      setError('Unable to connect to database. Please check your internet connection.');
      
      // Set empty data to prevent crashes
      setPaths([]);
    } finally {
      setLoading(false);
    }
  };

  // NEW: More permissive path access - allow users to explore paths
  const shouldPathBeEnabled = async (path: LearningPath, index: number): Promise<boolean> => {
    // Always check if path bypasses order requirements first
    if (path.bypass_order) {
      console.log(`Path ${path.title.en} bypasses order requirements`);
      return true;
    }

    // First path is always enabled
    if (index === 0) return true;

    // Make paths more accessible - only block if specifically locked
    if (
      path.is_locked &&
      !unlockedPaths.includes(path.id) &&
      !persistedUnlocks.paths.includes(path.id)
    ) {
      return false;
    }

    // Check if user can access this path using Supabase helper function
    try {
      const canAccess = await checkPathAccess(path.id);
      if (canAccess) {
        console.log(`Path ${path.title.en} is accessible via helper function`);
        return true;
      }
    } catch (error) {
      console.error('Error checking path access:', error);
    }

    // Default to allowing access - let users explore learning paths
    console.log(`Path ${path.title.en} is accessible (permissive mode)`);
    return true;
  };

  // NEW: More permissive exercise access - allow users to explore exercises
  const shouldExerciseBeEnabled = async (
    exercise: PathExercise,
    exerciseIndex: number,
  ): Promise<boolean> => {
    // Always check if exercise bypasses order requirements first
    if (exercise.bypass_order) {
      console.log(`Exercise ${exercise.title.en} bypasses order requirements`);
      return true;
    }

    // First exercise in path is always enabled
    if (exerciseIndex === 0) return true;

    // Make exercises more accessible - only block if specifically locked
    if (
      exercise.is_locked &&
      !unlockedExercises.includes(exercise.id) &&
      !persistedUnlocks.exercises.includes(exercise.id)
    ) {
      return false;
    }

    // Check if user can access this exercise using Supabase helper function
    try {
      const canAccess = await checkExerciseAccess(exercise.id);
      if (canAccess) {
        console.log(`Exercise ${exercise.title.en} is accessible via helper function`);
        return true;
      }
    } catch (error) {
      console.error('Error checking exercise access:', error);
    }

    // Default to allowing access - let users explore exercises
    console.log(`Exercise ${exercise.title.en} is accessible (permissive mode)`);
    return true;
  };

  // Modified handlePathPress to allow clicking on future paths
  const handlePathPress = (path: LearningPath, index: number) => {
    setActivePath(path.id);
    setDetailPath(path);
    setShowDetailView(true);
  };

  // Calculate progress for each path using exercisesByPath mapping
  const getPathProgress = (pathId: string): number => {
    if (!pathId) return 0;

    const ids = exercisesByPath[pathId] || [];
    if (ids.length === 0) return 0;

    const completed = ids.filter((id) => completedIds.includes(id)).length;
    return completed / ids.length;
  };

  // Render the filter modals
  const renderFilterModal = (filterType: CategoryType | null) => {
    if (!filterType) return null;

    const options = categoryOptions[filterType] || [];

    return (
      <RNModal
        visible={!!filterType}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveFilterType(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setActiveFilterType(null)}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
          >
            <Text fontSize={20} fontWeight="bold" color="$color">
              {categoryLabels[filterType]}
            </Text>
            <YStack gap="$2">
              {options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleFilterSelect(filterType, option.value)}
                  style={{
                    backgroundColor:
                      categoryFilters[filterType] === option.value ? '#00E6C3' : '#222',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    fontSize={16}
                    color={categoryFilters[filterType] === option.value ? '#000' : '#fff'}
                  >
                    {option.label[lang] || option.label.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </YStack>
            <TouchableOpacity
              onPress={() => setActiveFilterType(null)}
              style={{
                backgroundColor: '#333',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text fontSize={16} color="#fff">
                Cancel
              </Text>
            </TouchableOpacity>
          </YStack>
        </Pressable>
      </RNModal>
    );
  };

  // Youtube video component
  const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
    const screenWidth = Dimensions.get('window').width;
    const videoWidth = screenWidth - 48; // Account for padding
    const videoHeight = videoWidth * 0.5625; // 16:9 aspect ratio

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

  // TypeForm Embed component - improved version
  const TypeFormEmbed = ({ formId }: { formId: string }) => {
    const screenWidth = Dimensions.get('window').width;
    const formWidth = screenWidth - 48;
    const formHeight = 500; // Increased height for better visibility

    // Check if formId is a complete URL or just an ID
    const isCompleteUrl = formId.startsWith('http');

    // Get the proper URL format for typeform
    let typeformUrl = formId;
    if (!isCompleteUrl) {
      // If it's just an ID, construct the proper typeform URL
      typeformUrl = `https://form.typeform.com/to/${formId}`;
    }

    // Create HTML with proper script loading and sizing
    const typeformHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
        <title>Typeform</title>
        <style>
          html { margin: 0; height: 100%; overflow: hidden; }
          body { margin: 0; height: 100%; overflow: hidden; }
          iframe { border: 0; height: 100%; left: 0; position: absolute; top: 0; width: 100%; }
        </style>
      </head>
      <body>
        <iframe id="typeform-full" width="100%" height="100%" frameborder="0" allow="camera; microphone; autoplay; encrypted-media;" src="${typeformUrl}"></iframe>
      </body>
      </html>
    `;

    console.log('Rendering Typeform with URL:', typeformUrl);

    return (
      <View
        style={{
          width: formWidth,
          height: formHeight,
          marginVertical: 12,
          borderRadius: 8,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#333',
        }}
      >
        <WebView
          source={{ html: typeformHtml }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={false}
          scrollEnabled={false}
          bounces={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onError={(error) => console.error('Typeform WebView error:', error)}
          onMessage={(event) => console.log('Typeform WebView message:', event.nativeEvent.data)}
        />
      </View>
    );
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string | undefined): string | null => {
    if (!url) return null;

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  // Extract TypeForm ID from embed code or URL
  const getTypeformId = (embedCode: string | undefined): string | null => {
    if (!embedCode) return null;

    // If it's already a full Typeform URL, return it directly
    if (
      embedCode.startsWith('https://form.typeform.com/') ||
      embedCode.startsWith('https://forms.typeform.com/')
    ) {
      return embedCode;
    }

    // Extract ID from element with data-tf-live attribute
    const tfLiveMatch = embedCode.match(/data-tf-live="([^"]+)"/);
    if (tfLiveMatch) return tfLiveMatch[1];

    // Extract ID from to/XXXX format (common in Typeform URLs)
    const toMatch = embedCode.match(/to\/([a-zA-Z0-9]+)/);
    if (toMatch) return toMatch[1];

    // Extract just the ID if it's a plain ID format
    const idOnlyMatch = embedCode.match(/^[a-zA-Z0-9]{16,32}$/);
    if (idOnlyMatch) return embedCode;

    return null;
  };

  // Render media for an exercise
  const renderExerciseMedia = (exercise: PathExercise) => {
    return (
      <YStack gap={16}>
        {/* YouTube Video */}
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

        {/* Image */}
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

        {/* Embed (TypeForm) */}
        {exercise.embed_code &&
          (() => {
            const typeformValue = exercise.embed_code ? getTypeformId(exercise.embed_code) : null;
            return typeformValue ? (
              <YStack>
                <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
                  Interactive Form
                </Text>
                <TypeFormEmbed formId={typeformValue} />
              </YStack>
            ) : null;
          })()}
      </YStack>
    );
  };

  // Function to check if a path is accessible
  const isPathAccessible = (path: LearningPath): boolean => {
    if (!path.is_locked) return true;
    return unlockedPaths.includes(path.id);
  };

  // Function to check if an exercise is accessible
  const isExerciseAccessible = (exercise: PathExercise): boolean => {
    if (!exercise.is_locked) return true;
    return unlockedExercises.includes(exercise.id);
  };

  // Enhanced isPathPasswordLocked function to check for locked status (includes database unlocks)
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    // Use !! to convert undefined to false, ensuring boolean return
    return (
      !!path.is_locked &&
      !unlockedPaths.includes(path.id) &&
      !persistedUnlocks.paths.includes(path.id)
    );
  };

  // NEW: Check if path is behind paywall
  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;

    // Check if user has paid for this path
    const hasPaid = userPayments.some(
      (payment) => payment.learning_path_id === path.id && payment.status === 'completed',
    );

    return !hasPaid;
  };

  // Separate function to check if a path specifically has a password
  const pathHasPassword = (path: LearningPath): boolean => {
    return !!path.is_locked && !!path.lock_password;
  };

  // Function to check if an exercise is locked with password (includes database unlocks)
  const isExercisePasswordLocked = (exercise: PathExercise): boolean => {
    // Use !! to convert undefined to false, ensuring boolean return
    return (
      !!exercise.is_locked &&
      !!exercise.lock_password &&
      !unlockedExercises.includes(exercise.id) &&
      !persistedUnlocks.exercises.includes(exercise.id)
    );
  };

  // NEW: Check if exercise is behind paywall
  const isExercisePaywallLocked = (exercise: PathExercise): boolean => {
    if (!exercise.paywall_enabled) return false;

    // Check if user has paid for this exercise
    const hasPaid = userPayments.some(
      (payment) => payment.exercise_id === exercise.id && payment.status === 'completed',
    );

    return !hasPaid;
  };

  // Function to unlock a path with password (now with persistence)
  const unlockPath = async () => {
    if (!detailPath || !detailPath.lock_password) return;

    // Check if already unlocked in database first
    const isAlreadyUnlocked = await checkExistingUnlock(detailPath.id, 'learning_path');
    if (isAlreadyUnlocked) {
      setUnlockedPaths((prev) => [...prev, detailPath.id]);
      setPathPasswordInput('');
      return;
    }

    if (pathPasswordInput === detailPath.lock_password) {
      setUnlockedPaths((prev) => [...prev, detailPath.id]);
      setPathPasswordInput('');
      // Store successful unlock in database
      await storeUnlock(detailPath.id, 'learning_path');
    } else {
      Alert.alert('Incorrect Password', 'The password you entered is incorrect.');
    }
  };

  // Function to unlock an exercise with password (now with persistence)
  const unlockExercise = async () => {
    if (!selectedExercise || !selectedExercise.lock_password) return;

    // Check if already unlocked in database first
    const isAlreadyUnlocked = await checkExistingUnlock(selectedExercise.id, 'exercise');
    if (isAlreadyUnlocked) {
      setUnlockedExercises((prev) => [...prev, selectedExercise.id]);
      setExercisePasswordInput('');
      return;
    }

    if (exercisePasswordInput === selectedExercise.lock_password) {
      setUnlockedExercises((prev) => [...prev, selectedExercise.id]);
      setExercisePasswordInput('');
      // Store successful unlock in database
      await storeUnlock(selectedExercise.id, 'exercise');
    } else {
      Alert.alert('Incorrect Password', 'The password you entered is incorrect.');
    }
  };

  // Add the UnavailablePathView component for paths that aren't ready yet
  const UnavailablePathView = () => {
    return (
      <YStack gap={16} padding={24} alignItems="center">
        <MaterialIcons name="hourglass-empty" size={48} color="#FF9500" />
        <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">
          This Learning Path is Not Available Yet
        </Text>
        <Text color="$gray11" textAlign="center">
          You need to complete the previous learning path before accessing this one.
        </Text>
        <TouchableOpacity
          onPress={() => setShowDetailView(false)}
          style={{
            marginTop: 16,
            backgroundColor: '#333',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text color="$color" fontWeight="bold">
            Go Back
          </Text>
        </TouchableOpacity>
      </YStack>
    );
  };

  // Removed UnavailableExerciseView - exercises are now freely accessible

  // NEW: Quiz UI Components
  const QuizStatisticsDisplay = ({ stats }: { stats: QuizStatistics | null }) => {
    if (!stats) return null;

    return (
      <YStack
        backgroundColor="rgba(0, 230, 195, 0.1)"
        padding={16}
        borderRadius={12}
        marginBottom={16}
      >
        <XStack alignItems="center" gap={8} marginBottom={8}>
          <MaterialIcons name="quiz" size={20} color="#00E6C3" />
          <Text fontSize={16} fontWeight="bold" color="#00E6C3">
            Quiz Performance
          </Text>
        </XStack>

        <XStack justifyContent="space-between" marginBottom={8}>
          <YStack alignItems="center">
            <Text fontSize={24} fontWeight="bold" color="$color">
              {stats.best_score_percentage.toFixed(0)}%
            </Text>
            <Text fontSize={12} color="$gray11">
              Best Score
            </Text>
          </YStack>

          <YStack alignItems="center">
            <Text fontSize={24} fontWeight="bold" color="$color">
              {stats.times_passed}
            </Text>
            <Text fontSize={12} color="$gray11">
              Times Passed
            </Text>
          </YStack>

          <YStack alignItems="center">
            <Text fontSize={24} fontWeight="bold" color="$color">
              {stats.current_streak}
            </Text>
            <Text fontSize={12} color="$gray11">
              Current Streak
            </Text>
          </YStack>

          <YStack alignItems="center">
            <Text fontSize={24} fontWeight="bold" color="$color">
              {stats.total_attempts}
            </Text>
            <Text fontSize={12} color="$gray11">
              Total Attempts
            </Text>
          </YStack>
        </XStack>
      </YStack>
    );
  };

  const QuizInterface = () => {
    // Only show quiz modal when explicitly requested and questions are loaded
    if (!showQuiz || quizQuestions.length === 0) return null;

    console.log('Rendering QuizInterface', {
      showQuiz,
      questionsCount: quizQuestions.length,
      completed: quizCompleted,
    });

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    const selectedAnswers = quizAnswers[currentQuestionIndex] || [];
    const feedback = showAnswerFeedback[currentQuestionIndex];
    const hasAnswer = selectedAnswers.length > 0;

    if (quizCompleted) {
      const scorePercentage = (quizScore.correct / quizScore.total) * 100;
      const passed = scorePercentage >= (selectedExercise?.quiz_pass_score || 70);

      return (
        <RNModal
          visible={showQuiz}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeQuiz}
        >
          <YStack flex={1} backgroundColor="$background" padding={24}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
              <Text fontSize={24} fontWeight="bold" color="$color">
                Quiz Completed!
              </Text>
              <TouchableOpacity onPress={closeQuiz}>
                <Feather name="x" size={28} color="#fff" />
              </TouchableOpacity>
            </XStack>

            <YStack alignItems="center" marginBottom={32}>
              <YStack alignItems="center" marginBottom={16}>
                <Text fontSize={48} fontWeight="bold" color={passed ? '#00E6C3' : '#EF4444'}>
                  {scorePercentage.toFixed(0)}%
                </Text>
                <Text fontSize={18} fontWeight="bold" color={passed ? '#00E6C3' : '#EF4444'}>
                  {passed ? 'PASSED' : 'FAILED'}
                </Text>
              </YStack>

              <Text fontSize={16} color="$color" marginBottom={8}>
                {quizScore.correct} Correct | {quizScore.total - quizScore.correct} Incorrect
              </Text>
            </YStack>

            <QuizStatisticsDisplay stats={quizStatistics} />

            {quizHistory.length > 0 && (
              <YStack marginBottom={24}>
                <Text fontSize={18} fontWeight="bold" color="$color" marginBottom={12}>
                  Recent Attempts
                </Text>
                {quizHistory.slice(0, 5).map((attempt) => (
                  <XStack
                    key={attempt.id}
                    justifyContent="space-between"
                    alignItems="center"
                    padding={12}
                    backgroundColor="$backgroundStrong"
                    borderRadius={8}
                    marginBottom={8}
                  >
                    <Text color="$color">
                      #{attempt.attempt_number} - {attempt.score_percentage.toFixed(0)}%
                    </Text>
                    <Text
                      fontSize={12}
                      color={attempt.passed ? '#00E6C3' : '#EF4444'}
                      fontWeight="bold"
                    >
                      {attempt.passed ? 'PASSED' : 'FAILED'}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            )}

            <XStack gap={12}>
              <Button flex={1} backgroundColor="#333" onPress={closeQuiz} borderRadius={12}>
                Back to Exercise
              </Button>
              <Button
                flex={1}
                backgroundColor="#00E6C3"
                color="#000"
                onPress={() => {
                  setQuizCompleted(false);
                  resetQuiz();
                }}
                borderRadius={12}
              >
                Start Over
              </Button>
            </XStack>
          </YStack>
        </RNModal>
      );
    }

    return (
      <RNModal
        visible={showQuiz}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeQuiz}
      >
        <YStack flex={1} backgroundColor="$background">
          {/* Quiz Header */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            padding={16}
            borderBottomWidth={1}
            borderBottomColor="rgba(255, 255, 255, 0.2)"
          >
            <TouchableOpacity onPress={closeQuiz}>
              <Feather name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>

            <YStack alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$color">
                Quiz: {selectedExercise?.title.en}
              </Text>
              <Text fontSize={14} color="$gray11">
                Question {currentQuestionIndex + 1} of {quizQuestions.length} | Score:{' '}
                {quizScore.correct}/{quizScore.total}
              </Text>
            </YStack>

            <TouchableOpacity onPress={resetQuiz}>
              <Text fontSize={14} color="#00E6C3">
                Start Over
              </Text>
            </TouchableOpacity>
          </XStack>

          {/* Progress Bar */}
          <View style={{ padding: 16 }}>
            <View
              style={{
                width: '100%',
                height: 4,
                backgroundColor: '#333',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#00E6C3',
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: getTabContentPadding() }}>
            {/* Question Content */}
            <YStack
              backgroundColor="rgba(255, 255, 255, 0.1)"
              borderRadius={12}
              padding={16}
              marginBottom={24}
            >
              <Text fontSize={18} fontWeight="bold" color="$color" marginBottom={16}>
                {currentQuestion.question_text.en}
              </Text>

              {/* Question Media */}
              {currentQuestion.image && (
                <Image
                  source={{ uri: currentQuestion.image }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                />
              )}
            </YStack>

            {/* Answer Options */}
            <YStack gap={8}>
              {currentQuestion.answers.map((answer) => {
                const isSelected = selectedAnswers.includes(answer.id);
                const isCorrect = feedback?.isCorrect && isSelected;
                const isIncorrect = feedback && !feedback.isCorrect && isSelected;
                const isCorrectAnswer = feedback?.correctAnswerId === answer.id;
                const showFeedback = !!feedback;

                let backgroundColor = 'rgba(255, 255, 255, 0.05)';
                let borderColor = 'rgba(255, 255, 255, 0.2)';

                if (showFeedback) {
                  if (isCorrect || isCorrectAnswer) {
                    backgroundColor = 'rgba(34, 197, 94, 0.2)';
                    borderColor = '#22C55E';
                  } else if (isIncorrect) {
                    backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    borderColor = '#EF4444';
                  }
                }

                return (
                  <TouchableOpacity
                    key={answer.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor,
                      borderColor,
                      opacity: showFeedback ? 0.8 : 1,
                    }}
                    onPress={() => !showFeedback && handleAnswerSelect([answer.id])}
                    disabled={showFeedback}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#00E6C3' : '#666',
                        backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                        marginRight: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Feather name="check" size={16} color="#fff" />}
                    </View>

                    <Text fontSize={16} color="$color" flex={1}>
                      {answer.answer_text.en}
                    </Text>

                    {showFeedback && (isCorrect || isCorrectAnswer) && (
                      <Feather name="check-circle" size={20} color="#22C55E" />
                    )}
                    {showFeedback && isIncorrect && (
                      <Feather name="x-circle" size={20} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </YStack>

            {/* Explanation */}
            {feedback && currentQuestion.explanation_text?.en && (
              <YStack
                backgroundColor="rgba(0, 230, 195, 0.1)"
                padding={16}
                borderRadius={12}
                marginTop={16}
              >
                <Text fontSize={16} fontWeight="bold" color="#00E6C3" marginBottom={8}>
                  Explanation
                </Text>
                <Text fontSize={14} color="$color">
                  {currentQuestion.explanation_text.en}
                </Text>
              </YStack>
            )}
          </ScrollView>

          {/* Navigation */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            padding={16}
            borderTopWidth={1}
            borderTopColor="rgba(255, 255, 255, 0.2)"
          >
            <Button
              backgroundColor={currentQuestionIndex > 0 ? '#333' : 'transparent'}
              disabled={currentQuestionIndex === 0}
              onPress={handleQuizPrevious}
              borderRadius={8}
              paddingHorizontal={20}
            >
              Previous
            </Button>

            <Text fontSize={14} color="$gray11">
              {currentQuestionIndex + 1} / {quizQuestions.length}
            </Text>

            <Button
              backgroundColor={hasAnswer ? '#00E6C3' : '#666'}
              color={hasAnswer ? '#000' : '#ccc'}
              disabled={!hasAnswer}
              onPress={handleQuizNext}
              borderRadius={8}
              paddingHorizontal={20}
            >
              {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </XStack>
        </YStack>
      </RNModal>
    );
  };

  if (loading) {
    return (
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="#00E6C3" />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack
        flex={1}
        backgroundColor="$background"
        justifyContent="center"
        alignItems="center"
        padding={24}
      >
        <Text color="$red10" textAlign="center">
          {error}
        </Text>
        <TouchableOpacity
          onPress={fetchLearningPaths}
          style={{ marginTop: 16, padding: 12, backgroundColor: '#00E6C3', borderRadius: 8 }}
        >
          <Text color="$background">Retry</Text>
        </TouchableOpacity>
      </YStack>
    );
  }

  if (selectedExercise) {
    const isDone = completedIds.includes(selectedExercise.id);
    const isPasswordLocked = isExercisePasswordLocked(selectedExercise);

    // More permissive access - only block if password-locked
    // No longer checking previous exercise completion
    // More permissive access - only block if password-locked
    const prevExercisesComplete = !isPasswordLocked;

    // Get information about repeats for navigation
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
    const hasNextRepeat = currentRepeatIndex < allRepeats.length - 1;
    const hasPrevRepeat = currentRepeatIndex > 0;

    const totalRepeats = selectedExercise.repeat_count || 1;
    const currentRepeatNumber = selectedExercise.isRepeat ? selectedExercise.repeatNumber || 2 : 1;

    // Navigation functions
    const goToNextRepeat = () => {
      if (hasNextRepeat) {
        setSelectedExercise(allRepeats[currentRepeatIndex + 1]);
      }
    };

    const goToPrevRepeat = () => {
      if (hasPrevRepeat) {
        setSelectedExercise(allRepeats[currentRepeatIndex - 1]);
      }
    };

    const goToBaseExercise = () => {
      if (baseExercise && selectedExercise.id !== baseExercise.id) {
        setSelectedExercise(baseExercise);
      }
    };

    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: getTabContentPadding() }}
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
          <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
            <TouchableOpacity onPress={() => setSelectedExercise(null)}>
              <Feather name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>

            {totalRepeats > 1 && (
              <XStack gap={8} alignItems="center">
                {Array.from({ length: totalRepeats }).map((_, i) => (
                  <View
                    key={`indicator-${i}`}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: i + 1 === currentRepeatNumber ? '#4B6BFF' : '#444',
                    }}
                  />
                ))}
              </XStack>
            )}
          </XStack>

          {/* Exercise header with icon if available */}
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
                <Text fontSize={28} fontWeight="bold" color="$color" numberOfLines={1}>
                  {selectedExercise.title?.[lang] || selectedExercise.title?.en || 'Untitled'}
                </Text>

                {/* Show repeat indicator if it's a repeat */}
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

              {/* If not a repeat but has repeat_count > 1, show this information */}
              {!selectedExercise.isRepeat &&
                selectedExercise.repeat_count &&
                selectedExercise.repeat_count > 1 && (
                  <XStack alignItems="center" gap={4} marginTop={4}>
                    <Feather name="repeat" size={16} color="#4B6BFF" />
                    <Text color="#4B6BFF" fontSize={14}>
                      This exercise needs to be repeated {selectedExercise.repeat_count} times
                    </Text>
                  </XStack>
                )}
            </YStack>

            {/* Show appropriate icon for exercise state */}
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

          <TouchableOpacity onPress={() => { console.log('🧾 [ProgressScreen] open report exercise', selectedExercise.id); setReportExerciseId(selectedExercise.id); }} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
            <Text color="#EF4444">Report Exercise</Text>
          </TouchableOpacity>

          {/* NEW: Quiz Section */}
          {hasQuizQuestions[selectedExercise.id] && (
            <YStack marginBottom={24}>
              <XStack alignItems="center" gap={8} marginBottom={12}>
                <MaterialIcons name="quiz" size={20} color="#00E6C3" />
                <Text fontSize={18} fontWeight="bold" color="#00E6C3">
                  Quiz
                </Text>
              </XStack>

              <QuizStatisticsDisplay stats={quizStatistics} />

              <Button
                backgroundColor="#00E6C3"
                color="#000"
                fontWeight="bold"
                onPress={() => navigateToQuiz(selectedExercise)}
                borderRadius={12}
                paddingVertical={16}
              >
                {quizStatistics && quizStatistics.total_attempts > 0 ? 'Retake Quiz' : 'Start Quiz'}
              </Button>
            </YStack>
          )}

          {/* Password Locked Exercise State - ALWAYS takes precedence */}
          {isPasswordLocked ? (
            <YStack gap={16} padding={24} alignItems="center">
              <MaterialIcons name="lock" size={80} color="#FF9500" />
              <Text fontSize={24} fontWeight="bold" color="#FF9500" textAlign="center">
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
                    size="$5"
                    backgroundColor="#FF9500"
                    color="#000"
                    fontWeight="bold"
                    onPress={unlockExercise}
                    pressStyle={{ backgroundColor: '#FF7B00' }}
                    borderRadius={12}
                    paddingHorizontal={32}
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
            /* Normal Exercise Content when Available and Not Locked */
            <>
              {/* Media Rendering Section - Only show if exercise is accessible */}
              {renderExerciseMedia(selectedExercise)}

              {/* Repetition Progress (if this is a repeated exercise) */}
              {(selectedExercise.isRepeat ||
                (selectedExercise.repeat_count && selectedExercise.repeat_count > 1)) && (
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

                  {selectedExercise.isRepeat && (
                    <Text color="$gray11">
                      Complete this repetition to continue with your progress.
                    </Text>
                  )}
                </YStack>
              )}

              {/* List of all repeats if viewing the base exercise */}
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

                    {/* Progress bar for all repetitions */}
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
                      onPress={() => {
                        // Toggle the main exercise completion
                        toggleCompletion(selectedExercise.id);
                      }}
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <XStack gap={8} alignItems="center" flex={1}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              // Toggle main exercise completion
                              toggleCompletion(selectedExercise.id);
                            }}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: completedIds.includes(selectedExercise.id)
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

                    {/* Find and show all repeats */}
                    {(() => {
                      // Find all repeats of this exercise
                      const repeats = exercises
                        .filter((ex) => ex.isRepeat && ex.originalId === selectedExercise.id)
                        .sort((a, b) => (a.repeatNumber || 0) - (b.repeatNumber || 0));

                      // Check if we need to create the repeats (they may not be in the exercises array yet)
                      if (
                        repeats.length === 0 &&
                        selectedExercise.repeat_count &&
                        selectedExercise.repeat_count > 1
                      ) {
                        // Show interactive virtual repeats
                        return Array.from({ length: selectedExercise.repeat_count - 1 }).map(
                          (_, i) => {
                            const repeatNumber = i + 2; // Start from 2 since 1 is the original
                            const virtualId = `${selectedExercise.id}-virtual-${repeatNumber}`;
                            // For virtual repeats, track completion individually
                            const isDone = virtualRepeatCompletions.includes(virtualId);

                            return (
                              <TouchableOpacity
                                key={`placeholder-${i}`}
                                style={{
                                  backgroundColor: '#222',
                                  padding: 12,
                                  borderRadius: 8,
                                  borderLeftWidth: 4,
                                  borderLeftColor: isDone ? '#00E6C3' : '#4B6BFF',
                                }}
                                onPress={() => {
                                  // For virtual repeats, toggle individual completion
                                  toggleVirtualRepeatCompletion(virtualId);
                                }}
                              >
                                <XStack justifyContent="space-between" alignItems="center">
                                  <XStack gap={8} alignItems="center" flex={1}>
                                    <TouchableOpacity
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        // Toggle individual virtual repeat completion
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
                                      {isDone && <Feather name="check" size={16} color="#fff" />}
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
                                    <Feather name="check-circle" size={18} color="#00E6C3" />
                                  )}
                                </XStack>
                              </TouchableOpacity>
                            );
                          },
                        );
                      }

                      return repeats.map((repeat) => {
                        const isDone = completedIds.includes(repeat.id);
                        // Remove locking for repeats - only main exercise can be locked

                        return (
                          <TouchableOpacity
                            key={repeat.id}
                            style={{
                              backgroundColor: '#222',
                              padding: 12,
                              borderRadius: 8,
                              borderLeftWidth: 4,
                              borderLeftColor: isDone ? '#00E6C3' : '#4B6BFF',
                            }}
                            onPress={() => setSelectedExercise(repeat)}
                          >
                            <XStack justifyContent="space-between" alignItems="center">
                              <XStack gap={8} alignItems="center" flex={1}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    // Repeats can be completed in any order
                                    toggleCompletion(repeat.id);
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
                                  {isDone && <Feather name="check" size={16} color="#fff" />}
                                </TouchableOpacity>
                                <Text
                                  fontSize={16}
                                  color="$color"
                                  fontWeight="600"
                                  numberOfLines={1}
                                  flex={1}
                                >
                                  {repeat.title?.[lang] ||
                                    repeat.title?.en ||
                                    `Repetition ${repeat.repeatNumber}`}
                                </Text>
                              </XStack>
                              <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                                {repeat.repeatNumber}/{repeat.repeat_count}
                              </Text>
                              {isDone && <Feather name="check-circle" size={18} color="#00E6C3" />}
                            </XStack>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </YStack>
                )}

              {/* Toggle done/not done button */}
              <TouchableOpacity
                onPress={() => {
                  // Toggle main exercise
                  toggleCompletion(selectedExercise.id);

                  // Also toggle all virtual repeats if this exercise has repeats
                  if (selectedExercise.repeat_count && selectedExercise.repeat_count > 1) {
                    const shouldMarkDone = !isDone; // If main is becoming done, mark all virtual repeats as done

                    // Generate all virtual repeat IDs
                    for (let i = 2; i <= selectedExercise.repeat_count; i++) {
                      const virtualId = `${selectedExercise.id}-virtual-${i}`;
                      const isVirtualDone = virtualRepeatCompletions.includes(virtualId);

                      // Only toggle if virtual repeat state doesn't match desired state
                      if (shouldMarkDone && !isVirtualDone) {
                        toggleVirtualRepeatCompletion(virtualId);
                      } else if (!shouldMarkDone && isVirtualDone) {
                        toggleVirtualRepeatCompletion(virtualId);
                      }
                    }
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

              {/* Navigation buttons for repeats */}
              {totalRepeats > 1 && (
                <XStack marginTop={24} justifyContent="space-between">
                  <Button
                    size="$4"
                    backgroundColor="#333"
                    disabled={!hasPrevRepeat}
                    opacity={hasPrevRepeat ? 1 : 0.5}
                    onPress={goToPrevRepeat}
                    iconAfter={<Feather name="chevron-left" size={18} color="white" />}
                    padding={12}
                    borderRadius={8}
                  >
                    Previous
                  </Button>

                  {selectedExercise.isRepeat && (
                    <Button
                      size="$4"
                      backgroundColor="#333"
                      onPress={goToBaseExercise}
                      iconAfter={<Feather name="home" size={18} color="white" />}
                      padding={12}
                      borderRadius={8}
                    >
                      Base
                    </Button>
                  )}

                  <Button
                    size="$4"
                    backgroundColor="#4B6BFF"
                    disabled={!hasNextRepeat}
                    opacity={hasNextRepeat ? 1 : 0.5}
                    onPress={goToNextRepeat}
                    iconAfter={<Feather name="chevron-right" size={18} color="white" />}
                    padding={12}
                    borderRadius={8}
                  >
                    Next
                  </Button>
                </XStack>
              )}

              {/* Additional details section */}
              <YStack gap={8} marginTop={16}>
                <Text color="$gray11">ID: {selectedExercise.id}</Text>
                <Text color="$gray11">Order: {selectedExercise.order_index}</Text>
                {selectedExercise.isRepeat && selectedExercise.originalId && (
                  <Text color="$gray11">Original Exercise ID: {selectedExercise.originalId}</Text>
                )}
                <Text color="$gray11">Created: {selectedExercise.created_at}</Text>
                <Text color="$gray11">Updated: {selectedExercise.updated_at}</Text>
              </YStack>

              {/* Comments moved to bottom to be less prominent */}
              <YStack marginTop={24}>
                <Text fontSize={18} fontWeight="bold" color="$color" marginBottom={8}>
                  Comments
                </Text>
                <CommentsSection targetType="exercise" targetId={selectedExercise.id} />
              </YStack>
            </>
          )}
        </ScrollView>
        {/* Add Quiz Interface */}
        <QuizInterface />

        {reportExerciseId && (
          <ReportDialog reportableId={reportExerciseId} reportableType="exercise" onClose={() => setReportExerciseId(null)} />
        )}
      </YStack>
    );
  }

  if (showDetailView && detailPath) {
    // Calculate completion percentage for this path
    const completedCount = exercises.filter((ex) => completedIds.includes(ex.id)).length;
    const totalCount = exercises.length;
    const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isFullyComplete = totalCount > 0 && completedCount === totalCount;

    // Get the path index to determine if it's available yet
    const pathIndex = filteredPaths.findIndex((p) => p.id === detailPath.id);
    const previousPathCompleted =
      pathIndex > 0 && filteredPaths[pathIndex - 1]
        ? getPathProgress(filteredPaths[pathIndex - 1].id) >= 1
        : false;
    const isFirstPath = pathIndex === 0;
    // Make paths more accessible - only block if specifically locked
    const isAvailable = !isPathPasswordLocked(detailPath);

    // Check if path is locked with password - HIGHEST PRIORITY
    const isPasswordLocked = isPathPasswordLocked(detailPath);
    const hasPassword = pathHasPassword(detailPath);

    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: getTabContentPadding() }}
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
          {/* Back + History Header Row */}
          <XStack justifyContent="space-between" alignItems="center" marginBottom={8}>
            <TouchableOpacity onPress={() => setShowDetailView(false)}>
              <Feather name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setHistoryModalVisible(true);
                loadAudit();
              }}
              style={{ backgroundColor: '#333', padding: 8, borderRadius: 16 }}
            >
              <Feather name="clock" size={20} color="#fff" />
            </TouchableOpacity>
          </XStack>

          {viewingUserName && (
            <YStack marginBottom={12} padding={10} backgroundColor="#162023" borderRadius={12}>
              <Text color="#00E6C3" fontSize={12}>Viewing as: {viewingUserName}</Text>
            </YStack>
          )}

          {/* Path header with icon if available */}
          <XStack alignItems="center" gap={12} marginBottom={16}>
            {detailPath.icon && (
              <View style={{ marginRight: 8 }}>
                <Feather
                  name={detailPath.icon as keyof typeof Feather.glyphMap}
                  size={28}
                  color={isPasswordLocked ? '#FF9500' : '#00E6C3'}
                />
              </View>
            )}
            <XStack alignItems="center" gap={8}>
              <Text fontSize={28} fontWeight="bold" color="$color">
                {detailPath.title[lang]}
              </Text>
              {pathCommentCount > 0 && (
                <XStack alignItems="center" gap={4} backgroundColor="#1f2937" paddingHorizontal={8} paddingVertical={4} borderRadius={12}>
                  <Feather name="message-circle" size={14} color="#00E6C3" />
                  <Text fontSize={12} color="#00E6C3">{pathCommentCount}</Text>
                </XStack>
              )}
            </XStack>

            {/* Show appropriate icon for path state */}
            {isPasswordLocked ? (
              <MaterialIcons name="lock" size={24} color="#FF9500" />
            ) : !isAvailable ? (
              <MaterialIcons name="hourglass-empty" size={24} color="#FF9500" />
            ) : null}
          </XStack>

          <Text color="$gray11" marginBottom={16}>
            {detailPath.description[lang]}
          </Text>

          <TouchableOpacity onPress={() => { console.log('🧾 [ProgressScreen] open report path', detailPath.id); setReportPath(true); }} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
            <Text color="#EF4444">Report Learning Path</Text>
          </TouchableOpacity>

          {/* Locked Path State - ALWAYS takes precedence over Unavailable */}
          {isPasswordLocked ? (
            <YStack gap={16} padding={24} alignItems="center">
              <MaterialIcons name="lock" size={80} color="#FF9500" />
              <Text fontSize={24} fontWeight="bold" color="#FF9500" textAlign="center">
                This Learning Path is Locked
              </Text>

              {hasPassword ? (
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
                      value={pathPasswordInput}
                      onChangeText={setPathPasswordInput}
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
                    size="$5"
                    backgroundColor="#FF9500"
                    color="#000"
                    fontWeight="bold"
                    onPress={unlockPath}
                    pressStyle={{ backgroundColor: '#FF7B00' }}
                    borderRadius={12}
                    paddingHorizontal={32}
                  >
                    Unlock
                  </Button>
                </YStack>
              ) : (
                <Text color="$gray11" fontSize={16} marginTop={16} textAlign="center">
                  This content is locked and cannot be accessed at this time.
                </Text>
              )}
            </YStack>
          ) : !isAvailable ? (
            /* Unavailable Path State - Show when path isn't available yet */
            <UnavailablePathView />
          ) : (
            /* Normal Path Content when Available and Not Locked */
            <>
              {/* Completion progress */}
              {totalCount > 0 && (
                <YStack marginTop={8} marginBottom={24}>
                  <XStack justifyContent="space-between" alignItems="center" marginBottom={8}>
                    <Text fontSize={18} fontWeight="bold" color="$color">
                      Progress
                    </Text>
                    <Text fontSize={16} color={isFullyComplete ? '#00E6C3' : '$gray11'}>
                      {completedCount}/{totalCount} ({percentComplete}%)
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
                        width: `${percentComplete}%`,
                        height: '100%',
                        backgroundColor: '#00E6C3',
                        borderRadius: 4,
                      }}
                    />
                  </View>
                </YStack>
              )}

              {/* Mark all button */}
              <TouchableOpacity
                onPress={() => handleMarkAllExercises(!isFullyComplete)}
                style={{
                  marginBottom: 24,
                  backgroundColor: isFullyComplete ? '#333' : '#00E6C3',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                disabled={totalCount === 0}
              >
                <Text color={isFullyComplete ? '$color' : '#000'} fontWeight="bold">
                  {isFullyComplete ? 'Mark All as Incomplete' : 'Mark All as Complete'}
                </Text>
              </TouchableOpacity>

              <Text fontSize={22} fontWeight="bold" color="$color" marginBottom={16}>
                Exercises
              </Text>

              {exercises.length === 0 ? (
                <Text color="$gray11">No exercises for this learning path.</Text>
              ) : (
                (() => {
                  // Process exercises: show all exercises and create virtual repeats for UI
                  let displayIndex = 0;

                  return exercises.map((exercise) => {
                    displayIndex++;

                    const main = exercise;

                    // Main exercise logic
                    const mainIsDone = completedIds.includes(main.id);
                    const mainIsPasswordLocked = isExercisePasswordLocked(main);

                    // More permissive access - only block if password-locked
                    const mainIsAvailable = !mainIsPasswordLocked;

                    return (
                      <YStack key={main.id} marginBottom={16}>
                        {/* Main Exercise */}
                        <TouchableOpacity onPress={() => setSelectedExercise(main)}>
                          <XStack alignItems="center" gap={12}>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                if (mainIsAvailable) {
                                  toggleCompletion(main.id);
                                }
                              }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                borderWidth: 2,
                                borderColor: mainIsDone ? '#00E6C3' : '#888',
                                backgroundColor: mainIsDone ? '#00E6C3' : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 8,
                              }}
                            >
                              {mainIsDone && <Feather name="check" size={20} color="#fff" />}
                            </TouchableOpacity>
                            <Card
                              padding={16}
                              borderRadius={16}
                              backgroundColor="$backgroundStrong"
                              flex={1}
                            >
                              <XStack justifyContent="space-between" alignItems="center">
                                <XStack alignItems="center" gap={8} flex={1}>
                                  <Text
                                    fontSize={18}
                                    fontWeight="bold"
                                    color="$color"
                                    numberOfLines={1}
                                  >
                                    {displayIndex}.{' '}
                                    {main.title?.[lang] || main.title?.en || 'Untitled'}
                                  </Text>
                                  {!!commentCounts[main.id] && commentCounts[main.id] > 0 && (
                                    <XStack alignItems="center" gap={4} backgroundColor="#1f2937" paddingHorizontal={6} paddingVertical={2} borderRadius={10}>
                                      <Feather name="message-circle" size={12} color="#00E6C3" />
                                      <Text fontSize={10} color="#00E6C3">{commentCounts[main.id]}</Text>
                                    </XStack>
                                  )}

                                  {/* Show repeat count if it has repeats */}
                                  {main.repeat_count && main.repeat_count > 1 && (
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
                                        {main.repeat_count}x
                                      </Text>
                                    </XStack>
                                  )}

                                  {/* Show quiz indicator if exercise has quiz */}
                                  {hasQuizQuestions[main.id] && (
                                    <XStack
                                      backgroundColor="#00E6C3"
                                      paddingHorizontal={8}
                                      paddingVertical={4}
                                      borderRadius={12}
                                      alignItems="center"
                                      gap={4}
                                    >
                                      <MaterialIcons name="quiz" size={14} color="#000" />
                                      <Text fontSize={12} color="#000" fontWeight="bold">
                                        Quiz
                                      </Text>
                                    </XStack>
                                  )}
                                </XStack>

                                {/* Show appropriate icon based on state - LOCK gets priority */}
                                {mainIsPasswordLocked ? (
                                  <MaterialIcons name="lock" size={20} color="#FF9500" />
                                ) : mainIsDone ? (
                                  <Feather name="check-circle" size={20} color="#00E6C3" />
                                ) : null}
                              </XStack>

                              {main.description?.[lang] && (
                                <Text color="$gray11" marginTop={4}>
                                  {main.description[lang]}
                                </Text>
                              )}
                              <TouchableOpacity onPress={() => setReportExerciseId(main.id)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                                <Text color="#EF4444" fontSize={12}>Report Exercise</Text>
                              </TouchableOpacity>
                              <RepeatProgressBar exercise={main} />
                              {lastAuditByExercise[main.id] && (
                                <Text color="$gray11" marginTop={4} fontSize={12}>
                                  {(() => {
                                    const a = lastAuditByExercise[main.id] as any;
                                    let verb = a.action;
                                    if (verb === 'completed') verb = 'Marked complete';
                                    if (verb === 'uncompleted') verb = 'Marked incomplete';
                                    if (verb.includes('virtual')) {
                                      const rep = a.repeat_number ? `Repetition ${a.repeat_number}` : 'Repetition';
                                      verb = `${rep} completed`;
                                    }
                                    return `Last: ${verb} by ${a.actor_name || 'Unknown'} at ${new Date(a.created_at).toLocaleString()}`;
                                  })()}
                                </Text>
                              )}
                            </Card>
                          </XStack>
                        </TouchableOpacity>
                      </YStack>
                    );
                  });
                })()
              )}
            </>
          )}
        </ScrollView>
        {/* History Modal */}
        <RNModal
          visible={historyModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setHistoryModalVisible(false)}
        >
          <YStack flex={1} backgroundColor="$background">
            <XStack justifyContent="space-between" alignItems="center" padding={16}>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Feather name="arrow-left" size={28} color="#fff" />
              </TouchableOpacity>
              <Text fontSize={18} fontWeight="bold" color="$color">History</Text>
              <View style={{ width: 28 }} />
            </XStack>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              {auditEntries.length === 0 ? (
                <Text color="$gray11">No recent activity.</Text>
              ) : (
                auditEntries.map((e, idx) => {
                  const info = exerciseInfoById[e.exercise_id];
                  const title = info?.title?.[lang] || info?.title?.en || 'Untitled';
                  const totalRepeats = info?.repeat_count || 1;
                  const mainDone = completedIds.includes(e.exercise_id);
                  const isVirtual = !!e.repeat_number && e.repeat_number > 1;
                  const virtualId = isVirtual ? `${e.exercise_id}-virtual-${e.repeat_number}` : '';
                  const virtualDone = isVirtual ? virtualRepeatCompletions.includes(virtualId) : false;
                  const isChecked = isVirtual ? virtualDone : mainDone;
                  const progress = getRepeatProgress({
                    id: e.exercise_id,
                    learning_path_id: info?.learning_path_id || '',
                    title: info?.title || { en: 'Untitled', sv: 'Namnlös' },
                    description: { en: '', sv: '' },
                    order_index: 0,
                    repeat_count: totalRepeats,
                  }).percent;

                  return (
                    <TouchableOpacity
                      key={`${e.exercise_id}-${e.created_at}-${idx}`}
                      onPress={() => {
                        const ex = exercises.find((x) => x.id === e.exercise_id) || null;
                        if (ex) setSelectedExercise(ex);
                      }}
                      style={{ paddingVertical: 10 }}
                    >
                      <XStack alignItems="center" gap={10}>
                        <TouchableOpacity
                          onPress={() => {
                            if (isVirtual && virtualId) {
                              toggleVirtualRepeatCompletion(virtualId);
                            } else {
                              toggleCompletion(e.exercise_id);
                            }
                          }}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: isChecked ? '#00E6C3' : '#888',
                            backgroundColor: isChecked ? '#00E6C3' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isChecked && <Feather name="check" size={14} color="#fff" />}
                        </TouchableOpacity>
                        <YStack flex={1}>
                          <Text color="$color" numberOfLines={2} fontWeight="600">
                            {title}
                            {totalRepeats > 1 && e.repeat_number
                              ? ` — Repetition ${e.repeat_number}/${totalRepeats}`
                              : ''}
                            {' '}
                            — {(() => {
                              let verb = e.action;
                              if (verb === 'completed') verb = 'Marked complete';
                              if (verb === 'uncompleted') verb = 'Marked incomplete';
                              if (verb.includes('virtual')) verb = 'Marked complete';
                              return `${verb} by ${e.actor_name || 'Unknown'}`;
                            })()}
                          </Text>
                          <XStack alignItems="center" gap={6}>
                            <View style={{ width: 60, height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' }}>
                              <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: '#00E6C3' }} />
                            </View>
                            <Text color="$gray11" fontSize={12}>
                              {new Date(e.created_at).toLocaleString()}
                            </Text>
                          </XStack>
                        </YStack>
                      </XStack>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </YStack>
        </RNModal>
        {/* Ensure report dialogs render at this screen level to avoid being hidden */}
        {reportPath && detailPath && (
          <ReportDialog
            reportableId={detailPath.id}
            reportableType="learning_path"
            onClose={() => setReportPath(false)}
          />
        )}
        {reportExerciseId && (
          <ReportDialog
            reportableId={reportExerciseId}
            reportableType="exercise"
            onClose={() => setReportExerciseId(null)}
          />
        )}
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding={0}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: getTabContentPadding() }}
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
        {/* Global History Button */}
        <XStack justifyContent="flex-end" marginBottom={8}>
          <TouchableOpacity
            onPress={() => {
              setHistoryModalVisible(true);
              loadAudit();
            }}
            style={{ backgroundColor: '#333', padding: 10, borderRadius: 16 }}
          >
            <Feather name="clock" size={18} color="#fff" />
          </TouchableOpacity>
        </XStack>
        {/* Category filters */}
        <YStack
          space={12}
          padding={16}
          backgroundColor="$backgroundStronger"
          borderRadius={16}
          marginBottom={24}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={16} fontWeight="bold" color="$color">
              {t('progress.filterLearningPaths')}
            </Text>

            <TouchableOpacity
              onPress={() => setShowAllExercises(!showAllExercises)}
              style={{
                backgroundColor: showAllExercises ? '#4B6BFF' : '#333',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Feather
                name={showAllExercises ? 'list' : 'plus'}
                size={14}
                color={showAllExercises ? 'white' : '#888'}
              />
              <Text fontSize={12} fontWeight="600" color={showAllExercises ? 'white' : '#888'}>
                {showAllExercises ? 'All Exercises' : 'Show All'}
              </Text>
            </TouchableOpacity>
          </XStack>

          <XStack flexWrap="wrap" gap={8} justifyContent="space-between">
            {Object.keys(categoryFilters).map((filterType) => {
              const type = filterType as CategoryType;
              // Skip if there are no options for this category type
              if (!categoryOptions[type] || categoryOptions[type].length <= 1) return null;

              // Find the selected option
              const selectedOption = categoryOptions[type].find(
                (opt) => opt.value === categoryFilters[type],
              );

              const displayValue = selectedOption
                ? selectedOption.label[lang] || selectedOption.label.en
                : 'All';

              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveFilterType(type)}
                  style={{
                    flexBasis: '48%',
                    maxWidth: 150,
                    backgroundColor: '#333',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text fontSize={14} color="$color" marginBottom={4}>
                    {categoryLabels[type]}
                  </Text>
                  <Text fontSize={16} color="#00E6C3">
                    {displayValue}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </XStack>
        </YStack>

        {/* Render filter selection modals */}
        {renderFilterModal(activeFilterType)}

        {/* Show All Exercises Section */}
        {showAllExercises && (
          <YStack
            backgroundColor="$backgroundStronger"
            borderRadius={16}
            padding={16}
            marginBottom={24}
          >
            <XStack alignItems="center" justifyContent="space-between" marginBottom={16}>
              <Text fontSize={18} fontWeight="bold" color="$color">
                All Available Exercises ({allAvailableExercises.length})
              </Text>
              <Text fontSize={12} color="$gray11">
                Database: {allAvailableExercises.filter((e) => e.source === 'database').length} |
                Custom: {allAvailableExercises.filter((e) => e.source === 'custom_route').length}
              </Text>
            </XStack>

            {allAvailableExercises.length === 0 ? (
              <YStack alignItems="center" padding={20}>
                <Feather name="search" size={32} color="$gray11" />
                <Text fontSize={16} color="$gray11" textAlign="center" marginTop={8}>
                  Loading exercises...
                </Text>
              </YStack>
            ) : (
              <YStack gap={8}>
                {allAvailableExercises.map((exercise, index) => (
                  <TouchableOpacity
                    key={`${exercise.source}-${exercise.id}`}
                    onPress={() => {
                      console.log('🎯 [ProgressScreen] Exercise selected:', exercise);

                      if (exercise.source === 'database') {
                        // For database exercises, navigate to RouteExerciseScreen for full experience
                        const exerciseForRoute = {
                          id: `lpe_${exercise.id}`,
                          title: exercise.title,
                          description: exercise.description,
                          learning_path_exercise_id: exercise.id,
                          learning_path_id: exercise.learning_path_id,
                          learning_path_title: { en: 'Learning Path', sv: 'Lärandeväg' },
                          youtube_url: exercise.youtube_url || '',
                          icon: '',
                          image: exercise.image || '',
                          embed_code: exercise.embed_code || '',
                          source: 'learning_path',
                          repeat_count: exercise.repeat_count || 1,
                          has_quiz: exercise.has_quiz || false,
                          quiz_data: false,
                        };

                        // Generate a proper UUID for single exercise (using a predictable pattern)
                        const singleExerciseRouteId = `00000000-0000-0000-0000-${exercise.id.replace(/-/g, '').substring(0, 12)}`;

                        (navigation as any).navigate('RouteExercise', {
                          routeId: singleExerciseRouteId,
                          exercises: [exerciseForRoute],
                          routeName: `${exercise.title[lang] || exercise.title.en} (Individual Exercise)`,
                          startIndex: 0,
                        });
                      } else {
                        // For custom exercises, show route and navigate
                        Alert.alert(
                          'Custom Exercise',
                          `This exercise is from the route "${exercise.route_name}". Would you like to view the route?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'View Route',
                              onPress: () => {
                                // Navigate to route detail - we'd need the route ID
                                Alert.alert(
                                  'Info',
                                  'Route navigation will be added in a future update',
                                );
                              },
                            },
                          ],
                        );
                      }
                    }}
                    style={{
                      backgroundColor: exercise.source === 'database' ? '#1a1a2e' : '#2e1a1a',
                      padding: 12,
                      borderRadius: 8,
                      borderLeftWidth: 4,
                      borderLeftColor: exercise.source === 'database' ? '#4B6BFF' : '#FF6B4B',
                    }}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <YStack flex={1}>
                        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
                          {exercise.title[lang] || exercise.title.en || 'No title'}
                        </Text>
                        <Text fontSize={12} color="$gray11" numberOfLines={2} marginTop={2}>
                          {exercise.description[lang] ||
                            exercise.description.en ||
                            'No description'}
                        </Text>
                        <XStack alignItems="center" gap={8} marginTop={4}>
                          <Text
                            fontSize={10}
                            color={exercise.source === 'database' ? '#4B6BFF' : '#FF6B4B'}
                            fontWeight="600"
                          >
                            {exercise.source === 'database' ? 'DATABASE' : 'CUSTOM'}
                          </Text>
                          {exercise.route_name && (
                            <Text fontSize={10} color="$gray11">
                              from "{exercise.route_name}"
                            </Text>
                          )}
                          {exercise.has_quiz && (
                            <XStack alignItems="center" gap={2}>
                              <Feather name="help-circle" size={10} color="#8B5CF6" />
                              <Text fontSize={10} color="#8B5CF6">
                                QUIZ
                              </Text>
                            </XStack>
                          )}
                          {exercise.repeat_count && exercise.repeat_count > 1 && (
                            <XStack alignItems="center" gap={2}>
                              <Feather name="repeat" size={10} color="#F59E0B" />
                              <Text fontSize={10} color="#F59E0B">
                                {exercise.repeat_count}x
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                      </YStack>
                      <Feather name="chevron-right" size={16} color="$gray11" />
                    </XStack>
                  </TouchableOpacity>
                ))}
              </YStack>
            )}
          </YStack>
        )}

        {/* Learning Paths Section - only show when not viewing all exercises */}
        {!showAllExercises && (
          <>
            {filteredPaths.length === 0 ? (
              <YStack padding={16} alignItems="center" justifyContent="center" gap={8}>
                <Feather name="info" size={32} color="$gray11" />
                <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">
                  No learning paths found
                </Text>
                <Text fontSize={16} color="$gray11" textAlign="center">
                  Try adjusting your filter settings to see more learning paths.
                </Text>
              </YStack>
            ) : (
              filteredPaths.map((path, idx) => {
                const isActive = activePath === path.id;
                const percent = getPathProgress(path.id);

                // More permissive access - only block if password-locked
                const isPasswordLocked = isPathPasswordLocked(path);
                const hasPassword = pathHasPassword(path);
                const isEnabled = !isPasswordLocked; // Much more permissive

                return (
                  <TouchableOpacity
                    key={path.id}
                    onPress={() => handlePathPress(path, idx)}
                    activeOpacity={0.8}
                    style={{
                      marginBottom: 20,
                      opacity: isEnabled ? 1 : 0.5,
                      borderWidth: isPasswordLocked ? 2 : 0,
                      borderColor: isPasswordLocked ? '#FF9500' : 'transparent',
                      borderRadius: 24,
                      shadowColor: isPasswordLocked ? '#FF9500' : 'transparent',
                      shadowOpacity: isPasswordLocked ? 0.3 : 0,
                      shadowRadius: isPasswordLocked ? 8 : 0,
                      shadowOffset: { width: 0, height: 0 },
                    }}
                  >
                    <Card
                      backgroundColor={
                        isActive ? '$blue5' : isPasswordLocked ? '#331800' : '$backgroundStrong'
                      }
                      padding={20}
                      borderRadius={20}
                      elevate
                    >
                      <XStack alignItems="center" gap={16}>
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            backgroundColor: isActive
                              ? '#00E6C3'
                              : isPasswordLocked
                                ? '#FF9500'
                                : '#222',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isPasswordLocked ? (
                            <MaterialIcons name="lock" size={30} color="#fff" />
                          ) : (
                            <>
                              {/* Progress circle with percent */}
                              <ProgressCircle
                                percent={percent}
                                size={40}
                                color="#fff"
                                bg={isActive ? '#00E6C3' : '#222'}
                              />
                              <Text
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: 40,
                                  height: 40,
                                  textAlign: 'center',
                                  textAlignVertical: 'center',
                                  lineHeight: 40,
                                }}
                                color={isActive ? '$color' : '$gray11'}
                                fontWeight="bold"
                              >
                                {Math.round(percent * 100)}%
                              </Text>
                            </>
                          )}
                        </View>
                        <YStack flex={1}>
                          <XStack alignItems="center" gap={8}>
                            <Text
                              fontSize={20}
                              fontWeight={isActive ? 'bold' : '600'}
                              color={isActive ? '$color' : isPasswordLocked ? '#FF9500' : '$color'}
                            >
                              {idx + 1}. {path.title[lang]}
                            </Text>

                            {/* Show password indicator if needed */}
                            {isPasswordLocked && hasPassword && (
                              <XStack
                                backgroundColor="#FF7300"
                                paddingHorizontal={8}
                                paddingVertical={4}
                                borderRadius={12}
                                alignItems="center"
                                gap={4}
                              >
                                <MaterialIcons name="vpn-key" size={16} color="white" />
                                <Text fontSize={12} color="white" fontWeight="bold">
                                  Password
                                </Text>
                              </XStack>
                            )}
                          </XStack>

                          <Text color="$gray11" fontSize={14} marginTop={2}>
                            {path.description[lang]}
                          </Text>

                          {/* Category displays */}
                          <XStack flexWrap="wrap" marginTop={4} gap={4}>
                            {path.vehicle_type && (
                              <Text fontSize={12} color="$blue10">
                                {path.vehicle_type}
                                {path.transmission_type ? ' • ' : ''}
                              </Text>
                            )}

                            {path.transmission_type && (
                              <Text fontSize={12} color="$blue10">
                                {path.transmission_type}
                                {path.license_type ? ' • ' : ''}
                              </Text>
                            )}

                            {path.license_type && (
                              <Text fontSize={12} color="$blue10">
                                {path.license_type}
                                {path.experience_level ? ' • ' : ''}
                              </Text>
                            )}

                            {path.experience_level && (
                              <Text fontSize={12} color="$blue10">
                                {path.experience_level}
                                {path.purpose ? ' • ' : ''}
                              </Text>
                            )}

                            {path.purpose && (
                              <Text fontSize={12} color="$blue10">
                                {path.purpose}
                                {path.user_profile ? ' • ' : ''}
                              </Text>
                            )}

                            {path.user_profile && (
                              <Text fontSize={12} color="$blue10">
                                {path.user_profile}
                              </Text>
                            )}
                          </XStack>
                        </YStack>
                      </XStack>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
      {reportPath && detailPath && (
        <ReportDialog reportableId={detailPath.id} reportableType="learning_path" onClose={() => setReportPath(false)} />
      )}
      {reportExerciseId && (
        <ReportDialog reportableId={reportExerciseId} reportableType="exercise" onClose={() => setReportExerciseId(null)} />
      )}
    </YStack>
  );
}
