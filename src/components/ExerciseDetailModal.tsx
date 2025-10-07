import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  useColorScheme,
  Alert,
  Modal as RNModal,
} from 'react-native';
import { YStack, XStack, Card, Button } from 'tamagui';
import { Text } from './Text';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Exercise } from '../types/route';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { supabase } from '../lib/supabase';
import { ExerciseProgressService } from '../services/exerciseProgressService';
import { CommentsSection } from './CommentsSection';

// Helper function to extract text from multilingual fields
const getDisplayText = (
  text: string | { en: string; sv: string } | undefined,
  fallback: string = '',
): string => {
  if (!text) return fallback;
  if (typeof text === 'string') return text;
  return text.en || text.sv || fallback;
};

// Quiz types (copied from ProgressScreen)
interface QuizQuestion {
  id: string;
  exercise_id: string;
  question_text: { en: string; sv: string };
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  answers: QuizAnswer[];
  explanation_text?: { en: string; sv: string };
  points: number;
  order_index: number;
  image?: string;
}

interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: { en: string; sv: string };
  is_correct: boolean;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  user_id: string;
  exercise_id: string;
  attempt_number: number;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_spent_seconds: number;
  is_completed: boolean;
  passed: boolean;
  pass_threshold: number;
}

interface ExerciseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  routeId: string;
  onExerciseComplete?: (exerciseId: string) => void;
}

