import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Dimensions,
  useColorScheme,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { YStack, XStack, Card, Progress, Button } from 'tamagui';
import { Text } from '../components/Text';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Exercise } from '../types/route';
import { ExerciseProgressService } from '../services/exerciseProgressService';
import { WebView } from 'react-native-webview';

// Helper function to extract text from multilingual fields
const getDisplayText = (
  text: string | { en: string; sv: string } | undefined,
  fallback: string = '',
): string => {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  return text.en || text.sv || fallback;
};

type RouteExerciseScreenProps = {
  route: {
    params: {
      routeId: string;
      exercises: Exercise[];
      routeName?: string;
      startIndex?: number; // Allow starting at a specific exercise
    };
  };
};

interface ExerciseSession {
  id: string;
  route_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  exercises_completed: number;
  current_exercise_index: number;
}

interface ExerciseCompletion {
  exercise_id: string;
  completed_at: string;
  session_id: string;
  user_id: string;
}

interface QuizQuestion {
  id: string;
  exercise_id: string;
  question_text: { en: string; sv: string };
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  order_index: number;
  explanation_text?: { en: string; sv: string };
  answers: QuizAnswer[];
}

interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: { en: string; sv: string };
  is_correct: boolean;
  order_index: number;
}

export function RouteExerciseScreen({ route }: RouteExerciseScreenProps) {
  const { routeId, exercises, routeName, startIndex = 0 } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { width: screenWidth } = Dimensions.get('window');

  // State
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [sessionId, setSessionId] = useState<string>('');
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [hasCompletedBefore, setHasCompletedBefore] = useState(false);
  
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<{ [questionIndex: number]: string | string[] }>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Repetition state
  const [virtualRepeatCompletions, setVirtualRepeatCompletions] = useState<string[]>([]);
  const [loadingRepetitions, setLoadingRepetitions] = useState(false);

  // Real Quiz state from database
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;
  const isLastExercise = currentIndex === exercises.length - 1;

  // Reset quiz state when changing exercises
  useEffect(() => {
    setQuizAnswers({});
    setShowQuizResults(false);
    setQuizSubmitted(false);
    loadVirtualRepeatCompletions();
    loadQuizQuestions();
  }, [currentIndex]);

  // Load real quiz questions from database
  const loadQuizQuestions = async () => {
    if (!currentExercise || !user) {
      setQuizQuestions([]);
      return;
    }

    try {
      setLoadingQuiz(true);
      
      const exerciseId = currentExercise.learning_path_exercise_id || currentExercise.id;
      
      console.log('🔍 [RouteExercise] Loading real quiz questions for exercise:', exerciseId);

      // Fetch questions from exercise_quiz_questions table
      const { data: questions, error: questionsError } = await supabase
        .from('exercise_quiz_questions')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('❌ [RouteExercise] Error loading quiz questions:', questionsError);
        setQuizQuestions([]);
        return;
      }

      if (!questions || questions.length === 0) {
        console.log('📝 [RouteExercise] No quiz questions found for exercise:', exerciseId);
        setQuizQuestions([]);
        return;
      }

      // For each question, fetch its answers
      const questionsWithAnswers = await Promise.all(
        questions.map(async (question) => {
          const { data: answers, error: answersError } = await supabase
            .from('exercise_quiz_answers')
            .select('*')
            .eq('question_id', question.id)
            .order('order_index', { ascending: true });

          if (answersError) {
            console.error('❌ [RouteExercise] Error loading answers for question:', question.id, answersError);
            return { ...question, answers: [] };
          }

          return { ...question, answers: answers || [] };
        })
      );

      console.log('✅ [RouteExercise] Loaded quiz questions:', {
        exerciseId,
        questionCount: questionsWithAnswers.length,
        questionsWithAnswers: questionsWithAnswers.map(q => ({
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          answerCount: q.answers.length
        }))
      });

      setQuizQuestions(questionsWithAnswers);

    } catch (error) {
      console.error('❌ [RouteExercise] Exception loading quiz questions:', error);
      setQuizQuestions([]);
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Load virtual repeat completions for current exercise
  const loadVirtualRepeatCompletions = async () => {
    if (
      !currentExercise ||
      !user ||
      !currentExercise.repeat_count ||
      currentExercise.repeat_count <= 1
    ) {
      setVirtualRepeatCompletions([]);
      return;
    }

    try {
      const exerciseId = currentExercise.learning_path_exercise_id || currentExercise.id;
      
      console.log('🔄 [RouteExercise] Loading virtual repeats for:', {
        exerciseId,
        exerciseTitle: getDisplayText(currentExercise.title),
        repeatCount: currentExercise.repeat_count,
      });

      const { data, error } = await supabase
        .from('virtual_repeat_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exerciseId);

      if (error) {
        console.error('❌ [RouteExercise] Error loading virtual repeat completions:', error);
        return;
      }

      if (data) {
        const completionIds = data.map(
          (c) => `${c.exercise_id}-virtual-${c.repeat_number}`,
        );
        console.log('✅ [RouteExercise] Loaded virtual repeat completions:', {
          rawData: data,
          completionIds,
          count: completionIds.length,
        });
        setVirtualRepeatCompletions(completionIds);
      } else {
        console.log('📝 [RouteExercise] No virtual repeat completions found');
        setVirtualRepeatCompletions([]);
      }
    } catch (error) {
      console.error('❌ [RouteExercise] Exception loading virtual repeat completions:', error);
      setVirtualRepeatCompletions([]);
    }
  };

  // Toggle virtual repeat completion
  const toggleVirtualRepeatCompletion = async (repeatNumber: number) => {
    if (!currentExercise || !user) return;

    const virtualId = `${currentExercise.learning_path_exercise_id || currentExercise.id}-virtual-${repeatNumber}`;
    const isCompleted = virtualRepeatCompletions.includes(virtualId);

    console.log('🔄 [RouteExercise] Toggle Virtual Repeat:', {
      virtualId,
      repeatNumber,
      exerciseId: currentExercise.id,
      exerciseTitle: getDisplayText(currentExercise.title),
      learningPathExerciseId: currentExercise.learning_path_exercise_id,
      learningPathTitle: currentExercise.learning_path_title,
      currentlyCompleted: isCompleted,
      totalVirtualCompletions: virtualRepeatCompletions.length,
      actionToTake: isCompleted ? 'REMOVE' : 'ADD',
      currentVirtualCompletions: virtualRepeatCompletions,
    });

    // CRITICAL: Prevent auto-completing base exercise when clicking virtual repeats
    console.log('🚫 [RouteExercise] ONLY toggling virtual repeat - NOT touching base exercise');

    try {
      setLoadingRepetitions(true);

      if (isCompleted) {
        // Remove completion
        console.log('🔴 [RouteExercise] Removing virtual repeat completion:', virtualId);
        await supabase
          .from('virtual_repeat_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', currentExercise.learning_path_exercise_id || currentExercise.id)
          .eq('repeat_number', repeatNumber);

        setVirtualRepeatCompletions((prev) => {
          const newCompletions = prev.filter((id) => id !== virtualId);
          console.log(
            '🔴 [RouteExercise] Updated virtual completions count:',
            newCompletions.length,
          );
          return newCompletions;
        });
      } else {
        // Add completion
        console.log('🟢 [RouteExercise] Adding virtual repeat completion:', virtualId);
        await supabase.from('virtual_repeat_completions').insert({
          user_id: user.id,
          exercise_id: currentExercise.learning_path_exercise_id || currentExercise.id,
          repeat_number: repeatNumber,
        });

        setVirtualRepeatCompletions((prev) => {
          const newCompletions = [...prev, virtualId];
          console.log(
            '🟢 [RouteExercise] Updated virtual completions count:',
            newCompletions.length,
          );
          return newCompletions;
        });
      }

      // Recalculate completions after state update
      const updatedCompletions = isCompleted 
        ? virtualRepeatCompletions.filter((id) => id !== virtualId)
        : [...virtualRepeatCompletions, virtualId];
        
      console.log('📊 [RouteExercise] Virtual Repeat Progress:', {
        exerciseId: currentExercise.learning_path_exercise_id || currentExercise.id,
        completedRepeats: updatedCompletions.length,
        totalRepeats: currentExercise.repeat_count || 1,
        specificRepeatToggled: repeatNumber,
        allCompletedRepeats: updatedCompletions,
      });
    } catch (error) {
      console.error('❌ [RouteExercise] Error toggling virtual repeat completion:', error);
    } finally {
      setLoadingRepetitions(false);
    }
  };

  // Handle answer selection for real quiz
  const handleRealQuizAnswerSelect = (questionIndex: number, answerId: string, isMultiple: boolean = false) => {
    setQuizAnswers((prev) => {
      if (isMultiple) {
        const currentAnswers = Array.isArray(prev[questionIndex]) ? (prev[questionIndex] as string[]) : [];
        const newAnswers = currentAnswers.includes(answerId)
          ? currentAnswers.filter((id) => id !== answerId)
          : [...currentAnswers, answerId];
        return { ...prev, [questionIndex]: newAnswers };
      } else {
        return { ...prev, [questionIndex]: answerId };
      }
    });
  };

  // Calculate score for real quiz from database
  const calculateQuizScoreFromRealQuiz = () => {
    if (!quizQuestions || quizQuestions.length === 0) return { score: 0, total: 0 };

    let correct = 0;
    const total = quizQuestions.length;

    quizQuestions.forEach((question, index: number) => {
      const userAnswer = quizAnswers[index];
      const isMultipleChoice = question.question_type === 'multiple_choice';
      
      if (isMultipleChoice) {
        // Multiple choice - check if all correct answers are selected and no incorrect ones
        const correctAnswerIds = question.answers?.filter((ans) => ans.is_correct).map((ans) => ans.id) || [];
        const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [];
        
        const isCorrect = correctAnswerIds.length === userAnswersArray.length &&
          correctAnswerIds.every((id: string) => userAnswersArray.includes(id));
        
        if (isCorrect) correct++;
      } else {
        // Single choice or true/false - check if selected answer is correct
        const selectedAnswer = question.answers?.find((ans) => ans.id === userAnswer);
        if (selectedAnswer?.is_correct) correct++;
      }
    });

    return { score: correct, total };
  };

  // Quiz functions
  const handleAnswerSelect = (
    questionIndex: number,
    answerIndex: number,
    isMultiple: boolean = false,
  ) => {
    // Legacy function - not used with real quiz data
    console.log('Legacy quiz function called - real quiz uses handleRealQuizAnswerSelect');
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    setShowQuizResults(true);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setShowQuizResults(false);
    setQuizSubmitted(false);
  };

  useEffect(() => {
    if (user && exercises.length > 0) {
      // Debug: Check exercise linking to learning paths
      console.log(
        '📚 Route exercises loaded:',
        exercises.map((ex) => ({
          id: ex.id,
          title: ex.title,
          learning_path_exercise_id: ex.learning_path_exercise_id,
          learning_path_title: ex.learning_path_title,
          isRepeat: ex.isRepeat,
          repeat_count: ex.repeat_count,
        })),
      );
      
      initializeSession();
      checkPreviousCompletion();
      loadVirtualRepeatCompletions();
    }
  }, [user, exercises]);

  // Reload virtual repeat completions when current exercise changes
  useEffect(() => {
    if (currentExercise && user) {
      console.log('🔄 [RouteExercise] Current exercise changed, reloading virtual repeats');
      loadVirtualRepeatCompletions();
    }
  }, [currentIndex, currentExercise?.id]);

  useEffect(() => {
    const handleKeyPress = (event: any) => {
      if (event.nativeEvent.key === 'ArrowLeft' && currentIndex > 0) {
        handlePrevious();
      } else if (event.nativeEvent.key === 'ArrowRight' && currentIndex < exercises.length - 1) {
        handleNext();
      }
    };

    return () => {
      // Cleanup if needed
    };
  }, [currentIndex]);

  const checkPreviousCompletion = async () => {
    try {
      if (!user) return;

      const { data } = await supabase
        .from('route_exercise_sessions')
        .select('*')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .limit(1);

      setHasCompletedBefore(!!data?.length);
    } catch (error) {
      console.error('Error checking previous completion:', error);
    }
  };

  const initializeSession = async () => {
    try {
      if (!user) return;

      // Check for existing in-progress session
      const { data: existingSession } = await supabase
        .from('route_exercise_sessions')
        .select('*')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .single();

      if (existingSession) {
        setSession(existingSession);
        setSessionId(existingSession.id);
        // Use startIndex if provided, otherwise use saved progress
        setCurrentIndex(startIndex > 0 ? startIndex : existingSession.current_exercise_index || 0);
        
        // Load completed exercises from this session
        const { data: completions } = await supabase
          .from('route_exercise_completions')
          .select('exercise_id')
          .eq('session_id', existingSession.id);

        if (completions) {
          setCompletedExercises(new Set(completions.map((c) => c.exercise_id)));
        }
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('route_exercise_sessions')
          .insert({
            route_id: routeId,
            user_id: user.id,
            status: 'in_progress',
            exercises_completed: 0,
            current_exercise_index: startIndex, // Start at the specified index
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        if (newSession) {
          setSession(newSession);
          setSessionId(newSession.id);
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      Alert.alert('Error', 'Failed to start exercise session');
    } finally {
      setLoading(false);
    }
  };

  const updateSessionProgress = async (exerciseIndex: number) => {
    try {
      if (!sessionId) return;

      await supabase
        .from('route_exercise_sessions')
        .update({
          current_exercise_index: exerciseIndex,
          exercises_completed: completedExercises.size,
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating session progress:', error);
    }
  };

  const completeExercise = async () => {
    try {
      if (!sessionId || !currentExercise || !user) return;

      console.log('🎯 [RouteExercise] Starting completion for:', {
        exerciseId: currentExercise.id,
        exerciseTitle: getDisplayText(currentExercise.title),
        learningPathExerciseId: currentExercise.learning_path_exercise_id,
        learningPathTitle: currentExercise.learning_path_title,
        isRepeat: currentExercise.isRepeat,
        repeatNumber: currentExercise.repeatNumber,
        routeId,
        sessionId,
      });

      // Mark exercise as completed in session (use upsert to handle duplicates)
      const { error: completionError } = await supabase
        .from('route_exercise_completions')
        .upsert(
          {
            session_id: sessionId,
            exercise_id: currentExercise.id,
            completed_at: new Date().toISOString(),
            user_id: user.id,
          },
          {
            onConflict: 'session_id,exercise_id',
          },
        );

      if (completionError) throw completionError;
      console.log('✅ [RouteExercise] Route completion saved successfully');

              // If this is a learning path exercise, also mark it in the learning path system
        if (currentExercise.learning_path_exercise_id) {
          console.log('🔗 [RouteExercise] Syncing to learning path:', {
            exerciseId: currentExercise.learning_path_exercise_id,
            routeId,
            isRepeat: currentExercise.isRepeat,
            repeatNumber: currentExercise.repeatNumber,
          });
        
          if (currentExercise.isRepeat && currentExercise.originalId) {
          const success = await ExerciseProgressService.completeRepeatExerciseFromRoute(
            currentExercise.learning_path_exercise_id,
            currentExercise.originalId,
            currentExercise.repeatNumber || 1,
            routeId,
          );
          console.log('🔗 [RouteExercise] Repeat exercise sync result:', success);
        } else {
          const success = await ExerciseProgressService.completeExerciseFromRoute(
            currentExercise.learning_path_exercise_id,
            routeId,
          );
          console.log('🔗 [RouteExercise] Exercise sync result:', success);
        }
      } else {
        console.log('📝 [RouteExercise] Route exercise not linked to learning path');
      }

      // Update local state
      const newCompleted = new Set(completedExercises);
      newCompleted.add(currentExercise.id);
      setCompletedExercises(newCompleted);

      console.log('📊 [RouteExercise] Updated completion stats:', {
        completedCount: newCompleted.size,
        totalExercises: exercises.length,
        progressPercent: Math.round((newCompleted.size / exercises.length) * 100),
      });

      // Check if all exercises are completed
      if (newCompleted.size === exercises.length) {
        console.log('🎉 [RouteExercise] All exercises completed - finishing session');
        await completeSession();
      } else {
        // Move to next exercise automatically
        console.log('➡️ [RouteExercise] Moving to next exercise');
        handleNext();
      }
    } catch (error) {
      console.error('❌ [RouteExercise] Error completing exercise:', error);
      Alert.alert('Error', 'Failed to save exercise completion');
    }
  };

  const completeSession = async () => {
    try {
      if (!sessionId) return;

      await supabase
        .from('route_exercise_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          exercises_completed: exercises.length,
        })
        .eq('id', sessionId);

      setShowCongrats(true);

      setTimeout(() => {
        // Navigate back with refresh flag to update progress
        navigation.navigate('RouteDetail', {
          routeId,
          shouldRefresh: true,
        });
      }, 2000);
    } catch (error) {
      console.error('Error completing session:', error);
      Alert.alert('Error', 'Failed to save session completion');
    }
  };

  const handleSkip = () => {
    if (!isLastExercise) {
      handleNext();
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setSlideDirection('left');
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      updateSessionProgress(nextIndex);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSlideDirection('right');
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      updateSessionProgress(prevIndex);
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Exercise Session',
      'Are you sure you want to exit? Your progress will be saved.',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () =>
            navigation.navigate('RouteDetail', {
              routeId,
              shouldRefresh: true,
            }),
        },
      ]
    );
  };

  // Helper functions for media rendering (matching ProgressScreen)
  const getYouTubeVideoId = (url: string): string | null => {
    const regex =
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getTypeformId = (embedCode: string): string | null => {
    const urlMatch = embedCode.match(/https:\/\/[a-zA-Z0-9]+\.typeform\.com\/to\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    
    const idOnlyMatch = embedCode.match(/^[a-zA-Z0-9]{8,}$/);
    if (idOnlyMatch) return embedCode;
    
    return null;
  };

  // YouTube Embed Component (matching ProgressScreen)
  const YouTubeEmbed = ({ videoId }: { videoId: string }) => (
    <View
      style={{
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        minHeight: 200,
      }}
    >
      <WebView
        source={{
          uri: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`,
        }}
        style={{ flex: 1 }}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scrollEnabled={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
    </View>
  );

  // TypeForm Embed Component (matching ProgressScreen)
  const TypeFormEmbed = ({ formId }: { formId: string }) => (
    <View
      style={{
        height: 500,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
      }}
    >
      <WebView
        source={{ uri: `https://form.typeform.com/to/${formId}` }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scrollEnabled={false}
      />
    </View>
  );

  // Media rendering function (exactly like ProgressScreen)
  const renderExerciseMedia = (exercise: Exercise) => {
    return (
      <YStack gap={16}>
        {/* YouTube Video */}
        {exercise.youtube_url && (
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Video Tutorial
            </Text>
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
            <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
              Reference Image
            </Text>
            <Image
              source={{ uri: exercise.image }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 8,
                resizeMode: 'cover',
              }}
            />
          </YStack>
        )}

        {/* Embed (TypeForm) */}
        {exercise.embed_code &&
          (() => {
            const typeformValue = exercise.embed_code ? getTypeformId(exercise.embed_code) : null;
            return typeformValue ? (
              <YStack>
                <Text fontSize={16} fontWeight="bold" color="$color" marginBottom={4}>
                  Interactive Form
                </Text>
                <TypeFormEmbed formId={typeformValue} />
              </YStack>
            ) : null;
          })()}
      </YStack>
    );
  };

  const renderExerciseContent = () => {
    if (!currentExercise) return null;

    console.log('🔍 [RouteExercise] Rendering exercise content for:', {
      exerciseId: currentExercise.id,
      exerciseTitle: getDisplayText(currentExercise.title),
      has_quiz: currentExercise.has_quiz,
      quiz_data: !!currentExercise.quiz_data,
      quiz_data_type: typeof currentExercise.quiz_data,
      quiz_data_preview: typeof currentExercise.quiz_data === 'string' 
        ? (currentExercise.quiz_data as string).substring(0, 100) + '...'
        : currentExercise.quiz_data,
      isQuizExercise: getDisplayText(currentExercise.title).toLowerCase().includes('quiz')
    });

    const isCompleted = completedExercises.has(currentExercise.id);

    return (
      <YStack gap={16}>
        {/* Exercise header with icon - ProgressScreen style */}
        <XStack alignItems="center" gap={12} marginBottom={16}>
          {currentExercise.icon && (
            <View style={{ marginRight: 8 }}>
              <Feather
                name={currentExercise.icon as keyof typeof Feather.glyphMap}
                size={28}
                color={isCompleted ? '#00E6C3' : '#4B6BFF'}
              />
            </View>
          )}
          <YStack flex={1}>
            <XStack alignItems="center" gap={8}>
              <Text fontSize={28} fontWeight="bold" color="$color" numberOfLines={2}>
                {getDisplayText(currentExercise.title)}
              </Text>

              {/* Show repeat indicator if it's a repeat */}
              {currentExercise.isRepeat && (
                <XStack
                  backgroundColor="#4B6BFF"
                  paddingHorizontal={8}
                  paddingVertical={4}
                  borderRadius={12}
                  alignItems="center"
                  gap={4}
                >
                  <Feather name="repeat" size={14} color="white" />
                  <Text fontSize={12} color="white" fontWeight="bold">
                    {currentExercise.repeatNumber}/{currentExercise.repeat_count}
                  </Text>
                </XStack>
              )}
            </XStack>

            {/* Learning path connection info */}
            {currentExercise.learning_path_exercise_id && (
              <Text fontSize={14} color="#4B6BFF" marginTop={4}>
                🔗 Connected to Learning Path Progress
                {currentExercise.learning_path_title && ` • ${currentExercise.learning_path_title}`}
              </Text>
            )}
          </YStack>
        </XStack>

        {/* Exercise Description */}
        {currentExercise.description && (
          <YStack marginBottom={16}>
            <Text fontSize={16} color="$gray11" lineHeight={24}>
              {getDisplayText(currentExercise.description)}
            </Text>
          </YStack>
        )}

        {/* Media Content - Full ProgressScreen rendering */}
        {renderExerciseMedia(currentExercise)}

        {/* Repetition Progress (if this is a repeated exercise) */}
        {(currentExercise.isRepeat ||
          (currentExercise.repeat_count && currentExercise.repeat_count > 1)) && (
          <YStack
            marginTop={16}
            marginBottom={8}
            backgroundColor="rgba(75, 107, 255, 0.1)"
            padding={16}
            borderRadius={12}
          >
            <XStack alignItems="center" gap={8} marginBottom={8}>
              <Feather name="repeat" size={20} color="#4B6BFF" />
              <Text fontSize={18} fontWeight="bold" color="#4B6BFF">
                {currentExercise.isRepeat
                  ? `Repetition ${currentExercise.repeatNumber} of ${currentExercise.repeat_count}`
                  : `This exercise requires ${currentExercise.repeat_count} repetitions`}
              </Text>
            </XStack>

            {currentExercise.isRepeat && (
              <Text color="$gray11">
                Complete this repetition to continue with your progress.
              </Text>
            )}
          </YStack>
        )}

        {/* Individual Repetition Tracking */}
        {currentExercise.repeat_count && currentExercise.repeat_count > 1 && !currentExercise.isRepeat && (
          <YStack marginTop={16} gap={12}>
            <XStack alignItems="center" gap={8}>
              <Feather name="list" size={20} color="#4B6BFF" />
              <Text fontSize={16} fontWeight="bold" color="#4B6BFF">
                All Repetitions
              </Text>
            </XStack>

            <Text fontSize={12} color="$gray11" marginBottom={8}>
              {virtualRepeatCompletions.length + (completedExercises.has(currentExercise.id) ? 1 : 0)}/{currentExercise.repeat_count} completed
            </Text>

            <YStack gap={8}>
              {/* Base exercise (repetition 1) */}
              <TouchableOpacity
                onPress={async () => {
                  console.log('🎯 [RouteExercise] Base exercise (repetition 1) clicked - DIRECT CLICK');
                  console.log('🔍 [RouteExercise] Current state before base click:', {
                    completedExercises: Array.from(completedExercises),
                    virtualRepeatCompletions: virtualRepeatCompletions,
                    exerciseId: currentExercise.id
                  });
                  await completeExercise();
                  // After completing base exercise, check if we should auto-advance
                  const allRepeatsCompleted = virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1;
                  if (allRepeatsCompleted && !isLastExercise) {
                    console.log('🎯 [RouteExercise] All repeats completed - auto-advancing to next exercise');
                    setTimeout(() => handleNext(), 1500); // Small delay to show completion
                  }
                }}
                disabled={loadingRepetitions}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#f8f9fa',
                  padding: 12,
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: completedExercises.has(currentExercise.id) ? '#10B981' : '#6B7280',
                }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: completedExercises.has(currentExercise.id) ? '#10B981' : 'transparent',
                  borderWidth: 2,
                  borderColor: completedExercises.has(currentExercise.id) ? '#10B981' : '#6B7280',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  {completedExercises.has(currentExercise.id) && (
                    <Feather name="check" size={12} color="white" />
                  )}
                </View>
                <Text flex={1} color="$color" fontWeight="500">
                  {getDisplayText(currentExercise.title)} - Repetition 1
                </Text>
                <Text fontSize={12} color="#4B6BFF">
                  1/{currentExercise.repeat_count}
                </Text>
              </TouchableOpacity>

              {/* Virtual repetitions */}
              {Array.from({ length: currentExercise.repeat_count - 1 }, (_, i) => {
                const repeatNumber = i + 2;
                const virtualId = `${currentExercise.learning_path_exercise_id || currentExercise.id}-virtual-${repeatNumber}`;
                const isCompleted = virtualRepeatCompletions.includes(virtualId);

                return (
                  <TouchableOpacity
                    key={repeatNumber}
                    onPress={async () => {
                      console.log(`🎯 [RouteExercise] Repeat #${repeatNumber} clicked - DIRECT CLICK ON VIRTUAL REPEAT`);
                      console.log('🔍 [RouteExercise] Current state before virtual repeat click:', {
                        repeatNumber,
                        completedExercises: Array.from(completedExercises),
                        virtualRepeatCompletions: virtualRepeatCompletions,
                        exerciseId: currentExercise.id,
                        isBaseExerciseCompleted: completedExercises.has(currentExercise.id)
                      });
                      
                      await toggleVirtualRepeatCompletion(repeatNumber);
                      
                      console.log('🔍 [RouteExercise] State after virtual repeat toggle:', {
                        repeatNumber,
                        completedExercises: Array.from(completedExercises),
                        virtualRepeatCompletions: virtualRepeatCompletions,
                        exerciseId: currentExercise.id,
                        isBaseExerciseCompleted: completedExercises.has(currentExercise.id)
                      });
                      
                      // DON'T auto-advance on virtual repeat clicks - only check after state updates properly
                      console.log('🚫 [RouteExercise] Virtual repeat toggled - NOT auto-advancing (base exercise should remain independent)');
                    }}
                    disabled={loadingRepetitions}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#f8f9fa',
                      padding: 12,
                      borderRadius: 8,
                      borderLeftWidth: 4,
                      borderLeftColor: isCompleted ? '#10B981' : '#6B7280',
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: isCompleted ? '#10B981' : 'transparent',
                      borderWidth: 2,
                      borderColor: isCompleted ? '#10B981' : '#6B7280',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      {isCompleted && (
                        <Feather name="check" size={12} color="white" />
                      )}
                    </View>
                    <Text flex={1} color="$color" fontWeight="500">
                      Repetition {repeatNumber}
                    </Text>
                    <Text fontSize={12} color="#4B6BFF">
                      {repeatNumber}/{currentExercise.repeat_count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </YStack>

            {/* Mark All Done Button */}
            <TouchableOpacity
              onPress={async () => {
                console.log('🎯 [RouteExercise] Mark All as Done pressed');
                
                // Complete base exercise
                if (!completedExercises.has(currentExercise.id)) {
                  await completeExercise();
                }
                
                // Complete all virtual repetitions
                if (currentExercise.repeat_count) {
                  for (let i = 2; i <= currentExercise.repeat_count; i++) {
                    const virtualId = `${currentExercise.learning_path_exercise_id || currentExercise.id}-virtual-${i}`;
                    if (!virtualRepeatCompletions.includes(virtualId)) {
                      await toggleVirtualRepeatCompletion(i);
                    }
                  }
                }

                // Auto-advance to next exercise after marking all as done
                if (!isLastExercise) {
                  console.log('🎯 [RouteExercise] All repetitions marked as done - auto-advancing to next exercise');
                  setTimeout(() => handleNext(), 2000); // Longer delay to show all completions
                }
              }}
              disabled={loadingRepetitions || (completedExercises.has(currentExercise.id) && virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1)}
              style={{
                backgroundColor: (completedExercises.has(currentExercise.id) && virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1) ? '#10B981' : '#4B6BFF',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 8,
                opacity: loadingRepetitions ? 0.7 : 1,
              }}
            >
              <XStack alignItems="center" gap={8}>
                <Feather name="check-circle" size={16} color="white" />
                <Text color="white" fontSize={16} fontWeight="600">
                  {(completedExercises.has(currentExercise.id) && virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1)
                    ? 'All Repetitions Complete!'
                    : 'Mark All as Done'}
                </Text>
              </XStack>
            </TouchableOpacity>
          </YStack>
        )}

        {/* Interactive Quiz Questions - Now loads from database */}
        {(currentExercise.has_quiz || 
          currentExercise.quiz_data || 
          quizQuestions.length > 0 ||
          getDisplayText(currentExercise.title).toLowerCase().includes('quiz')) && (
          <YStack marginTop={16} gap={16}>
            <XStack alignItems="center" gap={8}>
              <Feather name="help-circle" size={20} color="#8B5CF6" />
              <Text fontSize={18} fontWeight="bold" color="#8B5CF6">
                Quiz Exercise
              </Text>
            </XStack>

            {loadingQuiz ? (
              <View style={{
                backgroundColor: '#F3F4F6',
                padding: 16,
                borderRadius: 12,
              }}>
                <Text fontSize={16} color="#6B7280" textAlign="center">
                  🔄 Loading quiz questions from database...
                </Text>
              </View>
            ) : quizQuestions.length > 0 ? (
              <>
                {/* Quiz Header with Score */}
                <XStack alignItems="center" justifyContent="space-between" marginBottom={16}>
                  <XStack alignItems="center" gap={8}>
                    <Feather name="help-circle" size={20} color="#8B5CF6" />
                    <Text fontSize={18} fontWeight="bold" color="#8B5CF6">
                      Quiz Questions ({quizQuestions.length})
                    </Text>
                  </XStack>
                  
                  {showQuizResults && (
                    <XStack alignItems="center" gap={8}>
                      <Text fontSize={16} fontWeight="600" color={calculateQuizScoreFromRealQuiz().score === calculateQuizScoreFromRealQuiz().total ? "#10B981" : "#F59E0B"}>
                        {calculateQuizScoreFromRealQuiz().score}/{calculateQuizScoreFromRealQuiz().total}
                      </Text>
                      <TouchableOpacity onPress={resetQuiz}>
                        <Feather name="refresh-cw" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </XStack>
                  )}
                </XStack>

                {/* Real Quiz Questions */}
                {quizQuestions.map((question: QuizQuestion, questionIndex: number) => {
                  const userAnswer = quizAnswers[questionIndex];
                  const isMultipleChoice = question.question_type === 'multiple_choice';
                  
                  return (
                    <YStack key={questionIndex} backgroundColor={colorScheme === 'dark' ? '#1F2937' : '#f8f9fa'} padding={16} borderRadius={12} marginBottom={12}>
                      <Text fontSize={16} fontWeight="600" color="$color" marginBottom={12}>
                        Question {questionIndex + 1}: {getDisplayText(question.question_text)}
                      </Text>
                        
                      {isMultipleChoice && (
                        <Text fontSize={12} color="#8B5CF6" marginBottom={8} fontStyle="italic">
                          Multiple answers possible - select all that apply
                        </Text>
                      )}
                    
                      {/* Answer Options */}
                      {question.answers && Array.isArray(question.answers) && (
                        <YStack gap={8}>
                          {question.answers.map((answer: QuizAnswer, answerIndex: number) => {
                              const isSelected = isMultipleChoice 
                                ? (Array.isArray(userAnswer) && userAnswer.includes(answer.id))
                                : userAnswer === answer.id;
                              
                              const isCorrectAnswer = answer.is_correct;
                              
                              let backgroundColor = '#ffffff';
                              let borderColor = '#e5e7eb';
                              let textColor = '#374151';
                              
                              if (colorScheme === 'dark') {
                                backgroundColor = '#374151';
                                borderColor = '#6B7280';
                                textColor = '#F9FAFB';
                              }
                              
                              if (showQuizResults) {
                                if (isCorrectAnswer) {
                                  backgroundColor = '#10B981';
                                  borderColor = '#059669';
                                  textColor = 'white';
                                } else if (isSelected && !isCorrectAnswer) {
                                  backgroundColor = '#EF4444';
                                  borderColor = '#DC2626';
                                  textColor = 'white';
                                }
                              } else if (isSelected) {
                                backgroundColor = '#3B82F6';
                                borderColor = '#2563EB';
                                textColor = 'white';
                              }
                            
                            return (
                              <TouchableOpacity 
                                key={answer.id}
                                onPress={() => !showQuizResults && handleRealQuizAnswerSelect(questionIndex, answer.id, isMultipleChoice)}
                                disabled={showQuizResults}
                                style={{
                                  backgroundColor,
                                  padding: 12,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor,
                                  opacity: showQuizResults && !isSelected && !isCorrectAnswer ? 0.6 : 1,
                                }}
                              >
                                <XStack gap={8} alignItems="center">
                                  {/* Selection indicator */}
                                  <View style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: isMultipleChoice ? 4 : 10,
                                    borderWidth: 2,
                                    borderColor: textColor === 'white' ? 'white' : '#6B7280',
                                    backgroundColor: isSelected ? (textColor === 'white' ? 'white' : '#3B82F6') : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                    {isSelected && (
                                      <Feather 
                                        name="check" 
                                        size={12} 
                                        color={textColor === 'white' ? '#3B82F6' : 'white'} 
                                      />
                                    )}
                                  </View>
                                  
                                  <Text fontSize={14} fontWeight="500" color={textColor} flex={1}>
                                    {String.fromCharCode(65 + answerIndex)}. {getDisplayText(answer.answer_text)}
                                  </Text>
                                  
                                  {showQuizResults && isCorrectAnswer && (
                                    <Feather name="check-circle" size={16} color="white" />
                                  )}
                                  {showQuizResults && isSelected && !isCorrectAnswer && (
                                    <Feather name="x-circle" size={16} color="white" />
                                  )}
                                </XStack>
                              </TouchableOpacity>
                            );
                          })}
                        </YStack>
                      )}
                      
                      {/* Show explanation after submission */}
                      {showQuizResults && question.explanation_text && (
                        <View style={{
                          backgroundColor: '#EBF8FF',
                          padding: 12,
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: '#3B82F6',
                          marginTop: 12,
                        }}>
                          <Text fontSize={14} color="#1F2937" fontStyle="italic">
                            💡 {getDisplayText(question.explanation_text)}
                          </Text>
                        </View>
                      )}
                    </YStack>
                  );
                })}
                
                {/* Quiz Submit/Reset Button */}
                <XStack gap={12} marginTop={8}>
                  {!showQuizResults ? (
                    <Button
                      onPress={submitQuiz}
                      backgroundColor="#8B5CF6"
                      flex={1}
                      size="lg"
                      disabled={Object.keys(quizAnswers).length === 0}
                    >
                      <XStack alignItems="center" gap={8}>
                        <Feather name="send" size={16} color="white" />
                        <Text color="white" fontSize={16} fontWeight="600">
                          Submit Quiz
                        </Text>
                      </XStack>
                    </Button>
                  ) : (
                    <XStack flex={1} gap={12}>
                      <Button
                        onPress={resetQuiz}
                        variant="outlined"
                        flex={1}
                        size="lg"
                      >
                        <XStack alignItems="center" gap={8}>
                          <Feather name="refresh-cw" size={16} color={iconColor} />
                          <Text fontSize={16}>Try Again</Text>
                        </XStack>
                      </Button>
                      
                      <YStack flex={1} justifyContent="center" alignItems="center" 
                             backgroundColor={calculateQuizScoreFromRealQuiz().score === calculateQuizScoreFromRealQuiz().total ? "#10B981" : "#F59E0B"}
                             padding={12} borderRadius={8}>
                        <Text fontSize={18} fontWeight="bold" color="white">
                          {calculateQuizScoreFromRealQuiz().score === calculateQuizScoreFromRealQuiz().total ? '🎉 Perfect!' : `${Math.round((calculateQuizScoreFromRealQuiz().score/calculateQuizScoreFromRealQuiz().total) * 100)}%`}
                        </Text>
                        <Text fontSize={14} color="white">
                          {calculateQuizScoreFromRealQuiz().score}/{calculateQuizScoreFromRealQuiz().total} correct
                        </Text>
                      </YStack>
                    </XStack>
                  )}
                </XStack>
              </>
            ) : getDisplayText(currentExercise.title).toLowerCase().includes('quiz') ? (
              <View style={{
                backgroundColor: '#FEF3C7',
                padding: 16,
                borderRadius: 12,
              }}>
                <Text fontSize={16} color="#92400E" textAlign="center">
                  📝 Quiz exercise detected but no questions found in database
                </Text>
                <Text fontSize={14} color="#92400E" textAlign="center" marginTop={4}>
                  Exercise ID: {currentExercise.learning_path_exercise_id || currentExercise.id}
                </Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: '#EBF8FF',
                padding: 16,
                borderRadius: 12,
              }}>
                <Text fontSize={16} color="#1F2937" textAlign="center">
                  🎯 Quiz functionality ready - questions will load from database
                </Text>
              </View>
            )}
          </YStack>
        )}

        {/* Completion Status */}
        {isCompleted && (
          <View style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: 16,
            borderRadius: 12,
            marginTop: 16,
            borderWidth: 1,
            borderColor: '#10B981',
          }}>
            <XStack gap={8} alignItems="center">
              <Feather name="check-circle" size={20} color="#10B981" />
              <Text fontSize={16} fontWeight="600" color="#10B981">
                Exercise Completed
                {currentExercise.learning_path_exercise_id && ' • Progress synced to learning path'}
              </Text>
            </XStack>
          </View>
        )}
      </YStack>
    );
  };

  if (loading) {
    return (
      <Screen>
        <YStack f={1} justifyContent="center" alignItems="center">
          <Text>Loading exercise session...</Text>
        </YStack>
      </Screen>
    );
  }

  if (exercises.length === 0) {
    return (
      <Screen>
        <Header title="Route Exercises" showBack />
        <YStack f={1} justifyContent="center" alignItems="center" padding="$4">
          <Feather name="book-open" size={64} color="$gray9" />
          <Text fontSize={18} fontWeight="600" textAlign="center" marginTop="$4">
            No Exercises Available
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop="$2">
            This route doesn't have any exercises yet.
          </Text>
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <YStack f={1}>
        {/* Header */}
        <Header
          title={`${routeName || 'Route'} Exercises`}
          showBack
          rightElement={
            <Button
              icon={<Feather name="x" size={20} color={iconColor} />}
              onPress={handleExit}
              variant="outlined"
              size="sm"
            />
          }
        />

        {/* Previous completion notice */}
        {hasCompletedBefore && (
          <View style={{
            backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6',
            padding: 12,
            marginHorizontal: 16,
            marginVertical: 8,
            borderRadius: 8,
          }}>
            <Text fontSize={14} color="$gray11" textAlign="center">
              You've completed these exercises before! Let's practice again.
            </Text>
          </View>
        )}

        {/* Progress Section */}
        <YStack padding="$4" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={16} fontWeight="600" color="$color">
              Exercise {currentIndex + 1} of {exercises.length}
            </Text>
            <Text fontSize={14} color="$gray11">
              {Math.round(progress)}% Complete
            </Text>
          </XStack>
          
          <Progress
            value={Math.round(progress)}
            backgroundColor="$gray5"
            size="$1"
          >
            <Progress.Indicator backgroundColor="$blue10" />
          </Progress>
        </YStack>

        {/* Exercise Content */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          contentContainerStyle={{ 
            padding: 24, 
            paddingBottom: 24,
          }}
        >
          {showCongrats ? (
            <YStack alignItems="center" justifyContent="center" padding="$8" gap="$4">
              <Feather name="award" size={80} color="#10B981" />
              <Text fontSize={28} fontWeight="700" textAlign="center" color="$color">
                Congratulations!
              </Text>
              <Text fontSize={16} color="$gray11" textAlign="center">
                You've completed all exercises successfully!
              </Text>
            </YStack>
          ) : (
            renderExerciseContent()
          )}
        </ScrollView>

        {/* Navigation Controls */}
        {!showCongrats && (
          <View style={{
            backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E7EB',
            padding: 16,
          }}>
            <YStack gap="$3">
              {/* Action Buttons */}
              <XStack gap="$3">
                <Button
                  onPress={async () => {
                    const isCompleted = completedExercises.has(currentExercise?.id || '');
                    if (isCompleted) {
                      // Toggle to incomplete - remove from local state
                      const newCompleted = new Set(completedExercises);
                      newCompleted.delete(currentExercise.id);
                      setCompletedExercises(newCompleted);
                      
                      // Remove from database
                      await supabase
                        .from('route_exercise_completions')
                        .delete()
                        .eq('session_id', sessionId)
                        .eq('exercise_id', currentExercise.id);
                    } else {
                      // Complete the exercise
                      await completeExercise();
                    }
                  }}
                  backgroundColor={completedExercises.has(currentExercise?.id || '') ? "$gray10" : "$green10"}
                  flex={1}
                  size="lg"
                  icon={<Feather name={completedExercises.has(currentExercise?.id || '') ? "x" : "check"} size={20} color="white" />}
                >
                  <Text color="white" fontSize={16} fontWeight="600">
                    {completedExercises.has(currentExercise?.id || '') ? 'Mark Incomplete' : 'Complete'}
                  </Text>
                </Button>
                
                {!isLastExercise && (
                  <Button
                    onPress={handleSkip}
                    variant="outlined"
                    size="lg"
                    icon={<Feather name="skip-forward" size={20} color={iconColor} />}
                  >
                    <Text fontSize={16}>Skip</Text>
                  </Button>
                )}
              </XStack>

              {/* Navigation Buttons */}
              <XStack justifyContent="space-between">
                <Button
                  onPress={handlePrevious}
                  disabled={currentIndex === 0}
                  variant="outlined"
                  icon={<Feather name="arrow-left" size={20} color={iconColor} />}
                >
                  <Text>Previous</Text>
                </Button>
                
                <Button
                  onPress={handleNext}
                  disabled={isLastExercise}
                  variant="outlined"
                  icon={<Feather name="arrow-right" size={20} color={iconColor} />}
                >
                  <Text>Next</Text>
                </Button>
              </XStack>
            </YStack>
          </View>
        )}
      </YStack>
    </Screen>
  );
} 