import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { Exercise } from '../types/route';
import { useThemePreference } from '../hooks/useThemeOverride';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.7;
const CARD_GAP = 12;

// Helper function to extract text from multilingual fields
const getDisplayText = (
  text: string | { en: string; sv: string } | undefined,
  fallback: string = '',
): string => {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  return text.en || text.sv || fallback;
};

interface RouteExerciseListProps {
  exercises: Exercise[];
  completedIds?: Set<string>;
  learningPathCompletions?: Map<string, boolean>;
  maxPreview?: number;
  onExercisePress?: (exercise: Exercise, index: number) => void;
  /** 'horizontal' for card carousel, 'vertical' for list view */
  variant?: 'horizontal' | 'vertical';
}

export function RouteExerciseList({
  exercises,
  completedIds = new Set(),
  learningPathCompletions,
  maxPreview = 3,
  onExercisePress,
  variant = 'vertical',
}: RouteExerciseListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';

  const displayExercises = isExpanded ? exercises : exercises.slice(0, maxPreview);
  const remainingCount = exercises.length - maxPreview;

  const renderExerciseCard = (exercise: Exercise, index: number, isHorizontal: boolean) => {
    const isCompletedInRoute = completedIds.has(exercise.id);
    const isCompletedInLearningPath = learningPathCompletions?.get(exercise.id) || false;
    const isCompleted = isCompletedInRoute || isCompletedInLearningPath;

    return (
      <TouchableOpacity
        key={exercise.id || index}
        onPress={() => onExercisePress?.(exercise, index)}
        style={isHorizontal ? { width: CARD_WIDTH, marginRight: CARD_GAP } : undefined}
      >
        <Card
          backgroundColor={isDark ? '#1a1a1a' : '#FFFFFF'}
          borderColor={isDark ? '#333' : '#E5E5E5'}
          borderWidth={1}
          padding="$4"
          borderRadius={12}
          opacity={isCompletedInLearningPath && !isCompletedInRoute ? 0.85 : 1}
        >
          <YStack gap="$3">
            {/* Header Row with Number and Status */}
            <XStack justifyContent="space-between" alignItems="center">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isCompleted ? '#10B981' : isDark ? '#333' : '#E5E5E5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCompleted ? (
                  <Feather name="check" size={18} color="white" />
                ) : (
                  <Text fontSize={14} fontWeight="bold" color={isDark ? '#FFF' : '#1a1a1a'}>
                    {index + 1}
                  </Text>
                )}
              </View>

              <XStack alignItems="center" gap="$2">
                {!isCompleted && index === 0 && (
                  <View
                    style={{
                      backgroundColor: '#00FFBC',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text fontSize={11} color="#145251" fontWeight="700">
                      START HERE
                    </Text>
                  </View>
                )}
                <Feather name="chevron-right" size={20} color={isDark ? '#888' : '#666'} />
              </XStack>
            </XStack>

            {/* Title */}
            <Text
              fontSize={16}
              fontWeight="700"
              fontStyle="italic"
              color="$color"
              numberOfLines={2}
            >
              {getDisplayText(exercise.title, 'Untitled Exercise')}
            </Text>

            {/* Description */}
            {exercise.description && (
              <Text fontSize={14} color="$gray11" numberOfLines={2}>
                {getDisplayText(exercise.description)}
              </Text>
            )}

            {/* Badges Row */}
            <XStack gap="$2" flexWrap="wrap">
              {exercise.learning_path_exercise_id && (
                <View
                  style={{
                    backgroundColor: isDark ? '#1E3A5F' : '#EBF5FF',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text fontSize={10} color={isDark ? '#60A5FA' : '#3B82F6'} fontWeight="600">
                    LEARNING PATH
                  </Text>
                </View>
              )}
              {exercise.has_quiz && (
                <View
                  style={{
                    backgroundColor: isDark ? '#3C2A5F' : '#F3E8FF',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text fontSize={10} color={isDark ? '#A78BFA' : '#8B5CF6'} fontWeight="600">
                    QUIZ
                  </Text>
                </View>
              )}
              {exercise.youtube_url && (
                <View
                  style={{
                    backgroundColor: isDark ? '#5F2A2A' : '#FEE2E2',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text fontSize={10} color={isDark ? '#F87171' : '#EF4444'} fontWeight="600">
                    VIDEO
                  </Text>
                </View>
              )}
              {exercise.duration && (
                <View
                  style={{
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text fontSize={10} color="$gray11" fontWeight="600">
                    {exercise.duration} MIN
                  </Text>
                </View>
              )}
              {exercise.isRepeat && (
                <View
                  style={{
                    backgroundColor: isDark ? '#5F4A1F' : '#FEF3C7',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text fontSize={10} color={isDark ? '#FBBF24' : '#F59E0B'} fontWeight="600">
                    REPEAT {exercise.repeatNumber || ''}
                  </Text>
                </View>
              )}
            </XStack>

            {/* Completion Status */}
            {isCompleted && (
              <XStack alignItems="center" gap="$2" marginTop="$1">
                {isCompletedInRoute && (
                  <XStack alignItems="center" gap="$1">
                    <Feather name="check-circle" size={14} color="#10B981" />
                    <Text fontSize={11} color="#10B981" fontWeight="500">
                      Route
                    </Text>
                  </XStack>
                )}
                {isCompletedInLearningPath && exercise.learning_path_exercise_id && (
                  <XStack alignItems="center" gap="$1">
                    <Feather name="check-circle" size={14} color="#3B82F6" />
                    <Text fontSize={11} color="#3B82F6" fontWeight="500">
                      Learning Path
                    </Text>
                  </XStack>
                )}
              </XStack>
            )}
          </YStack>
        </Card>
      </TouchableOpacity>
    );
  };

  // Horizontal card carousel view
  if (variant === 'horizontal') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
      >
        {exercises.map((exercise, index) => renderExerciseCard(exercise, index, true))}
      </ScrollView>
    );
  }

  // Vertical list view (default)
  return (
    <YStack gap="$3">
      {displayExercises.map((exercise, index) => renderExerciseCard(exercise, index, false))}

      {remainingCount > 0 && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: 4,
            paddingVertical: 12,
            alignItems: 'center',
            backgroundColor: isDark ? '#1a1a1a' : '#F9FAFB',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#E5E5E5',
            borderStyle: 'dashed',
          }}
        >
          <XStack alignItems="center" gap={8}>
            <Text fontSize={13} color="$gray11" fontWeight="500">
              {isExpanded ? 'Show less' : `And ${remainingCount} more exercises...`}
            </Text>
            <Feather
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={isDark ? '#888' : '#666'}
            />
          </XStack>
        </TouchableOpacity>
      )}
    </YStack>
  );
}
