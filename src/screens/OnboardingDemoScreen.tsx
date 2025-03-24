import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { YStack, Button, XStack, Card } from 'tamagui';
import { Text } from '../components/Text';
import { ContentOnboardingModal } from '../components/ContentOnboardingModal';
import { clearContentCache, ContentType } from '../services/contentService';
import { FontAwesome } from '@expo/vector-icons';
import { useContentByType } from '../hooks/useContentUpdates';
import { ContentItem } from '../services/contentService';
import { getTextInPreferredLanguage } from '../adapters/contentAdapter';

export function OnboardingDemoScreen() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [language, setLanguage] = useState<'en' | 'sv'>('en');

  // Use the hook to automatically stay in sync with backend changes
  const { content, loading, error, refresh } = useContentByType(ContentType.ONBOARDING);

  const handleClearCache = async () => {
    await clearContentCache();
    refresh();
    alert('Content cache cleared!');
  };

  const toggleOnboarding = () => {
    setShowOnboarding(!showOnboarding);
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'sv' : 'en'));
  };

  return (
    <ScrollView style={styles.container}>
      <YStack space="$4" padding="$4">
        <Card padding="$4" bordered>
          <YStack space="$4">
            <Text size="$8" textAlign="center" fontWeight="bold">
              Onboarding Demo
            </Text>
            <Text textAlign="center">
              This screen demonstrates real-time updates to onboarding content. When content changes
              in the Supabase admin, the app will automatically update.
            </Text>

            <XStack space="$2" justifyContent="center">
              <Button
                size="$4"
                theme="blue"
                icon={<FontAwesome name="eye" size={16} color="white" />}
                onPress={toggleOnboarding}
              >
                {showOnboarding ? 'Hide Onboarding' : 'Show Onboarding'}
              </Button>

              <Button
                size="$4"
                theme="green"
                icon={<FontAwesome name="refresh" size={16} color="white" />}
                onPress={refresh}
              >
                Refresh
              </Button>
            </XStack>

            <XStack space="$2" justifyContent="center">
              <Button
                size="$3"
                theme="gray"
                icon={<FontAwesome name="trash" size={14} color="white" />}
                onPress={handleClearCache}
              >
                Clear Cache
              </Button>

              <Button
                size="$3"
                theme="gray"
                icon={<FontAwesome name="language" size={14} color="white" />}
                onPress={toggleLanguage}
              >
                {language === 'en' ? 'English' : 'Swedish'}
              </Button>
            </XStack>
          </YStack>
        </Card>

        <Card padding="$4" bordered>
          <YStack space="$2">
            <Text size="$6" fontWeight="bold">
              Current Onboarding Content
            </Text>
            <Text size="$3" color="$gray11">
              {loading
                ? 'Loading...'
                : error
                ? `Error: ${error.message}`
                : `${content?.length || 0} slides found`}
            </Text>
          </YStack>
        </Card>

        {!loading && content && content.length > 0 && (
          <YStack space="$2">
            {content.map((item: ContentItem, index) => (
              <Card key={item.id} padding="$4" marginVertical="$1" bordered>
                <YStack space="$2">
                  <XStack justifyContent="space-between">
                    <Text size="$5" fontWeight="bold">
                      {getTextInPreferredLanguage(item.title, language) || 'Untitled'}
                    </Text>
                    <Text size="$3" color="$gray11">
                      #{index + 1}
                    </Text>
                  </XStack>

                  <Text>{getTextInPreferredLanguage(item.body, language) || 'No content'}</Text>

                  <Text size="$2" color="$gray10">
                    Key: {item.key} | Last updated: {new Date(item.updated_at).toLocaleString()}
                  </Text>
                </YStack>
              </Card>
            ))}
          </YStack>
        )}

        {/* Show a message when no content is found */}
        {!loading && (!content || content.length === 0) && (
          <Card padding="$4" theme="yellow">
            <YStack alignItems="center" space="$2">
              <Text>No onboarding slides found</Text>
              <Button
                size="$3"
                theme="yellow"
                icon={<FontAwesome name="refresh" size={14} color="black" />}
                onPress={refresh}
              >
                Refresh
              </Button>
            </YStack>
          </Card>
        )}
      </YStack>

      {/* Onboarding Modal */}
      <ContentOnboardingModal visible={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});
