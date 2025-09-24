import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { YStack, XStack, Stack, Image as TamaguiImage, Switch, TextArea } from 'tamagui';
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
import { Database } from '../lib/database.types';
import { useLocation } from '../context/LocationContext';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { useColorScheme } from 'react-native';
import { Language } from '../contexts/TranslationContext';
import { StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Popover from 'react-native-popover-view';
import { AppAnalytics } from '../utils/analytics';

const { width, height } = Dimensions.get('window');

// Language constants (copied from ProfileScreen.tsx)
const LANGUAGES: Language[] = ['en', 'sv'];
const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  sv: 'Svenska',
};

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

// Map experience levels to valid enum values - keep all database values
const mapToValidExperienceLevel = (level: string): string => {
  const mapping: Record<string, string> = {
    'beginner': 'beginner',
    'intermediate': 'intermediate', 
    'advanced': 'advanced',
    'expert': 'advanced', // Map expert to advanced as fallback (since enum only has beginner/intermediate/advanced)
    'refresher': 'intermediate', // Map refresher to intermediate as fallback (since enum only has beginner/intermediate/advanced)
    'all': 'beginner', // Default fallback
  };
  
  const normalizedLevel = level.toLowerCase();
  const mappedLevel = mapping[normalizedLevel] || 'beginner';
  
  console.log(`🎯 [OnboardingInteractive] Mapping experience level: ${level} → ${mappedLevel} (for enum compatibility)`);
  return mappedLevel;
};

