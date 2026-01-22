import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { YStack, XStack, Card, Button as TamaguiButton } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { TheoryProgressService } from '../services/theoryProgressService';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemePreference } from '../hooks/useThemeOverride';
import { getTabContentPadding } from '../utils/layout';
import { logInfo, logError } from '../utils/logger';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Haptics from 'expo-haptics';
import {
  TheorySection,
  TheoryQuizQuestion,
  TheoryQuizAnswer,
  getLocalizedText,
} from '../types/theory';

interface RouteParams {
  sectionId: string;
  sectionTitle: string;
  moduleId: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function TheoryContentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { sectionId, sectionTitle, moduleId } = route.params as RouteParams;
  const { user } = useAuth();
  const themePref = useThemePreference();
  const resolvedTheme =
    themePref && 'resolvedTheme' in themePref
      ? (themePref.resolvedTheme as string)
      : themePref?.effectiveTheme || 'light';
  const isDark = resolvedTheme === 'dark';

  const [section, setSection] = useState<TheorySection | null>(null);
  const [questions, setQuestions] = useState<TheoryQuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string[]>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const language: 'en' | 'sv' = 'en';

  const fetchData = useCallback(async () => {
    try {
      logInfo('TheoryContentScreen', `Fetching section ${sectionId}`);
      startTimeRef.current = Date.now();

      const { section: sectionData, questions: questionsData } =
        await TheoryProgressService.getSectionWithQuiz(sectionId);

      setSection(sectionData);
      setQuestions(questionsData);

      logInfo('TheoryContentScreen', `Loaded section with ${questionsData.length} quiz questions`);
    } catch (error) {
      logError('TheoryContentScreen', 'Error fetching section', error);
    } finally {
      setIsLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parseYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Map());
    setShowResults(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSelectAnswer = (questionId: string, answerId: string, questionType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedAnswers(prev => {
      const newMap = new Map(prev);
      if (questionType === 'multiple_choice') {
        const current = newMap.get(questionId) || [];
        if (current.includes(answerId)) {
          newMap.set(questionId, current.filter(id => id !== answerId));
        } else {
          newMap.set(questionId, [...current, answerId]);
        }
      } else {
        newMap.set(questionId, [answerId]);
      }
      return newMap;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      calculateResults();
    }
  };

  const calculateResults = async () => {
    let correctCount = 0;
    let totalPoints = 0;

    questions.forEach(question => {
      const selectedIds = selectedAnswers.get(question.id) || [];
      const correctAnswerIds = question.answers?.filter(a => a.is_correct).map(a => a.id) || [];

      totalPoints += question.points;

      // Check if answers match
      if (selectedIds.length === correctAnswerIds.length &&
          selectedIds.every(id => correctAnswerIds.includes(id))) {
        correctCount += question.points;
      }
    });

    const score = totalPoints > 0 ? (correctCount / totalPoints) * 100 : 0;
    setQuizScore(score);
    setShowResults(true);

    // Save progress
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    await TheoryProgressService.completeSection(
      sectionId,
      timeSpent,
      score,
      1 // First attempt
    );

    if (score >= (section?.quiz_pass_score || 70)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleCompleteSection = async () => {
    if (!section?.has_quiz) {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      await TheoryProgressService.completeSection(sectionId, timeSpent);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
        <ActivityIndicator size="large" color={isDark ? '#27febe' : '#00C9A7'} />
        <Text marginTop={16} color="$gray11">Loading content...</Text>
      </View>
    );
  }

  if (!section) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
        <Text color="$gray11">Section not found</Text>
      </View>
    );
  }

  const videoId = parseYoutubeVideoId(section.youtube_url || '');
  const passScore = section.quiz_pass_score || 70;
  const passed = quizScore >= passScore;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
      <Header title={sectionTitle} showBackButton />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: getTabContentPadding() + 80,
        }}
      >
        {/* Video Section */}
        {videoId && (
          <YStack marginBottom={20}>
            <YoutubePlayer
              height={220}
              videoId={videoId}
              webViewStyle={{ borderRadius: 12 }}
            />
          </YStack>
        )}

        {/* Image */}
        {section.image && (
          <Image
            source={{ uri: section.image }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: 12,
              marginBottom: 20,
            }}
            resizeMode="cover"
          />
        )}

        {/* Content */}
        <Card
          backgroundColor={isDark ? '#1a1a1a' : '#FFFFFF'}
          borderColor={isDark ? '#232323' : '#E5E5E5'}
          borderWidth={1}
          padding={20}
          borderRadius={16}
          marginBottom={20}
        >
          <Text fontSize={15} lineHeight={24} color="$color">
            {getLocalizedText(section.content, language)}
          </Text>
        </Card>

        {/* Quiz or Complete Button */}
        {section.has_quiz && questions.length > 0 ? (
          <Button
            onPress={handleStartQuiz}
            style={{
              backgroundColor: isDark ? '#27febe' : '#00C9A7',
              paddingVertical: 16,
              borderRadius: 12,
            }}
          >
            <XStack alignItems="center" gap={8}>
              <Feather name="help-circle" size={20} color="#000" />
              <Text fontWeight="bold" color="#000">
                Take Quiz ({questions.length} questions)
              </Text>
            </XStack>
          </Button>
        ) : (
          <Button
            onPress={handleCompleteSection}
            style={{
              backgroundColor: isDark ? '#27febe' : '#00C9A7',
              paddingVertical: 16,
              borderRadius: 12,
            }}
          >
            <XStack alignItems="center" gap={8}>
              <Feather name="check-circle" size={20} color="#000" />
              <Text fontWeight="bold" color="#000">
                Mark as Complete
              </Text>
            </XStack>
          </Button>
        )}
      </ScrollView>

      {/* Quiz Modal */}
      <Modal
        visible={showQuiz}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuiz(false)}
      >
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
          {/* Quiz Header */}
          <XStack
            padding={16}
            paddingTop={48}
            backgroundColor={isDark ? '#1a1a1a' : '#fff'}
            borderBottomWidth={1}
            borderBottomColor={isDark ? '#232323' : '#E5E5E5'}
            justifyContent="space-between"
            alignItems="center"
          >
            <TouchableOpacity onPress={() => setShowQuiz(false)}>
              <Feather name="x" size={24} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
            <Text fontWeight="bold">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
            <View style={{ width: 24 }} />
          </XStack>

