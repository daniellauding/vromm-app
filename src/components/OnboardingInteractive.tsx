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
  Modal,
  TextInput,
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
import { useLocation } from '../context/LocationContext';

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
  const { setUserLocation } = useLocation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [vehicleType, setVehicleType] = useState<string>('passenger_car');
  const [transmissionType, setTransmissionType] = useState<string>('manual');
  const [licenseType, setLicenseType] = useState<string>('b');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showCityDrawer, setShowCityDrawer] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [showConnectionsDrawer, setShowConnectionsDrawer] = useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState(false);
  const [showTransmissionDrawer, setShowTransmissionDrawer] = useState(false);
  const [showLicenseDrawer, setShowLicenseDrawer] = useState(false);
  const [citySearchResults, setCitySearchResults] = useState<any[]>([]);
  const [citySearchTimeout, setCitySearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // Vehicle type options
  const vehicleTypes = [
    { id: 'passenger_car', title: 'Car' },
    { id: 'motorcycle', title: 'Motorcycle' },
    { id: 'truck', title: 'Truck' },
  ];

  const transmissionTypes = [
    { id: 'manual', title: 'Manual' },
    { id: 'automatic', title: 'Automatic' },
  ];

  const licenseTypes = [
    { id: 'b', title: 'Standard License (B)' },
    { id: 'a', title: 'Motorcycle License (A)' },
    { id: 'c', title: 'Truck License (C)' },
  ];

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
    {
      id: 'complete',
      title: 'Ready for Your Journey!',
      description: 'Ready to become a confident driver! Explore the app, progress in exercises, save and upload routes, and discover a community of drivers like you.',
      icon: 'check-circle',
      type: 'info',
      actionButton: 'Start My Journey',
      skipButton: undefined,
    },
  ];

  // Mark onboarding as viewed
  const completeOnboarding = async () => {
    try {
      await completeOnboardingWithVersion(showAgainKey, user?.id);
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

  // Clean up search timeout on unmount
  useEffect(() => {
    return () => {
      if (citySearchTimeout) {
        clearTimeout(citySearchTimeout);
      }
    };
  }, [citySearchTimeout]);

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
        // User can still select city or skip
      }
    } catch (error) {
      console.error('🎯 [OnboardingInteractive] Error requesting location permission:', error);
      setLocationStatus('denied');
      // Don't auto-continue on error, let user choose
    }
  };

  const handleCitySelect = async (cityData: any) => {
    const cityName = [cityData.city, cityData.region, cityData.country].filter(Boolean).join(', ');

    setSelectedCity(cityName);
    setShowCityDrawer(false);
    setCitySearchQuery('');
    setCitySearchResults([]);

    // Save city selection to profile and LocationContext
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            preferred_city: cityName,
            preferred_city_coords: cityData.coords,
          })
          .eq('id', user.id);

        if (!error) {
          // Update LocationContext with selected location
          await setUserLocation({
            name: cityName,
            latitude: cityData.coords.latitude,
            longitude: cityData.coords.longitude,
            source: 'onboarding',
            timestamp: new Date().toISOString(),
          });

          setCompletedSteps((prev) => new Set(prev).add('location'));
          nextSlide();
        }
      } catch (err) {
        console.error('Error saving city:', err);
      }
    }
  };



  const handleCitySearch = async (query: string) => {
    setCitySearchQuery(query);

    // Clear previous timeout
    if (citySearchTimeout) {
      clearTimeout(citySearchTimeout);
    }

    if (!query.trim()) {
      setCitySearchResults([]);
      return;
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      try {
        // Try with original query first
        let results = await Location.geocodeAsync(query);

        // If no results, try with more specific search terms
        if (results.length === 0) {
          const searchTerms = [
            `${query}, Sweden`,
            `${query}, United States`,
            `${query}, Europe`,
            query, // Original query as fallback
          ];

          for (const term of searchTerms) {
            results = await Location.geocodeAsync(term);
            if (results.length > 0) break;
          }
        }

        if (results.length > 0) {
          const addresses = await Promise.all(
            results.map(async (result) => {
              try {
                const address = await Location.reverseGeocodeAsync({
                  latitude: result.latitude,
                  longitude: result.longitude,
                });
                return {
                  ...address[0],
                  coords: {
                    latitude: result.latitude,
                    longitude: result.longitude,
                  },
                };
              } catch (err) {
                return null;
              }
            })
          );

          // Filter out null values and duplicates
          const uniqueAddresses = addresses.filter(
            (addr, index, self) =>
              addr &&
              addr.coords &&
              index ===
                self.findIndex(
                  (a) =>
                    a?.coords?.latitude === addr.coords?.latitude &&
                    a?.coords?.longitude === addr.coords?.longitude,
                ),
          );

          setCitySearchResults(uniqueAddresses);
        } else {
          setCitySearchResults([]);
        }
      } catch (err) {
        console.error('City geocoding error:', err);
        setCitySearchResults([]);
      }
    }, 300);

    setCitySearchTimeout(timeout);
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
        // Don't auto-advance - let user press Next Step
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
        // Don't auto-advance - let user press Next Step
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
      Alert.alert('Error', 'Could not update your role. Please try again.');
    }
  };

  const handleSearchUsers = async (query: string) => {
    setConnectionSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // Search based on user's role
      let targetRole = '';
      if (selectedRole === 'student') {
        targetRole = 'instructor'; // Students search for instructors
      } else if (selectedRole === 'instructor' || selectedRole === 'school') {
        targetRole = 'student'; // Instructors search for students
      }

      let query_builder = supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      // Filter by target role if we have one
      if (targetRole) {
        query_builder = query_builder.eq('role', targetRole);
      }

      const { data, error } = await query_builder;

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleConnectWithUser = async (targetUser: any) => {
    try {
      let studentId, supervisorId;
      if (selectedRole === 'student') {
        studentId = user?.id;
        supervisorId = targetUser.id;
      } else {
        studentId = targetUser.id;
        supervisorId = user?.id;
      }

      // First check if relationship already exists
      const { data: existingRelationship } = await supabase
        .from('student_supervisor_relationships')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('supervisor_id', supervisorId)
        .single();

      if (existingRelationship) {
        // Silently handle existing relationship
        setShowConnectionsDrawer(false);
        setCompletedSteps((prev) => new Set(prev).add('relationships'));
            nextSlide();
        return;
      }
      
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .insert({
          student_id: studentId,
          supervisor_id: supervisorId,
          status: 'active'
        });

      if (error) {
        // Handle duplicate key error gracefully
        if (error.code === '23505') {
          // Silently handle duplicate relationship
          setShowConnectionsDrawer(false);
          setCompletedSteps((prev) => new Set(prev).add('relationships'));
            nextSlide();
          return;
        }
        throw error;
      }

      // Silently complete connection and continue
      setShowConnectionsDrawer(false);
      setCompletedSteps((prev) => new Set(prev).add('relationships'));
    nextSlide();
    } catch (error) {
      console.error('Error creating connection:', error);
      // Silently continue even on error
      setShowConnectionsDrawer(false);
      handleSkipStep(steps.find((s) => s.id === 'relationships')!);
    }
  };

  const renderLicensePlanStep = (item: OnboardingStep) => {

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
            <YStack gap="$3" width="100%" paddingHorizontal="$4">
              <Text size="md" weight="bold" color="$color">
                Vehicle Type
              </Text>
              <Button
                variant="secondary"
                size="lg"
                onPress={() => setShowVehicleDrawer(true)}
              >
                <Text>{vehicleTypes.find((v) => v.id === vehicleType)?.title || 'Car'}</Text>
              </Button>

                          {/* Transmission Type Selection */}
              <Text size="md" weight="bold" color="$color" marginTop="$4">
                Transmission
              </Text>
              <Button
                variant="secondary"
                size="lg"
                onPress={() => setShowTransmissionDrawer(true)}
              >
                <Text>{transmissionTypes.find((t) => t.id === transmissionType)?.title || 'Manual'}</Text>
              </Button>

                          {/* License Type Selection */}
              <Text size="md" weight="bold" color="$color" marginTop="$4">
                License Type
              </Text>
              <Button
                variant="secondary"
                size="lg"
                onPress={() => setShowLicenseDrawer(true)}
              >
                <Text>{licenseTypes.find((l) => l.id === licenseType)?.title || 'Standard License (B)'}</Text>
              </Button>

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
      },
      {
        id: 'instructor',
        title: 'Instructor',
        description: 'I teach others to drive',
      },
      {
        id: 'school',
        title: 'Driving School',
        description: 'I represent a driving school',
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
            <Text size="lg" intent="muted" textAlign="center" paddingHorizontal="$4" marginTop="$2">
              {item.description}
            </Text>
          </YStack>

          {/* Role Options */}
          <YStack gap="$2" width="100%" paddingHorizontal="$4">
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => handleRoleSelect(role.id)}
                style={{
                  backgroundColor: selectedRole === role.id ? '$blue5' : '$backgroundStrong',
                  padding: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: selectedRole === role.id ? '$blue8' : '$borderColor',
                }}
              >
                <XStack alignItems="center" justifyContent="space-between">
                  <YStack>
                    <Text size="md" weight="bold" color={selectedRole === role.id ? '$blue12' : '$color'}>
                      {role.title}
                </Text>
                    <Text size="sm" color="$gray11">
                      {role.description}
                    </Text>
                  </YStack>
                  {selectedRole === role.id && (
                    <Feather name="check" size={20} color="$blue11" />
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
                    {/* Simplified Step Content */}
          <YStack alignItems="center" gap="$4" paddingHorizontal="$4">
            <Text size="xl" weight="bold" textAlign="center" color="$color">
              {item.title}
            </Text>
            
            <Text size="md" color="$gray11" textAlign="center">
              {item.description}
            </Text>

            {/* Removed status indicators - users can always interact */}

            {/* Location options - always available */}
            {item.id === 'location' && (
              <YStack gap="$3" marginTop="$4" width="100%">
                <Button variant="primary" size="lg" onPress={handleLocationPermission}>
                  <Text>Enable Location</Text>
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onPress={() => setShowCityDrawer(true)}
                >
                  <Text>{selectedCity || 'Or Select Your City'}</Text>
                </Button>
                
                <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                  <Text>Skip for now</Text>
                </Button>
              </YStack>
            )}

            {/* Action Buttons - Only show for non-location steps */}
            {item.id !== 'location' && (
              <YStack gap="$3" marginTop="$6" width="100%" paddingHorizontal="$4">
                {item.id === 'relationships' ? (
                  <Button variant="primary" size="lg" onPress={() => setShowConnectionsDrawer(true)}>
                    <Text>Find Connections</Text>
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
            )}
          </YStack>
        </YStack>
      </ScrollView>
    );
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    const isCompleted = completedSteps.has(item.id);
    const isSkipped = skippedSteps.has(item.id);

    // Special rendering for license plan step (always editable)
    if (item.id === 'license_plan') {
      return renderLicensePlanStep(item);
    }

    // Special rendering for role selection step (always editable)
    if (item.id === 'role') {
      return renderRoleSelectionStep(item);
    }

    // Simple step rendering for others
    return renderSimpleStep(item, isCompleted, isSkipped);
  };

  // Removed renderDots - using visual progress indicator in header instead

  return (
    <Stack flex={1} bg="$background">
      {/* Progress Header with Visual Indicator */}
      <View
        style={{
          position: 'absolute',
          top: (insets.top || 40) + 8,
          left: 0,
          right: 0,
          zIndex: 100,
          alignItems: 'center',
        }}
      >
        {/* Visual Progress Indicator */}
        <XStack gap="$1" alignItems="center">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
          const isCompleted = completedSteps.has(step.id);
            const isSkipped = skippedSteps.has(step.id);

          return (
              <View
                key={step.id}
              style={{
                  width: isActive ? 24 : 12,
                  height: 6,
                  borderRadius: 3,
                backgroundColor: isCompleted 
                  ? '#10B981' 
                    : isSkipped 
                      ? '#F59E0B'
                  : isActive 
                        ? '#3B82F6' // Primary blue for current step
                        : '#374151', // Gray for pending steps
                  marginHorizontal: 2,
              }}
            />
          );
        })}
      </XStack>
      </View>

      {/* Navigation Buttons */}
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
      {/* Previous Button */}
        {currentIndex > 0 ? (
          <TouchableOpacity
          onPress={() => scrollTo(currentIndex - 1)}
          style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Feather name="chevron-left" size={20} color="$gray11" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        
        {/* Skip All Button */}
        <TouchableOpacity
          onPress={skipOnboarding}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text size="sm" color="$gray11">Skip All</Text>
        </TouchableOpacity>
      </View>

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
        <YStack width="100%">
          <Button variant="primary" size="lg" onPress={nextSlide}>
            <Text>{currentIndex === steps.length - 1 ? 'Start Using Vromm!' : 'Next Step'}</Text>
          </Button>
        </YStack>
      </YStack>

      {/* City Selection Modal */}
      <Modal
        visible={showCityDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityDrawer(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowCityDrawer(false)}
          />
          <YStack
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            maxHeight="70%"
          >
            <Text size="lg" weight="bold" color="$color" marginBottom="$4" textAlign="center">
              Select Your City
            </Text>
            
            <TextInput
              placeholder="Search cities... (try 'Ystad', 'New York', etc.)"
              value={citySearchQuery}
              onChangeText={handleCitySearch}
              style={{
                backgroundColor: '$backgroundStrong',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                color: '$color',
                borderWidth: 1,
                borderColor: '$borderColor',
              }}
              placeholderTextColor="$gray10"
            />
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$1">
                {citySearchResults.length === 0 && citySearchQuery.length >= 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    No cities found for "{citySearchQuery}"
                  </Text>
                )}
                
                {citySearchResults.length === 0 && citySearchQuery.length < 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    Start typing to search for any city worldwide
                  </Text>
                )}
                
                {citySearchResults.map((cityData, index) => {
                  const cityName = [cityData.city, cityData.region, cityData.country]
                    .filter(Boolean)
                    .join(', ');
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleCitySelect(cityData)}
                      style={{
                        backgroundColor: selectedCity === cityName ? '$blue5' : '$backgroundStrong',
                        padding: 16,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selectedCity === cityName ? '$blue8' : '$borderColor',
                      }}
                    >
                      <XStack alignItems="center" justifyContent="space-between">
                        <YStack>
                          <Text size="md" color={selectedCity === cityName ? '$blue12' : '$color'}>
                            {cityName}
                          </Text>
                          <Text size="xs" color="$gray11">
                            {cityData.coords?.latitude.toFixed(4)}, {cityData.coords?.longitude.toFixed(4)}
                          </Text>
                        </YStack>
                        {selectedCity === cityName && (
                          <Feather name="check" size={20} color="$blue11" />
                        )}
                      </XStack>
                    </TouchableOpacity>
                  );
                })}
              </YStack>
            </ScrollView>
          </YStack>
        </View>
      </Modal>

      {/* Connections Selection Modal */}
      <Modal
        visible={showConnectionsDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConnectionsDrawer(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowConnectionsDrawer(false)}
          />
          <YStack
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            maxHeight="70%"
          >
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text size="lg" weight="bold" color="$color">
                Find {selectedRole === 'student' ? 'Instructors' : selectedRole === 'instructor' || selectedRole === 'school' ? 'Students' : 'Users'}
              </Text>
              {/* Removed X button */}
            </XStack>
            
            <Text size="sm" color="$gray11" marginBottom="$3">
              Search for {selectedRole === 'student' ? 'driving instructors' : selectedRole === 'instructor' || selectedRole === 'school' ? 'students' : 'users'} to connect with
            </Text>
            
            <TextInput
              placeholder="Search by name or email..."
              value={connectionSearchQuery}
              onChangeText={handleSearchUsers}
              style={{
                backgroundColor: '$backgroundStrong',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                color: '$color',
                borderWidth: 1,
                borderColor: '$borderColor',
              }}
              placeholderTextColor="$gray10"
            />
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$2">
                {searchResults.length === 0 && connectionSearchQuery.length >= 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    No users found
                  </Text>
                )}
                
                {searchResults.length === 0 && connectionSearchQuery.length < 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    Start typing to search for users
                  </Text>
                )}
                
                {searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => handleConnectWithUser(user)}
                    style={{
                      backgroundColor: '$backgroundStrong',
                      padding: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '$borderColor',
                    }}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <YStack>
                        <Text size="md" weight="bold" color="$color">
                          {user.full_name || 'Unknown User'}
                        </Text>
                        <Text size="sm" color="$gray11">
                          {user.email} • {user.role}
                        </Text>
                      </YStack>
                      <Feather name="plus-circle" size={20} color="$blue11" />
                    </XStack>
                  </TouchableOpacity>
                ))}
                
                {/* Skip option */}
          <Button 
                  variant="link"
                  size="md"
                  onPress={() => {
                    setShowConnectionsDrawer(false);
                    handleSkipStep(steps.find((s) => s.id === 'relationships')!);
                  }}
                  marginTop="$4"
                >
                  <Text>I'll do this later</Text>
          </Button>
        </YStack>
            </ScrollView>
          </YStack>
        </View>
      </Modal>

      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehicleDrawer(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowVehicleDrawer(false)}
          />
          <YStack
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
          >
            <Text size="lg" weight="bold" color="$color" marginBottom="$4" textAlign="center">
              Select Vehicle Type
        </Text>
            
            <YStack gap="$1">
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setVehicleType(type.id);
                    setShowVehicleDrawer(false);
                  }}
                  style={{
                    backgroundColor: vehicleType === type.id ? '$blue5' : '$backgroundStrong',
                    padding: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: vehicleType === type.id ? '$blue8' : '$borderColor',
                  }}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text size="md" color={vehicleType === type.id ? '$blue12' : '$color'}>
                      {type.title}
                    </Text>
                    {vehicleType === type.id && (
                      <Feather name="check" size={20} color="$blue11" />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
      </YStack>
          </YStack>
        </View>
      </Modal>

      {/* Transmission Type Selection Modal */}
      <Modal
        visible={showTransmissionDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransmissionDrawer(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowTransmissionDrawer(false)}
          />
          <YStack
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
          >
            <Text size="lg" weight="bold" color="$color" marginBottom="$4" textAlign="center">
              Select Transmission
            </Text>
            
            <YStack gap="$1">
              {transmissionTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setTransmissionType(type.id);
                    setShowTransmissionDrawer(false);
                  }}
                  style={{
                    backgroundColor: transmissionType === type.id ? '$blue5' : '$backgroundStrong',
                    padding: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: transmissionType === type.id ? '$blue8' : '$borderColor',
                  }}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text size="md" color={transmissionType === type.id ? '$blue12' : '$color'}>
                      {type.title}
                    </Text>
                    {transmissionType === type.id && (
                      <Feather name="check" size={20} color="$blue11" />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </YStack>
          </YStack>
        </View>
      </Modal>

      {/* License Type Selection Modal */}
      <Modal
        visible={showLicenseDrawer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLicenseDrawer(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowLicenseDrawer(false)}
          />
          <YStack
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
          >
            <Text size="lg" weight="bold" color="$color" marginBottom="$4" textAlign="center">
              Select License Type
            </Text>
            
            <YStack gap="$1">
              {licenseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setLicenseType(type.id);
                    setShowLicenseDrawer(false);
                  }}
                  style={{
                    backgroundColor: licenseType === type.id ? '$blue5' : '$backgroundStrong',
                    padding: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: licenseType === type.id ? '$blue8' : '$borderColor',
                  }}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text size="md" color={licenseType === type.id ? '$blue12' : '$color'}>
                      {type.title}
                    </Text>
                    {licenseType === type.id && (
                      <Feather name="check" size={20} color="$blue11" />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </YStack>
          </YStack>
        </View>
      </Modal>
    </Stack>
  );
}

// Utility function to check if interactive onboarding should be shown (USER-BASED)
export const shouldShowInteractiveOnboarding = async (
  key = 'interactive_onboarding',
  userId?: string,
): Promise<boolean> => {
  try {
    const CURRENT_ONBOARDING_VERSION = 2;
    
    if (!userId) {
      console.log('🎯 [OnboardingInteractive] No user ID - showing onboarding');
      return true;
    }

    // Check user's profile for onboarding completion (USER-BASED)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('interactive_onboarding_completed, interactive_onboarding_version')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('🎯 [OnboardingInteractive] Error checking user profile:', error);
      return true; // Show onboarding on error
    }

    console.log('🎯 [OnboardingInteractive] User-based onboarding check:', {
      userId,
      currentVersion: CURRENT_ONBOARDING_VERSION,
      userCompleted: profile?.interactive_onboarding_completed,
      userVersion: profile?.interactive_onboarding_version,
    });

    // If user hasn't completed onboarding, show it
    if (!profile?.interactive_onboarding_completed) {
      console.log('🎯 [OnboardingInteractive] User has not completed onboarding - showing');
      return true;
    }

    // If user completed onboarding but version is outdated, show it
    const userVersion = profile?.interactive_onboarding_version || 1;
    if (userVersion < CURRENT_ONBOARDING_VERSION) {
      console.log('🎯 [OnboardingInteractive] User onboarding version outdated - showing');
      return true;
    }

    console.log('🎯 [OnboardingInteractive] User has completed current onboarding version - not showing');
    return false;
  } catch (error) {
    console.error('Error checking interactive onboarding status:', error);
    return true; // Show onboarding on error
  }
};

// Utility function to mark interactive onboarding as seen (USER-BASED)
export const completeOnboardingWithVersion = async (
  key = 'interactive_onboarding',
  userId?: string,
): Promise<void> => {
  try {
    const CURRENT_ONBOARDING_VERSION = 2;
    
    if (!userId) {
      console.error('🎯 [OnboardingInteractive] Cannot complete onboarding - no user ID');
      return;
    }

    // Save completion to user's profile (USER-BASED)
    const { error } = await supabase
      .from('profiles')
      .update({
        interactive_onboarding_completed: true,
        interactive_onboarding_version: CURRENT_ONBOARDING_VERSION,
      })
      .eq('id', userId);

    if (error) {
      console.error('🎯 [OnboardingInteractive] Error saving onboarding completion to profile:', error);
      // Fallback to AsyncStorage if database fails
      await AsyncStorage.setItem(key, `v${CURRENT_ONBOARDING_VERSION}`);
    } else {
      console.log('🎯 [OnboardingInteractive] Onboarding completion saved to user profile:', userId);
      // Also save to AsyncStorage for backup
      await AsyncStorage.setItem(key, `v${CURRENT_ONBOARDING_VERSION}`);
    }
  } catch (error) {
    console.error('Error saving interactive onboarding status with version:', error);
  }
};
