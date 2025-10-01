import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, View, Dimensions, ScrollView } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { ExerciseListSheet } from './ExerciseListSheet';

const { width } = Dimensions.get('window');

interface RecentExercise {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  learning_path_id: string;
  learning_path_title: { en: string; sv: string };
  repeat_count?: number;
  order_index: number;
  completed_repeats: number;
  total_repeats: number;
  progress_percent: number;
  last_accessed: string;
  is_locked?: boolean;
  lock_password?: string | null;
}

interface JumpBackInSectionProps {
  activeUserId?: string;
}

export function JumpBackInSection({ activeUserId }: JumpBackInSectionProps) {
  const { user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { language: lang, t, refreshTranslations } = useTranslation();
  const colorScheme = useColorScheme();
  
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [selectedLearningPathId, setSelectedLearningPathId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  
  const effectiveUserId = activeUserId || activeStudentId || user?.id;
  
  // Refresh translations on mount to ensure latest translations are loaded
  useEffect(() => {
    refreshTranslations().catch(() => {
      // Silent fail on translation refresh
    });
  }, []);
  
  // Load recent exercises with progress
  const loadRecentExercises = useCallback(async () => {
    if (!effectiveUserId) return;
    
    try {
      setLoading(true);
      
      // Get recent exercise completions with progress data
      const { data: completions, error: completionsError } = await supabase
        .from('learning_path_exercise_completions')
        .select(`
          exercise_id,
          completed_at,
          learning_path_exercises!inner(
            id,
            title,
            description,
            icon,
            learning_path_id,
            order_index,
            repeat_count,
            is_locked,
            lock_password,
            learning_paths!inner(
              id,
              title
            )
          )
        `)
        .eq('user_id', effectiveUserId)
        .order('completed_at', { ascending: false })
        .limit(10);
        
      if (completionsError) {
        console.error('Error loading recent exercises:', completionsError);
        return;
      }
      
      // Get virtual repeat completions
      const { data: virtualCompletions, error: virtualError } = await supabase
        .from('virtual_repeat_completions')
        .select('exercise_id, repeat_number, created_at')
        .eq('user_id', effectiveUserId);
        
      if (virtualError) {
        console.error('Error loading virtual completions:', virtualError);
        return;
      }
      
      // Process the data to create recent exercises with progress
      const exerciseMap = new Map<string, RecentExercise>();
      
      // Process regular completions
      completions?.forEach((completion: any) => {
        const exercise = completion.learning_path_exercises;
        const learningPath = exercise.learning_paths;
        
        if (!exerciseMap.has(exercise.id)) {
          exerciseMap.set(exercise.id, {
            id: exercise.id,
            title: exercise.title,
            description: exercise.description,
            icon: exercise.icon,
            learning_path_id: exercise.learning_path_id,
            learning_path_title: learningPath.title,
            repeat_count: exercise.repeat_count || 1,
            order_index: exercise.order_index,
            completed_repeats: 0,
            total_repeats: exercise.repeat_count || 1,
            progress_percent: 0,
            last_accessed: completion.completed_at || new Date().toISOString(),
            is_locked: exercise.is_locked,
            lock_password: exercise.lock_password,
          });
        }
        
        const exerciseData = exerciseMap.get(exercise.id)!;
        exerciseData.completed_repeats += 1;
        exerciseData.progress_percent = exerciseData.completed_repeats / exerciseData.total_repeats;
        
        // Update last accessed time if this is more recent
        const completionTime = completion.completed_at || new Date().toISOString();
        if (new Date(completionTime) > new Date(exerciseData.last_accessed)) {
          exerciseData.last_accessed = completionTime;
        }
      });
      
      // Process virtual repeat completions
      virtualCompletions?.forEach((virtual: any) => {
        const exerciseId = virtual.exercise_id;
        if (exerciseMap.has(exerciseId)) {
          const exerciseData = exerciseMap.get(exerciseId)!;
          exerciseData.completed_repeats += 1;
          exerciseData.progress_percent = exerciseData.completed_repeats / exerciseData.total_repeats;
          
          // Update last accessed time if this is more recent
          if (new Date(virtual.created_at) > new Date(exerciseData.last_accessed)) {
            exerciseData.last_accessed = virtual.created_at;
          }
        }
      });
      
      // Convert to array, filter out completed exercises, and sort by last accessed
      const recentExercisesArray = Array.from(exerciseMap.values())
        .filter(exercise => exercise.progress_percent < 1) // Only show incomplete exercises
        .sort((a, b) => new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime())
        .slice(0, 3); // Show top 3 most recent
      
      setRecentExercises(recentExercisesArray);
      
    } catch (error) {
      console.error('Error loading recent exercises:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);
  
  useEffect(() => {
    loadRecentExercises();
  }, [loadRecentExercises]);
  
  const handleExercisePress = (exercise: RecentExercise) => {
    setSelectedLearningPathId(exercise.learning_path_id);
    setSelectedExerciseId(exercise.id);
    setShowExerciseSheet(true);
  };
  
  const handleSheetClose = () => {
    setShowExerciseSheet(false);
    setSelectedLearningPathId(null);
    setSelectedExerciseId(null);
    // Reload recent exercises to update progress
    loadRecentExercises();
  };
  
  if (loading) {
    return null;
  }
  
  if (recentExercises.length === 0) {
    return null;
  }
  
  return (
    <>
      <YStack marginBottom="$4">
        <Text fontSize="$5" fontWeight="bold" color="$color" marginBottom="$3" marginHorizontal="$4">
          {(() => {
            const translated = t('home.jumpBackIn');
            return translated === 'home.jumpBackIn' ? 'Jump back in' : translated;
          })()}
        </Text>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 32 }}
          decelerationRate="fast"
          snapToInterval={width * 0.8 + 16} // Card width + gap
          snapToAlignment="start"
        >
          {recentExercises.map((exercise, index) => (
            <TouchableOpacity
              key={exercise.id}
              onPress={() => handleExercisePress(exercise)}
              style={{ marginRight: index < recentExercises.length - 1 ? 16 : 0 }}
            >
              <Card
                padding="$4"
                borderRadius="$4"
                backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
                borderWidth={1}
                borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                shadowColor={colorScheme === 'dark' ? '#000' : '#000'}
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={colorScheme === 'dark' ? 0.3 : 0.1}
                shadowRadius={4}
                elevation={2}
                width={width * 0.8}
                minHeight={140}
              >
                <YStack gap="$3" flex={1}>
                  {/* Header with Icon and Status */}
                  <XStack alignItems="center" justifyContent="space-between">
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: exercise.progress_percent === 1 ? '#00E6C3' : '#4B6BFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {exercise.icon ? (
                        <Feather
                          name={exercise.icon as keyof typeof Feather.glyphMap}
                          size={20}
                          color="white"
                        />
                      ) : (
                        <Feather name="book-open" size={20} color="white" />
                      )}
                    </View>
                    
                    {exercise.progress_percent === 1 ? (
                      <Feather name="check-circle" size={20} color="#00E6C3" />
                    ) : exercise.is_locked ? (
                      <Feather name="lock" size={20} color="#FF9500" />
                    ) : (
                      <Feather name="play-circle" size={20} color="#4B6BFF" />
                    )}
                  </XStack>
                  
                  {/* Exercise Info */}
                  <YStack gap="$1" flex={1}>
                    <Text fontSize="$4" fontWeight="bold" color="$color" numberOfLines={2}>
                      {exercise.title[lang] || exercise.title.en}
                    </Text>
                    <Text fontSize="$2" color="$gray11" numberOfLines={1}>
                      {exercise.learning_path_title[lang] || exercise.learning_path_title.en}
                    </Text>
                  </YStack>
                  
                  {/* Progress Section */}
                  <YStack gap="$2">
                    {/* Progress Bar */}
                    <View
                      style={{
                        width: '100%',
                        height: 6,
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.round(exercise.progress_percent * 100)}%`,
                          height: '100%',
                          backgroundColor: exercise.progress_percent === 1 ? '#00E6C3' : '#4B6BFF',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    
                    {/* Progress Text */}
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$1" color="$gray11">
                        {exercise.completed_repeats}/{exercise.total_repeats} {exercise.total_repeats > 1 ? 'repeats' : 'completed'}
                      </Text>
                      <Text fontSize="$1" color="$gray11" fontWeight="600">
                        {Math.round(exercise.progress_percent * 100)}%
                      </Text>
                    </XStack>
                  </YStack>
                </YStack>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </YStack>
      
      {/* Exercise List Sheet */}
      {showExerciseSheet && selectedLearningPathId && (
        <ExerciseListSheet
          visible={showExerciseSheet}
          onClose={handleSheetClose}
          title={recentExercises.find(ex => ex.learning_path_id === selectedLearningPathId)?.learning_path_title[lang] || 
                 recentExercises.find(ex => ex.learning_path_id === selectedLearningPathId)?.learning_path_title.en || 
                 'Learning Path'}
          learningPathId={selectedLearningPathId}
          initialExerciseId={selectedExerciseId || undefined}
        />
      )}
    </>
  );
}
