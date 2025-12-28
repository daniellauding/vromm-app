import React from 'react';
import { View, TouchableOpacity, Dimensions, Linking, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { ProgressCircle } from './ProgressCircle';

// Interfaces for the component props
interface LearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  youtube_url?: string;
  order_index: number;
  active: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at: string;
  updated_at: string;
}

interface PathExercise {
  id: string;
  learning_path_id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  order_index: number;
  youtube_url?: string;
  icon?: string;
  image?: string;
  embed_code?: string;
  created_at?: string;
  updated_at?: string;
  language_specific_media?: boolean;
  is_locked?: boolean;
  lock_password?: string | null;
  bypass_order?: boolean;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  repeat_count?: number;
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;
  has_quiz?: boolean;
  quiz_required?: boolean;
  quiz_pass_score?: number;
  steps?: any[];
}

interface ExerciseHeaderProps {
  // Core data
  title: { en: string; sv: string } | string;
  description?: { en: string; sv: string } | string;
  language: 'en' | 'sv';
  
  // Progress data
  showProgress?: boolean;
  progressPercent?: number;
  exercises?: PathExercise[];
  completedIds?: string[];
  
  // Media content
  image?: string;
  youtube_url?: string;
  embed_code?: string;
  
  // State indicators
  isPasswordLocked?: boolean;
  isAvailable?: boolean;
  
  // Icon customization
  icon?: string;
  showLockIcon?: boolean;
  showHourglassIcon?: boolean;
  
  // Layout options
  centerAlign?: boolean;
  showMediaSection?: boolean;
  showDescriptionSection?: boolean;
  
  // Custom render functions (for media)
  renderCustomMedia?: () => React.ReactNode;
}

export function ExerciseHeader({
  title,
  description,
  language,
  showProgress = false,
  progressPercent,
  exercises = [],
  completedIds = [],
  image,
  youtube_url,
  embed_code,
  isPasswordLocked = false,
  isAvailable = true,
  icon,
  showLockIcon = true,
  showHourglassIcon = true,
  centerAlign = true,
  showMediaSection = true,
  showDescriptionSection = true,
  renderCustomMedia,
}: ExerciseHeaderProps) {
  
  // Helper to get translated title
  const getTitle = (): string => {
    if (typeof title === 'string') return title;
    return title[language] || title.en || '';
  };
  
  // Helper to get translated description
  const getDescription = (): string => {
    if (!description) return '';
    if (typeof description === 'string') return description;
    return description[language] || description.en || '';
  };

  // Calculate actual progress percentage
  const getProgressPercent = (): number => {
    if (progressPercent !== undefined) return progressPercent;
    if (exercises.length === 0) return 0;
    return completedIds.filter((id) => exercises.some((ex) => ex.id === id)).length / exercises.length;
  };

  // YouTube helper functions
  const getYouTubeVideoId = (url: string | undefined): string | null => {
    if (!url) return null;

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[7] && match[7].length === 11) {
      return match[7];
    }

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

  const YouTubeEmbed = ({ videoId }: { videoId: string }) => {
    const screenWidth = Dimensions.get('window').width;
    const videoWidth = screenWidth - 48;
    const videoHeight = videoWidth * 0.5625; // 16:9 aspect ratio

    return (
      <View
        style={{
          width: videoWidth,
          height: videoHeight,
          marginVertical: 12,
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

  // Media rendering
  const renderMedia = () => {
    if (renderCustomMedia) {
      return renderCustomMedia();
    }

    return (
      <YStack gap={16}>
        {/* YouTube Video */}
        {youtube_url && (
          <YStack>
            {(() => {
              const videoId = getYouTubeVideoId(youtube_url);
              return videoId ? (
                <YouTubeEmbed videoId={videoId} />
              ) : (
                <TouchableOpacity
                  onPress={() => youtube_url && Linking.openURL(youtube_url)}
                  style={{ padding: 8, backgroundColor: '#FF0000', borderRadius: 8 }}
                >
                  <Text color="white">Watch on YouTube</Text>
                </TouchableOpacity>
              );
            })()}
          </YStack>
        )}

        {/* Image */}
        {image && (
          <YStack>
            <Image
              source={{ uri: image }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 8,
                resizeMode: 'cover',
              }}
            />
          </YStack>
        )}
      </YStack>
    );
  };

  const actualProgressPercent = getProgressPercent();
  const isComplete = actualProgressPercent === 1;

  return (
    <YStack alignItems={centerAlign ? "center" : "flex-start"} gap={12} marginBottom={16}>
      {/* Progress Circle */}
      {showProgress && exercises.length > 0 && (
        <XStack justifyContent="center" alignItems="center" marginTop={8} marginBottom={16}>
          <View style={{ position: 'relative' }}>
            <ProgressCircle
              percent={actualProgressPercent}
              size={90}
              color="#27febe"
              bg="#333"
            />
            <Text
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 90,
                height: 90,
                textAlign: 'center',
                textAlignVertical: 'center',
                lineHeight: 90,
              }}
              fontSize="$4"
              color={isComplete ? '#27febe' : '$gray10'}
              fontWeight="bold"
            >
              {Math.round(actualProgressPercent * 100)}%
            </Text>
            {isComplete && (
              <View
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#27febe',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="check" size={18} color="#000" />
              </View>
            )}
          </View>
        </XStack>
      )}

      {/* Title and Icon */}
      <XStack alignItems="center" gap={8}>
        <Text
          fontSize={28}
          fontWeight="900"
          fontStyle="italic"
          color="$color"
          textAlign={centerAlign ? "center" : "left"}
        >
          {getTitle()}
        </Text>
      </XStack>

      {/* Status Icons */}
      {showLockIcon && isPasswordLocked ? (
        <MaterialIcons name="lock" size={24} color="#FF9500" />
      ) : showHourglassIcon && !isAvailable ? (
        <MaterialIcons name="hourglass-empty" size={24} color="#FF9500" />
      ) : null}

      {/* Media Section */}
      {showMediaSection && (image || youtube_url || embed_code) && (
        <YStack marginTop="$4">{renderMedia()}</YStack>
      )}

      {/* Description */}
      {showDescriptionSection && getDescription() && (
        <Text color="$gray11" marginBottom={16} textAlign={centerAlign ? "center" : "left"} fontSize={16}>
          {getDescription()}
        </Text>
      )}
    </YStack>
  );
}