import React, { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { useTranslation } from '../contexts/TranslationContext';
import { PricingSection } from './beta/PricingSection';
import { TodoSection } from './beta/TodoSection';
import { FeedbackSection } from './beta/FeedbackSection';

export interface BetaInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BetaInfoModal: React.FC<BetaInfoModalProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [active, setActive] = useState<'info' | 'pricing' | 'todos' | 'feedback'>('info');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0F0F0F' : '#FFFFFF' }}>
        {/* Header with Close */}
        <XStack padding="$4" alignItems="center" justifyContent="space-between">
          <Text fontSize="$6" fontWeight="700">
            {t('beta.title') || 'beta.title'}
          </Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close beta info">
            <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </XStack>

        {/* Tabs */}
        <XStack gap="$2" paddingHorizontal="$4" paddingBottom="$2">
          {(
            [
              { id: 'info', label: 'Info' },
              { id: 'pricing', label: 'Pricing' },
              { id: 'todos', label: 'Todos' },
              { id: 'feedback', label: 'Feedback' },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              size="$3"
              variant={active === tab.id ? 'outlined' : 'ghost'}
              onPress={() => setActive(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </XStack>

        {/* Content */}
        {active === 'info' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator
          >
            <YStack gap="$4">
              {/* Hero Section */}
              <Card
                padding="$5"
                bordered
                backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#F8FAFC'}
                borderColor={colorScheme === 'dark' ? '#333333' : '#E2E8F0'}
              >
                <YStack gap="$3">
                  <Text fontSize="$7" fontWeight="700" color="#69e3c4">
                    {t('beta.hero.title') || 'beta.hero.title'}
                  </Text>
                  <Text fontSize="$4" color={colorScheme === 'dark' ? '#D1D5DB' : '#475569'} lineHeight={22}>
                    {t('beta.hero.subtitle') || 'beta.hero.subtitle'}
                  </Text>
                </YStack>
              </Card>

              {/* Video Section */}
              <Card
                padding="$4"
                bordered
                backgroundColor={colorScheme === 'dark' ? '#0F0F0F' : '#FFFFFF'}
                borderColor={colorScheme === 'dark' ? '#333333' : '#E2E8F0'}
              >
                <YStack gap="$2">
                  <Text fontSize="$5" fontWeight="600">
                    {t('beta.video.title') || 'beta.video.title'}
                  </Text>
                  <Text color={colorScheme === 'dark' ? '#D1D5DB' : '#64748B'} lineHeight={20}>
                    {t('beta.video.description') || 'beta.video.description'}
                  </Text>
                </YStack>
              </Card>

              {/* Download Section */}
              <Card
                padding="$4"
                bordered
                backgroundColor={colorScheme === 'dark' ? '#0F0F0F' : '#FFFFFF'}
                borderColor={colorScheme === 'dark' ? '#333333' : '#E2E8F0'}
              >
                <YStack gap="$3">
                  <Text fontSize="$5" fontWeight="600">
                    {t('beta.download.title') || 'beta.download.title'}
                  </Text>
                  <YStack gap="$3">
                    <TouchableOpacity
                      onPress={() => {
                        console.log('Opening iOS TestFlight link');
                      }}
                      style={{ padding: 12, backgroundColor: colorScheme === 'dark' ? '#1E3A8A' : '#3B82F6', borderRadius: 8 }}
                    >
                      <Text color="white" fontWeight="600" textAlign="center">
                        iOS TestFlight: https://testflight.apple.com/join/jq9znnrw
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        console.log('Opening Android Play Store link');
                      }}
                      style={{ padding: 12, backgroundColor: colorScheme === 'dark' ? '#15803D' : '#22C55E', borderRadius: 8 }}
                    >
                      <Text color="white" fontWeight="600" textAlign="center">
                        Android Internal Test: https://play.google.com/apps/internaltest/4700291677340932601
                      </Text>
                    </TouchableOpacity>
                  </YStack>
                </YStack>
              </Card>

              {/* Roles Section */}
              <Card padding="$4" bordered backgroundColor={colorScheme === 'dark' ? '#0F0F0F' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#333333' : '#E2E8F0'}>
                <YStack gap="$2">
                  <Text fontSize="$5" fontWeight="600">
                    {t('beta.roles.title') || 'beta.roles.title'}
                  </Text>
                  <Text color={colorScheme === 'dark' ? '#D1D5DB' : '#64748B'} lineHeight={20}>
                    {t('beta.roles.description') || 'beta.roles.description'}
                  </Text>
                </YStack>
              </Card>

              {/* Feedback Section */}
              <Card padding="$4" bordered backgroundColor={colorScheme === 'dark' ? '#0F0F0F' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#333333' : '#E2E8F0'}>
                <YStack gap="$2">
                  <Text fontSize="$5" fontWeight="600">
                    {t('beta.feedback.title') || 'beta.feedback.title'}
                  </Text>
                  <Text color={colorScheme === 'dark' ? '#D1D5DB' : '#64748B'} lineHeight={20}>
                    {t('beta.feedback.description') || 'beta.feedback.description'}
                  </Text>
                </YStack>
              </Card>
            </YStack>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {active === 'pricing' && <PricingSection />}
            {active === 'todos' && <TodoSection />}
            {active === 'feedback' && <FeedbackSection />}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default BetaInfoModal; 