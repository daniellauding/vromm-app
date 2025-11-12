import { useTranslation } from '@/src/contexts/TranslationContext';
import { FeaturedExercise, FeaturedLearningPath } from './types';
import { YStack, Text } from 'tamagui';
import { TouchableOpacity, Image, View, Dimensions, Linking } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.7;

const getYouTubeVideoId = (url: string | undefined): string | null => {
  if (!url) return null;

  // Try standard regex first
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);

  if (match && match[7] && match[7].length === 11) {
    return match[7];
  }

  // Try alternative extraction methods
  try {
    const urlObj = new URL(url);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) return vParam;

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.length === 11) return lastPart;
    }
  } catch (e) {
    // URL parsing failed
  }

  return null;
};

const YouTubeEmbed = ({ videoId, width }: { videoId: string; width?: number }) => {
  const videoWidth = width || screenWidth - 48;
  const videoHeight = videoWidth * 0.5625; // 16:9 aspect ratio

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
        webViewProps={{
          androidLayerType: 'hardware',
        }}
      />
    </View>
  );
};

export const FeaturedMedia = ({ item }: { item: FeaturedLearningPath | FeaturedExercise }) => {
  const { t } = useTranslation();
  const hasMedia = item.image || item.youtube_url;
  if (!hasMedia) return null;

  const cardContentWidth = cardWidth - 32; // Account for card padding

  return (
    <YStack gap={8} marginTop={8} marginBottom={8}>
      {/* YouTube Video */}
      {item.youtube_url &&
        (() => {
          const videoId = getYouTubeVideoId(item.youtube_url);
          return videoId ? (
            <YouTubeEmbed videoId={videoId} width={cardContentWidth} />
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
            height: cardContentWidth * 0.5625,
            borderRadius: 8,
            resizeMode: 'cover',
          }}
        />
      )}
    </YStack>
  );
};
