import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  TouchableOpacity,
  Dimensions,
  Pressable,
  Modal as RNModal,
  TextInput,
  Alert,
  View,
  Animated,
  PanResponder,
} from 'react-native';
import { YStack, XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { SectionHeader } from '../../components/SectionHeader';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';
import { useAuth } from '../../context/AuthContext';
import { useUnlock } from '../../contexts/UnlockContext';
import { useToast } from '../../contexts/ToastContext';
import { useStripe } from '@stripe/stripe-react-native';
import { FunctionsHttpError } from '@supabase/supabase-js';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_HEIGHT = 160;
const CARD_MARGIN = 16;

interface FeaturedLearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  is_featured: boolean;
  // Access Control & Paywall
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
}

interface FeaturedExercise {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  learning_path_id: string;
  is_featured: boolean;
  // Access Control & Paywall
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
}

export function FeaturedContent2() {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY TIME
  const navigation = useNavigation<NavigationProp>();
  const { t, language: lang, refreshTranslations } = useTranslation();
  const colorScheme = useColorScheme();
  const { user: authUser, profile } = useAuth();
  const { showToast } = useToast();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    unlockedPaths,
    userPayments,
    addUnlockedPath,
    loadUserPayments,
    loadUnlockedContent,
    isPathUnlocked,
    hasPathPayment,
  } = useUnlock();

  // ALL useState CALLS FIRST
  const [featuredPaths, setFeaturedPaths] = useState<FeaturedLearningPath[]>([]);
  const [featuredExercises, setFeaturedExercises] = useState<FeaturedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | undefined>();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallPath, setPaywallPath] = useState<FeaturedLearningPath | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPath, setPasswordPath] = useState<FeaturedLearningPath | null>(null);
  const [pathPasswordInput, setPathPasswordInput] = useState('');

  // REAL TINDER SWIPE - Using PanResponder (NO WORKLETS = NO CRASHES)
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  // ALL useMemo/useCallback CALLS
  const allFeaturedContent = useMemo(
    () => [...featuredPaths, ...featuredExercises],
    [featuredPaths, featuredExercises],
  );

  // TINDER-LIKE PAN RESPONDER - Real swipe gestures!
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal swipes
          return (
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
          );
        },
        onPanResponderGrant: () => {
          console.log('🃏 [FeaturedContent2] Swipe started');
          pan.setOffset({
            x: (pan.x as any)._value,
            y: (pan.y as any)._value,
          });
        },
        onPanResponderMove: (_, gestureState) => {
          // Real-time card following finger
          pan.setValue({ x: gestureState.dx, y: gestureState.dy * 0.3 });

          // Rotation based on horizontal movement
          const rotation = (gestureState.dx / screenWidth) * 30; // Max 30 degrees
          rotate.setValue(Math.max(-30, Math.min(30, rotation)));

          // Scale effect based on distance
          const distance = Math.abs(gestureState.dx);
          const scaleValue = Math.max(0.9, 1 - (distance / screenWidth) * 0.1);
          scale.setValue(scaleValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          console.log('🃏 [FeaturedContent2] Swipe ended:', {
            dx: gestureState.dx,
            vx: gestureState.vx,
            shouldSwipe: Math.abs(gestureState.dx) > 100 || Math.abs(gestureState.vx) > 0.5,
          });

          pan.flattenOffset();

          const swipeThreshold = 100;
          const velocityThreshold = 0.5;
          const shouldSwipe =
            Math.abs(gestureState.dx) > swipeThreshold ||
            Math.abs(gestureState.vx) > velocityThreshold;

          if (shouldSwipe) {
            const direction = gestureState.dx > 0 ? 'right' : 'left';
            console.log('🃏 [FeaturedContent2] Swipe detected:', direction);

            // Animate card off screen
            const toValue = direction === 'right' ? screenWidth * 1.5 : -screenWidth * 1.5;
            Animated.parallel([
              Animated.timing(pan.x, {
                toValue,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(scale, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: false,
              }),
            ]).start(() => {
              // Change card after animation
              const nextIndex =
                direction === 'right'
                  ? (currentCardIndex - 1 + allFeaturedContent.length) % allFeaturedContent.length
                  : (currentCardIndex + 1) % allFeaturedContent.length;

              console.log('🃏 [FeaturedContent2] Card changed:', currentCardIndex, '→', nextIndex);
              setCurrentCardIndex(nextIndex);

              // Reset animations
              pan.setValue({ x: 0, y: 0 });
              scale.setValue(1);
              rotate.setValue(0);
            });
          } else {
            console.log('🃏 [FeaturedContent2] Swipe cancelled, returning to center');
            // Snap back to center
            Animated.parallel([
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false,
              }),
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: false,
              }),
              Animated.spring(rotate, {
                toValue: 0,
                useNativeDriver: false,
              }),
            ]).start();
          }
        },
      }),
    [currentCardIndex, allFeaturedContent.length],
  );

  // ALL useCallback CALLS
  const handleCardTap = useCallback(
    (index: number, item: FeaturedLearningPath | FeaturedExercise) => {
      try {
        console.log('🃏 [FeaturedContent2] Card tapped:', {
          tappedIndex: index,
          currentIndex: currentCardIndex,
          isCurrentCard: index === currentCardIndex,
          itemTitle: item.title[lang] || item.title.en,
          totalCards: allFeaturedContent.length,
        });

        if (index === currentCardIndex) {
          // If tapping the top card, open it with animation
          console.log('🃏 [FeaturedContent2] Opening current card content');
          handleCardPress(item);
        } else {
          // If tapping a background card, bring it to front
          console.log('🃏 [FeaturedContent2] Bringing background card to front');
          setCurrentCardIndex(index);
          // Reset animations for new card
          pan.setValue({ x: 0, y: 0 });
          scale.setValue(1);
          rotate.setValue(0);
        }
      } catch (error) {
        console.error('🃏 [FeaturedContent2] Card tap error:', error);
      }
    },
    [currentCardIndex, allFeaturedContent.length, lang],
  );

  // ALL useEffect CALLS AT THE END IN CONSISTENT ORDER
  useEffect(() => {
    refreshTranslations().catch(() => {
      // Silent fail on translation refresh
    });
  }, []);

  useEffect(() => {
    console.log('🃏 [FeaturedContent2] Component mounted, loading data for user:', authUser?.id);
    console.log('🃏 [FeaturedContent2] Current state:', {
      currentCardIndex,
      totalContent: allFeaturedContent.length,
      loadingState: loading,
    });

    fetchFeaturedContent();

    if (authUser?.id) {
      loadUserPayments(authUser.id);
      loadUnlockedContent(authUser.id);
    }
  }, [authUser?.id]);

  // Debug content changes
  useEffect(() => {
    console.log('🃏 [FeaturedContent2] Content updated:', {
      totalPaths: featuredPaths.length,
      totalExercises: featuredExercises.length,
      totalContent: allFeaturedContent.length,
      currentIndex: currentCardIndex,
      currentItem:
        allFeaturedContent[currentCardIndex]?.title?.[lang] ||
        allFeaturedContent[currentCardIndex]?.title?.en,
    });
  }, [featuredPaths.length, featuredExercises.length, currentCardIndex]);

  // Safety check for empty content - SINGLE useEffect only
  useEffect(() => {
    if (allFeaturedContent.length === 0) {
      console.log('🃏 [FeaturedContent2] No content available, resetting index');
      setCurrentCardIndex(0);
      return;
    }

    if (currentCardIndex >= allFeaturedContent.length) {
      console.log('🃏 [FeaturedContent2] Index out of bounds, resetting to 0');
      setCurrentCardIndex(0);
      return;
    }
  }, [allFeaturedContent.length, currentCardIndex]);

  const fetchFeaturedContent = async () => {
    try {
      setLoading(true);
      console.log('🎯 [FeaturedContent2] Fetching featured content...');

      // Fetch featured learning paths
      const { data: pathsData, error: pathsError } = await supabase
        .from('learning_paths')
        .select(
          'id, title, description, icon, image, is_featured, is_locked, lock_password, paywall_enabled, price_usd, price_sek',
        )
        .eq('is_featured', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(10); // Increased limit for more content

      if (pathsError) {
        console.error('Error fetching featured learning paths:', pathsError);
      } else {
        setFeaturedPaths(pathsData || []);
      }

      // Fetch featured exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('learning_path_exercises')
        .select('id, title, description, icon, image, learning_path_id, is_featured')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (exercisesError) {
        console.error('Error fetching featured exercises:', exercisesError);
      } else {
        setFeaturedExercises(exercisesData || []);
      }

      console.log('🎯 [FeaturedContent2] Final state:', {
        featuredPaths: pathsData?.length || 0,
        featuredExercises: exercisesData?.length || 0,
        hasContent: (pathsData?.length || 0) > 0 || (exercisesData?.length || 0) > 0,
      });
    } catch (error) {
      console.error('Error fetching featured content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Access control helper functions (same as original)
  const isPathPasswordLocked = (path: FeaturedLearningPath | FeaturedExercise): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isPathPaywallLocked = (path: FeaturedLearningPath | FeaturedExercise): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  const checkPathPaywall = async (
    path: FeaturedLearningPath | FeaturedExercise,
  ): Promise<boolean> => {
    if (!path.paywall_enabled) return true;

    if (authUser?.id) {
      await loadUserPayments(authUser.id);
    }

    if (hasPathPayment(path.id)) {
      return true;
    }

    setPaywallPath(path as FeaturedLearningPath);
    setShowPaywallModal(true);
    return false;
  };

  const checkPathPassword = async (
    path: FeaturedLearningPath | FeaturedExercise,
  ): Promise<boolean> => {
    if (!path.is_locked) return true;
    if (isPathUnlocked(path.id)) return true;

    setPasswordPath(path as FeaturedLearningPath);
    setShowPasswordModal(true);
    return false;
  };

  // Simple press handler for card tap
  const handleCardPress = async (item: FeaturedLearningPath | FeaturedExercise) => {
    console.log('🃏 [FeaturedContent2] Card pressed, opening content');

    // Simple scale animation for press feedback
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();

    // Open content directly
    await handleContentPress(item);
  };

  const handleContentPress = async (item: FeaturedLearningPath | FeaturedExercise) => {
    console.log('🎯 [FeaturedContent2] Content pressed:', item.title[lang] || item.title.en);

    // Check paywall first
    const canAccessPaywall = await checkPathPaywall(item);
    if (!canAccessPaywall) return;

    // Check password lock
    const canAccessPassword = await checkPathPassword(item);
    if (!canAccessPassword) return;

    // Determine if it's a path or exercise
    const isExercise = 'learning_path_id' in item;
    const pathId = isExercise ? (item as FeaturedExercise).learning_path_id : item.id;
    const exerciseId = isExercise ? item.id : undefined;

    console.log('🎯 [FeaturedContent2] Setting selectedPathId:', pathId);
    if (exerciseId) {
      console.log('🎯 [FeaturedContent2] Setting selectedExerciseId:', exerciseId);
    }
    setSelectedPathId(pathId);
    setSelectedExerciseId(exerciseId); // Set specific exercise ID if it's an exercise, otherwise undefined
    setSelectedTitle(item.title[lang] || item.title.en);
    setShowExerciseSheet(true);
  };

  // Render single card content (no positioning - that's handled by parent)
  const renderStackedCard = (
    item: FeaturedLearningPath | FeaturedExercise,
    index: number,
    stackOffset: number,
    stackScale: number,
    stackOpacity: number,
    isCurrentCard: boolean,
  ) => {
    const isExercise = 'learning_path_id' in item;
    const isPasswordLocked = isPathPasswordLocked(item);
    const isPaywallLocked = isPathPaywallLocked(item);

    return (
      <TouchableOpacity
        onPress={() => handleCardTap(index, item)}
        style={{ flex: 1 }}
        activeOpacity={isCurrentCard ? 0.8 : 0.95}
      >
        <Card
          padding="$4"
          backgroundColor="$backgroundHover"
          borderRadius="$4"
          borderWidth={1}
          borderColor={isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : '$borderColor'}
          height={CARD_HEIGHT}
          width="100%"
          style={{
            shadowColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : '#000',
            shadowOpacity: isCurrentCard ? 0.25 : 0.15, // Increased shadow visibility
            shadowRadius: isCurrentCard ? 16 : 8, // Larger shadow radius
            shadowOffset: { width: 0, height: isCurrentCard ? 8 : 4 }, // Larger shadow offset
            elevation: isCurrentCard ? 12 : 6, // Android shadow elevation
          }}
        >
          <YStack gap="$2" position="relative" height="100%" justifyContent="space-between">
            {/* Lock/Payment indicator badges */}
            {(isPasswordLocked || isPaywallLocked) && (
              <XStack position="absolute" top={0} right={0} zIndex={10} gap="$1">
                {isPasswordLocked && (
                  <YStack
                    backgroundColor="#FF9500"
                    borderRadius="$2"
                    padding="$1"
                    minWidth={20}
                    alignItems="center"
                  >
                    <MaterialIcons name="lock" size={10} color="white" />
                  </YStack>
                )}
                {isPaywallLocked && (
                  <YStack
                    backgroundColor="#00E6C3"
                    borderRadius="$2"
                    padding="$1"
                    minWidth={20}
                    alignItems="center"
                  >
                    <Feather name="credit-card" size={8} color="black" />
                  </YStack>
                )}
              </XStack>
            )}

            <YStack gap="$2">
              <XStack alignItems="center" gap="$2">
                {item.icon && (
                  <Feather
                    name={item.icon as keyof typeof Feather.glyphMap}
                    size={20}
                    color={isExercise ? '#4B6BFF' : '#00FFBC'}
                  />
                )}
                <Text fontSize="$3" fontWeight="600" color={isExercise ? '#4B6BFF' : '#00FFBC'}>
                  {isExercise
                    ? t('home.exercise') || 'Exercise'
                    : t('home.learningPath') || 'Learning Path'}
                </Text>
              </XStack>

              <Text fontSize="$5" fontWeight="bold" color="$color" numberOfLines={2}>
                {item.title?.[lang] || item.title?.en || 'Untitled'}
              </Text>

              {item.description?.[lang] && (
                <Text fontSize="$3" color="$gray11" numberOfLines={2}>
                  {item.description[lang]}
                </Text>
              )}
            </YStack>

            <XStack alignItems="center" gap="$2" marginTop="auto">
              <Feather name={isExercise ? 'play-circle' : 'book-open'} size={16} color="$gray11" />
              <Text fontSize="$2" color="$gray11" numberOfLines={1}>
                {isExercise
                  ? t('home.startExercise') || 'Start Exercise'
                  : t('home.startLearning') || 'Start Learning'}
              </Text>
              <Feather name="arrow-right" size={12} color="$gray11" />
            </XStack>
          </YStack>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <YStack marginBottom="$4">
        <SectionHeader
          title={(() => {
            const translated = t('home.featuredContent');
            return translated === 'home.featuredContent' ? 'Featured Learning Cards' : translated;
          })()}
        />
        <YStack alignItems="center" justifyContent="center" padding="$4">
          <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
        </YStack>
      </YStack>
    );
  }

  const hasContent = allFeaturedContent.length > 0;

  if (!hasContent) {
    return (
      <YStack marginBottom="$4">
        <SectionHeader
          title={(() => {
            const translated = t('home.featuredContent');
            return translated === 'home.featuredContent' ? 'Featured Learning Cards' : translated;
          })()}
        />
        <YStack alignItems="center" justifyContent="center" padding="$4" gap="$2">
          <Feather name="star" size={48} color="#666" />
          <Text color="$gray11" textAlign="center">
            {t('home.noFeaturedContent') || 'No featured content yet'}
          </Text>
        </YStack>
      </YStack>
    );
  }

  const currentItem = allFeaturedContent[currentCardIndex];

  return (
    <YStack marginBottom="$6">
      <SectionHeader
        title={(() => {
          const translated = t('home.featuredContent');
          return translated === 'home.featuredContent' ? 'Featured Learning Cards' : translated;
        })()}
      />

      <View style={{ paddingHorizontal: CARD_MARGIN, height: CARD_HEIGHT + 60 }}>
        {/* TINDER-LIKE Card Stack with REAL SWIPE GESTURES */}
        <View style={{ position: 'relative', height: CARD_HEIGHT, width: '100%' }}>
          {/* Background Cards (Static) */}
          {allFeaturedContent.map((item, index) => {
            const isCurrent = index === currentCardIndex;
            if (isCurrent) return null; // Skip current card, render it separately with gestures

            const distanceFromCurrent = Math.abs(index - currentCardIndex);

            // Stack positioning - cards behind are offset down and scaled down
            const stackOffset = Math.min(distanceFromCurrent * 12, 36);
            const stackScale = 1 - Math.min(distanceFromCurrent * 0.08, 0.2);
            const stackOpacity = Math.max(0.7, 1 - distanceFromCurrent * 0.15);
            const zIndex = allFeaturedContent.length * 10 - distanceFromCurrent;

            return (
              <View
                key={`background-card-${item.id}-${index}`}
                style={{
                  position: 'absolute',
                  width: screenWidth - CARD_MARGIN * 2,
                  height: CARD_HEIGHT,
                  transform: [{ translateY: stackOffset }, { scale: stackScale }],
                  opacity: stackOpacity,
                  zIndex,
                }}
              >
                {renderStackedCard(item, index, stackOffset, stackScale, stackOpacity, false)}
              </View>
            );
          })}

          {/* Current Card with REAL SWIPE GESTURES */}
          {allFeaturedContent[currentCardIndex] && (
            <Animated.View
              key={`current-card-${allFeaturedContent[currentCardIndex].id}-${currentCardIndex}`}
              style={{
                position: 'absolute',
                width: screenWidth - CARD_MARGIN * 2,
                height: CARD_HEIGHT,
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: scale },
                  {
                    rotate: rotate.interpolate({
                      inputRange: [-30, 30],
                      outputRange: ['-30deg', '30deg'],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
                zIndex: 2000,
              }}
              {...panResponder.panHandlers} // REAL SWIPE GESTURES!
            >
              {renderStackedCard(
                allFeaturedContent[currentCardIndex],
                currentCardIndex,
                0,
                1,
                1,
                true,
              )}
            </Animated.View>
          )}
        </View>
      </View>

      {/* Exercise List Sheet Modal */}
      <ExerciseListSheet
        visible={showExerciseSheet}
        onClose={() => {
          console.log('🎯 [FeaturedContent2] ExerciseListSheet onClose called');
          setShowExerciseSheet(false);
          setSelectedExerciseId(undefined); // Clear the selected exercise
        }}
        title={selectedTitle}
        learningPathId={selectedPathId}
        initialExerciseId={selectedExerciseId}
      />

      {/* 🔒 Paywall Modal for Learning Paths (from FeaturedContent.tsx) */}
      <RNModal
        visible={showPaywallModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaywallModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowPaywallModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: Dimensions.get('window').width - 60,
              maxHeight: Dimensions.get('window').height * 0.8,
            }}
          >
            <YStack
              backgroundColor="$background"
              borderRadius={24}
              padding={20}
              gap={16}
              borderWidth={1}
              borderColor="$borderColor"
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 8 }}
              shadowOpacity={0.3}
              shadowRadius={16}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={8} flex={1}>
                  <Feather name="lock" size={24} color="#FF9500" />
                  <Text fontSize={20} fontWeight="bold" color="$color" flex={1}>
                    {t('progressScreen.paywall.title') || 'Premium Learning Path'}
                  </Text>
                </XStack>
                <TouchableOpacity onPress={() => setShowPaywallModal(false)}>
                  <Feather name="x" size={24} color="$color" />
                </TouchableOpacity>
              </XStack>

              {paywallPath && (
                <>
                  {/* Path Info */}
                  <YStack gap={12}>
                    <Text fontSize={24} fontWeight="bold" color="$color">
                      {paywallPath.title[lang] || paywallPath.title.en}
                    </Text>
                    <Text fontSize={16} color="$gray11">
                      {paywallPath.description[lang] || paywallPath.description.en}
                    </Text>
                  </YStack>

                  {/* Pricing */}
                  <YStack
                    gap={8}
                    padding={16}
                    backgroundColor="rgba(0, 230, 195, 0.1)"
                    borderRadius={12}
                  >
                    <XStack alignItems="center" justifyContent="center" gap={8}>
                      <Text fontSize={28} fontWeight="bold" color="#00E6C3">
                        ${Math.max(paywallPath.price_usd || 1.0, 1.0)}
                      </Text>
                      <Text fontSize={14} color="$gray11">
                        {t('progressScreen.paywall.oneTime') || 'one-time unlock'}
                      </Text>
                    </XStack>
                  </YStack>

                  {/* Action Buttons */}
                  <XStack gap={12} justifyContent="center">
                    <TouchableOpacity
                      onPress={() => setShowPaywallModal(false)}
                      style={{
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text color="$color">{t('common.cancel') || 'Maybe Later'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        // Simplified payment flow - could be enhanced
                        showToast({
                          title: 'Payment',
                          message: 'Payment system will be integrated soon',
                          type: 'info',
                        });
                        setShowPaywallModal(false);
                      }}
                      style={{
                        backgroundColor: '#00E6C3',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <XStack alignItems="center" gap={6}>
                        <Feather name="credit-card" size={16} color="black" />
                        <Text color="black" fontWeight="bold">
                          {t('progressScreen.paywall.unlock') ||
                            `Unlock for $${Math.max(paywallPath.price_usd || 1.0, 1.0)}`}
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                  </XStack>
                </>
              )}
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      {/* Password Modal */}
      <RNModal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowPasswordModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 350 }}
          >
            <YStack
              backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
              borderRadius={24}
              padding={20}
              gap={16}
              borderWidth={1}
              borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap={8} flex={1}>
                  <MaterialIcons name="lock" size={24} color="#FF9500" />
                  <Text fontSize={20} fontWeight="bold" color="$color" flex={1}>
                    Locked Learning Path
                  </Text>
                </XStack>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
                </TouchableOpacity>
              </XStack>

              {passwordPath && (
                <>
                  <YStack gap={12}>
                    <Text fontSize={24} fontWeight="bold" color="$color">
                      {passwordPath.title[lang] || passwordPath.title.en}
                    </Text>
                    <Text fontSize={16} color="$gray11">
                      This learning path is locked and requires a password to access.
                    </Text>
                  </YStack>

                  {passwordPath.lock_password && (
                    <YStack gap={12}>
                      <Text color="$gray11" fontSize={16}>
                        Enter password to unlock:
                      </Text>
                      <View
                        style={{
                          backgroundColor: 'rgba(255, 147, 0, 0.2)',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#FF9500',
                          padding: 8,
                        }}
                      >
                        <TextInput
                          value={pathPasswordInput}
                          onChangeText={setPathPasswordInput}
                          secureTextEntry
                          style={{
                            backgroundColor: colorScheme === 'dark' ? '#222' : '#F5F5F5',
                            color: colorScheme === 'dark' ? '#fff' : '#000',
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 18,
                          }}
                          placeholder="Enter password"
                          placeholderTextColor="#666"
                          autoCapitalize="none"
                        />
                      </View>
                    </YStack>
                  )}

                  <XStack gap={12} justifyContent="center">
                    <TouchableOpacity
                      onPress={() => setShowPasswordModal(false)}
                      style={{
                        backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text color="$color">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!passwordPath?.lock_password) return;

                        if (pathPasswordInput === passwordPath.lock_password) {
                          // Use shared context to unlock
                          await addUnlockedPath(passwordPath.id);
                          setPathPasswordInput('');
                          setShowPasswordModal(false);

                          showToast({
                            title: 'Unlocked!',
                            message: 'Learning path has been unlocked',
                            type: 'success',
                          });

                          // Now open the exercise sheet
                          setSelectedPathId(passwordPath.id);
                          setSelectedTitle(passwordPath.title[lang] || passwordPath.title.en);
                          setShowExerciseSheet(true);
                        } else {
                          Alert.alert(
                            'Incorrect Password',
                            'The password you entered is incorrect.',
                          );
                        }
                      }}
                      style={{
                        backgroundColor: '#FF9500',
                        padding: 16,
                        borderRadius: 12,
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <Text color="black" fontWeight="bold">
                        Unlock
                      </Text>
                    </TouchableOpacity>
                  </XStack>
                </>
              )}
            </YStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
    </YStack>
  );
}
