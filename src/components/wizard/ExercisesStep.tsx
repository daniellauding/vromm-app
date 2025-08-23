import React, { useState, useCallback } from 'react';
import { YStack, XStack, Text, Button, Card, View } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { WizardRouteData } from '../RouteCreationWizard';
import { ExerciseSelector, RouteExercise } from '../ExerciseSelector';
import { AdvancedExerciseCreator } from '../AdvancedExerciseCreator';

interface ExercisesStepProps {
  data: WizardRouteData;
  onUpdate: (updates: Partial<WizardRouteData>) => void;
}

export function ExercisesStep({ data, onUpdate }: ExercisesStepProps) {
  const { t } = useTranslation();
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showAdvancedCreator, setShowAdvancedCreator] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);

  const handleExercisesChange = useCallback((exercises: RouteExercise[]) => {
    onUpdate({ exercises });
  }, [onUpdate]);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    const newExercises = data.exercises.filter(ex => ex.id !== exerciseId);
    onUpdate({ exercises: newExercises });
  }, [data.exercises, onUpdate]);

  const handleEditExercise = useCallback((exercise: any) => {
    if (exercise.source === 'custom') {
      handleRemoveExercise(exercise.id);
      setEditingExercise(exercise);
      setShowAdvancedCreator(true);
    }
  }, [handleRemoveExercise]);

  const handleAdvancedExerciseCreated = useCallback((exercise: any) => {
    const isEditing = !!editingExercise;
    
    const newExercise = {
      id: isEditing ? editingExercise.id : Date.now().toString(),
      title: typeof exercise.title === 'string' ? exercise.title : exercise.title.en,
      description: typeof exercise.description === 'string' ? exercise.description : exercise.description?.en || '',
      duration: exercise.duration,
      repetitions: exercise.repetitions,
      source: 'custom',
      has_quiz: exercise.has_quiz,
      quiz_data: exercise.quiz_data,
      youtube_url: exercise.youtube_url,
      embed_code: exercise.embed_code,
      visibility: exercise.visibility || 'private',
      category: exercise.category || 'user-created',
      difficulty_level: exercise.difficulty_level || 'beginner',
      vehicle_type: exercise.vehicle_type || 'both',
    };

    onUpdate({
      exercises: [...data.exercises, newExercise],
    });
    
    setShowAdvancedCreator(false);
    setEditingExercise(null);
  }, [editingExercise, data.exercises, onUpdate]);

  return (
    <>
      <YStack flex={1} padding="$4" gap="$6">
        {/* Header */}
        <YStack gap="$2">
          <Text size="lg" fontWeight="600" color="$color">
            Add learning exercises
          </Text>
          <Text size="sm" color="$gray11">
            Help drivers practice and learn with your route (optional)
          </Text>
        </YStack>

        {/* Exercise Options */}
        <YStack gap="$4">
          {/* Learning Path Exercises */}
          <YStack gap="$3">
            <Text size="md" fontWeight="500" color="$color">
              From Learning Paths
            </Text>
            <Button
              onPress={() => setShowExerciseSelector(true)}
              variant="secondary"
              size="lg"
              backgroundColor="$green5"
            >
              <XStack gap="$2" alignItems="center">
                <Feather name="book-open" size={18} color="$green11" />
                <Text color="$green11" fontWeight="500">
                  Select from Learning Paths ({data.exercises.filter(ex => ex.source === 'learning_path').length} selected)
                </Text>
              </XStack>
            </Button>
          </YStack>

          {/* Custom Exercise Creator */}
          <YStack gap="$3">
            <Text size="md" fontWeight="500" color="$color">
              Create Custom Exercise
            </Text>
            <Text size="sm" color="$gray11">
              Create rich exercises with multimedia, quizzes, and multilingual content
            </Text>
            
            <Button
              onPress={() => setShowAdvancedCreator(true)}
              variant="secondary"
              size="lg"
              backgroundColor="$blue5"
            >
              <XStack gap="$2" alignItems="center">
                <Feather name="plus-circle" size={20} color="$blue11" />
                <Text color="$blue11" fontWeight="500">
                  Create Advanced Exercise
                </Text>
              </XStack>
            </Button>

            {/* Features list */}
            <YStack gap="$2" backgroundColor="$blue2" padding="$3" borderRadius="$2">
              <Text size="sm" color="$blue11" fontWeight="500">
                🎯 Available Features:
              </Text>
              <Text size="xs" color="$blue10">
                ✅ Photos, Videos & YouTube • ✅ Interactive quizzes & embeds
              </Text>
              <Text size="xs" color="$blue10">
                ✅ Public/Private visibility • ✅ Categories & difficulty levels
              </Text>
              <Text size="xs" color="$blue10">
                ✅ Multilingual support (EN/SV) • ✅ Rich descriptions
              </Text>
            </YStack>
          </YStack>
        </YStack>

        {/* Selected Exercises */}
        {data.exercises.length > 0 && (
          <YStack gap="$3">
            <Text size="md" fontWeight="500" color="$color">
              Selected Exercises ({data.exercises.length})
            </Text>
            
            <YStack gap="$2" maxHeight={400} overflow="scroll">
              {data.exercises.map((exercise) => (
                <Card
                  key={exercise.id}
                  bordered
                  padding="$3"
                  backgroundColor={exercise.source === 'learning_path' ? '$green1' : '$background'}
                  borderColor={exercise.source === 'learning_path' ? '$green8' : '$borderColor'}
                >
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="flex-start">
                      <YStack flex={1} gap="$1">
                        <XStack alignItems="center" gap="$2">
                          <Text size="md" fontWeight="500">
                            {exercise.title}
                          </Text>
                          
                          {/* Exercise badges */}
                          {exercise.source === 'learning_path' && (
                            <View style={{
                              backgroundColor: '#10B981',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                            }}>
                              <Text fontSize={10} color="white" fontWeight="500">
                                LEARNING PATH
                              </Text>
                            </View>
                          )}
                          
                          {exercise.has_quiz && (
                            <View style={{
                              backgroundColor: '#3B82F6',
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

                        {exercise.learning_path_title && (
                          <Text size="sm" color="$green11">
                            From: {exercise.learning_path_title}
                          </Text>
                        )}
                      </YStack>

                      {/* Action buttons */}
                      <XStack gap="$2">
                        {exercise.source === 'custom' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={() => handleEditExercise(exercise)}
                            backgroundColor="$blue5"
                          >
                            <Feather name="edit-3" size={16} color="$blue10" />
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => handleRemoveExercise(exercise.id)}
                          backgroundColor="$red5"
                        >
                          <Feather name="trash-2" size={16} color="$red10" />
                        </Button>
                      </XStack>
                    </XStack>

                    {exercise.description && (
                      <Text size="sm" color="$gray11">
                        {exercise.description}
                      </Text>
                    )}

                    {/* Exercise details */}
                    <XStack gap="$3" alignItems="center" flexWrap="wrap">
                      {exercise.duration && (
                        <XStack gap="$1" alignItems="center">
                          <Feather name="clock" size={14} color="$gray11" />
                          <Text size="sm" color="$gray11">
                            {exercise.duration}
                          </Text>
                        </XStack>
                      )}
                      
                      {exercise.repetitions && (
                        <XStack gap="$1" alignItems="center">
                          <Feather name="repeat" size={14} color="$gray11" />
                          <Text size="sm" color="$gray11">
                            {exercise.repetitions}
                          </Text>
                        </XStack>
                      )}
                    </XStack>
                  </YStack>
                </Card>
              ))}
            </YStack>
          </YStack>
        )}

        {/* Tips */}
        {data.exercises.length === 0 && (
          <YStack gap="$2" backgroundColor="$gray2" padding="$3" borderRadius="$2">
            <Text size="sm" fontWeight="500" color="$gray11">
              💡 Exercise Tips
            </Text>
            <YStack gap="$1">
              <Text size="xs" color="$gray10">
                • Add exercises that match your route's difficulty level
              </Text>
              <Text size="xs" color="$gray10">
                • Include both theory and practical exercises
              </Text>
              <Text size="xs" color="$gray10">
                • Consider adding quizzes to test understanding
              </Text>
              <Text size="xs" color="$gray10">
                • This step is optional - you can skip if you prefer
              </Text>
            </YStack>
          </YStack>
        )}
      </YStack>

      {/* Exercise Selector Modal */}
      <ExerciseSelector
        visible={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        selectedExercises={data.exercises as RouteExercise[]}
        onExercisesChange={handleExercisesChange}
      />

      {/* Advanced Exercise Creator Modal */}
      <AdvancedExerciseCreator
        visible={showAdvancedCreator}
        onClose={() => {
          if (editingExercise) {
            onUpdate({
              exercises: [...data.exercises, editingExercise],
            });
          }
          setShowAdvancedCreator(false);
          setEditingExercise(null);
        }}
        onExerciseCreated={handleAdvancedExerciseCreated}
        initialData={editingExercise}
      />
    </>
  );
}
