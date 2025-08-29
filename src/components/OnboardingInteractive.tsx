import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { YStack, XStack, useTheme, Stack, Card, Button as TamaguiButton } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../contexts/TranslationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { NavigationProp } from '../types/navigation';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';

const { width, height } = Dimensions.get('window');

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'permission' | 'action' | 'selection' | 'info';
  completed?: boolean;
  actionButton?: string;
  skipButton?: string;
}

interface OnboardingInteractiveProps {
  onDone: () => void;
  onSkip?: () => void;
  showAgainKey?: string;
  onCloseModal?: () => void; // Add callback to close the modal
  onReopenModal?: () => void; // Add callback to reopen the modal
}

export function OnboardingInteractive({
  onDone,
  onSkip,
  showAgainKey = 'interactive_onboarding',
  onCloseModal,
  onReopenModal,
}: OnboardingInteractiveProps) {
  const { language, t } = useTranslation();
  const theme = useTheme();
  const { user, profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { showModal } = useModal();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepStates, setStepStates] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // Define the onboarding steps based on GettingStarted component
  const steps: OnboardingStep[] = [
    {
      id: 'location',
      title: 'Location Permission',
      description: 'We need location access to help you create and navigate routes accurately.',
      icon: 'map-pin',
      type: 'permission',
      actionButton: 'Grant Location Access',
      skipButton: 'Skip for now',
    },
    {
      id: 'role',
      title: 'Select Your Role',
      description: 'Tell us about yourself to personalize your experience.',
      icon: 'user',
      type: 'selection',
      actionButton: 'Choose Role',
      skipButton: 'Skip',
    },
    {
      id: 'relationships',
      title: 'Connect with Others',
      description: 'Connect with instructors or students to enhance your learning experience.',
      icon: 'users',
      type: 'action',
      actionButton: 'Set Up Connections',
      skipButton: 'Skip for now',
    },
    {
      id: 'license_plan',
      title: 'Your License Plan',
      description: 'Create a personalized plan for your driving license journey.',
      icon: 'clipboard',
      type: 'action',
      actionButton: 'Create Plan',
      skipButton: 'Skip',
    },
    {
      id: 'create_route',
      title: 'Create Your First Route',
      description: 'Add a driving route you use often to get started.',
      icon: 'plus-circle',
      type: 'action',
      actionButton: 'Create Route',
      skipButton: 'Skip',
    },
    {
      id: 'complete_exercise',
      title: 'Start Learning',
      description: 'Complete your first exercise to begin your driving education.',
      icon: 'play-circle',
      type: 'action',
      actionButton: 'Start Exercise',
      skipButton: 'Skip',
    },
    {
      id: 'save_route',
      title: 'Save a Route',
      description: 'Find and save a route from the community to your collection.',
      icon: 'bookmark',
      type: 'action',
      actionButton: 'Explore Routes',
      skipButton: 'Skip',
    },
  ];

  // Mark onboarding as viewed
  const completeOnboarding = async () => {
    try {
      await completeOnboardingWithVersion(showAgainKey);
      onDone();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onDone();
    }
  };

  // Check completion status on mount
  useEffect(() => {
    checkStepCompletions();
  }, [user, profile]);

  // Refresh completion status when screen comes into focus (when user returns from role/license screens)
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure any profile updates have been processed
      const timeoutId = setTimeout(() => {
        checkStepCompletions();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  const checkStepCompletions = async () => {
    if (!user) return;

    const newCompletedSteps = new Set<string>();

    try {
      // Check location permission
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        newCompletedSteps.add('location');
      }

      // Check role selection
      const typedProfile = profile as typeof profile & {
        role_confirmed?: boolean;
      };
      if (typedProfile?.role_confirmed === true) {
        newCompletedSteps.add('role');
      }

      // Check license plan
      const typedProfilePlan = profile as typeof profile & {
        license_plan_completed?: boolean;
      };
      if (typedProfilePlan?.license_plan_completed === true) {
        newCompletedSteps.add('license_plan');
      }

      // Check created routes
      const { count: routeCount } = await supabase
        .from('routes')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id);
      if (routeCount && routeCount > 0) {
        newCompletedSteps.add('create_route');
      }

      // Check completed exercises
      const { count: exerciseCount } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (exerciseCount && exerciseCount > 0) {
        newCompletedSteps.add('complete_exercise');
      }

      // Check saved routes
      const { count: savedCount } = await supabase
        .from('saved_routes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (savedCount && savedCount > 0) {
        newCompletedSteps.add('save_route');
      }

      setCompletedSteps(newCompletedSteps);
    } catch (error) {
      console.error('Error checking step completions:', error);
    }
  };

  const viewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems[0] && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = (index: number) => {
    if (slidesRef.current && index >= 0 && index < steps.length) {
      slidesRef.current.scrollToIndex({ index });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })(event);
  };

  const nextSlide = () => {
    if (currentIndex < steps.length - 1) {
      scrollTo(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const skipOnboarding = () => {
    if (onSkip) {
      onSkip();
    } else {
      completeOnboarding();
    }
  };

  const handleStepAction = async (step: OnboardingStep) => {
    console.log('🎯 [OnboardingInteractive] Step action:', step.id);

    switch (step.id) {
      case 'location':
        await handleLocationPermission();
        break;
      case 'role':
        await handleRoleSelection();
        break;
      case 'relationships':
        await handleRelationships();
        break;
      case 'license_plan':
        // Close modal before navigating to LicensePlanScreen
        onCloseModal?.();
        navigation.navigate('LicensePlanScreen', {
          fromOnboarding: true,
          onboardingStep: step.id
        });
        break;
      case 'create_route':
        // Close modal before navigating to CreateRouteScreen
        onCloseModal?.();
        navigation.navigate('CreateRoute', {
          fromOnboarding: true,
          onboardingStep: step.id,
          isModal: true,
          onClose: () => {
            // Return to onboarding after route creation
            console.log('🎯 [OnboardingInteractive] Returning from CreateRoute');
            onReopenModal?.();
            checkStepCompletions(); // Refresh completion status
          }
        });
        break;
      case 'complete_exercise':
        // Close modal before navigating to ProgressScreen
        onCloseModal?.();
        navigation.navigate('ProgressTab', { 
          showDetail: false,
          fromOnboarding: true,
          onboardingStep: step.id
        });
        break;
      case 'save_route':
        // Close modal before navigating to MapScreen
        onCloseModal?.();
        navigation.navigate('MapTab', {
          fromOnboarding: true,
          onboardingStep: step.id
        });
        break;
      default:
        console.warn('Unknown step action:', step.id);
    }
  };

  const handleRoleSelection = async () => {
    try {
      // Close modal before navigating to role selection screen
      onCloseModal?.();
      navigation.navigate('RoleSelectionScreen', {
        fromOnboarding: true,
        onboardingStep: 'role'
      });
    } catch (error) {
      console.error('Error handling role selection:', error);
      Alert.alert('Error', 'Failed to open role selection. Please try again.');
    }
  };

  const handleRelationships = async () => {
    try {
      // Close modal before navigating to RoleSelectionScreen with relationships context
      onCloseModal?.();
      navigation.navigate('RoleSelectionScreen', {
        fromOnboarding: true,
        onboardingStep: 'relationships'
      });
    } catch (error) {
      console.error('🎯 [OnboardingInteractive] Error handling relationships:', error);
      Alert.alert('Error', 'Failed to open relationships setup. Please try again.');
    }
  };

  const handleLocationPermission = async () => {
    try {
      console.log('🎯 [OnboardingInteractive] Requesting location permission - this will show native dialog');
      
      // Check current permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();
      console.log('🎯 [OnboardingInteractive] Current permission status:', currentStatus.status);
      
      if (currentStatus.status === 'granted') {
        // Permission already granted
        Alert.alert(
          '✅ Location Already Enabled',
          'Location access is already enabled for this app.',
          [{ text: 'Continue', onPress: () => {
            setCompletedSteps(prev => new Set(prev).add('location'));
            nextSlide();
          }}]
        );
        return;
      }
      
      // Request permission - this shows the native dialog
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🎯 [OnboardingInteractive] Permission request result:', status);
      
      if (status === 'granted') {
        Alert.alert(
          '✅ Location Access Granted',
          'Great! We can now help you with location-based features.',
          [{ text: 'Continue', onPress: () => {
            setCompletedSteps(prev => new Set(prev).add('location'));
            nextSlide();
          }}]
        );
      } else {
        Alert.alert(
          '⚠️ Location Permission Denied',
          'You can still use the app, but some features will be limited. You can enable location access later in Settings.',
          [
            { text: 'Continue Anyway', onPress: nextSlide },
            { text: 'Try Again', onPress: handleLocationPermission }
          ]
        );
      }
    } catch (error) {
      console.error('🎯 [OnboardingInteractive] Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission. Please try again.');
    }
  };

  const handleSkipStep = (step: OnboardingStep) => {
    console.log('⏭️ [OnboardingInteractive] Skipping step:', step.id);
    nextSlide();
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    const isCompleted = completedSteps.has(item.id);
    const isActive = currentIndex === index;

    return (
      <ScrollView
        style={{ width, flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 60,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          minHeight={height - 300}
        >
          {/* Step Icon */}
          <YStack
            alignItems="center"
            justifyContent="center"
            marginBottom="$6"
            minHeight={200}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: isCompleted ? '#10B981' : '#3B82F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Feather 
                name={isCompleted ? 'check' : item.icon as any} 
                size={48} 
                color="white" 
              />
            </View>

            {isCompleted && (
              <View
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginBottom: 16,
                }}
              >
                <Text fontSize={12} color="white" fontWeight="bold">
                  ✅ COMPLETED
                </Text>
              </View>
            )}
          </YStack>

          {/* Step Content */}
          <YStack flex={1} alignItems="center" gap="$4" minHeight={200}>
            <Text
              size="2xl"
              weight="bold"
              textAlign="center"
              fontFamily="$heading"
              color="$color"
            >
              {item.title}
            </Text>
            
            <Text 
              size="lg" 
              intent="muted" 
              textAlign="center"
              paddingHorizontal="$4"
            >
              {isCompleted && (item.id === 'role' || item.id === 'license_plan') 
                ? `${item.description} You can change this anytime.`
                : item.description
              }
            </Text>

            {/* Action Buttons */}
            <YStack gap="$3" marginTop="$6" width="100%" paddingHorizontal="$4">
              {!isCompleted && item.actionButton && (
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => handleStepAction(item)}
                >
                  {item.actionButton}
                </Button>
              )}

              {isCompleted && (
                <Button
                  variant="secondary"
                  size="lg"
                  onPress={() => handleStepAction(item)}
                  backgroundColor="$green5"
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="edit-2" size={20} color="#10B981" />
                    <Text color="#10B981">
                      {item.id === 'role' ? 'Change Role' :
                       item.id === 'license_plan' ? 'Modify License Plan' :
                       item.id === 'location' ? 'Update Permission' :
                       'Done - Tap to revisit'}
                    </Text>
                  </XStack>
                </Button>
              )}

              {item.skipButton && !isCompleted && (
                <Button
                  variant="link"
                  size="md"
                  onPress={() => handleSkipStep(item)}
                >
                  {item.skipButton}
                </Button>
              )}
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    );
  };

  const renderDots = () => {
    return (
      <XStack justifyContent="center" gap="$2" marginBottom="$4">
        {steps.map((step, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const dotWidth = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [10, 20, 10],
            extrapolate: 'clamp',
          });

          const isActive = currentIndex === i;
          const isCompleted = completedSteps.has(step.id);

          return (
            <Animated.View
              key={`dot-${i}`}
              style={{
                width: dotWidth,
                height: 10,
                borderRadius: 5,
                backgroundColor: isCompleted 
                  ? '#10B981' 
                  : isActive 
                    ? '#3B82F6' 
                    : '#374151',
                marginHorizontal: 4,
                opacity,
              }}
            />
          );
        })}
      </XStack>
    );
  };

  const progressPercentage = Math.round((completedSteps.size / steps.length) * 100);

  return (
    <Stack flex={1} bg="$background">
      {/* Progress Header */}
      <View
        style={{
          position: 'absolute',
          top: insets.top || 40,
          left: 16,
          right: 16,
          zIndex: 100,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text size="sm" color="$gray11">
          {progressPercentage}% Complete
        </Text>
        
        <Button
          variant="link"
          size="sm"
          onPress={skipOnboarding}
        >
          Skip All
        </Button>
      </View>

      {/* Previous Button */}
      {currentIndex > 0 && (
        <Button
          variant="link"
          size="md"
          onPress={() => scrollTo(currentIndex - 1)}
          style={{
            position: 'absolute',
            top: insets.top + 60 || 100,
            left: 16,
            zIndex: 100,
          }}
        >
          ← Previous
        </Button>
      )}

      {/* Main Content */}
      <FlatList
        data={steps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={handleScroll}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />

      {/* Bottom Navigation */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        paddingBottom="$6"
        paddingHorizontal="$6"
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$borderColor"
      >
        {renderDots()}

        <YStack marginTop="$4" width="100%">
          <Button 
            variant="primary" 
            size="lg" 
            onPress={nextSlide}
          >
            {currentIndex === steps.length - 1 ? 'Get Started' : 'Next Step'}
          </Button>
        </YStack>

        {/* Progress Summary */}
        <Text
          size="sm"
          color="$gray11"
          textAlign="center"
          marginTop="$2"
        >
          {completedSteps.size} of {steps.length} steps completed
        </Text>
      </YStack>
    </Stack>
  );
}

// Utility function to check if interactive onboarding should be shown
export const shouldShowInteractiveOnboarding = async (key = 'interactive_onboarding'): Promise<boolean> => {
  try {
    const CURRENT_ONBOARDING_VERSION = 1;
    const value = await AsyncStorage.getItem(key);

    if (value === null) {
      return true;
    }

    if (value.startsWith('v')) {
      const lastSeenVersion = parseInt(value.substring(1), 10);
      return lastSeenVersion < CURRENT_ONBOARDING_VERSION;
    }

    return value === 'true';
  } catch (error) {
    console.error('Error reading interactive onboarding status:', error);
    return true;
  }
};

// Utility function to mark interactive onboarding as seen
export const completeOnboardingWithVersion = async (key = 'interactive_onboarding'): Promise<void> => {
  try {
    const CURRENT_ONBOARDING_VERSION = 1;
    await AsyncStorage.setItem(key, `v${CURRENT_ONBOARDING_VERSION}`);
  } catch (error) {
    console.error('Error saving interactive onboarding status with version:', error);
  }
};
