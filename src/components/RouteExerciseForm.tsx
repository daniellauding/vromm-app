import React, { useState } from 'react';
import { YStack, XStack, Text, Card, Button, Input, TextArea } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { Exercise } from './RouteExerciseList';

interface RouteExerciseFormProps {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
}

export function RouteExerciseForm({ exercises, onChange }: RouteExerciseFormProps) {
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({});
  const [isAdding, setIsAdding] = useState(false);

  const handleAddExercise = () => {
    if (!newExercise.title?.trim()) {
      Alert.alert('Error', 'Please enter an exercise title');
      return;
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      title: newExercise.title.trim(),
      description: newExercise.description?.trim()
    };

    onChange([...exercises, exercise]);
    setNewExercise({});
    setIsAdding(false);
  };

  const handleRemoveExercise = (id: string) => {
    onChange(exercises.filter(ex => ex.id !== id));
  };

  return (
    <Card bordered elevate size="$4" padding="$4">
      <YStack space="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$6" fontWeight="bold">Exercises</Text>
          <Button
            icon={<Feather name={isAdding ? "minus" : "plus"} size={18} color="white" />}
            onPress={() => setIsAdding(!isAdding)}
            backgroundColor="$blue10"
            size="$3"
          />
        </XStack>

        {isAdding && (
          <Card bordered padding="$3">
            <YStack space="$3">
              <Input
                placeholder="Exercise title"
                value={newExercise.title}
                onChangeText={title => setNewExercise(prev => ({ ...prev, title }))}
              />
              <TextArea
                placeholder="Exercise description (optional)"
                value={newExercise.description}
                onChangeText={description => setNewExercise(prev => ({ ...prev, description }))}
                numberOfLines={3}
              />
              <XStack space="$2">
                <Button
                  flex={1}
                  onPress={() => {
                    setNewExercise({});
                    setIsAdding(false);
                  }}
                  backgroundColor="$gray5"
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  onPress={handleAddExercise}
                  backgroundColor="$blue10"
                >
                  Add Exercise
                </Button>
              </XStack>
            </YStack>
          </Card>
        )}

        <YStack space="$3">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              bordered
              padding="$3"
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
                  onPress={() => handleRemoveExercise(exercise.id)}
                  backgroundColor="$red10"
                  icon={<Feather name="trash-2" size={16} color="white" />}
                />
              </XStack>
            </Card>
          ))}
        </YStack>
      </YStack>
    </Card>
  );
} 