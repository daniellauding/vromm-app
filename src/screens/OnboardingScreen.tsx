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
  const [error, setError] = useState<boolean>(false);
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  // Safe navigation function to prevent crashes
  const safeNavigateToMain = () => {
    try {
      console.log('Safely navigating to MainTabs');
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }]
        });
      } else {
        console.error('Navigation object is undefined in OnboardingScreen');
      }
    } catch (navError) {
      console.error('Error navigating to MainTabs:', navError);
    }
  };

  useEffect(() => {
    const checkAndLoadOnboarding = async () => {
      try {
        setLoading(true);
        setError(false);

        // Check if onboarding should be shown at all
        let shouldShow = false;
        try {
          shouldShow = await shouldShowFirstOnboarding();
          console.log('Should show onboarding screen?', shouldShow);
        } catch (checkError) {
          console.error('Error checking if onboarding should be shown:', checkError);
          shouldShow = false;
        }

        if (!shouldShow) {
          // Skip directly to main app if onboarding has been completed
          safeNavigateToMain();
          return;
        }

        // Otherwise load slides and show onboarding
        let onboardingSlides: OnboardingSlide[] = [];
        try {
          onboardingSlides = await fetchOnboardingSlides();
        } catch (fetchError) {
          console.error('Error fetching onboarding slides:', fetchError);
          setError(true);
          safeNavigateToMain();
          return;
        }

        // Check if we have valid slides
        if (!onboardingSlides || onboardingSlides.length === 0) {
          console.warn('No onboarding slides available, skipping to main app');
          safeNavigateToMain();
          return;
        }

        setSlides(onboardingSlides);
      } catch (error) {
        console.error('Error handling onboarding flow:', error);
        setError(true);
        // On error, navigate to main app to avoid blocking the user
        safeNavigateToMain();
      } finally {
        setLoading(false);
      }
    };

    checkAndLoadOnboarding();
  }, [navigation]);

  const handleDone = () => {
    // Navigate to the main application after onboarding
    safeNavigateToMain();
  };

  const handleSkip = () => {
    // Same as done, but could have different analytics tracking
    safeNavigateToMain();
  };

  if (error) {
    return (
      <Stack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Stack alignItems="center" gap="$4">
          <ActivityIndicator size="large" color={theme.blue10.get()} />
        </Stack>
      </Stack>
    );
  }

  if (loading) {
    return (
      <Stack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <ActivityIndicator size="large" color={theme.blue10.get()} />
      </Stack>
    );
  }

  // Make sure we have slides before rendering onboarding
  if (!slides || slides.length === 0) {
    safeNavigateToMain();
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
