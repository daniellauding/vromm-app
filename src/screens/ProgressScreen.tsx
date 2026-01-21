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
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Select,
  Image as TamaguiImage,
  Button as TamaguiButton,
} from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TabParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import Svg, { Circle } from 'react-native-svg';
import { Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useCallback } from 'react';
import { useScreenLogger } from '../hooks/useScreenLogger';
import { getTabContentPadding } from '../utils/layout';
import { logNavigation, logError, logWarn, logInfo } from '../utils/logger';
import { CommentsSection } from '../components/CommentsSection';
import { ReportDialog } from '../components/report/ReportDialog';
import { CelebrationModal } from '../components/CelebrationModal';
import { Checkbox } from '../components/Checkbox';
import { ExerciseCard } from '../components/ExerciseCard';
import { ExerciseHeader } from '../components/ExerciseHeader';
import { ProgressCircle } from '../components/ProgressCircle';
import { LearningPathCard } from '../components/LearningPathCard';
import { Header, useHeaderWithScroll } from '../components/Header';
import {
  LearningPathsFilterModal,
  CategoryType,
  CategoryOption,
} from '../components/LearningPathsFilterModal';
import { ExerciseStepsAccordion } from '../components/ExerciseStepsAccordion';

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

  // Steps System - NEW
  steps?: ExerciseStep[];
}

// Steps-related interfaces
interface ExerciseStep {
  text: { en: string; sv: string };
  description?: { en: string; sv: string };
  media?: StepMedia[];
  order_index: number;
}

interface StepMedia {
  id: string;
  type: 'image' | 'youtube' | 'embed';
  url: string;
  title?: { en: string; sv: string };
  description?: { en: string; sv: string };
  order_index: number;
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
import { useThemePreference } from '../hooks/useThemeOverride';
import { useToast } from '../contexts/ToastContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useStripe } from '@stripe/stripe-react-native';
import { useUnlock } from '../contexts/UnlockContext';
import { useCelebration } from '../contexts/CelebrationContext';
import { FunctionsHttpError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Tour imports DISABLED to prevent performance issues
// import { useTourTarget } from '../components/TourOverlay';
// import { useScreenTours } from '../utils/screenTours';
// import { useTour } from '../contexts/TourContext';

// Category types and options are now imported from LearningPathsFilterModal

export function ProgressScreen() {
  const { HeaderComponent, onScroll } = useHeaderWithScroll();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TabParamList, 'ProgressTab'>>();
  const { language, t } = useTranslation(); // Get user's language preference and t function
  const { profile, user: authUser } = useAuth(); // Get user profile for auth context
  const { showToast } = useToast();
  const { activeStudentId, getEffectiveUserId } = useStudentSwitch();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { showCelebration } = useCelebration();
  const { selectedPathId, showDetail, activeUserId } = (route.params || {}) as any;
  const focusExerciseId: string | undefined = (route.params as any)?.focusExerciseId;
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Sound helper function with haptic feedback
  const playDoneSound = async () => {
    try {
      // Haptic feedback (works even if muted)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Set audio mode for iOS
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false, // Respect silent mode
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/ui-done.mp3'), {
        shouldPlay: true,
        volume: 0.4,
      });

      console.log('🔊 Playing done sound');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('🔊 Done sound error (may be muted):', error);
    }
  };

  // ALL TOURS DISABLED FOR PROGRESSSCREEN DUE TO PERFORMANCE ISSUES
  // const firstPathRef = useTourTarget('ProgressScreen.FirstPath');
  // const filterButtonRef = useTourTarget('ProgressScreen.FilterButton');
  // const pathCardRef = useTourTarget('ProgressScreen.PathCard');
  // const markCompleteButtonRef = useTourTarget('ExerciseDetail.MarkCompleteButton');
  // const repeatSectionRef = useTourTarget('ExerciseDetail.RepeatSection');
  // const exerciseItemRef = useTourTarget('ProgressScreen.ExerciseItem');

  // Screen tours integration DISABLED
  // const { triggerScreenTour } = useScreenTours();
  // const tourContext = useTour();

  // Use activeUserId from navigation if provided, otherwise check StudentSwitchContext, then fall back to authUser
  const effectiveUserId = activeUserId || getEffectiveUserId();

  // Load shared unlock data when user changes
  useEffect(() => {
    if (effectiveUserId) {
      loadUserPayments(effectiveUserId);
      loadUnlockedContent(effectiveUserId);
      console.log('🔓 [ProgressScreen] Loading shared unlock data for user:', effectiveUserId);
    }
  }, [effectiveUserId, loadUserPayments, loadUnlockedContent]);

  // Debug logging for user switching
  useEffect(() => {
    console.log(
      '🔍 [ProgressScreen] ==================== USER SWITCHING DEBUG ====================',
    );
    console.log('🔍 [ProgressScreen] User ID Debug:', {
      activeUserId: activeUserId,
      authUserId: authUser?.id,
      activeStudentId: activeStudentId,
      effectiveUserId: effectiveUserId,
      isViewingStudent: activeUserId && activeUserId !== authUser?.id,
      isViewingStudentFromContext: !!activeStudentId,
      routeParams: route.params,
      authUserName: authUser?.email,
      profileRole: profile?.role,
    });
    console.log('🔍 [ProgressScreen] ============================================================');
  }, [activeUserId, authUser?.id, activeStudentId, effectiveUserId]);

  const [activePath, setActivePath] = useState<string>(selectedPathId || '');
  const [showDetailView, setShowDetailView] = useState<boolean>(!!showDetail);
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PathExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PathExercise | null>(null);
  const { user } = useAuth();
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

  // Debug logging for ProgressScreen
  // User and profile tracking without excessive logging

  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [pathProgress, setPathProgress] = useState<{ [pathId: string]: number }>({});
  const [allPathExercises, setAllPathExercises] = useState<PathExercise[]>([]); // NEW: Store ALL exercises for progress calculation

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

  // Add state for password inputs and virtual repeat completions
  const [pathPasswordInput, setPathPasswordInput] = useState('');
  const [exercisePasswordInput, setExercisePasswordInput] = useState('');
  const [virtualRepeatCompletions, setVirtualRepeatCompletions] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [pathCommentCount, setPathCommentCount] = useState<number>(0);
  const [reportPath, setReportPath] = useState(false);
  const [reportExerciseId, setReportExerciseId] = useState<string | null>(null);

  // NEW: Access control state
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
  const [lastAuditByExercise, setLastAuditByExercise] = useState<
    Record<string, { action: string; actor_name: string | null; created_at: string }>
  >({});

