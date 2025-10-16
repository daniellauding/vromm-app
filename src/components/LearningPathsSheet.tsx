import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Spinner } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useUnlock } from '../contexts/UnlockContext';
import { supabase } from '../lib/supabase';
import { useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const { height } = Dimensions.get('window');

// Learning path interface (exact copy from ProgressScreen)
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  order_index: number;
  active: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at: string;
  updated_at: string;
}

interface LearningPathsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPathSelected: (path: LearningPath) => void;
  title?: string;
  initialSnapPoint?: 'large' | 'medium' | 'small' | 'mini';
  onBack?: () => void;
}

// Progress Circle component (exact copy from ProgressScreen)
function ProgressCircle({
  percent,
  size = 56,
  color = '#00E6C3',
  bg = '#222',
}: {
  percent: number;
  size?: number;
  color?: string;
  bg?: string;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percent, 1));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference},${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
}

export function LearningPathsSheet({
  visible,
  onClose,
  onPathSelected,
  title = 'Learning Paths',
  initialSnapPoint = 'large',
  onBack,
}: LearningPathsSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeStudentId } = useStudentSwitch();
  const { language: lang, t } = useTranslation();
  const { isPathUnlocked, hasPathPayment, loadUserPayments, loadUnlockedContent } = useUnlock();
  const colorScheme = useColorScheme();

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling for drag-to-resize and snap points (like RouteDetailSheet)
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);

  // Snap points for resizing (top Y coordinates like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, [height]);

  const getInitialSnapPoint = () => snapPoints[initialSnapPoint] || snapPoints.large;
  const [currentSnapPoint, setCurrentSnapPoint] = useState(getInitialSnapPoint());
  const currentState = useSharedValue(getInitialSnapPoint());

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

        // Set translateY directly like RouteDetailSheet
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
      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.mini);

      // Animate to target position - set translateY directly like RouteDetailSheet
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
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByPath, setExercisesByPath] = useState<{ [pathId: string]: string[] }>({});
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Get effective user ID
  const effectiveUserId = activeStudentId || user?.id;

  // Load learning paths
  const loadLearningPaths = useCallback(async () => {
    try {
      setLoading(true);

      const { data: pathsData, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading learning paths:', error);
        return;
      }

      setPaths(pathsData || []);

      // Load exercises mapping for progress calculation
      const exerciseMap: { [pathId: string]: string[] } = {};
      if (pathsData) {
        for (const path of pathsData) {
          const { data: exerciseData } = await supabase
            .from('learning_path_exercises')
            .select('id')
            .eq('learning_path_id', path.id);
          exerciseMap[path.id] = exerciseData ? exerciseData.map((e: { id: string }) => e.id) : [];
        }
      }
      setExercisesByPath(exerciseMap);
    } catch (error) {
      console.error('Error loading learning paths:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load completed exercises
  const fetchCompletions = useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      const { data: regularData, error } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', effectiveUserId);

      if (!error) {
        const completions = regularData?.map((c: { exercise_id: string }) => c.exercise_id) || [];
        setCompletedIds(completions);
      }
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  }, [effectiveUserId]);

  // Calculate path progress
  const getPathProgress = (pathId: string): number => {
    const ids = exercisesByPath[pathId] || [];
    if (ids.length === 0) return 0;
    const completed = ids.filter((id) => completedIds.includes(id)).length;
    return completed / ids.length;
  };

  // Check if path is locked
  const isPathPasswordLocked = (path: LearningPath): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isPathPaywallLocked = (path: LearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible && effectiveUserId) {
      loadLearningPaths();
      fetchCompletions();
      loadUserPayments(effectiveUserId);
      loadUnlockedContent(effectiveUserId);
    }
  }, [
    visible,
    effectiveUserId,
    loadLearningPaths,
    fetchCompletions,
    loadUserPayments,
    loadUnlockedContent,
  ]);

  // Animation effects - updated for gesture system
  useEffect(() => {
    if (visible) {
      // Reset gesture translateY when opening and set to initial snap point
      const targetPoint = getInitialSnapPoint();
      translateY.value = withSpring(targetPoint, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = targetPoint;
      setCurrentSnapPoint(targetPoint);

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
  }, [visible, backdropOpacity, initialSnapPoint, currentState]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadLearningPaths(), fetchCompletions()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'transparent',
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
                animatedGestureStyle,
              ]}
            >
              <YStack padding="$3" paddingBottom={insets.bottom || 10} gap="$3" flex={1}>
                {/* Drag Handle */}
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                    }}
                  />
                </View>

                {/* Show mini title in mini mode */}
                {currentSnapPoint === snapPoints.mini && (
                  <YStack alignItems="center" paddingVertical="$2">
                    <Text fontSize="$5" fontWeight="bold" color="$color">
                      {title}
                    </Text>
                  </YStack>
                )}

                {/* Show content only if not in mini mode */}
                {currentSnapPoint !== snapPoints.mini && (
                  <View style={{ flex: 1 }}>
                    {/* Header */}
                    <XStack justifyContent="space-between" alignItems="center">
                      {onBack ? (
                        <TouchableOpacity onPress={onBack}>
                          <Feather
                            name="arrow-left"
                            size={24}
                            color={colorScheme === 'dark' ? '#FFF' : '#000'}
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={{ width: 24 }} />
                      )}

                      <Text
                        fontSize="$6"
                        fontWeight="bold"
                        color="$color"
                        textAlign="center"
                        flex={1}
                      >
                        {title}
                      </Text>

                      <TouchableOpacity onPress={onClose}>
                        <Feather
                          name="x"
                          size={24}
                          color={colorScheme === 'dark' ? '#FFF' : '#000'}
                        />
                      </TouchableOpacity>
                    </XStack>

                    {/* Learning Paths List */}
                    <YStack flex={1}>
                      {loading ? (
                        <YStack alignItems="center" justifyContent="center" flex={1}>
                          <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
                        </YStack>
                      ) : paths.length === 0 ? (
                        <YStack alignItems="center" justifyContent="center" flex={1} gap="$2">
                          <Feather name="book-open" size={48} color="#666" />
                          <Text color="$gray11" textAlign="center">
                            {t('progressScreen.noLearningPaths') || 'No learning paths available'}
                          </Text>
                        </YStack>
                      ) : (
                        <ScrollView
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
                          <YStack gap="$3">
                            {paths.map((path, index) => {
                              const progress = getPathProgress(path.id);
                              const isPasswordLocked = isPathPasswordLocked(path);
                              const isPaywallLocked = isPathPaywallLocked(path);
                              const isFirstPath = index === 0;

                              return (
                                <TouchableOpacity
                                  key={`learning-path-${path.id}-${index}`}
                                  onPress={() => {
                                    console.log(
                                      '🎯 [LearningPathsSheet] Path selected:',
                                      path.title[lang] || path.title.en,
                                    );
                                    onPathSelected(path);
                                  }}
                                  style={{
                                    borderWidth: isPasswordLocked || isPaywallLocked ? 2 : 0,
                                    borderColor: isPasswordLocked
                                      ? '#FF9500'
                                      : isPaywallLocked
                                        ? '#00E6C3'
                                        : 'transparent',
                                    borderRadius: 20,
                                    marginBottom: 12,
                                  }}
                                >
                                  <Card
                                    backgroundColor={
                                      isPasswordLocked
                                        ? 'rgba(255, 147, 0, 0.1)'
                                        : '$backgroundStrong'
                                    }
                                    padding="$4"
                                    borderRadius={18}
                                  >
                                    <XStack alignItems="center" gap="$4">
                                      {/* Progress Circle */}
                                      <View
                                        style={{
                                          width: 56,
                                          height: 56,
                                          borderRadius: 16,
                                          backgroundColor: isPasswordLocked ? '#FF9500' : '#222',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          position: 'relative',
                                        }}
                                      >
                                        {isPasswordLocked ? (
                                          <MaterialIcons name="lock" size={30} color="#fff" />
                                        ) : (
                                          <>
                                            <ProgressCircle
                                              percent={progress}
                                              size={40}
                                              color="#fff"
                                              bg="#222"
                                            />
                                            <Text
                                              style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: 40,
                                                height: 40,
                                                textAlign: 'center',
                                                textAlignVertical: 'center',
                                                lineHeight: 40,
                                                fontSize: 12,
                                                fontWeight: 'bold',
                                                color: '#fff',
                                              }}
                                            >
                                              {Math.round(progress * 100)}%
                                            </Text>
                                          </>
                                        )}
                                      </View>

                                      {/* Path Info */}
                                      <YStack flex={1}>
                                        <XStack alignItems="center" gap="$2" marginBottom="$1">
                                          <Text
                                            fontSize="$5"
                                            fontWeight="bold"
                                            color={isPasswordLocked ? '#FF9500' : '$color'}
                                            numberOfLines={1}
                                            flex={1}
                                          >
                                            {index + 1}. {path.title[lang] || path.title.en}
                                          </Text>

                                          {/* Status badges */}
                                          {isPasswordLocked && (
                                            <XStack
                                              backgroundColor="#FF9500"
                                              paddingHorizontal="$2"
                                              paddingVertical="$1"
                                              borderRadius="$2"
                                              alignItems="center"
                                              gap="$1"
                                            >
                                              <MaterialIcons name="lock" size={12} color="white" />
                                              <Text fontSize="$1" color="white" fontWeight="bold">
                                                LOCKED
                                              </Text>
                                            </XStack>
                                          )}

                                          {isPaywallLocked && (
                                            <XStack
                                              backgroundColor="#00E6C3"
                                              paddingHorizontal="$2"
                                              paddingVertical="$1"
                                              borderRadius="$2"
                                              alignItems="center"
                                              gap="$1"
                                            >
                                              <Feather name="credit-card" size={12} color="black" />
                                              <Text fontSize="$1" color="black" fontWeight="bold">
                                                ${path.price_usd || 1.0}
                                              </Text>
                                            </XStack>
                                          )}
                                        </XStack>

                                        <Text
                                          color="$gray11"
                                          fontSize="$3"
                                          numberOfLines={2}
                                          marginBottom="$1"
                                        >
                                          {path.description[lang] || path.description.en}
                                        </Text>

                                        {/* Exercise count */}
                                        <Text fontSize="$2" color="$gray11">
                                          {exercisesByPath[path.id]?.length || 0} exercises
                                        </Text>
                                      </YStack>

                                      {/* Arrow */}
                                      <Feather name="chevron-right" size={20} color="$gray11" />
                                    </XStack>
                                  </Card>
                                </TouchableOpacity>
                              );
                            })}
                          </YStack>
                        </ScrollView>
                      )}
                    </YStack>
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
