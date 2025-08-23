import React, { useState, useCallback } from 'react';
import { Alert, Image, View } from 'react-native';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { FormField } from '../FormField';
import { WizardRouteData } from '../RouteCreationWizard';
import * as mediaUtils from '../../utils/mediaUtils';

interface MediaStepProps {
  data: WizardRouteData;
  onUpdate: (updates: Partial<WizardRouteData>) => void;
}

export function MediaStep({ data, onUpdate }: MediaStepProps) {
  const { t } = useTranslation();
  const [youtubeLink, setYoutubeLink] = useState('');

  const handleAddMedia = useCallback(async (type: 'camera' | 'photo' | 'video' | 'library') => {
    try {
      let newMedia: mediaUtils.MediaItem[] | mediaUtils.MediaItem | null = null;

      switch (type) {
        case 'camera':
          newMedia = await mediaUtils.takePhoto();
          break;
        case 'photo':
          newMedia = await mediaUtils.pickMediaFromLibrary(false);
          break;
        case 'video':
          newMedia = await mediaUtils.pickVideoFromLibrary(false);
          break;
        case 'library':
          newMedia = await mediaUtils.pickMediaFromLibrary(true);
          break;
      }

      if (newMedia) {
        const mediaArray = Array.isArray(newMedia) ? newMedia : [newMedia];
        const formattedMedia = mediaArray.map(item => ({
          id: Date.now().toString() + Math.random(),
          type: item.type,
          uri: item.uri,
          description: item.description,
        }));

        onUpdate({
          media: [...data.media, ...formattedMedia],
        });
      }
    } catch (error) {
      console.error('Error adding media:', error);
      Alert.alert('Error', 'Failed to add media. Please try again.');
    }
  }, [data.media, onUpdate]);

  const handleRemoveMedia = useCallback((index: number) => {
    const newMedia = data.media.filter((_, i) => i !== index);
    onUpdate({ media: newMedia });
  }, [data.media, onUpdate]);

  const handleAddYouTube = useCallback(() => {
    if (!youtubeLink.trim()) return;

    const youtubeMedia = mediaUtils.createYoutubeMediaItem(youtubeLink);
    if (!youtubeMedia) {
      Alert.alert('Error', 'Invalid YouTube link. Please check the URL and try again.');
      return;
    }

    onUpdate({
      media: [...data.media, {
        id: Date.now().toString(),
        type: 'youtube',
        uri: youtubeLink,
        description: '',
      }],
    });
    setYoutubeLink('');
  }, [youtubeLink, data.media, onUpdate]);

  return (
    <YStack flex={1} padding="$4" gap="$6">
      {/* Header */}
      <YStack gap="$2">
        <Text size="lg" fontWeight="600" color="$color">
          Add photos and videos
        </Text>
        <Text size="sm" color="$gray11">
          Visual content helps others understand your route better (optional)
        </Text>
      </YStack>

      {/* Media Options */}
      <YStack gap="$4">
        <Text size="md" fontWeight="500" color="$color">
          Add Media
        </Text>
        
        <XStack gap="$2" flexWrap="wrap">
          <Button
            flex={1}
            onPress={() => handleAddMedia('camera')}
            variant="secondary"
            size="md"
            backgroundColor="$green5"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="camera" size={18} color="$green11" />
              <Text color="$green11" fontSize="$3">Take Photo</Text>
            </XStack>
          </Button>
          
          <Button
            flex={1}
            onPress={() => handleAddMedia('photo')}
            variant="secondary"
            size="md"
            backgroundColor="$blue5"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="image" size={18} color="$blue11" />
              <Text color="$blue11" fontSize="$3">Choose Photo</Text>
            </XStack>
          </Button>
        </XStack>

        <XStack gap="$2" flexWrap="wrap">
          <Button
            flex={1}
            onPress={() => handleAddMedia('video')}
            variant="secondary"
            size="md"
            backgroundColor="$purple5"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="video" size={18} color="$purple11" />
              <Text color="$purple11" fontSize="$3">Choose Video</Text>
            </XStack>
          </Button>
          
          <Button
            flex={1}
            onPress={() => handleAddMedia('library')}
            variant="secondary"
            size="md"
            backgroundColor="$orange5"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="folder" size={18} color="$orange11" />
              <Text color="$orange11" fontSize="$3">From Library</Text>
            </XStack>
          </Button>
        </XStack>
      </YStack>

      {/* YouTube Link */}
      <YStack gap="$3">
        <Text size="md" fontWeight="500" color="$color">
          Add YouTube Video
        </Text>
        <XStack gap="$2">
          <FormField
            flex={1}
            value={youtubeLink}
            onChangeText={setYoutubeLink}
            placeholder="Paste YouTube URL here..."
            autoCapitalize="none"
            keyboardType="url"
          />
          <Button
            onPress={handleAddYouTube}
            disabled={!youtubeLink.trim()}
            variant="secondary"
            backgroundColor="$red5"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="youtube" size={18} color="$red11" />
              <Text color="$red11">Add</Text>
            </XStack>
          </Button>
        </XStack>
      </YStack>

      {/* Media Preview */}
      {data.media.length > 0 && (
        <YStack gap="$3">
          <Text size="md" fontWeight="500" color="$color">
            Added Media ({data.media.length})
          </Text>
          
          <YStack gap="$2" maxHeight={300} overflow="scroll">
            {data.media.map((item, index) => (
              <Card key={item.id} bordered padding="$3">
                <XStack gap="$3" alignItems="center">
                  {/* Media Preview */}
                  {item.type === 'image' ? (
                    <Image
                      source={{ uri: item.uri }}
                      style={{ width: 60, height: 60, borderRadius: 8 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        backgroundColor: item.type === 'youtube' ? '#FF0000' : '#000',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather
                        name={item.type === 'youtube' ? 'youtube' : 'video'}
                        size={24}
                        color="white"
                      />
                    </View>
                  )}
                  
                  {/* Media Info */}
                  <YStack flex={1} gap="$1">
                    <Text fontWeight="500" color="$color">
                      {item.type === 'youtube' ? 'YouTube Video' : 
                       item.type === 'video' ? 'Video' : 'Photo'}
                    </Text>
                    <Text size="xs" color="$gray11" numberOfLines={1}>
                      {item.type === 'youtube' ? item.uri : item.uri.split('/').pop()}
                    </Text>
                  </YStack>
                  
                  {/* Remove Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => handleRemoveMedia(index)}
                    backgroundColor="$red5"
                  >
                    <Feather name="trash-2" size={16} color="$red10" />
                  </Button>
                </XStack>
              </Card>
            ))}
          </YStack>
        </YStack>
      )}

      {/* Tips */}
      {data.media.length === 0 && (
        <YStack gap="$2" backgroundColor="$gray2" padding="$3" borderRadius="$2">
          <Text size="sm" fontWeight="500" color="$gray11">
            💡 Media Tips
          </Text>
          <YStack gap="$1">
            <Text size="xs" color="$gray10">
              • Add photos showing key landmarks or tricky spots
            </Text>
            <Text size="xs" color="$gray10">
              • Include videos demonstrating proper technique
            </Text>
            <Text size="xs" color="$gray10">
              • YouTube videos can provide detailed explanations
            </Text>
            <Text size="xs" color="$gray10">
              • This step is optional - you can skip if you prefer
            </Text>
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}
