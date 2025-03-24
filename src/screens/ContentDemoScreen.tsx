import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Stack, YStack, Button, Text, XStack } from 'tamagui';
import { ContentList } from '../components/ContentList';
import { ContentItemDisplay } from '../components/ContentItem';
import { MarketingBanner, FeaturedMarketingItem } from '../components/MarketingBanner';
import { ContentOnboardingModal } from '../components/ContentOnboardingModal';
import { clearContentCache } from '../services/contentService';
import { useLanguage } from '../context/LanguageContext';
import { StatusBar } from 'expo-status-bar';

export function ContentDemoScreen() {
  const { language, toggleLanguage } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // Used to force refresh

  // Handle clearing the cache
  const handleClearCache = async () => {
    try {
      await clearContentCache();
      // Force refresh of all content components
      setReloadKey(prev => prev + 1);
      alert('Content cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <StatusBar style="auto" />

      <XStack padding="$4" justifyContent="space-between" alignItems="center">
        <Text size="2xl" weight="bold">
          Content Demo
        </Text>
        <Button size="$3" onPress={toggleLanguage} variant="outlined">
          {language === 'en' ? 'Switch to SV' : 'Switch to EN'}
        </Button>
      </XStack>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        key={`content-list-${reloadKey}`}
      >
        <YStack gap="$6">
          {/* Marketing banner */}
          <YStack>
            <Text size="xl" weight="bold" paddingHorizontal="$4" paddingBottom="$2">
              Marketing Banner
            </Text>
            <MarketingBanner
              title="Featured Content"
              onItemPress={item => alert(`Pressed: ${item.key}`)}
            />
          </YStack>

          {/* Single content item display */}
          <YStack padding="$4">
            <Text size="xl" weight="bold" paddingBottom="$2">
              Single Content Item (welcome)
            </Text>
            <ContentItemDisplay
              contentKey="welcome"
              variant="full"
              onPress={item => alert(`Pressed: ${item.title[language]}`)}
            />
          </YStack>

          {/* Onboarding items as cards */}
          <YStack>
            <Text size="xl" weight="bold" paddingHorizontal="$4" paddingBottom="$2">
              Onboarding Content (as cards)
            </Text>
            <ContentList
              contentType="onboarding"
              language={language as any}
              variant="card"
              showTitle={false}
            />
          </YStack>

          {/* Featured marketing item */}
          <YStack padding="$4">
            <Text size="xl" weight="bold" paddingBottom="$2">
              Featured Item (specific key)
            </Text>
            <FeaturedMarketingItem
              marketingKey="premium_features"
              onPress={item => alert(`Pressed featured item: ${item.key}`)}
            />
          </YStack>

          {/* Compact list of all content */}
          <YStack>
            <Text size="xl" weight="bold" paddingHorizontal="$4" paddingBottom="$2">
              All Content (compact)
            </Text>
            <ContentList
              contentType="onboarding" // Could be any content type
              language={language as any}
              variant="compact"
              showTitle={false}
            />
          </YStack>

          {/* Buttons for testing */}
          <YStack padding="$4" gap="$2">
            <Button onPress={() => setShowOnboarding(true)}>Show Onboarding Modal</Button>

            <Button theme="red" onPress={handleClearCache}>
              Clear Content Cache
            </Button>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Onboarding modal */}
      <ContentOnboardingModal visible={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </YStack>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },
  contentContainer: {
    paddingBottom: 40
  }
});
