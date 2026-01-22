import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { YStack, XStack, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { Header } from '../components/Header';
import { TheoryProgressService } from '../services/theoryProgressService';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemePreference } from '../hooks/useThemeOverride';
import { getTabContentPadding } from '../utils/layout';
import { logInfo, logError } from '../utils/logger';
import {
  TheorySection,
  TheorySectionCompletion,
  getLocalizedText,
} from '../types/theory';

interface RouteParams {
  moduleId: string;
  moduleTitle: string;
}

export function TheorySectionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { moduleId, moduleTitle } = route.params as RouteParams;
  const { user } = useAuth();
  const themePref = useThemePreference();
  const resolvedTheme =
    themePref && 'resolvedTheme' in themePref
      ? (themePref.resolvedTheme as string)
      : themePref?.effectiveTheme || 'light';
  const isDark = resolvedTheme === 'dark';

  const [sections, setSections] = useState<TheorySection[]>([]);
  const [completions, setCompletions] = useState<Map<string, TheorySectionCompletion>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const language: 'en' | 'sv' = 'en';

  const fetchData = useCallback(async () => {
    try {
      logInfo('TheorySectionsScreen', `Fetching sections for module ${moduleId}`);

      const sectionsData = await TheoryProgressService.getSections(moduleId);
      setSections(sectionsData);

      if (user) {
        const completionsData = await TheoryProgressService.getSectionCompletions(moduleId);
        setCompletions(completionsData);
      }

      logInfo('TheorySectionsScreen', `Loaded ${sectionsData.length} sections`);
    } catch (error) {
      logError('TheorySectionsScreen', 'Error fetching sections', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [moduleId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSectionPress = (section: TheorySection) => {
    navigation.navigate('TheoryContent' as never, {
      sectionId: section.id,
      sectionTitle: getLocalizedText(section.title, language),
      moduleId,
    } as never);
  };

  const isCompleted = (sectionId: string): boolean => {
    return completions.has(sectionId);
  };

  const getQuizScore = (sectionId: string): number | null => {
    const completion = completions.get(sectionId);
    return completion?.quiz_score ?? null;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
        <ActivityIndicator size="large" color={isDark ? '#27febe' : '#00C9A7'} />
        <Text marginTop={16} color="$gray11">Loading sections...</Text>
      </View>
    );
  }

  const completedCount = sections.filter(s => isCompleted(s.id)).length;
  const progress = sections.length > 0 ? (completedCount / sections.length) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
      <Header title={moduleTitle} showBackButton />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: getTabContentPadding(),
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Progress Summary */}
        <YStack
          backgroundColor={isDark ? '#1a1a1a' : '#fff'}
          borderRadius={16}
          padding={16}
          marginBottom={20}
          borderWidth={1}
          borderColor={isDark ? '#232323' : '#E5E5E5'}
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <Text fontSize={16} fontWeight="700">
              Module Progress
            </Text>
            <Text fontSize={14} color={isDark ? '#27febe' : '#00C9A7'} fontWeight="bold">
              {completedCount}/{sections.length}
            </Text>
          </XStack>
          <View
            style={{
              height: 8,
              backgroundColor: isDark ? '#333' : '#E5E5E5',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: isDark ? '#27febe' : '#00C9A7',
                borderRadius: 4,
              }}
            />
          </View>
        </YStack>

        {/* Sections List */}
        <Text fontSize={16} fontWeight="700" marginBottom={12}>
          Sections
        </Text>

        {sections.length === 0 ? (
          <YStack
            alignItems="center"
            justifyContent="center"
            padding={40}
            backgroundColor={isDark ? '#1a1a1a' : '#fff'}
            borderRadius={16}
          >
            <Feather name="file-text" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text marginTop={16} color="$gray11" textAlign="center">
              No sections in this module yet.
            </Text>
          </YStack>
        ) : (
          sections.map((section, index) => {
            const completed = isCompleted(section.id);
            const quizScore = getQuizScore(section.id);

            return (
              <TouchableOpacity
                key={section.id}
                onPress={() => handleSectionPress(section)}
                style={{ marginBottom: 12 }}
              >
                <Card
                  backgroundColor={isDark ? '#1a1a1a' : '#FFFFFF'}
                  borderColor={completed ? (isDark ? '#27febe' : '#00C9A7') : (isDark ? '#232323' : '#E5E5E5')}
                  borderWidth={completed ? 2 : 1}
                  padding={16}
                  borderRadius={12}
                >
                  <XStack alignItems="center" gap={12}>
                    {/* Status Icon */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: completed
                          ? (isDark ? '#27febe' : '#00C9A7')
                          : (isDark ? '#333' : '#E5E5E5'),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {completed ? (
                        <Feather name="check" size={20} color={isDark ? '#000' : '#fff'} />
                      ) : (
                        <Text fontSize={16} fontWeight="bold" color={isDark ? '#888' : '#666'}>
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    {/* Content */}
                    <YStack flex={1} gap={4}>
                      <Text fontSize={15} fontWeight="600" numberOfLines={1}>
                        {getLocalizedText(section.title, language)}
                      </Text>
                      {section.summary && (
                        <Text fontSize={13} color="$gray11" numberOfLines={2}>
                          {getLocalizedText(section.summary, language)}
                        </Text>
                      )}
                      <XStack gap={8} marginTop={4}>
                        {section.youtube_url && (
                          <XStack alignItems="center" gap={4}>
                            <Feather name="play-circle" size={12} color={isDark ? '#888' : '#666'} />
                            <Text fontSize={11} color="$gray11">Video</Text>
                          </XStack>
                        )}
                        {section.has_quiz && (
                          <XStack alignItems="center" gap={4}>
                            <Feather name="help-circle" size={12} color={isDark ? '#888' : '#666'} />
                            <Text fontSize={11} color="$gray11">
                              Quiz {quizScore !== null ? `(${Math.round(quizScore)}%)` : ''}
                            </Text>
                          </XStack>
                        )}
                      </XStack>
                    </YStack>

                    {/* Arrow */}
                    <Feather name="chevron-right" size={20} color={isDark ? '#666' : '#999'} />
                  </XStack>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export default TheorySectionsScreen;
