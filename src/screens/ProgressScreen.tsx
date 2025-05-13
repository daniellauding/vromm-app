import React, { useState, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Linking, Platform, Modal as RNModal, Pressable } from 'react-native';
import { YStack, XStack, Text, Card, Select, Image as TamaguiImage } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TabParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import Svg, { Circle } from 'react-native-svg';
import WebView from 'react-native-webview';
import { Image } from 'react-native';

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
function ProgressCircle({ percent, size = 56, color = '#00E6C3', bg = '#222' }: ProgressCircleProps) {
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
type CategoryType = 'vehicle_type' | 'transmission_type' | 'license_type' | 'experience_level' | 'purpose' | 'user_profile';

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

  // Add category filters with proper state
  const [categoryOptions, setCategoryOptions] = useState<Record<CategoryType, CategoryOption[]>>({
    vehicle_type: [],
    transmission_type: [],
    license_type: [],
    experience_level: [],
    purpose: [],
    user_profile: []
  });

  // State for which categories are selected
  const [categoryFilters, setCategoryFilters] = useState<Record<CategoryType, string>>({
    vehicle_type: '',
    transmission_type: '',
    license_type: '',
    experience_level: '',
    purpose: '',
    user_profile: ''
  });

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
          user_profile: []
        };

        // Add an "All" option for each category
        for (const key of Object.keys(groupedCategories) as CategoryType[]) {
          groupedCategories[key].push({
            id: `all-${key}`,
            category: key,
            value: 'all',
            label: { en: 'All', sv: 'Alla' },
            order_index: 0,
            is_default: false
          });
        }
        
        // Process categories from database
        data?.forEach(item => {
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
          user_profile: 'all'
        };
        
        Object.keys(groupedCategories).forEach(key => {
          const category = key as CategoryType;
          const defaultOption = groupedCategories[category].find(opt => opt.is_default);
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
    user_profile: 'User Profile'
  };

  // Filter option selection handler
  const handleFilterSelect = (filterType: CategoryType, value: string) => {
    setCategoryFilters(prev => ({ ...prev, [filterType]: value }));
    setActiveFilterType(null);
  };

  // Toggle completion for an exercise
  const toggleCompletion = async (exerciseId: string) => {
    if (!user) return;
    
    const isDone = completedIds.includes(exerciseId);
    console.log(`ProgressScreen: Toggling exercise ${exerciseId} from ${isDone ? 'done' : 'not done'} to ${isDone ? 'not done' : 'done'}`);
    
    // Update UI immediately for better user experience
    if (isDone) {
      // Mark as not done - update UI first
      setCompletedIds(prev => prev.filter(id => id !== exerciseId));
      
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
      setCompletedIds(prev => [...prev, exerciseId]);
      
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

  // Mark all exercises as complete or incomplete
  const handleMarkAllExercises = async (isComplete: boolean) => {
    if (!user || !detailPath) return;
    console.log(`ProgressScreen: Marking all exercises as ${isComplete ? 'complete' : 'incomplete'}`);

    try {
      setLoading(true);
      // First get all exercise IDs for this learning path
      const { data: exercises } = await supabase
        .from('learning_path_exercises')
        .select('id')
        .eq('learning_path_id', detailPath.id);

      if (!exercises || exercises.length === 0) return;
      console.log(`ProgressScreen: Found ${exercises.length} exercises to mark`);

      const exerciseIds = exercises.map(ex => ex.id);

      // Update local state immediately for better UI feedback
      if (isComplete) {
        // Add all completions (that don't exist yet)
        // First, filter out what's already completed
        const exercisesToComplete = exerciseIds.filter(id => !completedIds.includes(id));
        console.log(`ProgressScreen: Adding ${exercisesToComplete.length} new completions`);
        
        // Update state immediately before database operation
        if (exercisesToComplete.length > 0) {
          setCompletedIds(prev => [...prev, ...exercisesToComplete]);
          
          // Insert all completions at once
          const completions = exercisesToComplete.map(exercise_id => ({
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
        setCompletedIds(prev => prev.filter(id => !exerciseIds.includes(id)));
        
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
    const { data, error } = await supabase
      .from('learning_path_exercise_completions')
      .select('exercise_id')
      .eq('user_id', user.id);
    if (!error && data) {
      setCompletedIds(data.map((c: any) => c.exercise_id));
    } else {
      setCompletedIds([]);
    }
    setCompletionsLoading(false);
  };

  // Fetch completions for the current user
  useEffect(() => {
    fetchCompletions();

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
            event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'learning_path_exercise_completions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('ProgressScreen: Realtime update received:', payload.eventType);
            fetchCompletions();
          }
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
        
        const completed = exerciseIds.filter(id => completedIds.includes(id)).length;
        return completed / exerciseIds.length * 100;
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
    return paths.filter(path => {
      // Skip filtering for "all" values or if path doesn't have the property
      const matchesVehicleType = categoryFilters.vehicle_type === 'all' || !path.vehicle_type || path.vehicle_type === categoryFilters.vehicle_type;
      const matchesTransmission = categoryFilters.transmission_type === 'all' || !path.transmission_type || path.transmission_type === categoryFilters.transmission_type;
      const matchesLicense = categoryFilters.license_type === 'all' || !path.license_type || path.license_type === categoryFilters.license_type; 
      const matchesExperience = categoryFilters.experience_level === 'all' || !path.experience_level || path.experience_level === categoryFilters.experience_level;
      const matchesPurpose = categoryFilters.purpose === 'all' || !path.purpose || path.purpose === categoryFilters.purpose;
      const matchesUserProfile = categoryFilters.user_profile === 'all' || !path.user_profile || path.user_profile === categoryFilters.user_profile;
      
      return matchesVehicleType && 
             matchesTransmission && 
             matchesLicense && 
             matchesExperience && 
             matchesPurpose && 
             matchesUserProfile;
    });
  }, [paths, categoryFilters]);

  useEffect(() => {
    fetchLearningPaths();
  }, []);

  useEffect(() => {
    if (selectedPathId && paths.length > 0) {
      const path = paths.find(p => p.id === selectedPathId);
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
          setExercises(data);
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
      setError(err instanceof Error ? err.message : 'An error occurred while fetching learning paths');
    } finally {
      setLoading(false);
    }
  };

  const handlePathPress = (path: LearningPath) => {
    setActivePath(path.id);
    setDetailPath(path);
    setShowDetailView(true);
  };

  // Calculate progress for each path from local state
  const getPathProgress = (pathId: string) => {
    // Only calculate for the currently loaded exercises if this is the active path
    if (activePath === pathId && exercises.length > 0) {
      const total = exercises.length;
      const completed = exercises.filter(ex => completedIds.includes(ex.id)).length;
      return total === 0 ? 0 : completed / total;
    }
    // For other paths, fallback to 0 (or you can cache if you want)
    return 0;
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
                    backgroundColor: categoryFilters[filterType] === option.value ? '#00E6C3' : '#222',
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
              <Text fontSize={16} color="#fff">Cancel</Text>
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
      <View style={{ width: videoWidth, height: videoHeight, marginVertical: 12, borderRadius: 8, overflow: 'hidden' }}>
        <WebView
          source={{ uri: `https://www.youtube.com/embed/${videoId}` }}
          style={{ flex: 1 }}
          allowsFullscreenVideo
          javaScriptEnabled
        />
      </View>
    );
  };

  // TypeForm Embed component 
  const TypeFormEmbed = ({ formId }: { formId: string }) => {
    const screenWidth = Dimensions.get('window').width;
    const formWidth = screenWidth - 48;
    const formHeight = 400;

    // Check if formId is a complete URL or just an ID
    const isCompleteUrl = formId.startsWith('http');
    
    // If it's a complete URL, use it directly
    // Otherwise, construct the URL or use embed HTML with data-tf-live
    const source = isCompleteUrl 
      ? { uri: formId } 
      : { 
          html: `
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body, html { margin: 0; padding: 0; height: 100%; width: 100%; }
                </style>
              </head>
              <body>
                <div data-tf-live="${formId}"></div>
                <script src="//embed.typeform.com/next/embed.js"></script>
              </body>
            </html>
          `
        };
    
    return (
      <View style={{ width: formWidth, height: formHeight, marginVertical: 12, borderRadius: 8, overflow: 'hidden' }}>
        <WebView
          source={source}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
        />
      </View>
    );
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string | undefined): string | null => {
    if (!url) return null;

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Extract TypeForm ID from embed code
  const getTypeformId = (embedCode: string | undefined): string | null => {
    if (!embedCode) return null;
    
    // Extract ID from element with data-tf-live attribute
    const tfMatch = embedCode.match(/data-tf-live="([^"]+)"/);
    return tfMatch ? tfMatch[1] : null;
  };

  // Render media for an exercise
  const renderExerciseMedia = (exercise: PathExercise) => {
    return (
      <YStack gap={16}>
        {/* YouTube Video */}
        {exercise.youtube_url && (
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>Video Tutorial</Text>
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
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>Reference Image</Text>
            <Image 
              source={{ uri: exercise.image }} 
              style={{ 
                width: '100%', 
                height: 200, 
                borderRadius: 8,
                resizeMode: 'cover'
              }} 
            />
          </YStack>
        )}

        {/* Embed (TypeForm) */}
        {exercise.embed_code && (() => {
          const formId = exercise.embed_code ? getTypeformId(exercise.embed_code) : null;
          return formId ? (
            <YStack>
              <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>Interactive Form</Text>
              <TypeFormEmbed formId={formId} />
            </YStack>
          ) : null;
        })()}
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
      <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center" padding={24}>
        <Text color="$red10" textAlign="center">{error}</Text>
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
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <TouchableOpacity onPress={() => setSelectedExercise(null)} style={{ marginBottom: 24 }}>
            <Feather name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text fontSize={28} fontWeight="bold" color="$color" marginBottom={8}>
            {selectedExercise.title?.[lang] || selectedExercise.title?.en || 'Untitled'}
          </Text>
          
          {selectedExercise.description?.[lang] && (
            <Text color="$gray11" marginBottom={16}>{selectedExercise.description[lang]}</Text>
          )}
          
          {/* Media Rendering Section */}
          {renderExerciseMedia(selectedExercise)}
          
          {/* Toggle done/not done button */}
          <TouchableOpacity
            onPress={() => toggleCompletion(selectedExercise.id)}
            style={{
              marginTop: 24,
              backgroundColor: isDone ? '#00E6C3' : '#222',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text color={isDone ? '$background' : '$color'} fontWeight="bold">
              {isDone ? 'Mark as Not Done' : 'Mark as Done'}
            </Text>
          </TouchableOpacity>
          
          {/* Additional details section */}
          <YStack gap={8} marginTop={16}>
            <Text color="$gray11">ID: {selectedExercise.id}</Text>
            <Text color="$gray11">Order: {selectedExercise.order_index}</Text>
            <Text color="$gray11">Created: {selectedExercise.created_at}</Text>
            <Text color="$gray11">Updated: {selectedExercise.updated_at}</Text>
            <Text color="$gray11">Language-specific media: {String(selectedExercise.language_specific_media)}</Text>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  if (showDetailView && detailPath) {
    // Calculate completion percentage for this path
    const completedCount = exercises.filter(ex => completedIds.includes(ex.id)).length;
    const totalCount = exercises.length;
    const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isFullyComplete = totalCount > 0 && completedCount === totalCount;
    
    return (
      <YStack flex={1} backgroundColor="$background">
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <TouchableOpacity onPress={() => setShowDetailView(false)} style={{ marginBottom: 24 }}>
            <Feather name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text fontSize={28} fontWeight="bold" color="$color" marginBottom={8}>
            {detailPath.title[lang]}
          </Text>
          <Text color="$gray11" marginBottom={16}>
            {detailPath.description[lang]}
          </Text>
          
          {/* Completion progress */}
          {totalCount > 0 && (
            <YStack marginTop={8} marginBottom={24}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={8}>
                <Text fontSize={18} fontWeight="bold" color="$color">Progress</Text>
                <Text fontSize={16} color={isFullyComplete ? '#00E6C3' : '$gray11'}>
                  {completedCount}/{totalCount} ({percentComplete}%)
                </Text>
              </XStack>
              <View style={{ 
                width: '100%', 
                height: 8, 
                backgroundColor: '#333', 
                borderRadius: 4, 
                overflow: 'hidden' 
              }}>
                <View style={{ 
                  width: `${percentComplete}%`, 
                  height: '100%', 
                  backgroundColor: '#00E6C3',
                  borderRadius: 4
                }} />
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
          
          {detailPath.icon && (
            <View style={{ marginTop: 16, marginBottom: 24 }}>
              <Feather name={detailPath.icon as any} size={24} color="#00E6C3" />
            </View>
          )}
          
          <Text fontSize={22} fontWeight="bold" color="$color" marginBottom={16}>
            Exercises
          </Text>
          
          {exercises.length === 0 ? (
            <Text color="$gray11">No exercises for this learning path.</Text>
          ) : (
            exercises.map((ex, idx) => {
              const isDone = completedIds.includes(ex.id);
              return (
                <TouchableOpacity key={ex.id} onPress={() => setSelectedExercise(ex)}>
                  <XStack alignItems="center" gap={12} marginBottom={16}>
                    <TouchableOpacity
                      onPress={e => {
                        e.stopPropagation();
                        toggleCompletion(ex.id);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isDone ? '#00E6C3' : '#888',
                        backgroundColor: isDone ? '#00E6C3' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                      }}
                    >
                      {isDone && <Feather name="check" size={20} color="#fff" />}
                    </TouchableOpacity>
                    <Card padding={16} borderRadius={16} backgroundColor="$backgroundStrong" flex={1}>
                      <Text fontSize={18} fontWeight="bold" color="$color">
                        {idx + 1}. {ex.title?.[lang] || ex.title?.en || 'Untitled'}
                      </Text>
                      {ex.description?.[lang] && (
                        <Text color="$gray11" marginTop={4}>{ex.description[lang]}</Text>
                      )}
                      {ex.youtube_url && ex.youtube_url.length > 0 && (
                        <Text color="$blue10" marginTop={4}>YouTube: {ex.youtube_url}</Text>
                      )}
                    </Card>
                  </XStack>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding={0}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {/* Category filters */}
        <YStack space={12} padding={16} backgroundColor="$backgroundStronger" borderRadius={16} marginBottom={24}>
          <Text fontSize={16} fontWeight="bold" color="$color">Filter Learning Paths</Text>

          <XStack flexWrap="wrap" gap={8} justifyContent="space-between">
            {Object.keys(categoryFilters).map((filterType) => {
              const type = filterType as CategoryType;
              // Skip if there are no options for this category type
              if (!categoryOptions[type] || categoryOptions[type].length <= 1) return null;
              
              // Find the selected option
              const selectedOption = categoryOptions[type].find(
                opt => opt.value === categoryFilters[type]
              );
              
              const displayValue = selectedOption 
                ? (selectedOption.label[lang] || selectedOption.label.en)
                : 'All';
              
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveFilterType(type)}
                  style={{
                    flexBasis: "48%",
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
            <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">No learning paths found</Text>
            <Text fontSize={16} color="$gray11" textAlign="center">
              Try adjusting your filter settings to see more learning paths.
            </Text>
          </YStack>
        ) : (
          filteredPaths.map((path, idx) => {
            const isActive = activePath === path.id;
            const percent = getPathProgress(path.id);
            // Enable if first path, or previous path is 100% complete
            const isEnabled = idx === 0 || getPathProgress(filteredPaths[idx - 1]?.id) === 1;
            // Visual highlight for the next path that is now enabled
            const isNextToUnlock = isEnabled && idx > 0 && getPathProgress(filteredPaths[idx - 1]?.id) === 1 && getPathProgress(path.id) < 1;
            return (
              <TouchableOpacity
                key={path.id}
                onPress={() => isEnabled && handlePathPress(path)}
                activeOpacity={isEnabled ? 0.8 : 1}
                style={{
                  marginBottom: 20,
                  opacity: isEnabled ? 1 : 0.5,
                  borderWidth: isNextToUnlock ? 3 : 0,
                  borderColor: isNextToUnlock ? '#00E6C3' : 'transparent',
                  borderRadius: 24,
                  shadowColor: isNextToUnlock ? '#00E6C3' : 'transparent',
                  shadowOpacity: isNextToUnlock ? 0.5 : 0,
                  shadowRadius: isNextToUnlock ? 12 : 0,
                  shadowOffset: { width: 0, height: 0 },
                }}
                disabled={!isEnabled}
              >
                <Card
                  backgroundColor={isActive ? "$blue5" : "$backgroundStrong"}
                  padding={20}
                  borderRadius={20}
                  elevate
                >
                  <XStack alignItems="center" gap={16}>
                    <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: isActive ? '#00E6C3' : '#222', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Progress circle with percent */}
                      <ProgressCircle percent={percent} size={40} color="#fff" bg={isActive ? '#00E6C3' : '#222'} />
                      <Text
                        style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, textAlign: 'center', textAlignVertical: 'center', lineHeight: 40 }}
                        color={isActive ? '$color' : '$gray11'}
                        fontWeight="bold"
                      >
                        {Math.round(percent * 100)}%
                      </Text>
                    </View>
                    <YStack flex={1}>
                      <Text fontSize={20} fontWeight={isActive ? 'bold' : '600'} color={isActive ? '$color' : '$gray11'}>
                        {idx + 1}. {path.title[lang]}
                      </Text>
                      <Text color="$gray11" fontSize={14} marginTop={2}>
                        {path.description[lang]}
                      </Text>
                      {path.vehicle_type && (
                        <XStack marginTop={4} gap={4} flexWrap="wrap">
                          {path.vehicle_type && (
                            <Text fontSize={12} color="$blue10">{path.vehicle_type}</Text>
                          )}
                        </XStack>
                      )}
                      {path.transmission_type && (
                        <XStack marginTop={4} gap={4} flexWrap="wrap">
                          {path.transmission_type && (
                            <Text fontSize={12} color="$blue10">• {path.transmission_type}</Text>
                          )}
                        </XStack>
                      )}
                      {path.license_type && (
                        <XStack marginTop={4} gap={4} flexWrap="wrap">
                          {path.license_type && (
                            <Text fontSize={12} color="$blue10">• {path.license_type}</Text>
                          )}
                        </XStack>
                      )}
                      {path.experience_level && (
                        <XStack marginTop={4} gap={4} flexWrap="wrap">
                          {path.experience_level && (
                            <Text fontSize={12} color="$blue10">• {path.experience_level}</Text>
                          )}
                        </XStack>
                      )}
                      {path.purpose && (
                        <XStack marginTop={4} gap={4} flexWrap="wrap">
                          {path.purpose && (
                            <Text fontSize={12} color="$blue10">• {path.purpose}</Text>
                          )}
                        </XStack>
                      )}
                      {path.user_profile && (
                        <XStack marginTop={4} gap={4} flexWrap="wrap">
                          {path.user_profile && (
                            <Text fontSize={12} color="$blue10">• {path.user_profile}</Text>
                          )}
                        </XStack>
                      )}
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