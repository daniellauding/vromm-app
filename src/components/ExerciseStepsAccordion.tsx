import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Linking,
  Image,
  Modal,
  Dimensions,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: screenHeight } = Dimensions.get('window');

// Types for step-based exercises
export interface StepMedia {
  id: string;
  type: 'image' | 'youtube' | 'embed';
  url: string;
  title?: { en: string; sv: string };
  description?: { en: string; sv: string };
  order_index: number;
}

export interface ExerciseStep {
  text: { en: string; sv: string };
  description?: { en: string; sv: string };
  media?: StepMedia[];
  order_index: number;
}

export interface ExerciseWithSteps {
  steps?: ExerciseStep[];
}

interface ExerciseStepsAccordionProps {
  exercise: ExerciseWithSteps;
  language: 'en' | 'sv';
  /** 'accordion' = inline expand (default), 'sheet' = opens bottom sheet */
  variant?: 'accordion' | 'sheet';
}

interface StepMediaComponentProps {
  media: StepMedia;
  language: 'en' | 'sv';
}

/**
 * Memoized media component for rendering step media items
 */
const StepMediaComponent: React.FC<StepMediaComponentProps> = React.memo(({ media, language }) => {
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme === 'dark' ? 'dark' : 'light';

  const title = media.title?.[language] || media.title?.en || '';
  const description = media.description?.[language] || media.description?.en || '';

  const handleMediaPress = () => {
    if (media.url) {
      Linking.openURL(media.url);
    }
  };

  return (
    <TouchableOpacity onPress={handleMediaPress}>
      <YStack
        backgroundColor={colorScheme === 'dark' ? '#222' : '#FFF'}
        borderRadius={8}
        overflow="hidden"
        borderWidth={1}
        borderColor={colorScheme === 'dark' ? '#444' : '#E5E5E5'}
      >
        {media.type === 'image' && (
          <Image
            source={{ uri: media.url }}
            style={{ width: '100%', height: 160 }}
            resizeMode="cover"
          />
        )}

        {media.type === 'youtube' && (
          <YStack backgroundColor="#FF0000" padding={16} alignItems="center">
            <Feather name="play" size={24} color="white" />
            <Text color="white" fontWeight="bold" marginTop={8}>
              {title || (language === 'en' ? 'YouTube Video' : 'YouTube Video')}
            </Text>
          </YStack>
        )}

        {media.type === 'embed' && (
          <YStack backgroundColor="#007AFF" padding={16} alignItems="center">
            <Feather name="external-link" size={24} color="white" />
            <Text color="white" fontWeight="bold" marginTop={8}>
              {title || (language === 'en' ? 'Interactive Content' : 'Interaktivt innehåll')}
            </Text>
          </YStack>
        )}

        {(title || description) && media.type !== 'youtube' && media.type !== 'embed' && (
          <YStack padding={12}>
            {title && (
              <Text fontSize={14} fontWeight="600" color="$color">
                {title}
              </Text>
            )}
            {description && (
              <Text fontSize={12} color="$gray11" marginTop={4}>
                {description}
              </Text>
            )}
          </YStack>
        )}
      </YStack>
    </TouchableOpacity>
  );
});

StepMediaComponent.displayName = 'StepMediaComponent';

/**
 * Shared component for rendering steps content (used by both accordion and sheet)
 */
