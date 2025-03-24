import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, YStack, Button, Text, XStack, Switch } from 'tamagui';
import { ContentList } from '../components/ContentList';
import { ContentItemDisplay } from '../components/ContentItem';
import { MarketingBanner, FeaturedMarketingItem } from '../components/MarketingBanner';
import { ContentOnboardingModal } from '../components/ContentOnboardingModal';
import { clearContentCache } from '../services/contentService';
import { useTranslation } from '../contexts/TranslationContext';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { Feather } from '@expo/vector-icons';
import { useSupabaseTranslations } from '../hooks/useSupabaseTranslations';

export function ContentDemoScreen() {
  const { language, setLanguage } = useTranslation();
  const { translations, refresh, isLoading } = useSupabaseTranslations();
  const [refreshing, setRefreshing] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // Used to force refresh

  const handleChangeLanguage = async () => {
    await setLanguage(language === 'en' ? 'sv' : 'en');
  };

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await refresh();
      Alert.alert('Success', 'Translations refreshed successfully');
    } catch (error) {
      console.error('Error refreshing translations:', error);
      Alert.alert('Error', 'Failed to refresh translations');
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const getTranslationCount = () => {
    return Object.keys(translations || {}).length;
  };

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
    <Screen scroll={false}>
      <YStack f={1}>
        <Header
          title="Translation Demo"
          subtitle="Test live updates for translations"
          rightElement={
            <Button
              size="$3"
              chromeless
              circular
              icon={<Feather name="refresh-cw" size={20} color="$color" />}
              onPress={handleRefresh}
              disabled={refreshing}
            />
          }
        />
        <YStack f={1} px="$4" py="$4" space="$4" borderTopWidth={1} borderColor="$borderColor">
          {/* Language Selector */}
          <YStack backgroundColor="$backgroundHover" px="$4" py="$4" borderRadius="$4" space="$4">
            <XStack alignItems="center" justifyContent="space-between">
              <Text>Current Language</Text>
              <Button onPress={handleChangeLanguage} size="$3">
                {language === 'en' ? 'Switch to Swedish' : 'Switch to English'}
              </Button>
            </XStack>
            <XStack space="$4">
              <Stack
                backgroundColor={language === 'en' ? '$blue5' : 'transparent'}
                px="$2"
                py="$1"
                borderRadius="$2"
                borderWidth={1}
                borderColor={language === 'en' ? '$blue8' : '$borderColor'}
              >
                <Text color={language === 'en' ? '$blue11' : '$color'}>English</Text>
              </Stack>
              <Stack
                backgroundColor={language === 'sv' ? '$blue5' : 'transparent'}
                px="$2"
                py="$1"
                borderRadius="$2"
                borderWidth={1}
                borderColor={language === 'sv' ? '$blue8' : '$borderColor'}
              >
                <Text color={language === 'sv' ? '$blue11' : '$color'}>Swedish</Text>
              </Stack>
            </XStack>
          </YStack>

          {/* Translation Stats */}
          <YStack backgroundColor="$backgroundHover" px="$4" py="$4" borderRadius="$4">
            <Text weight="medium" mb="$2">
              Translation Stats
            </Text>
            {isLoading || refreshing ? (
              <ActivityIndicator size="small" />
            ) : (
              <XStack space="$4">
                <Text>Total translations: {getTranslationCount()}</Text>
              </XStack>
            )}
          </YStack>

          {/* Raw Data Toggle */}
          <XStack
            backgroundColor="$backgroundHover"
            px="$4"
            py="$4"
            borderRadius="$4"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text>Show Raw Translation Data</Text>
            <Switch size="$3" checked={showRawData} onCheckedChange={setShowRawData}>
              <Switch.Thumb />
            </Switch>
          </XStack>

          {/* Raw Translation Data */}
          {showRawData && (
            <YStack
              f={1}
              backgroundColor="$backgroundHover"
              px="$4"
              py="$4"
              borderRadius="$4"
              space="$2"
            >
              <Text weight="medium" mb="$2">
                Raw Translation Data
              </Text>
              <ScrollView style={{ flex: 1 }}>
                {Object.entries(translations || {}).map(([key, value]) => (
                  <YStack key={key} mb="$2" space="$1">
                    <Text weight="medium">{key}</Text>
                    <Text>{value}</Text>
                  </YStack>
                ))}
              </ScrollView>
            </YStack>
          )}
        </YStack>
      </YStack>
    </Screen>
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
