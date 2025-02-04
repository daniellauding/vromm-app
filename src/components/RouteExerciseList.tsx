import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Exercise } from '../types/route';

interface RouteExerciseListProps {
  routeId: string;
  exercises: Exercise[];
}

export function RouteExerciseList({ routeId, exercises }: RouteExerciseListProps) {
  const { user } = useAuth();
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id && routeId) {
      loadCompletedExercises();
    }
  }, [user?.id, routeId]);

  const loadCompletedExercises = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('route_exercise_completions')
        .select('exercise_id')
        .eq('route_id', routeId)
        .eq('user_id', user.id);

      if (error) throw error;
      setCompletedExercises(data.map(item => item.exercise_id));
    } catch (err) {
      console.error('Error loading completed exercises:', err);
    }
  };

  const handleToggleExercise = async (exerciseId: string) => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const isCompleted = completedExercises.includes(exerciseId);

      if (isCompleted) {
        // Remove completion
        await supabase
          .from('route_exercise_completions')
          .delete()
          .eq('route_id', routeId)
          .eq('exercise_id', exerciseId)
          .eq('user_id', user.id);

        setCompletedExercises(prev => prev.filter(id => id !== exerciseId));
      } else {
        // Add completion
        await supabase
          .from('route_exercise_completions')
          .insert({
            route_id: routeId,
            exercise_id: exerciseId,
            user_id: user.id,
            completed_at: new Date().toISOString()
          });

        setCompletedExercises(prev => [...prev, exerciseId]);
      }
    } catch (err) {
      console.error('Error toggling exercise completion:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!exercises?.length) return null;

  return (
    <Card bordered elevate size="$4" padding="$4">
      <YStack space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$6" fontWeight="bold">Exercises</Text>
          <Text fontSize="$4" color="$gray11">
            {completedExercises.length}/{exercises.length} completed
          </Text>
        </XStack>

        <YStack space="$3">
          {exercises.map((exercise) => {
            const isCompleted = completedExercises.includes(exercise.id);
            return (
              <Card
                key={exercise.id}
                bordered
                padding="$3"
                backgroundColor={isCompleted ? '$green2' : undefined}
              >
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1} space="$1">
                    <Text fontSize="$5" fontWeight="500">
                      {exercise.title}
                    </Text>
                    {exercise.description && (
                      <Text fontSize="$4" color="$gray11">
                        {exercise.description}
                      </Text>
                    )}
                  </YStack>
                  <Button
                    size="$2"
                    onPress={() => handleToggleExercise(exercise.id)}
                    backgroundColor={isCompleted ? '$green10' : '$blue10'}
                    icon={<Feather name={isCompleted ? "check" : "circle"} size={16} color="white" />}
                    disabled={loading}
                  />
                </XStack>
              </Card>
            );
          })}
        </YStack>
      </YStack>
    </Card>
  );
} 