  // Paywall modal state
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallPath, setPaywallPath] = useState<LearningPath | null>(null);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPath, setPasswordPath] = useState<LearningPath | null>(null);

  // Exercise password modal state
  const [showExercisePasswordModal, setShowExercisePasswordModal] = useState(false);
  const [passwordExercise, setPasswordExercise] = useState<PathExercise | null>(null);

  // Student profile state for when viewing as student
  const [studentProfile, setStudentProfile] = useState<any>(null);

  // Celebration modal state - now using global context (removed local state)

  // Load categories from Supabase - RESTORED with proper error handling
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔍 Fetching categories from database...');

        const { data, error } = await supabase
          .from('learning_path_categories')
          .select('category, value, label, is_default, created_at, order_index')
          .order('order_index', { ascending: true });

        if (error) {
          console.error('❌ Error fetching categories:', error);
          // Use fallback defaults if database fails
          setDefaultFilters();
          return;
        }

        console.log('✅ Successfully fetched categories:', data?.length || 0);

        // Group by category type with deduplication
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

        // Track which categories have "all" options from database
        const categoriesWithAll = new Set<CategoryType>();

        // Process categories from database first (with deduplication)
        const processedItems = new Map<string, CategoryOption>();

        data?.forEach((item) => {
          const category = item.category as CategoryType;
          const uniqueKey = `${category}-${item.value}`;

          // Skip if we already processed this exact category-value combination
          if (processedItems.has(uniqueKey)) {
            console.log(`🔄 [ProgressScreen] Skipping duplicate: ${uniqueKey}`);
            return;
          }

          // Add to processed items (with proper typing)
          const categoryOption: CategoryOption = {
            id: (item as any).id || `generated-${category}-${item.value}`,
            category: category,
            value: item.value,
            label: item.label,
            order_index: item.order_index || 0,
            is_default: item.is_default || false,
          };
          processedItems.set(uniqueKey, categoryOption);

          // Track if this category has an "all" option
          if (item.value.toLowerCase() === 'all') {
            categoriesWithAll.add(category);
          }

          if (groupedCategories[category]) {
            groupedCategories[category].push(categoryOption);
          }
        });

        // Add missing "All" options for categories that don't have them from database
        for (const key of Object.keys(groupedCategories) as CategoryType[]) {
          if (!categoriesWithAll.has(key)) {
            console.log(`➕ [ProgressScreen] Adding missing 'all' option for: ${key}`);
            groupedCategories[key].unshift({
              id: `generated-all-${key}`,
              category: key,
              value: 'all',
              label: { en: 'All', sv: 'Alla' },
              order_index: 0,
              is_default: false,
            });
          }
        }

        // Sort each category by order_index
        for (const key of Object.keys(groupedCategories) as CategoryType[]) {
          groupedCategories[key].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }

        setCategoryOptions(groupedCategories);

        // Try to load saved filter preferences first
        const savedFilters = await loadFilterPreferences();

        if (savedFilters) {
          // Use saved preferences
          setCategoryFilters(savedFilters);
          console.log('✅ [ProgressScreen] Filter loading debug:', {
            activeUserId,
            effectiveUserId,
            isViewingStudent: activeUserId && activeUserId !== authUser?.id,
            studentProfile: studentProfile ? 'loaded' : 'not loaded',
            hasSavedFilters: true,
          });
          console.log(
            '✅ [ProgressScreen] Using saved filter preferences for user:',
            effectiveUserId,
            savedFilters,
          );
        } else {
          // Set defaults based on most recent is_default=true values from database (like OnboardingInteractive)
          const defaultVehicle = data
            .filter((item) => item.category === 'vehicle_type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultTransmission = data
            .filter((item) => item.category === 'transmission_type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultLicense = data
            .filter((item) => item.category === 'license_type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultExperience = data
            .filter((item) => item.category === 'experience_level' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultPurpose = data
            .filter((item) => item.category === 'purpose' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultUserProfile = data
            .filter((item) => item.category === 'user_profile' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultPlatform = data
            .filter((item) => item.category === 'platform' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultType = data
            .filter((item) => item.category === 'type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          const defaultFilters: Record<CategoryType, string> = {
            vehicle_type: getProfilePreference('vehicle_type', defaultVehicle?.value || 'all'),
            transmission_type: getProfilePreference(
              'transmission_type',
              defaultTransmission?.value || 'all',
            ),
            license_type: getProfilePreference('license_type', defaultLicense?.value || 'all'),
            experience_level: getProfilePreference(
              'experience_level',
              defaultExperience?.value || 'all',
            ),
            purpose: getProfilePreference('purpose', defaultPurpose?.value || 'all'),
            user_profile: getProfilePreference('user_profile', defaultUserProfile?.value || 'all'),
            platform: defaultPlatform?.value || 'all',
            type: defaultType?.value || 'all',
          };

          setCategoryFilters(defaultFilters);
          console.log('✅ Set default category filters from database defaults:', defaultFilters);

          // Save defaults for next time
          saveFilterPreferences(defaultFilters);
        }
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
  }, [studentProfile, activeStudentId]); // Reload filters when student profile changes

  // Load student profile when viewing as student
  useEffect(() => {
    const loadStudentProfile = async () => {
      // Check if we're viewing a student (either from navigation params or StudentSwitchContext)
      const isViewingStudent = (activeUserId && activeUserId !== authUser?.id) || !!activeStudentId;
      const targetUserId = activeUserId || activeStudentId;

      if (!isViewingStudent || !targetUserId || targetUserId === authUser?.id) {
        setStudentProfile(null);
        return;
      }

      try {
        console.log(
          '🎯 [ProgressScreen] ==================== LOADING STUDENT PROFILE ====================',
        );
        console.log('🎯 [ProgressScreen] Loading student profile for user:', targetUserId);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (!error && data) {
          setStudentProfile(data);
          console.log('✅ [ProgressScreen] Loaded student profile:', {
            userId: data.id,
            name: data.full_name,
            email: data.email,
            role: data.role,
            experienceLevel: data.experience_level,
            vehicleType: data.vehicle_type,
            transmissionType: data.transmission_type,
            licenseType: data.license_type,
            licensePlanData: data.license_plan_data,
          });
        } else {
          setStudentProfile(null);
          console.log('❌ [ProgressScreen] Failed to load student profile:', error);
        }
      } catch (error) {
        console.error('❌ [ProgressScreen] Exception loading student profile:', error);
        setStudentProfile(null);
      }
    };

    loadStudentProfile();
  }, [effectiveUserId, activeUserId, activeStudentId, authUser?.id]);

  // Filter drawer state
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Modal state for category filter selection (legacy - kept for compatibility)
  const [activeFilterType, setActiveFilterType] = useState<CategoryType | null>(null);

  // Category labels for display - EXTENDED with translations
  const categoryLabels: Record<CategoryType, string> = {
    vehicle_type: getTranslation('filters.vehicleType', 'Vehicle Type'),
    transmission_type: getTranslation('filters.transmissionType', 'Transmission'),
    license_type: getTranslation('filters.licenseType', 'License Type'),
    experience_level: getTranslation('filters.experienceLevel', 'Experience Level'),
    purpose: getTranslation('filters.purpose', 'Purpose'),
    user_profile: t('filters.userProfile') || 'User Profile',
    platform: t('filters.platform') || 'Platform',
    type: t('filters.contentType') || 'Content Type',
  };

  // Helper function to get user profile preferences with value mapping (use student profile when viewing student)
  const getProfilePreference = (key: string, defaultValue: string): string => {
    const activeProfile = activeUserId && activeUserId !== authUser?.id ? studentProfile : profile;
    if (!activeProfile) return defaultValue;

    try {
      // Check if profile has license_plan_data from onboarding
      const licenseData = (activeProfile as any)?.license_plan_data;
      if (licenseData && typeof licenseData === 'object') {
        const value = licenseData[key];
        console.log(
          `🔍 [ProgressScreen] Reading profile preference ${key}:`,
          value,
          'from user:',
          effectiveUserId,
          'isStudent:',
          activeUserId && activeUserId !== authUser?.id,
        );

        // Keep onboarding values as they are - they now match database values
        return value || defaultValue;
      }

      // Fallback to direct profile properties - no mapping needed
      const value = (activeProfile as any)[key];
      console.log(
        `🔍 [ProgressScreen] Reading profile preference ${key}:`,
        value,
        'from direct profile for user:',
        effectiveUserId,
      );
      return value || defaultValue;
    } catch (error) {
      console.log('Error getting profile preference:', error);
      return defaultValue;
    }
  };

  // Save filter preferences to AsyncStorage - USER-SPECIFIC
  const saveFilterPreferences = async (filters: Record<CategoryType, string>) => {
    try {
      // Make filter storage user-specific for supervisors viewing different students
      const filterKey = `vromm_progress_filters_${effectiveUserId || 'default'}`;
      await AsyncStorage.setItem(filterKey, JSON.stringify(filters));
      console.log('✅ Saved filter preferences for user:', effectiveUserId, filters);
    } catch (error) {
      console.error('Error saving filter preferences:', error);
    }
  };

  // Load filter preferences from AsyncStorage - USER-SPECIFIC
  const loadFilterPreferences = async (): Promise<Record<CategoryType, string> | null> => {
    try {
      // Make filter loading user-specific for supervisors viewing different students
      const filterKey = `vromm_progress_filters_${effectiveUserId || 'default'}`;
      const saved = await AsyncStorage.getItem(filterKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ Loaded saved filter preferences for user:', effectiveUserId, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    }
    return null;
  };

  // Filter option selection handler - don't auto-close drawer
  const handleFilterSelect = (filterType: CategoryType, value: string) => {
    console.log(`🎛️ [ProgressScreen] Filter selected: ${filterType} = ${value}`);
    const newFilters = { ...categoryFilters, [filterType]: value };
    setCategoryFilters(newFilters);
    saveFilterPreferences(newFilters); // Save immediately when filter changes
    setActiveFilterType(null);

    // Debug: Log current paths and how many match this filter
    const currentPathsForDebug = paths.length;
    console.log(
      `🔍 [ProgressScreen] Total paths: ${currentPathsForDebug}, new filter will be: ${filterType}=${value}`,
    );

    // Don't close drawer automatically - let user save when done
  };

  // Load accessible paths and exercises using helper functions
  const loadUserAccess = async () => {
    if (!effectiveUserId) return;

    try {
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

  // Exercise detail tours DISABLED to prevent console flooding
  // useEffect(() => {
  //   if (selectedExercise) {
  //     setTimeout(async () => {
  //       await triggerScreenTour('ExerciseDetail', tourContext, profile?.role);
  //     }, 800);
  //   }
  // }, [selectedExercise]);

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

  // Toggle completion for an exercise with all its repeats
  const toggleCompletionWithRepeats = async (
    exerciseId: string,
    includeAllRepeats: boolean = false,
  ) => {
    if (!effectiveUserId) return;

    // Find the exercise details
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    const isDone = completedIds.includes(exerciseId);

    console.log('🎯 [ProgressScreen] Toggle Completion With Repeats:', {
      exerciseId,
      exerciseTitle: exercise?.title,
      isCurrentlyCompleted: isDone,
      includeAllRepeats,
      repeatCount: exercise.repeat_count || 1,
      actionToTake: isDone ? 'REMOVE ALL' : 'ADD ALL',
    });

    // Toggle main exercise
    await toggleCompletion(exerciseId);

    // If includeAllRepeats and exercise has repeats, toggle all virtual repeats
    if (includeAllRepeats && exercise.repeat_count && exercise.repeat_count > 1) {
      const shouldMarkDone = !isDone; // If main was not done, we're marking everything as done

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

            // Check for celebration at 100% completion (any order - last exercise marked completes the path)
            // Wait a bit for state to propagate
            setTimeout(async () => {
              const updatedCompletedIds = [...completedIds, exerciseId];
              console.log('🎉 [ProgressScreen] Checking celebration after manual exercise toggle');

              // Check if THIS exercise is now fully complete (all repeats done)
              const { completed, total } = getRepeatProgress(exercise);
              if (completed === total && total > 1) {
                console.log(
                  '🎉 [ProgressScreen] 🚀 Exercise fully complete via manual toggle! Showing celebration!',
                );
                showCelebration({
                  learningPathTitle: learningPath?.title || exercise.title,
                  completedExercises: completed,
                  totalExercises: total,
                  timeSpent: undefined,
                  streakDays: undefined,
                });

                // Also check if entire path is complete
                setTimeout(async () => {
                  await checkForCelebration(
                    exercise.learning_path_id,
                    learningPath,
                    updatedCompletedIds,
                  );
                }, 3000);
              } else {
                // Just check if entire path is complete
                await checkForCelebration(
                  exercise.learning_path_id,
                  learningPath,
                  updatedCompletedIds,
                );
              }
            }, 500);
          }
        }
      } catch (err) {
        console.error('ProgressScreen: Exception in toggleCompletion (add)', err);
      }
    }
  };

  // Celebration detection function
  const checkForCelebration = async (
    pathId: string,
    learningPath: LearningPath | undefined,
    currentCompletedIds?: string[],
  ) => {
    if (!learningPath || !effectiveUserId) return;

    try {
      // Get all exercises for this learning path
      const pathExercises = exercises.filter((ex) => ex.learning_path_id === pathId);

      if (pathExercises.length === 0) return;

      // Count ALL completions including main exercises AND virtual repeats
      const idsToCheck = currentCompletedIds || completedIds;

      // Calculate total required completions (exercises + their repeats)
      let totalCompletionsNeeded = 0;
      let completedCount = 0;

      pathExercises.forEach((ex) => {
        const repeatCount = ex.repeat_count || 1;
        totalCompletionsNeeded += repeatCount;

        // Count main exercise
        if (idsToCheck.includes(ex.id)) {
          completedCount++;
        }

        // Count virtual repeats (if repeat_count > 1)
        if (repeatCount > 1) {
          for (let i = 2; i <= repeatCount; i++) {
            const virtualId = `${ex.id}-virtual-${i}`;
            if (virtualRepeatCompletions.includes(virtualId)) {
              completedCount++;
            }
          }
        }
      });

      const completionPercentage = Math.round((completedCount / totalCompletionsNeeded) * 100);

      // Trigger celebration ONLY for 100% completion (all exercises + all repeats)
      const shouldCelebrate = completionPercentage === 100;

      console.log('🎉 [ProgressScreen] Celebration check:', {
        completionPercentage,
        shouldCelebrate,
        completedCount,
        totalCompletionsNeeded,
      });

      if (shouldCelebrate) {
        console.log('🎉 [ProgressScreen] ✅ TRIGGERING CELEBRATION NOW!', {
          pathId,
          pathTitle: learningPath.title,
          completedCount,
          totalCompletionsNeeded,
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
            .eq('learning_path_id', pathId)
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
          console.log('📊 [ProgressScreen] Could not fetch celebration stats:', error);
        }

        // Use global celebration context
        console.log('🎉 [ProgressScreen] 🚀 CALLING showCelebration() NOW!!!', {
          learningPathTitle: learningPath.title,
          completedExercises: completedCount,
          totalExercises: totalCompletionsNeeded,
          timeSpent,
          streakDays,
        });

        showCelebration({
          learningPathTitle: learningPath.title,
          completedExercises: completedCount,
          totalExercises: totalCompletionsNeeded,
          timeSpent,
          streakDays,
        });

        console.log('🎉 [ProgressScreen] ✅ showCelebration() called successfully!');
      }
    } catch (error) {
      console.error('🎉 [ProgressScreen] Error checking for celebration:', error);
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

            // Check for celebration when marking virtual repeat as done
            setTimeout(async () => {
              console.log('🎉 [ProgressScreen] Checking celebration after virtual repeat toggle');

              // Wait for state to fully update before checking
              setTimeout(async () => {
                // Check if THIS exercise is now fully complete (all repeats done)
                const { completed, total } = getRepeatProgress(exercise);
                console.log('🎉 [ProgressScreen] Exercise progress check:', {
                  completed,
                  total,
                  isComplete: completed === total,
                });

                if (completed === total && total > 1) {
                  console.log(
                    '🎉 [ProgressScreen] 🚀 Exercise fully complete! Showing celebration!',
                  );
                  showCelebration({
                    learningPathTitle: learningPath?.title || exercise.title,
                    completedExercises: completed,
                    totalExercises: total,
                    timeSpent: undefined,
                    streakDays: undefined,
                  });

                  // Also check if entire path is complete
                  setTimeout(async () => {
                    await checkForCelebration(exercise.learning_path_id, learningPath);
                  }, 3000);
                } else {
                  // Just check if entire path is complete
                  await checkForCelebration(exercise.learning_path_id, learningPath);
                }
              }, 300); // Extra delay for state updates
            }, 200);
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
      console.log('🔍 [ProgressScreen] Fetching exercise completions for user:', effectiveUserId);
      console.log(
        '🔍 [ProgressScreen] Is viewing student:',
        activeUserId && activeUserId !== authUser?.id,
      );

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
        const completions = regularData?.map((c: { exercise_id: string }) => c.exercise_id) || [];
        setCompletedIds(completions);
        console.log(
          '✅ [ProgressScreen] Loaded completions for user:',
          effectiveUserId,
          'count:',
          completions.length,
        );
      }

      if (virtualError) {
        console.error('❌ Error fetching virtual completions:', virtualError);
        setVirtualRepeatCompletions([]);
      } else {
        // Convert virtual completions back to virtualId format: "exerciseId-virtual-2"
        const virtualCompletions =
          virtualData?.map(
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
        .subscribe();

      // Clean up subscription on unmount
      return () => {
        console.log(`ProgressScreen: Cleaning up subscription ${channelName}`);
        supabase.removeChannel(completionsSubscription);
      };
    }
  }, [effectiveUserId]);

  // History (audit) list support
  const [auditEntries, setAuditEntries] = useState<
    Array<{
      exercise_id: string;
      repeat_number: number | null;
      action: string;
      actor_name: string | null;
      created_at: string;
    }>
  >([]);
  const [exerciseInfoById, setExerciseInfoById] = useState<
    Record<
      string,
      { title: { en: string; sv: string }; repeat_count?: number; learning_path_id: string }
    >
  >({});

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
          const map: Record<
            string,
            { title: { en: string; sv: string }; repeat_count?: number; learning_path_id: string }
          > = {};
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
    console.log(
      `🔍 [ProgressScreen] Filtering ${paths.length} paths with filters:`,
      categoryFilters,
    );

    const filtered = paths.filter((path) => {
      // Handle variations in data values and allow null values
      const matchesVehicleType =
        categoryFilters.vehicle_type === '' ||
        categoryFilters.vehicle_type === 'all' ||
        !path.vehicle_type ||
        path.vehicle_type?.toLowerCase() === categoryFilters.vehicle_type?.toLowerCase();

      const matchesTransmission =
        categoryFilters.transmission_type === '' ||
        categoryFilters.transmission_type === 'all' ||
        !path.transmission_type ||
        path.transmission_type?.toLowerCase() === categoryFilters.transmission_type?.toLowerCase();

      const matchesLicense =
        categoryFilters.license_type === '' ||
        categoryFilters.license_type === 'all' ||
        !path.license_type ||
        path.license_type?.toLowerCase() === categoryFilters.license_type?.toLowerCase();

      const matchesExperience =
        categoryFilters.experience_level === '' ||
        categoryFilters.experience_level === 'all' ||
        !path.experience_level ||
        path.experience_level?.toLowerCase() === categoryFilters.experience_level?.toLowerCase();

      const matchesPurpose =
        categoryFilters.purpose === '' ||
        categoryFilters.purpose === 'all' ||
        !path.purpose ||
        path.purpose?.toLowerCase() === categoryFilters.purpose?.toLowerCase();

      const matchesUserProfile =
        categoryFilters.user_profile === '' ||
        categoryFilters.user_profile === 'all' ||
        !path.user_profile ||
        path.user_profile?.toLowerCase() === categoryFilters.user_profile?.toLowerCase() ||
        path.user_profile === 'All' ||
        path.user_profile === 'all'; // "All" user profile matches any filter

      const matchesPlatform =
        categoryFilters.platform === '' ||
        categoryFilters.platform === 'all' ||
        !path.platform ||
        path.platform === 'both' || // "both" platform matches any filter
        path.platform?.toLowerCase() === categoryFilters.platform?.toLowerCase() ||
        path.platform === 'mobile'; // Always show mobile content

      const matchesType =
        categoryFilters.type === '' ||
        categoryFilters.type === 'all' ||
        !path.type ||
        path.type?.toLowerCase() === categoryFilters.type?.toLowerCase();

      const matches =
        matchesVehicleType &&
        matchesTransmission &&
        matchesLicense &&
        matchesExperience &&
        matchesPurpose &&
        matchesUserProfile &&
        matchesPlatform &&
        matchesType;

      // Debug individual path filtering
      if (!matches && categoryFilters.license_type !== 'all') {
        console.log(`❌ [ProgressScreen] Path "${path.title?.en || path.id}" filtered out:`, {
          path_license: path.license_type,
          filter_license: categoryFilters.license_type,
          matchesLicense,
          matchesVehicleType,
          matchesTransmission,
          matchesExperience,
        });
      }

      return matches;
    });

    console.log(`✅ [ProgressScreen] Filtered from ${paths.length} to ${filtered.length} paths`);
    return filtered;
  }, [paths, categoryFilters]);

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  // Add navigation listener to refresh data when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      console.log('🔄 [ProgressScreen] Screen focused - refreshing data and filters');
      fetchCompletions();

      // Reload filter preferences to sync with any changes from other screens
      const savedFilters = await loadFilterPreferences();
      if (savedFilters) {
        setCategoryFilters(savedFilters);
        console.log('🔄 [ProgressScreen] Reloaded filters on focus:', savedFilters);
      }

      // ProgressScreen tours DISABLED to prevent console flooding
      // setTimeout(async () => {
      //   if (!tourContext.isActive) {
      //     await triggerScreenTour('ProgressScreen', tourContext, profile?.role);
      //   }
      // }, 1000);

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
  }, [navigation, showDetailView, detailPath]); // Removed tour dependencies

  // Populate exercisesByPath mapping AND allPathExercises for consistent progress calculation
  useEffect(() => {
    const fetchAllExercises = async () => {
      const map: { [pathId: string]: string[] } = {};
      const allExercises: PathExercise[] = [];

      for (const path of paths) {
        const { data } = await supabase
          .from('learning_path_exercises')
          .select('*') // Get full exercise objects, not just IDs
          .eq('learning_path_id', path.id)
          .order('order_index', { ascending: true });

        map[path.id] = data ? data.map((e: { id: string }) => e.id) : [];
        if (data) {
          allExercises.push(...data);
        }
      }
      setExercisesByPath(map);
      setAllPathExercises(allExercises); // Store ALL exercises for progress calculation
      console.log(
        '✅ [ProgressScreen] Loaded all exercises for progress calculation:',
        allExercises.length,
      );
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

  // 🔒 Check if learning path requires payment
  const checkPathPaywall = async (path: LearningPath): Promise<boolean> => {
    // If paywall is not enabled, allow access
    if (!path.paywall_enabled) {
      return true;
    }

    // Check if user has already paid for this path
    try {
      const { data: payments, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('status', 'completed')
        .contains('metadata', { feature_key: `learning_path_${path.id}` });

      if (error) {
        console.error('Error checking payment status:', error);
        return false; // Block access on error
      }

      if (payments && payments.length > 0) {
        console.log('✅ User has paid for path:', path.title.en);
        return true; // User has paid
      }

      // User hasn't paid - show paywall
      console.log('🔒 Path requires payment:', path.title.en, `$${path.price_usd}`);
      setPaywallPath(path);
      setShowPaywallModal(true);
      return false;
    } catch (error) {
      console.error('Error checking path paywall:', error);
      return false;
    }
  };

  // Modified handlePathPress to include paywall and password checks
  const handlePathPress = async (path: LearningPath, index: number) => {
    // 🔒 Check paywall before allowing access
    const canAccess = await checkPathPaywall(path);
    if (!canAccess) {
      return; // Paywall modal will be shown
    }

    // 🔒 Check password lock before allowing access
    if (path.is_locked && !isPathUnlocked(path.id)) {
      setPasswordPath(path);
      setShowPasswordModal(true);
      return; // Password modal will be shown
    }

    setActivePath(path.id);
    setDetailPath(path);
    setShowDetailView(true);
  };

  // Handle exercise selection with lock checks
  const handleExerciseSelect = async (exercise: PathExercise) => {
    // 🔒 Check exercise password lock before allowing access
    if (exercise.is_locked && !isExerciseUnlocked(exercise.id)) {
      setPasswordExercise(exercise);
      setShowExercisePasswordModal(true);
      return; // Password modal will be shown
    }

    setSelectedExercise(exercise);
  };

  // Calculate progress for each path using exercisesByPath mapping
  const getPathProgress = (pathId: string): number => {
    if (!pathId) return 0;

    const ids = exercisesByPath[pathId] || [];
    if (ids.length === 0) return 0;

    // Get full exercise objects to check repeat counts - USE allPathExercises instead of exercises
    const pathExercises = allPathExercises.filter((ex) => ex.learning_path_id === pathId);

    // Fallback: if allPathExercises is empty, calculate simple progress without repeats
    if (pathExercises.length === 0) {
      const completed = ids.filter((id) => completedIds.includes(id)).length;
      const progress = ids.length > 0 ? completed / ids.length : 0;
      console.log(`📊 [ProgressScreen] Path progress (simple) for ${pathId}:`, {
        pathId,
        totalExercises: ids.length,
        completedCount: completed,
        progressPercent: Math.round(progress * 100),
      });
      return progress;
    }

    // Calculate total required completions (exercises + their repeats)
    let totalCompletionsNeeded = 0;
    let completedCount = 0;

    pathExercises.forEach((ex) => {
      const repeatCount = ex.repeat_count || 1;
      totalCompletionsNeeded += repeatCount;

      // Count main exercise
      if (completedIds.includes(ex.id)) {
        completedCount++;
      }

      // Count virtual repeats (if repeat_count > 1)
      if (repeatCount > 1) {
        for (let i = 2; i <= repeatCount; i++) {
          const virtualId = `${ex.id}-virtual-${i}`;
          if (virtualRepeatCompletions.includes(virtualId)) {
            completedCount++;
          }
        }
      }
    });

    const progress = totalCompletionsNeeded > 0 ? completedCount / totalCompletionsNeeded : 0;

    console.log(`📊 [ProgressScreen] Path progress for ${pathId}:`, {
      pathId,
      totalCompletionsNeeded,
      completedCount,
      progressPercent: Math.round(progress * 100),
      effectiveUserId,
      isViewingStudent: activeUserId && activeUserId !== authUser?.id,
      pathExercisesCount: pathExercises.length,
    });

    return progress;
  };

  // Filter modal functionality now handled by LearningPathsFilterModal component

  // Filter drawer functionality moved to LearningPathsFilterModal component

  // Youtube video component
  const YouTubeEmbed = ({ videoId, startTime }: { videoId: string; startTime?: number }) => {
    const screenWidth = Dimensions.get('window').width;
    const videoWidth = screenWidth - 48; // Account for padding
    const videoHeight = videoWidth * 0.5625; // 16:9 aspect ratio

    console.log('🎥 [ProgressScreen] Rendering YouTube embed with video ID:', videoId, 'startTime:', startTime);

    return (
      <View
        style={{
          width: videoWidth,
          height: videoHeight,
          marginVertical: 12,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        <YoutubePlayer
          height={videoHeight}
          videoId={videoId}
          play={false}
          initialPlayerParams={startTime ? { start: startTime } : undefined}
          webViewProps={{
            androidLayerType: 'hardware',
          }}
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

  // Parse YouTube URL to extract video ID and start time
  const parseYouTubeUrl = (url: string | undefined): { videoId: string | null; startTime: number | undefined } => {
    if (!url) return { videoId: null, startTime: undefined };

    console.log('🎥 [ProgressScreen] Extracting video ID and start time from URL:', url);

    let videoId: string | null = null;
    let startTime: number | undefined = undefined;

    // Handle different YouTube URL formats
    // 1. https://www.youtube.com/watch?v=VIDEO_ID
    // 2. https://youtu.be/VIDEO_ID
    // 3. https://www.youtube.com/embed/VIDEO_ID
    // 4. https://www.youtube.com/v/VIDEO_ID
    // 5. https://m.youtube.com/watch?v=VIDEO_ID

    // Try standard regex first
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[7] && match[7].length === 11) {
      console.log('✅ [ProgressScreen] Extracted video ID:', match[7]);
      videoId = match[7];
    }

    // Try alternative extraction methods and extract start time
    try {
      const urlObj = new URL(url);

      // Check query parameter for video ID
      if (!videoId) {
        const vParam = urlObj.searchParams.get('v');
        if (vParam && vParam.length === 11) {
          console.log('✅ [ProgressScreen] Extracted video ID from query param:', vParam);
          videoId = vParam;
        }
      }

      // Check pathname for youtu.be or embed format
      if (!videoId) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart.length === 11) {
            console.log('✅ [ProgressScreen] Extracted video ID from path:', lastPart);
            videoId = lastPart;
          }
        }
      }

      // Extract start time from URL parameters
      // Supports: ?t=233, &t=233, ?t=233s, ?t=3m53s, ?start=233
      const tParam = urlObj.searchParams.get('t');
      const startParam = urlObj.searchParams.get('start');

      if (tParam) {
        const timeStr = tParam.replace(/s$/, '');
        if (/^\d+$/.test(timeStr)) {
          startTime = parseInt(timeStr, 10);
        } else {
          let seconds = 0;
          const hourMatch = timeStr.match(/(\d+)h/);
          const minMatch = timeStr.match(/(\d+)m/);
          const secMatch = timeStr.match(/(\d+)(?:s|$)/);
          if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600;
          if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
          if (secMatch && !timeStr.includes('m') && !timeStr.includes('h')) {
            seconds = parseInt(secMatch[1], 10);
          } else if (secMatch) {
            seconds += parseInt(secMatch[1], 10);
          }
          startTime = seconds > 0 ? seconds : undefined;
        }
        if (startTime) console.log('✅ [ProgressScreen] Extracted start time:', startTime, 'seconds');
      } else if (startParam) {
        startTime = parseInt(startParam, 10);
        console.log('✅ [ProgressScreen] Extracted start time from start param:', startTime, 'seconds');
      }
    } catch (e) {
      console.log('⚠️ [ProgressScreen] URL parsing failed:', e);
    }

    if (!videoId) console.log('❌ [ProgressScreen] Could not extract video ID from URL');
    return { videoId, startTime };
  };

  // Legacy function for backwards compatibility
  const getYouTubeVideoId = (url: string | undefined): string | null => {
    return parseYouTubeUrl(url).videoId;
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
            {/* <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Video Tutorial
            </Text> */}
            {(() => {
              console.log('🎥 [ProgressScreen] Exercise youtube_url:', exercise.youtube_url);
              const { videoId, startTime } = parseYouTubeUrl(exercise.youtube_url);
              console.log('🎥 [ProgressScreen] Extracted videoId:', videoId, 'startTime:', startTime);

              return videoId ? (
                <YouTubeEmbed videoId={videoId} startTime={startTime} />
              ) : (
                <YStack gap={8}>
                  <Text color="$gray11" fontSize={12}>
                    Could not load video. URL: {exercise.youtube_url}
                  </Text>
                  <TouchableOpacity
                    onPress={() => exercise.youtube_url && Linking.openURL(exercise.youtube_url)}
                    style={{
                      padding: 12,
                      backgroundColor: '#FF0000',
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text color="white" fontWeight="600">
                      Watch on YouTube
                    </Text>
                  </TouchableOpacity>
                </YStack>
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

  // Render media for a learning path
  const renderLearningPathMedia = (path: LearningPath) => {
    return (
      <YStack gap={16}>
        {/* YouTube Video */}
        {path.youtube_url && (
          <YStack>
            {/* <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Video Tutorial
            </Text> */}
            {(() => {
              console.log('🎥 [ProgressScreen] Learning Path youtube_url:', path.youtube_url);
              const { videoId, startTime } = parseYouTubeUrl(path.youtube_url);
              console.log('🎥 [ProgressScreen] Extracted videoId:', videoId, 'startTime:', startTime);

              return videoId ? (
                <YouTubeEmbed videoId={videoId} startTime={startTime} />
              ) : (
                <YStack gap={8}>
                  <Text color="$gray11" fontSize={12}>
                    Could not load video. URL: {path.youtube_url}
                  </Text>
                  <TouchableOpacity
                    onPress={() => path.youtube_url && Linking.openURL(path.youtube_url)}
                    style={{
                      padding: 12,
                      backgroundColor: '#FF0000',
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text color="white" fontWeight="600">
                      Watch on YouTube
                    </Text>
                  </TouchableOpacity>
                </YStack>
              );
            })()}
          </YStack>
        )}

        {/* Image */}
        {path.image && (
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Reference Image
            </Text>
            <Image
              source={{ uri: path.image }}
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

  // Enhanced isPathPasswordLocked function to check for locked status (uses shared context)
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    // Use !! to convert undefined to false, ensuring boolean return
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  // NEW: Check if path is behind paywall (uses shared context)
  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  // Separate function to check if a path specifically has a password
  const pathHasPassword = (path: LearningPath): boolean => {
    return !!path.is_locked && !!path.lock_password;
  };

  // Function to check if an exercise is locked with password (uses shared context)
  const isExercisePasswordLocked = (exercise: PathExercise): boolean => {
    // Use !! to convert undefined to false, ensuring boolean return
    return !!exercise.is_locked && !!exercise.lock_password && !isExerciseUnlocked(exercise.id);
  };

  // NEW: Check if exercise is behind paywall (uses shared context)
  const isExercisePaywallLocked = (exercise: PathExercise): boolean => {
    if (!exercise.paywall_enabled) return false;
    return !hasExercisePayment(exercise.id);
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
              <TamaguiButton flex={1} backgroundColor="#333" onPress={closeQuiz} borderRadius={12}>
                <Text>Back to Exercise</Text>
              </TamaguiButton>
              <TamaguiButton
                flex={1}
                backgroundColor="#00E6C3"
                color="#000"
                onPress={() => {
                  setQuizCompleted(false);
                  resetQuiz();
                }}
                borderRadius={12}
              >
                <Text>Start Over</Text>
              </TamaguiButton>
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
              <Feather name="arrow-left" size={28} color={iconColor} />
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

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: getTabContentPadding() }}
          >
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
              {currentQuestion.answers.map((answer, answerIndex) => {
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
                    key={`quiz-answer-${answer.id}-${answerIndex}`}
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
                      {isSelected && <Feather name="check" size={16} color="000" />}
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
            <TamaguiButton
              backgroundColor={currentQuestionIndex > 0 ? '#333' : 'transparent'}
              disabled={currentQuestionIndex === 0}
              onPress={handleQuizPrevious}
              borderRadius={8}
              paddingHorizontal={20}
            >
              <Text>Previous</Text>
            </TamaguiButton>

            <Text fontSize={14} color="$gray11">
              {currentQuestionIndex + 1} / {quizQuestions.length}
            </Text>

            <TamaguiButton
              backgroundColor={hasAnswer ? '#00E6C3' : '#666'}
              color={hasAnswer ? '#000' : '#ccc'}
              disabled={!hasAnswer}
              onPress={handleQuizNext}
              borderRadius={8}
              paddingHorizontal={20}
            >
              <Text>{currentQuestionIndex === quizQuestions.length - 1 ? 'Finish' : 'Next'}</Text>
            </TamaguiButton>
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
      <YStack flex={1} backgroundColor="$background" paddingHorizontal={0} paddingVertical={40}>
        {/* Enhanced Header Overlay */}
        <HeaderComponent
          title=""
          variant="smart"
          enableBlur={true}
          leftElement={
            <TouchableOpacity onPress={() => setSelectedExercise(null)}>
              <Feather name="arrow-left" size={28} color={iconColor} />
            </TouchableOpacity>
          }
          rightElement={
            <TouchableOpacity
              onPress={() => {
                console.log('🧾 [ProgressScreen] open report exercise', selectedExercise.id);
                setReportExerciseId(selectedExercise.id);
              }}
            >
              <Feather name="flag" size={20} color={iconColor} />
            </TouchableOpacity>
          }
        />
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: 120,
            paddingBottom: getTabContentPadding(),
          }}
          onScroll={onScroll}
          scrollEventThrottle={16}
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
          {/* Header is now a smart overlay component above */}

          {/* Exercise Progress Circle - Show for exercises with repeats - HIDDEN (using horizontal bar instead) */}
          {/* {selectedExercise.repeat_count && selectedExercise.repeat_count > 1 && (
            <XStack justifyContent="center" alignItems="center" marginTop={8} marginBottom={16}>
              <View style={{ position: 'relative' }}>
                <ProgressCircle
                  percent={(() => {
                    // Calculate completion percentage for this exercise's repeats
                    const mainDone = completedIds.includes(selectedExercise.id) ? 1 : 0;
                    const virtualDone = Array.from({
                      length: selectedExercise.repeat_count - 1,
                    }).filter((_, i) => {
                      const virtualId = `${selectedExercise.id}-virtual-${i + 2}`;
                      return virtualRepeatCompletions.includes(virtualId);
                    }).length;
                    return (mainDone + virtualDone) / selectedExercise.repeat_count;
                  })()}
                  size={90}
                  color={colorScheme === 'dark' ? '#27febe' : '#00C9A7'}
                  bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
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
                  fontSize={20}
                  color={colorScheme === 'dark' ? '#27febe' : '#00C9A7'}
                  fontWeight="bold"
                >
                  {(() => {
                    const mainDone = completedIds.includes(selectedExercise.id) ? 1 : 0;
                    const virtualDone = Array.from({
                      length: selectedExercise.repeat_count - 1,
                    }).filter((_, i) => {
                      const virtualId = `${selectedExercise.id}-virtual-${i + 2}`;
                      return virtualRepeatCompletions.includes(virtualId);
                    }).length;
                    return `${mainDone + virtualDone}/${selectedExercise.repeat_count}`;
                  })()}
                </Text>
              </View>
            </XStack>
          )} */}

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
              <XStack alignItems="center" gap={8} justifyContent="center">
                <Text
                  fontSize={28}
                  fontWeight="900"
                  fontStyle="italic"
                  color="$color"
                  textAlign="center"
                >
                  {selectedExercise.title?.[language] || selectedExercise.title?.en || 'Untitled'}
                </Text>

                {/* Show repeat indicator if it's a repeat */}
                {/* {selectedExercise.isRepeat && (
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
                )} */}
              </XStack>

              {/* If not a repeat but has repeat_count > 1, show this information */}
              {/* {!selectedExercise.isRepeat &&
                selectedExercise.repeat_count &&
                selectedExercise.repeat_count > 1 && (
                  <XStack alignItems="center" gap={4} marginTop={4}>
                    <Feather name="repeat" size={16} color="#4B6BFF" />
                    <Text color="#4B6BFF" fontSize={14}>
                      This exercise needs to be repeated {selectedExercise.repeat_count} times
                    </Text>
                  </XStack>
                )} */}
            </YStack>

            {/* Show appropriate icon for exercise state */}
            {isPasswordLocked ? (
              <MaterialIcons name="lock" size={24} color="#FF9500" />
            ) : !prevExercisesComplete ? (
              <MaterialIcons name="hourglass-empty" size={24} color="#FF9500" />
            ) : isDone ? (
              // <Feather name="check-circle" size={24} color="#00E6C3" />
              <></>
            ) : null}
          </XStack>

          {selectedExercise.description?.[language] && (
            <Text color="$gray11" marginBottom={16} textAlign="center" fontSize={16}>
              {selectedExercise.description[language]}
            </Text>
          )}

          {/* <TouchableOpacity
            onPress={() => {
              console.log('🧾 [ProgressScreen] open report exercise', selectedExercise.id);
              setReportExerciseId(selectedExercise.id);
            }}
            style={{ alignSelf: 'flex-end', marginBottom: 8 }}
          >
            <Text color="#EF4444">Report Exercise</Text>
          </TouchableOpacity> */}

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

              <TamaguiButton
                backgroundColor="#00E6C3"
                color="#000"
                fontWeight="bold"
                onPress={() => navigateToQuiz(selectedExercise)}
                borderRadius={12}
                paddingVertical={16}
              >
                <Text>
                  {quizStatistics && quizStatistics.total_attempts > 0
                    ? 'Retake Quiz'
                    : 'Start Quiz'}
                </Text>
              </TamaguiButton>
            </YStack>
          )}

          {/* Always show normal exercise content - lock check happens before navigation */}
          {/* Media Rendering Section - Only show if exercise is accessible */}
          {renderExerciseMedia(selectedExercise)}

          {/* Repetition Progress (if this is a repeated exercise) */}
          {/* {(selectedExercise.isRepeat ||
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
          )} */}

          {/* Steps Section - Accordion Style */}
          {selectedExercise.steps && selectedExercise.steps.length > 0 && (
            <YStack marginBottom={24}>
              <ExerciseStepsAccordion exercise={selectedExercise} language={language} />
            </YStack>
          )}

          {/* List of all repeats if viewing the base exercise */}
          {!selectedExercise.isRepeat &&
            selectedExercise.repeat_count &&
            selectedExercise.repeat_count > 1 && (
              <YStack /* ref={repeatSectionRef} */ marginTop={16} marginBottom={16} gap={32}>
                {/* <XStack alignItems="center" gap={8} marginBottom={8}>
                  <Feather name="list" size={20} color="#4B6BFF" />
                  <Text fontSize={18} fontWeight="bold" color="#4B6BFF">
                    All Repetitions
                  </Text>
                </XStack> */}

                {/* Progress bar for all repetitions */}
                <RepeatProgressBar exercise={selectedExercise} />

                {/* Show the original exercise first */}
                <TouchableOpacity
                  style={
                    {
                      // backgroundColor: '#222',
                      // padding: 12,
                      // borderRadius: 8,
                      // borderLeftWidth: 4,
                      // borderLeftColor: completedIds.includes(selectedExercise.id)
                      //   ? '#00E6C3'
                      //   : '#4B6BFF',
                    }
                  }
                  onPress={() => {
                    // Toggle the main exercise completion
                    toggleCompletion(selectedExercise.id);
                  }}
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <XStack gap={28} alignItems="center" flex={1}>
                      <Checkbox
                        checked={completedIds.includes(selectedExercise.id)}
                        size="sm"
                        stopPropagation={true}
                        onPress={() => {
                          toggleCompletion(selectedExercise.id);
                        }}
                      />
                      <Text
                        fontSize={16}
                        color="$color"
                        fontWeight="900"
                        fontStyle="italic"
                        numberOfLines={1}
                        flex={1}
                      >
                        {selectedExercise.title?.[language] ||
                          selectedExercise.title?.en ||
                          'Original'}
                      </Text>
                    </XStack>
                    {/* <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                      1/{selectedExercise.repeat_count}
                    </Text>
                    {completedIds.includes(selectedExercise.id) && (
                      <Feather name="check-circle" size={18} color="#00E6C3" />
                    )} */}
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
                    return Array.from({ length: selectedExercise.repeat_count - 1 }).map((_, i) => {
                      const repeatNumber = i + 2; // Start from 2 since 1 is the original
                      const virtualId = `${selectedExercise.id}-virtual-${repeatNumber}`;
                      // For virtual repeats, track completion individually
                      const isDone = virtualRepeatCompletions.includes(virtualId);

                      return (
                        <TouchableOpacity
                          key={`virtual-repeat-${selectedExercise.id}-${i}-${repeatNumber}`}
                          style={
                            {
                              // backgroundColor: '#222',
                              // padding: 12,
                              // borderRadius: 8,
                              // borderLeftWidth: 4,
                              // borderLeftColor: isDone ? '#00E6C3' : '#4B6BFF',
                            }
                          }
                          onPress={() => {
                            // Play sound
                            playDoneSound();
                            // For virtual repeats, toggle individual completion
                            toggleVirtualRepeatCompletion(virtualId);
                          }}
                        >
                          <XStack justifyContent="space-between" alignItems="center">
                            <XStack gap={28} alignItems="center" flex={1}>
                              <Checkbox
                                checked={isDone}
                                size="sm"
                                stopPropagation={true}
                                onPress={() => {
                                  playDoneSound();
                                  toggleVirtualRepeatCompletion(virtualId);
                                }}
                              />
                              <Text
                                fontSize={16}
                                color="$color"
                                fontWeight="900"
                                fontStyle="italic"
                                numberOfLines={1}
                                flex={1}
                              >
                                Repetition {repeatNumber}
                              </Text>
                            </XStack>
                            {/* <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                              {repeatNumber}/{selectedExercise.repeat_count}
                            </Text>
                            {isDone && <Feather name="check-circle" size={18} color="#00E6C3" />} */}
                          </XStack>
                        </TouchableOpacity>
                      );
                    });
                  }

                  return repeats.map((repeat, repeatIndex) => {
                    const isDone = completedIds.includes(repeat.id);
                    // Remove locking for repeats - only main exercise can be locked

                    return (
                      <TouchableOpacity
                        key={`repeat-${repeat.id}-${repeatIndex}`}
                        style={
                          {
                            // backgroundColor: '#222',
                            // padding: 12,
                            // borderRadius: 8,
                            // borderLeftWidth: 4,
                            // borderLeftColor: isDone ? '#00E6C3' : '#4B6BFF',
                          }
                        }
                        onPress={() => setSelectedExercise(repeat)}
                      >
                        <XStack justifyContent="space-between" alignItems="center">
                          <XStack gap={8} alignItems="center" flex={1}>
                            <Checkbox
                              checked={isDone}
                              size="sm"
                              stopPropagation={true}
                              onPress={() => {
                                toggleCompletion(repeat.id);
                              }}
                            />
                            <Text
                              fontSize={16}
                              color="$color"
                              fontWeight="600"
                              numberOfLines={1}
                              flex={1}
                            >
                              {repeat.title?.[language] ||
                                repeat.title?.en ||
                                `Repetition ${repeat.repeatNumber}`}
                            </Text>
                          </XStack>
                          {/* <Text fontSize={14} color="#4B6BFF" fontWeight="bold">
                            {repeat.repeatNumber}/{repeat.repeat_count}
                          </Text>
                          {isDone && <Feather name="check-circle" size={18} color="#00E6C3" />} */}
                        </XStack>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </YStack>
            )}

          {/* Toggle done/not done button */}
          <Button
            // ref={markCompleteButtonRef} // DISABLED
            size="md"
            variant={isDone ? 'link' : 'primary'}
            onPress={async () => {
              const shouldMarkDone = !isDone;

              // Toggle main exercise
              toggleCompletion(selectedExercise.id);

              // Also toggle all virtual repeats if this exercise has repeats
              if (selectedExercise.repeat_count && selectedExercise.repeat_count > 1) {
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

              // Trigger celebration when marking all repeats as done
              if (shouldMarkDone) {
                console.log(
                  '🎉 [ProgressScreen] Mark All as Done - showing celebration for exercise completion',
                );

                // Wait a bit for state to update
                setTimeout(async () => {
                  const repeatCount = selectedExercise.repeat_count || 1;
                  const learningPath = paths.find(
                    (p) => p.id === selectedExercise.learning_path_id,
                  );

                  // First, celebrate completing THIS exercise with all repeats
                  console.log(
                    '🎉 [ProgressScreen] 🚀 Showing celebration for completed exercise with all repeats!',
                  );

                  showCelebration({
                    learningPathTitle: learningPath?.title || selectedExercise.title,
                    completedExercises: repeatCount,
                    totalExercises: repeatCount,
                    timeSpent: undefined,
                    streakDays: undefined,
                  });

                  // Then, check if the entire learning path is now complete
                  if (selectedExercise.learning_path_id && learningPath) {
                    const updatedCompletedIds = [...completedIds, selectedExercise.id];

                    // Wait for exercise celebration to close before checking path celebration
                    setTimeout(async () => {
                      console.log(
                        '🎉 [ProgressScreen] Also checking if entire learning path is complete...',
                      );
                      await checkForCelebration(
                        selectedExercise.learning_path_id,
                        learningPath,
                        updatedCompletedIds,
                      );
                    }, 3000); // Wait 3 seconds for exercise celebration to be seen
                  }
                }, 500);
              }
            }}
            marginTop={24}
          >
            {isDone ? 'Mark All as Not Done' : 'Mark All as Done'}
          </Button>

          {/* Navigation buttons for repeats */}
          {/* {totalRepeats > 1 && (
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
            </XStack> */}

          {/* Additional details section */}
          {/* <YStack gap={8} marginTop={16}>
            <Text color="$gray11">ID: {selectedExercise.id}</Text>
            <Text color="$gray11">Order: {selectedExercise.order_index}</Text>
            {selectedExercise.isRepeat && selectedExercise.originalId && (
              <Text color="$gray11">Original Exercise ID: {selectedExercise.originalId}</Text>
            )}
            <Text color="$gray11">Created: {selectedExercise.created_at}</Text>
            <Text color="$gray11">Updated: {selectedExercise.updated_at}</Text>
          </YStack> */}

          {/* Comments moved to bottom to be less prominent */}
          {/* <YStack marginTop={24}>
            <Text fontSize={18} fontWeight="bold" color="$color" marginBottom={8}>
              Comments
            </Text>
            <CommentsSection targetType="exercise" targetId={selectedExercise.id} />
          </YStack> */}
        </ScrollView>
        {/* Add Quiz Interface */}
        <QuizInterface />

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
      <YStack flex={1} backgroundColor="$background" paddingHorizontal={0} paddingVertical={40}>
        {/* Enhanced Header Overlay for Learning Path */}
        <HeaderComponent
          title=""
          variant="smart"
          enableBlur={true}
          leftElement={
            <TouchableOpacity onPress={() => setShowDetailView(false)}>
              <Feather name="arrow-left" size={28} color={iconColor} />
            </TouchableOpacity>
          }
          rightElement={
            <TouchableOpacity
              onPress={() => {
                console.log('🧾 [ProgressScreen] open report path', detailPath.id);
                setReportPath(true);
              }}
            >
              <Feather name="flag" size={20} color={iconColor} />
            </TouchableOpacity>
          }
        />
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingBottom: getTabContentPadding(),
            paddingTop: 120,
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
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {viewingUserName && user?.role === 'instructor' && (
            <YStack marginBottom={12} padding={10} backgroundColor="#162023" borderRadius={12}>
              <Text color="#00E6C3" fontSize={12}>
                {getTranslation('common.viewingAs', language === 'sv' ? 'Visar som' : 'Viewing as')}
                : {viewingUserName}
              </Text>
            </YStack>
          )}

          <ExerciseHeader
            title={detailPath.title}
            description={detailPath.description}
            language={language}
            showProgress={true}
            exercises={exercises}
            completedIds={completedIds}
            image={detailPath.image || undefined}
            youtube_url={detailPath.youtube_url}
            isPasswordLocked={isPasswordLocked}
            isAvailable={isAvailable}
            icon={detailPath.icon || undefined}
            centerAlign={true}
            showMediaSection={true}
            showDescriptionSection={true}
            renderCustomMedia={() => renderLearningPathMedia(detailPath)}
          />

          {/* <TouchableOpacity
            onPress={() => {
              console.log('🧾 [ProgressScreen] open report path', detailPath.id);
              setReportPath(true);
            }}
            style={{ alignSelf: 'flex-end', marginBottom: 8 }}
          >
            <Text color="#EF4444">Report Learning Path</Text>
          </TouchableOpacity> */}

          {/* Always show normal path content - lock check happens before navigation */}
          {/* Completion progress */}
          {/* {totalCount > 0 && (
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
          )} */}

          {/* Mark all button */}
          {/* <TouchableOpacity
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
          </TouchableOpacity> */}

          {/* <Text fontSize={22} fontWeight="bold" color="$color" marginBottom={16}>
            Exercises
          </Text> */}

          {exercises.length === 0 ? (
            <Text color="$gray11">No exercises for this learning path.</Text>
          ) : (
            exercises.map((exercise, exerciseIndex) => {
              // Process exercises: show all exercises and create virtual repeats for UI
              const displayIndex = exerciseIndex + 1;
              const main = exercise;

              // Main exercise logic - check if ALL repeats are done, not just the main exercise
              const mainExerciseDone = completedIds.includes(main.id);
              const { completed: repeatsDone, total: totalRepeats } = getRepeatProgress(main);
              const mainIsDone = totalRepeats > 1 ? repeatsDone === totalRepeats : mainExerciseDone;
              const mainIsPasswordLocked = isExercisePasswordLocked(main);

              // More permissive access - only block if password-locked
              const mainIsAvailable = !mainIsPasswordLocked;

              return (
                <YStack
                  key={`exercise-detail-${main.id}-${exerciseIndex}`}
                  marginBottom={8}
                  marginTop={16}
                >
                  {/* Main Exercise */}
                  <ExerciseCard
                    title={main.title?.[language] || main.title?.en || 'Untitled'}
                    description={main.description?.[language]}
                    displayIndex={displayIndex}
                    checked={mainIsDone}
                    disabled={!mainIsAvailable}
                    locked={mainIsPasswordLocked}
                    showChevron={true}
                    onPress={() => handleExerciseSelect(main)}
                    onCheckboxPress={async () => {
                      if (mainIsAvailable) {
                        // Play sound
                        playDoneSound();

                        // Toggle main exercise AND all its repeats
                        const shouldMarkDone = !mainIsDone;

                        // Toggle main exercise
                        await toggleCompletion(main.id);

                        // Toggle all virtual repeats if this exercise has repeats
                        if (main.repeat_count && main.repeat_count > 1) {
                          for (let i = 2; i <= main.repeat_count; i++) {
                            const virtualId = `${main.id}-virtual-${i}`;
                            const isVirtualDone = virtualRepeatCompletions.includes(virtualId);

                            // Only toggle if virtual repeat state doesn't match desired state
                            if (shouldMarkDone && !isVirtualDone) {
                              await toggleVirtualRepeatCompletion(virtualId);
                            } else if (!shouldMarkDone && isVirtualDone) {
                              await toggleVirtualRepeatCompletion(virtualId);
                            }
                          }
                        }

                        // Show celebration when marking all as done
                        if (shouldMarkDone) {
                          setTimeout(() => {
                            const repeatCount = main.repeat_count || 1;
                            const learningPath = paths.find((p) => p.id === main.learning_path_id);

                            console.log(
                              '🎉 [ProgressScreen] 🚀 Main checkbox - showing celebration for completed exercise!',
                            );

                            showCelebration({
                              learningPathTitle: learningPath?.title || main.title,
                              completedExercises: repeatCount,
                              totalExercises: repeatCount,
                              timeSpent: undefined,
                              streakDays: undefined,
                            });

                            // Also check if entire path is complete
                            if (main.learning_path_id && learningPath) {
                              setTimeout(async () => {
                                const updatedCompletedIds = [...completedIds, main.id];
                                await checkForCelebration(
                                  main.learning_path_id,
                                  learningPath,
                                  updatedCompletedIds,
                                );
                              }, 3000);
                            }
                          }, 500);
                        }
                      }
                    }}
                    size="md"
                    variant="default"
                  />
                </YStack>
              );
            })
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
                <Feather name="arrow-left" size={28} color={iconColor} />
              </TouchableOpacity>
              <Text fontSize={18} fontWeight="bold" color="$color">
                History
              </Text>
              <View style={{ width: 28 }} />
            </XStack>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
              {auditEntries.length === 0 ? (
                <Text color="$gray11">No recent activity.</Text>
              ) : (
                auditEntries.map((e, idx) => {
                  const info = exerciseInfoById[e.exercise_id];
                  const title = info?.title?.[language] || info?.title?.en || 'Untitled';
                  const totalRepeats = info?.repeat_count || 1;
                  const mainDone = completedIds.includes(e.exercise_id);
                  const isVirtual = !!e.repeat_number && e.repeat_number > 1;
                  const virtualId = isVirtual ? `${e.exercise_id}-virtual-${e.repeat_number}` : '';
                  const virtualDone = isVirtual
                    ? virtualRepeatCompletions.includes(virtualId)
                    : false;
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
                      key={`audit-${e.exercise_id}-${e.created_at}-${idx}-${e.repeat_number || 0}`}
                      onPress={() => {
                        const ex = exercises.find((x) => x.id === e.exercise_id) || null;
                        if (ex) setSelectedExercise(ex);
                      }}
                      style={{ paddingVertical: 10 }}
                    >
                      <XStack alignItems="center" gap={10}>
                        <Checkbox
                          checked={isChecked}
                          size="xs"
                          onPress={() => {
                            if (isVirtual && virtualId) {
                              toggleVirtualRepeatCompletion(virtualId);
                            } else {
                              toggleCompletion(e.exercise_id);
                            }
                          }}
                        />
                        <YStack flex={1}>
                          <Text color="$color" numberOfLines={2} fontWeight="600">
                            {title}
                            {totalRepeats > 1 && e.repeat_number
                              ? ` — Repetition ${e.repeat_number}/${totalRepeats}`
                              : ''}{' '}
                            —{' '}
                            {(() => {
                              let verb = e.action;
                              if (verb === 'completed') verb = 'Marked complete';
                              if (verb === 'uncompleted') verb = 'Marked incomplete';
                              if (verb.includes('virtual')) verb = 'Marked complete';
                              return `${verb} by ${e.actor_name || 'Unknown'}`;
                            })()}
                          </Text>
                          <XStack alignItems="center" gap={6}>
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
                                  width: `${Math.round(progress * 100)}%`,
                                  height: '100%',
                                  backgroundColor: '#00E6C3',
                                }}
                              />
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
    <YStack flex={1} backgroundColor="$background" paddingHorizontal={0} paddingVertical={40}>
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
        {/* <XStack justifyContent="flex-end" marginBottom={8}>
          <TouchableOpacity
            onPress={() => {
              setHistoryModalVisible(true);
              loadAudit();
            }}
            style={{ backgroundColor: '#333', padding: 10, borderRadius: 16 }}
          >
            <Feather name="clock" size={18} color="#fff" />
          </TouchableOpacity>
        </XStack> */}
        {/* Filter and Show All Controls */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
          <TouchableOpacity
            // ref={filterButtonRef} // DISABLED
            onPress={() => setShowFilterDrawer(true)}
            style={{
              // backgroundColor: '#333',
              width: 48,
              height: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Feather name="filter" size={20} color={iconColor} />
            {/* Show active filter count badge */}
            {(() => {
              const activeFilters = Object.values(categoryFilters).filter(
                (value) => value !== 'all',
              ).length;
              return activeFilters > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text fontSize={12} fontWeight="bold" color="#000">
                    {activeFilters}
                  </Text>
                </View>
              ) : null;
            })()}
          </TouchableOpacity>

          {/* <TouchableOpacity
            onPress={() => setShowAllExercises(!showAllExercises)}
            style={{
              backgroundColor: showAllExercises ? '#4B6BFF' : '#333',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 12,
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
              {showAllExercises
                ? getTranslation(
                    'progress.allExercises',
                    language === 'sv' ? 'Alla övningar' : 'All Exercises',
                  )
                : getTranslation('progress.showAll', language === 'sv' ? 'Visa alla' : 'Show All')}
            </Text>
          </TouchableOpacity> */}
        </XStack>

        {/* Filter drawer modal */}
        <LearningPathsFilterModal
          visible={showFilterDrawer}
          onClose={() => setShowFilterDrawer(false)}
          categoryFilters={categoryFilters}
          categoryOptions={categoryOptions}
          onFilterSelect={handleFilterSelect}
          language={language}
          colorScheme={colorScheme}
          mode="drawer"
          t={(key: string, fallback?: string) => getTranslation(key, fallback || '')}
          onResetToDefaults={() => {
            // Reset all filters to correct profile-based defaults
            const defaultFilters: Record<CategoryType, string> = {
              vehicle_type: getProfilePreference('vehicle_type', 'Car'),
              transmission_type: getProfilePreference('transmission_type', 'Manual'),
              license_type: getProfilePreference('license_type', 'Standard Driving License'),
              experience_level: getProfilePreference('experience_level', 'Beginner'),
              purpose: getProfilePreference('purpose', 'Prepare for driving test'),
              user_profile: 'All',
              platform: 'both',
              type: 'learning',
            };
            setCategoryFilters(defaultFilters);
            saveFilterPreferences(defaultFilters);
          }}
          onSaveFilters={() => {
            saveFilterPreferences(categoryFilters);
          }}
        />

        {/* Filter selection modal */}
        <LearningPathsFilterModal
          visible={!!activeFilterType}
          onClose={() => setActiveFilterType(null)}
          categoryFilters={categoryFilters}
          categoryOptions={categoryOptions}
          onFilterSelect={handleFilterSelect}
          language={language}
          colorScheme={colorScheme}
          mode="single"
          activeFilterType={activeFilterType}
          categoryLabels={categoryLabels}
          t={(key: string, fallback?: string) => getTranslation(key, fallback || '')}
        />

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
                    key={`all-exercise-${exercise.source}-${exercise.id}-${index}`}
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
                          routeName: `${exercise.title[language] || exercise.title.en} (Individual Exercise)`,
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
                          {exercise.title[language] || exercise.title.en || 'No title'}
                        </Text>
                        <Text fontSize={12} color="$gray11" numberOfLines={2} marginTop={2}>
                          {exercise.description[language] ||
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
          <YStack // ref={pathCardRef} // DISABLED
          >
            {filteredPaths.length === 0 ? (
              <YStack padding={16} alignItems="center" justifyContent="center" gap={8}>
                <Feather name="info" size={32} color={colorScheme === 'dark' ? '#999' : '#666'} />
                <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">
                  {t('progressScreen.noLearningPaths') || 'No learning paths found'}
                </Text>
                <Text fontSize={16} color="$gray11" textAlign="center" marginBottom={8}>
                  {t('progressScreen.tryAdjustingFilters') ||
                    'Try adjusting your filter settings to see more learning paths.'}
                </Text>

                {/* Show active filters as chips */}
                {(() => {
                  const activeFilters = Object.entries(categoryFilters).filter(
                    ([key, value]) => value && value !== '' && value !== 'all' && value !== 'All',
                  );

                  if (activeFilters.length > 0) {
                    return (
                      <>
                        <Text fontSize={12} color="$gray10" marginBottom={8}>
                          {t('progressScreen.activeFilters') || 'Active filters:'}
                        </Text>
                        <XStack flexWrap="wrap" gap={8} justifyContent="center" marginBottom={16}>
                          {activeFilters.map(([key, value]) => {
                            const categoryOption = categoryOptions[key as CategoryType]?.find(
                              (opt) => opt.value === value,
                            );
                            const label =
                              categoryOption?.label?.[language] ||
                              categoryOption?.label?.en ||
                              value;

                            // Count exercises that match this specific filter
                            const exerciseCount = (() => {
                              // Get learning paths that match this specific filter
                              if (!paths || !allPathExercises) return 0;
                              const matchingPaths = paths.filter((path) => {
                                if (key === 'vehicle_type') {
                                  return (
                                    !path.vehicle_type ||
                                    path.vehicle_type?.toLowerCase() === value?.toLowerCase()
                                  );
                                } else if (key === 'transmission_type') {
                                  return (
                                    !path.transmission_type ||
                                    path.transmission_type?.toLowerCase() === value?.toLowerCase()
                                  );
                                } else if (key === 'license_type') {
                                  return (
                                    !path.license_type ||
                                    path.license_type?.toLowerCase() === value?.toLowerCase()
                                  );
                                } else if (key === 'experience_level') {
                                  return (
                                    !path.experience_level ||
                                    path.experience_level?.toLowerCase() === value?.toLowerCase()
                                  );
                                } else if (key === 'purpose') {
                                  return (
                                    !path.purpose ||
                                    path.purpose?.toLowerCase() === value?.toLowerCase()
                                  );
                                } else if (key === 'user_profile') {
                                  return (
                                    !path.user_profile ||
                                    path.user_profile?.toLowerCase() === value?.toLowerCase()
                                  );
                                } else if (key === 'platform') {
                                  return (
                                    !path.platform ||
                                    path.platform === 'both' ||
                                    path.platform?.toLowerCase() === value?.toLowerCase() ||
                                    path.platform === 'mobile'
                                  );
                                } else if (key === 'type') {
                                  return (
                                    !path.type || path.type?.toLowerCase() === value?.toLowerCase()
                                  );
                                }
                                return false;
                              });

                              // Count exercises from matching paths
                              const pathIds = matchingPaths.map((p) => p.id);
                              return allPathExercises.filter((ex) =>
                                pathIds.includes(ex.learning_path_id),
                              ).length;
                            })();

                            return (
                              <Chip
                                key={key}
                                label={`${label} ${exerciseCount > 0 ? `(${exerciseCount})` : ''}`}
                                size="sm"
                                variant="default"
                                active={true}
                                iconRight="x"
                                onPress={() => {
                                  // Clear this specific filter
                                  handleFilterSelect(key as CategoryType, '');
                                }}
                              />
                            );
                          })}
                        </XStack>

                        <Button
                          variant="primary"
                          size="sm"
                          onPress={() => {
                            // Reset all filters to 'all'
                            const resetFilters: Record<CategoryType, string> = {
                              vehicle_type: 'all',
                              transmission_type: 'all',
                              license_type: 'all',
                              experience_level: 'all',
                              purpose: 'all',
                              user_profile: 'all',
                              platform: 'all',
                              type: 'all',
                            };
                            setCategoryFilters(resetFilters);
                            saveFilterPreferences(resetFilters);
                          }}
                        >
                          {t('progressScreen.clearAllFilters') || 'Clear All Filters'}
                        </Button>

                        {/* Suggested Filter Chips */}
                        <Text
                          fontSize={12}
                          color="$gray10"
                          marginTop={16}
                          marginBottom={8}
                          textAlign="center"
                        >
                          {t('progressScreen.suggestedFilters') || 'Try these filters:'}
                        </Text>
                        <XStack flexWrap="wrap" gap={8} justifyContent="center">
                          {(() => {
                            // Get actual filter options from categoryOptions
                            const suggestions = [];

                            // Add top 2-3 options from each category that has data
                            ['vehicle_type', 'transmission_type', 'license_type'].forEach(
                              (filterType) => {
                                const options = categoryOptions[filterType as CategoryType] || [];
                                options.slice(0, 3).forEach((option) => {
                                  if (option.value && option.value !== 'all') {
                                    suggestions.push({
                                      type: filterType,
                                      value: option.value,
                                      label:
                                        option.label?.[language] ||
                                        option.label?.en ||
                                        option.value,
                                    });
                                  }
                                });
                              },
                            );

                            return suggestions
                              .map(({ type, value, label }) => {
                                // Count exercises that match this filter
                                const exerciseCount = (() => {
                                  if (!paths || !allPathExercises) return 0;
                                  const matchingPaths = paths.filter((path) => {
                                    if (type === 'vehicle_type') {
                                      return (
                                        !path.vehicle_type ||
                                        path.vehicle_type?.toLowerCase() === value?.toLowerCase()
                                      );
                                    } else if (type === 'transmission_type') {
                                      return (
                                        !path.transmission_type ||
                                        path.transmission_type?.toLowerCase() ===
                                          value?.toLowerCase()
                                      );
                                    } else if (type === 'license_type') {
                                      return (
                                        !path.license_type ||
                                        path.license_type?.toLowerCase() === value?.toLowerCase()
                                      );
                                    }
                                    return false;
                                  });
                                  const pathIds = matchingPaths.map((p) => p.id);
                                  return allPathExercises.filter((ex) =>
                                    pathIds.includes(ex.learning_path_id),
                                  ).length;
                                })();

                                if (exerciseCount === 0) return null;

                                return (
                                  <Chip
                                    key={`suggestion-${type}-${value}`}
                                    label={`${label} (${exerciseCount})`}
                                    size="sm"
                                    variant="outline"
                                    onPress={() => {
                                      handleFilterSelect(type as CategoryType, value);
                                    }}
                                  />
                                );
                              })
                              .filter(Boolean);
                          })()}
                        </XStack>
                      </>
                    );
                  }

                  return null;
                })()}
              </YStack>
            ) : (
              filteredPaths.map((path, idx) => {
                const isActive = activePath === path.id;
                const percent = getPathProgress(path.id);
                const isFirstPath = idx === 0;

                // More permissive access - only block if password-locked
                const isPasswordLocked = isPathPasswordLocked(path);
                const hasPassword = pathHasPassword(path);
                const isPaywallEnabled = path.paywall_enabled || false; // 🔒 Check if paywall is enabled
                const isEnabled = !isPasswordLocked; // Much more permissive

                // Alternate card alignment: 1=center, 2=right, 3=left, repeat
                const alignment =
                  idx % 3 === 0 ? 'center' : idx % 3 === 1 ? 'flex-end' : 'flex-start';

                // Create modified path for LearningPathCard compatibility
                const pathForCard = {
                  ...path,
                  is_locked: isPasswordLocked,
                  paywall_enabled: isPaywallEnabled,
                  icon: path.icon || undefined,
                  image: path.image || undefined,
                };

                return (
                  <View
                    key={`filtered-path-${path.id}-${idx}`}
                    style={{
                      opacity: isEnabled ? 1 : 0.5,
                    }}
                  >
                    <LearningPathCard
                      path={pathForCard}
                      progress={percent}
                      language={language}
                      index={idx}
                      alignment={alignment}
                      onPress={() => handlePathPress(path, idx)}
                    />
                  </View>
                );
              })
            )}
          </YStack>
        )}
      </ScrollView>

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

      {/* 🔒 Paywall Modal for Learning Paths */}
      <RNModal
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
                    <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
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
                        {paywallPath.title[language] || paywallPath.title.en}
                      </Text>
                      <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                        {paywallPath.description[language] || paywallPath.description.en}
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
                      <TamaguiButton
                        backgroundColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                        onPress={() => setShowPaywallModal(false)}
                        borderRadius={12}
                        flex={1}
                        paddingVertical={16}
                      >
                        <Text color={colorScheme === 'dark' ? '#FFF' : '#000'}>
                          {t('common.cancel') || 'Maybe Later'}
                        </Text>
                      </TamaguiButton>
                      <TamaguiButton
                        backgroundColor="#00E6C3"
                        onPress={async () => {
                          console.log(
                            '💳 [ProgressScreen] ==================== STRIPE PAYMENT FLOW ====================',
                          );
                          console.log(
                            '💳 [ProgressScreen] Payment button pressed for path:',
                            paywallPath.title.en,
                          );
                          console.log(
                            '💳 [ProgressScreen] Payment amount:',
                            paywallPath.price_usd || 1.0,
                          );
                          console.log('💳 [ProgressScreen] User ID:', effectiveUserId);
                          console.log(
                            '💳 [ProgressScreen] ================================================================',
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

                              console.log('💳 [ProgressScreen] Calling fixed Edge Function...');

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
                                      path_title:
                                        paywallPath.title[language] || paywallPath.title.en,
                                      user_id: effectiveUserId,
                                    },
                                  },
                                  headers: {
                                    Authorization: `Bearer ${session.access_token}`,
                                  },
                                },
                              );

                              if (error) {
                                console.error('💳 [ProgressScreen] Edge function error:', error);

                                // Extract the real error message from the Edge Function response
                                let realErrorMessage = 'Failed to create payment intent';

                                if (error instanceof FunctionsHttpError) {
                                  try {
                                    const errorDetails = await error.context.json();
                                    console.error(
                                      '💳 [ProgressScreen] Edge function error details:',
                                      errorDetails,
                                    );
                                    realErrorMessage =
                                      errorDetails.error ||
                                      errorDetails.message ||
                                      realErrorMessage;
                                  } catch (contextError) {
                                    console.error(
                                      '💳 [ProgressScreen] Failed to parse error context:',
                                      contextError,
                                    );
                                    try {
                                      const errorText = await error.context.text();
                                      console.error(
                                        '💳 [ProgressScreen] Edge function error text:',
                                        errorText,
                                      );
                                      realErrorMessage = errorText || realErrorMessage;
                                    } catch (textError) {
                                      console.error(
                                        '💳 [ProgressScreen] Failed to get error text:',
                                        textError,
                                      );
                                    }
                                  }
                                }

                                throw new Error(realErrorMessage);
                              }

                              if (data?.error) {
                                console.error(
                                  '💳 [ProgressScreen] Edge function returned error:',
                                  data.error,
                                );

                                // FALLBACK: Create a properly formatted test payment intent
                                console.log(
                                  '💳 [ProgressScreen] Creating fallback payment intent...',
                                );
                                return {
                                  paymentIntent:
                                    'pi_test_1234567890_secret_abcdefghijklmnopqrstuvwxyz',
                                  ephemeralKey: 'ek_test_1234567890abcdefghijklmnopqrstuvwxyz',
                                  customer: 'cus_test_1234567890',
                                  publishableKey: 'pk_live_Xr9mSHZSsJqaYS3q82xBNVtJ',
                                };
                              }

                              console.log('✅ [ProgressScreen] Real payment intent created:', data);

                              // Validate the response format - check for the correct field names
                              if (
                                !data?.paymentIntentClientSecret ||
                                !data?.customerId ||
                                !data?.customerEphemeralKeySecret
                              ) {
                                console.error(
                                  '💳 [ProgressScreen] Invalid response format - missing required fields:',
                                  {
                                    hasPaymentIntentClientSecret: !!data?.paymentIntentClientSecret,
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
                              '💳 [ProgressScreen] Payment intent created:',
                              paymentData.paymentIntentClientSecret,
                            );

                            // Initialize PaymentSheet with proper structure
                            console.log(
                              '💳 [ProgressScreen] Initializing PaymentSheet with data:',
                              {
                                hasPaymentIntent: !!paymentData?.paymentIntentClientSecret,
                                hasCustomer: !!paymentData?.customerId,
                                hasEphemeralKey: !!paymentData?.customerEphemeralKeySecret,
                                paymentIntentFormat:
                                  paymentData?.paymentIntentClientSecret?.substring(0, 30) + '...',
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
                                name:
                                  profile?.full_name || authUser?.email?.split('@')[0] || 'User',
                                email: authUser?.email || '',
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
                                '💳 [ProgressScreen] PaymentSheet init error:',
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
                                t('stripe.connecting') || 'Connecting to Stripe payment gateway...',
                              message: t('stripe.pleaseWait') || 'Please wait...',
                              type: 'info',
                            });

                            // Small delay for UX
                            await new Promise((resolve) => setTimeout(resolve, 1000));

                            // Present PaymentSheet
                            console.log('💳 [ProgressScreen] Presenting Stripe PaymentSheet...');
                            const { error: paymentError } = await presentPaymentSheet();

                            if (paymentError) {
                              console.log(
                                '💳 [ProgressScreen] Payment was cancelled or failed:',
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
                                description: `Unlock "${paywallPath.title[language] || paywallPath.title.en}" learning path`,
                                metadata: {
                                  feature_key: `learning_path_${paywallPath.id}`,
                                  path_id: paywallPath.id,
                                  path_title: paywallPath.title[language] || paywallPath.title.en,
                                  unlock_type: 'one_time',
                                  customer_id: paymentData.customer,
                                },
                                processed_at: new Date().toISOString(),
                              })
                              .select()
                              .single();

                            if (!error) {
                              console.log(
                                '✅ [ProgressScreen] Payment record created:',
                                paymentRecord.id,
                              );
                              showToast({
                                title: t('stripe.paymentSuccessful') || 'Payment Successful!',
                                message:
                                  t('progressScreen.paywall.unlocked') || 'Learning path unlocked!',
                                type: 'success',
                              });

                              // Refresh the screen to show unlocked content
                              await handleRefresh();
                            } else {
                              console.error(
                                '❌ [ProgressScreen] Error saving payment record:',
                                error,
                              );
                            }
                          } catch (error) {
                            console.error('💳 [ProgressScreen] Payment flow error:', error);
                            showToast({
                              title: t('errors.title') || 'Error',
                              message: t('progressScreen.paywall.paymentError') || 'Payment failed',
                              type: 'error',
                            });
                          }
                        }}
                        borderRadius={12}
                        flex={1}
                        paddingVertical={16}
                      >
                        <XStack alignItems="center" gap={6}>
                          <Feather name="credit-card" size={16} color="black" />
                          <Text color="black" fontWeight="bold">
                            {t('progressScreen.paywall.unlock') ||
                              `Unlock for $${paywallPath.price_usd || 1.0}`}
                          </Text>
                        </XStack>
                      </TamaguiButton>
                    </XStack>
                  </>
                )}
              </YStack>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      {/* 🔒 Password Modal for Learning Paths (COPY from ProgressSection.tsx) */}
      <RNModal
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
                      {passwordPath.title[language] || passwordPath.title.en}
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

                          // Store unlock in database
                          try {
                            await supabase.from('user_unlocked_content').insert({
                              user_id: effectiveUserId,
                              content_id: passwordPath.id,
                              content_type: 'learning_path',
                            });
                          } catch (error) {
                            console.log('Error storing unlock:', error);
                          }

                          showToast({
                            title: 'Unlocked!',
                            message: 'Learning path has been unlocked',
                            type: 'success',
                          });

                          // Now show the path content
                          setActivePath(passwordPath.id);
                          setDetailPath(passwordPath);
                          setShowDetailView(true);
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
      </RNModal>

      {/* 🔒 Exercise Password Modal */}
      <RNModal
        visible={showExercisePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExercisePasswordModal(false)}
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
          onPress={() => setShowExercisePasswordModal(false)}
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
                    Locked Exercise
                  </Text>
                </XStack>
                <TouchableOpacity onPress={() => setShowExercisePasswordModal(false)}>
                  <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
                </TouchableOpacity>
              </XStack>

              {passwordExercise && (
                <>
                  <YStack gap={12}>
                    <Text
                      fontSize={24}
                      fontWeight="bold"
                      color={colorScheme === 'dark' ? '#FFF' : '#000'}
                    >
                      {passwordExercise.title[language] || passwordExercise.title.en}
                    </Text>
                    <Text fontSize={16} color={colorScheme === 'dark' ? '#CCC' : '#666'}>
                      This exercise is locked and requires a password to access.
                    </Text>
                  </YStack>

                  {passwordExercise.lock_password && (
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
                          value={exercisePasswordInput}
                          onChangeText={setExercisePasswordInput}
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
                      onPress={() => setShowExercisePasswordModal(false)}
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
                        if (!passwordExercise?.lock_password) return;

                        if (exercisePasswordInput === passwordExercise.lock_password) {
                          // Use shared context to unlock
                          addUnlockedExercise(passwordExercise.id);
                          setExercisePasswordInput('');
                          setShowExercisePasswordModal(false);

                          // Store unlock in database
                          try {
                            await supabase.from('user_unlocked_content').insert({
                              user_id: effectiveUserId,
                              content_id: passwordExercise.id,
                              content_type: 'exercise',
                            });
                          } catch (error) {
                            console.log('Error storing exercise unlock:', error);
                          }

                          showToast({
                            title: 'Unlocked!',
                            message: 'Exercise has been unlocked',
                            type: 'success',
                          });

                          // Now show the exercise
                          setSelectedExercise(passwordExercise);
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
      </RNModal>
    </YStack>
  );
}
