import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string | null;
  image?: string | null;
  order_index: number;
  active: boolean;
  platform?: string;
  type?: string;
  vehicle_type?: string;
  transmission_type?: string;
  license_type?: string;
  experience_level?: string;
  purpose?: string;
  user_profile?: string;
  learning_path_exercises: {
    id: string;
    learning_path_id: string;
    order_index: number;
    created_at: string;
    updated_at: string;
  }[];
}

type CategoryType =
  | 'vehicle_type'
  | 'transmission_type'
  | 'license_type'
  | 'experience_level'
  | 'purpose'
  | 'user_profile'
  | 'platform'
  | 'type';

interface LearningPathCardProps {
  activeUserId?: string;
  onPress: (path: LearningPath) => void;
  onPressSeeAll: () => void;
}

// Progress Circle component (matching LearningPathsSheet)
function ProgressCircle({
  percent,
  size = 90,
  color = '#27febe',
  bg = '#333',
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

export const LearningPathCard = ({
  activeUserId,
  onPress,
  onPressSeeAll,
}: LearningPathCardProps) => {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const colorScheme = useColorScheme();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Helper function to get translation with fallback
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  // Get profile preference (same as ProgressSection)
  const getProfilePreference = useCallback(
    (key: string, defaultValue: string): string => {
      if (!profile) return defaultValue;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const licenseData = (profile as any)?.license_plan_data;
        if (licenseData && typeof licenseData === 'object') {
          const value = licenseData[key];
          return value || defaultValue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (profile as any)[key];
        return value || defaultValue;
      } catch {
        return defaultValue;
      }
    },
    [profile],
  );

  // Load filter preferences (same as ProgressSection)
  const loadFilterPreferences = useCallback(async (): Promise<Record<
    CategoryType,
    string
  > | null> => {
    try {
      const filterKey = `vromm_progress_filters_${activeUserId || 'default'}`;
      const saved = await AsyncStorage.getItem(filterKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ [LearningPathCard] Loaded saved filter preferences:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('[LearningPathCard] Error loading filter preferences:', error);
    }
    return null;
  }, [activeUserId]);

  // Load filters (same logic as ProgressSection)
  useEffect(() => {
    const loadFilters = async () => {
      const startTime = Date.now();
      console.log('⚡ [LearningPathCard] Loading filters...');
      try {
        const savedFilters = await loadFilterPreferences();
        console.log('⚡ [LearningPathCard] Filters loaded in:', Date.now() - startTime, 'ms');

        if (savedFilters) {
          setCategoryFilters(savedFilters);
          console.log('✅ [LearningPathCard] Using saved filter preferences:', savedFilters);
        } else {
          // Load defaults from database (same logic as ProgressSection)
          const { data: categoryData } = await supabase
            .from('learning_path_categories')
            .select('category, value, label, is_default, created_at, order_index')
            .order('order_index', { ascending: true });

          if (categoryData) {
            // Get most recent is_default=true values
            const defaultVehicle = categoryData
              .filter((item) => item.category === 'vehicle_type' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultTransmission = categoryData
              .filter((item) => item.category === 'transmission_type' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultLicense = categoryData
              .filter((item) => item.category === 'license_type' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultExperience = categoryData
              .filter((item) => item.category === 'experience_level' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultPurpose = categoryData
              .filter((item) => item.category === 'purpose' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultUserProfile = categoryData
              .filter((item) => item.category === 'user_profile' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultPlatform = categoryData
              .filter((item) => item.category === 'platform' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];
            const defaultType = categoryData
              .filter((item) => item.category === 'type' && item.is_default)
              .sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              )[0];

            // For instructors, use 'all' filters to show everything
            const isInstructor = profile?.role === 'instructor' || profile?.role === 'school';

            const defaultFilters: Record<CategoryType, string> = isInstructor
              ? {
                  vehicle_type: 'all',
                  transmission_type: 'all',
                  license_type: 'all',
                  experience_level: 'all',
                  purpose: 'all',
                  user_profile: 'all',
                  platform: 'all',
                  type: 'all',
                }
              : {
                  vehicle_type: getProfilePreference(
                    'vehicle_type',
                    defaultVehicle?.value || 'all',
                  ),
                  transmission_type: getProfilePreference(
                    'transmission_type',
                    defaultTransmission?.value || 'all',
                  ),
                  license_type: getProfilePreference(
                    'license_type',
                    defaultLicense?.value || 'all',
                  ),
                  experience_level: getProfilePreference(
                    'experience_level',
                    defaultExperience?.value || 'all',
                  ),
                  purpose: getProfilePreference('purpose', defaultPurpose?.value || 'all'),
                  user_profile: getProfilePreference(
                    'user_profile',
                    defaultUserProfile?.value || 'all',
                  ),
                  platform: defaultPlatform?.value || 'all',
                  type: defaultType?.value || 'all',
                };

            setCategoryFilters(defaultFilters);
            console.log('✅ [LearningPathCard] Set default category filters:', defaultFilters);
          }
        }
      } catch (error) {
        console.error('[LearningPathCard] Error loading filters:', error);
      }
    };

    loadFilters();
  }, [profile, activeUserId, getProfilePreference, loadFilterPreferences]);

  // Fetch learning paths with filtering (same as ProgressSection)
  useEffect(() => {
    const fetchLearningPaths = async () => {
      const startTime = Date.now();
      console.log('⚡ [LearningPathCard] Fetching learning paths...');
      try {
        const { data, error } = await supabase
          .from('learning_paths')
          .select('*, learning_path_exercises(*)')
          .eq('active', true)
          .order('order_index', { ascending: true });

        if (error) {
          console.error('[LearningPathCard] Error fetching learning paths:', error);
          return;
        }

        if (data && data.length > 0) {
          // Log first path's category values for debugging
          console.log('🔍 [LearningPathCard] Sample path category values:', {
            title: data[0].title,
            vehicle_type: data[0].vehicle_type,
            transmission_type: data[0].transmission_type,
            license_type: data[0].license_type,
            experience_level: data[0].experience_level,
            purpose: data[0].purpose,
            user_profile: data[0].user_profile,
            platform: data[0].platform,
            type: data[0].type,
          });

          // Apply filters (EXACT SAME logic as ProgressSection)
          const filtered = data.filter((path) => {
            // Handle variations in data values and allow null values
            const matchesVehicleType =
              categoryFilters.vehicle_type === 'all' ||
              !path.vehicle_type ||
              path.vehicle_type?.toLowerCase() === categoryFilters.vehicle_type?.toLowerCase();

            const matchesTransmission =
              categoryFilters.transmission_type === 'all' ||
              !path.transmission_type ||
              path.transmission_type?.toLowerCase() ===
                categoryFilters.transmission_type?.toLowerCase();

            const matchesLicense =
              categoryFilters.license_type === 'all' ||
              !path.license_type ||
              path.license_type?.toLowerCase() === categoryFilters.license_type?.toLowerCase();

            const matchesExperience =
              categoryFilters.experience_level === 'all' ||
              !path.experience_level ||
              path.experience_level?.toLowerCase() ===
                categoryFilters.experience_level?.toLowerCase();

            const matchesPurpose =
              categoryFilters.purpose === 'all' ||
              !path.purpose ||
              path.purpose?.toLowerCase() === categoryFilters.purpose?.toLowerCase();

            const matchesUserProfile =
              categoryFilters.user_profile === 'all' ||
              !path.user_profile ||
              path.user_profile?.toLowerCase() === categoryFilters.user_profile?.toLowerCase() ||
              path.user_profile === 'All'; // "All" user profile matches any filter

            const matchesPlatform =
              categoryFilters.platform === 'all' ||
              !path.platform ||
              path.platform === 'both' || // "both" platform matches any filter
              path.platform?.toLowerCase() === categoryFilters.platform?.toLowerCase() ||
              path.platform === 'mobile'; // Always show mobile content

            const matchesType =
              categoryFilters.type === 'all' ||
              !path.type ||
              path.type?.toLowerCase() === categoryFilters.type?.toLowerCase();

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

          console.log('✅ [LearningPathCard] Filtered learning paths:', {
            total: data.length,
            filtered: filtered.length,
            filters: categoryFilters,
          });

          setLearningPaths(filtered);
        }
        console.log('⚡ [LearningPathCard] Learning paths fetched in:', Date.now() - startTime, 'ms');
      } catch (err) {
        console.error('[LearningPathCard] Error fetching learning paths:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLearningPaths();
  }, [categoryFilters]);

  // Fetch completed exercises for progress (matching ProgressSection.tsx)
  useEffect(() => {
    const fetchCompletions = async () => {
      if (!activeUserId) return;

      try {
        const { data, error } = await supabase
          .from('learning_path_exercise_completions')
          .select('exercise_id')
          .eq('user_id', activeUserId);

        if (error) {
          console.error('Error fetching completions:', error);
          return;
        }

        if (data) {
          setCompletedExercises(data.map((c) => c.exercise_id));
        }
      } catch (err) {
        console.error('Error fetching completions:', err);
      }
    };

    fetchCompletions();
  }, [activeUserId]);

  // Calculate progress for a learning path
  const calculateProgress = (path: LearningPath): number => {
    if (!path.learning_path_exercises || path.learning_path_exercises.length === 0) {
      return 0;
    }

    const pathExerciseIds = path.learning_path_exercises.map((ex) => ex.id);
    const completedCount = pathExerciseIds.filter((id) => completedExercises.includes(id)).length;

    return completedCount / pathExerciseIds.length;
  };

  // Find the first incomplete path (current focus)
  const currentFocusPathId = learningPaths.find((path) => calculateProgress(path) < 1)?.id;

  // Always show the component if we have learning paths, even if all are completed
  if (loading || learningPaths.length === 0) {
    console.log('🎯 [LearningPathCard] Not rendering:', {
      loading,
      pathsCount: learningPaths.length,
      filters: categoryFilters,
    });
    return null;
  }

  console.log('✅ [LearningPathCard] Rendering with paths:', {
    pathsCount: learningPaths.length,
    currentFocusPathId,
    paths: learningPaths.map((p) => ({
      id: p.id,
      title: p.title,
      progress: calculateProgress(p),
    })),
  });

  return (
    <YStack space="$4">
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4">
        <Text fontSize="$6" fontWeight="bold" color="$color">
          {getTranslation(
            'home.learningPath.title',
            language === 'sv' ? 'Dina inlärningsvägar' : 'Your Learning Paths',
          )}
        </Text>
        <TouchableOpacity onPress={onPressSeeAll}>
          <XStack alignItems="center" gap="$1">
            <Text
              fontSize="$4"
              fontWeight="600"
              color={colorScheme === 'dark' ? '#00E6C3' : '#00C9A7'}
            >
              {getTranslation('common.seeAll', language === 'sv' ? 'Se alla' : 'See all')}
            </Text>
            <Feather
              name="chevron-right"
              size={20}
              color={colorScheme === 'dark' ? '#00E6C3' : '#00C9A7'}
            />
          </XStack>
        </TouchableOpacity>
      </XStack>

      {/* Horizontal ScrollView like ProgressSection.tsx */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$3" paddingHorizontal="$4">
          {learningPaths.map((path, index) => {
            const pathProgress = calculateProgress(path);

            return (
              <TouchableOpacity
                key={path.id}
                onPress={() => onPress(path)}
                activeOpacity={0.8}
                style={{
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 280, // Fixed width like ProgressSection cards
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF',
                    borderRadius: 20,
                    borderWidth: 3,
                    // Highlight current focus path with green border
                    borderColor:
                      path.id === currentFocusPathId
                        ? colorScheme === 'dark'
                          ? '#27febe'
                          : '#00C9A7'
                        : pathProgress === 1
                          ? colorScheme === 'dark'
                            ? '#333'
                            : '#E5E5E5'
                          : colorScheme === 'dark'
                            ? '#232323'
                            : '#E5E5E5',
                    padding: 24,
                    shadowOpacity: 0,
                  }}
                >
                  <YStack alignItems="center" gap={16}>
                    {/* Large Progress Circle at Top */}
                    <View
                      style={{
                        position: 'relative',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Large Progress Circle */}
                      <ProgressCircle
                        percent={pathProgress}
                        size={90}
                        color={colorScheme === 'dark' ? '#27febe' : '#00C9A7'}
                        bg={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                      />

                      {/* Percentage Text Inside Circle */}
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
                        color={
                          pathProgress === 1
                            ? colorScheme === 'dark'
                              ? '#27febe'
                              : '#00C9A7'
                            : colorScheme === 'dark'
                              ? '$gray10'
                              : '#666'
                        }
                        fontWeight="bold"
                      >
                        {Math.round(pathProgress * 100)}%
                      </Text>

                      {/* Checkmark if completed */}
                      {pathProgress === 1 && (
                        <View
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: colorScheme === 'dark' ? '#27febe' : '#00C9A7',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Feather name="check" size={18} color="#000" />
                        </View>
                      )}
                    </View>

                    {/* Title and Description - Centered */}
                    <YStack alignItems="center" gap={8} width="100%">
                      {/* Current Focus Badge */}
                      {path.id === currentFocusPathId && (
                        <View
                          style={{
                            backgroundColor: colorScheme === 'dark' ? '#27febe' : '#00C9A7',
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            fontSize={12}
                            fontWeight="bold"
                            color="#000"
                            textTransform="uppercase"
                          >
                            {language === 'sv' ? '🎯 Fokusera här' : '🎯 Focus Here'}
                          </Text>
                        </View>
                      )}

                      {/* Title - Centered */}
                      <Text
                        fontSize={20}
                        fontWeight="900"
                        fontStyle="italic"
                        color="$color"
                        textAlign="center"
                        numberOfLines={2}
                      >
                        {index + 1}. {language === 'sv' ? path.title.sv : path.title.en}
                      </Text>

                      {/* Description - Centered */}
                      <Text
                        color="$gray11"
                        fontSize={14}
                        textAlign="center"
                        numberOfLines={2}
                        paddingHorizontal={8}
                      >
                        {language === 'sv' ? path.description.sv : path.description.en}
                      </Text>
                    </YStack>
                  </YStack>
                </View>
              </TouchableOpacity>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
};