          {/* Progress Bar */}
          <View
            style={{
              height: 4,
              backgroundColor: isDark ? '#333' : '#E5E5E5',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                backgroundColor: isDark ? '#27febe' : '#00C9A7',
              }}
            />
          </View>

          {showResults ? (
            // Results View
            <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: passed ? (isDark ? '#27febe' : '#00C9A7') : '#FF6B6B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Feather
                  name={passed ? 'check' : 'x'}
                  size={50}
                  color={passed ? '#000' : '#fff'}
                />
              </View>

              <Text fontSize={28} fontWeight="bold" marginBottom={8}>
                {Math.round(quizScore)}%
              </Text>

              <Text fontSize={16} color="$gray11" marginBottom={20} textAlign="center">
                {passed
                  ? 'Congratulations! You passed the quiz.'
                  : `You need ${passScore}% to pass. Try again!`}
              </Text>

              <Button
                onPress={() => {
                  setShowQuiz(false);
                  if (passed) {
                    navigation.goBack();
                  }
                }}
                style={{
                  backgroundColor: isDark ? '#27febe' : '#00C9A7',
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                }}
              >
                <Text fontWeight="bold" color="#000">
                  {passed ? 'Continue' : 'Close'}
                </Text>
              </Button>

              {!passed && (
                <TouchableOpacity
                  onPress={handleStartQuiz}
                  style={{ marginTop: 16 }}
                >
                  <Text color={isDark ? '#27febe' : '#00C9A7'} fontWeight="bold">
                    Retry Quiz
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : (
            // Question View
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {questions[currentQuestionIndex] && (
                <YStack gap={16}>
                  <Text fontSize={18} fontWeight="bold">
                    {getLocalizedText(questions[currentQuestionIndex].question_text, language)}
                  </Text>

                  {questions[currentQuestionIndex].image && (
                    <Image
                      source={{ uri: questions[currentQuestionIndex].image }}
                      style={{
                        width: '100%',
                        height: 150,
                        borderRadius: 12,
                      }}
                      resizeMode="cover"
                    />
                  )}

                  {/* Answers */}
                  {questions[currentQuestionIndex].answers?.map((answer) => {
                    const isSelected = (selectedAnswers.get(questions[currentQuestionIndex].id) || [])
                      .includes(answer.id);

                    return (
                      <TouchableOpacity
                        key={answer.id}
                        onPress={() => handleSelectAnswer(
                          questions[currentQuestionIndex].id,
                          answer.id,
                          questions[currentQuestionIndex].question_type
                        )}
                      >
                        <Card
                          backgroundColor={
                            isSelected
                              ? (isDark ? '#27febe20' : '#00C9A720')
                              : (isDark ? '#1a1a1a' : '#fff')
                          }
                          borderColor={
                            isSelected
                              ? (isDark ? '#27febe' : '#00C9A7')
                              : (isDark ? '#232323' : '#E5E5E5')
                          }
                          borderWidth={isSelected ? 2 : 1}
                          padding={16}
                          borderRadius={12}
                        >
                          <XStack alignItems="center" gap={12}>
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: questions[currentQuestionIndex].question_type === 'multiple_choice' ? 4 : 12,
                                borderWidth: 2,
                                borderColor: isSelected
                                  ? (isDark ? '#27febe' : '#00C9A7')
                                  : (isDark ? '#666' : '#999'),
                                backgroundColor: isSelected
                                  ? (isDark ? '#27febe' : '#00C9A7')
                                  : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isSelected && (
                                <Feather name="check" size={14} color="#000" />
                              )}
                            </View>
                            <Text flex={1}>
                              {getLocalizedText(answer.answer_text, language)}
                            </Text>
                          </XStack>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Next Button */}
                  <Button
                    onPress={handleNextQuestion}
                    disabled={!(selectedAnswers.get(questions[currentQuestionIndex].id)?.length)}
                    style={{
                      backgroundColor: selectedAnswers.get(questions[currentQuestionIndex].id)?.length
                        ? (isDark ? '#27febe' : '#00C9A7')
                        : (isDark ? '#333' : '#E5E5E5'),
                      paddingVertical: 16,
                      borderRadius: 12,
                      marginTop: 20,
                    }}
                  >
                    <Text
                      fontWeight="bold"
                      color={selectedAnswers.get(questions[currentQuestionIndex].id)?.length ? '#000' : '#999'}
                    >
                      {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
                    </Text>
                  </Button>
                </YStack>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

export default TheoryContentScreen;
