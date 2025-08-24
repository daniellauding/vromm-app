import React, { useState } from 'react';
import { View } from 'react-native';
import { YStack, XStack, Text, Button, Separator, Heading, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { ExerciseSelector, RouteExercise } from '../ExerciseSelector';
import { AdvancedExerciseCreator } from '../AdvancedExerciseCreator';
import { useAuth } from '../../context/AuthContext';

interface Exercise {
  id: string;
  title: string | { en: string; sv: string };
  description: string | { en: string; sv: string };
  duration?: string;
  repetitions?: string;
  source: 'learning_path' | 'custom';
  has_quiz?: boolean;
  quiz_data?: any;
  youtube_url?: string;
  learning_path_title?: string;
  isRepeat?: boolean;
  repeatNumber?: number;
  // Additional fields for compatibility
  learning_path_exercise_id?: string;
  learning_path_id?: string;
  icon?: string;
  image?: string;
  embed_code?: string;
  quiz_required?: boolean;
  originalId?: string;
  is_user_generated?: boolean;
  visibility?: string;
  category?: string;
  difficulty_level?: string;
  vehicle_type?: string;
  creator_id?: string;
  created_at?: string;
  promotion_status?: string;
  quality_score?: number;
  rating?: number;
  rating_count?: number;
  completion_count?: number;
  report_count?: number;
}

interface RouteExerciseSelectorProps {
  exercises: Exercise[];
  onExercisesChange: (exercises: Exercise[]) => void;
  compact?: boolean; // For wizard mode
  maxHeight?: number; // For wizard mode
}

export function RouteExerciseSelector({
  exercises,
  onExercisesChange,
  compact = false,
  maxHeight,
}: RouteExerciseSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showAdvancedExerciseCreator, setShowAdvancedExerciseCreator] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Helper function for translation fallback
  const getTranslation = (t: (key: string) => string, key: string, fallback: string): string => {
    const translation = t(key);
    return translation === key ? fallback : translation;
  };

  const handleExercisesChange = (updatedExercises: RouteExercise[]) => {
    // Convert RouteExercise[] to Exercise[] for compatibility
    const convertedExercises: Exercise[] = updatedExercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      description: ex.description,
      duration: ex.duration,
      repetitions: ex.repetitions,
      learning_path_exercise_id: ex.learning_path_exercise_id,
      learning_path_id: ex.learning_path_id,
      learning_path_title: ex.learning_path_title,
      youtube_url: ex.youtube_url,
      icon: ex.icon,
      image: ex.image,
      embed_code: ex.embed_code,
      has_quiz: ex.has_quiz,
      quiz_required: ex.quiz_required,
      isRepeat: ex.isRepeat,
      originalId: ex.originalId,
      repeatNumber: ex.repeatNumber,
      source: ex.source,
    }));

    onExercisesChange(convertedExercises);
  };

  const handleRemoveExercise = (id: string) => {
    const updatedExercises = exercises.filter((ex) => ex.id !== id);
    onExercisesChange(updatedExercises);
  };

  const handleEditExercise = (exercise: Exercise) => {
    if (exercise.source === 'custom') {
      console.log('📝 [RouteExerciseSelector] Editing custom exercise:', {
        id: exercise.id,
        title: exercise.title,
        has_quiz: exercise.has_quiz,
        quiz_data: exercise.quiz_data,
      });

      // Remove the exercise from the list temporarily
      handleRemoveExercise(exercise.id);
      setEditingExercise(exercise);
      setShowAdvancedExerciseCreator(true);
    }
  };

  const handleAdvancedExerciseCreated = (exercise: any) => {
    const isEditing = !!editingExercise;

    console.log('🔧 [RouteExerciseSelector] Advanced exercise created/updated:', {
      isEditing,
      originalId: editingExercise?.id,
      has_quiz: exercise.has_quiz,
      quiz_data: !!exercise.quiz_data,
    });

    const newExercise: Exercise = {
      id: isEditing ? editingExercise.id : Date.now().toString(),
      title: typeof exercise.title === 'string' ? exercise.title : exercise.title.en,
      description:
        typeof exercise.description === 'string'
          ? exercise.description
          : exercise.description?.en || '',
      duration: exercise.duration,
      repetitions: exercise.repetitions,
      source: 'custom',
      is_user_generated: true,
      visibility: exercise.visibility || 'private',
      category: exercise.category || 'user-created',
      difficulty_level: exercise.difficulty_level || 'beginner',
      vehicle_type: exercise.vehicle_type || 'both',
      creator_id: user?.id,
      created_at: isEditing ? editingExercise.created_at : new Date().toISOString(),
      promotion_status: 'none',
      quality_score: 0,
      rating: 0,
      rating_count: 0,
      completion_count: 0,
      report_count: 0,
      youtube_url: exercise.youtube_url,
      embed_code: exercise.embed_code,
      has_quiz: exercise.has_quiz,
      quiz_required: exercise.quiz_required,
      quiz_data: exercise.quiz_data,
    };

    onExercisesChange([...exercises, newExercise]);
    setShowAdvancedExerciseCreator(false);
    setEditingExercise(null);
  };

  const containerStyle = compact
    ? { maxHeight: maxHeight || 400, overflow: 'hidden' }
    : {};

  return (
    <YStack gap="$4" style={containerStyle}>
      {!compact && (
        <>
          <Heading>{getTranslation(t, 'createRoute.exercises', 'Exercises')}</Heading>
          <Text size="sm" color="$gray11">
            Add exercises from learning paths or create custom ones
          </Text>
        </>
      )}

      {/* Learning Path Exercises Selector */}
      <YStack gap="$3">
        {!compact && <Heading size="$4">From Learning Paths</Heading>}
        <Button
          onPress={() => setShowExerciseSelector(true)}
          variant="secondary"
          size={compact ? "md" : "lg"}
          backgroundColor="$green5"
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="book-open" size={compact ? 16 : 18} color="$green11" />
            <Text color="$green11" fontWeight="500" fontSize={compact ? "$3" : undefined}>
              {compact ? 'Learning Paths' : 'Select from Learning Paths'} (
              {exercises.filter((ex) => ex.source === 'learning_path').length}{' '}
              selected)
            </Text>
          </XStack>
        </Button>
      </YStack>

      <Separator marginVertical={compact ? "$2" : "$4"} />

      {/* Advanced Custom Exercise Creator */}
      <YStack gap="$3">
        {!compact && (
          <>
            <Heading size="$4">Create Custom Exercise</Heading>
            <Text size="sm" color="$gray11">
              Create rich, feature-complete exercises with multimedia support, quizzes,
              and multilingual content
            </Text>
          </>
        )}

        <Button
          onPress={() => setShowAdvancedExerciseCreator(true)}
          variant="secondary"
          size={compact ? "md" : "lg"}
          backgroundColor="$blue5"
          marginTop={compact ? "$1" : "$2"}
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="plus-circle" size={compact ? 16 : 20} color="$blue11" />
            <Text color="$blue11" fontWeight="500" fontSize={compact ? "$3" : undefined}>
              {compact ? 'Custom Exercise' : 'Create Advanced Exercise'}
            </Text>
          </XStack>
        </Button>

        {!compact && (
          <YStack gap="$2" marginTop="$2">
            <Text size="sm" color="$green11" fontWeight="500">
              🎯 Features Available:
            </Text>
            <Text size="xs" color="$gray11">
              ✅ Photos, Videos & YouTube integration • ✅ Interactive quizzes & embeds
            </Text>
            <Text size="xs" color="$gray11">
              ✅ Public/Private visibility • ✅ Categories & difficulty levels
            </Text>
            <Text size="xs" color="$gray11">
              ✅ Multilingual support (EN/SV) • ✅ Rich descriptions & instructions
            </Text>
          </YStack>
        )}
      </YStack>

      <Separator marginVertical={compact ? "$2" : "$4"} />

      {/* Selected Exercises List */}
      {exercises.length > 0 ? (
        <YStack gap="$4">
          <Text size={compact ? "md" : "lg"} weight="bold">
            Selected Exercises ({exercises.length})
          </Text>
          <YStack gap={compact ? "$2" : "$4"} maxHeight={compact ? 200 : undefined}>
            {exercises.map((exercise) => (
              <Card
                key={exercise.id}
                bordered
                padding={compact ? "$2" : "$3"}
                backgroundColor={
                  exercise.source === 'learning_path' ? '$green1' : '$background'
                }
                borderColor={
                  exercise.source === 'learning_path' ? '$green8' : '$borderColor'
                }
              >
                <YStack gap={compact ? "$1" : "$2"}>
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1} gap="$1">
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text size={compact ? "sm" : "lg"} weight="medium" numberOfLines={compact ? 2 : undefined}>
                          {typeof exercise.title === 'string' ? exercise.title : exercise.title.en || exercise.title}
                        </Text>
                        
                        {exercise.source === 'learning_path' && (
                          <View
                            style={{
                              backgroundColor: '#10B981',
                              paddingHorizontal: compact ? 4 : 6,
                              paddingVertical: 2,
                              borderRadius: compact ? 6 : 8,
                            }}
                          >
                            <Text fontSize={compact ? 8 : 10} color="white" fontWeight="500">
                              LEARNING PATH
                            </Text>
                          </View>
                        )}
                        
                        {exercise.has_quiz && (
                          <View
                            style={{
                              backgroundColor: '#3B82F6',
                              paddingHorizontal: compact ? 4 : 6,
                              paddingVertical: 2,
                              borderRadius: compact ? 6 : 8,
                            }}
                          >
                            <Text fontSize={compact ? 8 : 10} color="white" fontWeight="500">
                              QUIZ
                            </Text>
                          </View>
                        )}
                      </XStack>

                      {!compact && exercise.learning_path_title && (
                        <Text size="sm" color="$green11">
                          From: {exercise.learning_path_title}
                        </Text>
                      )}
                    </YStack>

                    <XStack gap="$2">
                      {exercise.source === 'custom' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => handleEditExercise(exercise)}
                          backgroundColor="$blue5"
                        >
                          <Feather name="edit-3" size={compact ? 12 : 16} color="$blue10" />
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleRemoveExercise(exercise.id)}
                        backgroundColor="$red5"
                      >
                        <Feather name="trash-2" size={compact ? 12 : 16} color="$red10" />
                      </Button>
                    </XStack>
                  </XStack>

                  {!compact && exercise.description && (
                    <Text color="$gray11" numberOfLines={2}>
                      {typeof exercise.description === 'string' ? exercise.description : exercise.description.en || exercise.description}
                    </Text>
                  )}

                  {!compact && (
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

                      {exercise.source === 'learning_path' && (
                        <XStack gap="$1" alignItems="center">
                          <Feather name="link" size={14} color="$gray11" />
                          <Text size="sm" color="$gray11">
                            Linked to Learning Path
                          </Text>
                        </XStack>
                      )}
                    </XStack>
                  )}
                </YStack>
              </Card>
            ))}
          </YStack>
        </YStack>
      ) : (
        <Text color="$gray11" textAlign="center" fontSize={compact ? "$3" : undefined}>
          {getTranslation(t, 'createRoute.noExercises', 'No exercises added yet')}
        </Text>
      )}

      {/* Exercise Selector Modal */}
      <ExerciseSelector
        visible={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        selectedExercises={exercises as RouteExercise[]}
        onExercisesChange={handleExercisesChange}
      />

      {/* Advanced Exercise Creator Modal */}
      <AdvancedExerciseCreator
        visible={showAdvancedExerciseCreator}
        onClose={() => {
          // If we were editing an exercise and user cancels, restore the original exercise
          if (editingExercise) {
            console.log(
              '📝 [RouteExerciseSelector] User cancelled edit - restoring original exercise:',
              editingExercise.id,
            );
            onExercisesChange([...exercises, editingExercise]);
          }
          setShowAdvancedExerciseCreator(false);
          setEditingExercise(null);
        }}
        onExerciseCreated={handleAdvancedExerciseCreated}
        initialData={editingExercise}
      />
    </YStack>
  );
}
