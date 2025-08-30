import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { YStack, XStack, Stack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { NavigationProp } from '../types/navigation';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

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
  onCloseModal?: () => void;
}

export function OnboardingInteractive({
  onDone,
  onSkip,
  showAgainKey = 'interactive_onboarding',
  onCloseModal,
}: OnboardingInteractiveProps) {
  const { user, profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [vehicleType, setVehicleType] = useState<string>('passenger_car');
  const [transmissionType, setTransmissionType] = useState<string>('manual');
  const [licenseType, setLicenseType] = useState<string>('b');
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // Simplified onboarding steps - clear and focused
  const steps: OnboardingStep[] = [
    {
      id: 'location',
      title: 'Enable Location Access',
      description: 'Allow location access to find practice routes near you',
      icon: 'map-pin',
      type: 'permission',
      actionButton: 'Enable Location',
      skipButton: 'Skip for now',
    },
    {
      id: 'license_plan',
      title: 'Your License Journey',
      description: 'Tell us about your driving goals and vehicle preferences',
      icon: 'clipboard',
      type: 'selection',
      actionButton: 'Set My Preferences',
      skipButton: 'Skip for now',
    },
    {
      id: 'role',
      title: 'Select Your Role',
      description: 'Are you learning to drive or teaching others?',
      icon: 'user',
      type: 'selection',
      actionButton: 'Choose Role',
      skipButton: 'Skip for now',
    },
    {
      id: 'relationships',
      title: 'Connect with Others',
      description: 'Connect with instructors or students based on your role',
      icon: 'users',
      type: 'action',
      actionButton: 'Find Connections',
      skipButton: 'Maybe later',
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

  // Refresh completion status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const timeoutId = setTimeout(() => {
        checkStepCompletions();
      }, 500);
      return () => clearTimeout(timeoutId);
    }, []),
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

      // Check license plan completion
      const typedProfilePlan = profile as typeof profile & {
        license_plan_completed?: boolean;
      };
      if (typedProfilePlan?.license_plan_completed === true) {
        newCompletedSteps.add('license_plan');
      }

      // Check role selection
      const typedProfile = profile as typeof profile & {
        role_confirmed?: boolean;
      };
      if (typedProfile?.role_confirmed === true) {
        newCompletedSteps.add('role');
      }

      // Check relationships
      const { count: relationshipCount } = await supabase
        .from('student_supervisor_relationships')
        .select('id', { count: 'exact', head: true })
        .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);
      if (relationshipCount && relationshipCount > 0) {
        newCompletedSteps.add('relationships');
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

  const handleSkipStep = (step: OnboardingStep) => {
    console.log('⏭️ [OnboardingInteractive] Skipping step:', step.id);
    setSkippedSteps((prev) => new Set(prev).add(step.id));
    nextSlide();
  };

  const handleLocationPermission = async () => {
    try {
      console.log('🎯 [OnboardingInteractive] Requesting location permission');

      // Check current permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();

      if (currentStatus.status === 'granted') {
        setLocationStatus('granted');
        setCompletedSteps((prev) => new Set(prev).add('location'));
        nextSlide();
        return;
      }

      // Request permission - this shows the native dialog
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setLocationStatus('granted');
        setCompletedSteps((prev) => new Set(prev).add('location'));
        nextSlide();
      } else {
        setLocationStatus('denied');
        nextSlide(); // Continue anyway
      }
    } catch (error) {
      console.error('🎯 [OnboardingInteractive] Error requesting location permission:', error);
      setLocationStatus('denied');
      nextSlide(); // Continue anyway on error
    }
  };

  const handleSaveLicensePlan = async () => {
    if (!user) return;

    try {
      const licenseData = {
        vehicle_type: vehicleType,
        transmission_type: transmissionType,
        license_type: licenseType,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          license_plan_completed: true,
          license_plan_data: licenseData,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving license plan:', error);
        Alert.alert('Error', 'Could not save your preferences. Please try again.');
      } else {
        setCompletedSteps((prev) => new Set(prev).add('license_plan'));
        checkStepCompletions();
        nextSlide();
      }
    } catch (err) {
      console.error('Error saving license plan:', err);
      Alert.alert('Error', 'Could not save your preferences. Please try again.');
    }
  };

  const handleRoleSelect = async (roleId: string) => {
    if (!user) return;

    try {
      setSelectedRole(roleId);

      // Update the profile with the selected role
      const { error } = await supabase
        .from('profiles')
        .update({
          role: roleId,
          role_confirmed: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving role selection:', error);
        Alert.alert('Error', 'Could not update your role. Please try again.');
      } else {
        setCompletedSteps((prev) => new Set(prev).add('role'));
        checkStepCompletions();
        nextSlide();
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
      Alert.alert('Error', 'Could not update your role. Please try again.');
    }
  };

  const handleRelationships = async () => {
    console.log('🎯 [OnboardingInteractive] Starting relationships setup');
    // Navigate to appropriate screen based on role
    if (selectedRole === 'student' || selectedRole === 'instructor' || selectedRole === 'school') {
      onCloseModal?.();
      navigation.navigate('UsersScreen');
    } else {
      // No role selected, skip this step
      const relationshipsStep = steps.find((s) => s.id === 'relationships');
      if (relationshipsStep) {
        handleSkipStep(relationshipsStep);
      }
    }
  };

  const renderLicensePlanStep = (item: OnboardingStep) => {
    const vehicleTypes = [
      { id: 'passenger_car', title: 'Car', emoji: '🚗' },
      { id: 'motorcycle', title: 'Motorcycle', emoji: '🏍️' },
      { id: 'truck', title: 'Truck', emoji: '🚚' },
    ];

    const transmissionTypes = [
      { id: 'manual', title: 'Manual', emoji: '⚙️' },
      { id: 'automatic', title: 'Automatic', emoji: '🤖' },
    ];

    const licenseTypes = [
      { id: 'b', title: 'Standard License (B)', emoji: '📜' },
      { id: 'a', title: 'Motorcycle License (A)', emoji: '🏍️' },
      { id: 'c', title: 'Truck License (C)', emoji: '🚚' },
    ];

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
        <YStack flex={1} alignItems="center" justifyContent="center" minHeight={height - 300}>
          {/* Step Header */}
          <YStack alignItems="center" marginBottom="$6">
            <Text size="2xl" weight="bold" textAlign="center" color="$color">
              {item.title}
            </Text>
            <Text size="lg" intent="muted" textAlign="center" paddingHorizontal="$4" marginTop="$2">
              {item.description}
            </Text>
          </YStack>

          {/* Vehicle Type Selection */}
          <YStack gap="$4" width="100%" paddingHorizontal="$4">
            <Text size="md" weight="bold" color="$color">
              Vehicle Type
            </Text>
            <XStack gap="$3" justifyContent="center">
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setVehicleType(type.id)}
                  style={{
                    borderWidth: 2,
                    borderColor: vehicleType === type.id ? '#3B82F6' : '#E5E7EB',
                    borderRadius: 12,
                    backgroundColor: vehicleType === type.id ? '#EBF4FF' : 'transparent',
                    padding: 16,
                    alignItems: 'center',
                    flex: 1,
                  }}
                >
                  <Text fontSize={32} marginBottom="$2">
                    {type.emoji}
                  </Text>
                  <Text
                    size="sm"
                    weight="bold"
                    color={vehicleType === type.id ? '#3B82F6' : '$color'}
                  >
                    {type.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </XStack>

            {/* Transmission Type Selection */}
            <Text size="md" weight="bold" color="$color" marginTop="$4">
              Transmission
            </Text>
            <XStack gap="$3" justifyContent="center">
              {transmissionTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setTransmissionType(type.id)}
                  style={{
                    borderWidth: 2,
                    borderColor: transmissionType === type.id ? '#3B82F6' : '#E5E7EB',
                    borderRadius: 12,
                    backgroundColor: transmissionType === type.id ? '#EBF4FF' : 'transparent',
                    padding: 16,
                    alignItems: 'center',
                    flex: 1,
                  }}
                >
                  <Text fontSize={32} marginBottom="$2">
                    {type.emoji}
                  </Text>
                  <Text
                    size="sm"
                    weight="bold"
                    color={transmissionType === type.id ? '#3B82F6' : '$color'}
                  >
                    {type.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </XStack>

            {/* License Type Selection */}
            <Text size="md" weight="bold" color="$color" marginTop="$4">
              License Type
            </Text>
            <YStack gap="$2">
              {licenseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setLicenseType(type.id)}
                  style={{
                    borderWidth: 2,
                    borderColor: licenseType === type.id ? '#3B82F6' : '#E5E7EB',
                    borderRadius: 12,
                    backgroundColor: licenseType === type.id ? '#EBF4FF' : 'transparent',
                    padding: 16,
                  }}
                >
                  <XStack alignItems="center" gap="$3">
                    <Text fontSize={24}>{type.emoji}</Text>
                    <Text
                      size="md"
                      weight="bold"
                      color={licenseType === type.id ? '#3B82F6' : '$color'}
                    >
                      {type.title}
                    </Text>
                    {licenseType === type.id && (
                      <Feather name="check-circle" size={20} color="#3B82F6" />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </YStack>

            {/* Save Button */}
            <Button
              variant="primary"
              size="lg"
              onPress={handleSaveLicensePlan}
              marginTop="$6"
            >
              <Text>Save My Preferences</Text>
            </Button>

            {/* Skip Button */}
            {item.skipButton && (
              <Button
                variant="link"
                size="md"
                onPress={() => handleSkipStep(item)}
                marginTop="$2"
              >
                <Text>{item.skipButton}</Text>
              </Button>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    );
  };

  const renderRoleSelectionStep = (item: OnboardingStep) => {
    const roles = [
      {
        id: 'student',
        title: 'Student',
        description: 'I want to learn to drive',
        emoji: '🎓',
      },
      {
        id: 'instructor',
        title: 'Instructor',
        description: 'I teach others to drive',
        emoji: '🏋️',
      },
      {
        id: 'school',
        title: 'Driving School',
        description: 'I represent a driving school',
        emoji: '🏢',
      },
    ];

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
        <YStack flex={1} alignItems="center" justifyContent="center" minHeight={height - 300}>
          {/* Step Header */}
          <YStack alignItems="center" marginBottom="$6">
            <Text size="2xl" weight="bold" textAlign="center" color="$color">
              {item.title}
            </Text>
            <Text
              size="lg"
              intent="muted"
              textAlign="center"
              paddingHorizontal="$4"
              marginTop="$2"
            >
              {item.description}
            </Text>
          </YStack>

          {/* Role Options */}
          <YStack gap="$3" width="100%" paddingHorizontal="$4">
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => handleRoleSelect(role.id)}
                style={{
                  borderWidth: 2,
                  borderColor: selectedRole === role.id ? '#3B82F6' : '#E5E7EB',
                  borderRadius: 16,
                  backgroundColor: selectedRole === role.id ? '#EBF4FF' : 'transparent',
                  padding: 20,
                }}
              >
                <XStack alignItems="center" gap="$4">
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: selectedRole === role.id ? '#3B82F6' : '#F3F4F6',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text fontSize={24}>{role.emoji}</Text>
                  </View>

                  <YStack flex={1}>
                    <Text
                      size="lg"
                      weight="bold"
                      color={selectedRole === role.id ? '#3B82F6' : '$color'}
                    >
                      {role.title}
                    </Text>
                    <Text size="md" intent="muted" marginTop="$1">
                      {role.description}
                    </Text>
                  </YStack>

                  {selectedRole === role.id && (
                    <Feather name="check-circle" size={24} color="#3B82F6" />
                  )}
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>

          {/* Skip Button */}
          {item.skipButton && (
            <Button
              variant="link"
              size="md"
              onPress={() => handleSkipStep(item)}
              marginTop="$6"
            >
              <Text>{item.skipButton}</Text>
            </Button>
          )}
        </YStack>
      </ScrollView>
    );
  };

  const renderSimpleStep = (item: OnboardingStep, isCompleted: boolean, isSkipped: boolean) => {
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
        <YStack flex={1} alignItems="center" justifyContent="center" minHeight={height - 300}>
          {/* Step Icon */}
          <YStack alignItems="center" justifyContent="center" marginBottom="$6" minHeight={200}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: isCompleted ? '#10B981' : isSkipped ? '#F59E0B' : '#3B82F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Feather
                name={
                  isCompleted ? 'check' : isSkipped ? 'skip-forward' : (item.icon as keyof typeof Feather.glyphMap)
                }
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

            {isSkipped && (
              <View
                style={{
                  backgroundColor: '#F59E0B',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginBottom: 16,
                }}
              >
                <Text fontSize={12} color="white" fontWeight="bold">
                  ⏭️ SKIPPED
                </Text>
              </View>
            )}
          </YStack>

          {/* Step Content */}
          <YStack flex={1} alignItems="center" gap="$4" minHeight={200}>
            <Text size="2xl" weight="bold" textAlign="center" color="$color">
              {item.title}
            </Text>

            <Text size="lg" intent="muted" textAlign="center" paddingHorizontal="$4">
              {item.description}
            </Text>

            {/* Location Status */}
            {item.id === 'location' && locationStatus !== 'unknown' && (
              <View
                style={{
                  backgroundColor: locationStatus === 'granted' ? '#10B981' : '#EF4444',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginTop: 8,
                }}
              >
                <Text fontSize={14} color="white" fontWeight="600">
                  {locationStatus === 'granted' ? '✅ Location Enabled' : '⚠️ Limited Features'}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <YStack gap="$3" marginTop="$6" width="100%" paddingHorizontal="$4">
              {item.id === 'location' ? (
                <Button variant="primary" size="lg" onPress={handleLocationPermission}>
                  <Text>{item.actionButton}</Text>
                </Button>
              ) : item.id === 'relationships' ? (
                <Button variant="primary" size="lg" onPress={handleRelationships}>
                  <Text>{item.actionButton}</Text>
                </Button>
              ) : (
                <Button variant="primary" size="lg" onPress={() => nextSlide()}>
                  <Text>Continue</Text>
                </Button>
              )}

              {item.skipButton && (
                <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                  <Text>{item.skipButton}</Text>
                </Button>
              )}
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>
    );
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    const isCompleted = completedSteps.has(item.id);
    const isSkipped = skippedSteps.has(item.id);

    // Special rendering for license plan step
    if (item.id === 'license_plan' && !isCompleted) {
      return renderLicensePlanStep(item);
    }

    // Special rendering for role selection step
    if (item.id === 'role' && !isCompleted) {
      return renderRoleSelectionStep(item);
    }

    // Simple step rendering for others
    return renderSimpleStep(item, isCompleted, isSkipped);
  };

  const renderDots = () => {
    return (
      <XStack justifyContent="center" gap="$2" marginBottom="$4">
        {steps.map((step, i) => {
          const isActive = currentIndex === i;
          const isCompleted = completedSteps.has(step.id);
          const isSkipped = skippedSteps.has(step.id);

          return (
            <View
              key={`dot-${i}`}
              style={{
                width: isActive ? 20 : 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: isCompleted
                  ? '#10B981'
                  : isSkipped
                    ? '#F59E0B'
                    : isActive
                      ? '#3B82F6'
                      : '#374151',
                marginHorizontal: 4,
              }}
            />
          );
        })}
      </XStack>
    );
  };

  return (
    <Stack flex={1} bg="$background">
      {/* Simple Progress Header */}
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
          Step {currentIndex + 1} of {steps.length}
        </Text>

        <Button variant="link" size="sm" onPress={skipOnboarding}>
          <Text>Skip All</Text>
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
            top: insets.top + 80 || 120,
            left: 16,
            zIndex: 100,
          }}
        >
          <Text>← Previous</Text>
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
          <Button variant="primary" size="lg" onPress={nextSlide}>
            <Text>{currentIndex === steps.length - 1 ? 'Start Using Vromm!' : 'Next Step'}</Text>
          </Button>
        </YStack>

        {/* Simple Progress Summary */}
        <Text size="sm" color="$gray11" textAlign="center" marginTop="$2">
          {completedSteps.size} of {steps.length} steps completed
        </Text>
      </YStack>
    </Stack>
  );
}

// Utility function to check if interactive onboarding should be shown
export const shouldShowInteractiveOnboarding = async (
  key = 'interactive_onboarding',
): Promise<boolean> => {
  try {
    const CURRENT_ONBOARDING_VERSION = 2; // Updated to show new onboarding flow
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
export const completeOnboardingWithVersion = async (
  key = 'interactive_onboarding',
): Promise<void> => {
  try {
    const CURRENT_ONBOARDING_VERSION = 2; // Updated to match the check function
    await AsyncStorage.setItem(key, `v${CURRENT_ONBOARDING_VERSION}`);
  } catch (error) {
    console.error('Error saving interactive onboarding status with version:', error);
  }
};
