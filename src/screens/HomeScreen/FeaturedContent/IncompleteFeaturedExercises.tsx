import React, { useState, useEffect } from 'react';
import { Dimensions, Pressable, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useUnlock } from '../../../contexts/UnlockContext';
import { useThemePreference } from '../../../hooks/useThemeOverride';
import { FeaturedExercise, FeaturedLearningPath } from './types';
import { FeaturedMedia } from './FeaturedMedia';
import { QuizModal } from '../../../components/QuizModal';
import { useQuiz } from '../../../hooks/useQuiz';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import {
  FeaturedCardVariantProps,
  getFeaturedCardSizeConfig,
  resolveFeaturedCardProps,
} from './variants';

export const IncompleteFeaturedExercises = React.memo(function IncompleteFeaturedExercises({
  exercise,
  handleFeaturedExercisePress,
  size,
  preset,
  showIcon = true,
  showTitle = true,
  showDescription = true,
  showMedia = true,
  showActionButton = true,
  showLockBadges = true,
  showTitleIcon = false,
  equalHeight = false,
  cardHeight,
  truncateTitle = true,
  truncateDescription = true,
}: {
  exercise: FeaturedExercise;
  handleFeaturedExercisePress: (exercise: FeaturedExercise) => void;
} & FeaturedCardVariantProps) {
  const { t, language: lang } = useTranslation();
  const { isPathUnlocked, hasPathPayment } = useUnlock();
  const { profile } = useAuth();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const [quizPassed, setQuizPassed] = useState(false);

  // Resolve props based on preset
  const resolvedProps = React.useMemo(
    () =>
      resolveFeaturedCardProps(
        preset,
        size,
        showIcon,
        showTitle,
        showDescription,
        showMedia,
        showActionButton,
        showLockBadges,
        showTitleIcon,
      ),
    [preset, size, showIcon, showTitle, showDescription, showMedia, showActionButton, showLockBadges, showTitleIcon],
  );

  const {
    size: resolvedSize,
    showIcon: resolvedShowIcon,
    showTitle: resolvedShowTitle,
    showDescription: resolvedShowDescription,
    showMedia: resolvedShowMedia,
    showActionButton: resolvedShowActionButton,
    showLockBadges: resolvedShowLockBadges,
    showTitleIcon: resolvedShowTitleIcon,
  } = resolvedProps;

  // Get size configuration
  const sizeConfig = React.useMemo(
    () => getFeaturedCardSizeConfig(resolvedSize, preset),
    [resolvedSize, preset],
  );

  // Quiz integration - only show if both has_quiz and show_quiz are true
  const shouldShowQuiz = !!(exercise.has_quiz && (exercise.show_quiz !== false)); // show_quiz defaults to true if not set
  const quiz = useQuiz({
    exerciseId: exercise.id || '',
    exerciseTitle: exercise.title || { en: '', sv: '' },
    hasQuiz: shouldShowQuiz,
    quizRequired: exercise.quiz_required || false,
    quizPassScore: exercise.quiz_pass_score || 70,
    onQuizComplete: async (passed, score) => {
      console.log('Featured exercise quiz completed:', { passed, score });
      if (passed) {
        setQuizPassed(true); // Update the badge immediately
      }
    },
  });

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

  // Check if user has passed the quiz
  useEffect(() => {
    const checkQuizStatus = async () => {
      if (!shouldShowQuiz || !profile?.id || !exercise.id) return;
      
      const { data } = await supabase
        .from('quiz_attempts')
        .select('passed')
        .eq('user_id', profile.id)
        .eq('exercise_id', exercise.id)
        .eq('passed', true)
        .limit(1);
      
      if (data && data.length > 0) {
        setQuizPassed(true);
      }
    };
    
    checkQuizStatus();
  }, [shouldShowQuiz, profile?.id, exercise.id]);

  return (
    <Pressable
      onPress={() => {
        handleFeaturedExercisePress(exercise);
      }}
      style={({ pressed }) => ({
        width: sizeConfig.cardWidth,
        height: cardHeight || (equalHeight ? sizeConfig.cardHeight : undefined),
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Card
        width={sizeConfig.cardWidth}
        height={cardHeight || (equalHeight ? sizeConfig.cardHeight : undefined)}
        padding={sizeConfig.padding}
        backgroundColor={colorScheme === 'dark' ? '#232323' : '#f2f1ef'}
        borderRadius="$4"
        borderWidth={2}
        borderColor={
          isPasswordLocked
            ? '#FF9500'
            : isPaywallLocked
              ? '#00E6C3'
              : colorScheme === 'dark'
                ? '#232323'
                : '#E5E5E5'
        }
        style={{
          shadowColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
          shadowOpacity: isPasswordLocked || isPaywallLocked ? 0.3 : 0,
          shadowRadius: isPasswordLocked || isPaywallLocked ? 8 : 0,
          shadowOffset: { width: 0, height: 0 },
          overflow: 'hidden',
        }}
      >
        <YStack gap={sizeConfig.gap} position="relative" flex={1} height="100%">
          {/* Lock/Payment/Quiz indicator badges (top-right corner) */}
          {resolvedShowLockBadges && (isPasswordLocked || isPaywallLocked || shouldShowQuiz) && (
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
              {shouldShowQuiz && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    quiz.openQuiz();
                  }}
                  style={{
                    backgroundColor: quizPassed ? '#00E6C3' : (exercise.quiz_required ? '#145251' : '#00E6C3'),
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Feather name={quizPassed ? 'check-circle' : 'clipboard'} size={12} color={quizPassed ? '#000' : 'white'} />
                  <Text fontSize={10} color={quizPassed ? '#000' : 'white'} fontWeight="bold">
                    {quizPassed ? 'PASSED' : 'QUIZ'}
                  </Text>
                </TouchableOpacity>
              )}
            </XStack>
          )}

          {/* Icon and Label */}
          {resolvedShowIcon && (
            <XStack alignItems="center" gap="$2">
              {exercise.icon && (
                <Feather
                  name={exercise.icon as keyof typeof Feather.glyphMap}
                  size={sizeConfig.iconSize}
                  color="#00E6C3"
                />
              )}
              <Text fontSize={sizeConfig.descriptionFontSize} fontWeight="600" color="#00E6C3">
                {(() => {
                  const translated = t('home.exercise');
                  return translated === 'home.exercise' ? 'Exercise' : translated;
                })()}
              </Text>
            </XStack>
          )}

          {/* Title */}
          {resolvedShowTitle && (
            <XStack alignItems="flex-start" justifyContent="space-between" gap="$2">
              <Text
                fontSize={16}
                fontWeight="900"
                fontStyle="italic"
                color="$color"
                numberOfLines={truncateTitle ? 2 : undefined}
                ellipsizeMode={truncateTitle ? 'tail' : undefined}
                flex={1}
                lineHeight={20}
              >
                {exercise.title?.[lang] || exercise.title?.en || 'Untitled'}
              </Text>
              {resolvedShowTitleIcon && (
                <Feather
                  name="chevron-right"
                  size={20}
                  color={effectiveTheme === 'dark' ? '#999' : '#666'}
                  style={{ marginTop: 2 }}
                />
              )}
            </XStack>
          )}

          {/* Media (Video/Image) */}
          {resolvedShowMedia && (
            <FeaturedMedia
              item={exercise}
              size={resolvedSize}
              cardWidth={sizeConfig.cardWidth}
              aspectRatio={sizeConfig.mediaAspectRatio}
            />
          )}

          {/* Description */}
          {resolvedShowDescription && exercise.description?.[lang] && (
            <Text
              fontSize={sizeConfig.descriptionFontSize}
              color="$gray11"
              numberOfLines={truncateDescription ? 3 : undefined}
              ellipsizeMode={truncateDescription ? 'tail' : undefined}
            >
              {exercise.description[lang]}
            </Text>
          )}

          {/* Action Button */}
          {resolvedShowActionButton && (
            <XStack alignItems="center" gap="$2" marginTop="$2">
              <Feather name="play-circle" size={sizeConfig.actionIconSize} color="$gray11" />
              <Text fontSize={sizeConfig.descriptionFontSize} color="$gray11">
                {(() => {
                  const translated = t('home.startExercise');
                  return translated === 'home.startExercise' ? 'Start Exercise' : translated;
                })()}
              </Text>
              <Feather name="arrow-right" size={sizeConfig.actionIconSize - 2} color="$gray11" />
            </XStack>
          )}
        </YStack>
      </Card>

      {/* Quiz Modal */}
      <QuizModal
        visible={quiz.showQuizModal}
        onClose={quiz.closeQuiz}
        exerciseId={quiz.exerciseId}
        exerciseTitle={quiz.exerciseTitle}
        quizRequired={quiz.quizRequired}
        quizPassScore={quiz.quizPassScore}
        onQuizComplete={quiz.handleQuizComplete}
      />
    </Pressable>
  );
});
