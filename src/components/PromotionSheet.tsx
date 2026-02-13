import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  View,
  Dimensions,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';

const { height } = Dimensions.get('window');

interface Promotion {
  id: string;
  title: { en: string; sv: string };
  body: { en: string; sv: string };
  icon: string | null;
  icon_color: string | null;
  image_url: string | null;
  youtube_embed: string | null;
  media_type: string | null;
  order_index: number;
}

interface PromotionSheetProps {
  visible: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  language: 'en' | 'sv';
}

export function PromotionSheet({ visible, onClose, promotion, language }: PromotionSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#151515' : '#fff';
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);

  // Snap points for resizing
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Show 90%
      medium: height * 0.4, // Show 60%
      small: height * 0.7, // Show 30%
      mini: height * 0.85, // Show 15%
      dismissed: height,
    };
    return points;
  }, []);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);

  const dismissSheet = React.useCallback(() => {
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
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.mini + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;
      const currentPosition = currentState.value + translationY;

      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }

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

  // Animation effects
  useEffect(() => {
    if (visible) {
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

  // Extract YouTube video ID
  const getYouTubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7] && match[7].length === 11 ? match[7] : null;
  };

  if (!visible || !promotion) return null;

  const videoId = getYouTubeVideoId(promotion.youtube_embed);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'transparent',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
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

                {/* Show mini title in mini mode */}
                {currentSnapPoint === snapPoints.mini && (
                  <YStack alignItems="center" paddingVertical="$2">
                    <Text fontSize="$5" fontWeight="bold" color="$color">
                      {promotion.title[language] || promotion.title.en}
                    </Text>
                  </YStack>
                )}

                {/* Show content only if not in mini mode */}
                {currentSnapPoint !== snapPoints.mini && (
                  <View style={{ flex: 1 }}>
                    <ScrollView showsVerticalScrollIndicator={true}>
                      {/* Header */}
                      <XStack justifyContent="space-between" alignItems="center" marginBottom={24}>
                        <View style={{ width: 24 }} />
                        <TouchableOpacity onPress={onClose}>
                          <Feather name="x" size={24} color={iconColor} />
                        </TouchableOpacity>
                      </XStack>

                      {/* Icon and Title */}
                      <YStack gap={16} marginBottom={24}>
                        {promotion.icon && (
                          <YStack
                            width={64}
                            height={64}
                            borderRadius={32}
                            backgroundColor={promotion.icon_color || '#00E6C3'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Feather
                              name={promotion.icon as keyof typeof Feather.glyphMap}
                              size={32}
                              color="white"
                            />
                          </YStack>
                        )}
                        <Text fontSize={28} fontWeight="bold" color="$color">
                          {promotion.title[language] || promotion.title.en}
                        </Text>
                      </YStack>

                      {/* Image */}
                      {promotion.image_url && (
                        <View
                          style={{
                            width: '100%',
                            marginBottom: 24,
                            borderRadius: 12,
                            overflow: 'hidden',
                          }}
                        >
                          <Image
                            source={{ uri: promotion.image_url }}
                            style={{
                              width: '100%',
                              height: 250,
                              resizeMode: 'cover',
                            }}
                          />
                        </View>
                      )}

                      {/* YouTube Video */}
                      {videoId && (
                        <View
                          style={{
                            width: '100%',
                            aspectRatio: 16 / 9,
                            marginBottom: 24,
                            borderRadius: 12,
                            overflow: 'hidden',
                          }}
                        >
                          <YoutubePlayer
                            height={300}
                            videoId={videoId}
                            play={false}
                            webViewProps={{
                              androidLayerType: 'hardware',
                            }}
                          />
                        </View>
                      )}

                      {/* Body Content */}
                      {promotion.body && (promotion.body[language] || promotion.body.en) && (
                        <Text fontSize={16} color="$color" lineHeight={24} marginBottom={24}>
                          {promotion.body[language] || promotion.body.en}
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </YStack>
            </ReanimatedAnimated.View>
        </View>
      </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

