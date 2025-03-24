import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  TouchableOpacity,
  Image,
  ImageSourcePropType
} from 'react-native';
import { YStack, XStack, useTheme, Stack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { FontAwesome } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export interface OnboardingSlide {
  id: string;
  title_en: string;
  title_sv: string;
  text_en: string;
  text_sv: string;
  image: ImageSourcePropType;
  icon?: string; // FontAwesome icon name
  iconColor?: string;
  iconSvg?: string; // SVG string for custom icon
}

interface OnboardingProps {
  slides: OnboardingSlide[];
  onDone: () => void;
  onSkip?: () => void;
  showAgainKey?: string; // Storage key to track if onboarding should be shown again
}

export function Onboarding({
  slides,
  onDone,
  onSkip,
  showAgainKey = 'show_onboarding'
}: OnboardingProps) {
  const { language } = useLanguage();
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // Mark onboarding as viewed
  const completeOnboarding = async () => {
    try {
      await completeOnboardingWithVersion(showAgainKey);
      onDone();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onDone();
    }
  };

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = (index: number) => {
    if (slidesRef.current && index >= 0 && index < slides.length) {
      slidesRef.current.scrollToIndex({ index });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false
    })(event);
  };

  const nextSlide = () => {
    if (currentIndex < slides.length - 1) {
      scrollTo(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const skipOnboarding = () => {
    if (onSkip) {
      onSkip();
    } else {
      completeOnboarding();
    }
  };

  const getTitle = (slide: OnboardingSlide) => {
    return language === 'sv' ? slide.title_sv : slide.title_en;
  };

  const getText = (slide: OnboardingSlide) => {
    return language === 'sv' ? slide.text_sv : slide.text_en;
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => {
    return (
      <YStack
        flex={1}
        width={width}
        paddingHorizontal="$6"
        paddingTop="$6"
        alignItems="center"
        justifyContent="center"
      >
        <YStack flex={2} justifyContent="center" alignItems="center" marginBottom="$6">
          {item.iconSvg ? (
            <YStack
              alignItems="center"
              justifyContent="center"
              bg="$backgroundStrong"
              padding="$8"
              borderRadius="$10"
            >
              <View
                style={{
                  width: width * 0.6,
                  height: width * 0.6
                }}
                dangerouslySetInnerHTML={{
                  __html: item.iconSvg ? item.iconSvg : ''
                }}
              />
            </YStack>
          ) : item.icon ? (
            <YStack
              alignItems="center"
              justifyContent="center"
              bg="$backgroundStrong"
              padding="$8"
              borderRadius="$10"
            >
              <FontAwesome
                name={(item.icon as any) || 'info-circle'}
                size={100}
                color={item.iconColor || theme.blue10.get()}
              />
            </YStack>
          ) : item.image ? (
            <Image
              source={item.image}
              style={{
                width: width * 0.8,
                height: width * 0.8,
                resizeMode: 'contain'
              }}
            />
          ) : (
            <YStack
              alignItems="center"
              justifyContent="center"
              bg="$backgroundStrong"
              padding="$8"
              borderRadius="$10"
            >
              <FontAwesome name="info-circle" size={100} color={theme.blue10.get()} />
            </YStack>
          )}
        </YStack>
        <YStack flex={1} alignItems="center" gap="$4">
          <Text size="3xl" weight="bold" textAlign="center" fontFamily="$heading">
            {getTitle(item)}
          </Text>
          <Text size="lg" intent="muted" textAlign="center">
            {getText(item)}
          </Text>
        </YStack>
      </YStack>
    );
  };

  const renderDots = () => {
    return (
      <XStack justifyContent="center" gap="$2" marginBottom="$4">
        {slides.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp'
          });

          const dotWidth = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [10, 20, 10],
            extrapolate: 'clamp'
          });

          return (
            <Animated.View
              key={`dot-${i}`}
              style={{
                width: dotWidth,
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.blue10.get(),
                marginHorizontal: 4,
                opacity
              }}
            />
          );
        })}
      </XStack>
    );
  };

  return (
    <Stack flex={1} bg="$background">
      <FlatList
        data={slides}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={handleScroll}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />

      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        paddingBottom="$6"
        paddingHorizontal="$6"
      >
        {renderDots()}

        <XStack justifyContent="space-between" alignItems="center" marginTop="$4">
          <Button variant="link" size="md" onPress={skipOnboarding}>
            {language === 'sv' ? 'Hoppa över' : 'Skip'}
          </Button>

          <Button variant="primary" size="md" onPress={nextSlide}>
            {currentIndex === slides.length - 1
              ? language === 'sv'
                ? 'Kom igång'
                : 'Get Started'
              : language === 'sv'
              ? 'Nästa'
              : 'Next'}
          </Button>
        </XStack>
      </YStack>
    </Stack>
  );
}

// Utility function to check if onboarding should be shown
export const shouldShowOnboarding = async (key = 'show_onboarding'): Promise<boolean> => {
  try {
    // Current version of the onboarding content
    // Increase this number whenever onboarding content changes significantly
    const CURRENT_ONBOARDING_VERSION = 1;

    // Check if user has seen onboarding at all
    const value = await AsyncStorage.getItem(key);

    // If value is null (not set yet), show onboarding
    if (value === null) {
      return true;
    }

    // Check if we have a version-based value
    if (value.startsWith('v')) {
      // Extract the version number the user has seen
      const lastSeenVersion = parseInt(value.substring(1), 10);

      // Only show onboarding if there's a newer version
      return lastSeenVersion < CURRENT_ONBOARDING_VERSION;
    }

    // For backward compatibility with older boolean-style values
    return value === 'true';
  } catch (error) {
    console.error('Error reading onboarding status:', error);
    return true; // Default to showing onboarding if there's an error
  }
};

// Utility function to mark onboarding as seen with current version
export const completeOnboardingWithVersion = async (key = 'show_onboarding'): Promise<void> => {
  try {
    // Store the current version that the user has seen
    const CURRENT_ONBOARDING_VERSION = 1;
    await AsyncStorage.setItem(key, `v${CURRENT_ONBOARDING_VERSION}`);
  } catch (error) {
    console.error('Error saving onboarding status with version:', error);
  }
};

// Utility function to reset onboarding (show it again)
export const resetOnboarding = async (key = 'show_onboarding'): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
  }
};
