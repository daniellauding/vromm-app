import { useTranslation } from '@/src/contexts/TranslationContext';
import { FeaturedExercise, FeaturedLearningPath } from './types';
import { YStack, Text } from 'tamagui';
import { TouchableOpacity, Image, View, Dimensions, Linking } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { FeaturedCardSize, getFeaturedCardSizeConfig } from './variants';

const { width: screenWidth } = Dimensions.get('window');

// Parse YouTube URL to extract video ID and start time
const parseYouTubeUrl = (url: string | undefined): { videoId: string | null; startTime: number | undefined } => {
  if (!url) return { videoId: null, startTime: undefined };

  let videoId: string | null = null;
  let startTime: number | undefined = undefined;

  // Try standard regex first
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[7] && match[7].length === 11) {
    videoId = match[7];
  }

  // Try alternative extraction methods and extract start time
  try {
    const urlObj = new URL(url);

    if (!videoId) {
      const vParam = urlObj.searchParams.get('v');
      if (vParam && vParam.length === 11) videoId = vParam;
    }

    if (!videoId) {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.length === 11) videoId = lastPart;
      }
    }

    // Extract start time from URL parameters
    const tParam = urlObj.searchParams.get('t');
    const startParam = urlObj.searchParams.get('start');

    if (tParam) {
      const timeStr = tParam.replace(/s$/, '');
      if (/^\d+$/.test(timeStr)) {
        startTime = parseInt(timeStr, 10);
      } else {
        let seconds = 0;
        const hourMatch = timeStr.match(/(\d+)h/);
        const minMatch = timeStr.match(/(\d+)m/);
        const secMatch = timeStr.match(/(\d+)(?:s|$)/);
        if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600;
        if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
        if (secMatch && !timeStr.includes('m') && !timeStr.includes('h')) {
          seconds = parseInt(secMatch[1], 10);
        } else if (secMatch) {
          seconds += parseInt(secMatch[1], 10);
        }
        startTime = seconds > 0 ? seconds : undefined;
      }
    } else if (startParam) {
      startTime = parseInt(startParam, 10);
    }
  } catch (e) {
    // URL parsing failed
  }

  return { videoId, startTime };
};

// Legacy function for backwards compatibility
const getYouTubeVideoId = (url: string | undefined): string | null => {
  return parseYouTubeUrl(url).videoId;
};

const YouTubeEmbed = ({
  videoId,
  width,
  aspectRatio,
  startTime,
}: {
  videoId: string;
  width?: number;
  aspectRatio?: number;
  startTime?: number;
}) => {
  const videoWidth = width || screenWidth - 48;
  const videoHeight = aspectRatio ? videoWidth / aspectRatio : videoWidth * 0.5625; // Default 16:9, or custom

  return (
    <View
      style={{
        width: videoWidth,
        height: videoHeight,
        marginVertical: 8,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <YoutubePlayer
        height={videoHeight}
        videoId={videoId}
        play={false}
        initialPlayerParams={startTime ? { start: startTime } : undefined}
        webViewProps={{
          androidLayerType: 'hardware',
        }}
      />
    </View>
  );
};

export const FeaturedMedia = ({
  item,
  size = 'medium',
  cardWidth,
  aspectRatio,
}: {
  item: FeaturedLearningPath | FeaturedExercise;
  size?: FeaturedCardSize;
  cardWidth?: number;
  aspectRatio?: number;
}) => {
  const { t } = useTranslation();
  const hasMedia = item.image || item.youtube_url;
  if (!hasMedia) return null;

  // Use provided cardWidth or calculate from size config
  const sizeConfig = getFeaturedCardSizeConfig(size);
  const effectiveCardWidth = cardWidth || sizeConfig.cardWidth;
  const paddingValue = size === 'large' ? 40 : size === 'medium' ? 32 : size === 'small' ? 24 : 16;
  const cardContentWidth = effectiveCardWidth - paddingValue; // Account for card padding
  const mediaAspectRatio = aspectRatio || sizeConfig.mediaAspectRatio || 0.5625; // Default 16:9

  return (
    <YStack gap={8} marginTop={8} marginBottom={8}>
      {/* YouTube Video */}
      {item.youtube_url &&
        (() => {
          const { videoId, startTime } = parseYouTubeUrl(item.youtube_url);
          return videoId ? (
            <YouTubeEmbed videoId={videoId} width={cardContentWidth} aspectRatio={mediaAspectRatio} startTime={startTime} />
          ) : (
            <TouchableOpacity
              onPress={() => item.youtube_url && Linking.openURL(item.youtube_url)}
              style={{
                padding: 12,
                backgroundColor: '#FF0000',
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text color="white" fontWeight="600">
                {t('common.watchOnYouTube') || 'Watch on YouTube'}
              </Text>
            </TouchableOpacity>
          );
        })()}

      {/* Image */}
      {item.image && !item.youtube_url && (
        <Image
          source={{ uri: item.image }}
          style={{
            width: cardContentWidth,
            height: cardContentWidth / mediaAspectRatio,
            borderRadius: 8,
            resizeMode: 'cover',
          }}
        />
      )}
    </YStack>
  );
};
