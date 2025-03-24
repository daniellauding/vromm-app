import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { YStack, Stack } from 'tamagui';
import { ContentList } from './ContentList';
import { ContentItem } from '../services/contentService';
import { useLanguage } from '../context/LanguageContext';

interface MarketingBannerProps {
  filter?: (item: ContentItem) => boolean;
  limit?: number;
  onItemPress?: (item: ContentItem) => void;
  title?: string;
  showTitle?: boolean;
}

export function MarketingBanner({
  filter,
  limit = 5,
  onItemPress,
  title = 'Featured',
  showTitle = true
}: MarketingBannerProps) {
  const { language } = useLanguage();

  return (
    <YStack>
      <ContentList
        contentType="marketing"
        language={language as any}
        horizontal={true}
        variant="card"
        showTitle={showTitle}
        title={title}
        filter={filter}
        limit={limit}
        onItemPress={onItemPress}
      />
    </YStack>
  );
}

// Single marketing item display for featured spots
export function FeaturedMarketingItem({
  marketingKey,
  onPress
}: {
  marketingKey: string;
  onPress?: (item: ContentItem) => void;
}) {
  const { language } = useLanguage();

  // Apply filter to only show the item with the specified key
  const keyFilter = (item: ContentItem) => item.key === marketingKey;

  return (
    <Stack padding="$2">
      <ContentList
        contentType="marketing"
        language={language as any}
        variant="card"
        showTitle={false}
        filter={keyFilter}
        limit={1}
        onItemPress={onPress}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8
  }
});
