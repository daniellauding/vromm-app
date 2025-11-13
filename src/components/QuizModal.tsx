import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface QuizQuestion {
  id: string;
  exercise_id: string;
  question_text: { en: string; sv: string };
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  category?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  points?: number;
  time_limit?: number;
  explanation?: { en: string; sv: string };
  reference?: string;
  image?: string;
  youtube_url?: string;
  order_index: number;
  exercise_quiz_answers?: QuizAnswer[];
  answers?: QuizAnswer[];
}

interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: { en: string; sv: string };
  is_correct: boolean;
  answer_label?: string;
  image?: string;
  youtube_url?: string;
  order_index: number;
}

interface QuizModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseTitle: { en: string; sv: string };
  quizRequired: boolean;
  quizPassScore: number;
  onQuizComplete?: (passed: boolean, score: number) => void;
}

export function QuizModal({
  visible,
  onClose,
  exerciseId,
  exerciseTitle,
  quizRequired,
  quizPassScore,
  onQuizComplete,
}: QuizModalProps) {
  const colorScheme = useColorScheme();
  const { language: lang } = useTranslation();
  const { user } = useAuth();
  const backgroundColor = colorScheme === 'dark' ? '#151515' : '#FFFFFF';

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load quiz questions
  useEffect(() => {
    if (visible && exerciseId) {
      loadQuestions();
    }
  }, [visible, exerciseId]);

  const loadQuestions = async () => {
    console.log('🎯 [QuizModal] loadQuestions called with exerciseId:', exerciseId);
    setLoading(true);
    try {
      // Fetch questions with answers (same as admin panel)
      console.log('🎯 [QuizModal] Fetching questions from exercise_quiz_questions...');
      const { data: questionsData, error: qError } = await supabase
        .from('exercise_quiz_questions')
        .select(`
          *,
          exercise_quiz_answers(*)
        `)
        .eq('exercise_id', exerciseId)
        .order('order_index');

      console.log('🎯 [QuizModal] Query result:', { questionsData, qError });

      if (qError) {
        console.error('🎯 [QuizModal] Error fetching questions:', qError);
        throw qError;
      }

      if (!questionsData || questionsData.length === 0) {
        console.log('🎯 [QuizModal] No questions found for exercise:', exerciseId);
        Alert.alert('No Quiz', 'This exercise does not have any quiz questions yet.');
        onClose();
        return;
      }

      // Format questions with answers
      const formattedQuestions = questionsData.map((q) => ({
        ...q,
        // Add default values for optional fields
        difficulty: q.difficulty || 'Medium',
        points: q.points || 10,
        category: q.category || 'General',
        // Sort answers by order_index and add answer_label (A, B, C, D)
        answers: (q.exercise_quiz_answers || [])
          .sort((a: QuizAnswer, b: QuizAnswer) => a.order_index - b.order_index)
          .map((a: QuizAnswer, idx: number) => ({
            ...a,
            answer_label: String.fromCharCode(65 + idx), // A, B, C, D...
          })),
      }));

      console.log('🎯 [QuizModal] Formatted questions:', JSON.stringify(formattedQuestions, null, 2));
      console.log('🎯 [QuizModal] Total questions:', formattedQuestions.length);
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('❌ [QuizModal] Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz questions');
      onClose();
    } finally {
      console.log('🎯 [QuizModal] Loading finished');
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerId: string) => {
    const currentQuestion = questions[currentIndex];
    if (
      currentQuestion.question_type === 'single_choice' ||
      currentQuestion.question_type === 'true_false'
    ) {
      setSelectedAnswers([answerId]);
    } else {
      setSelectedAnswers((prev) =>
        prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId],
      );
    }
  };

  const submitAnswer = () => {
    const currentQuestion = questions[currentIndex];
    const answers = currentQuestion.answers || [];
    const correctIds = answers.filter((a) => a.is_correct).map((a) => a.id);

    // Check correctness
    const isCorrect =
      selectedAnswers.length === correctIds.length &&
      selectedAnswers.every((id) => correctIds.includes(id));

    // Award points
    let pointsEarned = 0;
    if (isCorrect) {
      pointsEarned = currentQuestion.points;
    } else if (currentQuestion.question_type === 'multiple_choice') {
      const correctSelected = selectedAnswers.filter((id) => correctIds.includes(id)).length;
      const wrongSelected = selectedAnswers.filter((id) => !correctIds.includes(id)).length;
      if (wrongSelected === 0 && correctSelected > 0) {
        pointsEarned = Math.round(currentQuestion.points * 0.5);
      }
    }

    setScore((prev) => prev + pointsEarned);

    // Next question or finish
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswers([]);
    } else {
      finishQuiz(score + pointsEarned);
    }
  };

  const finishQuiz = async (finalScore: number) => {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const scorePercentage = totalPoints > 0 ? (finalScore / totalPoints) * 100 : 0;
    const passed = scorePercentage >= quizPassScore;

    // Save attempt
    if (user?.id) {
      try {
        await supabase.from('quiz_attempts').insert({
          user_id: user.id,
          exercise_id: exerciseId,
          quiz_type: 'learning_path',
          total_questions: questions.length,
          correct_answers: Math.round((scorePercentage / 100) * questions.length),
          incorrect_answers: questions.length - Math.round((scorePercentage / 100) * questions.length),
          score_percentage: scorePercentage,
          points_earned: finalScore,
          time_taken: 0,
          passed,
        });
      } catch (error) {
        console.error('Error saving quiz attempt:', error);
      }
    }

    setShowResults(true);
    onQuizComplete?.(passed, scorePercentage);
  };

  const retry = () => {
    setCurrentIndex(0);
    setSelectedAnswers([]);
    setScore(0);
    setShowResults(false);
  };

  const handleClose = () => {
    if (!showResults && currentIndex > 0) {
      Alert.alert('Exit Quiz?', 'Your progress will not be saved.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          onPress: () => {
            setCurrentIndex(0);
            setSelectedAnswers([]);
            setScore(0);
            setShowResults(false);
            onClose();
          },
        },
      ]);
    } else {
      setCurrentIndex(0);
      setSelectedAnswers([]);
      setScore(0);
      setShowResults(false);
      onClose();
    }
  };

  if (!visible) return null;

  console.log('🎯 [QuizModal] Rendering - state:', {
    loading,
    showResults,
    questionsLength: questions.length,
    currentIndex,
    selectedAnswers,
    score,
  });

  const currentQuestion = questions[currentIndex];
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const scorePercentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

  console.log('🎯 [QuizModal] Current question:', currentQuestion);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <YStack
            backgroundColor={backgroundColor}
            borderRadius={24}
            padding={24}
            width="90%"
            maxWidth={500}
          >
            <Text color="$color">Loading quiz...</Text>
          </YStack>
        ) : !showResults ? (
          /* Question View */
          <ScrollView
            style={{ width: '100%', maxHeight: '90%' }}
            contentContainerStyle={{ alignItems: 'center', padding: 20 }}
          >
            <YStack
              backgroundColor={backgroundColor}
              borderRadius={24}
              padding={24}
              width="100%"
              maxWidth={500}
              gap={20}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={16} color="$gray11">
                  Question {currentIndex + 1} of {questions.length}
                </Text>
                <TouchableOpacity onPress={handleClose}>
                  <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
                </TouchableOpacity>
              </XStack>

              {/* Title */}
              <Text fontSize={20} fontWeight="bold" color="$color" textAlign="center">
                {exerciseTitle[lang] || exerciseTitle.en}
              </Text>

              {/* Progress */}
              <View
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: '#333',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                    height: '100%',
                    backgroundColor: '#4B6BFF',
                    borderRadius: 4,
                  }}
                />
              </View>

              {currentQuestion && (
                <>
                  {/* Question */}
                  <YStack gap={12}>
                    <XStack alignItems="center" gap={8}>
                      <View
                        style={{
                          backgroundColor:
                            currentQuestion.difficulty === 'Easy'
                              ? '#10B981'
                              : currentQuestion.difficulty === 'Medium'
                                ? '#F59E0B'
                                : currentQuestion.difficulty === 'Hard'
                                  ? '#EF4444'
                                  : '#8B5CF6',
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Text fontSize={12} color="white" fontWeight="bold">
                          {currentQuestion.difficulty} • {currentQuestion.points} pts
                        </Text>
                      </View>
                    </XStack>

                    <Text fontSize={20} fontWeight="bold" color="$color">
                      {currentQuestion.question_text[lang] || currentQuestion.question_text.en}
                    </Text>

                    {currentQuestion.image && (
                      <Image
                        source={{ uri: currentQuestion.image }}
                        style={{ width: '100%', height: 200, borderRadius: 12 }}
                      />
                    )}
                  </YStack>

                  {/* Answers */}
                  <YStack gap={12}>
                    {(currentQuestion.answers || []).map((answer) => {
                      const isSelected = selectedAnswers.includes(answer.id);
                      const isMultiple = currentQuestion.question_type === 'multiple_choice';

                      return (
                        <TouchableOpacity
                          key={answer.id}
                          onPress={() => handleAnswerSelect(answer.id)}
                          style={{
                            backgroundColor: isSelected ? 'rgba(75, 107, 255, 0.2)' : '#222',
                            padding: 16,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: isSelected ? '#4B6BFF' : '#333',
                          }}
                        >
                          <XStack alignItems="center" gap={12}>
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: isMultiple ? 4 : 12,
                                borderWidth: 2,
                                borderColor: isSelected ? '#4B6BFF' : '#888',
                                backgroundColor: isSelected ? '#4B6BFF' : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isSelected && <Feather name="check" size={16} color="white" />}
                            </View>
                            <Text
                              fontSize={16}
                              fontWeight="600"
                              color="$color"
                              marginRight={8}
                            >
                              {answer.answer_label}.
                            </Text>
                            <Text fontSize={16} color="$color" flex={1}>
                              {answer.answer_text[lang] || answer.answer_text.en}
                            </Text>
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>

                  {/* Submit */}
                  <TouchableOpacity
                    onPress={submitAnswer}
                    disabled={selectedAnswers.length === 0}
                    style={{
                      backgroundColor: selectedAnswers.length > 0 ? '#4B6BFF' : '#333',
                      padding: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text color="white" fontWeight="bold" fontSize={16}>
                      {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </Text>
                  </TouchableOpacity>

                  {currentQuestion.question_type === 'multiple_choice' && (
                    <Text fontSize={12} color="$gray11" textAlign="center">
                      💡 Select all correct answers
                    </Text>
                  )}
                </>
              )}
            </YStack>
          </ScrollView>
        ) : (
          /* Results View */
          <YStack
            backgroundColor={backgroundColor}
            borderRadius={24}
            padding={24}
            width="90%"
            maxWidth={500}
            gap={20}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={24} fontWeight="bold" color="$color">
                Quiz Complete!
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </XStack>

            <YStack alignItems="center" gap={12} padding={24}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 8,
                  borderColor: scorePercentage >= quizPassScore ? '#00E6C3' : '#EF4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fontSize={32} fontWeight="bold" color="$color">
                  {Math.round(scorePercentage)}%
                </Text>
              </View>

              <Text fontSize={20} fontWeight="bold" color="$color">
                {scorePercentage >= quizPassScore ? '🎉 You Passed!' : '📚 Keep Practicing'}
              </Text>

              <Text fontSize={16} color="$gray11" textAlign="center">
                You scored {score} out of {totalPoints} points
              </Text>
            </YStack>

            <YStack gap={12} padding={16} backgroundColor="#222" borderRadius={12}>
              <XStack justifyContent="space-between">
                <Text color="$gray11">Questions:</Text>
                <Text color="$color" fontWeight="bold">
                  {questions.length}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11">Pass Score:</Text>
                <Text color="$color" fontWeight="bold">
                  {quizPassScore}%
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11">Your Score:</Text>
                <Text
                  color={scorePercentage >= quizPassScore ? '#00E6C3' : '#EF4444'}
                  fontWeight="bold"
                >
                  {Math.round(scorePercentage)}%
                </Text>
              </XStack>
            </YStack>

            <XStack gap={12}>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  backgroundColor: '#333',
                  padding: 16,
                  borderRadius: 12,
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                <Text color="white" fontWeight="bold">
                  Close
                </Text>
              </TouchableOpacity>

              {scorePercentage < quizPassScore && (
                <TouchableOpacity
                  onPress={retry}
                  style={{
                    backgroundColor: '#4B6BFF',
                    padding: 16,
                    borderRadius: 12,
                    flex: 1,
                    alignItems: 'center',
                  }}
                >
                  <Text color="white" fontWeight="bold">
                    Retry
                  </Text>
                </TouchableOpacity>
              )}
            </XStack>
          </YStack>
        )}
      </View>
    </Modal>
  );
}

