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
import { useTranslation } from '../contexts/TranslationContext';
import { Exercise } from '../types/route';
import { ExerciseProgressService } from '../services/exerciseProgressService';
import { WebView } from 'react-native-webview';

// Helper function to extract text from multilingual fields (updated to use language context)
const getDisplayTextWithLanguage = (
  text: string | { en: string; sv: string } | undefined,
  language: 'en' | 'sv',
  fallback: string = '',
): string => {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  // Use current language, fallback to English, then Swedish, then fallback
  return text[language] || text.en || text.sv || fallback;
};

// Legacy function for backwards compatibility
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
      practiceMode?: boolean; // Whether to update learning path progress
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
  // Media support
  image?: string;
  youtube_url?: string;
  embed_code?: string;
}

interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: { en: string; sv: string };
  is_correct: boolean;
  order_index: number;
}

export function RouteExerciseScreen({ route }: RouteExerciseScreenProps) {
  const { routeId, exercises, routeName, startIndex = 0, practiceMode = false } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { language, t } = useTranslation();
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
  const [quizAnswers, setQuizAnswers] = useState<{ [questionIndex: number]: string | string[] }>(
    {},
  );
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Quiz statistics and history
  const [quizStats, setQuizStats] = useState<{
    attempts: number;
    bestScore: number;
    averageScore: number;
    lastAttemptAt?: string;
  } | null>(null);
  const [quizHistory, setQuizHistory] = useState<
    Array<{
      id: string;
      score: number;
      total: number;
      percentage: number;
      completed_at: string;
    }>
  >([]);

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
    loadQuizStats();
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

      // Check if exerciseId is a valid UUID format
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          exerciseId,
        );

      if (!isValidUUID) {
        console.log(
          '📝 [RouteExercise] Exercise ID is not a UUID (custom exercise), checking for embedded quiz data instead:',
          exerciseId,
        );

        // For custom exercises, check if quiz_data exists in the exercise object
        if (currentExercise.quiz_data) {
          console.log('✅ [RouteExercise] Found quiz_data in custom exercise, parsing...', {
            quiz_data_type: typeof currentExercise.quiz_data,
            quiz_data_preview:
              typeof currentExercise.quiz_data === 'string'
                ? (currentExercise.quiz_data as string).substring(0, 100) + '...'
                : JSON.stringify(currentExercise.quiz_data || {}).substring(0, 100) + '...',
          });
          try {
            const parsedQuizData =
              typeof currentExercise.quiz_data === 'string'
                ? JSON.parse(currentExercise.quiz_data)
                : currentExercise.quiz_data;

            if (parsedQuizData?.questions && Array.isArray(parsedQuizData.questions)) {
              // Convert old quiz format to new format
              const convertedQuestions = parsedQuizData.questions.map((q: any, index: number) => ({
                id: `custom-${exerciseId}-q${index}`,
                exercise_id: exerciseId,
                question_text:
                  typeof q.question === 'string' ? { en: q.question, sv: q.question } : q.question,
                question_type: q.type || 'single_choice',
                order_index: index + 1,
                explanation_text: q.explanation
                  ? { en: q.explanation, sv: q.explanation }
                  : undefined,
                answers: (() => {
                  // Handle both array and multilingual object formats
                  let optionsArray: any[] = [];
                  if (Array.isArray(q.options)) {
                    // Simple array format
                    optionsArray = q.options;
                  } else if (q.options && typeof q.options === 'object') {
                    // Multilingual object format: {"en": [...], "sv": [...]}
                    optionsArray = q.options.en || q.options.sv || [];
                  }

                  return optionsArray.map((option: any, optIndex: number) => ({
                    id: `custom-${exerciseId}-q${index}-a${optIndex}`,
                    question_id: `custom-${exerciseId}-q${index}`,
                    answer_text:
                      typeof option === 'string'
                        ? { en: option, sv: option }
                        : q.options?.en && q.options?.sv
                          ? {
                              en: q.options.en[optIndex] || option,
                              sv: q.options.sv[optIndex] || option,
                            }
                          : option,
                    is_correct:
                      q.correct_answer === optIndex ||
                      (Array.isArray(q.correct_answers) && q.correct_answers.includes(optIndex)),
                    order_index: optIndex + 1,
                  }));
                })(),
              }));

              console.log(
                '✅ [RouteExercise] Converted custom quiz questions:',
                convertedQuestions.length,
              );
              console.log(
                '🔍 [RouteExercise] Quiz questions with answers:',
                convertedQuestions.map((q: any) => ({
                  id: q.id,
                  question: q.question_text,
                  answerCount: q.answers?.length || 0,
                  answers: q.answers?.map((a: any) => ({
                    id: a.id,
                    text: a.answer_text,
                    correct: a.is_correct,
                  })),
                })),
              );
              setQuizQuestions(convertedQuestions);
              return;
            }
          } catch (parseError) {
            console.error(
              '❌ [RouteExercise] Error parsing custom exercise quiz_data:',
              parseError,
            );
          }
        }

        console.log('📝 [RouteExercise] No quiz data found for custom exercise', {
          has_quiz: currentExercise.has_quiz,
          quiz_data: currentExercise.quiz_data,
          quiz_data_type: typeof currentExercise.quiz_data,
        });
        setQuizQuestions([]);
        return;
      }

      // Fetch questions from exercise_quiz_questions table (for UUID-based exercises)
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
            console.error(
              '❌ [RouteExercise] Error loading answers for question:',
              question.id,
              answersError,
            );
            return { ...question, answers: [] };
          }

          return { ...question, answers: answers || [] };
        }),
      );

      console.log('✅ [RouteExercise] Loaded quiz questions:', {
        exerciseId,
        questionCount: questionsWithAnswers.length,
        questionsWithAnswers: questionsWithAnswers.map((q) => ({
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          answerCount: q.answers.length,
        })),
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
        const completionIds = data.map((c) => `${c.exercise_id}-virtual-${c.repeat_number}`);
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
  const handleRealQuizAnswerSelect = (
    questionIndex: number,
    answerId: string,
    isMultiple: boolean = false,
  ) => {
    setQuizAnswers((prev) => {
      if (isMultiple) {
        const currentAnswers = Array.isArray(prev[questionIndex])
          ? (prev[questionIndex] as string[])
          : [];
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
        const correctAnswerIds =
          question.answers?.filter((ans) => ans.is_correct).map((ans) => ans.id) || [];
        const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [];

        const isCorrect =
          correctAnswerIds.length === userAnswersArray.length &&
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

  const submitQuiz = async () => {
    setQuizSubmitted(true);
    setShowQuizResults(true);

    // Calculate and save the quiz score
    const { score, total } = calculateQuizScoreFromRealQuiz();
    await saveQuizAttempt(score, total);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setShowQuizResults(false);
    setQuizSubmitted(false);
  };

  // Load quiz statistics and history for the current exercise
  const loadQuizStats = async () => {
    if (!currentExercise || !user) return;

    try {
      const exerciseId = currentExercise.learning_path_exercise_id || currentExercise.id;

      // Check if it's a valid UUID (database exercise) - custom exercises don't have quiz attempts tracked
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          exerciseId,
        );

      if (!isValidUUID) {
        console.log('📊 [RouteExercise] Custom exercise - no quiz stats tracking');
        return;
      }

      // Load quiz attempts for this exercise
      const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('exercise_id', exerciseId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading quiz stats:', error);
        return;
      }

      if (attempts && attempts.length > 0) {
        const scores = attempts.map((a) => a.score_percentage || 0);
        const totalScore = scores.reduce((sum, score) => sum + score, 0);

        setQuizStats({
          attempts: attempts.length,
          bestScore: Math.max(...scores),
          averageScore: Math.round(totalScore / scores.length),
          lastAttemptAt: attempts[0]?.completed_at,
        });

        setQuizHistory(
          attempts.map((attempt) => ({
            id: attempt.id,
            score: attempt.correct_answers || 0,
            total: attempt.total_questions || 0,
            percentage: attempt.score_percentage || 0,
            completed_at: attempt.completed_at || attempt.started_at,
          })),
        );

        console.log('📊 [RouteExercise] Loaded quiz stats:', {
          attempts: attempts.length,
          bestScore: Math.max(...scores),
          averageScore: Math.round(totalScore / scores.length),
        });
      }
    } catch (error) {
      console.error('❌ [RouteExercise] Error loading quiz stats:', error);
    }
  };

  // Save quiz attempt to database (for UUID exercises)
  const saveQuizAttempt = async (score: number, total: number) => {
    if (!currentExercise || !user) return;

    try {
      const exerciseId = currentExercise.learning_path_exercise_id || currentExercise.id;

      // Check if it's a valid UUID (database exercise)
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          exerciseId,
        );

      if (!isValidUUID) {
        console.log('📊 [RouteExercise] Custom exercise - not saving quiz attempt');
        return;
      }

      const percentage = Math.round((score / total) * 100);

      const { error } = await supabase.from('quiz_attempts').insert({
        exercise_id: exerciseId,
        user_id: user.id,
        attempt_number: (quizStats?.attempts || 0) + 1,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_questions: total,
        correct_answers: score,
        score_percentage: percentage,
        is_completed: true,
        passed: percentage >= 70, // Assuming 70% pass threshold
        pass_threshold: 70,
        time_spent_seconds: 0, // Could track this if needed
      });

      if (error) {
        console.error('❌ Error saving quiz attempt:', error);
      } else {
        console.log('✅ Quiz attempt saved:', { score, total, percentage });
        // Reload stats after saving
        loadQuizStats();
      }
    } catch (error) {
      console.error('❌ Error saving quiz attempt:', error);
    }
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

      // Skip session tracking for single exercises (those starting with 00000000)
      if (routeId && routeId.startsWith('00000000-0000-0000-0000-')) {
        return;
      }

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

      // Skip session tracking for single exercises (those starting with 00000000)
      if (routeId && routeId.startsWith('00000000-0000-0000-0000-')) {
        console.log('🔍 [RouteExercise] Skipping session tracking for single exercise view');
        setLoading(false);
        return;
      }

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
      const { error: completionError } = await supabase.from('route_exercise_completions').upsert(
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
      // ONLY if not in practice mode
      if (currentExercise.learning_path_exercise_id && !practiceMode) {
        console.log('🔗 [RouteExercise] Syncing to learning path (not in practice mode):', {
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
      } else if (practiceMode) {
        console.log('🔄 [RouteExercise] Practice mode - NOT syncing to learning path');
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
      } else if (!currentExercise.repeat_count || currentExercise.repeat_count <= 1) {
        // Only auto-advance if exercise has no repeats
        console.log('➡️ [RouteExercise] Exercise has no repeats - auto-advancing to next exercise');
        handleNext();
      } else {
        console.log(
          '🚫 [RouteExercise] Exercise has repeats - staying on current exercise for user to complete all repeats',
        );
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
      ],
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
              {t('routeExercise.videoTutorial')}
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
              {t('routeExercise.referenceImage')}
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

        {/* Custom Media Attachments (from AdvancedExerciseCreator) */}
        {exercise.custom_media_attachments &&
          Array.isArray(exercise.custom_media_attachments) &&
          exercise.custom_media_attachments.length > 0 && (
            <YStack gap={12}>
              <Text fontSize={16} fontWeight="bold" color="$color">
                {t('routeExercise.additionalMedia')}
              </Text>
              {exercise.custom_media_attachments.map(
                (media: { type: string; url: string; description?: string }, index: number) => (
                  <YStack key={index}>
                    {media.type === 'image' && (
                      <Image
                        source={{ uri: media.url }}
                        style={{
                          width: '100%',
                          height: 200,
                          borderRadius: 8,
                          resizeMode: 'cover',
                        }}
                      />
                    )}
                    {media.type === 'youtube' && (
                      <View style={{ height: 200 }}>
                        <WebView
                          source={{
                            uri: media.url.includes('embed')
                              ? media.url
                              : media.url.replace('watch?v=', 'embed/'),
                          }}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}
                    {media.description && (
                      <Text fontSize={14} color="$gray11" marginTop={4}>
                        {media.description}
                      </Text>
                    )}
                  </YStack>
                ),
              )}
            </YStack>
          )}
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
      quiz_data_preview:
        typeof currentExercise.quiz_data === 'string'
          ? (currentExercise.quiz_data as string).substring(0, 100) + '...'
          : currentExercise.quiz_data,
      isQuizExercise: getDisplayText(currentExercise.title).toLowerCase().includes('quiz'),
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
                {currentExercise.learning_path_title &&
                  ` • ${getDisplayText(currentExercise.learning_path_title)}`}
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
              <Text color="$gray11">{t('routeExercise.completeRepetition')}</Text>
            )}
          </YStack>
        )}

        {/* Individual Repetition Tracking */}
        {currentExercise.repeat_count &&
          currentExercise.repeat_count > 1 &&
          !currentExercise.isRepeat && (
            <YStack marginTop={16} gap={12}>
              <XStack alignItems="center" gap={8}>
                <Feather name="list" size={20} color="#4B6BFF" />
                <Text fontSize={16} fontWeight="bold" color="#4B6BFF">
                  {t('routeExercise.allRepetitions')}
                </Text>
              </XStack>

              <Text fontSize={12} color="$gray11" marginBottom={8}>
                {virtualRepeatCompletions.length +
                  (completedExercises.has(currentExercise.id) ? 1 : 0)}
                /{currentExercise.repeat_count} completed
              </Text>

              <YStack gap={8}>
                {/* Base exercise (repetition 1) */}
                <TouchableOpacity
                  onPress={async () => {
                    console.log(
                      '🎯 [RouteExercise] Base exercise (repetition 1) clicked - DIRECT CLICK',
                    );
                    console.log('🔍 [RouteExercise] Current state before base click:', {
                      completedExercises: Array.from(completedExercises),
                      virtualRepeatCompletions: virtualRepeatCompletions,
                      exerciseId: currentExercise.id,
                    });
                    await completeExercise();
                    // After completing base exercise, check if we should auto-advance
                    const allRepeatsCompleted =
                      virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1;
                    if (allRepeatsCompleted && !isLastExercise) {
                      console.log(
                        '🎯 [RouteExercise] All repeats completed - auto-advancing to next exercise',
                      );
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
                    borderLeftColor: completedExercises.has(currentExercise.id)
                      ? '#10B981'
                      : '#6B7280',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: completedExercises.has(currentExercise.id)
                        ? '#10B981'
                        : 'transparent',
                      borderWidth: 2,
                      borderColor: completedExercises.has(currentExercise.id)
                        ? '#10B981'
                        : '#6B7280',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
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
                        console.log(
                          `🎯 [RouteExercise] Repeat #${repeatNumber} clicked - DIRECT CLICK ON VIRTUAL REPEAT`,
                        );
                        console.log(
                          '🔍 [RouteExercise] Current state before virtual repeat click:',
                          {
                            repeatNumber,
                            completedExercises: Array.from(completedExercises),
                            virtualRepeatCompletions: virtualRepeatCompletions,
                            exerciseId: currentExercise.id,
                            isBaseExerciseCompleted: completedExercises.has(currentExercise.id),
                          },
                        );

                        await toggleVirtualRepeatCompletion(repeatNumber);

                        console.log('🔍 [RouteExercise] State after virtual repeat toggle:', {
                          repeatNumber,
                          completedExercises: Array.from(completedExercises),
                          virtualRepeatCompletions: virtualRepeatCompletions,
                          exerciseId: currentExercise.id,
                          isBaseExerciseCompleted: completedExercises.has(currentExercise.id),
                        });

                        // DON'T auto-advance on virtual repeat clicks - only check after state updates properly
                        console.log(
                          '🚫 [RouteExercise] Virtual repeat toggled - NOT auto-advancing (base exercise should remain independent)',
                        );
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
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: isCompleted ? '#10B981' : 'transparent',
                          borderWidth: 2,
                          borderColor: isCompleted ? '#10B981' : '#6B7280',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        {isCompleted && <Feather name="check" size={12} color="white" />}
                      </View>
                      <Text flex={1} color="$color" fontWeight="500">
                        {t('routeExercise.repetition')} {repeatNumber}
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
                    console.log(
                      '🎯 [RouteExercise] All repetitions marked as done - auto-advancing to next exercise',
                    );
                    setTimeout(() => handleNext(), 2000); // Longer delay to show all completions
                  }
                }}
                disabled={
                  loadingRepetitions ||
                  (completedExercises.has(currentExercise.id) &&
                    virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1)
                }
                style={{
                  backgroundColor:
                    completedExercises.has(currentExercise.id) &&
                    virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1
                      ? '#10B981'
                      : '#4B6BFF',
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
                    {completedExercises.has(currentExercise.id) &&
                    virtualRepeatCompletions.length === (currentExercise.repeat_count || 1) - 1
                      ? t('routeExercise.allRepetitionsComplete')
                      : t('routeExercise.markAllDone')}
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
                {t('routeExercise.quizExercise')}
              </Text>
            </XStack>

            {loadingQuiz ? (
              <View
                style={{
                  backgroundColor: '#F3F4F6',
                  padding: 16,
                  borderRadius: 12,
                }}
              >
                <Text fontSize={16} color="#6B7280" textAlign="center">
                  🔄 {t('routeExercise.loadingQuiz')}
                </Text>
              </View>
            ) : quizQuestions.length > 0 ? (
              <>
                {/* Debug logging moved outside JSX */}
                {(() => {
                  console.log('🎯 [RouteExercise] RENDERING INTERACTIVE QUIZ UI:', {
                    questionCount: quizQuestions.length,
                    loadingQuiz,
                    showQuizResults,
                    quizAnswers: Object.keys(quizAnswers).length,
                    exerciseId: currentExercise.id,
                  });
                  return null; // Return null for JSX
                })()}
                {/* Quiz Header with Score and Stats */}
                <XStack alignItems="center" justifyContent="space-between" marginBottom={16}>
                  <XStack alignItems="center" gap={8}>
                    <Feather name="help-circle" size={20} color="#8B5CF6" />
                    <Text fontSize={18} fontWeight="bold" color="#8B5CF6">
                      {t('routeExercise.quizQuestions')} ({quizQuestions.length})
                    </Text>
                  </XStack>

                  {showQuizResults && (
                    <XStack alignItems="center" gap={8}>
                      <Text
                        fontSize={16}
                        fontWeight="600"
                        color={
                          calculateQuizScoreFromRealQuiz().score ===
                          calculateQuizScoreFromRealQuiz().total
                            ? '#10B981'
                            : '#F59E0B'
                        }
                      >
                        {calculateQuizScoreFromRealQuiz().score}/
                        {calculateQuizScoreFromRealQuiz().total}
                      </Text>
                      <TouchableOpacity onPress={resetQuiz}>
                        <Feather name="refresh-cw" size={18} color="#6B7280" />
                      </TouchableOpacity>
                    </XStack>
                  )}
                </XStack>

                {/* Quiz Statistics Panel */}
                {quizStats && (
                  <Card
                    backgroundColor="rgba(75, 107, 255, 0.1)"
                    padding={12}
                    borderRadius={8}
                    marginBottom={12}
                  >
                    <YStack gap={8}>
                      <XStack alignItems="center" justifyContent="space-between">
                        <Text fontSize={14} fontWeight="600" color="#4B6BFF">
                          📊 {t('routeExercise.quizStatistics')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Quiz History',
                              quizHistory.length > 0
                                ? quizHistory
                                    .map(
                                      (attempt, index) =>
                                        `Attempt ${index + 1}: ${attempt.score}/${attempt.total} (${attempt.percentage}%)\n${new Date(attempt.completed_at).toLocaleDateString()}`,
                                    )
                                    .join('\n\n')
                                : 'No previous attempts found',
                              [{ text: 'OK' }],
                            );
                          }}
                        >
                          <Feather name="clock" size={16} color="#4B6BFF" />
                        </TouchableOpacity>
                      </XStack>
                      <XStack justifyContent="space-between">
                        <Text fontSize={12} color="#4B6BFF">
                          Attempts: {quizStats.attempts}
                        </Text>
                        <Text fontSize={12} color="#4B6BFF">
                          Best: {quizStats.bestScore}%
                        </Text>
                        <Text fontSize={12} color="#4B6BFF">
                          Avg: {quizStats.averageScore}%
                        </Text>
                      </XStack>
                      {quizStats.lastAttemptAt && (
                        <Text fontSize={10} color="#6B7280">
                          Last attempt: {new Date(quizStats.lastAttemptAt).toLocaleDateString()}
                        </Text>
                      )}
                    </YStack>
                  </Card>
                )}

                {/* Real Quiz Questions */}
                {quizQuestions.map((question: QuizQuestion, questionIndex: number) => {
                  const userAnswer = quizAnswers[questionIndex];
                  const isMultipleChoice = question.question_type === 'multiple_choice';

                  return (
                    <YStack
                      key={questionIndex}
                      backgroundColor={colorScheme === 'dark' ? '#1F2937' : '#f8f9fa'}
                      padding={16}
                      borderRadius={12}
                      marginBottom={12}
                    >
                      <Text fontSize={16} fontWeight="600" color="$color" marginBottom={12}>
                        Question {questionIndex + 1}:{' '}
                        {getDisplayTextWithLanguage(question.question_text, language)}
                      </Text>

                      {/* Question Media */}
                      {(question.image || question.youtube_url || question.embed_code) && (
                        <YStack marginBottom={12} borderRadius={8} overflow="hidden">
                          {question.image && (
                            <Image
                              source={{ uri: question.image }}
                              style={{
                                width: '100%',
                                height: 200,
                                borderRadius: 8,
                                resizeMode: 'cover',
                              }}
                            />
                          )}
                          {question.youtube_url && (
                            <View style={{ height: 200 }}>
                              <WebView
                                source={{
                                  uri: question.youtube_url.includes('embed')
                                    ? question.youtube_url
                                    : question.youtube_url.replace('watch?v=', 'embed/'),
                                }}
                                style={{ flex: 1 }}
                              />
                            </View>
                          )}
                          {question.embed_code && !question.youtube_url && (
                            <View style={{ height: 200 }}>
                              <WebView source={{ html: question.embed_code }} style={{ flex: 1 }} />
                            </View>
                          )}
                        </YStack>
                      )}

                      {isMultipleChoice && (
                        <Text fontSize={12} color="#8B5CF6" marginBottom={8} fontStyle="italic">
                          {t('routeExercise.multipleAnswers')}
                        </Text>
                      )}

                      {/* Answer Options */}
                      {question.answers && Array.isArray(question.answers) && (
                        <YStack gap={8}>
                          {question.answers
                            .filter((answer: QuizAnswer) => {
                              // Filter out empty answers
                              const answerText = getDisplayTextWithLanguage(
                                answer.answer_text,
                                language,
                              );
                              return answerText && answerText.trim() !== '';
                            })
                            .map((answer: QuizAnswer, answerIndex: number) => {
                              const isSelected = isMultipleChoice
                                ? Array.isArray(userAnswer) && userAnswer.includes(answer.id)
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
                                  onPress={() =>
                                    !showQuizResults &&
                                    handleRealQuizAnswerSelect(
                                      questionIndex,
                                      answer.id,
                                      isMultipleChoice,
                                    )
                                  }
                                  disabled={showQuizResults}
                                  style={{
                                    backgroundColor,
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor,
                                    opacity:
                                      showQuizResults && !isSelected && !isCorrectAnswer ? 0.6 : 1,
                                  }}
                                >
                                  <XStack gap={8} alignItems="center">
                                    {/* Selection indicator */}
                                    <View
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: isMultipleChoice ? 4 : 10,
                                        borderWidth: 2,
                                        borderColor: textColor === 'white' ? 'white' : '#6B7280',
                                        backgroundColor: isSelected
                                          ? textColor === 'white'
                                            ? 'white'
                                            : '#3B82F6'
                                          : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {isSelected && (
                                        <Feather
                                          name="check"
                                          size={12}
                                          color={textColor === 'white' ? '#3B82F6' : 'white'}
                                        />
                                      )}
                                    </View>

                                    <Text fontSize={14} fontWeight="500" color={textColor} flex={1}>
                                      {String.fromCharCode(65 + answerIndex)}.{' '}
                                      {getDisplayTextWithLanguage(answer.answer_text, language)}
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
                        <View
                          style={{
                            backgroundColor: '#EBF8FF',
                            padding: 12,
                            borderRadius: 8,
                            borderLeftWidth: 4,
                            borderLeftColor: '#3B82F6',
                            marginTop: 12,
                          }}
                        >
                          <Text fontSize={14} color="#1F2937" fontStyle="italic">
                            💡 {getDisplayTextWithLanguage(question.explanation_text, language)}
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
                          {t('routeExercise.submitQuiz')}
                        </Text>
                      </XStack>
                    </Button>
                  ) : (
                    <XStack flex={1} gap={12}>
                      <Button onPress={resetQuiz} variant="outlined" flex={1} size="lg">
                        <XStack alignItems="center" gap={8}>
                          <Feather name="refresh-cw" size={16} color={iconColor} />
                          <Text fontSize={16}>{t('routeExercise.tryAgain')}</Text>
                        </XStack>
                      </Button>

                      <YStack
                        flex={1}
                        justifyContent="center"
                        alignItems="center"
                        backgroundColor={
                          calculateQuizScoreFromRealQuiz().score ===
                          calculateQuizScoreFromRealQuiz().total
                            ? '#10B981'
                            : '#F59E0B'
                        }
                        padding={12}
                        borderRadius={8}
                      >
                        <Text fontSize={18} fontWeight="bold" color="white">
                          {calculateQuizScoreFromRealQuiz().score ===
                          calculateQuizScoreFromRealQuiz().total
                            ? `🎉 ${t('routeExercise.perfect')}`
                            : `${Math.round((calculateQuizScoreFromRealQuiz().score / calculateQuizScoreFromRealQuiz().total) * 100)}%`}
                        </Text>
                        <Text fontSize={14} color="white">
                          {calculateQuizScoreFromRealQuiz().score}/
                          {calculateQuizScoreFromRealQuiz().total} {t('routeExercise.correct')}
                        </Text>
                      </YStack>
                    </XStack>
                  )}
                </XStack>
              </>
            ) : getDisplayText(currentExercise.title).toLowerCase().includes('quiz') ? (
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  padding: 16,
                  borderRadius: 12,
                }}
              >
                <Text fontSize={16} color="#92400E" textAlign="center">
                  📝 Quiz exercise detected but no questions found in database
                </Text>
                <Text fontSize={14} color="#92400E" textAlign="center" marginTop={4}>
                  Exercise ID: {currentExercise.learning_path_exercise_id || currentExercise.id}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: '#EBF8FF',
                  padding: 16,
                  borderRadius: 12,
                }}
              >
                <Text fontSize={16} color="#1F2937" textAlign="center">
                  🎯 Quiz functionality ready - questions will load from database
                </Text>
              </View>
            )}
          </YStack>
        )}

        {/* Completion Status */}
        {isCompleted && (
          <View
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              padding: 16,
              borderRadius: 12,
              marginTop: 16,
              borderWidth: 1,
              borderColor: '#10B981',
            }}
          >
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
        <Header title={t('routeDetail.exercises')} showBack />
        <YStack f={1} justifyContent="center" alignItems="center" padding="$4">
          <Feather name="book-open" size={64} color="$gray9" />
          <Text fontSize={18} fontWeight="600" textAlign="center" marginTop="$4">
            {t('routeExercise.noExercisesAvailable')}
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop="$2">
            {t('routeExercise.noExercisesMessage')}
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
          title={`${routeName || t('common.route')} ${t('routeDetail.exercises')}`}
          showBack
          rightElement={
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Exercise Options',
                  'What would you like to do?',
                  [
                    {
                      text: 'Report Issue',
                      onPress: () => {
                        Alert.alert(
                          'Report Exercise',
                          'Please describe the issue with this exercise',
                          [
                            {
                              text: 'Cancel',
                              style: 'cancel',
                            },
                            {
                              text: 'Report',
                              onPress: async () => {
                                // TODO: Implement report functionality
                                console.log('Report exercise:', currentExercise?.id);
                                Alert.alert('Success', 'Thank you for your feedback. The exercise has been reported.');
                              },
                            },
                          ],
                        );
                      },
                    },
                    {
                      text: 'View Instructions',
                      onPress: () => {
                        Alert.alert(
                          'How to Complete',
                          practiceMode
                            ? 'You are in PRACTICE MODE. Completions will not update your learning path progress. Use this mode to review exercises you\'ve already completed.'
                            : 'Complete each exercise to progress. Your completions will be saved to both this route and your learning path progress.',
                          [{ text: 'Got it' }],
                        );
                      },
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ],
                );
              }}
            >
              <Feather name="more-vertical" size={20} color={iconColor} />
            </TouchableOpacity>
          }
        />

        {/* Practice Mode Indicator */}
        {practiceMode && (
          <View
            style={{
              backgroundColor: '#10B981',
              paddingVertical: 8,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Feather name="refresh-cw" size={14} color="white" />
            <Text fontSize={12} color="white" fontWeight="600">
              PRACTICE MODE - Progress won't affect learning paths
            </Text>
          </View>
        )}

        {/* Previous completion notice */}
        {hasCompletedBefore && !practiceMode && (
          <View
            style={{
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6',
              padding: 12,
              marginHorizontal: 16,
              marginVertical: 8,
              borderRadius: 8,
            }}
          >
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

          <Progress value={Math.round(progress)} backgroundColor="$gray5" size="$1">
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
          <View
            style={{
              backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E7EB',
              padding: 16,
            }}
          >
            <YStack gap="$3">
              {/* Action Buttons */}
              <XStack gap="$3">
                <Button
                  onPress={async () => {
                    const isCompleted = completedExercises.has(currentExercise?.id || '');

                    console.log('🎯 [RouteExercise] Complete/Incomplete button pressed:', {
                      exerciseId: currentExercise.id,
                      exerciseTitle: getDisplayText(currentExercise.title),
                      currentlyCompleted: isCompleted,
                      actionToTake: isCompleted ? 'MARK_INCOMPLETE' : 'MARK_COMPLETE',
                      isRepeatExercise: currentExercise.isRepeat,
                      hasRepeats:
                        !!currentExercise.repeat_count && currentExercise.repeat_count > 1,
                    });

                    if (isCompleted) {
                      // Toggle to incomplete - remove from local state
                      const newCompleted = new Set(completedExercises);
                      newCompleted.delete(currentExercise.id);
                      setCompletedExercises(newCompleted);

                      console.log('🔴 [RouteExercise] Marking exercise as incomplete');

                      // Remove from database
                      await supabase
                        .from('route_exercise_completions')
                        .delete()
                        .eq('session_id', sessionId)
                        .eq('exercise_id', currentExercise.id);
                    } else {
                      console.log(
                        '🟢 [RouteExercise] Marking exercise as complete (NOT affecting virtual repeats)',
                      );

                      // Complete the exercise
                      await completeExercise();

                      // DON'T auto-advance if this exercise has repeats - user should decide when to move on
                      if (currentExercise.repeat_count && currentExercise.repeat_count > 1) {
                        console.log(
                          '🚫 [RouteExercise] Exercise has repeats - NOT auto-advancing to next exercise',
                        );
                      }
                    }
                  }}
                  backgroundColor={
                    completedExercises.has(currentExercise?.id || '') ? '$gray10' : '$green10'
                  }
                  flex={1}
                  size="lg"
                  icon={
                    <Feather
                      name={completedExercises.has(currentExercise?.id || '') ? 'x' : 'check'}
                      size={20}
                      color="white"
                    />
                  }
                >
                  <Text color="white" fontSize={16} fontWeight="600">
                    {completedExercises.has(currentExercise?.id || '')
                      ? t('routeExercise.markIncomplete')
                      : t('routeExercise.complete')}
                  </Text>
                </Button>

                {!isLastExercise && (
                  <Button
                    onPress={handleSkip}
                    variant="outlined"
                    size="lg"
                    icon={<Feather name="skip-forward" size={20} color={iconColor} />}
                  >
                    {t('routeExercise.skip')}
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
                  {t('routeExercise.previous')}
                </Button>

                <Button
                  onPress={handleNext}
                  disabled={isLastExercise}
                  variant="outlined"
                  icon={<Feather name="arrow-right" size={20} color={iconColor} />}
                >
                  {t('routeExercise.next')}
                </Button>
              </XStack>
            </YStack>
          </View>
        )}
      </YStack>
    </Screen>
  );
}
