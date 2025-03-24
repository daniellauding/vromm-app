import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { YStack, Text } from 'tamagui';
import { ContentDisplay } from './ContentDisplay';
import {
  ContentItem as ContentItemType,
  Language,
  Platform,
  fetchContentByKey
} from '../services/contentService';
import { useLanguage } from '../context/LanguageContext';

interface ContentItemDisplayProps {
  contentKey: string;
  platform?: Platform;
  variant?: 'card' | 'full' | 'compact';
  onPress?: (item: ContentItemType) => void;
}

export function ContentItemDisplay({
  contentKey,
  platform = 'mobile',
  variant = 'full',
  onPress
}: ContentItemDisplayProps) {
  const { language } = useLanguage();
  const [contentItem, setContentItem] = useState<ContentItemType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch content item by key
        const item = await fetchContentByKey(contentKey, platform);

        if (!item) {
          setError(`Content with key '${contentKey}' not found`);
        } else {
          setContentItem(item);
        }
      } catch (err) {
        console.error(`Error loading content with key '${contentKey}':`, err);
        setError('Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [contentKey, platform]);

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

  if (!contentItem) {
    return (
      <YStack padding="$4" alignItems="center" justifyContent="center">
        <Text intent="muted">Content not available</Text>
      </YStack>
    );
  }

  return (
    <ContentDisplay
      contentItem={contentItem}
      language={language as Language}
      variant={variant}
      onPress={() => onPress && onPress(contentItem)}
    />
  );
}
