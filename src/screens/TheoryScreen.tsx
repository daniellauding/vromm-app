import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Text } from '../components/Text';
import { Header } from '../components/Header';
import { TheoryModuleCard } from '../components/TheoryModuleCard';
import { TheoryProgressService } from '../services/theoryProgressService';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemePreference } from '../hooks/useThemeOverride';
import { getTabContentPadding } from '../utils/layout';
import { logInfo, logError } from '../utils/logger';
import {
  TheoryModule,
  TheoryModuleProgress,
  getLocalizedText,
} from '../types/theory';

export function TheoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const themePref = useThemePreference();
  const resolvedTheme =
    themePref && 'resolvedTheme' in themePref
      ? (themePref.resolvedTheme as string)
      : themePref?.effectiveTheme || 'light';
  const isDark = resolvedTheme === 'dark';

  const [modules, setModules] = useState<TheoryModule[]>([]);
  const [moduleProgress, setModuleProgress] = useState<Map<string, TheoryModuleProgress>>(new Map());
  const [sectionCounts, setSectionCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalModulesCompleted: 0,
    totalSectionsCompleted: 0,
    averageQuizScore: null as number | null,
  });

  // Language preference (could come from context)
  const language: 'en' | 'sv' = 'en';

  const fetchData = useCallback(async () => {
    try {
      logInfo('TheoryScreen', 'Fetching theory data');

      // Fetch modules
      const modulesData = await TheoryProgressService.getModules();
      setModules(modulesData);

      // Fetch section counts for each module
      const counts = new Map<string, number>();
      for (const module of modulesData) {
        const sections = await TheoryProgressService.getSections(module.id);
        counts.set(module.id, sections.length);
      }
      setSectionCounts(counts);

      // Fetch user progress
      if (user) {
        const progress = await TheoryProgressService.getAllModuleProgress();
        setModuleProgress(progress);

        const userStats = await TheoryProgressService.getUserTheoryStats();
        setStats({
          totalModulesCompleted: userStats.totalModulesCompleted,
          totalSectionsCompleted: userStats.totalSectionsCompleted,
          averageQuizScore: userStats.averageQuizScore,
        });
      }

      logInfo('TheoryScreen', `Loaded ${modulesData.length} modules`);
    } catch (error) {
      logError('TheoryScreen', 'Error fetching theory data', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleModulePress = (module: TheoryModule) => {
    // Navigate to module sections screen
    navigation.navigate('TheorySections' as never, { moduleId: module.id, moduleTitle: getLocalizedText(module.title, language) } as never);
  };

  const getModuleProgress = (moduleId: string): number => {
    const progress = moduleProgress.get(moduleId);
    if (!progress || progress.total_sections === 0) return 0;
    return progress.sections_completed / progress.total_sections;
  };

  const getCompletedSections = (moduleId: string): number => {
    const progress = moduleProgress.get(moduleId);
    return progress?.sections_completed || 0;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
        <ActivityIndicator size="large" color={isDark ? '#27febe' : '#00C9A7'} />
        <Text marginTop={16} color="$gray11">Loading theory content...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f5f5f5' }}>
      <Header title="Theory" showBackButton={false} />

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
        {/* Stats Section */}
        {user && (
          <YStack
            backgroundColor={isDark ? '#1a1a1a' : '#fff'}
            borderRadius={16}
            padding={16}
            marginBottom={20}
            borderWidth={1}
            borderColor={isDark ? '#232323' : '#E5E5E5'}
          >
            <Text fontSize={16} fontWeight="700" marginBottom={12}>
              Your Progress
            </Text>
            <XStack justifyContent="space-around">
              <YStack alignItems="center">
                <Text fontSize={24} fontWeight="bold" color={isDark ? '#27febe' : '#00C9A7'}>
                  {stats.totalModulesCompleted}
                </Text>
                <Text fontSize={12} color="$gray11">
                  Modules Done
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text fontSize={24} fontWeight="bold" color={isDark ? '#27febe' : '#00C9A7'}>
                  {stats.totalSectionsCompleted}
                </Text>
                <Text fontSize={12} color="$gray11">
                  Sections
                </Text>
              </YStack>
              <YStack alignItems="center">
                <Text fontSize={24} fontWeight="bold" color={isDark ? '#27febe' : '#00C9A7'}>
                  {stats.averageQuizScore ? `${Math.round(stats.averageQuizScore)}%` : '-'}
                </Text>
                <Text fontSize={12} color="$gray11">
                  Avg Score
                </Text>
              </YStack>
            </XStack>
          </YStack>
        )}

        {/* Modules List */}
        <Text fontSize={16} fontWeight="700" marginBottom={12}>
          Theory Modules
        </Text>

        {modules.length === 0 ? (
          <YStack
            alignItems="center"
            justifyContent="center"
            padding={40}
            backgroundColor={isDark ? '#1a1a1a' : '#fff'}
            borderRadius={16}
          >
            <Feather name="book" size={48} color={isDark ? '#666' : '#ccc'} />
            <Text marginTop={16} color="$gray11" textAlign="center">
              No theory modules available yet.
            </Text>
          </YStack>
        ) : (
          modules.map((module, index) => (
            <TheoryModuleCard
              key={module.id}
              module={module}
              progress={getModuleProgress(module.id)}
              sectionsCompleted={getCompletedSections(module.id)}
              totalSections={sectionCounts.get(module.id) || 0}
              language={language}
              onPress={() => handleModulePress(module)}
              index={index}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default TheoryScreen;
