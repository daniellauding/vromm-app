import React, { useEffect, useState } from 'react';
import { View, Dimensions, Animated, Pressable } from 'react-native';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  learningPathTitle: { en: string; sv: string };
  completedExercises: number;
  totalExercises: number;
  timeSpent?: number; // in minutes
  streakDays?: number;
}

export function CelebrationModal({
  visible,
  onClose,
  learningPathTitle,
  completedExercises,
  totalExercises,
  timeSpent,
  streakDays,
}: CelebrationModalProps) {
  const { t, language: lang } = useTranslation();
  const colorScheme = useColorScheme();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [confettiAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
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
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: 400 }}>
          {/* Confetti Animation */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: confettiAnim,
            }}
          >
            {[...Array(20)].map((_, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  left: `${Math.random() * 100}%`,
                  top: -50,
                  width: 8,
                  height: 8,
                  backgroundColor: ['#FFD700', '#FF6B35', '#4B6BFF', '#00E6C3'][
                    Math.floor(Math.random() * 4)
                  ],
                  borderRadius: 4,
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
                        outputRange: ['0deg', '720deg'],
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
              width: Dimensions.get('window').width * 0.9,
              maxWidth: 400,
            }}
          >
            <Card
              padding="$6"
              borderRadius="$6"
              backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
              borderWidth={2}
              borderColor={motivation.color}
              shadowColor={colorScheme === 'dark' ? '#000' : '#000'}
              shadowOffset={{ width: 0, height: 8 }}
              shadowOpacity={0.3}
              shadowRadius={16}
              elevation={8}
            >
              <YStack alignItems="center" gap="$4">
                {/* Celebration Icon */}
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: motivation.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: motivation.color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Feather
                    name={motivation.icon as keyof typeof Feather.glyphMap}
                    size={40}
                    color="white"
                  />
                </View>

                {/* Title */}
                <Text
                  fontSize="$7"
                  fontWeight="bold"
                  color="$color"
                  textAlign="center"
                  numberOfLines={2}
                >
                  {motivation.title}
                </Text>

                {/* Learning Path Title */}
                <Text
                  fontSize="$5"
                  fontWeight="600"
                  color={motivation.color}
                  textAlign="center"
                  numberOfLines={2}
                >
                  {learningPathTitle[lang as keyof typeof learningPathTitle] ||
                    learningPathTitle.en}
                </Text>

                {/* Message */}
                <Text fontSize="$4" color="$gray11" textAlign="center" lineHeight="$1">
                  {motivation.message}
                </Text>

                {/* Progress Stats */}
                <YStack
                  backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
                  padding="$4"
                  borderRadius="$4"
                  width="100%"
                  gap="$3"
                >
                  {/* Progress Bar */}
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$3" fontWeight="600" color="$color">
                        {t('celebration.progress') || 'Progress'}
                      </Text>
                      <Text fontSize="$3" fontWeight="bold" color={motivation.color}>
                        {completionPercentage}%
                      </Text>
                    </XStack>
                    <View
                      style={{
                        width: '100%',
                        height: 8,
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${completionPercentage}%`,
                          height: '100%',
                          backgroundColor: motivation.color,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <Text fontSize="$2" color="$gray11" textAlign="center">
                      {completedExercises} / {totalExercises}{' '}
                      {t('celebration.exercisesCompleted') || 'exercises completed'}
                    </Text>
                  </YStack>

                  {/* Additional Stats */}
                  {(timeSpent || streakDays) && (
                    <XStack justifyContent="space-around" alignItems="center">
                      {timeSpent && (
                        <YStack alignItems="center" gap="$1">
                          <Feather name="clock" size={16} color={motivation.color} />
                          <Text fontSize="$2" color="$gray11" textAlign="center">
                            {timeSpent} {t('celebration.minutes') || 'min'}
                          </Text>
                        </YStack>
                      )}
                      {streakDays && (
                        <YStack alignItems="center" gap="$1">
                          <Feather name="zap" size={16} color="#FF6B35" />
                          <Text fontSize="$2" color="$gray11" textAlign="center">
                            {streakDays} {t('celebration.days') || 'days'}
                          </Text>
                        </YStack>
                      )}
                    </XStack>
                  )}
                </YStack>

                {/* Action Buttons */}
                <XStack gap="$3" width="100%">
                  <Button
                    flex={1}
                    backgroundColor="$gray8"
                    color="$color"
                    onPress={onClose}
                    borderRadius="$4"
                    paddingVertical="$3"
                  >
                    <Text fontSize="$4" fontWeight="600">
                      {t('celebration.continue') || 'Continue'}
                    </Text>
                  </Button>

                  {completionPercentage === 100 && (
                    <Button
                      flex={1}
                      backgroundColor={motivation.color}
                      color="white"
                      onPress={() => {
                        // TODO: Navigate to next learning path or share achievement
                        onClose();
                      }}
                      borderRadius="$4"
                      paddingVertical="$3"
                    >
                      <Text fontSize="$4" fontWeight="600" color="white">
                        {t('celebration.nextPath') || 'Next Path'}
                      </Text>
                    </Button>
                  )}
                </XStack>
              </YStack>
            </Card>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
