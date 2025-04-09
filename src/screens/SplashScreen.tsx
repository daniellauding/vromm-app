import { YStack, XStack, useTheme, Heading } from 'tamagui';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useTranslation } from '../contexts/TranslationContext';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Linking,
  TouchableOpacity,
  StyleSheet,
  View,
  StatusBar,
  Platform,
  Dimensions,
  Modal
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Define styles outside of the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    height: '100%'
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.75
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%'
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 60
  },
  middleSection: {
    alignItems: 'center',
    width: '100%'
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 20
  },
  surveyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    width: '100%'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#1c4240',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 20
  }
});

export function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, language, setLanguage, clearCache } = useTranslation();
  const theme = useTheme();
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const videoRef = useRef<Video>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');

  // Hide status bar for this screen
  useEffect(() => {
    StatusBar.setHidden(true);
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  // Play video when component mounts
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  // Force clear translation cache when the screen loads
  useEffect(() => {
    clearCache(); // Force refresh translations on splash screen
  }, []);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleLogoAnimationComplete = () => {
    // When logo animation finishes, fade in the content
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
    setSurveyModalVisible(false);
  };

  const toggleLanguage = async () => {
    setIsChangingLanguage(true);
    await setLanguage(language === 'en' ? 'sv' : 'en');
    setIsChangingLanguage(false);
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
    <View style={styles.container}>
      {/* Background Video with Overlay */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={require('../../assets/bg_video.mp4')}
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
        <View
          style={[
            styles.overlay,
            { backgroundColor: theme.splashVideoOverlay?.get() || '#397770' }
          ]}
        />
      </View>

      {/* Content */}
      <View style={[styles.content, { minHeight: screenHeight }]}>
        {/* Language Toggle - Shows only the non-active language to toggle to */}
        <XStack position="absolute" top={insets.top || 40} right="$4" zIndex={100}>
          <TouchableOpacity onPress={toggleLanguage}>
            <Text size="md" weight="bold" color="white">
              {language === 'sv' ? 'EN' : 'SV'}
            </Text>
          </TouchableOpacity>
        </XStack>

        {/* Top Section - Logo */}
        <View style={styles.topSection}>
          <AnimatedLogo size={180} onAnimationComplete={handleLogoAnimationComplete} />
        </View>

        {/* Middle Section - Title, Slogan, Buttons */}
        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <View style={styles.middleSection}>
            <YStack gap={12} alignItems="center">
              <Heading style={{ fontWeight: '800', fontStyle: 'italic', textAlign: 'center' }}>
                {t('auth.signIn.title')}
              </Heading>
              <Text size="md" color="white" textAlign="center">
                {t('auth.signIn.slogan')}
              </Text>
            </YStack>

            <YStack gap={16} width="100%" paddingHorizontal="$4" marginTop="$4">
              <Button variant="primary" size="lg" onPress={handleSignup}>
                {t('auth.signUp.signUpButton')}
              </Button>

              <Button variant="secondary" size="lg" onPress={handleLogin}>
                {t('auth.signIn.signInButton')}
              </Button>

              {/* Website Link Button */}
              <Button variant="link" onPress={handleOpenWebsite}>
                {t('auth.signIn.readMore')}
              </Button>
            </YStack>
          </View>
        </Animated.View>

        {/* Bottom Section - Survey Box and Social Media */}
        <Animated.View style={{ opacity: contentOpacity, width: '100%' }}>
          <View style={styles.bottomSection}>
            {/* Survey Section as clickable area */}
            <TouchableOpacity
              style={styles.surveyButton}
              onPress={() => setSurveyModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text size="sm" color="white" textAlign="center">
                {t('auth.signIn.helpImprove')}
              </Text>
              <Text size="sm" color="#00FFBC" textAlign="center" marginTop={6}>
                {t('auth.signIn.helpImprove.cta.text')}
              </Text>
            </TouchableOpacity>

            {/* Social Media Links */}
            <XStack
              gap={24}
              justifyContent="center"
              marginTop="$4"
              paddingBottom={insets.bottom || 20}
            >
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
          </View>
        </Animated.View>
      </View>

      {/* Survey Modal */}
      <Modal
        visible={surveyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSurveyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <YStack gap="$4">
              <Heading textAlign="center" size="$5" color="white">
                {t('auth.signIn.helpImprove.drawer.title')}
              </Heading>

              <Text textAlign="center" color="white">
                {t('auth.signIn.helpImprove.drawer.text')}
              </Text>

              <Button size="lg" marginTop="$2" onPress={() => handleOpenSurvey('driver')}>
                {t('auth.signIn.forLearners')}
              </Button>

              <Button variant="secondary" size="lg" onPress={() => handleOpenSurvey('school')}>
                {t('auth.signIn.forSchools')}
              </Button>

              <Button variant="link" onPress={() => setSurveyModalVisible(false)} marginTop="$2">
                {language === 'en' ? 'Close' : 'Stäng'}
              </Button>
            </YStack>
          </View>
        </View>
      </Modal>
    </View>
  );
}
