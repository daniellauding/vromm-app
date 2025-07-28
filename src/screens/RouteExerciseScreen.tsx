import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Dimensions,
  useColorScheme,
  Image,
  TouchableOpacity,
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
          setCompletedExercises(new Set(completions.map(c => c.exercise_id)));
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
            routeId,
            currentExercise.repeatNumber || 1
          );
        } else {
          await ExerciseProgressService.completeExerciseFromRoute(
            currentExercise.learning_path_exercise_id,
            routeId
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
        Alert.alert(
          'Congratulations!',
          `You've completed all ${exercises.length} exercises for this route!`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.goBack(),
            },
          ]
        );
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
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const renderExerciseContent = () => {
    if (!currentExercise) return null;

    const isCompleted = completedExercises.has(currentExercise.id);

    return (
      <Card
        backgroundColor="$backgroundStrong"
        bordered
        padding="$6"
        borderRadius="$6"
        marginHorizontal="$4"
      >
        <YStack gap="$4">
          {/* Exercise Header */}
          <YStack gap="$2">
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1} gap="$1">
                <Text fontSize={24} fontWeight="700" color="$color">
                  {currentExercise.title}
                </Text>
                
                {/* Exercise badges */}
                <XStack gap="$2" flexWrap="wrap">
                  <View style={{
                    backgroundColor: currentExercise.source === 'learning_path' ? '#3B82F6' : '#10B981',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}>
                    <Text fontSize={11} color="white" fontWeight="600">
                      {currentExercise.source === 'learning_path' ? 'LEARNING PATH' : 'CUSTOM'}
                    </Text>
                  </View>
                  
                  {currentExercise.isRepeat && (
                    <View style={{
                      backgroundColor: '#F59E0B',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text fontSize={11} color="white" fontWeight="600">
                        REPEAT {currentExercise.repeatNumber || ''}
                      </Text>
                    </View>
                  )}
                  
                  {currentExercise.has_quiz && (
                    <View style={{
                      backgroundColor: '#8B5CF6',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text fontSize={11} color="white" fontWeight="600">QUIZ</Text>
                    </View>
                  )}
                  
                  {currentExercise.youtube_url && (
                    <View style={{
                      backgroundColor: '#EF4444',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text fontSize={11} color="white" fontWeight="600">VIDEO</Text>
                    </View>
                  )}
                  
                  {isCompleted && (
                    <View style={{
                      backgroundColor: '#10B981',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text fontSize={11} color="white" fontWeight="600">COMPLETED</Text>
                    </View>
                  )}
                </XStack>
              </YStack>
            </XStack>

            {/* Learning path info */}
            {currentExercise.learning_path_title && (
              <Text fontSize={14} color="$blue11">
                From: {currentExercise.learning_path_title}
              </Text>
            )}
          </YStack>

          {/* Exercise Description */}
          {currentExercise.description && (
            <Text fontSize={16} color="$gray11" lineHeight={24}>
              {currentExercise.description}
            </Text>
          )}

          {/* Exercise Duration/Repetitions */}
          {(currentExercise.duration || currentExercise.repetitions) && (
            <XStack gap="$4" alignItems="center">
              {currentExercise.duration && (
                <XStack gap="$1" alignItems="center">
                  <Feather name="clock" size={16} color="$gray9" />
                  <Text fontSize={14} color="$gray11">
                    {currentExercise.duration}
                  </Text>
                </XStack>
              )}
              {currentExercise.repetitions && (
                <XStack gap="$1" alignItems="center">
                  <Feather name="repeat" size={16} color="$gray9" />
                  <Text fontSize={14} color="$gray11">
                    {currentExercise.repetitions}
                  </Text>
                </XStack>
              )}
            </XStack>
          )}

          {/* YouTube Video */}
          {currentExercise.youtube_url && (() => {
            const videoId = getYouTubeVideoId(currentExercise.youtube_url);
            if (videoId) {
              return (
                <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
                  <WebView
                    source={{ uri: `https://www.youtube.com/embed/${videoId}` }}
                    style={{ flex: 1 }}
                    allowsFullscreenVideo
                  />
                </View>
              );
            }
            return null;
          })()}

          {/* Exercise Image */}
          {currentExercise.image && (
            <View style={{ borderRadius: 12, overflow: 'hidden' }}>
              <Image
                source={{ uri: currentExercise.image }}
                style={{ width: '100%', height: 200 }}
                resizeMode="cover"
              />
            </View>
          )}
        </YStack>
      </Card>
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
    <Screen edges={[]} padding={false}>
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
            value={progress}
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
          contentContainerStyle={{ paddingBottom: 120 }}
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
            <YStack gap="$4" paddingBottom="$4">
              {renderExerciseContent()}
            </YStack>
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