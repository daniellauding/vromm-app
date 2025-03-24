import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, H1, Paragraph, XStack, YStack, Text } from 'tamagui';
import { useTranslation } from '../contexts/TranslationContext';
import { useT } from '../hooks/useT';

export const TranslationDemoScreen = () => {
  const { language, setLanguage, isLoading, clearCache } = useTranslation();
  const t = useT();

  return (
    <ScrollView style={styles.container}>
      <YStack space="$4" padding="$4">
        <H1>Translation Demo</H1>

        <Card bordered padding="$4">
          <YStack space="$2">
            <Paragraph>Current Language: {language}</Paragraph>
            <Paragraph>Loading: {isLoading ? 'Yes' : 'No'}</Paragraph>
          </YStack>

          <XStack space="$2" marginTop="$4">
            <Button theme={language === 'en' ? 'active' : 'gray'} onPress={() => setLanguage('en')}>
              English
            </Button>
            <Button theme={language === 'sv' ? 'active' : 'gray'} onPress={() => setLanguage('sv')}>
              Swedish
            </Button>
          </XStack>

          <Button marginTop="$4" onPress={clearCache} theme="red">
            Clear Cache
          </Button>
        </Card>

        <Card bordered padding="$4">
          <YStack space="$2">
            <H1>Authentication</H1>
            <View style={styles.translationRow}>
              <Text style={styles.key}>auth.welcome:</Text>
              <Text style={styles.value}>{t('auth.welcome')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>auth.login:</Text>
              <Text style={styles.value}>{t('auth.login')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>auth.signup:</Text>
              <Text style={styles.value}>{t('auth.signup')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>auth.email:</Text>
              <Text style={styles.value}>{t('auth.email')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>auth.password:</Text>
              <Text style={styles.value}>{t('auth.password')}</Text>
            </View>
          </YStack>
        </Card>

        <Card bordered padding="$4">
          <YStack space="$2">
            <H1>Navigation</H1>
            <View style={styles.translationRow}>
              <Text style={styles.key}>nav.map:</Text>
              <Text style={styles.value}>{t('nav.map')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>nav.routes:</Text>
              <Text style={styles.value}>{t('nav.routes')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>nav.profile:</Text>
              <Text style={styles.value}>{t('nav.profile')}</Text>
            </View>
            <View style={styles.translationRow}>
              <Text style={styles.key}>nav.routes.discovery:</Text>
              <Text style={styles.value}>{t('nav.routes.discovery')}</Text>
            </View>
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  translationRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  key: {
    flex: 0.4,
    fontWeight: 'bold'
  },
  value: {
    flex: 0.6
  }
});
