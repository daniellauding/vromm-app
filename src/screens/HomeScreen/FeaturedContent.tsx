import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Dimensions, Pressable, Modal as RNModal, TextInput, Alert } from 'react-native';
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

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.7;

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

export function FeaturedContent() {
  const navigation = useNavigation<NavigationProp>();
  const { t, language: lang } = useTranslation();
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
  
  const [featuredPaths, setFeaturedPaths] = useState<FeaturedLearningPath[]>([]);
  const [featuredExercises, setFeaturedExercises] = useState<FeaturedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state for ExerciseListSheet
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  
  // Paywall and Password Lock state
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallPath, setPaywallPath] = useState<FeaturedLearningPath | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPath, setPasswordPath] = useState<FeaturedLearningPath | null>(null);
  const [pathPasswordInput, setPathPasswordInput] = useState('');

  const backgroundColor = colorScheme === 'dark' ? '#1C1C1C' : '#fff';
  const cardBackgroundColor = colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA';

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      setLoading(true);
      console.log('🎯 [FeaturedContent] Fetching featured content...');

      // Fetch featured learning paths
      const { data: pathsData, error: pathsError } = await supabase
        .from('learning_paths')
        .select('id, title, description, icon, image, is_featured, is_locked, lock_password, paywall_enabled, price_usd, price_sek')
        .eq('is_featured', true)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('🎯 [FeaturedContent] Featured paths result:', { pathsData, pathsError });

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
        .limit(5);

      console.log('🎯 [FeaturedContent] Featured exercises result:', { exercisesData, exercisesError });

      if (exercisesError) {
        console.error('Error fetching featured exercises:', exercisesError);
      } else {
        setFeaturedExercises(exercisesData || []);
      }

      console.log('🎯 [FeaturedContent] Final state:', {
        featuredPaths: pathsData?.length || 0,
        featuredExercises: exercisesData?.length || 0,
        hasContent: (pathsData?.length || 0) > 0 || (exercisesData?.length || 0) > 0
      });
    } catch (error) {
      console.error('Error fetching featured content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Access control helper functions
  const isPathPasswordLocked = (path: FeaturedLearningPath): boolean => {
    return !!path.is_locked && !isPathUnlocked(path.id);
  };

  const isPathPaywallLocked = (path: FeaturedLearningPath): boolean => {
    if (!path.paywall_enabled) return false;
    return !hasPathPayment(path.id);
  };

  const checkPathPaywall = async (path: FeaturedLearningPath): Promise<boolean> => {
    if (!path.paywall_enabled) return true;
    if (hasPathPayment(path.id)) return true;
    setPaywallPath(path);
    setShowPaywallModal(true);
    return false;
  };

  const checkPathPassword = async (path: FeaturedLearningPath): Promise<boolean> => {
    if (!path.is_locked) return true;
    if (isPathUnlocked(path.id)) return true;
    setPasswordPath(path);
    setShowPasswordModal(true);
    return false;
  };

  const handleFeaturedPathPress = async (path: FeaturedLearningPath) => {
    console.log('🎯 [FeaturedContent] Featured path pressed:', path.title[lang] || path.title.en);
    
    // Check paywall first
    const canAccessPaywall = await checkPathPaywall(path);
    if (!canAccessPaywall) {
      return; // Paywall modal will be shown
    }

    // Check password lock
    const canAccessPassword = await checkPathPassword(path);
    if (!canAccessPassword) {
      return; // Password modal will be shown
    }
    
    console.log('🎯 [FeaturedContent] Setting selectedPathId:', path.id);
    console.log('🎯 [FeaturedContent] Setting selectedTitle:', path.title[lang] || path.title.en);
    setSelectedPathId(path.id);
    setSelectedTitle(path.title[lang] || path.title.en);
    setShowExerciseSheet(true);
    console.log('🎯 [FeaturedContent] showExerciseSheet set to true');
  };

  const handleFeaturedExercisePress = async (exercise: FeaturedExercise) => {
    console.log('🎯 [FeaturedContent] Featured exercise pressed:', exercise.title[lang] || exercise.title.en);
    
    // Check paywall first
    const canAccessPaywall = await checkPathPaywall(exercise);
    if (!canAccessPaywall) {
      return; // Paywall modal will be shown
    }

    // Check password lock
    const canAccessPassword = await checkPathPassword(exercise);
    if (!canAccessPassword) {
      return; // Password modal will be shown
    }
    
    console.log('🎯 [FeaturedContent] Setting selectedPathId:', exercise.learning_path_id);
    console.log('🎯 [FeaturedContent] Setting selectedTitle:', exercise.title[lang] || exercise.title.en);
    setSelectedPathId(exercise.learning_path_id);
    setSelectedTitle(exercise.title[lang] || exercise.title.en);
    setShowExerciseSheet(true);
    console.log('🎯 [FeaturedContent] showExerciseSheet set to true');
  };

  const handleViewAllFeatured = () => {
    console.log('🎯 [FeaturedContent] View all featured pressed');
    navigation.navigate('ProgressTab', {});
  };

  const handleShowExerciseSheet = () => {
    console.log('🎯 [FeaturedContent] Show exercise sheet pressed');
    // Show a sample learning path for testing
    setSelectedPathId('8bcec2ae-5ea3-4e0e-97ae-cb4e80fd14da'); // Signs & Situations
    setSelectedTitle('Signs & Situations');
    setShowExerciseSheet(true);
  };

  if (loading) {
    return (
      <YStack marginBottom="$6">
        <SectionHeader 
          title={t('home.featuredContent') || 'Featured Learning'} 
        />
        <YStack alignItems="center" justifyContent="center" padding="$4">
          <Text color="$gray11">{t('common.loading') || 'Loading...'}</Text>
        </YStack>
      </YStack>
    );
  }

  const hasContent = featuredPaths.length > 0 || featuredExercises.length > 0;

  if (!hasContent) {
    console.log('🎯 [FeaturedContent] No featured content found, showing fallback');
    return (
      <YStack marginBottom="$6">
        <SectionHeader 
          title={t('home.featuredContent') || 'Featured Learning'} 
        />
        <YStack alignItems="center" justifyContent="center" padding="$4" gap="$2">
          <Feather name="star" size={48} color="#666" />
          <Text color="$gray11" textAlign="center">
            {t('home.noFeaturedContent') || 'No featured content yet'}
          </Text>
          <Text fontSize="$2" color="$gray11" textAlign="center">
            {t('home.featuredContentDescription') || 'Featured learning paths and exercises will appear here'}
          </Text>
          
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack marginBottom="$6">
      <SectionHeader 
        title={t('home.featuredContent') || 'Featured Learning'} 
      />
      
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {/* Featured Learning Paths */}
        {featuredPaths.map((path) => {
          console.log('🎯 [FeaturedContent] Rendering featured path:', path.title[lang] || path.title.en);
          const isPasswordLocked = isPathPasswordLocked(path);
          const isPaywallLocked = isPathPaywallLocked(path);
          
          return (
            <Pressable
              key={`featured-path-${path.id}`}
              onPress={() => {
                console.log('🎯 [FeaturedContent] Pressable onPress triggered for path:', path.title[lang] || path.title.en);
                handleFeaturedPathPress(path);
              }}
              style={({ pressed }) => ({
                flex: 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
            <Card
              width={cardWidth}
              padding="$4"
              backgroundColor={cardBackgroundColor}
              borderRadius="$4"
              borderWidth={1}
              borderColor={isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : (colorScheme === 'dark' ? '#333' : '#E5E5E5')}
              style={{
                shadowColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
                shadowOpacity: (isPasswordLocked || isPaywallLocked) ? 0.3 : 0,
                shadowRadius: (isPasswordLocked || isPaywallLocked) ? 8 : 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <YStack gap="$3" position="relative">
                {/* Lock/Payment indicator badges (top-right corner) */}
                {(isPasswordLocked || isPaywallLocked) && (
                  <XStack
                    position="absolute"
                    top={0}
                    right={0}
                    zIndex={10}
                    gap="$1"
                  >
                    {isPasswordLocked && (
                      <YStack
                        backgroundColor="#FF9500"
                        borderRadius="$2"
                        padding="$1"
                        minWidth={24}
                        alignItems="center"
                      >
                        <MaterialIcons name="lock" size={12} color="white" />
                      </YStack>
                    )}
                    {isPaywallLocked && (
                      <YStack
                        backgroundColor="#00E6C3"
                        borderRadius="$2"
                        padding="$1"
                        minWidth={24}
                        alignItems="center"
                      >
                        <Feather name="credit-card" size={10} color="black" />
                      </YStack>
                    )}
                  </XStack>
                )}
                
                <XStack alignItems="center" gap="$2">
                  {path.icon && (
                    <Feather 
                      name={path.icon as keyof typeof Feather.glyphMap} 
                      size={20} 
                      color="#00FFBC" 
                    />
                  )}
                  <Text fontSize="$3" fontWeight="600" color="#00FFBC">
                    {t('home.learningPath') || 'Learning Path'}
                  </Text>
                </XStack>
                
                <Text fontSize="$5" fontWeight="bold" color="$color" numberOfLines={2}>
                  {path.title?.[lang] || path.title?.en || 'Untitled'}
                </Text>
                
                {path.description?.[lang] && (
                  <Text fontSize="$3" color="$gray11" numberOfLines={3}>
                    {path.description[lang]}
                  </Text>
                )}
                
                <XStack alignItems="center" gap="$2" marginTop="$2">
                  <Feather name="book-open" size={16} color="$gray11" />
                  <Text fontSize="$2" color="$gray11">
                    {t('home.startLearning') || 'Start Learning'}
                  </Text>
                  <Feather name="arrow-right" size={14} color="$gray11" />
                </XStack>
              </YStack>
            </Card>
          </Pressable>
          );
        })}

        {/* Featured Exercises */}
        {featuredExercises.map((exercise) => {
          console.log('🎯 [FeaturedContent] Rendering featured exercise:', exercise.title[lang] || exercise.title.en);
          const isPasswordLocked = isPathPasswordLocked(exercise);
          const isPaywallLocked = isPathPaywallLocked(exercise);
          
          return (
            <Pressable
              key={`featured-exercise-${exercise.id}`}
              onPress={() => {
                console.log('🎯 [FeaturedContent] Pressable onPress triggered for exercise:', exercise.title[lang] || exercise.title.en);
                handleFeaturedExercisePress(exercise);
              }}
              style={({ pressed }) => ({
                flex: 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
            <Card
              width={cardWidth}
              padding="$4"
              backgroundColor={cardBackgroundColor}
              borderRadius="$4"
              borderWidth={1}
              borderColor={isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : (colorScheme === 'dark' ? '#333' : '#E5E5E5')}
              style={{
                shadowColor: isPasswordLocked ? '#FF9500' : isPaywallLocked ? '#00E6C3' : 'transparent',
                shadowOpacity: (isPasswordLocked || isPaywallLocked) ? 0.3 : 0,
                shadowRadius: (isPasswordLocked || isPaywallLocked) ? 8 : 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <YStack gap="$3">
                <XStack alignItems="center" gap="$2">
                  {exercise.icon && (
                    <Feather 
                      name={exercise.icon as keyof typeof Feather.glyphMap} 
                      size={20} 
                      color="#4B6BFF" 
                    />
                  )}
                  <Text fontSize="$3" fontWeight="600" color="#4B6BFF">
                    {t('home.exercise') || 'Exercise'}
                  </Text>
                </XStack>
                
                <Text fontSize="$5" fontWeight="bold" color="$color" numberOfLines={2}>
                  {exercise.title?.[lang] || exercise.title?.en || 'Untitled'}
                </Text>
                
                {exercise.description?.[lang] && (
                  <Text fontSize="$3" color="$gray11" numberOfLines={3}>
                    {exercise.description[lang]}
                  </Text>
                )}
                
                <XStack alignItems="center" gap="$2" marginTop="$2">
                  <Feather name="play-circle" size={16} color="$gray11" />
                  <Text fontSize="$2" color="$gray11">
                    {t('home.startExercise') || 'Start Exercise'}
                  </Text>
                  <Feather name="arrow-right" size={14} color="$gray11" />
                </XStack>
              </YStack>
            </Card>
          </Pressable>
          );
        })}
      </ScrollView>
      
      {/* Exercise List Sheet Modal */}
      {console.log('🎯 [FeaturedContent] Rendering ExerciseListSheet with:', { 
        visible: showExerciseSheet, 
        selectedPathId, 
        selectedTitle 
      })}
      <ExerciseListSheet
        visible={showExerciseSheet}
        onClose={() => {
          console.log('🎯 [FeaturedContent] ExerciseListSheet onClose called');
          setShowExerciseSheet(false);
        }}
        title={selectedTitle}
        learningPathId={selectedPathId}
      />
    </YStack>
  );
}
