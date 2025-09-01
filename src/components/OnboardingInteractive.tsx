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
  Easing,
  Pressable,
} from 'react-native';
import { YStack, XStack, Stack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { FormField } from './FormField';
import { RadioButton, DropdownButton } from './SelectButton';
import { Feather } from '@expo/vector-icons';
import { Check } from '@tamagui/lucide-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { NavigationProp } from '../types/navigation';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useLocation } from '../context/LocationContext';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../contexts/TranslationContext';
import { StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Styles matching SplashScreen and FormField
const styles = StyleSheet.create({
  sheetOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginVertical: 4,
    borderWidth: 1,
  },
});

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
  const { language } = useTranslation();
  
  // Theme colors
  const iconColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
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
  const borderColor = useThemeColor(
    { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
    'background',
  );
  const focusBorderColor = '#34D399'; // tokens.color.emerald400 (exact FormField focus color)
  const focusBackgroundColor = useThemeColor({ light: '#EBEBEB', dark: '#282828' }, 'background'); // FormField focus background (match FormField)

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string | null>('student'); // Default to student
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [vehicleType, setVehicleType] = useState<string>('passenger_car');
  const [transmissionType, setTransmissionType] = useState<string>('manual');
  const [licenseType, setLicenseType] = useState<string>('b');
  const [experienceLevel, setExperienceLevel] = useState<string>('beginner'); // Default to beginner
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

  // Animation refs for modals (like SplashScreen)
  const cityBackdropOpacity = useRef(new Animated.Value(0)).current;
  const citySheetTranslateY = useRef(new Animated.Value(300)).current;
  const connectionsBackdropOpacity = useRef(new Animated.Value(0)).current;
  const connectionsSheetTranslateY = useRef(new Animated.Value(300)).current;
  const vehicleBackdropOpacity = useRef(new Animated.Value(0)).current;
  const vehicleSheetTranslateY = useRef(new Animated.Value(300)).current;
  const transmissionBackdropOpacity = useRef(new Animated.Value(0)).current;
  const transmissionSheetTranslateY = useRef(new Animated.Value(300)).current;
  const licenseBackdropOpacity = useRef(new Animated.Value(0)).current;
  const licenseSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Dynamic category options from database
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ id: string; title: string }>>([]);
  const [transmissionTypes, setTransmissionTypes] = useState<Array<{ id: string; title: string }>>([]);
  const [licenseTypes, setLicenseTypes] = useState<Array<{ id: string; title: string }>>([]);

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

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('learning_path_categories')
          .select('category, value, label, is_default, created_at')
          .in('category', ['vehicle_type', 'transmission_type', 'license_type'])
          .order('order_index', { ascending: true });

        if (error) {
          console.error('Error loading categories:', error);
          // Fallback to hardcoded values
          setVehicleTypes([
            { id: 'passenger_car', title: 'Car' },
            { id: 'motorcycle', title: 'Motorcycle' },
            { id: 'truck', title: 'Truck' },
          ]);
          setTransmissionTypes([
            { id: 'manual', title: 'Manual' },
            { id: 'automatic', title: 'Automatic' },
          ]);
          setLicenseTypes([
            { id: 'b', title: 'Standard License (B)' },
            { id: 'a', title: 'Motorcycle License (A)' },
            { id: 'c', title: 'Truck License (C)' },
          ]);
          return;
        }

        if (data) {
          // Group by category and extract titles with proper language support
          const vehicles = data
            .filter((item) => item.category === 'vehicle_type')
            .map((item) => ({
              id: item.value,
              title: (item.label as { en?: string; sv?: string })?.[language] || 
                     (item.label as { en?: string; sv?: string })?.en || 
                     item.value,
            }));
          
          const transmissions = data
            .filter((item) => item.category === 'transmission_type')
            .map((item) => ({
              id: item.value,
              title: (item.label as { en?: string; sv?: string })?.[language] || 
                     (item.label as { en?: string; sv?: string })?.en || 
                     item.value,
            }));
          
          const licenses = data
            .filter((item) => item.category === 'license_type')
            .map((item) => ({
              id: item.value,
              title: (item.label as { en?: string; sv?: string })?.[language] || 
                     (item.label as { en?: string; sv?: string })?.en || 
                     item.value,
            }));

          setVehicleTypes(vehicles);
          setTransmissionTypes(transmissions);
          setLicenseTypes(licenses);
          
          // Debug logging to see what we loaded
          console.log('🚗 Loaded vehicle types:', vehicles);
          console.log('🔧 Loaded transmission types:', transmissions);
          console.log('📋 Loaded license types:', licenses);
          console.log('🎯 Current state values:', { vehicleType, transmissionType, licenseType });
          
          // Set state to match the most recent is_default=true values from database
          const defaultVehicle = data
            .filter(item => item.category === 'vehicle_type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultTransmission = data
            .filter(item => item.category === 'transmission_type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          const defaultLicense = data
            .filter(item => item.category === 'license_type' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          if (defaultVehicle && defaultVehicle.value !== vehicleType) {
            console.log('🚗 Setting vehicle type to default:', defaultVehicle.value);
            setVehicleType(defaultVehicle.value);
          }
          
          if (defaultTransmission && defaultTransmission.value !== transmissionType) {
            console.log('🔧 Setting transmission type to default:', defaultTransmission.value);
            setTransmissionType(defaultTransmission.value);
          }
          
          if (defaultLicense && defaultLicense.value !== licenseType) {
            console.log('📋 Setting license type to default:', defaultLicense.value);
            setLicenseType(defaultLicense.value);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, [language]); // Reload when language changes

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

  // Modal show/hide functions (like SplashScreen)
  const showCityModal = () => {
    setShowCityDrawer(true);
    // Fade in the backdrop
    Animated.timing(cityBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(citySheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideCityModal = () => {
    // Fade out the backdrop
    Animated.timing(cityBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(citySheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowCityDrawer(false);
    });
  };

  const showConnectionsModal = () => {
    setShowConnectionsDrawer(true);
    Animated.timing(connectionsBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(connectionsSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideConnectionsModal = () => {
    Animated.timing(connectionsBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(connectionsSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowConnectionsDrawer(false);
    });
  };

  const showVehicleModal = () => {
    setShowVehicleDrawer(true);
    Animated.timing(vehicleBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(vehicleSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideVehicleModal = () => {
    Animated.timing(vehicleBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(vehicleSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowVehicleDrawer(false);
    });
  };

  const showTransmissionModal = () => {
    setShowTransmissionDrawer(true);
    Animated.timing(transmissionBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(transmissionSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideTransmissionModal = () => {
    Animated.timing(transmissionBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(transmissionSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowTransmissionDrawer(false);
    });
  };

  const showLicenseModal = () => {
    setShowLicenseDrawer(true);
    Animated.timing(licenseBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(licenseSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideLicenseModal = () => {
    Animated.timing(licenseBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(licenseSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowLicenseDrawer(false);
    });
  };

  const handleCitySelect = async (cityData: any) => {
    // Format city name as "City, SE" instead of full address
    const cityName = [cityData.city, cityData.country].filter(Boolean).join(', ');

    setSelectedCity(cityName);
    hideCityModal();
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
      
      console.log('💾 [OnboardingInteractive] Saving license plan data:', licenseData);

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
        // Auto-advance to next slide after saving
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
        // Auto-advance to next slide after role selection
        nextSlide();
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
        hideConnectionsModal();
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
          hideConnectionsModal();
          setCompletedSteps((prev) => new Set(prev).add('relationships'));
          nextSlide();
          return;
        }
        throw error;
      }

      // Silently complete connection and continue
      hideConnectionsModal();
      setCompletedSteps((prev) => new Set(prev).add('relationships'));
      nextSlide();
    } catch (error) {
      console.error('Error creating connection:', error);
      // Silently continue even on error
      hideConnectionsModal();
      handleSkipStep(steps.find((s) => s.id === 'relationships')!);
    }
  };

  const renderLicensePlanStep = (item: OnboardingStep) => {

    return (
      <ScrollView
        style={{ width, flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 60,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" minHeight={height - 300} paddingHorizontal="$4">
          {/* Step Header */}
          <YStack alignItems="center" marginBottom="$6" width="100%">
            <Text 
              size="3xl" 
              fontWeight="800" 
              fontStyle="italic"
              textAlign="center" 
              fontFamily="$heading"
              color="$color"
            >
              {item.title}
            </Text>
            <Text size="lg" textAlign="center" color="$color" opacity={0.9} marginTop="$2">
              {item.description}
            </Text>
          </YStack>

          {/* Streamlined License Preferences */}
          <YStack gap="$3" width="100%" marginTop="$4">
            <DropdownButton
              onPress={showVehicleModal}
              value={vehicleTypes.find((v) => v.id === vehicleType)?.title || 'Car'}
              isActive={showVehicleDrawer}
            />

            <DropdownButton
              onPress={showTransmissionModal}
              value={transmissionTypes.find((t) => t.id === transmissionType)?.title || 'Manual'}
              isActive={showTransmissionDrawer}
            />

            <DropdownButton
              onPress={showLicenseModal}
              value={licenseTypes.find((l) => l.id === licenseType)?.title || 'Standard License (B)'}
              isActive={showLicenseDrawer}
            />

            {/* Save Button */}
            <Button variant="primary" size="lg" onPress={handleSaveLicensePlan} marginTop="$4">
              Save My Preferences
            </Button>

            {/* Skip Button */}
            {item.skipButton && (
              <Button variant="link" size="md" onPress={() => handleSkipStep(item)} marginTop="$2">
                {item.skipButton}
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
          paddingHorizontal: 16,
          paddingTop: 60,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" minHeight={height - 300} paddingHorizontal="$4">
          {/* Step Header */}
          <YStack alignItems="center" marginBottom="$6" width="100%">
            <Text 
              size="3xl" 
              fontWeight="800" 
              fontStyle="italic"
              textAlign="center" 
              fontFamily="$heading"
              color="$color"
            >
              {item.title}
            </Text>
            <Text size="lg" textAlign="center" color="$color" opacity={0.9} marginTop="$2">
              {item.description}
            </Text>
          </YStack>

          {/* Role Options */}
          <YStack gap="$2" width="100%">
            {roles.map((role) => (
              <RadioButton
                key={role.id}
                onPress={() => handleRoleSelect(role.id)}
                title={role.title}
                description={role.description}
                isSelected={selectedRole === role.id}
              />
            ))}
          </YStack>

          {/* Skip Button */}
          {item.skipButton && (
            <Button variant="link" size="md" onPress={() => handleSkipStep(item)} marginTop="$6">
              {item.skipButton}
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
          paddingHorizontal: 16,
          paddingTop: 60,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" minHeight={height - 300} paddingHorizontal="$4">
          {/* Simplified Step Content */}
          <YStack alignItems="center" gap="$4" width="100%">
            <Text 
              size="3xl" 
              fontWeight="800" 
              fontStyle="italic"
              textAlign="center" 
              fontFamily="$heading"
              color="$color"
            >
              {item.title}
            </Text>
            
            <Text size="lg" textAlign="center" color="$color" opacity={0.9}>
              {item.description}
            </Text>

            {/* Removed status indicators - users can always interact */}

            {/* Location options - always available */}
            {item.id === 'location' && (
              <YStack gap="$4" marginTop="$6" width="100%">
                <Button variant="primary" size="lg" onPress={handleLocationPermission}>
                  Enable Location
                </Button>

                <DropdownButton
                  onPress={showCityModal}
                  value={selectedCity}
                  placeholder="Or Select Your City"
                  isActive={showCityDrawer}
                />
                
                <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                  Skip for now
                </Button>
              </YStack>
            )}

            {/* Action Buttons - Only show for non-location steps */}
            {item.id !== 'location' && (
              <YStack gap="$4" marginTop="$6" width="100%">
                {item.id === 'relationships' ? (
                  <Button variant="primary" size="lg" onPress={showConnectionsModal}>
                    Find Connections
                  </Button>
                ) : item.id === 'complete' ? (
                  <Button variant="primary" size="lg" onPress={completeOnboarding}>
                    Start Using Vromm!
                  </Button>
                ) : (
                  <Button variant="primary" size="lg" onPress={() => nextSlide()}>
                    Continue
                  </Button>
                )}

                {item.skipButton && (
                  <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                    {item.skipButton}
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
    <View style={{ flex: 1, height: '100%' }}>
    <Stack flex={1} bg="$background" height="100%">


      {/* Back Button - Header Style */}
      {currentIndex > 0 && (
        <View
          style={{
            position: 'absolute',
            top: insets.top || 40,
            left: 16,
            zIndex: 1000,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              console.log('Back button pressed, going to index:', currentIndex - 1);
              scrollTo(currentIndex - 1);
            }}
            style={{
              padding: 12,
              marginLeft: -8,
            }}
          >
            <Feather name="arrow-left" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
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
        style={{ flex: 1, height: '100%' }}
        contentContainerStyle={{ height: '100%' }}
      />

      {/* Dots indicator - similar to SplashScreen */}
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          zIndex: 20,
        }}
      >
        <XStack justifyContent="center" gap="$1" paddingVertical="$2">
          {steps.map((_, i) => {
            const isActive = currentIndex === i;
            const isCompleted = completedSteps.has(steps[i].id);
            const isSkipped = skippedSteps.has(steps[i].id);

            return (
              <TouchableOpacity
                key={`dot-${i}`}
                onPress={() => scrollTo(i)}
                style={{
                  padding: 6,
                }}
              >
                <Animated.View
                  style={{
                    width: isActive ? 16 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isCompleted 
                      ? '#10B981' 
                      : isSkipped 
                        ? '#F59E0B'
                        : isActive 
                          ? '#00FFBC' 
                          : '#374151',
                    marginHorizontal: 2,
                    opacity: isActive ? 1 : 0.5,
                    shadowColor: isActive ? '#00FFBC' : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isActive ? 0.3 : 0,
                    shadowRadius: isActive ? 4 : 0,
                    elevation: isActive ? 3 : 0,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </XStack>
      </View>

      {/* City Selection Modal */}
      <Modal
        visible={showCityDrawer}
        transparent
        animationType="none"
        onRequestClose={hideCityModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: cityBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideCityModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: citySheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                paddingBottom={insets.bottom || 20}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"

              >
            <Text size="xl" weight="bold" color="$color" textAlign="center">
              Select Your City
            </Text>
            
            <FormField
              placeholder="Search cities... (try 'Ystad', 'New York', etc.)"
              value={citySearchQuery}
              onChangeText={handleCitySearch}
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
                  const cityName = [cityData.city, cityData.country]
                    .filter(Boolean)
                    .join(', ');
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleCitySelect(cityData)}
                      style={[
                        styles.sheetOption,
                        selectedCity === cityName && { backgroundColor: selectedBackgroundColor },
                      ]}
                    >
                      <XStack gap={8} padding="$2" alignItems="center">
                        <Text color={textColor} size="lg">
                          {cityName}
                        </Text>
                        {selectedCity === cityName && (
                          <Check size={16} color={textColor} style={{ marginLeft: 'auto' }} />
                        )}
                      </XStack>
                    </TouchableOpacity>
                  );
                })}
              </YStack>
            </ScrollView>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Connections Selection Modal */}
      <Modal
        visible={showConnectionsDrawer}
        transparent
        animationType="none"
        onRequestClose={hideConnectionsModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: connectionsBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideConnectionsModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: connectionsSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                paddingBottom={insets.bottom || 20}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
            <Text size="xl" weight="bold" color="$color" textAlign="center">
              Find {selectedRole === 'student' ? 'Instructors' : selectedRole === 'instructor' || selectedRole === 'school' ? 'Students' : 'Users'}
            </Text>
            
            <Text size="sm" color="$gray11" marginBottom="$3">
              Search for {selectedRole === 'student' ? 'driving instructors' : selectedRole === 'instructor' || selectedRole === 'school' ? 'students' : 'users'} to connect with
            </Text>
            
            <FormField
              placeholder="Search by name or email..."
              value={connectionSearchQuery}
              onChangeText={handleSearchUsers}
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
                      backgroundColor: 'transparent',
                      padding: 16,
                      borderRadius: 8,
                      marginVertical: 4,
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
                      <Feather name="plus-circle" size={20} color={textColor} />
                    </XStack>
                  </TouchableOpacity>
                ))}
                
                {/* Skip option */}
                <Button 
                  variant="link"
                  size="md"
                  onPress={() => {
                    hideConnectionsModal();
                    handleSkipStep(steps.find((s) => s.id === 'relationships')!);
                  }}
                  marginTop="$4"
                >
                  I'll do this later
                </Button>
              </YStack>
            </ScrollView>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleDrawer}
        transparent
        animationType="none"
        onRequestClose={hideVehicleModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: vehicleBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideVehicleModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: vehicleSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                paddingBottom={insets.bottom || 20}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
            <Text size="xl" weight="bold" color="$color" textAlign="center">
              Select Vehicle Type
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$1">
                {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setVehicleType(type.id);
                    hideVehicleModal();
                  }}
                  style={[
                    styles.sheetOption,
                    vehicleType === type.id && { backgroundColor: selectedBackgroundColor },
                  ]}
                >
                  <XStack gap={8} padding="$2" alignItems="center">
                    <Text color={textColor} size="lg">
                      {type.title}
                    </Text>
                    {vehicleType === type.id && (
                      <Check size={16} color={textColor} style={{ marginLeft: 'auto' }} />
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
              </YStack>
            </ScrollView>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Transmission Type Selection Modal */}
      <Modal
        visible={showTransmissionDrawer}
        transparent
        animationType="none"
        onRequestClose={hideTransmissionModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: transmissionBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideTransmissionModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: transmissionSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                paddingBottom={insets.bottom || 20}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
            <Text size="xl" weight="bold" color="$color" textAlign="center">
              Select Transmission
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$1">
                {transmissionTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setTransmissionType(type.id);
                    hideTransmissionModal();
                  }}
                  style={[
                    styles.sheetOption,
                    transmissionType === type.id && { backgroundColor: selectedBackgroundColor },
                  ]}
                >
                  <XStack gap={8} padding="$2" alignItems="center">
                    <Text color={textColor} size="lg">
                      {type.title}
                    </Text>
                    {transmissionType === type.id && (
                      <Check size={16} color={textColor} style={{ marginLeft: 'auto' }} />
                    )}
                  </XStack>
                </TouchableOpacity>
                              ))}
              </YStack>
            </ScrollView>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

      {/* License Type Selection Modal */}
      <Modal
        visible={showLicenseDrawer}
        transparent
        animationType="none"
        onRequestClose={hideLicenseModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: licenseBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideLicenseModal}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: licenseSheetTranslateY }],
              }}
            >
              <YStack
                backgroundColor={backgroundColor}
                padding="$4"
                paddingBottom={insets.bottom || 20}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
            <Text size="xl" weight="bold" color="$color" textAlign="center">
              Select License Type
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$1">
                {licenseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setLicenseType(type.id);
                    hideLicenseModal();
                  }}
                  style={[
                    styles.sheetOption,
                    licenseType === type.id && { backgroundColor: selectedBackgroundColor },
                  ]}
                >
                  <XStack gap={8} padding="$2" alignItems="center">
                    <Text color={textColor} size="lg">
                      {type.title}
                    </Text>
                    {licenseType === type.id && (
                      <Check size={16} color={textColor} style={{ marginLeft: 'auto' }} />
                    )}
                  </XStack>
                </TouchableOpacity>
                              ))}
              </YStack>
            </ScrollView>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </Stack>
    </View>
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
