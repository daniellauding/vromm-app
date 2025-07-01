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
import { logNavigation, logError, logWarn, logInfo } from '../utils/logger';

// Define LearningPath type based on the learning_paths table
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon: string | null;
  image: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Category fields
  vehicle_type?: string;
  transmission_type?: string;
  license_type?: string;
  experience_level?: string;
  purpose?: string;
  user_profile?: string;
  // Lock fields
  is_locked?: boolean;
  lock_password?: string | null;
}

// Add Exercise type for learning_path_exercises
interface PathExercise {
  id: string;
  learning_path_id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  order_index: number;
  youtube_url?: string;
  icon?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
  language_specific_media?: boolean;
  embed_code?: string;
  // Lock fields
  is_locked?: boolean;
  lock_password?: string | null;
  repeat_count?: number;
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;
}

// For demo, English only. Replace with language context if needed.
const lang = 'en';

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

// Define category types based on the learning_path_categories table
type CategoryType =
  | 'vehicle_type'
  | 'transmission_type'
  | 'license_type'
  | 'experience_level'
  | 'purpose'
  | 'user_profile';

interface CategoryOption {
  id: string;
  category: CategoryType;
  value: string;
  label: { en: string; sv: string };
  order_index: number;
  is_default: boolean;
}

export function ProgressScreen() {
  const route = useRoute<RouteProp<TabParamList, 'ProgressTab'>>();
  const { selectedPathId, showDetail } = route.params || {};

  const [activePath, setActivePath] = useState<string>(selectedPathId || '');
  const [showDetailView, setShowDetailView] = useState<boolean>(!!showDetail);
  const [detailPath, setDetailPath] = useState<LearningPath | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PathExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PathExercise | null>(null);
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [completionsLoading, setCompletionsLoading] = useState(false);
  const [pathProgress, setPathProgress] = useState<{ [pathId: string]: number }>({});

  // Add comprehensive logging
  const { logAction, logAsyncAction, logRenderIssue, logMemoryWarning } = useScreenLogger({
    screenName: 'ProgressScreen',
    trackPerformance: true,
    trackMemory: true,
  });

  // Add category filters with proper state
  const [categoryOptions, setCategoryOptions] = useState<Record<CategoryType, CategoryOption[]>>({
    vehicle_type: [],
    transmission_type: [],
    license_type: [],
    experience_level: [],
    purpose: [],
    user_profile: [],
  });

  // State for which categories are selected
  const [categoryFilters, setCategoryFilters] = useState<Record<CategoryType, string>>({
    vehicle_type: '',
    transmission_type: '',
    license_type: '',
    experience_level: '',
    purpose: '',
    user_profile: '',
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

  // Load categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('learning_path_categories')
          .select('*')
          .order('order_index', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }

        // Group by category type
        const groupedCategories: Record<CategoryType, CategoryOption[]> = {
          vehicle_type: [],
          transmission_type: [],
          license_type: [],
          experience_level: [],
          purpose: [],
          user_profile: [],
        };

        // Add an "All" option for each category
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

        // Set default filters based on is_default flag
        const defaultFilters: Record<CategoryType, string> = {
          vehicle_type: 'all',
          transmission_type: 'all',
          license_type: 'all',
          experience_level: 'all',
          purpose: 'all',
          user_profile: 'all',
        };

        Object.keys(groupedCategories).forEach((key) => {
          const category = key as CategoryType;
          const defaultOption = groupedCategories[category].find((opt) => opt.is_default);
          if (defaultOption) {
            defaultFilters[category] = defaultOption.value;
          }
        });

        setCategoryFilters(defaultFilters);
      } catch (err) {
        console.error('Error processing categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Modal state for category filter selection
  const [activeFilterType, setActiveFilterType] = useState<CategoryType | null>(null);

  // Category labels for display
  const categoryLabels: Record<CategoryType, string> = {
    vehicle_type: 'Vehicle Type',
    transmission_type: 'Transmission',
    license_type: 'License Type',
    experience_level: 'Experience Level',
    purpose: 'Purpose',
    user_profile: 'User Profile',
  };

  // Filter option selection handler
  const handleFilterSelect = (filterType: CategoryType, value: string) => {
    setCategoryFilters((prev) => ({ ...prev, [filterType]: value }));
    setActiveFilterType(null);
  };

  // Toggle completion for an exercise
  const toggleCompletion = async (exerciseId: string) => {
    if (!user) return;

    const isDone = completedIds.includes(exerciseId);
    console.log(
      `ProgressScreen: Toggling exercise ${exerciseId} from ${isDone ? 'done' : 'not done'} to ${isDone ? 'not done' : 'done'}`,
    );

    // Update UI immediately for better user experience
    if (isDone) {
      // Mark as not done - update UI first
      setCompletedIds((prev) => prev.filter((id) => id !== exerciseId));

      // Then update database
      try {
        const { error } = await supabase
          .from('learning_path_exercise_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId);

        if (error) {
          console.error('ProgressScreen: Error removing completion', error);
        } else {
          console.log('ProgressScreen: Successfully removed completion');
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
          .insert([{ user_id: user.id, exercise_id: exerciseId }]);

        if (error) {
          console.error('ProgressScreen: Error adding completion', error);
        } else {
          console.log('ProgressScreen: Successfully added completion');
        }
      } catch (err) {
        console.error('ProgressScreen: Exception in toggleCompletion (add)', err);
      }
    }
  };

  // Check if content is already unlocked in database
  const checkExistingUnlock = async (contentId: string, contentType: 'learning_path' | 'exercise'): Promise<boolean> => {
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
      const { error } = await supabase
        .from('user_unlocked_content')
        .insert({
          user_id: user.id,
          content_id: contentId,
          content_type: contentType
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.log('ProgressScreen: Error storing unlock:', error);
      } else {
        console.log(`ProgressScreen: Successfully stored unlock for ${contentType}: ${contentId}`);
        // Update local persisted unlocks state
        setPersistedUnlocks(prev => ({
          ...prev,
          [contentType === 'learning_path' ? 'paths' : 'exercises']: [
            ...prev[contentType === 'learning_path' ? 'paths' : 'exercises'],
            contentId
          ]
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
        const paths = data.filter(item => item.content_type === 'learning_path').map(item => item.content_id);
        const exercises = data.filter(item => item.content_type === 'exercise').map(item => item.content_id);
        
        setPersistedUnlocks({ paths, exercises });
        console.log(`ProgressScreen: Loaded ${paths.length} path unlocks and ${exercises.length} exercise unlocks from database`);
      } else {
        console.log('ProgressScreen: No existing unlocks found or error:', error);
      }
    } catch (error) {
      console.log('ProgressScreen: Error loading existing unlocks:', error);
    }
  };

  // Toggle completion for virtual repeat exercises (save to new table)
  const toggleVirtualRepeatCompletion = async (virtualId: string) => {
    if (!user) return;

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

    const isDone = virtualRepeatCompletions.includes(virtualId);
    console.log(
      `ProgressScreen: Toggling virtual repeat ${virtualId} (exercise: ${exerciseId}, repeat: ${repeatNumber}) from ${isDone ? 'done' : 'not done'} to ${isDone ? 'not done' : 'done'}`,
    );

    // Update UI immediately for better user experience
    if (isDone) {
      // Mark as not done - update UI first
      setVirtualRepeatCompletions((prev) => prev.filter((id) => id !== virtualId));

      // Then update database using separate table
      try {
        const { error } = await supabase
          .from('virtual_repeat_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId)
          .eq('repeat_number', repeatNumber);

        if (error) {
          console.error('ProgressScreen: Error removing virtual repeat completion', error);
          // Rollback UI change on error
          setVirtualRepeatCompletions((prev) => [...prev, virtualId]);
        } else {
          console.log('ProgressScreen: Successfully removed virtual repeat completion');
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
        const { error } = await supabase
          .from('virtual_repeat_completions')
          .insert([{
            user_id: user.id,
            exercise_id: exerciseId,
            repeat_number: repeatNumber
          }]);

        if (error) {
          console.error('ProgressScreen: Error adding virtual repeat completion', error);
          // Rollback UI change on error
          setVirtualRepeatCompletions((prev) => prev.filter((id) => id !== virtualId));
        } else {
          console.log('ProgressScreen: Successfully added virtual repeat completion');
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
    if (!user || !detailPath) return;
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
            user_id: user.id,
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
          .eq('user_id', user.id)
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
    if (!user) return;
    setCompletionsLoading(true);
    
    // Fetch regular exercise completions
    const { data: regularData, error: regularError } = await supabase
      .from('learning_path_exercise_completions')
      .select('exercise_id')
      .eq('user_id', user.id);
    
    // Fetch virtual repeat completions
    const { data: virtualData, error: virtualError } = await supabase
      .from('virtual_repeat_completions')
      .select('exercise_id, repeat_number')
      .eq('user_id', user.id);
    
    if (!regularError && regularData) {
      setCompletedIds(regularData.map((c: { exercise_id: string }) => c.exercise_id));
    } else {
      setCompletedIds([]);
    }
    
    if (!virtualError && virtualData) {
      // Convert virtual completions back to virtualId format: "exerciseId-virtual-2"
      const virtualCompletions = virtualData.map((c: { exercise_id: string; repeat_number: number }) => 
        `${c.exercise_id}-virtual-${c.repeat_number}`
      );
      setVirtualRepeatCompletions(virtualCompletions);
    } else {
      setVirtualRepeatCompletions([]);
    }
    
    console.log(`ProgressScreen: Loaded ${regularData?.length || 0} regular completions and ${virtualData?.length || 0} virtual repeat completions`);
    setCompletionsLoading(false);
  };

  // Fetch completions and existing unlocks for the current user
  useEffect(() => {
    fetchCompletions();
    loadExistingUnlocks();

    // Set up real-time subscription for completions
    if (user) {
      console.log('ProgressScreen: Setting up real-time subscription', user.id);

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
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('ProgressScreen: Realtime update received:', payload.eventType);
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
  }, [user]);

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

  // Filter paths based on selected categories
  const filteredPaths = useMemo(() => {
    return paths.filter((path) => {
      // Skip filtering for "all" values or if path doesn't have the property
      const matchesVehicleType =
        categoryFilters.vehicle_type === 'all' ||
        !path.vehicle_type ||
        path.vehicle_type === categoryFilters.vehicle_type;
      const matchesTransmission =
        categoryFilters.transmission_type === 'all' ||
        !path.transmission_type ||
        path.transmission_type === categoryFilters.transmission_type;
      const matchesLicense =
        categoryFilters.license_type === 'all' ||
        !path.license_type ||
        path.license_type === categoryFilters.license_type;
      const matchesExperience =
        categoryFilters.experience_level === 'all' ||
        !path.experience_level ||
        path.experience_level === categoryFilters.experience_level;
      const matchesPurpose =
        categoryFilters.purpose === 'all' ||
        !path.purpose ||
        path.purpose === categoryFilters.purpose;
      const matchesUserProfile =
        categoryFilters.user_profile === 'all' ||
        !path.user_profile ||
        path.user_profile === categoryFilters.user_profile;

      return (
        matchesVehicleType &&
        matchesTransmission &&
        matchesLicense &&
        matchesExperience &&
        matchesPurpose &&
        matchesUserProfile
      );
    });
  }, [paths, categoryFilters]);

  useEffect(() => {
    fetchLearningPaths();
  }, []);

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
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setPaths(data || []);
      // Set the first path as active by default if no selectedPathId
      if (data && data.length > 0 && !selectedPathId) {
        setActivePath(data[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while fetching learning paths',
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to check if a path should be enabled (available to click)
  const shouldPathBeEnabled = (path: LearningPath, index: number): boolean => {
    // First path is always enabled
    if (index === 0) return true;

    // If we can't determine the previous path, don't enable
    if (index < 0 || index >= filteredPaths.length || !filteredPaths[index - 1]) {
      return false;
    }

    // Get previous path ID safely
    const previousPath = filteredPaths[index - 1];
    if (!previousPath || !previousPath.id) {
      return false;
    }

    // Check if previous path is completed
    const previousPathProgress = getPathProgress(previousPath.id);
    return previousPathProgress === 1;
  };

  // Modified handlePathPress to allow clicking on future paths
  const handlePathPress = (path: LearningPath, index: number) => {
    setActivePath(path.id);
    setDetailPath(path);
    setShowDetailView(true);
  };

  // Calculate progress for each path from local state
  const getPathProgress = (pathId: string): number => {
    if (!pathId) return 0;

    // Only calculate for the currently loaded exercises if this is the active path
    if (activePath === pathId && exercises.length > 0) {
      const total = exercises.length;
      const completed = exercises.filter((ex) => completedIds.includes(ex.id)).length;
      return total === 0 ? 0 : completed / total;
    }

    // For other paths or if exercises aren't loaded, use a safer approach
    const exerciseIds = exercises.filter((ex) => ex.learning_path_id === pathId).map((ex) => ex.id);
    if (exerciseIds.length === 0) return 0;

    const completedExercises = exerciseIds.filter((id) => completedIds.includes(id)).length;
    return completedExercises / exerciseIds.length;
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
    return !!path.is_locked && 
           !unlockedPaths.includes(path.id) && 
           !persistedUnlocks.paths.includes(path.id);
  };

  // Separate function to check if a path specifically has a password
  const pathHasPassword = (path: LearningPath): boolean => {
    return !!path.is_locked && !!path.lock_password;
  };

  // Function to check if an exercise is locked with password (includes database unlocks)
  const isExercisePasswordLocked = (exercise: PathExercise): boolean => {
    // Use !! to convert undefined to false, ensuring boolean return
    return (
      !!exercise.is_locked && !!exercise.lock_password && 
      !unlockedExercises.includes(exercise.id) &&
      !persistedUnlocks.exercises.includes(exercise.id)
    );
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

  // Add the UnavailableExerciseView component for exercises that aren't ready yet
  const UnavailableExerciseView = () => {
    return (
      <YStack gap={16} padding={24} alignItems="center">
        <MaterialIcons name="hourglass-empty" size={48} color="#FF9500" />
        <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">
          This Exercise is Not Available Yet
        </Text>
        <Text color="$gray11" textAlign="center">
          You need to complete the previous exercises before accessing this one.
        </Text>
        <TouchableOpacity
          onPress={() => setSelectedExercise(null)}
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

    // For repeated exercises, check if previous repeats are complete
    let previousRepeatsComplete = true;
    if (selectedExercise.isRepeat && selectedExercise.originalId) {
      // Find all previous repeats of this exercise
      const previousRepeats = exercises.filter(
        (e) =>
          (e.id === selectedExercise.originalId ||
            (e.isRepeat && e.originalId === selectedExercise.originalId)) &&
          (e.repeatNumber === undefined || e.repeatNumber < (selectedExercise.repeatNumber || 0)),
      );

      // Check if all previous repeats are complete
      previousRepeatsComplete = previousRepeats.every((prevEx) => completedIds.includes(prevEx.id));
    }

    // Determine if exercise should be available based on previous exercises
    // For repeated exercises, we need all previous repeats to be complete
    const originalIndex = exercises.findIndex(
      (e) =>
        !e.isRepeat &&
        e.id === (selectedExercise.isRepeat ? selectedExercise.originalId : selectedExercise.id),
    );
    const prevExercisesComplete =
      // If it's the first exercise or a repeat of the first exercise, it's always available
      originalIndex <= 0 ||
      // Otherwise, check if all previous non-repeat exercises are complete AND
      // for a repeat, check if all previous repeats of the same exercise are complete
      (exercises
        .slice(0, originalIndex)
        .filter((e) => !e.isRepeat || e.originalId !== selectedExercise.originalId) // Exclude other repeats of this exercise
        .every((prevEx) => completedIds.includes(prevEx.id)) &&
        previousRepeatsComplete);

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
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
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
                  name={selectedExercise.icon as any}
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
          ) : !prevExercisesComplete ? (
            /* Unavailable Exercise State - When previous exercises aren't complete */
            <UnavailableExerciseView />
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
                    <XStack alignItems="center" gap={8}>
                      <Feather name="list" size={20} color="#4B6BFF" />
                      <Text fontSize={18} fontWeight="bold" color="#4B6BFF">
                        All Repetitions
                      </Text>
                    </XStack>

                    {/* Show the original exercise first */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#222',
                        padding: 12,
                        borderRadius: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: completedIds.includes(selectedExercise.id) ? '#00E6C3' : '#4B6BFF',
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
                              borderColor: completedIds.includes(selectedExercise.id) ? '#00E6C3' : '#888',
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
                                  {isDone && <Feather name="check-circle" size={18} color="#00E6C3" />}
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
                              <Text
                                fontSize={14}
                                color="#4B6BFF"
                                fontWeight="bold"
                              >
                                {repeat.repeatNumber}/{repeat.repeat_count}
                              </Text>
                              {isDone && (
                                <Feather name="check-circle" size={18} color="#00E6C3" />
                              )}
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
            </>
          )}
        </ScrollView>
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
    const isAvailable = isFirstPath || previousPathCompleted;

    // Check if path is locked with password - HIGHEST PRIORITY
    const isPasswordLocked = isPathPasswordLocked(detailPath);
    const hasPassword = pathHasPassword(detailPath);

    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <TouchableOpacity onPress={() => setShowDetailView(false)} style={{ marginBottom: 24 }}>
            <Feather name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Path header with icon if available */}
          <XStack alignItems="center" gap={12} marginBottom={16}>
            {detailPath.icon && (
              <View style={{ marginRight: 8 }}>
                <Feather
                  name={detailPath.icon as any}
                  size={28}
                  color={isPasswordLocked ? '#FF9500' : '#00E6C3'}
                />
              </View>
            )}
            <Text fontSize={28} fontWeight="bold" color="$color">
              {detailPath.title[lang]}
            </Text>

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

                     // Calculate if main exercise is available
                     const mainOriginalIndex = exercises.findIndex((e) => e.id === main.id);
                     const mainPrevExercisesComplete = mainOriginalIndex <= 0 || 
                       exercises.slice(0, mainOriginalIndex)
                         .every((prevEx) => completedIds.includes(prevEx.id));

                  return (
                      <YStack key={main.id} marginBottom={16}>
                        {/* Main Exercise */}
                        <TouchableOpacity onPress={() => setSelectedExercise(main)}>
                          <XStack alignItems="center" gap={12}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                                if (!mainIsPasswordLocked && mainPrevExercisesComplete) {
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
                                     {displayIndex}. {main.title?.[lang] || main.title?.en || 'Untitled'}
                              </Text>

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
                            </XStack>

                            {/* Show appropriate icon based on state - LOCK gets priority */}
                                 {mainIsPasswordLocked ? (
                              <MaterialIcons name="lock" size={20} color="#FF9500" />
                                 ) : !mainPrevExercisesComplete ? (
                              <MaterialIcons name="hourglass-empty" size={20} color="#FF9500" />
                                 ) : mainIsDone ? (
                              <Feather name="check-circle" size={20} color="#00E6C3" />
                            ) : null}
                          </XStack>

                               {main.description?.[lang] && (
                            <Text color="$gray11" marginTop={4}>
                                   {main.description[lang]}
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
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding={0}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {/* Category filters */}
        <YStack
          space={12}
          padding={16}
          backgroundColor="$backgroundStronger"
          borderRadius={16}
          marginBottom={24}
        >
          <Text fontSize={16} fontWeight="bold" color="$color">
            Filter Learning Paths
          </Text>

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

            // First path is always enabled, others depend on previous completion
            const isFirstPath = idx === 0;
            const previousPathCompleted =
              idx > 0 && filteredPaths[idx - 1]
                ? getPathProgress(filteredPaths[idx - 1].id) >= 1
                : false;

            const isEnabled = isFirstPath || previousPathCompleted;

            // Visual highlight for the next path that is now enabled
            const isNextToUnlock =
              isEnabled && !isFirstPath && previousPathCompleted && percent < 1;

            // Check if path is password-locked - HIGHEST PRIORITY
            const isPasswordLocked = isPathPasswordLocked(path);
            const hasPassword = pathHasPassword(path);

            return (
              <TouchableOpacity
                key={path.id}
                onPress={() => handlePathPress(path, idx)}
                activeOpacity={0.8}
                style={{
                  marginBottom: 20,
                  opacity: isEnabled ? 1 : 0.5,
                  borderWidth: isNextToUnlock ? 3 : isPasswordLocked ? 2 : 0,
                  borderColor: isNextToUnlock
                    ? '#00E6C3'
                    : isPasswordLocked
                      ? '#FF9500'
                      : 'transparent',
                  borderRadius: 24,
                  shadowColor: isNextToUnlock
                    ? '#00E6C3'
                    : isPasswordLocked
                      ? '#FF9500'
                      : 'transparent',
                  shadowOpacity: isNextToUnlock ? 0.5 : isPasswordLocked ? 0.3 : 0,
                  shadowRadius: isNextToUnlock ? 12 : isPasswordLocked ? 8 : 0,
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
                          color={isActive ? '$color' : isPasswordLocked ? '#FF9500' : '$gray11'}
                        >
                          {idx + 1}. {path.title[lang]}
                        </Text>

                        {/* Show appropriate icon based on state - LOCK gets priority */}
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
      </ScrollView>
    </YStack>
  );
}
