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
  Modal,
  Easing,
  Pressable
} from 'react-native';
import { Flag, HelpCircle, Check, GraduationCap, School } from '@tamagui/lucide-icons';
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
    zIndex: -1,
    backgroundColor: '#fff'
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    position: 'relative'
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 20
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4
  },
  languageMenu: {
    backgroundColor: '$background',
    borderRadius: 12,
    padding: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  surveyOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8
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
  const videoAnimation = useRef(new Animated.Value(0)).current;
  const [isLanguageMenuVisible, setIsLanguageMenuVisible] = useState(false);
  const surveyBackdropOpacity = useRef(new Animated.Value(0)).current;
  const surveySheetTranslateY = useRef(new Animated.Value(300)).current;
  const languageBackdropOpacity = useRef(new Animated.Value(0)).current;
  const languageSheetTranslateY = useRef(new Animated.Value(300)).current;

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

  // Create animation loop
  useEffect(() => {
    const createAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(videoAnimation, {
            toValue: 1,
            duration: 30000, // 30 seconds for a slower, more subtle cycle
            easing: Easing.linear,
            useNativeDriver: true
          }),
          Animated.timing(videoAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      ).start();
    };

    createAnimation();

    return () => {
      videoAnimation.stopAnimation();
    };
  }, []);

  const videoAnimatedStyle = {
    transform: [
      {
        scale: videoAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1.8, 1.9, 1.8] // Much more zoomed in
        })
      },
      {
        rotate: videoAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['-5deg', '5deg']
        })
      },
      {
        translateX: videoAnimation.interpolate({
          inputRange: [0, 0.25, 0.75, 1],
          outputRange: [0, -15, 15, 0]
        })
      },
      {
        translateY: videoAnimation.interpolate({
          inputRange: [0, 0.25, 0.75, 1],
          outputRange: [0, 15, -15, 0]
        })
      }
    ]
  };

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

  const handleLanguageSelect = async (newLanguage: 'en' | 'sv') => {
    setIsLanguageMenuVisible(false);
    if (newLanguage !== language) {
      setIsChangingLanguage(true);
      await setLanguage(newLanguage);
      setIsChangingLanguage(false);
    }
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

  const showSurveyModal = () => {
    setSurveyModalVisible(true);
    // Fade in the backdrop
    Animated.timing(surveyBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
    // Slide up the sheet
    Animated.timing(surveySheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();
  };

  const hideSurveyModal = () => {
    // Fade out the backdrop
    Animated.timing(surveyBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    // Slide down the sheet
    Animated.timing(surveySheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setSurveyModalVisible(false);
    });
  };

  const showLanguageModal = () => {
    setIsLanguageMenuVisible(true);
    // Fade in the backdrop
    Animated.timing(languageBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
    // Slide up the sheet
    Animated.timing(languageSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();
  };

  const hideLanguageModal = () => {
    // Fade out the backdrop
    Animated.timing(languageBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    // Slide down the sheet
    Animated.timing(languageSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setIsLanguageMenuVisible(false);
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Video with Overlay */}
      <View style={styles.videoContainer}>
        <Animated.View style={[styles.backgroundVideo, videoAnimatedStyle]}>
          <Video
            ref={videoRef}
            source={require('../../assets/bg_video.mp4')}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
          />
        </Animated.View>
        <View
          style={[
            styles.overlay,
            { backgroundColor: theme.splashVideoOverlay?.get() || '#397770' }
          ]}
        />
      </View>

      {/* Content */}
      <View style={[styles.content, { minHeight: screenHeight }]}>
        {/* Help Icon */}
        <Animated.View
          style={{
            opacity: contentOpacity,
            position: 'absolute',
            top: insets.top || 40,
            left: 16,
            zIndex: 100
          }}
        >
          <TouchableOpacity
            onPress={handleOpenWebsite}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            activeOpacity={1}
            onPressIn={e => {
              e.currentTarget.setNativeProps({
                style: { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              });
            }}
            onPressOut={e => {
              e.currentTarget.setNativeProps({
                style: { backgroundColor: 'transparent' }
              });
            }}
          >
            <HelpCircle size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Language Selector */}
        <Animated.View
          style={{
            opacity: contentOpacity,
            position: 'absolute',
            top: insets.top || 40,
            right: 16,
            zIndex: 100
          }}
        >
          <TouchableOpacity
            onPress={showLanguageModal}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'transparent',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            activeOpacity={1}
            onPressIn={e => {
              e.currentTarget.setNativeProps({
                style: { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              });
            }}
            onPressOut={e => {
              e.currentTarget.setNativeProps({
                style: { backgroundColor: 'transparent' }
              });
            }}
          >
            <Flag size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Top Section - Logo */}
        <View style={styles.topSection}>
          <AnimatedLogo size={180} onAnimationComplete={handleLogoAnimationComplete} />
        </View>

        {/* Middle Section - Title, Slogan, Buttons */}
        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <View style={styles.middleSection}>
            <YStack gap={12} alignItems="center" marginBottom={56}>
              <Heading
                style={{
                  fontWeight: '800',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  color: 'white'
                }}
              >
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
            </YStack>
          </View>
        </Animated.View>

        {/* Bottom Section - Survey Box and Social Media */}
        <Animated.View style={{ opacity: contentOpacity, width: '100%' }}>
          <View style={styles.bottomSection}>
            {/* Survey Section as clickable area */}
            <TouchableOpacity
              style={styles.surveyButton}
              onPress={showSurveyModal}
              activeOpacity={0.7}
            >
              <Text size="sm" color="white" textAlign="center">
                {t('auth.signIn.helpImprove')}
              </Text>
              <Text size="sm" color="#00FFBC" textAlign="center" marginTop={6}>
                {t('auth.signIn.helpImprove.cta')}
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
        transparent
        animationType="none"
        onRequestClose={hideSurveyModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: surveyBackdropOpacity
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideSurveyModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: surveySheetTranslateY }]
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                {/* Sheet Handle */}
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    alignSelf: 'center',
                    marginBottom: 12
                  }}
                />

                <Heading textAlign="center" size="$5" color="white">
                  {t('auth.signIn.helpImprove.drawer.title')}
                </Heading>

                <Text textAlign="center" color="white">
                  {t('auth.signIn.helpImprove.drawer.text')}
                </Text>

                <XStack gap="$4" marginTop="$4" paddingHorizontal="$2">
                  <TouchableOpacity
                    style={styles.surveyOption}
                    onPress={() => handleOpenSurvey('driver')}
                  >
                    <YStack alignItems="center" gap="$3">
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          backgroundColor: 'rgba(255, 255, 255, 0)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8
                        }}
                      >
                        <GraduationCap size={40} color="white" />
                      </View>
                      <Text color="white" size="lg" textAlign="center">
                        {t('auth.signIn.forLearners')}
                      </Text>
                    </YStack>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.surveyOption}
                    onPress={() => handleOpenSurvey('school')}
                  >
                    <YStack alignItems="center" gap="$3">
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          backgroundColor: 'rgba(255, 255, 255, 0)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8
                        }}
                      >
                        <School size={40} color="white" />
                      </View>
                      <Text color="white" size="lg" textAlign="center">
                        {t('auth.signIn.forSchools')}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                </XStack>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={isLanguageMenuVisible}
        transparent
        animationType="none"
        onRequestClose={hideLanguageModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: languageBackdropOpacity
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideLanguageModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: languageSheetTranslateY }]
              }}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                {/* Sheet Handle */}
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    alignSelf: 'center',
                    marginBottom: 12
                  }}
                />

                <Text size="xl" weight="bold" color="white" textAlign="center">
                  {t('settings.language.title')}
                </Text>

                <YStack gap="$2" marginTop="$2">
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'en' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => handleLanguageSelect('en')}
                  >
                    <XStack gap={8} padding="$2" alignItems="center">
                      <Text color="white" size="lg">
                        English
                      </Text>
                      {language === 'en' && (
                        <Check size={16} color="white" style={{ marginLeft: 'auto' }} />
                      )}
                    </XStack>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'sv' && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => handleLanguageSelect('sv')}
                  >
                    <XStack gap={8} padding="$2" alignItems="center">
                      <Text color="white" size="lg">
                        Svenska
                      </Text>
                      {language === 'sv' && (
                        <Check size={16} color="white" style={{ marginLeft: 'auto' }} />
                      )}
                    </XStack>
                  </TouchableOpacity>
                </YStack>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}