export function OnboardingInteractive({
  onDone,
  onSkip,
  showAgainKey = 'interactive_onboarding',
  onCloseModal,
}: OnboardingInteractiveProps) {
  const { user, profile, refreshProfile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { setUserLocation } = useLocation();
  const { language, t, setLanguage } = useTranslation();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  
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
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    // Set default role from profile if available, otherwise default to student
    return profile?.role || 'student';
  });
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [vehicleType, setVehicleType] = useState<string>('Car'); // Match database default (is_default=true)
  const [transmissionType, setTransmissionType] = useState<string>('Manual'); // Match database default (is_default=true)
  const [licenseType, setLicenseType] = useState<string>('Standard Driving License (B)'); // Match database default (is_default=true)
  const [experienceLevel, setExperienceLevel] = useState<string>('Beginner'); // Match database default (is_default=true)
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
  
  // Connection selection state
  const [selectedConnections, setSelectedConnections] = useState<Array<{ id: string; full_name: string; email: string; role?: string }>>([]);
  const [connectionCustomMessage, setConnectionCustomMessage] = useState('');
  
  // Existing relationships state
  const [existingRelationships, setExistingRelationships] = useState<Array<{ 
    id: string; 
    name: string; 
    email: string; 
    role: string; 
    relationship_type: string;
    created_at: string;
  }>>([]);
  
  // Relationship removal modal state
  const [showRelationshipRemovalModal, setShowRelationshipRemovalModal] = useState(false);
  const [relationshipRemovalTarget, setRelationshipRemovalTarget] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    relationship_type: string;
  } | null>(null);
  const [relationshipRemovalMessage, setRelationshipRemovalMessage] = useState('');
  
  // Experience level state
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState<string>('Beginner'); // Use database value format (matches is_default=true)
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Additional license plan modal states
  const [showPreviousExperienceModal, setShowPreviousExperienceModal] = useState(false);
  const [showSpecificGoalsModal, setShowSpecificGoalsModal] = useState(false);
  
  // Language selection modal state
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const [selectedTargetDate, setSelectedTargetDate] = useState<Date>(() => {
    // Default to 6 months from now
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState<string>('6months'); // Track which date option is selected
  const dateButtonRef = useRef<any>(null);
  
  // License plan additional fields (from LicensePlanScreen.tsx)
  const [hasTheory, setHasTheory] = useState<boolean>(() => {
    const planData = (profile?.license_plan_data as any);
    return planData?.has_theory || false;
  });
  const [hasPractice, setHasPractice] = useState<boolean>(() => {
    const planData = (profile?.license_plan_data as any);
    return planData?.has_practice || false;
  });
  const [previousExperience, setPreviousExperience] = useState<string>(() => {
    const planData = (profile?.license_plan_data as any);
    return planData?.previous_experience || '';
  });
  const [specificGoals, setSpecificGoals] = useState<string>(() => {
    const planData = (profile?.license_plan_data as any);
    return planData?.specific_goals || '';
  });
  
  // Dynamic experience levels from database
  const [experienceLevels, setExperienceLevels] = useState<Array<{ id: string; title: string; description?: string }>>([]);
  
  // Loading spinner animation
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Animated dots for "Detecting Location..."
  const [dotsCount, setDotsCount] = useState(0);
  
  // Start spinner animation when loading
  useEffect(() => {
    if (locationLoading) {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      
      // Animate dots
      const dotsInterval = setInterval(() => {
        setDotsCount(prev => (prev + 1) % 4); // 0, 1, 2, 3, then back to 0
      }, 500);
      
      return () => {
        spin.stop();
        clearInterval(dotsInterval);
        setDotsCount(0);
      };
    } else {
      spinValue.setValue(0);
      setDotsCount(0);
    }
  }, [locationLoading, spinValue]);
  const [citySearchTimeout, setCitySearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  // Animation refs for modals (like SplashScreen)
  const cityBackdropOpacity = useRef(new Animated.Value(0)).current;
  const citySheetTranslateY = useRef(new Animated.Value(300)).current;
  const connectionsBackdropOpacity = useRef(new Animated.Value(0)).current;
  const connectionsSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Gesture handling for connections modal (like RouteDetailSheet)
  const { height } = Dimensions.get('window');
  const connectionsTranslateY = useSharedValue(height);
  const connectionsBackdropOpacityShared = useSharedValue(0);

  const connectionsSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.1,   // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4,  // Top at 40% of screen (show 60% - medium)  
      small: height * 0.7,   // Top at 70% of screen (show 30% - small)
      mini: height * 0.85,   // Top at 85% of screen (show 15% - just title)
      dismissed: height,     // Completely off-screen
    };
    return points;
  }, [height]);
  
  const [currentConnectionsSnapPoint, setCurrentConnectionsSnapPoint] = useState(connectionsSnapPoints.large);
  const currentConnectionsState = useSharedValue(connectionsSnapPoints.large);

  const connectionsAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: connectionsTranslateY.value }],
    };
  });

  const connectionsPanGesture = Gesture.Pan()
    .onBegin(() => {
      console.log('🎯 [OnboardingInteractive] DRAG HANDLE GESTURE STARTED');
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        console.log('🎯 [OnboardingInteractive] DRAG HANDLE GESTURE UPDATE - translationY:', translationY);
        const newPosition = currentConnectionsState.value + translationY;
        
        // Constrain to snap points range (large is smallest Y, allow dragging past mini for dismissal)
        const minPosition = connectionsSnapPoints.large; // Smallest Y (show most - like expanded)
        const maxPosition = connectionsSnapPoints.mini + 100; // Allow dragging past mini for dismissal
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);
        
        // Set translateY directly like RouteDetailSheet
        connectionsTranslateY.value = boundedPosition;
      } catch (error) {
        console.log('connectionsPanGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      console.log('🎯 [OnboardingInteractive] DRAG HANDLE GESTURE END - translationY:', translationY, 'velocityY:', velocityY);
      
      const currentPosition = currentConnectionsState.value + translationY;
      
      // Only dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > connectionsSnapPoints.mini + 30 && velocityY > 200) {
        console.log('🎯 [OnboardingInteractive] DRAG HANDLE - DISMISSING MODAL');
        runOnJS(hideConnectionsModal)();
        return;
      }
      
      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = connectionsSnapPoints.large;
        console.log('🎯 [OnboardingInteractive] DRAG HANDLE - FAST UPWARD SWIPE - going to LARGE');
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = connectionsSnapPoints.mini;
        console.log('🎯 [OnboardingInteractive] DRAG HANDLE - FAST DOWNWARD SWIPE - going to MINI');
      } else {
        // Find closest snap point
        const positions = [connectionsSnapPoints.large, connectionsSnapPoints.medium, connectionsSnapPoints.small, connectionsSnapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
        console.log('🎯 [OnboardingInteractive] DRAG HANDLE - SNAP TO CLOSEST - targetSnapPoint:', targetSnapPoint);
      }
      
      // Constrain target to valid range
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, connectionsSnapPoints.large),
        connectionsSnapPoints.mini,
      );
      
      console.log('🎯 [OnboardingInteractive] DRAG HANDLE - ANIMATING TO:', boundedTarget);
      
      // Animate to target position - set translateY directly like RouteDetailSheet
      connectionsTranslateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      
      currentConnectionsState.value = boundedTarget;
      runOnJS(setCurrentConnectionsSnapPoint)(boundedTarget);
    });
  const vehicleBackdropOpacity = useRef(new Animated.Value(0)).current;
  const vehicleSheetTranslateY = useRef(new Animated.Value(300)).current;
  const transmissionBackdropOpacity = useRef(new Animated.Value(0)).current;
  const transmissionSheetTranslateY = useRef(new Animated.Value(300)).current;
  const licenseBackdropOpacity = useRef(new Animated.Value(0)).current;
  const licenseSheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // Relationship removal modal animation refs
  const relationshipRemovalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const relationshipRemovalSheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // Additional license plan modal animation refs
  const previousExperienceBackdropOpacity = useRef(new Animated.Value(0)).current;
  const previousExperienceSheetTranslateY = useRef(new Animated.Value(300)).current;
  const specificGoalsBackdropOpacity = useRef(new Animated.Value(0)).current;
  const specificGoalsSheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // Language modal animation refs (copied from ProfileScreen.tsx)
  const languageBackdropOpacity = useRef(new Animated.Value(0)).current;
  const languageSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Dynamic category options from database
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ id: string; title: string }>>([]);
  const [transmissionTypes, setTransmissionTypes] = useState<Array<{ id: string; title: string }>>([]);
  const [licenseTypes, setLicenseTypes] = useState<Array<{ id: string; title: string }>>([]);

  // Simplified onboarding steps - clear and focused
  const steps: OnboardingStep[] = [
    {
      id: 'location',
      title: t('onboarding.location.title') || 'Enable Location Access',
      description: t('onboarding.location.description') || 'Allow location access to find practice routes near you',
      icon: 'map-pin',
      type: 'permission',
      actionButton: t('onboarding.location.enableLocation') || 'Enable Location',
      skipButton: t('onboarding.skipForNow') || 'Skip for now',
    },
    {
      id: 'license_plan',
      title: t('onboarding.licensePlan.title') || 'Your License Journey',
      description: t('onboarding.licensePlan.description') || 'Tell us about your experience level, driving goals and vehicle preferences',
      icon: 'clipboard',
      type: 'selection',
      actionButton: t('onboarding.licensePlan.setPreferences') || 'Set My Preferences',
      skipButton: t('onboarding.skipForNow') || 'Skip for now',
    },
    {
      id: 'role',
      title: t('onboarding.role.title') || 'Select Your Role',
      description: t('onboarding.role.description') || 'Are you learning to drive or teaching others?',
      icon: 'user',
      type: 'selection',
      actionButton: t('onboarding.role.chooseRole') || 'Choose Role',
      skipButton: t('onboarding.skipForNow') || 'Skip for now',
    },
    {
      id: 'relationships',
      title: t('onboarding.relationships.title') || 'Connect with Others',
      description: t('onboarding.relationships.description') || 'Connect with instructors or students based on your role',
      icon: 'users',
      type: 'action',
      actionButton: t('onboarding.relationships.findConnections') || 'Find Connections',
      skipButton: t('onboarding.maybeLater') || 'Maybe later',
    },
    {
      id: 'complete',
      title: t('onboarding.complete.title') || 'Ready for Your Journey!',
      description: t('onboarding.complete.description') || 'Ready to become a confident driver! Explore the app, progress in exercises, save and upload routes, and discover a community of drivers like you.',
      icon: 'check-circle',
      type: 'info',
      actionButton: t('onboarding.complete.startMyJourney') || 'Start My Journey',
      skipButton: t('onboarding.skipForNow') || 'Skip for now',
    },
  ];

  // Mark onboarding as viewed
  const completeOnboarding = async () => {
    try {
      // Track onboarding completion
      await AppAnalytics.trackOnboardingComplete(steps.length).catch(() => {
        // Silently fail analytics
      });

      await completeOnboardingWithVersion(showAgainKey, user?.id);
      onDone();
    } catch (error) {
      // Error saving onboarding status
      onDone();
    }
  };

  // Check completion status on mount and track onboarding start
  useEffect(() => {
    checkStepCompletions();
    
    // Track onboarding start when component mounts (only once)
    if (currentIndex === 0) {
      AppAnalytics.trackOnboardingStart().catch(() => {
        // Silently fail analytics
      });
    }
  }, [user, profile]);

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        console.log('🔍 Fetching categories from database...');
        console.log('🌍 Current language in OnboardingInteractive:', language);
        
        const { data, error } = await supabase
          .from('learning_path_categories')
          .select('category, value, label, is_default, created_at, order_index')
          .in('category', ['vehicle_type', 'transmission_type', 'license_type', 'experience_level'])
          .order('order_index', { ascending: true });

        if (error) {
          console.error('Error loading categories:', error);
          // Fallback to hardcoded values that match database values
          setVehicleTypes([
            { id: 'Car', title: language === 'sv' ? 'Bil' : 'Car' },
            { id: 'Motorcycle', title: language === 'sv' ? 'Motorcykel' : 'Motorcycle' },
            { id: 'Truck / Lorry', title: language === 'sv' ? 'Lastbil' : 'Truck / Lorry' },
          ]);
          setTransmissionTypes([
            { id: 'Manual', title: language === 'sv' ? 'Manuell' : 'Manual' },
            { id: 'Automatic', title: language === 'sv' ? 'Automat' : 'Automatic' },
          ]);
          setLicenseTypes([
            { id: 'Standard Driving License (B)', title: language === 'sv' ? 'Standardkörkort (t.ex. klass B i Europa / klass C i USA)' : 'Standard Driving License (e.g. Class B in Europe / Class C in the US)' },
            { id: 'Motorcycle License (A)', title: language === 'sv' ? 'Motorcykelkörkort (t.ex. klass A)' : 'Motorcycle License (e.g. Class A)' },
            { id: 'Commercial Driving License', title: language === 'sv' ? 'Yrkeskörkort (CDL / klass C/D etc.)' : 'Commercial Driving License (CDL / Class C/D etc.)' },
          ]);
          return;
        }

        if (data) {
          // Database categories loaded
          console.log('🔍 Database categories loaded:', data.length, 'items');
          console.log('🌍 Language for label selection:', language);
          
          // Group by category and extract titles with proper language support from label field
          const vehicles = data
            .filter((item) => item.category === 'vehicle_type' && item.value !== 'all')
            .map((item) => {
              // Handle JSON parsing - Supabase returns JSON columns as objects but sometimes they need string parsing
              let labelObj: { en?: string; sv?: string };
              try {
                if (typeof item.label === 'string') {
                  labelObj = JSON.parse(item.label);
                } else if (item.label && typeof item.label === 'object') {
                  // If it's already an object, use it directly
                  labelObj = item.label as { en?: string; sv?: string };
                } else {
                  labelObj = { en: item.value, sv: item.value };
                }
                
                // Additional check: if the object doesn't have en/sv keys, try to access them differently
                if (!labelObj.en && !labelObj.sv && item.label) {
                  console.log(`🔍 Trying alternative access for ${item.value}:`, item.label);
                  const rawLabel = item.label as any;
                  labelObj = {
                    en: rawLabel.en || rawLabel['en'] || item.value,
                    sv: rawLabel.sv || rawLabel['sv'] || item.value,
                  };
                }
              } catch (e) {
                console.warn(`Failed to parse label for ${item.value}:`, item.label, e);
                labelObj = { en: item.value, sv: item.value };
              }
              
              console.log(`🚗 Raw label for ${item.value}:`, item.label);
              console.log(`🚗 Parsed labelObj:`, labelObj);
              console.log(`🚗 Available keys:`, Object.keys(labelObj || {}));
              console.log(`🚗 Swedish value:`, labelObj?.sv);
              console.log(`🚗 English value:`, labelObj?.en);
              const title = labelObj?.[language] || labelObj?.en || item.value;
              console.log(`🚗 Final title: ${item.value} → ${title} (lang: ${language})`);
              return {
                id: item.value,
                title,
              };
            });
          
          const transmissions = data
            .filter((item) => item.category === 'transmission_type' && item.value !== 'all')
            .map((item) => {
              // Parse JSON string to object if needed
              let labelObj: { en?: string; sv?: string };
              if (typeof item.label === 'string') {
                try {
                  labelObj = JSON.parse(item.label);
                } catch (e) {
                  console.warn(`Failed to parse label JSON for ${item.value}:`, item.label);
                  labelObj = { en: item.value, sv: item.value };
                }
              } else {
                labelObj = item.label as { en?: string; sv?: string };
              }
              
              const title = labelObj?.[language] || labelObj?.en || item.value;
              console.log(`⚙️ Transmission: ${item.value} → ${title} (lang: ${language})`);
              return {
                id: item.value,
                title,
              };
            });
          
          const licenses = data
            .filter((item) => item.category === 'license_type' && item.value !== 'all')
            .map((item) => {
              // Handle JSON parsing
              let labelObj: { en?: string; sv?: string };
              try {
                if (typeof item.label === 'string') {
                  labelObj = JSON.parse(item.label);
                } else if (item.label && typeof item.label === 'object') {
                  labelObj = item.label as { en?: string; sv?: string };
                } else {
                  labelObj = { en: item.value, sv: item.value };
                }
                
                if (!labelObj.en && !labelObj.sv && item.label) {
                  const rawLabel = item.label as any;
                  labelObj = {
                    en: rawLabel.en || rawLabel['en'] || item.value,
                    sv: rawLabel.sv || rawLabel['sv'] || item.value,
                  };
                }
              } catch (e) {
                labelObj = { en: item.value, sv: item.value };
              }
              
              const title = labelObj?.[language] || labelObj?.en || item.value;
              console.log(`📄 License: ${item.value} → ${title} (lang: ${language})`);
              return {
                id: item.value,
                title,
              };
            });
          
          const experiences = data
            .filter((item) => item.category === 'experience_level' && item.value !== 'all')
            .sort((a, b) => a.order_index - b.order_index)
            .map((item) => {
              // Handle JSON parsing
              let labelObj: { en?: string; sv?: string };
              try {
                if (typeof item.label === 'string') {
                  labelObj = JSON.parse(item.label);
                } else if (item.label && typeof item.label === 'object') {
                  labelObj = item.label as { en?: string; sv?: string };
                } else {
                  labelObj = { en: item.value, sv: item.value };
                }
                
                if (!labelObj.en && !labelObj.sv && item.label) {
                  const rawLabel = item.label as any;
                  labelObj = {
                    en: rawLabel.en || rawLabel['en'] || item.value,
                    sv: rawLabel.sv || rawLabel['sv'] || item.value,
                  };
                }
              } catch (e) {
                labelObj = { en: item.value, sv: item.value };
              }
              
              const title = labelObj?.[language] || labelObj?.en || item.value;
              const description = labelObj?.[language] || labelObj?.en || undefined;
              console.log(`🎓 Experience: ${item.value} → ${title} (lang: ${language})`);
              return {
                id: item.value.toLowerCase(), // Normalize to lowercase for enum compatibility
                title,
                description,
              };
            });

          setVehicleTypes(vehicles);
          setTransmissionTypes(transmissions);
          setLicenseTypes(licenses);
          setExperienceLevels(experiences);
          
          // Experience levels set from database
          
          // Debug logging to see what we loaded
          // Category options loaded from database
          
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
          const defaultExperience = data
            .filter(item => item.category === 'experience_level' && item.is_default)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          if (defaultVehicle && defaultVehicle.value !== vehicleType) {
            setVehicleType(defaultVehicle.value);
          }
          
          if (defaultTransmission && defaultTransmission.value !== transmissionType) {
            setTransmissionType(defaultTransmission.value);
          }
          
          if (defaultLicense && defaultLicense.value !== licenseType) {
            setLicenseType(defaultLicense.value);
          }
          
          if (defaultExperience && defaultExperience.value !== selectedExperienceLevel) {
            setSelectedExperienceLevel(defaultExperience.value);
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

  // Load existing relationships when relationships step is active
  useEffect(() => {
    if (currentIndex === steps.findIndex(s => s.id === 'relationships')) {
      loadExistingRelationships();
    }
  }, [currentIndex, user?.id]);

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
        // Slide visible changed without excessive logging
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = (index: number) => {
    if (slidesRef.current && index >= 0 && index < steps.length) {
      slidesRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      // Force update current index after animation
      setTimeout(() => {
        setCurrentIndex(index);
      }, 100);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })(event);
  };

  const nextSlide = () => {
    if (currentIndex < steps.length - 1) {
      const nextIndex = currentIndex + 1;
      const currentStep = steps[currentIndex];
      const nextStep = steps[nextIndex];

      // Track onboarding step progression
      AppAnalytics.trackOnboardingStep(currentStep.id, currentIndex + 1).catch(() => {
        // Silently fail analytics
      });

      scrollTo(nextIndex);
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
    // Track step skip
    AppAnalytics.trackOnboardingSkip(step.id, currentIndex + 1).catch(() => {
      // Silently fail analytics
    });

    setSkippedSteps((prev) => new Set(prev).add(step.id));
    nextSlide();
  };

  const handleLocationPermission = async () => {
    try {
      setLocationLoading(true);
      // Always try to detect location, even if city is already selected (allow override)
      
      // Check current permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();
      
      if (currentStatus.status !== 'granted') {
      // Request permission - this shows the native dialog
      const { status } = await Location.requestForegroundPermissionsAsync();
      
        if (status !== 'granted') {
        setLocationStatus('denied');
          showToast({
            title: 'Permission Denied',
            message: 'Location permission is required to detect your location. You can still select a city manually.',
            type: 'error'
          });
          return;
        }
      }
      
      setLocationStatus('granted');
      // Always detect and set current location (allow override of manual selection)
      await detectAndSetCurrentLocation();
      
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationStatus('denied');
      showToast({
        title: 'Location Error',
        message: 'Failed to detect location. You can select a city manually.',
        type: 'error'
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const detectAndSetCurrentLocation = async () => {
    try {
      let location;
      try {
        location = await Location.getCurrentPositionAsync({});
      } catch (locationError) {
        // Location failed, using Lund, Sweden fallback for simulator
        // Fallback location for simulator - Lund, Sweden
        location = {
          coords: {
            latitude: 55.7047,
            longitude: 13.1910,
          },
        };
      }
      
      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const cityName = [address.city, address.country].filter(Boolean).join(', ');
    setSelectedCity(cityName);
      
      // Save to LocationContext
      await setUserLocation({
        name: cityName,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        source: 'onboarding',
        timestamp: new Date().toISOString(),
      });
      
      // 🔥 CRITICAL FIX: Also save to profiles table for cross-screen sync
      if (user) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              preferred_city: cityName,
              preferred_city_coords: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              },
              location: cityName, // Also update main location field
              location_lat: location.coords.latitude,
              location_lng: location.coords.longitude,
            })
            .eq('id', user.id);
            
          if (error) {
            console.error('Error saving detected location to profile:', error);
          } else {
            console.log('✅ Detected location saved to profile:', cityName);
          }
        } catch (error) {
          console.error('Error saving detected location:', error);
        }
      }
      
      // Location detected and set
    } catch (error) {
      console.error('Error detecting location:', error);
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
    connectionsTranslateY.value = withSpring(connectionsSnapPoints.large, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    currentConnectionsState.value = connectionsSnapPoints.large;
    setCurrentConnectionsSnapPoint(connectionsSnapPoints.large);
    connectionsBackdropOpacityShared.value = withSpring(1, {
      damping: 20,
      stiffness: 300,
    });
  };

  const hideConnectionsModal = useCallback(() => {
    // Prevent multiple calls during animation
    if (!showConnectionsDrawer) {
      return;
    }

    connectionsTranslateY.value = withSpring(connectionsSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    connectionsBackdropOpacityShared.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
    setTimeout(() => {
      setShowConnectionsDrawer(false);
      // Only clear search, keep selections for the main slide
      setConnectionSearchQuery('');
      setSearchResults([]);
      // Connections modal hidden successfully
      // Don't clear selections - they should persist for the save button
    }, 300);
  }, [showConnectionsDrawer]);

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

  // Relationship removal modal show/hide functions
  const openRelationshipRemovalModal = () => {
    setShowRelationshipRemovalModal(true);
    // Fade in the backdrop
    Animated.timing(relationshipRemovalBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide up the sheet
    Animated.timing(relationshipRemovalSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeRelationshipRemovalModal = () => {
    // Fade out the backdrop
    Animated.timing(relationshipRemovalBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Slide down the sheet
    Animated.timing(relationshipRemovalSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowRelationshipRemovalModal(false);
      setRelationshipRemovalTarget(null);
      setRelationshipRemovalMessage('');
    });
  };

  // Previous Experience modal show/hide functions
  const showPreviousExperienceSheet = () => {
    setShowPreviousExperienceModal(true);
    Animated.timing(previousExperienceBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(previousExperienceSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hidePreviousExperienceSheet = () => {
    Animated.timing(previousExperienceBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(previousExperienceSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowPreviousExperienceModal(false);
    });
  };

  // Specific Goals modal show/hide functions
  const showSpecificGoalsSheet = () => {
    setShowSpecificGoalsModal(true);
    Animated.timing(specificGoalsBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(specificGoalsSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideSpecificGoalsSheet = () => {
    Animated.timing(specificGoalsBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(specificGoalsSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowSpecificGoalsModal(false);
    });
  };

  // Language modal show/hide functions (copied from ProfileScreen.tsx)
  const showLanguageSheet = () => {
    setShowLanguageModal(true);
    Animated.timing(languageBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(languageSheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideLanguageSheet = () => {
    Animated.timing(languageBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(languageSheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowLanguageModal(false);
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

          // Don't auto-advance - let user click save button
          // City saved successfully, waiting for user to save
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
        experience_level: selectedExperienceLevel,
        vehicle_type: vehicleType,
        transmission_type: transmissionType,
        license_type: licenseType,
        target_date: selectedTargetDate.toISOString(),
        // Add new fields from LicensePlanScreen
        has_theory: hasTheory,
        has_practice: hasPractice,
        previous_experience: previousExperience,
        specific_goals: specificGoals,
      };
      
      console.log('💾 [OnboardingInteractive] Saving license plan data:', licenseData);

      const { error } = await supabase
        .from('profiles')
        .update({
          license_plan_completed: true,
          license_plan_data: licenseData,
          // Also save individual fields for easier access by other screens
          vehicle_type: vehicleType,
          transmission_type: transmissionType,
          license_type: licenseType,
          experience_level: mapToValidExperienceLevel(selectedExperienceLevel) as Database['public']['Enums']['experience_level'],
          target_license_date: selectedTargetDate.toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving license plan:', error);
        showToast({
          title: 'Error',
          message: 'Could not save your preferences. Please try again.',
          type: 'error'
        });
      } else {
        setCompletedSteps((prev) => new Set(prev).add('license_plan'));
        checkStepCompletions();
        
        // 🔥 CRITICAL FIX: Refresh profile data for cross-screen sync
        try {
          await refreshProfile();
          console.log('✅ Profile data refreshed after license plan save');
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
        
        // Auto-advance to next slide after saving
        setTimeout(() => {
          nextSlide();
        }, 200); // Increased delay to ensure proper state updates
      }
    } catch (err) {
      console.error('Error saving license plan:', err);
              showToast({
          title: t('common.error') || 'Error',
          message: t('onboarding.licensePlan.saveError') || 'Could not save your preferences. Please try again.',
          type: 'error'
        });
    }
  };

  const handleRoleSelect = (roleId: string) => {
      setSelectedRole(roleId);
    // Don't auto-advance - wait for save button
  };

  const handleSaveRole = async () => {
    if (!user || !selectedRole) return;

    try {
      // Update the profile with the selected role
      const { error } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          role_confirmed: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving role selection:', error);
        showToast({
          title: t('common.error') || 'Error',
          message: t('onboarding.role.saveError') || 'Could not update your role. Please try again.',
          type: 'error'
        });
      } else {
        setCompletedSteps((prev) => new Set(prev).add('role'));
        checkStepCompletions();
        
        // 🔥 CRITICAL FIX: Refresh profile for cross-screen sync
        try {
          await refreshProfile();
          console.log('✅ Profile refreshed after role save');
        } catch (error) {
          console.error('Error refreshing profile after role save:', error);
        }
        
        // Advance to next slide after saving
        nextSlide();
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
      showToast({
        title: t('common.error') || 'Error',
        message: t('onboarding.role.saveError') || 'Could not update your role. Please try again.',
        type: 'error'
      });
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

  // Load existing relationships for the user
  const loadExistingRelationships = async () => {
    if (!user?.id) return;

    try {
      console.log('🔍 Loading existing relationships for user:', user.id);
      
      // Get relationships where user is either student or supervisor
      const { data: relationships, error } = await supabase
        .from('student_supervisor_relationships')
        .select(`
          student_id,
          supervisor_id,
          created_at,
          student:profiles!ssr_student_id_fkey (id, full_name, email, role),
          supervisor:profiles!ssr_supervisor_id_fkey (id, full_name, email, role)
        `)
        .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

      if (error) {
        console.error('Error loading relationships:', error);
        return;
      }

      const transformedRelationships = relationships?.map(rel => {
        const isUserStudent = rel.student_id === user.id;
        const otherUser = isUserStudent ? (rel as any).supervisor : (rel as any).student;
        
        return {
          id: otherUser?.id || '',
          name: otherUser?.full_name || 'Unknown User',
          email: otherUser?.email || '',
          role: otherUser?.role || '',
          relationship_type: isUserStudent ? 'has_supervisor' : 'supervises_student',
          created_at: rel.created_at,
        };
      }) || [];

      console.log('🔍 Loaded existing relationships:', transformedRelationships);
      setExistingRelationships(transformedRelationships);
    } catch (error) {
      console.error('Error loading existing relationships:', error);
    }
  };

  // Handle creating connections for selected users
  const handleCreateSelectedConnections = async () => {
    if (!user?.id || selectedConnections.length === 0) return;

    try {
      console.log('Creating connections for selected users:', selectedConnections);
      
      // Create invitations for each selected connection
      for (const targetUser of selectedConnections) {
        if (!targetUser.email) continue;
        
        // Determine relationship type and target role
        const relationshipType = selectedRole === 'student' 
          ? 'student_invites_supervisor' 
          : 'supervisor_invites_student';
        const targetRole = selectedRole === 'student' ? 'instructor' : 'student';
        
        // Check for existing invitation first
        const { data: existingInvitations } = await supabase
          .from('pending_invitations')
          .select('id, status')
          .eq('email', targetUser.email.toLowerCase())
          .eq('invited_by', user.id)
          .in('status', ['pending', 'accepted']);

        if (existingInvitations && existingInvitations.length > 0) {
          console.log('Invitation already exists for:', targetUser.email);
          continue; // Skip this user
        }
        
        // Create pending invitation
        const { error: inviteError } = await supabase
          .from('pending_invitations')
          .insert({
            email: targetUser.email.toLowerCase(),
            role: targetRole,
            invited_by: user.id,
            metadata: {
              supervisorName: profile?.full_name || user.email,
              inviterRole: selectedRole,
              relationshipType,
              invitedAt: new Date().toISOString(),
              targetUserId: targetUser.id,
              targetUserName: targetUser.full_name,
              customMessage: connectionCustomMessage.trim() || undefined,
            },
            status: 'pending',
          });
          
        if (inviteError && inviteError.code !== '23505') {
          console.error('Error creating invitation:', inviteError);
          continue;
        }
        
        // Create notification for the target user
        const notificationType = selectedRole === 'student' 
          ? 'supervisor_invitation' 
          : 'student_invitation';
        const baseMessage = selectedRole === 'student' 
          ? `${profile?.full_name || user.email || 'Someone'} wants you to be their supervisor`
          : `${profile?.full_name || user.email || 'Someone'} wants you to be their student`;
        
        // Include custom message if provided
        const fullMessage = connectionCustomMessage.trim() 
          ? `${baseMessage}\n\nPersonal message: "${connectionCustomMessage.trim()}"`
          : baseMessage;
        
        await supabase
          .from('notifications')
          .insert({
            user_id: targetUser.id,
            actor_id: user.id,
            type: notificationType as Database['public']['Enums']['notification_type'],
            title: 'New Supervision Request',
            message: fullMessage,
            metadata: {
              relationship_type: relationshipType,
              from_user_id: user.id,
              from_user_name: profile?.full_name || user.email,
              customMessage: connectionCustomMessage.trim() || undefined,
            },
            action_url: 'vromm://notifications',
            priority: 'high',
            is_read: false,
          });
      }
      
      // Complete step (selections cleared by caller)
      setCompletedSteps((prev) => new Set(prev).add('relationships'));
      
      console.log('📤 [OnboardingInteractive] Invitations sent to:', selectedConnections.length, 'connections');
      
    } catch (error) {
      console.error('Error creating connections:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('onboarding.connections.inviteError') || 'Some invitations may not have been sent. Please try again.',
        type: 'error'
      });
    }
  };

  const handleConnectWithUser = async (targetUser: any) => {
    // This function is kept for backward compatibility but simplified
    // The new flow uses selection-based connections
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
        setTimeout(() => {
          hideConnectionsModal();
        }, 0);
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
          setTimeout(() => {
            hideConnectionsModal();
          }, 0);
          setCompletedSteps((prev) => new Set(prev).add('relationships'));
            nextSlide();
          return;
        }
        throw error;
      }

      // Silently complete connection and continue
      setTimeout(() => {
        hideConnectionsModal();
      }, 0);
      setCompletedSteps((prev) => new Set(prev).add('relationships'));
    nextSlide();
    } catch (error) {
      console.error('Error creating connection:', error);
      // Silently continue even on error
      setTimeout(() => {
        hideConnectionsModal();
      }, 0);
      handleSkipStep(steps.find((s) => s.id === 'relationships')!);
    }
  };

  const renderLicensePlanStep = (item: OnboardingStep) => {
    // Render license plan step without excessive logging
    
    const availableExperienceLevels = experienceLevels.length > 0 ? experienceLevels : [
      { id: 'beginner', title: language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)', description: language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)' },
      { id: 'intermediate', title: language === 'sv' ? 'Medel (viss vägvana)' : 'Intermediate (some road experience)', description: language === 'sv' ? 'Medel (viss vägvana)' : 'Intermediate (some road experience)' }, 
      { id: 'advanced', title: language === 'sv' ? 'Avancerad (behöver förfinas / förberedas inför prov)' : 'Advanced (needs refinement / preparing for test)', description: language === 'sv' ? 'Avancerad (behöver förfinas / förberedas inför prov)' : 'Advanced (needs refinement / preparing for test)' },
      { id: 'refresher', title: language === 'sv' ? 'Repetitionskurs (återvändande förare)' : 'Refresher (returning drivers)', description: language === 'sv' ? 'Repetitionskurs (återvändande förare)' : 'Refresher (returning drivers)' },
      { id: 'expert', title: language === 'sv' ? 'Expert' : 'Expert', description: language === 'sv' ? 'Expert' : 'Expert' },
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

          {/* License Preferences */}
          <YStack gap="$3" width="100%" marginTop="$4">
            {/* Experience Level */}
            <DropdownButton
              onPress={() => setShowExperienceModal(true)}
              value={(experienceLevels.length > 0 ? experienceLevels : [
                { id: 'beginner', title: language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)' },
                { id: 'intermediate', title: language === 'sv' ? 'Medel (viss vägvana)' : 'Intermediate (some road experience)' },
                { id: 'advanced', title: language === 'sv' ? 'Avancerad (behöver förfinas / förberedas inför prov)' : 'Advanced (needs refinement / preparing for test)' },
                { id: 'refresher', title: language === 'sv' ? 'Repetitionskurs (återvändande förare)' : 'Refresher (returning drivers)' },
                { id: 'expert', title: language === 'sv' ? 'Expert' : 'Expert' },
              ]).find((e) => e.id.toLowerCase() === selectedExperienceLevel.toLowerCase())?.title || (language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)')}
              isActive={showExperienceModal}
            />
            
            {/* License Target Date */}
            <DropdownButton
              onPress={() => setShowDateModal(true)}
              value={`${t('onboarding.date.targetDate') || 'Want my license on'}: ${selectedTargetDate.toLocaleDateString()}`}
              isActive={showDateModal}
            />

            <DropdownButton
              onPress={showVehicleModal}
              value={vehicleTypes.find((v) => v.id === vehicleType)?.title || (language === 'sv' ? 'Bil' : 'Car')}
              isActive={showVehicleDrawer}
            />

            <DropdownButton
              onPress={showTransmissionModal}
              value={transmissionTypes.find((t) => t.id === transmissionType)?.title || (language === 'sv' ? 'Manuell' : 'Manual')}
              isActive={showTransmissionDrawer}
            />

            <DropdownButton
              onPress={showLicenseModal}
              value={licenseTypes.find((l) => l.id === licenseType)?.title || (language === 'sv' ? 'Standardkörkort (B)' : 'Standard License (B)')}
              isActive={showLicenseDrawer}
            />

            {/* Theory Test Toggle */}
            <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
              <Text size="md" weight="semibold" color="$color">
                {t('onboarding.licensePlan.hasTheory') || 'Have you passed the theory test?'}
              </Text>
              <XStack alignItems="center" gap="$2">
                <Switch 
                  size="$4"
                  checked={hasTheory} 
                  onCheckedChange={async (checked) => {
                    setHasTheory(checked);
                    // 🔥 CRITICAL FIX: Save theory status immediately to profile
                    if (user) {
                      try {
                        const currentLicenseData = (profile?.license_plan_data as any) || {};
                        const updatedLicenseData = {
                          ...currentLicenseData,
                          has_theory: checked,
                        };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            license_plan_data: updatedLicenseData,
                          })
                          .eq('id', user.id);
                          
                        if (error) {
                          console.error('Error saving theory status:', error);
                        } else {
                          console.log('✅ Theory status saved:', checked);
                          // Refresh profile for cross-screen sync
                          await refreshProfile();
                        }
                      } catch (error) {
                        console.error('Error updating theory status:', error);
                      }
                    }
                  }}
                  backgroundColor={hasTheory ? '$blue8' : '$gray6'}
                >
                  <Switch.Thumb />
                </Switch>
                <Text size="md" color="$color">
                  {hasTheory ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                </Text>
              </XStack>
            </YStack>

            {/* Practice Test Toggle */}
            <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
              <Text size="md" weight="semibold" color="$color">
                {t('onboarding.licensePlan.hasPractice') || 'Have you passed the practical test?'}
              </Text>
              <XStack alignItems="center" gap="$2">
                <Switch 
                  size="$4"
                  checked={hasPractice} 
                  onCheckedChange={async (checked) => {
                    setHasPractice(checked);
                    // 🔥 CRITICAL FIX: Save practice status immediately to profile
                    if (user) {
                      try {
                        const currentLicenseData = (profile?.license_plan_data as any) || {};
                        const updatedLicenseData = {
                          ...currentLicenseData,
                          has_practice: checked,
                        };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            license_plan_data: updatedLicenseData,
                          })
                          .eq('id', user.id);
                          
                        if (error) {
                          console.error('Error saving practice status:', error);
                        } else {
                          console.log('✅ Practice status saved:', checked);
                          // Refresh profile for cross-screen sync
                          await refreshProfile();
                        }
                      } catch (error) {
                        console.error('Error updating practice status:', error);
                      }
                    }
                  }}
                  backgroundColor={hasPractice ? '$blue8' : '$gray6'}
                >
                  <Switch.Thumb />
                </Switch>
                <Text size="md" color="$color">
                  {hasPractice ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                </Text>
              </XStack>
            </YStack>

            {/* Previous Experience Dropdown */}
            <DropdownButton
              onPress={showPreviousExperienceSheet}
              value={previousExperience || (t('onboarding.licensePlan.experiencePlaceholder') || 'Describe your previous driving experience')}
              placeholder={t('onboarding.licensePlan.previousExperience') || 'Previous driving experience'}
              isActive={showPreviousExperienceModal}
            />

            {/* Specific Goals Dropdown */}
            <DropdownButton
              onPress={showSpecificGoalsSheet}
              value={specificGoals || (t('onboarding.licensePlan.goalsPlaceholder') || 'Do you have specific goals with your license?')}
              placeholder={t('onboarding.licensePlan.specificGoals') || 'Specific goals'}
              isActive={showSpecificGoalsModal}
            />

            {/* Save Button */}
            <Button variant="primary" size="lg" onPress={() => {
              handleSaveLicensePlan();
            }} marginTop="$4">
              {t('onboarding.licensePlan.savePreferences') || 'Save My Preferences'}
            </Button>

            {/* Skip Button */}
            {item.skipButton && (
              <Button variant="link" size="md" onPress={() => {
                handleSkipStep(item);
              }} marginTop="$2">
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
        title: t('onboarding.role.student') || 'Student',
        description: t('onboarding.role.studentDescription') || 'I want to learn to drive',
      },
      {
        id: 'instructor',
        title: t('onboarding.role.instructor') || 'Instructor',
        description: t('onboarding.role.instructorDescription') || 'I teach others to drive',
      },
      {
        id: 'school',
        title: t('onboarding.role.school') || 'Driving School',
        description: t('onboarding.role.schoolDescription') || 'I represent a driving school',
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

          {/* Save Button */}
          <YStack width="100%" marginTop="$4" gap="$2">
                              <Button variant="primary" size="lg" onPress={handleSaveRole}>
                {t('onboarding.role.saveRole') || 'Save Role & Continue'}
            </Button>
            
            {/* Always show skip button for role selection */}
            <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
              {t('onboarding.skipForNow') || 'Skip for now'}
            </Button>
          </YStack>
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
            {/* Show Vromm logo on complete step */}
            {item.id === 'complete' && (
              <Image
                source={require('../../assets/images/vromm_symbol.png')}
                style={{
                  width: 120,
                  height: 120,
                  marginBottom: 16,
                }}
                resizeMode="contain"
              />
            )}
            
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
                <Button
                  variant="secondary"
                  size="lg"
                  onPress={handleLocationPermission}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <>
                      <Animated.View
                        style={{
                          transform: [{
                            rotate: spinValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }]
                        }}
                      >
                        <Feather name="loader" size={16} color="#145251" />
                      </Animated.View>
{(t('onboarding.location.detectingLocation') || 'Detecting Location').replace('...', '')}{'.'.repeat(dotsCount)}
                    </>
                  ) : (
                    t('onboarding.location.detectLocation') || 'Detect My Location'
                  )}
                </Button>

                <DropdownButton
                  onPress={showCityModal}
                  value={selectedCity}
                  placeholder={t('onboarding.location.selectCity') || 'Or Select Your City'}
                  isActive={showCityDrawer}
                />
                
                {/* Clear location chip */}
                {selectedCity && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedCity('');
                      setLocationStatus('unknown');
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      alignSelf: 'center',
                    }}
                  >
                    <Text color={colorScheme === 'dark' ? '#CCCCCC' : '#666666'} size="sm">
                      {t('onboarding.location.clearLocation') || 'Clear Selected Location'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Save button when city is selected or location is detected */}
                {selectedCity && (
                  <Button variant="primary" size="lg" onPress={() => {
                    setCompletedSteps((prev) => new Set(prev).add('location'));
                    nextSlide();
                  }}>
                    {t('onboarding.location.saveLocation') || 'Save Location & Continue'}
                  </Button>
                )}
                
                <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                  {t('onboarding.skipForNow') || 'Skip for now'}
                </Button>
              </YStack>
            )}

            {/* Action Buttons - Only show for non-location steps */}
            {item.id !== 'location' && (
              <YStack gap="$4" marginTop="$6" width="100%">
                {item.id === 'relationships' ? (
                  <YStack gap="$3" width="100%">
                    {/* Show existing relationships */}
                    {existingRelationships.length > 0 && (
                      <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                        <Text size="md" fontWeight="600" color="$color">
                          {t('onboarding.relationships.existingTitle') || 'Your Existing Relationships'} ({existingRelationships.length}):
                        </Text>
                        {existingRelationships.map((relationship) => (
                          <XStack key={relationship.id} gap="$2" alignItems="center">
                            <YStack flex={1}>
                              <RadioButton
                                onPress={() => {}} // No action on tap for existing relationships
                                title={relationship.name}
                                description={`${relationship.email} • ${relationship.role} • ${relationship.relationship_type === 'has_supervisor' ? (t('onboarding.relationships.yourSupervisor') || 'Your supervisor') : (t('onboarding.relationships.studentYouSupervise') || 'Student you supervise')} ${t('onboarding.relationships.since') || 'since'} ${new Date(relationship.created_at).toLocaleDateString()}`}
                                isSelected={false} // Don't show as selected
                              />
                            </YStack>
                            <TouchableOpacity
                              onPress={() => {
                                setRelationshipRemovalTarget({
                                  id: relationship.id,
                                  name: relationship.name,
                                  email: relationship.email,
                                  role: relationship.role,
                                  relationship_type: relationship.relationship_type,
                                });
                                openRelationshipRemovalModal();
                              }}
                            >
                              <Feather name="trash-2" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </XStack>
                        ))}
                      </YStack>
                    )}
                    
                    {/* Show selected connections with message */}
                    {selectedConnections.length > 0 && (
                      <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                        <Text size="md" fontWeight="600" color="$color">
                          {t('onboarding.relationships.newConnectionsTitle') || 'New Connection to Add'} ({selectedConnections.length}):
                        </Text>
                        {selectedConnections.map((connection) => (
                          <RadioButton
                            key={connection.id}
                            onPress={() => {
                              // Remove this connection
                              setSelectedConnections(prev => 
                                prev.filter(conn => conn.id !== connection.id)
                              );
                            }}
                            title={connection.full_name || connection.email}
                            description={`${connection.email} • ${connection.role || 'instructor'} • ${t('onboarding.connections.tapToRemove') || 'Tap to remove'}`}
                            isSelected={true}
                          />
                        ))}
                        
                        {/* Show custom message if provided */}
                        {connectionCustomMessage.trim() && (
                          <YStack gap="$1" marginTop="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                            <Text size="sm" color="$gray11" fontWeight="600">Your message:</Text>
                            <Text size="sm" color="$color" fontStyle="italic">
                              "{connectionCustomMessage.trim()}"
                            </Text>
                          </YStack>
                        )}
                      </YStack>
                    )}
                    
                    {/* Action buttons */}
                    {selectedConnections.length > 0 ? (
                      <Button variant="primary" size="lg" onPress={async () => {
                        await handleCreateSelectedConnections();
                        // Clear selections after successful save
                        setSelectedConnections([]);
                        setConnectionCustomMessage('');
                        nextSlide();
                      }}>
                        Save {selectedConnections.length > 1 ? 'Connections' : 'Connection'} & Continue
                  </Button>
                    ) : existingRelationships.length > 0 ? (
                      <YStack gap="$2" width="100%">
                        <Button variant="primary" size="lg" onPress={() => {
                          // Skip to next step since user already has relationships
                          setCompletedSteps((prev) => new Set(prev).add('relationships'));
                          nextSlide();
                        }}>
                          {t('onboarding.relationships.continueExisting') || 'Continue with Existing Relationships'}
                        </Button>
                        <Button variant="secondary" size="lg" onPress={showConnectionsModal}>
                          {t('onboarding.relationships.addMore') || 'Add More Connections'}
                        </Button>
                        <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                          {t('onboarding.skipForNow') || 'Skip for now'}
                        </Button>
                      </YStack>
                    ) : (
                      <YStack gap="$2" width="100%">
                        <Button variant="secondary" size="lg" onPress={showConnectionsModal}>
                          {t('onboarding.relationships.findConnections') || 'Find Connections'}
                        </Button>
                        <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                          {t('onboarding.skipForNow') || 'Skip for now'}
                        </Button>
                      </YStack>
                    )}
                  </YStack>
                ) : item.id === 'complete' ? (
                  <YStack gap="$2" width="100%">
                    {/* Language Selection Dropdown */}
                    <DropdownButton
                      onPress={showLanguageSheet}
                      value={LANGUAGE_LABELS[language]}
                      placeholder={t('onboarding.complete.selectLanguage') || 'Select Language'}
                      isActive={showLanguageModal}
                    />
                    
                    <Button variant="primary" size="lg" onPress={completeOnboarding}>
                      {t('onboarding.complete.startJourney') || 'Start Using Vromm!'}
                    </Button>
                    <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                      {t('onboarding.skipForNow') || 'Skip for now'}
                    </Button>
                  </YStack>
                ) : (
                  <Button variant="primary" size="lg" onPress={() => nextSlide()}>
                    {t('onboarding.continue') || 'Continue'}
                  </Button>
                )}

                {item.skipButton && item.id !== 'relationships' && item.id !== 'complete' && (
                  <Button variant="link" size="md" onPress={() => handleSkipStep(item)}>
                    {t('onboarding.skipForNow') || item.skipButton}
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
    // Render step without excessive logging to prevent console flooding
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

      {/* Close Button - Header Style */}
      <View
        style={{
          position: 'absolute',
          top: insets.top || 40,
          right: 16,
          zIndex: 1000,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            // Close button should complete onboarding permanently
            // Users can still access features through GettingStarted.tsx
            completeOnboarding();
          }}
          style={{
            padding: 12,
            marginRight: -8,
          }}
        >
          <Feather name="x" size={24} color={iconColor} />
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
        onScroll={(event) => {
          handleScroll(event);
        }}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={false}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        // Scroll events without excessive logging
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
                    backgroundColor: isActive ? '#00FFBC' : textColor,
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
              {t('onboarding.city.title') || 'Select Your City'}
            </Text>
            
            <FormField
              placeholder={t('onboarding.city.searchPlaceholder') || "Search cities... (try 'Ystad', 'New York', etc.)"}
              value={citySearchQuery}
              onChangeText={handleCitySearch}
            />
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$1">
                {citySearchResults.length === 0 && citySearchQuery.length >= 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    {t('onboarding.city.noCitiesFor') || 'No cities found for'} "{citySearchQuery}"
                  </Text>
                )}
                
                {citySearchResults.length === 0 && citySearchQuery.length < 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    {t('onboarding.city.startTyping') || 'Start typing to search for any city worldwide'}
                  </Text>
                )}
                
                {/* Show selected city first if it exists and matches search or is detected */}
                {selectedCity && !citySearchResults.some(city => {
                  const cityName = [city.city, city.country].filter(Boolean).join(', ');
                  return cityName === selectedCity;
                }) && (
                  <TouchableOpacity
                    key="selected-city"
                    style={[
                      styles.sheetOption,
                      { backgroundColor: selectedBackgroundColor },
                    ]}
                  >
                    <XStack gap={8} padding="$2" alignItems="center">
                      <Text color={textColor} size="lg">
                        {selectedCity} (Current)
                      </Text>
                      <Check size={16} color={focusBorderColor} style={{ marginLeft: 'auto' }} />
                    </XStack>
                  </TouchableOpacity>
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
                          <Check size={16} color={focusBorderColor} style={{ marginLeft: 'auto' }} />
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
        onRequestClose={() => {
          console.log('🔒 [OnboardingInteractive] Modal onRequestClose called');
          // Use setTimeout to avoid useInsertionEffect errors
          setTimeout(() => {
            hideConnectionsModal();
          }, 0);
        }}
      >
        <ReanimatedAnimated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: connectionsBackdropOpacityShared,
          }}
        >
          <Pressable 
            style={{ flex: 1 }}
            onPress={() => {
              console.log('🔒 [OnboardingInteractive] Background pressed');
              // Use setTimeout to avoid state conflicts
              setTimeout(() => {
                hideConnectionsModal();
              }, 0);
            }}
          >
            <ReanimatedAnimated.View
              style={[
                {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                connectionsAnimatedStyle
              ]}
            >
          <YStack
                backgroundColor={backgroundColor}
            padding="$4"
                paddingBottom={insets.bottom || 20}
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
                gap="$4"
                height={height * 0.9}
                maxHeight={height * 0.9}
              >
                {/* Drag Handle */}
                <GestureDetector gesture={connectionsPanGesture}>
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}>
                    <View style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                    }} />
                  </View>
                </GestureDetector>

            <Text size="xl" weight="bold" color="$color" textAlign="center">
              {selectedRole === 'student' 
                ? (t('onboarding.connections.findInstructors') || 'Find Instructors')
                : selectedRole === 'instructor' || selectedRole === 'school' 
                  ? (t('onboarding.connections.findStudents') || 'Find Students')
                  : (t('onboarding.connections.findUsers') || 'Find Users')
              }
              </Text>
            
            <Text size="sm" color="$gray11">
              {selectedRole === 'student' 
                ? (t('onboarding.connections.searchInstructors') || 'Search for driving instructors to connect with')
                : selectedRole === 'instructor' || selectedRole === 'school' 
                  ? (t('onboarding.connections.searchStudents') || 'Search for students to connect with')
                  : (t('onboarding.connections.searchUsers') || 'Search for users to connect with')
              }
            </Text>
            
            {/* Custom message input - using FormField styling */}
            <YStack gap="$2">
              <Text size="sm" color="$gray11">{t('onboarding.connections.optionalMessage') || 'Optional message:'}</Text>
            <TextInput
                value={connectionCustomMessage}
                onChangeText={setConnectionCustomMessage}
                placeholder={t('onboarding.connections.messagePlaceholder') || 'Add a personal message...'}
                multiline
                style={[
                  {
                    minHeight: 40,
                    textAlignVertical: 'top',
                    padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                    fontSize: 14,
                  },
                  // Dynamic theming
                  {
                    backgroundColor: backgroundColor,
                    color: textColor,
                    borderColor: borderColor,
                  }
                ]}
                placeholderTextColor={handleColor}
              />
            </YStack>
            
            <FormField
              placeholder={t('onboarding.connections.searchPlaceholder') || 'Search by name or email...'}
              value={connectionSearchQuery}
              onChangeText={handleSearchUsers}
            />
            
            <ScrollView style={{ flex: 1, maxHeight: 180 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 8 }}>
              <YStack gap="$2">
                {searchResults.length === 0 && connectionSearchQuery.length >= 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    {t('onboarding.connections.noUsers') || 'No users found'}
                  </Text>
                )}
                
                {searchResults.length === 0 && connectionSearchQuery.length < 2 && (
                  <Text size="sm" color="$gray11" textAlign="center" paddingVertical="$4">
                    {t('onboarding.connections.startTyping') || 'Start typing to search for users'}
                  </Text>
                )}
                
                {searchResults.map((user) => {
                  const isSelected = selectedConnections.some(conn => conn.id === user.id);
                  return (
                  <TouchableOpacity
                    key={user.id}
                      onPress={() => {
                        if (isSelected) {
                          // Remove from selection
                          setSelectedConnections(prev => prev.filter(conn => conn.id !== user.id));
                        } else {
                          // Add to selection
                          setSelectedConnections(prev => [...prev, user]);
                        }
                      }}
                      style={[
                        styles.selectButton,
                        {
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? focusBorderColor : borderColor,
                          backgroundColor: isSelected ? focusBackgroundColor : 'transparent',
                          marginVertical: 4,
                        }
                      ]}
                    >
                      <XStack gap={8} padding="$2" alignItems="center" width="100%">
                        <YStack flex={1}>
                          <Text color={isSelected ? textColor : '$color'} size="md" weight="semibold">
                          {user.full_name || 'Unknown User'}
                        </Text>
                        <Text size="sm" color="$gray11">
                          {user.email} • {user.role}
                        </Text>
                      </YStack>
                        {isSelected ? (
                          <Check size={16} color={focusBorderColor} />
                        ) : (
                          <Feather name="plus-circle" size={16} color={textColor} />
                        )}
                    </XStack>
                  </TouchableOpacity>
                  );
                })}
              </YStack>
            </ScrollView>
                
                        {/* Action buttons - stacked vertically */}
            <YStack gap="$2">
              {selectedConnections.length > 0 && (
          <Button 
                  variant="primary"
                  size="md"
                  onPress={() => {
                    console.log('🔒 [OnboardingInteractive] Select connections button pressed');
                    setTimeout(() => {
                      hideConnectionsModal();
                    }, 0);
                    // Selected connections remain in state for the save button
                  }}
                >
                  Select {selectedConnections.length} Connection{selectedConnections.length > 1 ? 's' : ''}
                </Button>
              )}
              <Button 
                variant="tertiary"
                size="md"
                onPress={() => {
                  console.log('🔒 [OnboardingInteractive] Cancel connections button pressed');
                  setTimeout(() => {
                    hideConnectionsModal();
                  }, 0);
                }}
              >
                {t('common.cancel') || 'Cancel'}
          </Button>
        </YStack>
          </YStack>
            </ReanimatedAnimated.View>
          </Pressable>
        </ReanimatedAnimated.View>
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
              {t('onboarding.vehicle.title') || 'Select Vehicle Type'}
        </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
            <YStack gap="$1">
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={async () => {
                    setVehicleType(type.id);
                    hideVehicleModal();
                    
                    // 🔥 CRITICAL FIX: Save vehicle type immediately to profile for ProgressScreen sync
                    if (user) {
                      try {
                        const currentLicenseData = (profile?.license_plan_data as any) || {};
                        const updatedLicenseData = {
                          ...currentLicenseData,
                          vehicle_type: type.id,
                        };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            license_plan_data: updatedLicenseData,
                            vehicle_type: type.id, // Also save to individual column
                          })
                          .eq('id', user.id);
                          
                        if (!error) {
                          console.log('✅ Vehicle type saved for ProgressScreen sync:', type.id);
                          await refreshProfile();
                        }
                      } catch (error) {
                        console.error('Error saving vehicle type:', error);
                      }
                    }
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
              {t('onboarding.transmission.title') || 'Select Transmission'}
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
            <YStack gap="$1">
              {transmissionTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={async () => {
                    setTransmissionType(type.id);
                    hideTransmissionModal();
                    
                    // 🔥 CRITICAL FIX: Save transmission type immediately to profile for ProgressScreen sync
                    if (user) {
                      try {
                        const currentLicenseData = (profile?.license_plan_data as any) || {};
                        const updatedLicenseData = {
                          ...currentLicenseData,
                          transmission_type: type.id,
                        };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            license_plan_data: updatedLicenseData,
                            transmission_type: type.id, // Also save to individual column
                          })
                          .eq('id', user.id);
                          
                        if (!error) {
                          console.log('✅ Transmission type saved for ProgressScreen sync:', type.id);
                          await refreshProfile();
                        }
                      } catch (error) {
                        console.error('Error saving transmission type:', error);
                      }
                    }
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

      {/* Experience Level Selection Modal */}
      <Modal
        visible={showExperienceModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowExperienceModal(false)}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowExperienceModal(false)}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
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
              {t('onboarding.experience.title') || 'Select Experience Level'}
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$1">
                {(experienceLevels.length > 0 ? experienceLevels : [
                  { id: 'beginner', title: language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)', description: language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)' },
                  { id: 'intermediate', title: language === 'sv' ? 'Medel (viss vägvana)' : 'Intermediate (some road experience)', description: language === 'sv' ? 'Medel (viss vägvana)' : 'Intermediate (some road experience)' },
                  { id: 'advanced', title: language === 'sv' ? 'Avancerad (behöver förfinas / förberedas inför prov)' : 'Advanced (needs refinement / preparing for test)', description: language === 'sv' ? 'Avancerad (behöver förfinas / förberedas inför prov)' : 'Advanced (needs refinement / preparing for test)' },
                  { id: 'refresher', title: language === 'sv' ? 'Repetitionskurs (återvändande förare)' : 'Refresher (returning drivers)', description: language === 'sv' ? 'Repetitionskurs (återvändande förare)' : 'Refresher (returning drivers)' },
                  { id: 'expert', title: language === 'sv' ? 'Expert' : 'Expert', description: language === 'sv' ? 'Expert' : 'Expert' },
                ]).map((level: { id: string; title: string; description?: string }) => (
                <TouchableOpacity
                  key={level.id}
                  onPress={async () => {
                    setSelectedExperienceLevel(level.id);
                    setShowExperienceModal(false);
                    
                    // 🔥 CRITICAL FIX: Save experience level immediately to profile for ProgressScreen sync
                    if (user) {
                      try {
                        const currentLicenseData = (profile?.license_plan_data as any) || {};
                        const updatedLicenseData = {
                          ...currentLicenseData,
                          experience_level: level.id,
                        };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            license_plan_data: updatedLicenseData,
                            experience_level: mapToValidExperienceLevel(level.id) as Database['public']['Enums']['experience_level'],
                          })
                          .eq('id', user.id);
                          
                        if (!error) {
                          console.log('✅ Experience level saved for ProgressScreen sync:', level.id);
                          await refreshProfile();
                        }
                      } catch (error) {
                        console.error('Error saving experience level:', error);
                      }
                    }
                  }}
                  style={[
                    styles.sheetOption,
                    selectedExperienceLevel === level.id && { backgroundColor: selectedBackgroundColor },
                  ]}
                >
                  <XStack gap={8} padding="$2" alignItems="center">
                    <YStack flex={1}>
                      <Text color={textColor} size="lg">
                        {level.title}
                      </Text>
                      {level.description && (
                        <Text color={handleColor} size="sm">
                          {level.description}
                        </Text>
                      )}
                    </YStack>
                    {selectedExperienceLevel === level.id && (
                      <Check size={16} color={focusBorderColor} style={{ marginLeft: 'auto' }} />
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
              {t('onboarding.license.title') || 'Select License Type'}
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
            <YStack gap="$1">
              {licenseTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={async () => {
                    setLicenseType(type.id);
                    hideLicenseModal();
                    
                    // 🔥 CRITICAL FIX: Save license type immediately to profile for ProgressScreen sync
                    if (user) {
                      try {
                        const currentLicenseData = (profile?.license_plan_data as any) || {};
                        const updatedLicenseData = {
                          ...currentLicenseData,
                          license_type: type.id,
                        };
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            license_plan_data: updatedLicenseData,
                            license_type: type.id, // Also save to individual column
                          })
                          .eq('id', user.id);
                          
                        if (!error) {
                          console.log('✅ License type saved for ProgressScreen sync:', type.id);
                          await refreshProfile();
                        }
                      } catch (error) {
                        console.error('Error saving license type:', error);
                      }
                    }
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
      
      {/* Date Selection Modal with Quick Options + Custom Picker */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowDateModal(false)}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setShowDateModal(false)}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
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
              {t('onboarding.date.title') || 'When do you want your license?'}
            </Text>
            
            <YStack gap="$3">
              {/* Quick date options */}
              {[
                { label: t('onboarding.date.within3months') || 'Within 3 months', months: 3, key: '3months' },
                { label: t('onboarding.date.within6months') || 'Within 6 months', months: 6, key: '6months' },
                { label: t('onboarding.date.within1year') || 'Within 1 year', months: 12, key: '1year' },
                { label: t('onboarding.date.noSpecific') || 'No specific date', months: 24, key: 'nodate' },
              ].map((option) => {
                const targetDate = new Date();
                targetDate.setMonth(targetDate.getMonth() + option.months);
                const isSelected = selectedDateOption === option.key;
                
                return (
                  <RadioButton
                    key={option.label}
                    onPress={() => {
                      setSelectedTargetDate(targetDate);
                      setSelectedDateOption(option.key);
                      // Don't auto-close - let user press save button
                    }}
                    title={option.label}
                    description={targetDate.toLocaleDateString()}
                    isSelected={isSelected}
                  />
                );
              })}
              
              {/* Custom Date Picker with Popover */}
              <TouchableOpacity
                ref={dateButtonRef}
                onPress={() => {
                  console.log('🗓️ [OnboardingInteractive] Opening date popover');
                  setSelectedDateOption('custom');
                  setShowDatePopover(true);
                }}
                style={[
                  styles.selectButton,
                  {
                    borderWidth: selectedDateOption === 'custom' ? 2 : 1,
                    borderColor: selectedDateOption === 'custom' ? focusBorderColor : borderColor,
                    backgroundColor: selectedDateOption === 'custom' ? focusBackgroundColor : 'transparent',
                    marginVertical: 4,
                  }
                ]}
              >
                <XStack gap={8} padding="$2" alignItems="center" width="100%">
                  <YStack flex={1}>
                    <Text color={selectedDateOption === 'custom' ? textColor : '$color'} size="md" weight="semibold">
                      {t('onboarding.date.pickSpecific') || 'Pick specific date'}
                    </Text>
                    <Text size="sm" color="$gray11">
                      {selectedTargetDate.toLocaleDateString()}
                    </Text>
                  </YStack>
                  {selectedDateOption === 'custom' ? (
                    <Check size={16} color={focusBorderColor} />
                  ) : (
                    <Feather name="calendar" size={16} color={textColor} />
                  )}
                </XStack>
              </TouchableOpacity>
              
              <Popover
                isVisible={showDatePopover}
                onRequestClose={() => {
                  console.log('🗓️ [OnboardingInteractive] Popover onRequestClose called');
                  setShowDatePopover(false);
                  // Complete cleanup to prevent any blocking issues
                  setTimeout(() => {
                    console.log('🗓️ [OnboardingInteractive] Complete cleanup after popover close');
                    setSelectedDateOption('custom');
                  }, 10);
                }}
                from={dateButtonRef}
                placement={'top' as any}
                backgroundStyle={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                popoverStyle={{
                  backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFF',
                  borderRadius: 12,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 12,
                  width: 380,
                  height: 480,
                  borderWidth: colorScheme === 'dark' ? 1 : 0,
                  borderColor: colorScheme === 'dark' ? '#333' : 'transparent',
                }}

              >
                <YStack alignItems="center" gap="$2" width="100%">
                  <Text color={textColor} size="lg" weight="semibold" textAlign="center">
                    {t('onboarding.date.selectTarget') || 'Select Target Date'}
                  </Text>
                  
                  {/* Container for full inline DateTimePicker */}
                  <View style={{
                    width: 350,
                    height: 380,
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFF',
                    borderRadius: 8,
                    overflow: 'visible',
                  }}>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={selectedTargetDate}
                      mode="date"
                      display="inline"
                      minimumDate={new Date()}
                      maximumDate={(() => {
                        const maxDate = new Date();
                        maxDate.setFullYear(maxDate.getFullYear() + 3);
                        return maxDate;
                      })()}
                      onChange={(event, selectedDate) => {
                        console.log('🗓️ [OnboardingInteractive] Date changed:', selectedDate?.toLocaleDateString());
                        if (selectedDate) {
                          setSelectedTargetDate(selectedDate);
                          setSelectedDateOption('custom');
                          // Don't auto-close - let user press save button
                          console.log('🗓️ [OnboardingInteractive] Date updated, waiting for save button');
                        }
                      }}
                      style={{ 
                        width: 350, 
                        height: 380,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFF',
                      }}
                      themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                      accentColor="#00E6C3"
                      locale={language === 'sv' ? 'sv-SE' : 'en-US'}
                    />
        </View>
                  
                </YStack>
              </Popover>
              
              {/* Save button as last option in sheet */}
              <Button 
                variant="primary" 
                size="lg" 
                onPress={() => {
                  console.log('🗓️ [OnboardingInteractive] Save date button pressed (last option)');
                  setShowDateModal(false);
                }}
                marginTop="$4"
                width="100%"
              >
                {t('onboarding.date.saveSelectedDate') || 'Save Selected Date'}
              </Button>
            </YStack>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>

    </Stack>
    
    {/* Relationship Removal Modal */}
    <Modal
      visible={showRelationshipRemovalModal}
      transparent
      animationType="none"
      onRequestClose={closeRelationshipRemovalModal}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: relationshipRemovalBackdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={closeRelationshipRemovalModal}>
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: relationshipRemovalSheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              minHeight="60%"
            >
              <Text size="xl" weight="bold" color={textColor} textAlign="center">
                {relationshipRemovalTarget?.relationship_type === 'has_supervisor' 
                  ? (t('onboarding.relationships.removeSupervisorTitle') || 'Remove Supervisor')
                  : (t('onboarding.relationships.removeStudentTitle') || 'Remove Student')
                }
              </Text>
              
              <Text size="sm" color={textColor}>
                {relationshipRemovalTarget?.relationship_type === 'has_supervisor'
                  ? (t('onboarding.relationships.removeSupervisorConfirm') || 'Are you sure you want to remove {name} as your supervisor?').replace('{name}', relationshipRemovalTarget?.name || '')
                  : (t('onboarding.relationships.removeStudentConfirm') || 'Are you sure you want to remove {name} as your student?').replace('{name}', relationshipRemovalTarget?.name || '')
                }
              </Text>
              
              <YStack gap="$2">
                <Text size="sm" color={handleColor}>{t('onboarding.relationships.optionalMessage') || 'Optional message:'}</Text>
                <TextInput
                  value={relationshipRemovalMessage}
                  onChangeText={setRelationshipRemovalMessage}
                  placeholder={t('onboarding.relationships.messagePlaceholder') || 'Add a message explaining why (optional)...'}
                  multiline
                  style={{
                    backgroundColor: backgroundColor,
                    color: textColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholderTextColor={handleColor}
                />
              </YStack>
              
              <YStack gap="$2">
                <Button
                  variant="primary"
                  backgroundColor="$red9"
                  size="lg"
                  onPress={async () => {
                    if (!relationshipRemovalTarget || !user?.id) return;
                    
                    try {
                      // Remove the relationship
                      const { error } = await supabase
                        .from('student_supervisor_relationships')
                        .delete()
                        .or(
                          relationshipRemovalTarget.relationship_type === 'has_supervisor' 
                            ? `and(student_id.eq.${user.id},supervisor_id.eq.${relationshipRemovalTarget.id})`
                            : `and(student_id.eq.${relationshipRemovalTarget.id},supervisor_id.eq.${user.id})`
                        );

                      if (error) throw error;
                      
                      // TODO: Save removal message if provided
                      if (relationshipRemovalMessage.trim()) {
                        console.log('Removal message:', relationshipRemovalMessage.trim());
                        // Could save to a removal_logs table or as metadata
                      }
                      
                      showToast({
                        title: t('common.success') || 'Success',
                        message: t('onboarding.relationships.removeSuccess') || 'Relationship removed successfully',
                        type: 'success'
                      });
                      loadExistingRelationships(); // Refresh the list
                      closeRelationshipRemovalModal(); // Use animated close
                      
                    } catch (error) {
                      console.error('Error removing relationship:', error);
                      showToast({
                        title: t('common.error') || 'Error',
                        message: t('onboarding.relationships.removeError') || 'Failed to remove relationship',
                        type: 'error'
                      });
                    }
                  }}
                >
                  <Text color="white">{t('common.remove') || 'Remove'}</Text>
                </Button>
                <Button
                  variant="tertiary"
                  size="lg"
                  onPress={closeRelationshipRemovalModal}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </YStack>
            </YStack>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>

    {/* Previous Experience Modal */}
    <Modal
      visible={showPreviousExperienceModal}
      transparent
      animationType="none"
      onRequestClose={() => setShowPreviousExperienceModal(false)}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: previousExperienceBackdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setShowPreviousExperienceModal(false)}>
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: previousExperienceSheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              minHeight="60%"
            >
              <Text size="xl" weight="bold" color="$color" textAlign="center">
                {t('onboarding.licensePlan.previousExperience') || 'Previous driving experience'}
              </Text>
              
              <TextArea
                placeholder={t('onboarding.licensePlan.experiencePlaceholder') || 'Describe your previous driving experience'}
                value={previousExperience}
                onChangeText={setPreviousExperience}
                minHeight={150}
                backgroundColor="$background"
                borderColor="$borderColor"
                color="$color"
                focusStyle={{
                  borderColor: '$blue8',
                }}
              />
              
              <YStack gap="$2">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => {
                    setShowPreviousExperienceModal(false);
                  }}
                >
                  {t('common.save') || 'Save'}
                </Button>
                <Button
                  variant="tertiary"
                  size="lg"
                  onPress={() => {
                    setShowPreviousExperienceModal(false);
                  }}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </YStack>
            </YStack>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>

    {/* Specific Goals Modal */}
    <Modal
      visible={showSpecificGoalsModal}
      transparent
      animationType="none"
      onRequestClose={() => setShowSpecificGoalsModal(false)}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: specificGoalsBackdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setShowSpecificGoalsModal(false)}>
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: specificGoalsSheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              minHeight="60%"
            >
              <Text size="xl" weight="bold" color="$color" textAlign="center">
                {t('onboarding.licensePlan.specificGoals') || 'Specific goals'}
              </Text>
              
              <TextArea
                placeholder={t('onboarding.licensePlan.goalsPlaceholder') || 'Do you have specific goals with your license?'}
                value={specificGoals}
                onChangeText={setSpecificGoals}
                minHeight={150}
                backgroundColor="$background"
                borderColor="$borderColor"
                color="$color"
                focusStyle={{
                  borderColor: '$blue8',
                }}
              />
              
              <YStack gap="$2">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => {
                    setShowSpecificGoalsModal(false);
                  }}
                >
                  {t('common.save') || 'Save'}
                </Button>
                <Button
                  variant="tertiary"
                  size="lg"
                  onPress={() => {
                    setShowSpecificGoalsModal(false);
                  }}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </YStack>
            </YStack>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>

    {/* Language Selection Modal (copied from ProfileScreen.tsx) */}
    <Modal
      visible={showLanguageModal}
      transparent
      animationType="none"
      onRequestClose={hideLanguageSheet}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: languageBackdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={hideLanguageSheet} />
          <Animated.View
            style={{
              transform: [{ translateY: languageSheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 24}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
            >
              <Text size="xl" weight="bold" color={textColor} textAlign="center">
                {t('onboarding.complete.languageTitle') || 'Select Language'}
              </Text>
              <YStack gap="$2">
                {LANGUAGES.map((lang) => (
                  <RadioButton
                    key={lang}
                    onPress={async () => {
                      await setLanguage(lang);
                      hideLanguageSheet();
                    }}
                    title={LANGUAGE_LABELS[lang]}
                    isSelected={language === lang}
                  />
                ))}
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
    
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
