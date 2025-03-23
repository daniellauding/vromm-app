import { YStack, XStack, useTheme } from 'tamagui';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Linking, TouchableOpacity } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';

export function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, language, setLanguage } = useLanguage();
  const theme = useTheme();
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [resetKey, setResetKey] = useState(0);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Reset animation when screen comes into focus, but not when changing language
  useFocusEffect(
    useCallback(() => {
      if (!isChangingLanguage) {
        // Reset content opacity
        contentOpacity.setValue(0);
        // Reset logo animation by changing the key
        setResetKey(prev => prev + 1);
      }
      return () => {
        // Cleanup
        setIsChangingLanguage(false);
      };
    }, [isChangingLanguage])
  );

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleLogoAnimationComplete = () => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://www.vromm.se');
  };

  const handleOpenSurvey = (type: 'driver' | 'school') => {
    const surveyUrl =
      language === 'sv'
        ? type === 'driver'
          ? 'https://daniellauding.typeform.com/to/j4YPu7TC'
          : 'https://daniellauding.typeform.com/to/RT1zq9Fc'
        : type === 'driver'
        ? 'https://daniellauding.typeform.com/to/Uqt9t40t'
        : 'https://daniellauding.typeform.com/to/nuABX2Qp';

    Linking.openURL(surveyUrl);
  };

  const toggleLanguage = async () => {
    setIsChangingLanguage(true);
    await setLanguage(language === 'en' ? 'sv' : 'en');
  };

  const handleOpenSocialMedia = (platform: 'facebook' | 'instagram' | 'linkedin' | 'mail') => {
    let url = '';
    switch (platform) {
      case 'facebook':
        url = 'https://www.facebook.com/profile.php?id=61573717712930';
        break;
      case 'instagram':
        url = 'https://www.instagram.com/getvromm/';
        break;
      case 'linkedin':
        url = 'https://www.linkedin.com/company/105927247/admin/dashboard/';
        break;
      case 'mail':
        url = 'mailto:info@vromm.se';
        break;
    }
    Linking.openURL(url);
  };

  return (
    <Screen>
      {/* Language Toggle - Shows only the non-active language to toggle to */}
      <XStack position="absolute" top="$4" right="$4" zIndex={100}>
        <TouchableOpacity onPress={toggleLanguage}>
          <Text size="md" weight="bold" color="$blue10">
            {language === 'sv' ? 'EN' : 'SV'}
          </Text>
        </TouchableOpacity>
      </XStack>

      <YStack f={1} justifyContent="center" alignItems="center" gap={32} paddingHorizontal="$4">
        <AnimatedLogo
          key={isChangingLanguage ? 'logo-persist' : `logo-${resetKey}`}
          size={200}
          onAnimationComplete={handleLogoAnimationComplete}
        />

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <YStack gap={12} alignItems="center">
            <Text size="3xl" weight="bold" textAlign="center" fontFamily="$heading">
              {t('auth.signIn.title')}
            </Text>
            <Text size="md" intent="muted" textAlign="center">
              {t('auth.signIn.slogan')}
            </Text>
          </YStack>

          <YStack gap={16} width="100%" paddingHorizontal="$4" marginTop="$4">
            <Button variant="primary" size="lg" onPress={handleLogin}>
              {t('auth.signIn.signInButton')}
            </Button>

            <Button variant="secondary" size="lg" onPress={handleSignup}>
              {t('auth.signUp.signUpButton')}
            </Button>

            {/* Website Link Button */}
            <Button variant="secondary" size="md" onPress={handleOpenWebsite}>
              {t('auth.signIn.readMore')}
            </Button>

            {/* Survey Section */}
            <YStack gap={8} marginTop="$4">
              <Text size="sm" intent="muted" textAlign="center">
                {t('auth.signIn.helpImprove')}
              </Text>
              <XStack gap={8} justifyContent="center">
                <Button variant="link" size="sm" onPress={() => handleOpenSurvey('driver')}>
                  {t('auth.signIn.forLearners')}
                </Button>
                <Button variant="link" size="sm" onPress={() => handleOpenSurvey('school')}>
                  {t('auth.signIn.forSchools')}
                </Button>
              </XStack>
            </YStack>

            {/* Social Media Links */}
            <YStack marginTop="$4" alignItems="center">
              <XStack gap={24} justifyContent="center" marginTop="$2">
                <TouchableOpacity onPress={() => handleOpenSocialMedia('facebook')}>
                  <FontAwesome name="facebook-square" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleOpenSocialMedia('instagram')}>
                  <FontAwesome name="instagram" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleOpenSocialMedia('linkedin')}>
                  <FontAwesome name="linkedin-square" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleOpenSocialMedia('mail')}>
                  <FontAwesome name="envelope" size={28} color="white" />
                </TouchableOpacity>
              </XStack>
            </YStack>
          </YStack>
        </Animated.View>
      </YStack>
    </Screen>
  );
}
