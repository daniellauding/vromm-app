import React from 'react';
import { Dimensions, Pressable } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useUnlock } from '../../../contexts/UnlockContext';
import { FeaturedExercise, FeaturedLearningPath } from './types';
import { FeaturedMedia } from './FeaturedMedia';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.7;

export const IncompleteFeaturedExercises = React.memo(function IncompleteFeaturedExercises({
  exercise,
  handleFeaturedExercisePress,
}: {
  exercise: FeaturedExercise;
  handleFeaturedExercisePress: (exercise: FeaturedExercise) => void;
}) {
  const { t, language: lang } = useTranslation();
  const { isPathUnlocked, hasPathPayment } = useUnlock();

  const isPathPasswordLocked = React.useCallback(
    (path: FeaturedLearningPath): boolean => {
      return !!path.is_locked && !isPathUnlocked(path.id);
    },
    [isPathUnlocked],
  );

  const isPathPaywallLocked = React.useCallback(
    (path: FeaturedLearningPath): boolean => {
      if (!path.paywall_enabled) return false;
      return !hasPathPayment(path.id);
    },
    [hasPathPayment],
  );

  const isPasswordLocked = isPathPasswordLocked(exercise);
  const isPaywallLocked = isPathPaywallLocked(exercise);

  return (
    <Pressable
      onPress={() => {
        handleFeaturedExercisePress(exercise);
      }}
      style={({ pressed }) => ({
        flex: 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Card
        width={cardWidth}
        padding="$4"
        backgroundColor="$backgroundHover"
        borderRadius="$4"
        borderWidth={1}
        borderColor={isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : '$borderColor'}
        style={{
          shadowColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
          shadowOpacity: isPasswordLocked || isPaywallLocked ? 0.3 : 0,
          shadowRadius: isPasswordLocked || isPaywallLocked ? 8 : 0,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <YStack gap="$3" position="relative">
          {/* Lock/Payment indicator badges (top-right corner) */}
          {(isPasswordLocked || isPaywallLocked) && (
            <XStack position="absolute" top={0} right={0} zIndex={10} gap="$1">
              {isPasswordLocked && (
                <YStack
                  backgroundColor="#FF9500"
                  borderRadius="$2"
                  padding="$1"
                  minWidth={24}
                  alignItems="center"
                >
                  <MaterialIcons name="lock" size={12} color="white" />
                </YStack>
              )}
              {isPaywallLocked && (
                <YStack
                  backgroundColor="#00E6C3"
                  borderRadius="$2"
                  padding="$1"
                  minWidth={24}
                  alignItems="center"
                >
                  <Feather name="credit-card" size={10} color="black" />
                </YStack>
              )}
            </XStack>
          )}

          <XStack alignItems="center" gap="$2">
            {exercise.icon && (
              <Feather
                name={exercise.icon as keyof typeof Feather.glyphMap}
                size={20}
                color="#00E6C3"
              />
            )}
            <Text fontSize="$3" fontWeight="600" color="#00E6C3">
              {(() => {
                const translated = t('home.exercise');
                return translated === 'home.exercise' ? 'Exercise' : translated;
              })()}
            </Text>
          </XStack>

          <Text fontSize="$5" fontWeight="bold" color="$color" numberOfLines={2}>
            {exercise.title?.[lang] || exercise.title?.en || 'Untitled'}
          </Text>

          {/* Media (Video/Image) */}
          <FeaturedMedia item={exercise} />

          {exercise.description?.[lang] && (
            <Text fontSize="$3" color="$gray11" numberOfLines={3}>
              {exercise.description[lang]}
            </Text>
          )}

          <XStack alignItems="center" gap="$2" marginTop="$2">
            <Feather name="play-circle" size={16} color="$gray11" />
            <Text fontSize="$2" color="$gray11">
              {(() => {
                const translated = t('home.startExercise');
                return translated === 'home.startExercise' ? 'Start Exercise' : translated;
              })()}
            </Text>
            <Feather name="arrow-right" size={14} color="$gray11" />
          </XStack>
        </YStack>
      </Card>
    </Pressable>
  );
});