export function ExerciseDetailModal({
  visible,
  onClose,
  exercise,
  routeId,
  onExerciseComplete,
}: ExerciseDetailModalProps) {
  const { user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const colorScheme = useColorScheme();
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastAudit, setLastAudit] = useState<{
    actor_name: string | null;
    created_at: string;
    action: string;
  } | null>(null);
  const [viewingUserName, setViewingUserName] = useState<string | null>(null);

  // Use activeStudentId if available (for instructor viewing student data)
  const effectiveUserId = activeStudentId || user?.id;

  // Quiz state management (copied from ProgressScreen)
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string[] }>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<{
    [key: number]: { isCorrect: boolean; correctAnswerId: string };
  }>({});
  const [currentQuizAttempt, setCurrentQuizAttempt] = useState<QuizAttempt | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);

  useEffect(() => {
    if (exercise && effectiveUserId) {
      checkCompletion();
      loadLastAudit();
    }
  }, [exercise, effectiveUserId]);

  // Load "Viewing as" display
  useEffect(() => {
    const loadViewingUser = async () => {
      try {
        if (!effectiveUserId) {
          setViewingUserName(null);
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', effectiveUserId)
          .single();
        setViewingUserName(data?.full_name || data?.email || null);
      } catch {
        setViewingUserName(null);
      }
    };
    loadViewingUser();
  }, [effectiveUserId]);

  const loadLastAudit = async () => {
    if (!exercise || !effectiveUserId) return;
    try {
      const { data, error } = await supabase
        .from('exercise_completion_audit')
        .select('actor_name, created_at, action')
        .eq('student_id', effectiveUserId)
        .eq('exercise_id', exercise.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!error && data) setLastAudit(data as any);
      else setLastAudit(null);
    } catch {
      setLastAudit(null);
    }
  };

  const checkCompletion = async () => {
    if (!exercise || !effectiveUserId) return;

    try {
      console.log(
        '🔍 [ExerciseDetailModal] Checking completion for user:',
        effectiveUserId,
        'exercise:',
        exercise.id,
      );
      const { data, error } = await supabase
        .from('route_exercise_completions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('exercise_id', exercise.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking completion:', error);
        return;
      }

      setIsCompleted(!!data);
    } catch (error) {
      console.error('Error checking completion:', error);
    }
  };

  // Quiz functions (copied and adapted from ProgressScreen)
  const saveQuizQuestionAttempt = async (
    questionId: string,
    selectedAnswerIds: string[],
    isCorrect: boolean,
    timeSpentSeconds: number,
    pointsEarned: number,
  ) => {
    if (!effectiveUserId || !currentQuizAttempt) return;

    try {
      const { error } = await supabase.from('quiz_question_attempts').insert({
        attempt_id: currentQuizAttempt.id,
        question_id: questionId,
        selected_answer_ids: selectedAnswerIds,
        is_correct: isCorrect,
        time_spent_seconds: timeSpentSeconds,
        points_earned: pointsEarned,
      });

      if (error) {
        console.error('Error saving quiz question attempt:', error);
      }
    } catch (error) {
      console.error('Error saving quiz question attempt:', error);
    }
  };

  const startQuizAttempt = async (exerciseId: string) => {
    if (!effectiveUserId) return;

    try {
      // Get the latest attempt number for this user and exercise
      const { data: latestAttempt } = await supabase
        .from('quiz_attempts')
        .select('attempt_number')
        .eq('user_id', effectiveUserId)
        .eq('exercise_id', exerciseId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single();

      const attemptNumber = (latestAttempt?.attempt_number || 0) + 1;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: effectiveUserId,
          exercise_id: exerciseId,
          attempt_number: attemptNumber,
          total_questions: quizQuestions.length,
          correct_answers: 0,
          score_percentage: 0,
          time_spent_seconds: 0,
          is_completed: false,
          passed: false,
          pass_threshold: exercise?.quiz_pass_score || 70,
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting quiz attempt:', error);
        return;
      }

      setCurrentQuizAttempt(data);
    } catch (error) {
      console.error('Error starting quiz attempt:', error);
    }
  };

  const completeQuizAttempt = async (
    attemptId: string,
    score: { correct: number; total: number },
  ) => {
    const scorePercentage = (score.correct / score.total) * 100;
    const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
    const passed = scorePercentage >= (exercise?.quiz_pass_score || 70);

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          correct_answers: score.correct,
          score_percentage: scorePercentage,
          time_spent_seconds: timeSpent,
          is_completed: true,
          passed: passed,
        })
        .eq('id', attemptId);

      if (error) {
        console.error('Error completing quiz attempt:', error);
      }
    } catch (error) {
      console.error('Error completing quiz attempt:', error);
    }
  };

  const startQuiz = async () => {
    if (!exercise || !exercise.has_quiz) return;

    try {
      // 1. Fetch quiz questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(
          `
          *,
          answers:quiz_answers(*)
        `,
        )
        .eq('exercise_id', exercise.id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('Error fetching quiz questions:', questionsError);
        return;
      }

      if (!questions || questions.length === 0) {
        Alert.alert('No Quiz Available', 'This exercise does not have quiz questions yet.');
        return;
      }

      // 2. Set quiz questions
      setQuizQuestions(questions as QuizQuestion[]);
      setCurrentQuestionIndex(0);
      setQuizAnswers({});
      setQuizCompleted(false);
      setQuizScore({ correct: 0, total: 0 });
      setShowAnswerFeedback({});
      setQuizStartTime(Date.now());

      // 3. Start quiz attempt
      await startQuizAttempt(exercise.id);

      // 4. Show quiz
      setShowQuiz(true);
    } catch (error) {
      console.error('Error starting quiz:', error);
      Alert.alert('Error', 'Failed to start quiz. Please try again.');
    }
  };

  const handleAnswerSelect = async (answerIds: string[]) => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Find the selected answers
    const selectedAnswers = currentQuestion.answers.filter((answer) =>
      answerIds.includes(answer.id),
    );

    // Determine if the answer is correct
    let isCorrect = false;
    if (
      currentQuestion.question_type === 'single_choice' ||
      currentQuestion.question_type === 'true_false'
    ) {
      isCorrect = selectedAnswers.length === 1 && selectedAnswers[0].is_correct;
    } else if (currentQuestion.question_type === 'multiple_choice') {
      const correctAnswers = currentQuestion.answers.filter((answer) => answer.is_correct);
      isCorrect =
        selectedAnswers.length === correctAnswers.length &&
        selectedAnswers.every((answer) => answer.is_correct);
    }

    // Find the correct answer for feedback
    const correctAnswer = currentQuestion.answers.find((answer) => answer.is_correct);

    // Update UI feedback
    setShowAnswerFeedback((prev) => ({
      ...prev,
      [currentQuestionIndex]: {
        isCorrect,
        correctAnswerId: correctAnswer?.id || '',
      },
    }));

    // Store the answer
    setQuizAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: answerIds,
    }));

    // Update score
    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Save to database
    const timeSpent = 30; // You can track actual time spent per question
    const pointsEarned = isCorrect ? currentQuestion.points : 0;
    await saveQuizQuestionAttempt(
      currentQuestion.id,
      answerIds,
      isCorrect,
      timeSpent,
      pointsEarned,
    );
  };

  const handleQuizNext = async () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Complete quiz
      if (currentQuizAttempt) {
        await completeQuizAttempt(currentQuizAttempt.id, quizScore);
      }
      setQuizCompleted(true);
    }
  };

  const handleQuizPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore({ correct: 0, total: 0 });
    setShowAnswerFeedback({});
    setCurrentQuizAttempt(null);
    setQuizStartTime(Date.now());

    if (exercise) {
      startQuizAttempt(exercise.id);
    }
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore({ correct: 0, total: 0 });
    setShowAnswerFeedback({});
    setCurrentQuizAttempt(null);
    setQuizStartTime(0);
  };

  const handleMarkComplete = async () => {
    if (!exercise || !effectiveUserId) return;

    setLoading(true);
    try {
      console.log(
        '✅ [ExerciseDetailModal] Marking complete for user:',
        effectiveUserId,
        'exercise:',
        exercise.id,
      );
      // Create session first
      const { data: session, error: sessionError } = await supabase
        .from('route_exercise_sessions')
        .insert({
          user_id: effectiveUserId,
          route_id: routeId,
          exercise_id: exercise.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        throw sessionError;
      }

      // Create completion record
      const { error: completionError } = await supabase.from('route_exercise_completions').insert({
        session_id: session.id,
        user_id: effectiveUserId,
        exercise_id: exercise.id,
        completed_at: new Date().toISOString(),
      });

      if (completionError) {
        console.error('Error creating completion:', completionError);
        throw completionError;
      }

      // Update learning path progress if connected
      if (exercise.id.startsWith('lpe_')) {
        const learningPathExerciseId = exercise.id;
        await ExerciseProgressService.completeExerciseFromRoute(learningPathExerciseId, routeId);
      }

      setIsCompleted(true);
      onExerciseComplete?.(exercise.id);

      Alert.alert('Success', 'Exercise marked as complete!');
    } catch (error) {
      console.error('Error marking complete:', error);
      Alert.alert('Error', 'Failed to mark exercise as complete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (copied from ProgressScreen)
  const getYouTubeVideoId = (url: string): string | null => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getTypeformId = (url: string): string | null => {
    const regex = /typeform\.com\/to\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const YouTubeEmbed = ({ videoId }: { videoId: string }) => (
    <WebView
      source={{ uri: `https://www.youtube.com/embed/${videoId}` }}
      style={{ width: '100%', height: 200 }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
    />
  );

  const TypeFormEmbed = ({ typeformId }: { typeformId: string }) => (
    <WebView
      source={{ uri: `https://form.typeform.com/to/${typeformId}` }}
      style={{ width: '100%', height: 400 }}
    />
  );

  const renderExerciseMedia = (exercise: Exercise) => {
    const media = [];

    // YouTube videos
    if (exercise.youtube_url) {
      const videoId = getYouTubeVideoId(exercise.youtube_url);
      if (videoId) {
        media.push(
          <View key="youtube" style={{ marginBottom: 16 }}>
            <YouTubeEmbed videoId={videoId} />
          </View>,
        );
      }
    }

    // Images
    if (exercise.image) {
      media.push(
        <TouchableOpacity
          key="image"
          onPress={() => Linking.openURL(exercise.image!)}
          style={{ marginBottom: 16 }}
        >
          <Image
            source={{ uri: exercise.image }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: 8,
            }}
            resizeMode="cover"
          />
        </TouchableOpacity>,
      );
    }

    // Typeform embeds
    if (exercise.embed_code) {
      const typeformId = getTypeformId(exercise.embed_code);
      if (typeformId) {
        media.push(
          <View key="typeform" style={{ marginBottom: 16 }}>
            <TypeFormEmbed typeformId={typeformId} />
          </View>,
        );
      }
    }

    return media;
  };

  // Quiz Interface Component
  const QuizInterface = () => {
    if (!showQuiz || quizQuestions.length === 0) return null;

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    const selectedAnswers = quizAnswers[currentQuestionIndex] || [];
    const feedback = showAnswerFeedback[currentQuestionIndex];
    const hasAnswer = selectedAnswers.length > 0;

    if (quizCompleted) {
      const scorePercentage = (quizScore.correct / quizScore.total) * 100;
      const passed = scorePercentage >= (exercise?.quiz_pass_score || 70);

      return (
        <RNModal
          visible={showQuiz}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeQuiz}
        >
          <YStack flex={1} backgroundColor="$background" padding={24}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
              <Text fontSize={24} fontWeight="bold" color="$color">
                Quiz Completed!
              </Text>
              <TouchableOpacity onPress={closeQuiz}>
                <Feather name="x" size={28} color="#fff" />
              </TouchableOpacity>
            </XStack>

            <YStack alignItems="center" marginBottom={32}>
              <YStack alignItems="center" marginBottom={16}>
                <Text fontSize={48} fontWeight="bold" color={passed ? '#00E6C3' : '#EF4444'}>
                  {scorePercentage.toFixed(0)}%
                </Text>
                <Text fontSize={18} fontWeight="bold" color={passed ? '#00E6C3' : '#EF4444'}>
                  {passed ? 'PASSED' : 'FAILED'}
                </Text>
              </YStack>

              <Text fontSize={16} color="$color" marginBottom={8}>
                {quizScore.correct} Correct | {quizScore.total - quizScore.correct} Incorrect
              </Text>
            </YStack>

            <XStack gap={12}>
              <Button flex={1} backgroundColor="#333" onPress={closeQuiz} borderRadius={12}>
                Back to Exercise
              </Button>
              <Button
                flex={1}
                backgroundColor="#00E6C3"
                color="#000"
                onPress={() => {
                  setQuizCompleted(false);
                  resetQuiz();
                }}
                borderRadius={12}
              >
                Start Over
              </Button>
            </XStack>
          </YStack>
        </RNModal>
      );
    }

    return (
      <RNModal
        visible={showQuiz}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeQuiz}
      >
        <YStack flex={1} backgroundColor="$background">
          {/* Quiz Header */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            padding={16}
            borderBottomWidth={1}
            borderBottomColor="rgba(255, 255, 255, 0.2)"
          >
            <TouchableOpacity onPress={closeQuiz}>
              <Feather name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>

            <YStack alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$color">
                Quiz: {getDisplayText(exercise?.title, 'Exercise Quiz')}
              </Text>
              <Text fontSize={14} color="$gray11">
                Question {currentQuestionIndex + 1} of {quizQuestions.length} | Score:{' '}
                {quizScore.correct}/{quizScore.total}
              </Text>
            </YStack>

            <TouchableOpacity onPress={resetQuiz}>
              <Text fontSize={14} color="#00E6C3">
                Start Over
              </Text>
            </TouchableOpacity>
          </XStack>

          {/* Progress Bar */}
          <View style={{ padding: 16 }}>
            <View
              style={{
                width: '100%',
                height: 4,
                backgroundColor: '#333',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#00E6C3',
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
            {/* Question Content */}
            <YStack
              backgroundColor="rgba(255, 255, 255, 0.1)"
              borderRadius={12}
              padding={16}
              marginBottom={24}
            >
              <Text fontSize={18} fontWeight="bold" color="$color" marginBottom={16}>
                {getDisplayText(currentQuestion.question_text, 'Question text not available')}
              </Text>

              {/* Question Media */}
              {currentQuestion.image && (
                <Image
                  source={{ uri: currentQuestion.image }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                />
              )}
            </YStack>

            {/* Answer Options */}
            <YStack gap={8}>
              {currentQuestion.answers.map((answer) => {
                const isSelected = selectedAnswers.includes(answer.id);
                const isCorrect = feedback?.isCorrect && isSelected;
                const isIncorrect = feedback && !feedback.isCorrect && isSelected;
                const isCorrectAnswer = feedback?.correctAnswerId === answer.id;
                const showFeedback = !!feedback;

                let backgroundColor = 'rgba(255, 255, 255, 0.05)';
                let borderColor = 'rgba(255, 255, 255, 0.2)';

                if (showFeedback) {
                  if (isCorrect || isCorrectAnswer) {
                    backgroundColor = 'rgba(34, 197, 94, 0.2)';
                    borderColor = '#22C55E';
                  } else if (isIncorrect) {
                    backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    borderColor = '#EF4444';
                  }
                }

                return (
                  <TouchableOpacity
                    key={answer.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor,
                      borderColor,
                      opacity: showFeedback ? 0.8 : 1,
                    }}
                    onPress={() => !showFeedback && handleAnswerSelect([answer.id])}
                    disabled={showFeedback}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#00E6C3' : '#666',
                        backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                        marginRight: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Feather name="check" size={16} color="#fff" />}
                    </View>

                    <Text fontSize={16} color="$color" flex={1}>
                      {getDisplayText(answer.answer_text, 'Answer not available')}
                    </Text>

                    {showFeedback && (isCorrect || isCorrectAnswer) && (
                      <Feather name="check-circle" size={20} color="#22C55E" />
                    )}
                    {showFeedback && isIncorrect && (
                      <Feather name="x-circle" size={20} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </YStack>

            {/* Explanation */}
            {feedback && currentQuestion.explanation_text?.en && (
              <YStack
                backgroundColor="rgba(0, 230, 195, 0.1)"
                padding={16}
                borderRadius={12}
                marginTop={16}
              >
                <Text fontSize={16} fontWeight="bold" color="#00E6C3" marginBottom={8}>
                  Explanation
                </Text>
                <Text fontSize={14} color="$color">
                  {getDisplayText(currentQuestion.explanation_text, 'No explanation available')}
                </Text>
              </YStack>
            )}
          </ScrollView>

          {/* Navigation */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            padding={16}
            borderTopWidth={1}
            borderTopColor="rgba(255, 255, 255, 0.2)"
          >
            <Button
              backgroundColor={currentQuestionIndex > 0 ? '#333' : 'transparent'}
              disabled={currentQuestionIndex === 0}
              onPress={handleQuizPrevious}
              borderRadius={8}
              paddingHorizontal={20}
            >
              Previous
            </Button>

            <Text fontSize={14} color="$gray11">
              {currentQuestionIndex + 1} / {quizQuestions.length}
            </Text>

            <Button
              backgroundColor={hasAnswer ? '#00E6C3' : '#666'}
              color={hasAnswer ? '#000' : '#ccc'}
              disabled={!hasAnswer}
              onPress={handleQuizNext}
              borderRadius={8}
              paddingHorizontal={20}
            >
              {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </XStack>
        </YStack>
      </RNModal>
    );
  };

  if (!exercise) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          }}
        >
          {/* Header */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            padding={16}
            borderBottomWidth={1}
            borderBottomColor="rgba(255, 255, 255, 0.2)"
          >
            <TouchableOpacity onPress={onClose}>
              <Feather
                name="arrow-left"
                size={28}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
            </TouchableOpacity>

            <Text fontSize={18} fontWeight="bold" color="$color" flex={1} textAlign="center">
              Exercise Details
            </Text>

            <View style={{ width: 28 }} />
          </XStack>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {viewingUserName && (
              <YStack
                marginBottom={12}
                padding={10}
                backgroundColor={colorScheme === 'dark' ? '#162023' : '#E6FFFA'}
                borderRadius={12}
              >
                <Text color={colorScheme === 'dark' ? '#00E6C3' : '#0F766E'} fontSize={12}>
                  Viewing as: {viewingUserName}
                </Text>
              </YStack>
            )}
            {/* Exercise Title */}
            <XStack alignItems="center" gap="$3" marginBottom="$4">
              <Feather name="book-open" size={24} color="#00E6C3" />
              <Text fontSize={24} fontWeight="bold" color="$color" flex={1}>
                {getDisplayText(exercise.title, 'Untitled Exercise')}
              </Text>
            </XStack>

            {/* Exercise Description */}
            {exercise.description && (
              <Text fontSize={16} color="$gray11" marginBottom="$6" lineHeight={24}>
                {getDisplayText(exercise.description, 'No description available')}
              </Text>
            )}

            {/* Media Content */}
            {renderExerciseMedia(exercise)}

            {/* Comments */}
            <CommentsSection targetType="exercise" targetId={exercise.id} />

            {/* Quiz Section */}
            {exercise.has_quiz && (
              <Card bordered padding="$4" marginBottom="$4" backgroundColor="$backgroundStrong">
                <XStack alignItems="center" gap="$3" marginBottom="$3">
                  <MaterialIcons name="quiz" size={24} color="#00E6C3" />
                  <Text fontSize={18} fontWeight="bold" color="$color">
                    Interactive Quiz
                  </Text>
                </XStack>

                <Text fontSize={14} color="$gray11" marginBottom="$4">
                  Test your knowledge with an interactive quiz for this exercise.
                </Text>

                <Button
                  backgroundColor="#00E6C3"
                  color="#000"
                  onPress={startQuiz}
                  borderRadius={12}
                >
                  <XStack alignItems="center" gap="$2">
                    <Feather name="play" size={16} color="#000" />
                    <Text color="#000" fontWeight="bold">
                      Start Quiz
                    </Text>
                  </XStack>
                </Button>
              </Card>
            )}

            {/* Quiz Data Display (non-interactive) */}
            {exercise.quiz_data && (
              <Card bordered padding="$4" marginBottom="$4" backgroundColor="$backgroundStrong">
                <XStack alignItems="center" gap="$3" marginBottom="$3">
                  <MaterialIcons name="quiz" size={24} color="#FFB800" />
                  <Text fontSize={18} fontWeight="bold" color="$color">
                    Quiz Questions
                  </Text>
                </XStack>

                {exercise.quiz_data.questions?.map((question: any, index: number) => (
                  <YStack
                    key={index}
                    marginBottom="$4"
                    padding="$3"
                    backgroundColor="$background"
                    borderRadius={8}
                  >
                    <Text fontSize={16} fontWeight="bold" color="$color" marginBottom="$2">
                      {index + 1}. {question.question}
                    </Text>

                    {question.options?.map((option: string, optionIndex: number) => (
                      <Text key={optionIndex} fontSize={14} color="$gray11" marginLeft="$3">
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </Text>
                    ))}

                    {question.correct_answer && (
                      <Text fontSize={14} color="#00E6C3" marginTop="$2" fontWeight="bold">
                        Correct: {question.correct_answer}
                      </Text>
                    )}

                    {question.explanation && (
                      <Text fontSize={14} color="$gray9" marginTop="$2" fontStyle="italic">
                        {question.explanation}
                      </Text>
                    )}
                  </YStack>
                ))}
              </Card>
            )}

            {/* Completion Status */}
            <Card bordered padding="$4" marginBottom="$4">
              <XStack alignItems="center" gap="$3" marginBottom="$3">
                <Feather
                  name={isCompleted ? 'check-circle' : 'circle'}
                  size={24}
                  color={isCompleted ? '#10B981' : '#6B7280'}
                />
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {isCompleted ? 'Completed' : 'Not Completed'}
                </Text>
              </XStack>

              {lastAudit && (
                <Text color="$gray11" size="sm" marginBottom="$2">
                  Last action: {lastAudit.action.replace('_', ' ')} by{' '}
                  {lastAudit.actor_name || 'Unknown'} at{' '}
                  {new Date(lastAudit.created_at).toLocaleString()}
                </Text>
              )}

              {!isCompleted && (
                <Button
                  backgroundColor="#00E6C3"
                  color="#000"
                  onPress={handleMarkComplete}
                  disabled={loading}
                  borderRadius={12}
                >
                  {loading ? 'Marking Complete...' : 'Mark as Complete'}
                </Button>
              )}
            </Card>
          </ScrollView>
        </View>
      </Modal>

      {/* Quiz Interface */}
      <QuizInterface />
    </>
  );
}
