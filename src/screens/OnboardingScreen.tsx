import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Onboarding, OnboardingSlide } from '../components/Onboarding';
import { fetchOnboardingSlides } from '../services/onboardingService';
import { Stack } from 'tamagui';
import { useTheme } from 'tamagui';

export function OnboardingScreen() {
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const onboardingSlides = await fetchOnboardingSlides();
        setSlides(onboardingSlides);
      } catch (error) {
        console.error('Error loading onboarding slides:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSlides();
  }, []);

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
