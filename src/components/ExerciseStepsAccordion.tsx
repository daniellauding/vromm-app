import React, { useState } from 'react';
import { View, TouchableOpacity, Linking, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';

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
 * Accordion component for displaying exercise steps with optional media
 * Memoized for performance optimization
 */
export const ExerciseStepsAccordion: React.FC<ExerciseStepsAccordionProps> = React.memo(
  ({ exercise, language }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { effectiveTheme } = useThemePreference();
    const colorScheme = effectiveTheme === 'dark' ? 'dark' : 'light';
    const iconColor = colorScheme === 'dark' ? '#FFF' : '#000';

    const steps = exercise.steps || [];

    if (steps.length === 0) return null;

    const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);

    return (
      <YStack
        backgroundColor={colorScheme === 'dark' ? '#333' : '#F8F9FA'}
        borderRadius={12}
        overflow="hidden"
      >
        {/* Header */}
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
          <XStack alignItems="center" justifyContent="space-between" padding={16}>
            <XStack alignItems="center" gap={8}>
              <Feather name="list" size={20} color="#FF9500" />
              <Text fontSize={16} fontWeight="bold" color="$color">
                {language === 'en' ? 'Step-by-Step Instructions' : 'Steg-för-steg instruktioner'}
              </Text>
              <Text fontSize={14} color="$gray11">
                ({steps.length} {language === 'en' ? 'steps' : 'steg'})
              </Text>
            </XStack>
            <Feather
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={iconColor}
            />
          </XStack>
        </TouchableOpacity>

        {/* Content - only render when expanded for performance */}
        {isExpanded && (
          <YStack padding={16} paddingTop={0} gap={12}>
            {sortedSteps.map((step, index) => (
              <YStack key={`step-${index}`} gap={8}>
                <XStack alignItems="flex-start" gap={12}>
                  {/* Step Number Badge */}
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#FF9500',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Text fontSize={14} fontWeight="bold" color="white">
                      {index + 1}
                    </Text>
                  </View>

                  {/* Step Content */}
                  <YStack flex={1} gap={8}>
                    <Text fontSize={16} color="$color" lineHeight={22} fontWeight="600">
                      {typeof step.text === 'string'
                        ? step.text
                        : step.text?.[language] || step.text?.en || ''}
                    </Text>

                    {/* Step Description */}
                    {step.description && (
                      <Text fontSize={14} color="$gray11" lineHeight={20}>
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

                {/* Divider between steps */}
                {index < sortedSteps.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor:
                        colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      marginTop: 4,
                      marginLeft: 40,
                    }}
                  />
                )}
              </YStack>
            ))}
          </YStack>
        )}
      </YStack>
    );
  },
);

ExerciseStepsAccordion.displayName = 'ExerciseStepsAccordion';

export default ExerciseStepsAccordion;
