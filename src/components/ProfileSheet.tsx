import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { YStack, XStack, Text } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ProfileScreen } from '../screens/ProfileScreen';

const { height } = Dimensions.get('window');

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const iconColor = '$color';

  // Theme colors - using theme tokens
  const backgroundColor = '$background';

  // Animation refs - keeping original for backdrop
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
    transform: [
      { translateY: translateY.value },
    ],
  }));

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
          backgroundColor: 'transparent',
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
                  height: height, // Keep original height
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


                {/* Show content only if not in mini mode */}
                {currentSnapPoint !== snapPoints.mini && (
                  <View style={{ flex: 1 }}>
                    {/* Profile Content */}
                    <YStack flex={1}>
                      <ProfileScreenWrapper />
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

// Wrapper component to handle the ProfileScreen properly in a sheet context
const ProfileScreenWrapper = () => {
  return (
    <ProfileScreen />
  );
};
