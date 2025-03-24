import React from 'react';
import { StyleSheet, Image, View, ImageSourcePropType, ActivityIndicator } from 'react-native';
import { YStack, XStack, Stack, useTheme, Card, Button } from 'tamagui';
import { Text } from './Text';
import { FontAwesome } from '@expo/vector-icons';
import { ContentItem, Language } from '../services/contentService';
import { getContentItemText, getTextInPreferredLanguage } from '../adapters/contentAdapter';
import { useContentItem } from '../hooks/useContentUpdates';

interface ContentDisplayProps {
  contentKey: string;
  showRefreshButton?: boolean;
  language?: string;
}

export function ContentDisplay({
  contentKey,
  showRefreshButton = false,
  language = 'en'
}: ContentDisplayProps) {
  // Use the new hook that automatically updates when content changes
  const { content, loading, error, refresh } = useContentItem<ContentItem>(contentKey);

  if (loading) {
    return (
      <Card elevate padding="$4" marginVertical="$2">
        <YStack alignItems="center" justifyContent="center" height={100}>
          <ActivityIndicator size="small" />
          <Text marginTop="$2">Loading content...</Text>
        </YStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevate padding="$4" marginVertical="$2" theme="red">
        <YStack alignItems="center" justifyContent="center">
          <Text color="$red10">Error loading content</Text>
          <Text size="xs" color="$red9">
            {error.message}
          </Text>
          {showRefreshButton && (
            <Button
              marginTop="$3"
              size="$3"
              theme="red"
              icon={<FontAwesome name="refresh" size={16} color="white" />}
              onPress={refresh}
            >
              Retry
            </Button>
          )}
        </YStack>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card elevate padding="$4" marginVertical="$2" theme="gray">
        <YStack alignItems="center" justifyContent="center">
          <Text color="$gray11">No content found</Text>
          <Text size="xs" color="$gray10">
            Content key: {contentKey}
          </Text>
          {showRefreshButton && (
            <Button
              marginTop="$3"
              size="$3"
              theme="gray"
              icon={<FontAwesome name="refresh" size={16} color="white" />}
              onPress={refresh}
            >
              Refresh
            </Button>
          )}
        </YStack>
      </Card>
    );
  }

  // Extract title and body in the preferred language
  const title = getTextInPreferredLanguage(content.title, language);
  const body = getTextInPreferredLanguage(content.body, language);

  // Apply custom styles if available
  const customStyles = content.style || {};

  return (
    <Card
      elevate
      padding="$4"
      marginVertical="$2"
      style={{
        backgroundColor: customStyles.backgroundColor || undefined
      }}
    >
      <YStack space="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            size="$6"
            fontWeight="bold"
            style={{
              color: customStyles.textColor || undefined,
              textAlign: (customStyles.textAlign as any) || 'left'
            }}
          >
            {title}
          </Text>

          {showRefreshButton && (
            <Button
              size="$2"
              circular
              icon={<FontAwesome name="refresh" size={14} color="#555" />}
              onPress={refresh}
            />
          )}
        </XStack>

        {content.image_url && (
          <View style={styles.imageContainer}>{/* Image can be rendered here if needed */}</View>
        )}

        <Text
          style={{
            color: customStyles.textColor || undefined,
            textAlign: (customStyles.textAlign as any) || 'left'
          }}
        >
          {body}
        </Text>
      </YStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    height: 150,
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover'
  },
  fullImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
    borderRadius: 8
  },
  smallImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
    borderRadius: 8
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    marginBottom: 8
  },
  compactIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5'
  }
});
