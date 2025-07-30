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

type RouteExerciseScreenProps = {
  route: {
    params: {
      routeId: string;
      exercises: Exercise[];
      routeName?: string;
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
}

export function RouteExerciseScreen({ route }: RouteExerciseScreenProps) {
  const { routeId, exercises, routeName } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { width: screenWidth } = Dimensions.get('window');

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [hasCompletedBefore, setHasCompletedBefore] = useState(false);

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;
  const isLastExercise = currentIndex === exercises.length - 1;

  useEffect(() => {
    if (user && exercises.length > 0) {
      initializeSession();
      checkPreviousCompletion();
    }
  }, [user, exercises]);

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
        setCurrentIndex(existingSession.current_exercise_index || 0);
        
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
            current_exercise_index: 0,
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
      if (!sessionId || !currentExercise) return;

      // Mark exercise as completed in session
      const { error: completionError } = await supabase
        .from('route_exercise_completions')
        .insert({
          session_id: sessionId,
          exercise_id: currentExercise.id,
          completed_at: new Date().toISOString(),
        });

      if (completionError) throw completionError;

      // If this is a learning path exercise, also mark it in the learning path system
      if (currentExercise.learning_path_exercise_id) {
        if (currentExercise.isRepeat && currentExercise.originalId) {
          await ExerciseProgressService.completeRepeatExerciseFromRoute(
            currentExercise.learning_path_exercise_id,
            currentExercise.originalId,
            currentExercise.repeatNumber || 1,
            routeId,
          );
        } else {
          await ExerciseProgressService.completeExerciseFromRoute(
            currentExercise.learning_path_exercise_id,
            routeId,
          );
        }
      }

      // Update local state
      const newCompleted = new Set(completedExercises);
      newCompleted.add(currentExercise.id);
      setCompletedExercises(newCompleted);

      // Check if all exercises are completed
      if (newCompleted.size === exercises.length) {
        await completeSession();
      } else {
        // Move to next exercise
        handleNext();
      }
    } catch (error) {
      console.error('Error completing exercise:', error);
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
          shouldRefresh: true 
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
          onPress: () => navigation.navigate('RouteDetail', { 
            routeId, 
            shouldRefresh: true 
          }),
        },
      ]
    );
  };

  // Helper functions for media rendering (matching ProgressScreen)
  const getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
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
                {currentExercise.title}
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
              {currentExercise.description}
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

        {/* Quiz Questions - Enhanced display */}
        {currentExercise.has_quiz && currentExercise.quiz_data && (() => {
          try {
            const quizData = typeof currentExercise.quiz_data === 'string' 
              ? JSON.parse(currentExercise.quiz_data) 
              : currentExercise.quiz_data;
            
            if (quizData?.questions && Array.isArray(quizData.questions)) {
              return (
                <YStack marginTop={16} gap={16}>
                  <XStack alignItems="center" gap={8}>
                    <Feather name="help-circle" size={20} color="#8B5CF6" />
                    <Text fontSize={18} fontWeight="bold" color="#8B5CF6">
                      Quiz Questions
                    </Text>
                  </XStack>
                  {quizData.questions.map((question: any, index: number) => (
                    <YStack key={index} backgroundColor="#f8f9fa" padding={16} borderRadius={12}>
                      <Text fontSize={16} fontWeight="600" color="$color" marginBottom={12}>
                        Question {index + 1}: {question.question || question.text || 'Question'}
                      </Text>
                      
                      {/* Answer Options */}
                      {question.options && Array.isArray(question.options) && (
                        <YStack gap={8}>
                          {question.options.map((option: any, optIndex: number) => {
                            const isCorrect = question.correct_answer === optIndex || 
                                             question.correctAnswer === optIndex ||
                                             (Array.isArray(question.correct_answers) && question.correct_answers.includes(optIndex));
                            
                            return (
                              <View 
                                key={optIndex}
                                style={{
                                  backgroundColor: isCorrect ? '#10B981' : '#ffffff',
                                  padding: 12,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isCorrect ? '#059669' : '#e5e7eb',
                                }}
                              >
                                <XStack gap={8} alignItems="center">
                                  <Text fontSize={14} fontWeight={isCorrect ? "600" : "400"} 
                                        color={isCorrect ? "white" : "#374151"}>
                                    {String.fromCharCode(65 + optIndex)}. {option.text || option}
                                  </Text>
                                  {isCorrect && (
                                    <Feather name="check-circle" size={16} color="white" />
                                  )}
                                </XStack>
                              </View>
                            );
                          })}
                        </YStack>
                      )}
                      
                      {/* Explanation */}
                      {question.explanation && (
                        <View style={{
                          backgroundColor: '#EBF8FF',
                          padding: 12,
                          borderRadius: 8,
                          borderLeftWidth: 4,
                          borderLeftColor: '#3B82F6',
                          marginTop: 12,
                        }}>
                          <Text fontSize={14} color="#1F2937" fontStyle="italic">
                            💡 {question.explanation}
                          </Text>
                        </View>
                      )}
                    </YStack>
                  ))}
                </YStack>
              );
            }
          } catch (error) {
            console.error('Error parsing quiz data:', error);
            return (
              <View style={{
                backgroundColor: '#FEF3C7',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#F59E0B',
                marginTop: 16,
              }}>
                <Text fontSize={14} color="#92400E">
                  📝 This exercise contains a quiz, but the questions couldn't be loaded properly.
                </Text>
              </View>
            );
          }
          return null;
        })()}

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
    <Screen>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
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
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: colorScheme === 'dark' ? '#333' : '#E5E7EB',
            padding: 16,
          }}>
            <YStack gap="$3">
              {/* Action Buttons */}
              <XStack gap="$3">
                <Button
                  onPress={completeExercise}
                  backgroundColor="$green10"
                  flex={1}
                  size="lg"
                  icon={<Feather name="check" size={20} color="white" />}
                >
                  <Text color="white" fontSize={16} fontWeight="600">
                    {completedExercises.has(currentExercise?.id || '') ? 'Completed' : 'Complete'}
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