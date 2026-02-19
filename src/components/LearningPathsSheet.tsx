import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useUnlock } from '../contexts/UnlockContext';
import { supabase } from '../lib/supabase';
import { useThemePreference } from '../hooks/useThemeOverride';
import { LearningPathCard } from './LearningPathCard';
import { useHeaderWithScroll } from './Header';
import { LearningPathsFilterModal, CategoryType, CategoryOption } from './LearningPathsFilterModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from './Button';
import { Chip } from './Chip';

const { height } = Dimensions.get('window');

// Category types and options are now imported from LearningPathsFilterModal

// Learning path interface with filter properties
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  youtube_url?: string;
  order_index: number;
  active: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at: string;
  updated_at: string;
  
  // Filter properties
  vehicle_type?: string;
  transmission_type?: string;
  license_type?: string;
  experience_level?: string;
  purpose?: string;
  user_profile?: string;
  platform?: string;
  type?: string;
}

interface LearningPathsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPathSelected: (path: LearningPath) => void;
  title?: string;
  initialSnapPoint?: 'large' | 'medium' | 'small' | 'mini';
  onBack?: () => void;
}

export function LearningPathsSheet({
  visible,
  onClose,
  onPathSelected,
  title = 'Learning Paths',
  initialSnapPoint = 'large',
  onBack,
}: LearningPathsSheetProps) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { language: lang, t } = useTranslation();
  const { isPathUnlocked, hasPathPayment, loadUserPayments, loadUnlockedContent } = useUnlock();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';

  // Enhanced header for learning paths
  const { HeaderComponent, onScroll: headerOnScroll } = useHeaderWithScroll();

  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#151515' : '#FFFFFF';

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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

  const getInitialSnapPoint = () => snapPoints[initialSnapPoint] || snapPoints.large;
  const [currentSnapPoint, setCurrentSnapPoint] = useState(getInitialSnapPoint());
  const currentState = useSharedValue(getInitialSnapPoint());

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
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
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

  const animatedGestureStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { top: translateY.value };
    }
    return { transform: [{ translateY: translateY.value }] };
  });

  // State
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Filter and display state - start with "all" to show everything until database loads
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<Record<CategoryType, string>>({
    vehicle_type: 'all',
    transmission_type: 'all',
    license_type: 'all',
    experience_level: 'all',
    purpose: 'all',
    user_profile: 'all',
    platform: 'all',
    type: 'all',
  });
  const [categoryOptions, setCategoryOptions] = useState<Record<CategoryType, CategoryOption[]>>({
    vehicle_type: [],
    transmission_type: [],
    license_type: [],
    experience_level: [],
    purpose: [],
    user_profile: [],
    platform: [],
    type: [],
  });

  // Get effective user ID
  const effectiveUserId = activeStudentId || user?.id;

  // Load learning paths
  const loadLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [LearningPathsSheet] Loading learning paths from database...');

      const { data: pathsData, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ [LearningPathsSheet] Error loading learning paths:', error);
        return;
      }

      console.log('✅ [LearningPathsSheet] Loaded learning paths:', pathsData?.length || 0);
      setPaths(pathsData || []);

      // Load exercises mapping for progress calculation (optimized single query)
      const exerciseMap: { [pathId: string]: string[] } = {};
      if (pathsData && pathsData.length > 0) {
        const pathIds = pathsData.map(p => p.id);
        const { data: exerciseData } = await supabase
          .from('learning_path_exercises')
          .select('id, learning_path_id')
          .in('learning_path_id', pathIds);
        
        // Group exercises by path
        if (exerciseData) {
          exerciseData.forEach((exercise: { id: string; learning_path_id: string }) => {
            if (!exerciseMap[exercise.learning_path_id]) {
              exerciseMap[exercise.learning_path_id] = [];
            }
            exerciseMap[exercise.learning_path_id].push(exercise.id);
          });
        }
        
        // Ensure all paths have at least empty arrays
        pathsData.forEach(path => {
          if (!exerciseMap[path.id]) {
            exerciseMap[path.id] = [];
          }
        });
      }
      setExercisesByPath(exerciseMap);
    } catch (error) {
      console.error('Error loading learning paths:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load completed exercises
  const fetchCompletions = useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      const { data: regularData, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      if (!error) {
        const completions = regularData?.map((c: { exercise_id: string }) => c.exercise_id) || [];
        setCompletedIds(completions);
      }
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  }, [effectiveUserId]);

  // Calculate path progress
  const getPathProgress = (pathId: string): number => {
    const ids = exercisesByPath[pathId] || [];
    if (ids.length === 0) return 0;
    const completed = ids.filter((id) => completedIds.includes(id)).length;
    return completed / ids.length;
  };

  // Check if path is locked
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  // Save filter preferences to AsyncStorage - USER-SPECIFIC (matching ProgressScreen)
  const saveFilterPreferences = useCallback(async (filters: Record<CategoryType, string>) => {
    try {
      // Make filter storage user-specific for supervisors viewing different students
      const filterKey = `vromm_progress_filters_${effectiveUserId || 'default'}`;
      await AsyncStorage.setItem(filterKey, JSON.stringify(filters));
      console.log('✅ [LearningPathsSheet] Saved filter preferences for user:', effectiveUserId, filters);
    } catch (error) {
      console.error('Error saving filter preferences:', error);
    }
  }, [effectiveUserId]);

  // Load filter preferences from AsyncStorage - USER-SPECIFIC (matching ProgressScreen)
  const loadFilterPreferences = useCallback(async (): Promise<Record<CategoryType, string> | null> => {
    try {
      // Make filter loading user-specific for supervisors viewing different students
      const filterKey = `vromm_progress_filters_${effectiveUserId || 'default'}`;
      const saved = await AsyncStorage.getItem(filterKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ [LearningPathsSheet] Loaded saved filter preferences for user:', effectiveUserId, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    }
    return null;
  }, [effectiveUserId]);

  // Load categories from database - using same table and logic as ProgressScreen
  const fetchCategories = useCallback(async () => {
    try {
      console.log('🔍 [LearningPathsSheet] Fetching categories from database...');

      const { data, error } = await supabase
        .from('learning_path_categories')
        .select('category, value, label, is_default, created_at, order_index')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ [LearningPathsSheet] Error fetching categories:', error);
        // Use fallback defaults if database fails
        setDefaultFilters();
        return;
      }

      console.log('✅ [LearningPathsSheet] Successfully fetched categories:', data?.length || 0);

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
          console.log(`🔄 [LearningPathsSheet] Skipping duplicate: ${uniqueKey}`);
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
          console.log(`➕ [LearningPathsSheet] Adding missing 'all' option for: ${key}`);
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

      // Try to load saved filter preferences first (matching ProgressScreen behavior)
      const savedFilters = await loadFilterPreferences();

      if (savedFilters) {
        // Use saved preferences
        setCategoryFilters(savedFilters);
        console.log('✅ [LearningPathsSheet] Using saved filter preferences for user:', effectiveUserId, savedFilters);
      } else {
        // Set defaults based on most recent is_default=true values from database (like ProgressScreen)
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
          transmission_type: getProfilePreference('transmission_type', defaultTransmission?.value || 'all'),
          license_type: getProfilePreference('license_type', defaultLicense?.value || 'all'),
          experience_level: getProfilePreference('experience_level', defaultExperience?.value || 'all'),
          purpose: getProfilePreference('purpose', defaultPurpose?.value || 'all'),
          user_profile: getProfilePreference('user_profile', defaultUserProfile?.value || 'all'),
          platform: defaultPlatform?.value || 'all',
          type: defaultType?.value || 'all',
        };

        setCategoryFilters(defaultFilters);
        console.log('✅ [LearningPathsSheet] Set default category filters from database defaults:', defaultFilters);

        // Save defaults for next time
        saveFilterPreferences(defaultFilters);
      }
    } catch (err) {
      console.error('💥 [LearningPathsSheet] Exception fetching categories:', err);
      setDefaultFilters();
    }
  }, []);

  // Helper function to set fallback defaults
  const setDefaultFilters = () => {
    console.log('⚠️ [LearningPathsSheet] Using fallback category filters');
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

  // Handle filter selection and save to preferences
  const handleFilterSelect = useCallback((filterType: CategoryType, value: string) => {
    const newFilters = {
      ...categoryFilters,
      [filterType]: value,
    };
    setCategoryFilters(newFilters);
    
    // Save to preferences immediately for persistence across sessions
    saveFilterPreferences(newFilters);
    
    console.log(`🎛️ [LearningPathsSheet] Filter selected: ${filterType} = ${value}`);
  }, [categoryFilters, saveFilterPreferences]);

  // Helper function to get user profile preferences (matching ProgressScreen)
  const getProfilePreference = useCallback((key: string, defaultValue: string): string => {
    // Check if we're viewing a student (either from navigation params or StudentSwitchContext)
    const isViewingStudent = (activeStudentId && activeStudentId !== user?.id);
    const activeProfile = isViewingStudent ? null : profile; // For now, use current user's profile
    if (!activeProfile) return defaultValue;

    try {
      // Check if profile has license_plan_data from onboarding
      const licenseData = (activeProfile as any)?.license_plan_data;
      if (licenseData && typeof licenseData === 'object') {
        const value = licenseData[key];
        console.log(
          `🔍 [LearningPathsSheet] Reading profile preference ${key}:`,
          value,
          'from user:',
          effectiveUserId,
          'isStudent:',
          isViewingStudent,
        );
        return value || defaultValue;
      }

      // Fallback to direct profile properties
      const value = (activeProfile as any)[key];
      console.log(
        `🔍 [LearningPathsSheet] Reading profile preference ${key}:`,
        value,
        'from direct profile for user:',
        effectiveUserId,
      );
      return value || defaultValue;
    } catch (error) {
      console.log('Error getting profile preference:', error);
      return defaultValue;
    }
  }, [profile, activeStudentId, user?.id, effectiveUserId]);

  // Load categories and sync with ProgressScreen filters when modal opens
  useEffect(() => {
    if (visible) {
      // Always reload filter preferences when sheet opens to sync with ProgressScreen
      const loadAndSyncFilters = async () => {
        await fetchCategories();
        // Force reload of saved filters to ensure sync
        const savedFilters = await loadFilterPreferences();
        if (savedFilters) {
          setCategoryFilters(savedFilters);
          console.log('🔄 [LearningPathsSheet] Reloaded filters on open:', savedFilters);
        }
      };
      loadAndSyncFilters();
    }
  }, [visible, fetchCategories, loadFilterPreferences]);

  // Load data when modal opens
  useEffect(() => {
    if (visible && effectiveUserId) {
      loadLearningPaths();
      fetchCompletions();
      loadUserPayments(effectiveUserId);
      loadUnlockedContent(effectiveUserId);
    }
  }, [
    visible,
    effectiveUserId,
    loadLearningPaths,
    fetchCompletions,
    loadUserPayments,
    loadUnlockedContent,
  ]);

  // Animation effects - updated for gesture system
  useEffect(() => {
    if (visible) {
      // Reset gesture translateY when opening and set to initial snap point
      const targetPoint = getInitialSnapPoint();
      translateY.value = withSpring(targetPoint, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = targetPoint;
      setCurrentSnapPoint(targetPoint);

      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, initialSnapPoint, currentState]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadLearningPaths(), fetchCompletions()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Apply filters to paths - enhanced logic matching ProgressScreen
  const filteredPaths = useMemo(() => {
    if (!paths || paths.length === 0) {
      console.log('🔍 [LearningPathsSheet] No paths to filter, paths:', paths?.length || 0);
      return [];
    }

    console.log(
      `🔍 [LearningPathsSheet] Filtering ${paths.length} paths with filters:`,
      categoryFilters,
    );

    const filtered = paths.filter((path: LearningPath) => {
      // Match ProgressScreen's exact filter logic (empty string means show all)
      const matchesVehicleType =
        categoryFilters.vehicle_type === '' ||
        categoryFilters.vehicle_type === 'all' ||
        !path.vehicle_type ||
        path.vehicle_type === categoryFilters.vehicle_type;
        
      const matchesTransmission =
        categoryFilters.transmission_type === '' ||
        categoryFilters.transmission_type === 'all' ||
        !path.transmission_type ||
        path.transmission_type === categoryFilters.transmission_type;
        
      const matchesLicense =
        categoryFilters.license_type === '' ||
        categoryFilters.license_type === 'all' ||
        !path.license_type ||
        path.license_type === categoryFilters.license_type;
        
      const matchesExperience =
        categoryFilters.experience_level === '' ||
        categoryFilters.experience_level === 'all' ||
        !path.experience_level ||
        path.experience_level === categoryFilters.experience_level;
        
      const matchesPurpose =
        categoryFilters.purpose === '' ||
        categoryFilters.purpose === 'all' ||
        !path.purpose ||
        path.purpose === categoryFilters.purpose;
        
      const matchesUserProfile =
        categoryFilters.user_profile === '' ||
        categoryFilters.user_profile === 'all' ||
        categoryFilters.user_profile === 'All' ||
        !path.user_profile ||
        path.user_profile === categoryFilters.user_profile ||
        // "All" user profile matches any filter
        path.user_profile === 'All';
        
      const matchesPlatform =
        categoryFilters.platform === '' ||
        categoryFilters.platform === 'all' ||
        categoryFilters.platform === 'both' ||
        !path.platform ||
        path.platform === 'both' || // "both" platform matches any filter
        path.platform === categoryFilters.platform;
        
      const matchesType =
        categoryFilters.type === '' ||
        categoryFilters.type === 'all' ||
        !path.type ||
        path.type === categoryFilters.type;

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
      if (!matches && categoryFilters.license_type !== 'all' && categoryFilters.license_type !== '') {
        console.log(`❌ [LearningPathsSheet] Path "${path.title?.[lang] || path.title?.en || path.id}" filtered out:`, {
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

    console.log(`✅ [LearningPathsSheet] Filtered from ${paths.length} to ${filtered.length} paths`);
    
    // Safety mechanism: if no paths match and we have active filters, show a warning
    if (filtered.length === 0 && paths.length > 0) {
      const activeFilterCount = Object.values(categoryFilters).filter(
        (value) => value !== '' && value !== 'all' && value !== 'All' && value !== 'both',
      ).length;
      
      if (activeFilterCount > 0) {
        console.warn('⚠️ [LearningPathsSheet] No paths match current filters! Consider resetting filters.');
        console.warn('Current filters:', categoryFilters);
        // You could auto-reset here if desired: setCategoryFilters(all 'all' values)
      }
    }
    
    return filtered;
  }, [paths, categoryFilters, lang]);

  // Display paths: use filtered paths
  const displayPaths = filteredPaths;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
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
                {/* Drag Handle - only this area captures pan gesture for sheet resize */}
                <GestureDetector gesture={panGesture}>
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 4,
                      paddingBottom: 8,
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
                </GestureDetector>

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
                    {/* Enhanced Header Overlay */}
                    <HeaderComponent
                      title=""
                      variant="smart"
                      showBack={!!onBack}
                      onBackPress={onBack}
                      enableBlur={true}
                      rightElement={
                        <TouchableOpacity
                          onPress={() => {
                            console.log('🎯 [LearningPathsSheet] Filter button pressed');
                            setShowFilterDrawer(true);
                          }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                          }}
                        >
                          <Feather
                            name="filter"
                            size={20}
                            color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                          />
                          {/* Show active filter count badge */}
                          {(() => {
                            const activeFilters = Object.values(categoryFilters).filter(
                              (value) => value !== '' && value !== 'all' && value !== 'All' && value !== 'both',
                            ).length;
                            console.log('🔍 [LearningPathsSheet] Active filters count:', activeFilters, 'Filters:', categoryFilters);
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
                      }
                    />

                    {/* Learning Paths List */}
                    <YStack flex={1}>
                      {loading ? (
                        <YStack alignItems="center" justifyContent="center" flex={1} gap="$3">
                          <Spinner size="large" color="$primary" />
                          <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
                        </YStack>
                      ) : displayPaths.length === 0 ? (
                        <YStack alignItems="center" justifyContent="center" flex={1} gap="$4" paddingHorizontal="$4">
                          <Feather name="book-open" size={48} color="#666" />
                          <Text color="$gray11" textAlign="center" fontSize={16}>
                            {t('progressScreen.noLearningPaths') || 'No learning paths available'}
                          </Text>
                          <Text fontSize={14} color="$gray10" textAlign="center">
                            {t('progressScreen.tryAdjustingFilters') || 'Try adjusting your filter settings to see more learning paths.'}
                          </Text>
                          
                          {/* Show active filters as chips if any */}
                          {(() => {
                            const activeFilters = Object.entries(categoryFilters).filter(
                              ([key, value]) => value && value !== '' && value !== 'all' && value !== 'All'
                            );
                            
                            if (activeFilters.length > 0) {
                              return (
                                <>
                                  <Text fontSize={12} color="$gray10" marginTop={8} marginBottom={8}>
                                    {t('progressScreen.activeFilters') || 'Active filters:'}
                                  </Text>
                                  <XStack flexWrap="wrap" gap={8} justifyContent="center" marginBottom={16}>
                                    {activeFilters.map(([key, value]) => {
                                      const categoryOption = categoryOptions[key as CategoryType]?.find(
                                        opt => opt.value === value
                                      );
                                      const label = categoryOption?.label?.[lang] || 
                                                   categoryOption?.label?.en || 
                                                   value;
                                      
                                      return (
                                        <Chip
                                          key={key}
                                          label={label}
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
                                      // Reset all filters to ''
                                      const resetFilters: Record<CategoryType, string> = {
                                        vehicle_type: '',
                                        transmission_type: '',
                                        license_type: '',
                                        experience_level: '',
                                        purpose: '',
                                        user_profile: '',
                                        platform: '',
                                        type: '',
                                      };
                                      setCategoryFilters(resetFilters);
                                      saveFilterPreferences(resetFilters);
                                    }}
                                  >
                                    {t('progressScreen.clearAllFilters') || 'Clear All Filters'}
                                  </Button>
                                </>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Suggested Filter Chips */}
                          <Text fontSize={12} color="$gray10" marginTop={8} marginBottom={8} textAlign="center">
                            {t('progressScreen.suggestedFilters') || 'Try these filters:'}
                          </Text>
                          <XStack flexWrap="wrap" gap={8} justifyContent="center">
                            {(() => {
                              // Get actual filter options from categoryOptions
                              const suggestions = [];
                              
                              // Add top 2-3 options from each category that has data
                              ['vehicle_type', 'transmission_type', 'license_type'].forEach((filterType) => {
                                const options = categoryOptions[filterType as CategoryType] || [];
                                options.slice(0, 3).forEach((option) => {
                                  if (option.value && option.value !== 'all') {
                                    suggestions.push({
                                      type: filterType,
                                      value: option.value,
                                      label: option.label?.[lang] || option.label?.en || option.value,
                                    });
                                  }
                                });
                              });
                              
                              return suggestions.map(({ type, value, label }) => {
                                // Count learning paths that match this filter
                                const pathCount = paths.filter(path => {
                                  if (type === 'vehicle_type') {
                                    return !path.vehicle_type || path.vehicle_type?.toLowerCase() === value?.toLowerCase();
                                  } else if (type === 'transmission_type') {
                                    return !path.transmission_type || path.transmission_type?.toLowerCase() === value?.toLowerCase();
                                  } else if (type === 'license_type') {
                                    return !path.license_type || path.license_type?.toLowerCase() === value?.toLowerCase();
                                  }
                                  return false;
                                }).length;
                                
                                if (pathCount === 0) return null;
                                
                                return (
                                  <Chip
                                    key={`suggestion-${type}-${value}`}
                                    label={`${label} (${pathCount})`}
                                    size="sm"
                                    variant="outline"
                                    onPress={() => {
                                      handleFilterSelect(type as CategoryType, value);
                                    }}
                                  />
                                );
                              }).filter(Boolean);
                            })()}
                          </XStack>
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
                          onScroll={headerOnScroll}
                          scrollEventThrottle={16}
                        >
                          <YStack gap="$3">
                            {displayPaths.map((path, index) => {
                              const progress = getPathProgress(path.id);

                              // Alternate card alignment: 1=center, 2=right, 3=left, repeat
                              const alignment =
                                index % 3 === 0
                                  ? 'center'
                                  : index % 3 === 1
                                    ? 'flex-end'
                                    : 'flex-start';

                              return (
                                <LearningPathCard
                                  key={`learning-path-${path.id}-${index}`}
                                  path={path}
                                  progress={progress}
                                  language={lang}
                                  index={index}
                                  alignment={alignment}
                                  onPress={() => {
                                    console.log(
                                      '🎯 [LearningPathsSheet] Path selected:',
                                      path.title[lang] || path.title.en,
                                    );
                                    onPathSelected(path);
                                  }}
                                />
                              );
                            })}
                          </YStack>
                        </ScrollView>
                      )}
                    </YStack>
                  </View>
                )}
              </YStack>
            </ReanimatedAnimated.View>
        </View>
      </Animated.View>

      {/* Filter Modal */}
      <LearningPathsFilterModal
        visible={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        categoryFilters={categoryFilters}
        categoryOptions={categoryOptions}
        onFilterSelect={handleFilterSelect}
        language={lang}
        colorScheme={colorScheme}
        mode="drawer"
        t={(key: string, fallback?: string) => {
          const translated = t(key);
          return (translated && translated !== key) ? translated : (fallback || key);
        }}
        onSaveFilters={() => {
          // Filters are already saved in handleFilterSelect, just close modal
          setShowFilterDrawer(false);
        }}
        onResetToDefaults={async () => {
          // Reset all filters to correct profile-based defaults (matching ProgressScreen)
          const defaultFilters: Record<CategoryType, string> = {
            vehicle_type: getProfilePreference('vehicle_type', 'all'),
            transmission_type: getProfilePreference('transmission_type', 'all'),
            license_type: getProfilePreference('license_type', 'all'),
            experience_level: getProfilePreference('experience_level', 'all'),
            purpose: getProfilePreference('purpose', 'all'),
            user_profile: getProfilePreference('user_profile', 'all'),
            platform: 'all',
            type: 'all',
          };
          
          setCategoryFilters(defaultFilters);
          await saveFilterPreferences(defaultFilters);
          
          console.log('🔄 [LearningPathsSheet] Reset filters to profile-based defaults:', defaultFilters);
        }}
      />
      </GestureHandlerRootView>
    </Modal>
  );
}
