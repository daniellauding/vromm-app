import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { Exercise } from '../types/route';

// Helper function to extract text from multilingual fields
const getDisplayText = (text: string | { en: string; sv: string } | undefined, fallback: string = ''): string => {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  return text.en || text.sv || fallback;
};

interface RouteExerciseListProps {
  exercises: Exercise[];
  completedIds?: Set<string>;
  maxPreview?: number;
  onExercisePress?: (exercise: Exercise, index: number) => void;
}

export function RouteExerciseList({ 
  exercises, 
  completedIds = new Set(),
  maxPreview = 3,
  onExercisePress
}: RouteExerciseListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayExercises = isExpanded ? exercises : exercises.slice(0, maxPreview);
  const remainingCount = exercises.length - maxPreview;

  return (
    <YStack gap="$2">
      {displayExercises.map((exercise, index) => (
        <TouchableOpacity
          key={exercise.id || index}
          onPress={() => onExercisePress?.(exercise, index)}
        >
          <Card bordered padding="$3" backgroundColor="$background">
            <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1} gap="$1">
              <Text fontSize={14} fontWeight="600" color="$color">
                {getDisplayText(exercise.title, 'Untitled Exercise')}
              </Text>
              {exercise.description && (
                <Text fontSize={12} color="$gray11" numberOfLines={1}>
                  {getDisplayText(exercise.description)}
                </Text>
              )}
              
              {/* Exercise badges */}
              <XStack gap="$1" flexWrap="wrap">
                {exercise.source === 'learning_path' && (
                  <View style={{
                    backgroundColor: '#3B82F6',
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text fontSize={9} color="white" fontWeight="500">
                      LEARNING PATH
                    </Text>
                  </View>
                )}
                {exercise.has_quiz && (
                  <View style={{
                    backgroundColor: '#8B5CF6',
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text fontSize={9} color="white" fontWeight="500">QUIZ</Text>
                  </View>
                )}
                {exercise.youtube_url && (
                  <View style={{
                    backgroundColor: '#EF4444',
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text fontSize={9} color="white" fontWeight="500">VIDEO</Text>
                  </View>
                )}
                {exercise.isRepeat && (
                  <View style={{
                    backgroundColor: '#F59E0B',
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text fontSize={9} color="white" fontWeight="500">
                      REPEAT {exercise.repeatNumber || ''}
                    </Text>
                  </View>
                )}
              </XStack>
            </YStack>
            
            <XStack alignItems="center" gap="$2">
              {completedIds.has(exercise.id) && (
                <Feather name="check-circle" size={20} color="#10B981" />
              )}
              <Feather name="chevron-right" size={16} color="$gray9" />
            </XStack>
          </XStack>
          </Card>
        </TouchableOpacity>
      ))}
      
      {remainingCount > 0 && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: 8,
            padding: 8,
            alignItems: 'center',
          }}
        >
          <XStack alignItems="center" gap={8}>
            <Text fontSize={12} color="#4B6BFF" textAlign="center" fontWeight="500">
              {isExpanded 
                ? 'Show less exercises' 
                : `And ${remainingCount} more exercises...`}
            </Text>
            <Feather 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={14} 
              color="#4B6BFF" 
            />
          </XStack>
        </TouchableOpacity>
      )}
    </YStack>
  );
} 