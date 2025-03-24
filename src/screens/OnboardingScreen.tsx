import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Onboarding, OnboardingSlide, shouldShowOnboarding } from '../components/Onboarding';
import { fetchOnboardingSlides, shouldShowFirstOnboarding } from '../services/onboardingService';
import { Stack } from 'tamagui';
import { useTheme } from 'tamagui';

export function OnboardingScreen() {
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  useEffect(() => {
    const checkAndLoadOnboarding = async () => {
      try {
        setLoading(true);

        // Check if onboarding should be shown at all
        const shouldShow = await shouldShowFirstOnboarding();
        console.log('Should show onboarding screen?', shouldShow);

        if (!shouldShow) {
          // Skip directly to main app if onboarding has been completed
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }]
          });
          return;
        }

        // Otherwise load slides and show onboarding
        const onboardingSlides = await fetchOnboardingSlides();
        setSlides(onboardingSlides);
      } catch (error) {
        console.error('Error handling onboarding flow:', error);
        // On error, navigate to main app to avoid blocking the user
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      } finally {
        setLoading(false);
      }
    };

    checkAndLoadOnboarding();
  }, [navigation]);

  const handleDone = () => {
    // Navigate to the main application after onboarding
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }]
    });
  };

  const handleSkip = () => {
    // Same as done, but could have different analytics tracking
    handleDone();
  };

  if (loading) {
    return (
      <Stack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <ActivityIndicator size="large" color={theme.blue10.get()} />
      </Stack>
    );
  }

  return (
    <Onboarding
      slides={slides}
      onDone={handleDone}
      onSkip={handleSkip}
      showAgainKey="vromm_onboarding"
    />
  );
}
