import React, { useState, useEffect } from 'react';
import { FlatList, ActivityIndicator, View, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { ContentDisplay } from './ContentDisplay';
import {
  ContentItem,
  ContentType,
  Language,
  Platform,
  fetchContentByType,
} from '../services/contentService';

interface ContentListProps {
  contentType: ContentType;
  platform?: Platform;
  language?: Language;
  variant?: 'card' | 'compact';
  horizontal?: boolean;
  showTitle?: boolean;
  title?: string;
  onItemPress?: (item: ContentItem) => void;
  filter?: (item: ContentItem) => boolean;
  limit?: number;
}

export function ContentList({
  contentType,
  platform = 'mobile',
  language = 'en',
  variant = 'card',
  horizontal = false,
  showTitle = true,
  title,
  onItemPress,
  filter,
  limit,
}: ContentListProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch content items
        const items = await fetchContentByType(contentType, platform);

        // Apply filter if provided
        let filtered = filter ? items.filter(filter) : items;

        // Apply limit if provided
        if (limit && limit > 0 && filtered.length > limit) {
          filtered = filtered.slice(0, limit);
        }

        setContent(filtered);
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [contentType, platform, filter, limit]);

  if (loading) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center">
        <ActivityIndicator size="large" />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center">
        <Text color="$red10">{error}</Text>
      </YStack>
    );
  }

  if (content.length === 0) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center">
        <Text intent="muted">No content available</Text>
      </YStack>
    );
  }

  // Define title to show
  const displayTitle =
    title ||
    (contentType === 'marketing'
      ? 'Marketing'
      : contentType === 'onboarding'
        ? 'Onboarding'
        : 'Content');

  return (
    <YStack>
      {showTitle && (
        <XStack paddingHorizontal="$4" paddingVertical="$2" justifyContent="space-between">
          <Text size="xl" weight="bold">
            {displayTitle}
          </Text>
        </XStack>
      )}

      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        horizontal={horizontal}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={horizontal ? styles.horizontalContainer : styles.verticalContainer}
        renderItem={({ item }) => (
          <View style={horizontal ? styles.horizontalItem : styles.verticalItem}>
            <ContentDisplay
              contentItem={item}
              language={language}
              variant={variant}
              onPress={() => onItemPress && onItemPress(item)}
            />
          </View>
        )}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  verticalContainer: {
    padding: 16,
  },
  horizontalItem: {
    width: 280,
    marginRight: 16,
  },
  verticalItem: {
    marginBottom: 16,
  },
});
