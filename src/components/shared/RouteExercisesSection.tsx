import React from 'react';
import { View } from 'react-native';
import { YStack, XStack, Text, Card, Button, Progress } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { RouteExerciseList } from '../RouteExerciseList';
import { useTranslation } from '../../contexts/TranslationContext';

interface Exercise {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  has_quiz?: boolean;
  quiz_data?: any;
}

interface ExerciseStats {
  completed: number;
  total: number;
  lastSessionAt?: string;
}

interface RouteExercisesSectionProps {
  exercises: Exercise[];
  exerciseStats?: ExerciseStats | null;
  completedExerciseIds: Set<string>;
  allExercisesCompleted: boolean;
  onStartExercises: () => void;
  onExercisePress: (exercise: Exercise, index: number) => void;
}

export function RouteExercisesSection({
  exercises,
  exerciseStats,
  completedExerciseIds,
  allExercisesCompleted,
  onStartExercises,
  onExercisePress,
}: RouteExercisesSectionProps) {
  const { t } = useTranslation();

  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
    return null;
  }

  return (
    <Card backgroundColor="$backgroundStrong" bordered padding="$4">
      <YStack gap="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$6" fontWeight="600" color="$color">
            {t('routeDetail.exercises')}
          </Text>
          <Button
            onPress={onStartExercises}
            backgroundColor="$blue10"
            icon={<Feather name="play" size={18} color="white" />}
            size="md"
          >
            <Text color="white" fontSize={14} fontWeight="600">
              {allExercisesCompleted
                ? t('routeDetail.reviewExercises')
                : t('routeDetail.startExercises')}
            </Text>
            {allExercisesCompleted && (
              <View
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                  marginLeft: 8,
                }}
              >
                <XStack alignItems="center" gap={2}>
                  <Feather name="check" size={10} color="white" />
                  <Text fontSize={10} color="white" fontWeight="600">
                    COMPLETED
                  </Text>
                </XStack>
              </View>
            )}
          </Button>
        </XStack>

        {/* Exercise List Preview */}
        <RouteExerciseList
          exercises={exercises}
          completedIds={completedExerciseIds}
          maxPreview={3}
          onExercisePress={onExercisePress}
        />

        {/* Exercise Statistics */}
        {exerciseStats && (
          <Card bordered padding="$3" backgroundColor="$gray2">
            <YStack gap="$2">
              <Text fontSize={12} fontWeight="600" color="$gray11">
                {t('routeDetail.yourProgress')}
              </Text>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={11} color="$gray11">
                  {t('routeDetail.completed')}: {exerciseStats.completed}/
                  {exerciseStats.total}
                </Text>
                <Text fontSize={11} color="$gray11">
                  {Math.round((exerciseStats.completed / exerciseStats.total) * 100)}%
                </Text>
              </XStack>
              <Progress
                value={Math.round(
                  (exerciseStats.completed / exerciseStats.total) * 100,
                )}
                backgroundColor="$gray6"
                size="$0.5"
              >
                <Progress.Indicator backgroundColor="$blue10" />
              </Progress>

              {exerciseStats.lastSessionAt && (
                <Text fontSize={10} color="$gray9" marginTop="$1">
                  {t('routeDetail.lastSession')}:{' '}
                  {new Date(exerciseStats.lastSessionAt).toLocaleDateString()}
                </Text>
              )}
            </YStack>
          </Card>
        )}
      </YStack>
    </Card>
  );
}
