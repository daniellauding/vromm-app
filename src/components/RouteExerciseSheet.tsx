import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Animated, Pressable, View, Dimensions, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Button, Progress } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { RouteExerciseList } from './RouteExerciseList';

const { height, width } = Dimensions.get('window');

interface Exercise {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  has_quiz?: boolean;
  quiz_data?: any;
}

interface RouteExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  routeId: string;
  exercises: Exercise[];
  routeName: string;
  startIndex?: number;
  onReopen?: () => void;
}

export function RouteExerciseSheet({
  visible,
  onClose,
  routeId,
  exercises,
  routeName,
  startIndex = 0,
  onReopen,
}: RouteExerciseSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  // Theme colors
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling for drag-to-dismiss and snap points
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);
  
  // Snap points for resizing (top Y coordinates like RoutesDrawer)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1,   // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4,  // Top at 40% of screen (show 60% - medium)  
      small: height * 0.7,   // Top at 70% of screen (show 30% - small)
      mini: height * 0.85,   // Top at 85% of screen (show 15% - just title)
      dismissed: height,     // Completely off-screen
    };
    return points;
  }, [height]);
  
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);

  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed]);

  const snapTo = useCallback((point: number) => {
    currentState.value = point;
    setCurrentSnapPoint(point);
  }, [currentState]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;
        
        // Constrain to snap points range (large is smallest Y, allow dragging past mini for dismissal)
        const minPosition = snapPoints.large; // Smallest Y (show most - like expanded)
        const maxPosition = snapPoints.mini + 100; // Allow dragging past mini for dismissal
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);
        
        // Set translateY directly like RoutesDrawer
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;
      
      const currentPosition = currentState.value + translationY;
      
      // Only dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }
      
      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = snapPoints.mini;
      } else {
        // Find closest snap point
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }
      
      // Constrain target to valid range
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.large),
        snapPoints.mini,
      );
      
      // Animate to target position - set translateY directly like RoutesDrawer
      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      
      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // State
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(new Set());
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);
  const [exerciseStats, setExerciseStats] = useState<{
    completed: number;
    total: number;
    lastSessionAt?: string;
  } | null>(null);

  // Load exercise progress
  const loadExerciseProgress = useCallback(async () => {
    if (!user || !routeId) return;

    try {
      const { data, error } = await supabase
        .from('exercise_completions')
        .select('exercise_id, completed_at')
        .eq('route_id', routeId)
        .eq('user_id', user.id);

      if (error) throw error;

      const completedIds = new Set(data?.map(item => item.exercise_id) || []);
      setCompletedExerciseIds(completedIds);
      setAllExercisesCompleted(completedIds.size === exercises.length);

      // Calculate stats
      setExerciseStats({
        completed: completedIds.size,
        total: exercises.length,
        lastSessionAt: data?.[0]?.completed_at,
      });
    } catch (err) {
      console.error('Error loading exercise progress:', err);
    }
  }, [user, routeId, exercises.length]);

  // Handle starting exercises
  const handleStartExercises = () => {
    navigation.navigate('RouteExercise', {
      routeId: routeId,
      exercises: exercises,
      routeName: routeName,
      startIndex: startIndex,
    });
    onClose();
  };

  // Handle exercise press
  const handleExercisePress = (exercise: Exercise, index: number) => {
    navigation.navigate('RouteExercise', {
      routeId: routeId,
      exercises: exercises,
      routeName: routeName,
      startIndex: index,
    });
    onClose();
  };

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadExerciseProgress();
    } catch (error) {
      console.error('Error refreshing exercise progress:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible && routeId) {
      loadExerciseProgress();
    }
  }, [visible, routeId, loadExerciseProgress]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Reset gesture translateY when opening and set to large snap point
      translateY.value = withSpring(snapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.large;
      setCurrentSnapPoint(snapPoints.large);
      
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, snapPoints.large, currentState]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View 
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: height,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                animatedGestureStyle
              ]}
            >
              <YStack
                padding="$3"
                paddingBottom={insets.bottom || 10}
                gap="$3"
                flex={1}
              >
                {/* Drag Handle */}
                <View style={{
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingBottom: 16,
                }}>
                  <View style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colorScheme === 'dark' ? '#666' : '#CCC',
                  }} />
                </View>

                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$6" fontWeight="bold" color="$color" numberOfLines={1} flex={1}>
                    {routeName} - {t('routeDetail.exercises') || 'Exercises'}
                  </Text>
                  <XStack gap="$2">
                    <TouchableOpacity onPress={onClose}>
                      <Feather name="x" size={24} color={iconColor} />
                    </TouchableOpacity>
                  </XStack>
                </XStack>

                {/* Show content only if not in mini mode */}
                {currentSnapPoint !== snapPoints.mini && (
                  <View style={{ flex: 1 }}>
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                      showsVerticalScrollIndicator={true}
                      refreshControl={
                        <RefreshControl
                          refreshing={refreshing}
                          onRefresh={handleRefresh}
                          tintColor="#00E6C3"
                          colors={['#00E6C3']}
                          progressBackgroundColor="#1a1a1a"
                        />
                      }
                    >
                      <YStack gap="$4">
                        {/* Start Exercises Button */}
                        <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                          <YStack gap="$3">
                            <XStack justifyContent="space-between" alignItems="center">
                              <YStack flex={1}>
                                <Text fontSize="$5" fontWeight="600" color="$color">
                                  {allExercisesCompleted 
                                    ? (t('routeDetail.reviewExercises') || 'Review Exercises')
                                    : (t('routeDetail.startExercises') || 'Start Exercises')
                                  }
                                </Text>
                                <Text fontSize="$4" color="$gray11">
                                  {exercises.length} {t('routeDetail.exercises') || 'exercises'} available
                                </Text>
                              </YStack>
                              <Button
                                onPress={handleStartExercises}
                                backgroundColor="$blue10"
                                icon={<Feather name="play" size={16} color="white" />}
                                size="lg"
                              >
                                <Text color="white" fontSize="$3" fontWeight="600">
                                  {allExercisesCompleted 
                                    ? (t('routeDetail.review') || 'Review')
                                    : (t('routeDetail.start') || 'Start')
                                  }
                                </Text>
                              </Button>
                            </XStack>

                            {/* Exercise Statistics */}
                            {exerciseStats && (
                              <Card bordered padding="$3" backgroundColor="$gray2">
                                <YStack gap="$2">
                                  <Text fontSize={12} fontWeight="600" color="$gray11">
                                    {t('routeDetail.yourProgress') || 'Your Progress'}
                                  </Text>
                                  <XStack justifyContent="space-between" alignItems="center">
                                    <Text fontSize={11} color="$gray11">
                                      {t('routeDetail.completed') || 'Completed'}: {exerciseStats.completed}/
                                      {exerciseStats.total}
                                    </Text>
                                    <Text fontSize={11} color="$gray11">
                                      {Math.round((exerciseStats.completed / exerciseStats.total) * 100)}%
                                    </Text>
                                  </XStack>
                                  <Progress
                                    value={Math.round(
                                      (exerciseStats.completed / exerciseStats.total) * 100,
                                    )}
                                    backgroundColor="$gray6"
                                    size="$0.5"
                                  >
                                    <Progress.Indicator backgroundColor="$blue10" />
                                  </Progress>
                                </YStack>
                              </Card>
                            )}
                          </YStack>
                        </Card>

                        {/* Exercise List */}
                        <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                          <YStack gap="$3">
                            <XStack alignItems="center" gap="$2">
                              <Feather name="list" size={20} color={iconColor} />
                              <Text fontSize="$5" fontWeight="600" color="$color">
                                {t('routeDetail.exerciseList') || 'Exercise List'}
                              </Text>
                            </XStack>

                            <RouteExerciseList
                              exercises={exercises}
                              completedIds={completedExerciseIds}
                              maxPreview={exercises.length} // Show all exercises
                              onExercisePress={handleExercisePress}
                            />
                          </YStack>
                        </Card>
                      </YStack>
                    </ScrollView>
                  </View>
                )}
              </YStack>
            </ReanimatedAnimated.View>
          </GestureDetector>
        </View>
      </Animated.View>
    </Modal>
  );
}