const StepsContent: React.FC<{
  steps: ExerciseStep[];
  language: 'en' | 'sv';
  isDark: boolean;
}> = React.memo(({ steps, language, isDark }) => {
  const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);

  return (
    <YStack gap={12}>
      {sortedSteps.map((step, index) => (
        <YStack key={`step-${index}`} gap={8}>
          <XStack alignItems="flex-start" gap={12} paddingTop={20}>
            {/* Step Number Badge */}
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isDark ? '#232323' : '#E5E5E5',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 0,
              }}
            >
              <Text fontSize={14} fontWeight="bold" color={isDark ? '#FFFFFF' : '#1a1a1a'}>
                {index + 1}
              </Text>
            </View>

            {/* Step Content */}
            <YStack flex={1} gap={8}>
              <Text fontSize={18} color="$color" lineHeight={22} marginTop={2} fontWeight="600">
                {typeof step.text === 'string'
                  ? step.text
                  : step.text?.[language] || step.text?.en || ''}
              </Text>

              {/* Step Description */}
              {step.description && (
                <Text fontSize={18} color="$gray11" lineHeight={24}>
                  {typeof step.description === 'string'
                    ? step.description
                    : step.description?.[language] || step.description?.en || ''}
                </Text>
              )}

              {/* Step Media */}
              {step.media && step.media.length > 0 && (
                <YStack gap={8}>
                  {[...step.media]
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((media, mediaIndex) => (
                      <StepMediaComponent
                        key={media.id || `${index}-${mediaIndex}`}
                        media={media}
                        language={language}
                      />
                    ))}
                </YStack>
              )}
            </YStack>
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
});

StepsContent.displayName = 'StepsContent';

/**
 * Accordion component for displaying exercise steps with optional media
 * Supports two variants: 'accordion' (inline expand) or 'sheet' (bottom sheet)
 * Memoized for performance optimization
 */
export const ExerciseStepsAccordion: React.FC<ExerciseStepsAccordionProps> = React.memo(
  ({ exercise, language, variant = 'accordion' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const { effectiveTheme } = useThemePreference();
    const insets = useSafeAreaInsets();
    const colorScheme = effectiveTheme === 'dark' ? 'dark' : 'light';
    const iconColor = colorScheme === 'dark' ? '#FFF' : '#000';
    const isDark = colorScheme === 'dark';
    const backgroundColor = isDark ? '#151515' : '#FFFFFF';

    // Animation refs for fade-in backdrop (matching ExerciseListSheet pattern)
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Gesture handling for drag-to-resize and snap points
    const translateY = useSharedValue(screenHeight);
    const isDragging = useRef(false);

    // Snap points for resizing (top Y coordinates)
    const snapPoints = useMemo(() => {
      return {
        large: screenHeight * 0.1, // Top at 10% of screen (show 90% - largest)
        medium: screenHeight * 0.4, // Top at 40% of screen (show 60% - medium)
        small: screenHeight * 0.7, // Top at 70% of screen (show 30% - small)
        mini: screenHeight * 0.85, // Top at 85% of screen (show 15% - just title)
        dismissed: screenHeight, // Completely off-screen
      };
    }, []);

    const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.medium);
    const currentState = useSharedValue(snapPoints.medium);

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
      }).start(() => setSheetVisible(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapPoints.dismissed, backdropOpacity]);

    const panGesture = Gesture.Pan()
      .onBegin(() => {
        isDragging.current = true;
      })
      .onUpdate((event) => {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;

        // Constrain to snap points range
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.mini + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        translateY.value = boundedPosition;
      })
      .onEnd((event) => {
        const { translationY, velocityY } = event;
        isDragging.current = false;

        const currentPosition = currentState.value + translationY;

        // Dismiss if dragged down past the mini snap point
        if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
          runOnJS(dismissSheet)();
          return;
        }

        // Determine target snap point based on position and velocity
        let targetSnapPoint;
        if (velocityY < -500) {
          targetSnapPoint = snapPoints.large;
        } else if (velocityY > 500) {
          targetSnapPoint = snapPoints.mini;
        } else {
          // Find closest snap point
          const positions = [
            snapPoints.large,
            snapPoints.medium,
            snapPoints.small,
            snapPoints.mini,
          ];
          targetSnapPoint = positions.reduce((prev, curr) =>
            Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
          );
        }

        const boundedTarget = Math.min(
          Math.max(targetSnapPoint, snapPoints.large),
          snapPoints.mini,
        );

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

    // Handle sheet visibility animation
    useEffect(() => {
      if (sheetVisible) {
        // Animate in
        translateY.value = snapPoints.medium;
        currentState.value = snapPoints.medium;
        setCurrentSnapPoint(snapPoints.medium);

        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sheetVisible, backdropOpacity, snapPoints.medium]);

    const steps = exercise.steps || [];

    if (steps.length === 0) return null;

    const handlePress = () => {
      if (variant === 'sheet') {
        setSheetVisible(true);
      } else {
        setIsExpanded(!isExpanded);
      }
    };

    return (
      <>
        <YStack
          backgroundColor={isDark ? '#1a1a1a' : '#FFFFFF'}
          borderColor={isDark ? '#232323' : '#E5E5E5'}
          borderWidth={1}
          borderRadius={12}
          overflow="hidden"
        >
          {/* Header */}
          <TouchableOpacity onPress={handlePress}>
            <XStack alignItems="center" justifyContent="space-between" padding={16}>
              <XStack alignItems="center" gap={8}>
                <Text fontSize={16} fontWeight="bold" color="$color">
                  {language === 'en' ? 'Step-by-Step Instructions' : 'Steg-för-steg instruktioner'}
                </Text>
                <Text fontSize={14} color="$gray11">
                  ({steps.length} {language === 'en' ? 'steps' : 'steg'})
                </Text>
              </XStack>
              <Feather
                name={
                  variant === 'sheet' ? 'chevron-down' : isExpanded ? 'chevron-up' : 'chevron-down'
                }
                size={20}
                color={iconColor}
              />
            </XStack>
          </TouchableOpacity>

          {/* Content - only render when expanded for accordion variant */}
          {variant === 'accordion' && isExpanded && (
            <YStack padding={16} paddingTop={0}>
              <StepsContent steps={steps} language={language} isDark={isDark} />
            </YStack>
          )}
        </YStack>

        {/* Sheet Modal - only for sheet variant */}
        {variant === 'sheet' && (
          <Modal
            visible={sheetVisible}
            transparent
            animationType="none"
            onRequestClose={dismissSheet}
          >
            <Animated.View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: backdropOpacity,
              }}
            >
              <View style={{ flex: 1 }}>
                <Pressable style={{ flex: 1 }} onPress={dismissSheet} />
                <GestureDetector gesture={panGesture}>
                  <ReanimatedAnimated.View
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: screenHeight,
                        backgroundColor: backgroundColor,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                      },
                      animatedGestureStyle,
                    ]}
                  >
                    <YStack padding="$3" paddingBottom={0} gap="$2" flex={1}>
                      {/* Drag Handle */}
                      <View
                        style={{
                          alignItems: 'center',
                          paddingVertical: 4,
                          paddingBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isDark ? '#CCC' : '#666',
                          }}
                        />
                      </View>

                      {/* Show mini title in mini mode */}
                      {currentSnapPoint === snapPoints.mini && (
                        <YStack alignItems="center" paddingVertical="$2">
                          <Text fontSize="$5" fontWeight="bold" color="$color">
                            {language === 'en'
                              ? 'Step-by-Step Instructions'
                              : 'Steg-för-steg instruktionersss'}
                          </Text>
                        </YStack>
                      )}

                      {/* Show content only if not in mini mode */}
                      {currentSnapPoint !== snapPoints.mini && (
                        <ScrollView
                          style={{
                            flex: 1,
                            maxHeight: screenHeight - currentSnapPoint - 80,
                          }}
                          contentContainerStyle={{
                            paddingHorizontal: 8,
                            paddingBottom: insets.bottom + 20,
                          }}
                          showsVerticalScrollIndicator={true}
                          bounces={true}
                        >
                          {/* Header - scrolls with content */}
                          {/* <XStack
                            alignItems="center"
                            justifyContent="space-between"
                            paddingBottom={12}
                          >
                            <YStack>
                              <Text fontSize={20} fontWeight="bold" color="$color">
                                {language === 'en'
                                  ? 'Step-by-Step Instructions'
                                  : 'Steg-för-steg instruktioner'}
                              </Text>
                              <Text fontSize={14} color="$gray11" marginTop={4}>
                                {steps.length} {language === 'en' ? 'steps' : 'steg'}
                              </Text>
                            </YStack>
                          </XStack> */}

                          {/* Steps Content */}
                          <StepsContent steps={steps} language={language} isDark={isDark} />
                        </ScrollView>
                      )}
                    </YStack>
                  </ReanimatedAnimated.View>
                </GestureDetector>
              </View>
            </Animated.View>
          </Modal>
        )}
      </>
    );
  },
);

ExerciseStepsAccordion.displayName = 'ExerciseStepsAccordion';

export default ExerciseStepsAccordion;
