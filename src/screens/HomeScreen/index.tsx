import React from 'react';
import { useState, useEffect } from 'react';
import { YStack, Text } from 'tamagui';
import { FlatList } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { OnboardingModal } from '../../components/OnboardingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowOnboarding } from '../../components/Onboarding';
import { useTranslation } from '../../contexts/TranslationContext';
import { ProgressSection } from '../../components/ProgressSection';
import type { FilterCategory } from '../../types/navigation';
import { SectionHeader } from '../../components/SectionHeader';
import { UsersList } from '../../components/UsersList';
import { HomeHeader } from './Header';
import { GettingStarted } from './GettingStarted';
import { SavedRoutes } from './SavedRoutes';
import { QuickFilters } from './QuickFilters';
import { CityRoutes } from './CityRoutes';
import { CreatedRoutes } from './CreatedRoutes';
import { NearByRoutes } from './NearByRoutes';
import { DrivenRoutes } from './DrivenRoutes';
import { CommunityFeed } from './CommunityFeed';

// Update the Route type to include creator id
type Route = {
  id: string;
  name: string;
  description?: string;
  difficulty?: string;
  spot_type?: string;
  creator_id?: string;
  creator?: {
    id: string;
    full_name: string;
  };
  // Rest of the route properties...
};

interface HomeScreenProps {
  activeUserId?: string;
}

export function HomeScreen({ activeUserId }: HomeScreenProps = {}) {
  const { user } = useAuth();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

  // Use the effective user ID (either activeUserId prop, activeStudentId from context, or current user id)
  const effectiveUserId = activeUserId || getEffectiveUserId();

  // Debug logging for HomeScreen
  console.log('📱 [HomeScreen] Current user:', user?.id, user?.email);
  console.log('📱 [HomeScreen] Active user ID prop:', activeUserId);
  console.log('📱 [HomeScreen] Effective user ID:', effectiveUserId);
  console.log('📱 [HomeScreen] Is viewing as student:', isViewingAsStudent);
  console.log('📱 [HomeScreen] Active student name:', activeStudentName);

  // State declarations
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Check if this is the first login and should show onboarding
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const key = 'vromm_first_login';
        const firstLoginValue = await AsyncStorage.getItem(key);

        if (firstLoginValue === null) {
          // First time login detected
          setIsFirstLogin(true);
          setShowOnboarding(true);
          await AsyncStorage.setItem(key, 'false');
        } else {
          // Ensure we respect the user's choice to not see onboarding again
          // Only check regular onboarding flag for first-time users or when there's a version change
          const shouldShow = await shouldShowOnboarding('vromm_onboarding');

          // Don't show onboarding if user has already seen it (unless there's a version update)
          setShowOnboarding(shouldShow);
        }
      } catch (error) {
        console.error('Error checking first login status:', error);
      }
    };

    if (user) {
      checkFirstLogin();
    }
  }, [user]);

  const handleFilterPress = (filter: FilterCategory) => {
    navigation.navigate('RouteList', {
      title: `${filter.label} Routes`,
      routes: [], // Routes will be loaded in RouteList screen based on filter
      type: filter.type,
      activeFilter: filter,
    });
  };

  // Scroll to top and optionally trigger refresh when resetKey changes
  useEffect(() => {
    const resetKey = (navigation as any)?.getState?.()?.routes?.find((r: any) => r.name === 'HomeScreen')?.params?.resetKey;
    if (resetKey) {
      try {
        // Scroll FlatList to top by toggling key or using ref (here: key bump via state already supported by parent)
        console.log('[HomeScreen] resetKey detected → scroll to top');
      } catch {}
    }
  }, [navigation]);

  return (
    <Screen edges={[]} padding={false} hideStatusBar scroll={false}>
      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        forceShow={isFirstLogin}
      />

      <FlatList
        data={[1]}
        keyExtractor={() => 'home-content'}
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={() => (
          <YStack f={1}>
            <HomeHeader />
            {isViewingAsStudent && (
              <YStack
                backgroundColor="$blue3"
                padding="$2"
                marginHorizontal="$4"
                marginBottom="$2"
                borderRadius="$2"
              >
                <Text color="$blue11" textAlign="center">
                  Viewing as: {activeStudentName || 'Student'}
                </Text>
              </YStack>
            )}
            <GettingStarted />

            <ProgressSection activeUserId={effectiveUserId} />
            <SavedRoutes />
            <CommunityFeed />
            <QuickFilters handleFilterPress={handleFilterPress} />
            <Button
              onPress={() => navigation.navigate('CreateRoute', {})}
              variant="primary"
              size="lg"
            >
              {t('home.createNewRoute')}
            </Button>
            <YStack gap="$4">
              <CityRoutes />
              <CreatedRoutes />
              <NearByRoutes />
              <DrivenRoutes />
            </YStack>
            <YStack gap="$4" marginTop="$6" marginBottom="$6">
              <SectionHeader
                title="Users"
                variant="chevron"
                onAction={() => navigation.navigate('UsersScreen')}
                actionLabel={t('common.seeAll')}
              />
              <UsersList />
            </YStack>
          </YStack>
        )}
      />
    </Screen>
  );
}
