import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '../hooks/useThemeOverride';
import { useTranslation } from '../contexts/TranslationContext';
import { Feather } from '@expo/vector-icons';
import { AddReviewScreen } from '../screens/AddReviewScreen';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Helper function to get translation with fallback
const getTranslation = (t: (key: string) => string, key: string, fallback: string): string => {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
};

const { height } = Dimensions.get('window');

interface AddReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  routeId: string;
  onReviewComplete?: () => void;
}

export function AddReviewSheet({
  visible,
  onClose,
  routeId,
  onReviewComplete,
}: AddReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const { t } = useTranslation();
  const { user } = useAuth();
  const colorScheme = effectiveTheme || 'light';
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  // Check if this is an edit (existing review)
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkExistingReview = async () => {
      if (!user?.id || !routeId || !visible) return;

      const { data } = await supabase
        .from('route_reviews')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      setIsEditing(!!data);
    };

    if (visible) {
      checkExistingReview();
    }
  }, [visible, user?.id, routeId]);

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling for drag-to-resize and snap points
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
  }, []);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);
  const isAnimating = useSharedValue(false);

  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed, backdropOpacity, translateY]);

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .enableTrackpadTwoFingerGesture(false)
    .onBegin(() => {
      if (isAnimating.value) return;
      isAnimating.value = true;
      isDragging.current = true;
    })
    .onUpdate((event) => {
      if (isAnimating.value === false) return;

      const { translationY } = event;
      const newPosition = currentState.value + translationY;

      // Constrain to snap points range
      const minPosition = snapPoints.large;
      const maxPosition = snapPoints.mini + 100;
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      translateY.value = boundedPosition;
    })
    .onEnd((event) => {
      if (isAnimating.value === false) return;

      const { translationY, velocityY } = event;
      const currentPosition = currentState.value + translationY;

      // Dismiss if dragged down past mini with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        isAnimating.value = false;
        isDragging.current = false;
        runOnJS(dismissSheet)();
        return;
      }

      // Determine target snap point
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.mini;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.mini);

      translateY.value = withSpring(
        boundedTarget,
        {
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
        () => {
          isAnimating.value = false;
          isDragging.current = false;
        },
      );

      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  // Show/hide animations
  useEffect(() => {
    if (visible) {
      isAnimating.value = false;
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
      translateY.value = withSpring(snapPoints.dismissed, {
        damping: 20,
        stiffness: 300,
      });
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [
    visible,
    backdropOpacity,
    snapPoints.large,
    snapPoints.dismissed,
    currentState,
    translateY,
    isAnimating,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { top: translateY.value };
    }
    return { transform: [{ translateY: translateY.value }] };
  });

  // Handle review completion
  const handleReviewComplete = useCallback(() => {
    dismissSheet();
    if (onReviewComplete) {
      setTimeout(() => {
        onReviewComplete();
      }, 300);
    }
  }, [dismissSheet, onReviewComplete]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismissSheet}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: backdropOpacity,
          zIndex: 10001,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              isAnimating.value = false;
              dismissSheet();
            }}
          />
          <ReanimatedAnimated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: height,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  zIndex: 10002,
                },
                animatedStyle,
              ]}
            >
              {/* Drag Handle - only this area captures pan gesture for sheet resize */}
              <GestureDetector gesture={panGesture}>
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
              </GestureDetector>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
              >
                <YStack
                  flex={1}
                  paddingBottom={insets.bottom || 20}
                  backgroundColor={backgroundColor}
                >
                  {/* Sheet Header */}
                  <XStack
                    justifyContent="space-between"
                    alignItems="center"
                    paddingHorizontal="$4"
                    paddingTop="$2"
                    paddingBottom="$3"
                  >
                    <Text
                      fontSize={22}
                      fontWeight="900"
                      fontStyle="italic"
                      color={textColor}
                    >
                      {isEditing
                        ? getTranslation(t, 'routeDetail.editReview', 'Edit Review')
                        : getTranslation(t, 'review.title', 'Add Review')}
                    </Text>
                    <TouchableOpacity
                      onPress={dismissSheet}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                      }}
                    >
                      <Feather
                        name="x"
                        size={20}
                        color={textColor}
                      />
                    </TouchableOpacity>
                  </XStack>

                  {/* Custom AddReviewScreen content embedded */}
                  <View style={{ flex: 1 }}>
                    <AddReviewScreen
                      route={{
                        params: {
                          routeId,
                          returnToRouteDetail: false,
                        },
                      }}
                      onReviewComplete={handleReviewComplete}
                      embeddedInSheet={true}
                    />
                  </View>
                </YStack>
              </KeyboardAvoidingView>
            </ReanimatedAnimated.View>
        </View>
      </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
