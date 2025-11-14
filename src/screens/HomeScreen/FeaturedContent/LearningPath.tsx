import React from 'react';
import { Dimensions, Pressable } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useUnlock } from '../../../contexts/UnlockContext';
import { FeaturedLearningPath } from './types';
import { FeaturedMedia } from './FeaturedMedia';
import {
  FeaturedCardVariantProps,
  getFeaturedCardSizeConfig,
  resolveFeaturedCardProps,
} from './variants';

export const LearningPath = React.memo(function LearningPath({
  path,
  handleFeaturedPathPress,
  size,
  preset,
  showIcon = true,
  showTitle = true,
  showDescription = true,
  showMedia = true,
  showActionButton = true,
  showLockBadges = true,
  truncateTitle = true,
  truncateDescription = true,
}: {
  path: FeaturedLearningPath;
  handleFeaturedPathPress: (path: FeaturedLearningPath) => void;
} & FeaturedCardVariantProps) {
  const { t, language: lang } = useTranslation();
  const { isPathUnlocked, hasPathPayment } = useUnlock();

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
      ),
    [preset, size, showIcon, showTitle, showDescription, showMedia, showActionButton, showLockBadges],
  );

  const {
    size: resolvedSize,
    showIcon: resolvedShowIcon,
    showTitle: resolvedShowTitle,
    showDescription: resolvedShowDescription,
    showMedia: resolvedShowMedia,
    showActionButton: resolvedShowActionButton,
    showLockBadges: resolvedShowLockBadges,
  } = resolvedProps;

  // Get size configuration
  const sizeConfig = React.useMemo(
    () => getFeaturedCardSizeConfig(resolvedSize, preset),
    [resolvedSize, preset],
  );

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

  const isPasswordLocked = isPathPasswordLocked(path);
  const isPaywallLocked = isPathPaywallLocked(path);

  return (
    <Pressable
      key={`featured-path-${path.id}`}
      onPress={() => {
        handleFeaturedPathPress(path);
      }}
      style={({ pressed }) => ({
        flex: 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Card
        width={sizeConfig.cardWidth}
        padding={sizeConfig.padding}
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
        <YStack gap={sizeConfig.gap} position="relative">
          {/* Lock/Payment indicator badges (top-right corner) */}
          {resolvedShowLockBadges && (isPasswordLocked || isPaywallLocked) && (
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

          {/* Icon and Label */}
          {resolvedShowIcon && (
            <XStack alignItems="center" gap="$2">
              {path.icon && (
                <Feather
                  name={path.icon as keyof typeof Feather.glyphMap}
                  size={sizeConfig.iconSize}
                  color="#00FFBC"
                />
              )}
              <Text fontSize={sizeConfig.descriptionFontSize} fontWeight="600" color="#00FFBC">
                {(() => {
                  const translated = t('home.learningPath');
                  return translated === 'home.learningPath' ? 'Learning Path' : translated;
                })()}
              </Text>
            </XStack>
          )}

          {/* Title */}
          {resolvedShowTitle && (
            <Text
              fontSize={sizeConfig.titleFontSize}
              fontWeight="bold"
              color="$color"
              numberOfLines={truncateTitle ? 2 : undefined}
              ellipsizeMode={truncateTitle ? 'tail' : undefined}
            >
              {path.title?.[lang] || path.title?.en || 'Untitled'}
            </Text>
          )}

          {/* Media (Video/Image) */}
          {resolvedShowMedia && (
            <FeaturedMedia
              item={path}
              size={resolvedSize}
              cardWidth={sizeConfig.cardWidth}
              aspectRatio={sizeConfig.mediaAspectRatio}
            />
          )}

          {/* Description */}
          {resolvedShowDescription && path.description?.[lang] && (
            <Text
              fontSize={sizeConfig.descriptionFontSize}
              color="$gray11"
              numberOfLines={truncateDescription ? 3 : undefined}
              ellipsizeMode={truncateDescription ? 'tail' : undefined}
            >
              {path.description[lang]}
            </Text>
          )}

          {/* Action Button */}
          {resolvedShowActionButton && (
            <XStack alignItems="center" gap="$2" marginTop="$2">
              <Feather name="book-open" size={sizeConfig.actionIconSize} color="$gray11" />
              <Text fontSize={sizeConfig.descriptionFontSize} color="$gray11">
                {(() => {
                  const translated = t('home.startLearning');
                  return translated === 'home.startLearning' ? 'Start Learning' : translated;
                })()}
              </Text>
              <Feather name="arrow-right" size={sizeConfig.actionIconSize - 2} color="$gray11" />
            </XStack>
          )}
        </YStack>
      </Card>
    </Pressable>
  );
});
