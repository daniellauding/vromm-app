import React, { useState, useEffect } from 'react';
import { Alert, TouchableOpacity, useColorScheme, View } from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Exercise } from '../types/route';
import ExerciseProgressService from '../services/exerciseProgressService';

interface RouteExerciseViewerProps {
  routeId: string;
  exercises: Exercise[];
  onExerciseComplete?: (exerciseId: string) => void;
}

export function RouteExerciseViewer({ 
  routeId, 
  exercises, 
  onExerciseComplete 
}: RouteExerciseViewerProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const [completions, setCompletions] = useState<Map<string, any>>(new Map());
  const [loadingCompletions, setLoadingCompletions] = useState<Set<string>>(new Set());

  // Load completion status for exercises
  useEffect(() => {
    if (exercises.length > 0) {
      loadCompletionStatus();
    }
  }, [exercises, routeId]);

  const loadCompletionStatus = async () => {
    try {
      const learningPathExerciseIds = exercises
        .filter(ex => ex.learning_path_exercise_id)
        .map(ex => ex.learning_path_exercise_id!);

      if (learningPathExerciseIds.length > 0) {
        const completionMap = await ExerciseProgressService.getRouteExerciseCompletions(
          routeId,
          learningPathExerciseIds
        );
        setCompletions(completionMap);
      }
    } catch (error) {
      console.error('Error loading completion status:', error);
    }
  };

  const handleCompleteExercise = async (exercise: Exercise) => {
    if (!exercise.learning_path_exercise_id) {
      Alert.alert('Info', 'This is a custom exercise. Completion tracking is only available for learning path exercises.');
      return;
    }

    setLoadingCompletions(prev => new Set([...prev, exercise.id]));

    try {
      let success = false;

      if (exercise.isRepeat && exercise.originalId && exercise.repeatNumber) {
        // Handle repeat exercise
        success = await ExerciseProgressService.completeRepeatExerciseFromRoute(
          exercise.learning_path_exercise_id,
          exercise.originalId,
          exercise.repeatNumber,
          routeId
        );
      } else {
        // Handle regular exercise
        success = await ExerciseProgressService.completeExerciseFromRoute(
          exercise.learning_path_exercise_id,
          routeId,
          {
            time_spent: 0, // Could be tracked
            completion_source: 'route'
          }
        );
      }

      if (success) {
        Alert.alert('Success', 'Exercise completed! This progress counts toward your learning path.');
        await loadCompletionStatus(); // Refresh completion status
        onExerciseComplete?.(exercise.id);
      } else {
        Alert.alert('Error', 'Failed to mark exercise as complete. Please try again.');
      }
    } catch (error) {
      console.error('Error completing exercise:', error);
      Alert.alert('Error', 'Failed to complete exercise. Please try again.');
    } finally {
      setLoadingCompletions(prev => {
        const newSet = new Set(prev);
        newSet.delete(exercise.id);
        return newSet;
      });
    }
  };

  const isExerciseCompleted = (exercise: Exercise): boolean => {
    if (!exercise.learning_path_exercise_id) return false;
    return completions.has(exercise.learning_path_exercise_id);
  };

  const isExerciseLoading = (exercise: Exercise): boolean => {
    return loadingCompletions.has(exercise.id);
  };

  if (exercises.length === 0) {
    return (
      <YStack alignItems="center" padding="$4">
        <Feather name="book-open" size={48} color="$gray9" />
        <Text fontSize={16} color="$gray11" textAlign="center" marginTop="$2">
          No exercises added to this route
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap="$3">
      <Text fontSize={18} fontWeight="bold">
        Exercises ({exercises.length})
      </Text>
      
      {exercises.map((exercise, index) => {
        const isCompleted = isExerciseCompleted(exercise);
        const isLoading = isExerciseLoading(exercise);
        const isLearningPathExercise = !!exercise.learning_path_exercise_id;

        return (
          <Card
            key={exercise.id}
            bordered
            padding="$3"
            backgroundColor={
              isCompleted 
                ? '$green1' 
                : isLearningPathExercise 
                  ? '$blue1' 
                  : '$background'
            }
            borderColor={
              isCompleted 
                ? '$green8' 
                : isLearningPathExercise 
                  ? '$blue8' 
                  : '$borderColor'
            }
          >
            <YStack gap="$3">
              {/* Exercise header */}
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack flex={1} gap="$1">
                  <XStack alignItems="center" gap="$2">
                    <Text fontSize={16} fontWeight="600">
                      {index + 1}. {exercise.title}
                    </Text>
                    
                    {/* Status badges */}
                    <XStack gap="$1">
                      {isCompleted && (
                        <View style={{
                          backgroundColor: '#10B981',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text fontSize={10} color="white" fontWeight="500">
                            COMPLETED
                          </Text>
                        </View>
                      )}
                      
                      {isLearningPathExercise && (
                        <View style={{
                          backgroundColor: '#3B82F6',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text fontSize={10} color="white" fontWeight="500">
                            LEARNING PATH
                          </Text>
                        </View>
                      )}
                      
                      {exercise.isRepeat && (
                        <View style={{
                          backgroundColor: '#F59E0B',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text fontSize={10} color="white" fontWeight="500">
                            REPEAT {exercise.repeatNumber || ''}
                          </Text>
                        </View>
                      )}
                      
                      {exercise.has_quiz && (
                        <View style={{
                          backgroundColor: '#8B5CF6',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text fontSize={10} color="white" fontWeight="500">
                            QUIZ
                          </Text>
                        </View>
                      )}
                      
                      {exercise.youtube_url && (
                        <View style={{
                          backgroundColor: '#EF4444',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text fontSize={10} color="white" fontWeight="500">
                            VIDEO
                          </Text>
                        </View>
                      )}
                    </XStack>
                  </XStack>
                  
                  {exercise.learning_path_title && (
                    <Text fontSize={12} color="$blue11">
                      From: {exercise.learning_path_title}
                    </Text>
                  )}
                </YStack>
                
                {/* Completion button */}
                {isLearningPathExercise && user && (
                  <Button
                    onPress={() => handleCompleteExercise(exercise)}
                    disabled={isCompleted || isLoading}
                    variant={isCompleted ? "secondary" : "primary"}
                    size="sm"
                    backgroundColor={isCompleted ? '$green5' : '$blue10'}
                  >
                    <XStack gap="$1" alignItems="center">
                      {isLoading ? (
                        <Feather name="loader" size={14} color="white" />
                      ) : isCompleted ? (
                        <Feather name="check" size={14} color="$green11" />
                      ) : (
                        <Feather name="circle" size={14} color="white" />
                      )}
                      <Text 
                        fontSize={12} 
                        color={isCompleted ? "$green11" : "white"}
                      >
                        {isCompleted ? 'Completed' : 'Complete'}
                      </Text>
                    </XStack>
                  </Button>
                )}
              </XStack>

              {/* Exercise description */}
              {exercise.description && (
                <Text fontSize={14} color="$gray11">
                  {exercise.description}
                </Text>
              )}

              {/* Exercise metadata */}
              <XStack gap="$3" alignItems="center" flexWrap="wrap">
                {exercise.duration && (
                  <XStack gap="$1" alignItems="center">
                    <Feather name="clock" size={12} color="$gray9" />
                    <Text fontSize={12} color="$gray9">
                      {exercise.duration}
                    </Text>
                  </XStack>
                )}
                
                {exercise.repetitions && (
                  <XStack gap="$1" alignItems="center">
                    <Feather name="repeat" size={12} color="$gray9" />
                    <Text fontSize={12} color="$gray9">
                      {exercise.repetitions}
                    </Text>
                  </XStack>
                )}
                
                {isLearningPathExercise && (
                  <XStack gap="$1" alignItems="center">
                    <Feather name="link" size={12} color="$gray9" />
                    <Text fontSize={12} color="$gray9">
                      Progress tracked
                    </Text>
                  </XStack>
                )}
              </XStack>

              {/* Video link if available */}
              {exercise.youtube_url && (
                <TouchableOpacity
                  onPress={() => {
                    // TODO: Open YouTube video
                    Alert.alert('Video', 'YouTube video integration coming soon!');
                  }}
                  style={{
                    backgroundColor: '#EF4444',
                    padding: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Feather name="play" size={16} color="white" />
                  <Text fontSize={14} color="white" fontWeight="500">
                    Watch Exercise Video
                  </Text>
                </TouchableOpacity>
              )}
            </YStack>
          </Card>
        );
      })}
      
      {/* Summary */}
      <Card bordered padding="$3" backgroundColor="$gray1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={14} color="$gray11">
            Exercise Progress
          </Text>
          <Text fontSize={14} fontWeight="500">
            {exercises.filter(ex => isExerciseCompleted(ex)).length} of {exercises.length} completed
          </Text>
        </XStack>
      </Card>
    </YStack>
  );
} 