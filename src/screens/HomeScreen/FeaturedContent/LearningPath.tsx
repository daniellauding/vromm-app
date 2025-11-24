import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useUnlock } from '../../../contexts/UnlockContext';
import { useThemePreference } from '../../../hooks/useThemeOverride';
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
  showTitleIcon = false,
  equalHeight = false,
  cardHeight,
  truncateTitle = true,
  truncateDescription = true,
}: {
  path: FeaturedLearningPath;
  handleFeaturedPathPress: (path: FeaturedLearningPath) => void;
} & FeaturedCardVariantProps) {
  const { t, language: lang } = useTranslation();
  const { isPathUnlocked, hasPathPayment } = useUnlock();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';

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
    [
      preset,
      size,
      showIcon,
      showTitle,
      showDescription,
      showMedia,
      showActionButton,
      showLockBadges,
      showTitleIcon,
    ],
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
                <>
                  <Feather
                    name={path.icon as keyof typeof Feather.glyphMap}
                    size={sizeConfig.iconSize}
                    color="#00FFBC"
                  />
                  <Text
                    fontSize={sizeConfig.descriptionFontSize}
                    fontWeight={600}
                    color="$primaryCyan"
                  >
                    {(() => {
                      const translated = t('home.learningPath');
                      return translated === 'home.learningPath' ? 'Learning Path' : translated;
                    })()}
                  </Text>
                </>
              )}
            </XStack>
          )}

          {/* Title */}
          {resolvedShowTitle && (
            <XStack alignItems="flex-start" justifyContent="space-between" gap="$2">
              <Text
                // fontSize={sizeConfig.titleFontSize}
                // fontWeight="bold"
                fontSize={16}
                fontWeight="900"
                fontStyle="italic"
                color="$color"
                numberOfLines={truncateTitle ? 2 : undefined}
                ellipsizeMode={truncateTitle ? 'tail' : undefined}
                flex={1}
                lineHeight={20}
              >
                {path.title?.[lang] || path.title?.en || 'Untitled'}
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
