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
  ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useUnlock } from '../contexts/UnlockContext';
import { supabase } from '../lib/supabase';
import { useThemePreference } from '../hooks/useThemeOverride';
import { LearningPathCard } from './LearningPathCard';
import { Header, useHeaderWithScroll } from './Header';

const { height } = Dimensions.get('window');

// Category types for filtering
type CategoryType =
  | 'vehicle_type'
  | 'transmission_type'
  | 'license_type'
  | 'experience_level'
  | 'purpose'
  | 'user_profile'
  | 'platform'
  | 'type';

interface CategoryOption {
  id: string;
  category: CategoryType;
  value: string;
  label: { en: string; sv: string };
  order_index: number;
  is_default: boolean;
}

// Learning path interface (exact copy from ProgressScreen)
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
  const { user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { language: lang, t } = useTranslation();
  const { isPathUnlocked, hasPathPayment, loadUserPayments, loadUnlockedContent } = useUnlock();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';

  // Enhanced header for learning paths
  const { HeaderComponent, onScroll: headerOnScroll } = useHeaderWithScroll();

  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

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

  // State
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Filter and display state - matching ProgressScreen defaults
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<Record<CategoryType, string>>({
    vehicle_type: '',
    transmission_type: '',
    license_type: '',
    experience_level: '',
    purpose: '',
    user_profile: '',
    platform: '',
    type: '',
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

      const { data: pathsData, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading learning paths:', error);
        return;
      }

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

  // Load categories from database
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('learning_path_category_options')
        .select('*')
        .order('category', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) {
        // Table doesn't exist or other error - fail gracefully
        console.log('📚 [LearningPathsSheet] Category options table not available:', error.code);
        // Set empty options so filter drawer doesn't show any categories
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
        return;
      }

      if (data) {
        const grouped: Record<CategoryType, CategoryOption[]> = {
          vehicle_type: [],
          transmission_type: [],
          license_type: [],
          experience_level: [],
          purpose: [],
          user_profile: [],
          platform: [],
          type: [],
        };

        data.forEach((option: CategoryOption) => {
          if (grouped[option.category as CategoryType]) {
            grouped[option.category as CategoryType].push(option);
          }
        });

        setCategoryOptions(grouped);
      }
    } catch (error) {
      console.log(
        '📚 [LearningPathsSheet] Error fetching categories (table may not exist):',
        error,
      );
      // Set empty options as fallback
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
    }
  }, []);

  // Handle filter selection
  const handleFilterSelect = useCallback((filterType: CategoryType, value: string) => {
    setCategoryFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  // Load categories when modal opens
  useEffect(() => {
    if (visible) {
      fetchCategories();
    }
  }, [visible, fetchCategories]);

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
    if (!paths || paths.length === 0) return [];

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
    return filtered;
  }, [paths, categoryFilters, lang]);

  // Display paths: use filtered paths
  const displayPaths = filteredPaths;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
                        <YStack alignItems="center" justifyContent="center" flex={1} gap="$2">
                          <Feather name="book-open" size={48} color="#666" />
                          <Text color="$gray11" textAlign="center">
                            {t('progressScreen.noLearningPaths') || 'No learning paths available'}
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
          </GestureDetector>
        </View>
      </Animated.View>

      {/* Filter Drawer Modal */}
      <Modal
        visible={showFilterDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterDrawer(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowFilterDrawer(false)} />
          <YStack
            backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={20}
            paddingBottom={insets.bottom + 20}
            maxHeight="80%"
          >
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
              <TouchableOpacity
                onPress={() => {
                  console.log('🔄 [LearningPathsSheet] Reset filters pressed');
                  setCategoryFilters({
                    vehicle_type: '',
                    transmission_type: '',
                    license_type: '',
                    experience_level: '',
                    purpose: '',
                    user_profile: '',
                    platform: '',
                    type: '',
                  });
                }}
              >
                <Text color="#00E6C3">Reset</Text>
              </TouchableOpacity>

              <Text fontWeight="600" fontSize={18} color="white">
                {t('filters.filterLearningPaths') || 'Filter Learning Paths'}
              </Text>

              <TouchableOpacity onPress={() => setShowFilterDrawer(false)}>
                <Feather name="x" size={24} color="white" />
              </TouchableOpacity>
            </XStack>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              {/* Vehicle Type */}
              {categoryOptions.vehicle_type && categoryOptions.vehicle_type.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.vehicleType') || 'Vehicle Type'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('vehicle_type', '')}
                      style={{
                        backgroundColor: (categoryFilters.vehicle_type === '' || categoryFilters.vehicle_type === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.vehicle_type === '' || categoryFilters.vehicle_type === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.vehicle_type.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('vehicle_type', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.vehicle_type === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={categoryFilters.vehicle_type === option.value ? '#000' : '#fff'}
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* Transmission Type */}
              {categoryOptions.transmission_type &&
                categoryOptions.transmission_type.length > 0 && (
                  <YStack marginBottom={16}>
                    <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                      {t('filters.transmissionType') || 'Transmission Type'}
                    </Text>
                    <XStack flexWrap="wrap" gap={8}>
                      {/* All option */}
                      <TouchableOpacity
                        onPress={() => handleFilterSelect('transmission_type', '')}
                        style={{
                          backgroundColor:
                            (categoryFilters.transmission_type === '' || categoryFilters.transmission_type === 'all') ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={(categoryFilters.transmission_type === '' || categoryFilters.transmission_type === 'all') ? '#000' : '#fff'}
                        >
                          {t('common.all') || 'All'}
                        </Text>
                      </TouchableOpacity>
                      {categoryOptions.transmission_type.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          onPress={() => handleFilterSelect('transmission_type', option.value)}
                          style={{
                            backgroundColor:
                              categoryFilters.transmission_type === option.value
                                ? '#00E6C3'
                                : '#333',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            fontSize={14}
                            color={
                              categoryFilters.transmission_type === option.value ? '#000' : '#fff'
                            }
                          >
                            {option.label?.[lang] || option.label?.en || option.value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </XStack>
                  </YStack>
                )}

              {/* License Type */}
              {categoryOptions.license_type && categoryOptions.license_type.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.licenseType') || 'License Type'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('license_type', '')}
                      style={{
                        backgroundColor: (categoryFilters.license_type === '' || categoryFilters.license_type === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.license_type === '' || categoryFilters.license_type === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.license_type.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('license_type', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.license_type === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={categoryFilters.license_type === option.value ? '#000' : '#fff'}
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* Experience Level */}
              {categoryOptions.experience_level && categoryOptions.experience_level.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.experienceLevel') || 'Experience Level'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('experience_level', '')}
                      style={{
                        backgroundColor: (categoryFilters.experience_level === '' || categoryFilters.experience_level === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.experience_level === '' || categoryFilters.experience_level === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.experience_level.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('experience_level', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.experience_level === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={
                            categoryFilters.experience_level === option.value ? '#000' : '#fff'
                          }
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* Purpose */}
              {categoryOptions.purpose && categoryOptions.purpose.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.purpose') || 'Purpose'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('purpose', '')}
                      style={{
                        backgroundColor: (categoryFilters.purpose === '' || categoryFilters.purpose === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.purpose === '' || categoryFilters.purpose === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.purpose.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('purpose', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.purpose === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={categoryFilters.purpose === option.value ? '#000' : '#fff'}
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* User Profile */}
              {categoryOptions.user_profile && categoryOptions.user_profile.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.userProfile') || 'User Profile'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('user_profile', '')}
                      style={{
                        backgroundColor: (categoryFilters.user_profile === '' || categoryFilters.user_profile === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.user_profile === '' || categoryFilters.user_profile === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.user_profile.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('user_profile', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.user_profile === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={categoryFilters.user_profile === option.value ? '#000' : '#fff'}
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* Platform */}
              {categoryOptions.platform && categoryOptions.platform.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.platform') || 'Platform'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('platform', '')}
                      style={{
                        backgroundColor: (categoryFilters.platform === '' || categoryFilters.platform === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.platform === '' || categoryFilters.platform === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.platform.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('platform', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.platform === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={categoryFilters.platform === option.value ? '#000' : '#fff'}
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}

              {/* Content Type */}
              {categoryOptions.type && categoryOptions.type.length > 0 && (
                <YStack marginBottom={16}>
                  <Text fontWeight="600" fontSize={16} color="white" marginBottom={8}>
                    {t('filters.contentType') || 'Content Type'}
                  </Text>
                  <XStack flexWrap="wrap" gap={8}>
                    {/* All option */}
                    <TouchableOpacity
                      onPress={() => handleFilterSelect('type', '')}
                      style={{
                        backgroundColor: (categoryFilters.type === '' || categoryFilters.type === 'all') ? '#00E6C3' : '#333',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        fontSize={14}
                        color={(categoryFilters.type === '' || categoryFilters.type === 'all') ? '#000' : '#fff'}
                      >
                        {t('common.all') || 'All'}
                      </Text>
                    </TouchableOpacity>
                    {categoryOptions.type.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleFilterSelect('type', option.value)}
                        style={{
                          backgroundColor:
                            categoryFilters.type === option.value ? '#00E6C3' : '#333',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          fontSize={14}
                          color={categoryFilters.type === option.value ? '#000' : '#fff'}
                        >
                          {option.label?.[lang] || option.label?.en || option.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </XStack>
                </YStack>
              )}
            </ScrollView>

            {/* Apply Button */}
            <TouchableOpacity
              onPress={() => setShowFilterDrawer(false)}
              style={{
                backgroundColor: '#00E6C3',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 16,
              }}
            >
              <Text color="#000" fontWeight="bold" fontSize={16}>
                {t('filters.applyFilters') || 'Apply Filters'}
              </Text>
            </TouchableOpacity>
          </YStack>
        </View>
      </Modal>
    </Modal>
  );
}
