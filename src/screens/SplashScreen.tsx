import { YStack, XStack, Heading } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { useTranslation } from '../contexts/TranslationContext';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { OnboardingSlide } from '../components/Onboarding';
import { supabase } from '../lib/supabase';
import { useState, useRef, useEffect } from 'react';
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
  Pressable,
  ScrollView,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { Flag, HelpCircle, Check, GraduationCap, School } from '@tamagui/lucide-icons';
import { FontAwesome } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { SvgXml } from 'react-native-svg';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Database } from '../lib/database.types';

// Video asset reference
// eslint-disable-next-line @typescript-eslint/no-require-imports
const backgroundVideo = require('../../assets/bg_video.mp4');

// Define styles outside of the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    backgroundColor: '#fff',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.75,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 60,
  },
  middleSection: {
    alignItems: 'center',
    width: '100%',
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 20,
    marginBottom: 40,
  },
  surveyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
    position: 'relative',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
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
    elevation: 5,
  },
  surveyOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  onboardingSlide: {
    flex: 1,
    position: 'relative',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20, // Much lower, near bottom of screen
    left: 0,
    right: 0,
    zIndex: 20,
  },
});

export function SplashScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t, language, setLanguage } = useTranslation();
  const { width, height } = Dimensions.get('window');
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  // Theme colors
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');
  const textColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const selectedBackgroundColor = useThemeColor(
    { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
    'background',
  );
  const handleColor = useThemeColor(
    { light: 'rgba(0, 0, 0, 0.3)', dark: 'rgba(255, 255, 255, 0.3)' },
    'background',
  );

  const [onboardingSlides, setOnboardingSlides] = useState<OnboardingSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [seenSlides, setSeenSlides] = useState<Set<number>>(new Set()); // Track which slides have been seen
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const videoRef = useRef<Video>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  const videoAnimation = useRef(new Animated.Value(0)).current;
  const [isLanguageMenuVisible, setIsLanguageMenuVisible] = useState(false);
  const surveyBackdropOpacity = useRef(new Animated.Value(0)).current;
  const surveySheetTranslateY = useRef(new Animated.Value(300)).current;
  const languageBackdropOpacity = useRef(new Animated.Value(0)).current;
  const languageSheetTranslateY = useRef(new Animated.Value(300)).current;

  const viewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems[0] && viewableItems[0].index !== null) {
        const slideIndex = viewableItems[0].index;
        const realIndex = slideIndex % (onboardingSlides.length + 1); // +1 for splash
        setCurrentSlideIndex(realIndex);

        // Mark this slide as seen
        setSeenSlides((prev) => new Set(prev).add(realIndex));
      }
    },
  );

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  // Handle infinite scroll looping
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const slideIndex = Math.round(contentOffset.x / width);

    // Calculate the position within the real slides (0 to realSlidesCount-1)
    const realIndex = slideIndex % realSlidesCount;

    // If we're in the first set (indices 0 to realSlidesCount-1), jump to middle set
    if (slideIndex < realSlidesCount) {
      const targetIndex = slideIndex + realSlidesCount; // Jump to middle set
      setTimeout(() => {
        if (slidesRef.current) {
          slidesRef.current.scrollToIndex({ index: targetIndex, animated: false });
        }
      }, 50);
    }
    // If we're in the last set (indices 2*realSlidesCount to 3*realSlidesCount-1), jump to middle set
    else if (slideIndex >= 2 * realSlidesCount) {
      const targetIndex = slideIndex - realSlidesCount; // Jump to middle set
      setTimeout(() => {
        if (slidesRef.current) {
          slidesRef.current.scrollToIndex({ index: targetIndex, animated: false });
        }
      }, 50);
    }

    // Update the current slide index to show correct dots
    setCurrentSlideIndex(realIndex);
  };

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

  // Note: Removed clearCache() call that was causing logger errors

  // Load onboarding slides directly from database (bypass completion check)
  useEffect(() => {
    const loadOnboardingSlides = async () => {
      try {
        console.log('🔄 Loading onboarding slides for splash screen...');

        // Fetch from content table with proper filtering
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('content_type', 'onboarding')
          .contains('platforms', ['mobile'])
          .eq('active', true)
          .order('order_index', { ascending: true });

        if (error) {
          console.error('❌ Error fetching onboarding content:', error.message);
          throw error;
        }

        if (data && data.length > 0) {
          console.log('📱 Loaded', data.length, 'onboarding content items from database');

          // Transform the content data to match the OnboardingSlide interface
          const slides = data.map((content: Database['public']['Tables']['content']['Row']) => ({
            id: content.id,
            title_en: ((content.title as { en?: string; sv?: string }) || {}).en || '',
            title_sv: ((content.title as { en?: string; sv?: string }) || {}).sv || '',
            text_en: ((content.body as { en?: string; sv?: string }) || {}).en || '',
            text_sv: ((content.body as { en?: string; sv?: string }) || {}).sv || '',
            image_url: content.image_url || undefined,
            icon: content.icon || undefined,
            iconColor: content.icon_color || undefined,
            media_enabled: content.media_enabled || true,
            media_type: content.media_type as 'image' | 'video' | 'embed' | undefined,
            youtube_embed: content.youtube_embed || undefined,
            iframe_embed: content.iframe_embed || undefined,
            iconSvg: content.icon_svg || undefined,
          }));

          setOnboardingSlides(slides);
        } else {
          console.log('📝 No slides found in database, creating demo slides');
          const demoSlides = [
            {
              id: 'demo1',
              title_en: 'Welcome to Vromm!',
              title_sv: 'Välkommen till Vromm!',
              text_en: 'Discover perfect practice driving routes near you',
              text_sv: 'Upptäck perfekta övningskörningsrutter nära dig',
              media_enabled: false,
            },
            {
              id: 'demo2',
              title_en: 'Find Routes',
              title_sv: 'Hitta rutter',
              text_en: 'Browse routes created by instructors and other learners',
              text_sv: 'Bläddra bland rutter skapade av instruktörer och andra elever',
              media_enabled: false,
            },
            {
              id: 'demo3',
              title_en: 'Get Started',
              title_sv: 'Kom igång',
              text_en: 'Create an account to start your driving journey',
              text_sv: 'Skapa ett konto för att börja din körresa',
              media_enabled: false,
            },
          ];
          setOnboardingSlides(demoSlides);
        }
      } catch (error) {
        console.error('❌ Error loading onboarding slides for splash:', error);
        // Create fallback demo slides on error
        const fallbackSlides = [
          {
            id: 'fallback1',
            title_en: 'Welcome to Vromm!',
            title_sv: 'Välkommen till Vromm!',
            text_en: 'Your driving practice companion',
            text_sv: 'Din körövningspartner',
            media_enabled: false,
          },
        ];
        setOnboardingSlides(fallbackSlides);
      } finally {
        setIsLoadingSlides(false);
      }
    };

    loadOnboardingSlides();
  }, []);

  // Removed auto-scroll functionality as requested by user

  // Create animation loop
  useEffect(() => {
    const createAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(videoAnimation, {
            toValue: 1,
            duration: 30000, // 30 seconds for a slower, more subtle cycle
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(videoAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    createAnimation();

    return () => {
      videoAnimation.stopAnimation();
    };
  }, [videoAnimation]);

  const videoAnimatedStyle = {
    transform: Platform.OS === 'web' ? undefined : [
      {
        scale: videoAnimation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1.8, 1.9, 1.8], // Much more zoomed in
        }),
      },
      {
        rotate: videoAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['-5deg', '5deg'],
        }),
      },
      {
        translateX: videoAnimation.interpolate({
          inputRange: [0, 0.25, 0.75, 1],
          outputRange: [0, -15, 15, 0],
        }),
      },
      {
        translateY: videoAnimation.interpolate({
          inputRange: [0, 0.25, 0.75, 1],
          outputRange: [0, 15, -15, 0],
        }),
      },
    ],
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
      useNativeDriver: true,
    }).start();
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://www.vromm.se');
  };

  // Carousel functions
  const scrollToSlide = (index: number) => {
    if (slidesRef.current) {
      slidesRef.current.scrollToIndex({ index, animated: true });
    }
  };

  // Render media for onboarding slides (reused from Onboarding.tsx)
  const renderMedia = (item: OnboardingSlide) => {
    if (!item.media_enabled) {
      return null;
    }

    const mediaElements = [];

    // Add image if available
    if (item.image_url || item.image) {
      mediaElements.push(
        <YStack
          key="image-container"
          alignItems="center"
          justifyContent="center"
          width={width * 0.9} // Bigger width
          height={width * 0.75} // Bigger height
          marginBottom="$4"
        >
          <Image
            key="image"
            source={item.image_url ? { uri: item.image_url } : item.image!}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain',
              borderRadius: 16, // Slightly more rounded corners
            }}
            onError={(error) => console.error('Image loading error:', error.nativeEvent)}
            onLoad={() => console.log('Image loaded successfully')}
          />
        </YStack>,
      );
    }

    // Add YouTube embed if available
    if (item.youtube_embed) {
      let videoId = '';
      const embedContent = item.youtube_embed;

      // Try to extract from iframe src if it's an iframe
      const iframeSrcMatch = embedContent.match(/src=["'].*?youtube.com\/embed\/([^"'?]+)/);
      if (iframeSrcMatch) {
        videoId = iframeSrcMatch[1];
      } else {
        // Try to extract from regular YouTube URL
        const urlMatch = embedContent.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
        );
        if (urlMatch) {
          videoId = urlMatch[1];
        }
      }

      if (videoId) {
        const embedHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  background-color: black;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                }
                .video-container { 
                  position: relative;
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                  border-radius: 10px;
                }
                iframe { 
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  border: none;
                }
              </style>
            </head>
            <body>
              <div class="video-container">
                <iframe
                  src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&autoplay=0"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                ></iframe>
              </div>
            </body>
          </html>
        `;

        mediaElements.push(
          <YStack
            key="youtube"
            alignItems="center"
            justifyContent="center"
            bg="$backgroundStrong"
            padding="$4"
            borderRadius="$10"
            width={width * 0.8}
            height={width * 0.45}
            marginVertical="$4"
            overflow="hidden"
          >
            <WebView
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 10,
                backgroundColor: 'black',
              }}
              source={{ html: embedHtml }}
              allowsFullscreenVideo
              javaScriptEnabled
              scrollEnabled={false}
              bounces={false}
              mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error:', nativeEvent);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error:', nativeEvent);
              }}
              onLoadEnd={() => console.log('WebView loaded')}
              onMessage={(event) => console.log('WebView message:', event.nativeEvent.data)}
            />
          </YStack>,
        );
      }
    }

    // Add icon if available (emoji or FontAwesome)
    if (item.icon) {
      // Check if it's an emoji (Unicode characters)
      const isEmoji =
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
          item.icon,
        );
      if (isEmoji) {
        // Render emoji with glow effect
        mediaElements.push(
          <YStack
            key="emoji-icon"
            alignItems="center"
            justifyContent="center"
            marginVertical="$4"
            width={width * 0.4}
            height={width * 0.4}
            style={{
              shadowColor: item.iconColor || '#ffffff',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Text
              style={{
                fontSize: 120,
                textAlign: 'center',
                textShadowColor: item.iconColor || '#ffffff',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              }}
            >
              {item.icon}
            </Text>
          </YStack>,
        );
      } else {
        // Render FontAwesome icon
        mediaElements.push(
          <YStack
            key="fontawesome-icon"
            alignItems="center"
            justifyContent="center"
            marginVertical="$4"
            width={width * 0.4}
            height={width * 0.4}
          >
            <FontAwesome
              name={item.icon as keyof typeof FontAwesome.glyphMap}
              size={120}
              color={item.iconColor || '#ffffff'}
            />
          </YStack>,
        );
      }
    }

    // Add SVG icon if available
    if (item.iconSvg) {
      mediaElements.push(
        <YStack
          key="svg"
          alignItems="center"
          justifyContent="center"
          bg="$backgroundStrong"
          padding="$8"
          borderRadius="$10"
          marginVertical="$4"
          width={width * 0.6}
          height={width * 0.6}
        >
          <SvgXml xml={item.iconSvg} width="100%" height="100%" />
        </YStack>,
      );
    }

    // Return all media elements in a scrollable container
    return mediaElements.length > 0 ? (
      <YStack gap="$4" alignItems="center" justifyContent="center">
        {mediaElements}
      </YStack>
    ) : null;
  };

  const getTitle = (slide: OnboardingSlide) => {
    return language === 'sv' ? slide.title_sv : slide.title_en;
  };

  const getText = (slide: OnboardingSlide) => {
    return language === 'sv' ? slide.text_sv : slide.text_en;
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
      await setLanguage(newLanguage);
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
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(surveySheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideSurveyModal = () => {
    // Fade out the backdrop
    Animated.timing(surveyBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(surveySheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
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
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(languageSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideLanguageModal = () => {
    // Fade out the backdrop
    Animated.timing(languageBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(languageSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsLanguageMenuVisible(false);
    });
  };

  // Animated onboarding slide component
  const AnimatedOnboardingSlide = ({
    item,
    isActive,
    slideIndex,
  }: {
    item: OnboardingSlide;
    isActive: boolean;
    slideIndex: number;
  }) => {
    const imageScale = useRef(new Animated.Value(seenSlides.has(slideIndex) ? 1 : 0.8)).current;
    const titleTranslateY = useRef(new Animated.Value(seenSlides.has(slideIndex) ? 0 : 30)).current;
    const textTranslateY = useRef(new Animated.Value(seenSlides.has(slideIndex) ? 0 : 40)).current;
    const titleOpacity = useRef(new Animated.Value(seenSlides.has(slideIndex) ? 1 : 0)).current;
    const textOpacity = useRef(new Animated.Value(seenSlides.has(slideIndex) ? 1 : 0)).current;

    useEffect(() => {
      if (isActive && !seenSlides.has(slideIndex)) {
        // Only animate if this slide hasn't been seen before
        console.log('🎬 Animating slide', slideIndex, 'for first time');

        // Start entrance animations when slide becomes active for the first time
        Animated.sequence([
          // Animate content with stagger effect
          Animated.parallel([
            // Scale in the image/icon
            Animated.spring(imageScale, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            // Slide up and fade in title
            Animated.timing(titleTranslateY, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(titleOpacity, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          // Finally slide up and fade in text (delayed)
          Animated.parallel([
            Animated.timing(textTranslateY, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      } else if (isActive && seenSlides.has(slideIndex)) {
        // If slide has been seen before, just show final state immediately
        console.log('⚡ Showing slide', slideIndex, 'immediately (already seen)');
        imageScale.setValue(1);
        titleTranslateY.setValue(0);
        textTranslateY.setValue(0);
        titleOpacity.setValue(1);
        textOpacity.setValue(1);
      }
      // Don't reset when inactive - keep the final state for seen slides
    }, [
      isActive,
      slideIndex,
      imageScale,
      titleTranslateY,
      textTranslateY,
      titleOpacity,
      textOpacity,
    ]);

    return (
      <View style={[styles.onboardingSlide, { width, backgroundColor }]}>
        <ScrollView
          style={{ flex: 1, backgroundColor }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 200,
          }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            minHeight={height - 300}
            backgroundColor={backgroundColor}
          >
            <Animated.View
              style={{
                flex: 2,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
                minHeight: 300,
                transform: Platform.OS === 'web' ? undefined : [{ scale: imageScale }],
              }}
            >
              {renderMedia(item)}
            </Animated.View>

            <YStack flex={1} alignItems="center" gap="$4" minHeight={150}>
              <Animated.View
                style={{
                  opacity: titleOpacity,
                  transform: Platform.OS === 'web' ? undefined : [{ translateY: titleTranslateY }],
                  ...(Platform.OS === 'web' ? { top: titleTranslateY } : {}),
                }}
              >
                <Text
                  size="3xl"
                  fontWeight="800"
                  fontStyle="italic"
                  textAlign="center"
                  fontFamily="$heading"
                  color={textColor}
                >
                  {getTitle(item)}
                </Text>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: textOpacity,
                  transform: Platform.OS === 'web' ? undefined : [{ translateY: textTranslateY }],
                  ...(Platform.OS === 'web' ? { top: textTranslateY } : {}),
                }}
              >
                <Text size="lg" textAlign="center" color={textColor} opacity={0.9}>
                  {getText(item)}
                </Text>
              </Animated.View>
            </YStack>
          </YStack>
        </ScrollView>
      </View>
    );
  };

  // Render onboarding slide content
  const renderOnboardingSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const realIndex = index % realSlidesCount;
    const isActive = currentSlideIndex === realIndex;

    return <AnimatedOnboardingSlide item={item} isActive={isActive} slideIndex={realIndex} />;
  };

  // Render original splash screen content (background video handled at main level)
  const renderSplashContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ minHeight: screenHeight }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={[styles.content, { minHeight: screenHeight }]}>
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
                  color: 'white',
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
              display="none"
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
    </ScrollView>
  );

  // Always include splash screen as first slide, then add onboarding slides if available
  const splashSlide: OnboardingSlide & { isSplash: boolean } = {
    id: 'splash',
    title_en: 'Welcome to Vromm',
    title_sv: 'Välkommen till Vromm',
    text_en: 'Your driving practice companion',
    text_sv: 'Din körövningspartner',
    isSplash: true,
  };

  const baseSlides = [
    splashSlide,
    ...onboardingSlides.map((slide) => ({ ...slide, isSplash: false })),
  ];

  // Create infinite loop by duplicating slides for smooth scrolling (only if we have more than 1 slide)
  const allSlides =
    baseSlides.length > 1
      ? [...baseSlides, ...baseSlides, ...baseSlides] // Triple the slides for smooth infinite scroll
      : baseSlides; // Don't duplicate if only splash screen
  const realSlidesCount = baseSlides.length;
  const startIndex = baseSlides.length > 1 ? realSlidesCount : 0; // Start in the middle set if we have multiple slides

  console.log(
    '🚀 SplashScreen render - isLoadingSlides:',
    isLoadingSlides,
    'onboardingSlides:',
    onboardingSlides.length,
    'baseSlides:',
    baseSlides.length,
    'allSlides:',
    allSlides.length,
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: OnboardingSlide & { isSplash?: boolean };
    index: number;
  }) => {
    if (item.isSplash) {
      return <View style={{ width }}>{renderSplashContent()}</View>;
    }
    return renderOnboardingSlide({ item, index });
  };

  // Wait for slides to load before rendering carousel
  if (isLoadingSlides) {
    return (
      <View style={styles.container}>
        {/* Background Video with Overlay - always present for splash */}
        <View style={styles.videoContainer}>
          <Animated.View style={[styles.backgroundVideo, videoAnimatedStyle]}>
            <Video
              ref={videoRef}
              source={backgroundVideo}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
            />
          </Animated.View>
          <View style={[styles.overlay, { backgroundColor: '#397770' }]} />
        </View>
        {renderSplashContent()}
      </View>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })(event);
  };

  // Render dots indicator (only for real slides, not duplicates, and only if more than 1 slide)
  const renderDots = () => {
    console.log(
      '🎯 Rendering dots for',
      baseSlides.length,
      'real slides, current index:',
      currentSlideIndex,
    );

    if (baseSlides.length <= 1) {
      console.log('⚠️ Not showing dots - only', baseSlides.length, 'slide(s)');
      return null;
    }

    return (
      <View style={styles.dotsContainer}>
        <XStack justifyContent="center" gap="$1" paddingVertical="$2">
          {baseSlides.map((_, i) => {
            const isActive = currentSlideIndex === i;

            return (
              <TouchableOpacity
                key={`dot-${i}`}
                onPress={() => scrollToSlide(startIndex + i)} // Jump to middle set + offset
                style={{
                  padding: 6, // Smaller touch target
                }}
              >
                <Animated.View
                  style={{
                    width: isActive ? 16 : 8, // Smaller dots
                    height: 8, // Smaller height
                    borderRadius: 4,
                    backgroundColor: isActive ? '#00FFBC' : textColor,
                    marginHorizontal: 2, // Less spacing
                    opacity: isActive ? 1 : 0.5,
                    shadowColor: isActive ? '#00FFBC' : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isActive ? 0.3 : 0, // Subtle glow
                    shadowRadius: isActive ? 4 : 0,
                    elevation: isActive ? 3 : 0,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </XStack>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background Video with Overlay - always present for splash */}
      <View style={styles.videoContainer}>
        <Animated.View style={[styles.backgroundVideo, videoAnimatedStyle]}>
          <Video
            ref={videoRef}
            source={backgroundVideo}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
          />
        </Animated.View>
        <View style={[styles.overlay, { backgroundColor: '#397770' }]} />
      </View>

      {/* Main Content - Carousel with splash and onboarding slides */}
      <FlatList
        ref={slidesRef}
        data={allSlides}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id || 'slide'}-${index}`}
        horizontal={baseSlides.length > 1} // Only horizontal if multiple slides
        pagingEnabled={baseSlides.length > 1} // Only paging if multiple slides
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={baseSlides.length > 1 ? handleScroll : undefined}
        onMomentumScrollEnd={baseSlides.length > 1 ? handleMomentumScrollEnd : undefined}
        onViewableItemsChanged={baseSlides.length > 1 ? viewableItemsChangedRef.current : undefined}
        viewabilityConfig={baseSlides.length > 1 ? viewConfigRef.current : undefined}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialScrollIndex={baseSlides.length > 1 ? startIndex : 0}
        bounces={false}
        decelerationRate="fast"
        scrollEnabled={baseSlides.length > 1} // Only allow scrolling if multiple slides
      />

      {/* Help Icon - show on all slides */}
      <Animated.View
        style={{
          opacity: contentOpacity,
          position: 'absolute',
          top: insets.top || 40,
          left: 16,
          zIndex: 100,
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
            justifyContent: 'center',
          }}
          activeOpacity={1}
          onPressIn={(e) => {
            e.currentTarget.setNativeProps({
              style: { backgroundColor: selectedBackgroundColor },
            });
          }}
          onPressOut={(e) => {
            e.currentTarget.setNativeProps({
              style: { backgroundColor: 'transparent' },
            });
          }}
        >
          <HelpCircle size={20} color={currentSlideIndex === 0 ? 'white' : textColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Language Selector - show on all slides */}
      <Animated.View
        style={{
          opacity: contentOpacity,
          position: 'absolute',
          top: insets.top || 40,
          right: 16,
          zIndex: 100,
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
            justifyContent: 'center',
          }}
          activeOpacity={1}
          onPressIn={(e) => {
            e.currentTarget.setNativeProps({
              style: { backgroundColor: selectedBackgroundColor },
            });
          }}
          onPressOut={(e) => {
            e.currentTarget.setNativeProps({
              style: { backgroundColor: 'transparent' },
            });
          }}
        >
          <Flag size={20} color={currentSlideIndex === 0 ? 'white' : textColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Dots indicator */}
      {renderDots()}

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
            opacity: surveyBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideSurveyModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: Platform.OS === 'web' ? undefined : [{ translateY: surveySheetTranslateY }],
                ...(Platform.OS === 'web' ? { top: surveySheetTranslateY } : {}),
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Heading textAlign="center" size="$5" color={textColor}>
                  {t('auth.signIn.helpImprove.drawer.title')}
                </Heading>

                <Text textAlign="center" color={textColor}>
                  {t('auth.signIn.helpImprove.drawer.text')}
                </Text>

                <XStack gap="$4" marginTop="$4" paddingHorizontal="$2">
                  <TouchableOpacity
                    style={[styles.surveyOption, { borderColor: selectedBackgroundColor }]}
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
                          marginBottom: 8,
                        }}
                      >
                        <GraduationCap size={40} color={textColor} />
                      </View>
                      <Text color={textColor} size="lg" textAlign="center">
                        {t('auth.signIn.forLearners')}
                      </Text>
                    </YStack>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.surveyOption, { borderColor: selectedBackgroundColor }]}
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
                          marginBottom: 8,
                        }}
                      >
                        <School size={40} color={textColor} />
                      </View>
                      <Text color={textColor} size="lg" textAlign="center">
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
            opacity: languageBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideLanguageModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: Platform.OS === 'web' ? undefined : [{ translateY: languageSheetTranslateY }],
                ...(Platform.OS === 'web' ? { top: languageSheetTranslateY } : {}),
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                <Text size="xl" weight="bold" color={textColor} textAlign="center">
                  {t('settings.language.title')}
                </Text>

                <YStack gap="$2" marginTop="$2">
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'en' && { backgroundColor: selectedBackgroundColor },
                    ]}
                    onPress={() => handleLanguageSelect('en')}
                  >
                    <XStack gap={8} padding="$2" alignItems="center">
                      <Text color={textColor} size="lg">
                        English
                      </Text>
                      {language === 'en' && (
                        <Check size={16} color={textColor} style={{ marginLeft: 'auto' }} />
                      )}
                    </XStack>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'sv' && { backgroundColor: selectedBackgroundColor },
                    ]}
                    onPress={() => handleLanguageSelect('sv')}
                  >
                    <XStack gap={8} padding="$2" alignItems="center">
                      <Text color={textColor} size="lg">
                        Svenska
                      </Text>
                      {language === 'sv' && (
                        <Check size={16} color={textColor} style={{ marginLeft: 'auto' }} />
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
