import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Image } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { ContentItem as ContentItemType } from '../services/contentService';
import { useTranslation } from '../contexts/TranslationContext';
import { tokens } from '../tokens';
import { supabase } from '../lib/supabase';

interface ContentItemProps {
  item: ContentItemType;
  onPress?: (item: ContentItemType) => void;
  variant?: 'list' | 'card' | 'feature';
  size?: 'sm' | 'md' | 'lg';
  imagePreview?: boolean;
}

export function ContentItem({
  item,
  onPress,
  variant = 'list',
  size = 'md',
  imagePreview = false,
}: ContentItemProps) {
  const { language } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.image_path && imagePreview) {
      loadImage();
    }
  }, [item.image_path, imagePreview]);

  const loadImage = async () => {
    try {
      if (!item.image_path) return;

      const { data } = supabase.storage.from('content').getPublicUrl(item.image_path);

      if (data?.publicUrl) {
        setImageUrl(data.publicUrl);
      }
    } catch (error) {
      console.error('Error loading image:', error);
    }
  };

  // Default fallback icon
  const defaultIcon = 'info-circle';

  // Parse the icon field
  const getIconName = (): string => {
    if (!item.icon) return defaultIcon;
    return item.icon as string;
  };

  const renderIcon = () => {
    const iconName = getIconName();
    const iconSize = size === 'sm' ? 18 : size === 'md' ? 22 : 28;

    return (
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: tokens.color.blue4,
            borderRadius: tokens.radius.md,
            padding: tokens.space.xs,
          },
        ]}
      >
        <Feather name={iconName as any} size={iconSize} color={tokens.color.blue10} />
      </View>
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  const renderImage = () => {
    if (!imagePreview || !imageUrl) return null;

    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          size === 'sm' ? styles.imageSm : size === 'md' ? styles.imageMd : styles.imageLg,
        ]}
        resizeMode="cover"
      />
    );
  };

  if (variant === 'card') {
    return (
      <Pressable
        onPress={handlePress}
        style={[
          styles.cardContainer,
          size === 'sm' ? styles.cardSm : size === 'md' ? styles.cardMd : styles.cardLg,
        ]}
      >
        <YStack space="$2">
          {renderImage()}
          <YStack padding="$3" space="$1">
            <Text
              weight="medium"
              size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'}
              numberOfLines={2}
            >
              {item.title?.[language] || item.title?.en || 'Untitled'}
            </Text>
            {item.description?.[language] || item.description?.en ? (
              <Text size={size === 'sm' ? 'xs' : 'sm'} color="$gray11" numberOfLines={2}>
                {item.description?.[language] || item.description?.en}
              </Text>
            ) : null}
          </YStack>
        </YStack>
      </Pressable>
    );
  }

  if (variant === 'feature') {
    return (
      <Pressable onPress={handlePress} style={styles.featureContainer}>
        <XStack space="$3" alignItems="center">
          {renderIcon()}
          <YStack space="$1" flex={1}>
            <Text weight="medium" size="lg" numberOfLines={1}>
              {item.title?.[language] || item.title?.en || 'Untitled'}
            </Text>
            {item.description?.[language] || item.description?.en ? (
              <Text size="sm" color="$gray11" numberOfLines={2}>
                {item.description?.[language] || item.description?.en}
              </Text>
            ) : null}
          </YStack>
          <Feather name="chevron-right" size={20} color={tokens.color.gray9} />
        </XStack>
      </Pressable>
    );
  }

  // Default list variant
  return (
    <Pressable onPress={handlePress} style={styles.listContainer}>
      <XStack space="$3" alignItems="center">
        {item.icon && renderIcon()}
        <YStack space="$1" flex={1}>
          <Text
            weight="medium"
            size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'}
            numberOfLines={1}
          >
            {item.title?.[language] || item.title?.en || 'Untitled'}
          </Text>
          {item.description?.[language] || item.description?.en ? (
            <Text
              size={size === 'sm' ? 'xs' : 'sm'}
              color="$gray11"
              numberOfLines={size === 'lg' ? 2 : 1}
            >
              {item.description?.[language] || item.description?.en}
            </Text>
          ) : null}
        </YStack>
        <Feather name="chevron-right" size={20} color={tokens.color.gray9} />
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.gray4,
  },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.gray4,
    overflow: 'hidden',
    marginRight: 12,
  },
  cardSm: {
    width: 180,
  },
  cardMd: {
    width: 250,
  },
  cardLg: {
    width: 300,
  },
  featureContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.color.gray4,
    marginBottom: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    backgroundColor: tokens.color.gray3,
  },
  imageSm: {
    height: 100,
  },
  imageMd: {
    height: 140,
  },
  imageLg: {
    height: 180,
  },
});
