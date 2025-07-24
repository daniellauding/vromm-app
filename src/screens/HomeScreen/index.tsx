import React from 'react';
import { useState, useEffect } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { useAuth } from '../../context/AuthContext';
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

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();

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
      type: filter.type,
      activeFilter: filter,
    });
  };

  return (
    <Screen edges={[]} padding={false} hideStatusBar>
      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        forceShow={isFirstLogin}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: 72 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        <YStack f={1}>
          <HomeHeader />
          <GettingStarted />
          <ProgressSection />
          <SavedRoutes />
          <QuickFilters handleFilterPress={handleFilterPress} />

          {/* Create Route Button */}
          <Button
            onPress={() => navigation.navigate('CreateRoute', {})}
            variant="primary"
            size="lg"
          >
            {t('home.createNewRoute')}
          </Button>

          {/* City Routes - Now with dropdown and full-width cards */}
          <YStack gap="$4">
            <CityRoutes />

            <CreatedRoutes />
            <NearByRoutes />
            <DrivenRoutes />
          </YStack>

          {/* Users Section */}
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
      </ScrollView>
    </Screen>
  );
}
