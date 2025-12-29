import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { YStack, Text } from 'tamagui';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/contexts/TranslationContext';

interface WelcomeTextProps {
  scrollY: Animated.Value;
}

export const WelcomeText: React.FC<WelcomeTextProps> = ({ scrollY }) => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  
  // Animation value for fading out the welcome text
  const welcomeOpacity = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (!scrollY) return;
    
    const listener = scrollY.addListener(({ value }) => {
      // Fade out welcome text as user scrolls
      const opacity = Math.max(0, 1 - (value / 100));
      welcomeOpacity.setValue(opacity);
    });
    
    return () => {
      try {
        scrollY.removeListener(listener);
      } catch (error) {
        // Ignore if listener already removed
      }
    };
  }, [scrollY, welcomeOpacity]);
  
  return (
    <Animated.View style={{ opacity: welcomeOpacity }}>
      <YStack paddingHorizontal="$4" marginTop="$2" marginBottom="$4">
        <Text 
          fontSize="$6" 
          fontWeight="800" 
          fontStyle="italic" 
          color="$color"
          numberOfLines={5}
        >
          {profile?.full_name &&
          !profile.full_name.includes('@') &&
          profile.full_name !== 'Unknown' &&
          !profile.full_name.startsWith('user_')
            ? t('home.welcomeWithName').replace('{name}', profile.full_name)
            : t('home.welcome')}
        </Text>
      </YStack>
    </Animated.View>
  );
};