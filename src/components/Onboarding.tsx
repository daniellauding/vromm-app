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
  ImageSourcePropType,
  Platform
} from 'react-native';
import { YStack, XStack, useTheme, Stack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../contexts/TranslationContext';
import WebView from 'react-native-webview';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export interface OnboardingSlide {
  id: string;
  title_en: string;
  title_sv: string;
  text_en: string;
  text_sv: string;
  image?: ImageSourcePropType;
  image_url?: string;
  icon?: string;
  iconColor?: string;
  iconSvg?: string;
  youtube_embed?: string;
  iframe_embed?: string;
  media_type?: 'image' | 'video' | 'embed';
  media_enabled?: boolean;
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
  const { language, t } = useTranslation();
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

  const renderMedia = (item: OnboardingSlide) => {
    console.log('Rendering media for slide:', {
      id: item.id,
      media_enabled: item.media_enabled,
      image_url: item.image_url,
      has_image: !!item.image,
      has_icon_svg: !!item.iconSvg,
      has_youtube: !!item.youtube_embed,
      has_iframe: !!item.iframe_embed,
      media_type: item.media_type,
      youtube_embed: item.youtube_embed // Log the actual YouTube embed content
    });

    if (!item.media_enabled) {
      console.log('Media disabled for slide:', item.id);
      return null;
    }

    const mediaElements = [];

    // Add image if available (in a separate container to ensure it's visible)
    if (item.image_url || item.image) {
      console.log('Adding image for slide:', {
        id: item.id,
        image_url: item.image_url,
        has_local_image: !!item.image
      });
      mediaElements.push(
        <YStack
          key="image-container"
          alignItems="center"
          justifyContent="center"
          width={width * 0.8}
          height={width * 0.8}
          marginBottom="$4"
        >
          <Image
            key="image"
            source={item.image_url ? { uri: item.image_url } : item.image!}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain'
            }}
            onError={error => console.error('Image loading error:', error.nativeEvent)}
            onLoad={() => console.log('Image loaded successfully')}
          />
        </YStack>
      );
    }

    // Add YouTube embed if available
    if (item.youtube_embed) {
      console.log('Adding YouTube for slide:', item.id);
      // Clean up and extract video ID
      let videoId = '';
      const embedContent = item.youtube_embed;

      // Try to extract from iframe src if it's an iframe
      const iframeSrcMatch = embedContent.match(/src=["'].*?youtube.com\/embed\/([^"'?]+)/);
      if (iframeSrcMatch) {
        videoId = iframeSrcMatch[1];
      } else {
        // Try to extract from regular YouTube URL
        const urlMatch = embedContent.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/
        );
        if (urlMatch) {
          videoId = urlMatch[1];
        }
      }

      console.log('Extracted video ID:', videoId);

      if (videoId) {
        const embedHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  background-color: black;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                }
                .video-container { 
                  position: relative;
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  border-radius: 10px;
                }
                iframe { 
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  border: none;
                }
              </style>
            </head>
            <body>
              <div class="video-container">
                <iframe
                  src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&autoplay=0"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>
            </body>
          </html>
        `;

        mediaElements.push(
          <YStack
            key="youtube"
            alignItems="center"
            justifyContent="center"
            bg="$backgroundStrong"
            padding="$4"
            borderRadius="$10"
            width={width * 0.8}
            height={width * 0.45}
            marginVertical="$4"
            overflow="hidden"
          >
            <WebView
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 10,
                backgroundColor: 'black'
              }}
              source={{ html: embedHtml }}
              allowsFullscreenVideo
              javaScriptEnabled
              scrollEnabled={false}
              bounces={false}
              mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
              onError={syntheticEvent => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error:', nativeEvent);
              }}
              onHttpError={syntheticEvent => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error:', nativeEvent);
              }}
              onLoadEnd={() => console.log('WebView loaded')}
              onMessage={event => console.log('WebView message:', event.nativeEvent.data)}
            />
          </YStack>
        );
      }
    }

    // Add SVG icon if available
    if (item.iconSvg) {
      console.log('Adding SVG for slide:', item.id);
      mediaElements.push(
        <YStack
          key="svg"
          alignItems="center"
          justifyContent="center"
          bg="$backgroundStrong"
          padding="$8"
          borderRadius="$10"
          marginVertical="$4"
          width={width * 0.6}
          height={width * 0.6}
        >
          <SvgXml xml={item.iconSvg} width="100%" height="100%" />
        </YStack>
      );
    }

    // Return all media elements in a scrollable container
    return mediaElements.length > 0 ? (
      <YStack gap="$4" alignItems="center" justifyContent="center">
        {mediaElements}
      </YStack>
    ) : null;
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
          {renderMedia(item)}
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
                backgroundColor: '$color',
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
            {t('onboarding.skip')}
          </Button>

          <Button variant="primary" size="md" onPress={nextSlide}>
            {currentIndex === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
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
