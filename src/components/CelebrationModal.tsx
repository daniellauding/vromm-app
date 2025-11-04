import React, { useEffect, useState } from 'react';
import { View, Dimensions, Animated, Pressable, Image, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { Button } from './Button';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  learningPathTitle: { en: string; sv: string };
  completedExercises: number;
  totalExercises: number;
  timeSpent?: number; // in minutes
  streakDays?: number;
  onNavigateToLesson?: () => void; // Optional callback to navigate back to lesson
}

export function CelebrationModal({
  visible,
  onClose,
  learningPathTitle,
  completedExercises,
  totalExercises,
  timeSpent,
  streakDays,
  onNavigateToLesson,
}: CelebrationModalProps) {
  const { t, language: lang } = useTranslation();
  const colorScheme = useColorScheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [confettiAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Play celebration sound
      playSound();
      
      // Entrance animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  // Play celebration sound
  const playSound = async () => {
    try {
      // Set audio mode for iOS
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/ui-celebration.mp3'),
        { shouldPlay: true, volume: 0.6 }
      );
      
      console.log('🔊 Playing celebration sound');
      
      // Cleanup when sound finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('🔊 Celebration sound finished');
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('🔊 Celebration sound error:', error);
    }
  };

  if (!visible) return null;

  const completionPercentage = Math.round((completedExercises / totalExercises) * 100);

  // Get motivational message based on completion
  const getMotivationalMessage = () => {
    if (completionPercentage === 100) {
      return {
        title: t('celebration.pathCompleted.title') || 'Path Completed! 🎉',
        message:
          t('celebration.pathCompleted.message') ||
          "Amazing work! You've mastered this learning path.",
        icon: 'trophy',
        color: '#FFD700',
      };
    } else if (completionPercentage >= 80) {
      return {
        title: t('celebration.almostThere.title') || 'Almost There! 🔥',
        message: t('celebration.almostThere.message') || "You're so close to completing this path!",
        icon: 'zap',
        color: '#FF6B35',
      };
    } else if (completionPercentage >= 50) {
      return {
        title: t('celebration.greatProgress.title') || 'Great Progress! 💪',
        message: t('celebration.greatProgress.message') || "You're making excellent progress!",
        icon: 'trending-up',
        color: '#4B6BFF',
      };
    } else {
      return {
        title: t('celebration.keepGoing.title') || 'Keep Going! 🚀',
        message: t('celebration.keepGoing.message') || "Every step counts! You're doing great!",
        icon: 'star',
        color: '#00E6C3',
      };
    }
  };

  const motivation = getMotivationalMessage();
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        opacity: fadeAnim,
      }}
    >
      <BlurView
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        intensity={10}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        pointerEvents="none"
      />
      <Pressable
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
          width: '100%',
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            width="90%"
            maxWidth={400}
            backgroundColor="transparent"
            justifyContent="center"
            alignItems="center"
          >
            {/* Confetti Animation */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: confettiAnim,
                zIndex: -1,
              }}
            >
              {[...Array(30)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${Math.random() * 100}%`,
                    top: -50,
                    width: 10,
                    height: 10,
                    backgroundColor: ['#FFD700', '#00E6C3', '#4B6BFF', '#FF6B35'][
                      Math.floor(Math.random() * 4)
                    ],
                    borderRadius: 5,
                    transform: [
                      {
                        translateY: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, Dimensions.get('window').height + 100],
                        }),
                      },
                      {
                        rotate: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '1080deg'],
                        }),
                      },
                    ],
                  }}
                />
              ))}
            </Animated.View>

            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                width: '100%',
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                paddingVertical="$4"
                paddingTop="$0"
                overflow="hidden"
                paddingHorizontal="$0"
                borderRadius="$4"
                width="100%"
                gap="$3"
                borderColor={borderColor}
                borderWidth={1}
              >
                {/* Header Image */}
                <YStack
                  alignItems="center"
                  backgroundColor="rgba(0, 230, 195, 0.1)"
                  position="relative"
                >
                  <Image
                    source={require('../../assets/images/lesson_complete.png')}
                    style={{
                      width: '100%',
                      height: 200,
                    }}
                    resizeMode="cover"
                    fadeDuration={0}
                  />

                  {/* 100% Badge */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      backgroundColor: '#00E6C3',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Text fontSize={16} fontWeight="bold" color="#000">
                      100%
                    </Text>
                  </View>

                  {/* Close button */}
                  <Pressable
                    onPress={onClose}
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: 20,
                      width: 40,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="x" size={24} color="white" />
                  </Pressable>
                </YStack>

                {/* Content */}
                <YStack paddingHorizontal="$4" gap="$3" paddingBottom="$4">
                  {/* Title */}
                  <Text
                    fontSize={28}
                    fontWeight="900"
                    fontStyle="italic"
                    color={textColor}
                    textAlign="center"
                  >
                    {t('celebration.lessonComplete') || 'Lesson complete!'}
                  </Text>

                  {/* Message */}
                  <Text fontSize={16} color={textColor} textAlign="center" opacity={0.8}>
                    {t('celebration.greatJob') ||
                      'Great job completing the lesson. You are one step further in your driving license journey'}
                  </Text>

                  {/* Completed Item Card - Clickable */}
                  <TouchableOpacity
                    onPress={() => {
                      onNavigateToLesson?.();
                      onClose();
                    }}
                    activeOpacity={0.7}
                    style={{ width: '100%' }}
                  >
                    <Card
                      backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                      borderRadius={16}
                      padding="$4"
                      borderWidth={2}
                      borderColor="#00E6C3"
                    >
                      <XStack alignItems="center" gap="$3">
                        {/* Progress Circle */}
                        <View style={{ position: 'relative' }}>
                          <Svg width={60} height={60}>
                            <Circle
                              cx={30}
                              cy={30}
                              r={27}
                              stroke="#333"
                              strokeWidth={6}
                              fill="none"
                            />
                            <Circle
                              cx={30}
                              cy={30}
                              r={27}
                              stroke="#00E6C3"
                              strokeWidth={6}
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 27},${2 * Math.PI * 27}`}
                              strokeDashoffset={0}
                              strokeLinecap="round"
                              rotation="-90"
                              origin="30,30"
                            />
                          </Svg>
                          <Text
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: 60,
                              height: 60,
                              textAlign: 'center',
                              lineHeight: 60,
                            }}
                            fontSize={12}
                            color="#00E6C3"
                            fontWeight="bold"
                          >
                            100%
                          </Text>
                        </View>

                        {/* Exercise Info */}
                        <YStack flex={1}>
                          <Text
                            fontSize={18}
                            fontWeight="900"
                            fontStyle="italic"
                            color={textColor}
                            numberOfLines={2}
                          >
                            {learningPathTitle[lang as keyof typeof learningPathTitle] ||
                              learningPathTitle.en}
                          </Text>
                          <Text fontSize={14} color={textColor} opacity={0.7}>
                            {completedExercises} / {totalExercises}{' '}
                            {t('celebration.exercisesCompleted') || 'completed'}
                          </Text>
                        </YStack>

                        {/* Arrow indicator */}
                        <Feather name="chevron-right" size={24} color={textColor} opacity={0.5} />
                      </XStack>
                    </Card>
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <YStack gap="$2" marginTop="$2">
                    <Button size="sm" variant="primary" onPress={onClose}>
                      {t('celebration.continue') || 'CONTINUE'}
                    </Button>
                  </YStack>
                </YStack>
              </YStack>
            </Animated.View>
          </YStack>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
