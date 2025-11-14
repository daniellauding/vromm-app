import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { YStack, XStack, ScrollView, TextArea, Switch } from 'tamagui';
import { Gesture, GestureDetector, PanGestureHandler } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { Text } from '../../components/Text';
import { Feather } from '@expo/vector-icons';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { useThemePreference } from '../../hooks/useThemeOverride';
import {
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Pressable,
  Platform,
  TextInput,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import Popover from 'react-native-popover-view';
import { RadioButton, DropdownButton } from '../../components/SelectButton';
import { Button } from '../../components/Button';
import { FormField } from '../../components/FormField';
import * as Haptics from 'expo-haptics';

import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { useTour } from '../../contexts/TourContext';
import { useTourTarget } from '../../components/TourOverlay';
import { CreateRouteSheet } from '../../components/CreateRouteSheet';
import { ExerciseListSheet } from '../../components/ExerciseListSheet';
import { LearningPathsSheet } from '../../components/LearningPathsSheet';
import { useCelebration } from '../../contexts/CelebrationContext';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import getting started images
const GETTING_STARTED_IMAGES = {
  licensePlan: require('../../../assets/images/getting_started/getting_started_01.png'),
  firstRoute: require('../../../assets/images/getting_started/getting_started_02.png'),
  startLearning: require('../../../assets/images/getting_started/getting_started_03.png'),
  saveRoute: require('../../../assets/images/getting_started/getting_started_04.png'),
  chooseRole: require('../../../assets/images/getting_started/getting_started_05.png'),
  connections: require('../../../assets/images/getting_started/getting_started_06.png'),
};

export const GettingStarted = () => {
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { isActive: tourActive, currentStep, steps } = useTour();
  const { t, language } = useTranslation();
  const { showCelebration } = useCelebration();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';

  // Get window dimensions
  const { height } = Dimensions.get('window');

  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

  // Register license plan card for tour targeting
  const licensePlanRef = useTourTarget('GettingStarted.LicensePlan');

  // License plan modal state and animation refs
  const [showKorkortsplanModal, setShowKorkortsplanModal] = React.useState(false);
  const korkortsplanBackdropOpacity = useRef(new Animated.Value(0)).current;
  const korkortsplanSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Snap points for license plan modal (like RouteDetailSheet)
  const licensePlanSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, [height]);

  const licensePlanTranslateY = useSharedValue(height);
  const [currentLicensePlanSnapPoint, setCurrentLicensePlanSnapPoint] = useState(
    licensePlanSnapPoints.large,
  );
  const licensePlanCurrentState = useSharedValue(licensePlanSnapPoints.large);
  const licensePlanIsAnimating = useSharedValue(false);

  // License plan form state (copied from ProfileScreen)
  const [targetDate, setTargetDate] = React.useState<Date | null>(() => {
    const planData = profile?.license_plan_data as any;
    if (planData?.target_date) {
      return new Date(planData.target_date);
    }
    return null;
  });
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showDatePopover, setShowDatePopover] = React.useState(false);
  const [selectedDateOption, setSelectedDateOption] = React.useState<string>('6months');
  const dateButtonRef = useRef<any>(null);
  const [hasTheory, setHasTheory] = React.useState<boolean>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.has_theory || false;
  });
  const [hasPractice, setHasPractice] = React.useState<boolean>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.has_practice || false;
  });
  const [previousExperience, setPreviousExperience] = React.useState<string>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.previous_experience || '';
  });
  const [specificGoals, setSpecificGoals] = React.useState<string>(() => {
    const planData = profile?.license_plan_data as any;
    return planData?.specific_goals || '';
  });
  const [loading, setLoading] = React.useState(false);

  // New license details state (from OnboardingInteractive steps 2+3)
  const [vehicleType, setVehicleType] = React.useState<string>(() => {
    return (profile as any)?.vehicle_type || 'car';
  });
  const [transmissionType, setTransmissionType] = React.useState<string>(() => {
    return (profile as any)?.transmission_type || 'manual';
  });
  const [licenseType, setLicenseType] = React.useState<string>(() => {
    return (profile as any)?.license_type || 'b';
  });
  const [experienceLevel, setExperienceLevel] = React.useState<string>(() => {
    return profile?.experience_level || 'beginner';
  });

  // Modal states for new dropdowns
  const [showVehicleModal, setShowVehicleModal] = React.useState(false);
  const [showTransmissionModal, setShowTransmissionModal] = React.useState(false);
  const [showLicenseModal, setShowLicenseModal] = React.useState(false);
  const [showExperienceModal, setShowExperienceModal] = React.useState(false);

  // Options for dropdowns (matching OnboardingInteractive)
  const vehicleTypeOptions = [
    { id: 'car', title: language === 'sv' ? 'Bil' : 'Car' },
    { id: 'motorcycle', title: language === 'sv' ? 'Motorcykel' : 'Motorcycle' },
    { id: 'truck', title: language === 'sv' ? 'Lastbil' : 'Truck' },
    { id: 'bus', title: language === 'sv' ? 'Buss' : 'Bus' },
  ];

  const transmissionTypeOptions = [
    { id: 'manual', title: language === 'sv' ? 'Manuell' : 'Manual' },
    { id: 'automatic', title: language === 'sv' ? 'Automat' : 'Automatic' },
  ];

  const licenseTypeOptions = [
    { id: 'b', title: language === 'sv' ? 'Standardkörkort (B)' : 'Standard License (B)' },
    { id: 'a', title: language === 'sv' ? 'Motorcykel (A)' : 'Motorcycle (A)' },
    { id: 'c', title: language === 'sv' ? 'Lastbil (C)' : 'Truck (C)' },
    { id: 'd', title: language === 'sv' ? 'Buss (D)' : 'Bus (D)' },
  ];

  const experienceLevelOptions = [
    {
      id: 'beginner',
      title: language === 'sv' ? 'Nybörjare (aldrig kört)' : 'Beginner (never driven)',
    },
    {
      id: 'intermediate',
      title: language === 'sv' ? 'Medel (viss vägvana)' : 'Intermediate (some road experience)',
    },
    {
      id: 'advanced',
      title:
        language === 'sv'
          ? 'Avancerad (behöver förfinas / förberedas inför prov)'
          : 'Advanced (needs refinement / preparing for test)',
    },
    {
      id: 'refresher',
      title:
        language === 'sv'
          ? 'Repetitionskurs (återvändande förare)'
          : 'Refresher (returning drivers)',
    },
    { id: 'expert', title: language === 'sv' ? 'Expert' : 'Expert' },
  ];

  // Role selection modal state (copied from OnboardingInteractive)
  const [showRoleModal, setShowRoleModal] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string | null>(() => {
    return profile?.role || 'student';
  });
  const roleBackdropOpacity = useRef(new Animated.Value(0)).current;
  const roleSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Role modal snap points
  const roleSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.3, // Smaller modal - starts at 30%
      medium: height * 0.5, // Medium at 50%
      small: height * 0.7, // Small at 70%
      mini: height * 0.85, // Mini at 85%
      dismissed: height, // Dismissed
    };
    return points;
  }, [height]);

  const roleTranslateY = useSharedValue(height);
  const [currentRoleSnapPoint, setCurrentRoleSnapPoint] = useState(roleSnapPoints.large);
  const roleCurrentState = useSharedValue(roleSnapPoints.large);
  const roleIsAnimating = useSharedValue(false);

  // Connections modal state (copied from OnboardingInteractive)
  const [showConnectionsModal, setShowConnectionsModal] = React.useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedConnections, setSelectedConnections] = React.useState<
    Array<{ id: string; full_name: string; email: string; role?: string }>
  >([]);
  const [connectionCustomMessage, setConnectionCustomMessage] = React.useState('');
  const connectionsBackdropOpacity = useRef(new Animated.Value(0)).current;
  const connectionsSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Gesture handling for connections modal (like RouteDetailSheet)
  const connectionsTranslateY = useSharedValue(height);
  const connectionsBackdropOpacityShared = useSharedValue(0);

  const connectionsSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, [height]);

  const [currentConnectionsSnapPoint, setCurrentConnectionsSnapPoint] = useState(
    connectionsSnapPoints.large,
  );
  const currentConnectionsState = useSharedValue(connectionsSnapPoints.large);

  const connectionsAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: connectionsTranslateY.value }],
    };
  });

  const connectionsPanGesture = Gesture.Pan()
    .onBegin(() => {
      console.log('🎯 [GettingStarted] DRAG HANDLE GESTURE STARTED');
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        console.log('🎯 [GettingStarted] DRAG HANDLE GESTURE UPDATE - translationY:', translationY);
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
      console.log(
        '🎯 [GettingStarted] DRAG HANDLE GESTURE END - translationY:',
        translationY,
        'velocityY:',
        velocityY,
      );

      const currentPosition = currentConnectionsState.value + translationY;

      // Only dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > connectionsSnapPoints.mini + 30 && velocityY > 200) {
        console.log('🎯 [GettingStarted] DRAG HANDLE - DISMISSING MODAL');
        runOnJS(hideConnectionsSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = connectionsSnapPoints.large;
        console.log('🎯 [GettingStarted] DRAG HANDLE - FAST UPWARD SWIPE - going to LARGE');
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = connectionsSnapPoints.mini;
        console.log('🎯 [GettingStarted] DRAG HANDLE - FAST DOWNWARD SWIPE - going to MINI');
      } else {
        // Find closest snap point
        const positions = [
          connectionsSnapPoints.large,
          connectionsSnapPoints.medium,
          connectionsSnapPoints.small,
          connectionsSnapPoints.mini,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
        console.log(
          '🎯 [GettingStarted] DRAG HANDLE - SNAP TO CLOSEST - targetSnapPoint:',
          targetSnapPoint,
        );
      }

      // Constrain target to valid range
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, connectionsSnapPoints.large),
        connectionsSnapPoints.mini,
      );

      console.log('🎯 [GettingStarted] DRAG HANDLE - ANIMATING TO:', boundedTarget);

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

  // Helper function to check if license plan should be highlighted
  const isLicensePlanHighlighted = (): boolean => {
    if (!tourActive || typeof currentStep !== 'number' || !steps[currentStep]) return false;
    const step = steps[currentStep];
    return (
      step.targetScreen === 'GettingStarted.LicensePlan' ||
      step.targetElement === 'GettingStarted.LicensePlan'
    );
  };

  const [hasCreatedRoutes, setHasCreatedRoutes] = React.useState(false);
  const [hasCompletedExercise, setHasCompletedExercise] = React.useState(false);
  const [hasSavedRoute, setHasSavedRoute] = React.useState(false);
  const [hasConnections, setHasConnections] = React.useState(false);
  const [hasCreatedEvent, setHasCreatedEvent] = React.useState(false);

  // Existing relationships state (copied from OnboardingInteractive)
  const [existingRelationships, setExistingRelationships] = React.useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      relationship_type: string;
      created_at: string;
    }>
  >([]);

  // Relationship removal modal state
  const [showRelationshipRemovalModal, setShowRelationshipRemovalModal] = React.useState(false);
  const [relationshipRemovalTarget, setRelationshipRemovalTarget] = React.useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    relationship_type: string;
  } | null>(null);
  const [relationshipRemovalMessage, setRelationshipRemovalMessage] = React.useState('');
  const relationshipRemovalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const relationshipRemovalSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Relationship removal modal snap points
  const relationshipRemovalSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.2, // Smaller modal - starts at 20%
      medium: height * 0.4, // Medium at 40%
      small: height * 0.6, // Small at 60%
      mini: height * 0.8, // Mini at 80%
      dismissed: height, // Dismissed
    };
    return points;
  }, [height]);

  const relationshipRemovalTranslateY = useSharedValue(height);
  const [currentRelationshipRemovalSnapPoint, setCurrentRelationshipRemovalSnapPoint] = useState(
    relationshipRemovalSnapPoints.large,
  );
  const relationshipRemovalCurrentState = useSharedValue(relationshipRemovalSnapPoints.large);
  const relationshipRemovalIsAnimating = useSharedValue(false);

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = React.useState<any[]>([]);

  // Tab state for relationships
  const [activeRelationshipsTab, setActiveRelationshipsTab] = React.useState<
    'pending' | 'existing'
  >('pending');

  // Sheet modals state
  const [showCreateRouteSheet, setShowCreateRouteSheet] = React.useState(false);
  const [showLearningPathsSheet, setShowLearningPathsSheet] = React.useState(false);
  const [showExerciseListSheet, setShowExerciseListSheet] = React.useState(false);

  // Learning paths state (like ProgressSection.tsx)
  const [learningPaths, setLearningPaths] = React.useState<any[]>([]);
  const [firstLearningPathId, setFirstLearningPathId] = React.useState<string | null>(null);
  const [firstLearningPathTitle, setFirstLearningPathTitle] = React.useState<string>('');

  // Selected learning path state for sheet navigation
  const [selectedLearningPath, setSelectedLearningPath] = React.useState<any | null>(null);

  // License plan gesture handler (like RouteDetailSheet)
  const licensePlanPanGesture = Gesture.Pan()
    .enableTrackpadTwoFingerGesture(false)
    .onBegin(() => {
      if (licensePlanIsAnimating.value) return;
      licensePlanIsAnimating.value = true;
    })
    .onUpdate((event) => {
      if (licensePlanIsAnimating.value === false) return;

      const { translationY } = event;
      const newPosition = licensePlanCurrentState.value + translationY;

      // Constrain to snap points range
      const minPosition = licensePlanSnapPoints.large;
      const maxPosition = licensePlanSnapPoints.mini + 100;
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      licensePlanTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      if (licensePlanIsAnimating.value === false) return;

      const { translationY, velocityY } = event;
      const currentPosition = licensePlanCurrentState.value + translationY;

      // Dismiss if dragged down past mini with reasonable velocity
      if (currentPosition > licensePlanSnapPoints.mini + 30 && velocityY > 200) {
        licensePlanIsAnimating.value = false;
        runOnJS(hideKorkortsplanSheet)();
        return;
      }

      // Determine target snap point
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = licensePlanSnapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = licensePlanSnapPoints.mini;
      } else {
        const positions = [
          licensePlanSnapPoints.large,
          licensePlanSnapPoints.medium,
          licensePlanSnapPoints.small,
          licensePlanSnapPoints.mini,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, licensePlanSnapPoints.large),
        licensePlanSnapPoints.mini,
      );

      licensePlanTranslateY.value = withSpring(
        boundedTarget,
        {
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
        () => {
          licensePlanIsAnimating.value = false;
        },
      );

      licensePlanCurrentState.value = boundedTarget;
      runOnJS(setCurrentLicensePlanSnapPoint)(boundedTarget);
    });

  // Körkortsplan modal show/hide functions (updated for snap points)
  const showKorkortsplanSheet = () => {
    if (showKorkortsplanModal) return; // Prevent multiple calls

    setShowKorkortsplanModal(true);
    licensePlanIsAnimating.value = false; // Reset animation state
    licensePlanTranslateY.value = withSpring(licensePlanSnapPoints.large, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    licensePlanCurrentState.value = licensePlanSnapPoints.large;
    setCurrentLicensePlanSnapPoint(licensePlanSnapPoints.large);

    Animated.timing(korkortsplanBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideKorkortsplanSheet = () => {
    if (!showKorkortsplanModal) return; // Prevent multiple calls

    licensePlanIsAnimating.value = false; // Stop any ongoing gestures
    licensePlanTranslateY.value = withSpring(licensePlanSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    Animated.timing(korkortsplanBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setShowKorkortsplanModal(false);
    }, 300);
  };

  // License plan functions (copied from ProfileScreen)
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleLicensePlanSubmit = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Format the data to save
      const licenseData = {
        target_date: targetDate ? targetDate.toISOString() : null,
        has_theory: hasTheory,
        has_practice: hasPractice,
        previous_experience: previousExperience,
        specific_goals: specificGoals,
      };

      // Update the profile with all fields
      const { error } = await supabase
        .from('profiles')
        .update({
          license_plan_completed: true,
          license_plan_data: licenseData,
          vehicle_type: vehicleType,
          transmission_type: transmissionType,
          license_type: licenseType,
          experience_level: experienceLevel,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh the profile to get the updated data
      await refreshProfile();

      // Hide the modal
      hideKorkortsplanSheet();
    } catch (err) {
      console.error('Error saving license plan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Role modal gesture handler
  const rolePanGesture = Gesture.Pan()
    .onBegin(() => {
      if (roleIsAnimating.value) return;
      roleIsAnimating.value = true;
    })
    .onUpdate((event) => {
      if (roleIsAnimating.value === false) return;

      const { translationY } = event;
      const newPosition = roleCurrentState.value + translationY;

      const minPosition = roleSnapPoints.large;
      const maxPosition = roleSnapPoints.mini + 100;
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      roleTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      if (roleIsAnimating.value === false) return;

      const { translationY, velocityY } = event;
      const currentPosition = roleCurrentState.value + translationY;

      if (currentPosition > roleSnapPoints.mini + 30 && velocityY > 200) {
        roleIsAnimating.value = false;
        runOnJS(hideRoleSheet)();
        return;
      }

      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = roleSnapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = roleSnapPoints.mini;
      } else {
        const positions = [
          roleSnapPoints.large,
          roleSnapPoints.medium,
          roleSnapPoints.small,
          roleSnapPoints.mini,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, roleSnapPoints.large),
        roleSnapPoints.mini,
      );

      roleTranslateY.value = withSpring(
        boundedTarget,
        {
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
        () => {
          roleIsAnimating.value = false;
        },
      );

      roleCurrentState.value = boundedTarget;
      runOnJS(setCurrentRoleSnapPoint)(boundedTarget);
    });

  // Role modal show/hide functions (updated for snap points)
  const showRoleSheet = () => {
    if (showRoleModal) return; // Prevent multiple calls

    setShowRoleModal(true);
    roleIsAnimating.value = false; // Reset animation state
    roleTranslateY.value = withSpring(roleSnapPoints.large, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    roleCurrentState.value = roleSnapPoints.large;
    setCurrentRoleSnapPoint(roleSnapPoints.large);

    Animated.timing(roleBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideRoleSheet = () => {
    if (!showRoleModal) return; // Prevent multiple calls

    roleIsAnimating.value = false; // Stop any ongoing gestures
    roleTranslateY.value = withSpring(roleSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    Animated.timing(roleBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setShowRoleModal(false);
    }, 300);
  };

  // Load pending invitations
  const loadPendingInvitations = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('invited_by', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending invitations:', error);
        return;
      }

      // Filter out invitations where the relationship already exists
      const filteredInvitations = [];
      if (data) {
        for (const invitation of data) {
          // Get the target user ID from the invitation
          const targetUserId = invitation.targetUserId || invitation.invited_by;

          // Check if relationship already exists
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(
              `and(student_id.eq.${targetUserId},supervisor_id.eq.${user.id}),and(student_id.eq.${user.id},supervisor_id.eq.${targetUserId})`,
            )
            .eq('status', 'active')
            .single();

          if (!existingRelationship) {
            filteredInvitations.push(invitation);
          } else {
            console.log(
              '📤 [GettingStarted] Filtering out processed invitation:',
              invitation.id,
              'relationship already exists',
            );
            // Mark the invitation as processed
            await supabase
              .from('pending_invitations')
              .update({ status: 'accepted' })
              .eq('id', invitation.id);
          }
        }
      }

      console.log('📤 [GettingStarted] Loaded pending invitations:', {
        total: data?.length || 0,
        filtered: filteredInvitations.length,
        removed: (data?.length || 0) - filteredInvitations.length,
      });
      console.log(
        '📤 [GettingStarted] Invitation IDs:',
        filteredInvitations.map((inv) => inv.id),
      );
      console.log('📤 [GettingStarted] Full invitation data:', filteredInvitations);

      setPendingInvitations(filteredInvitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  // Connections modal show/hide functions (copied from OnboardingInteractive)
  const showConnectionsSheet = () => {
    // Load existing relationships and pending invitations when opening the modal
    loadExistingRelationships();
    loadPendingInvitations();

    setShowConnectionsModal(true);
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

  const hideConnectionsSheet = () => {
    connectionsTranslateY.value = withSpring(connectionsSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    connectionsBackdropOpacityShared.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
    setTimeout(() => {
      setShowConnectionsModal(false);
    }, 300);
  };

  // Relationship removal modal gesture handler
  const relationshipRemovalPanGesture = Gesture.Pan()
    .onBegin(() => {
      if (relationshipRemovalIsAnimating.value) return;
      relationshipRemovalIsAnimating.value = true;
    })
    .onUpdate((event) => {
      if (relationshipRemovalIsAnimating.value === false) return;

      const { translationY } = event;
      const newPosition = relationshipRemovalCurrentState.value + translationY;

      const minPosition = relationshipRemovalSnapPoints.large;
      const maxPosition = relationshipRemovalSnapPoints.mini + 100;
      const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

      relationshipRemovalTranslateY.value = boundedPosition;
    })
    .onEnd((event) => {
      if (relationshipRemovalIsAnimating.value === false) return;

      const { translationY, velocityY } = event;
      const currentPosition = relationshipRemovalCurrentState.value + translationY;

      if (currentPosition > relationshipRemovalSnapPoints.mini + 30 && velocityY > 200) {
        relationshipRemovalIsAnimating.value = false;
        runOnJS(closeRelationshipRemovalModal)();
        return;
      }

      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = relationshipRemovalSnapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = relationshipRemovalSnapPoints.mini;
      } else {
        const positions = [
          relationshipRemovalSnapPoints.large,
          relationshipRemovalSnapPoints.medium,
          relationshipRemovalSnapPoints.small,
          relationshipRemovalSnapPoints.mini,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, relationshipRemovalSnapPoints.large),
        relationshipRemovalSnapPoints.mini,
      );

      relationshipRemovalTranslateY.value = withSpring(
        boundedTarget,
        {
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        },
        () => {
          relationshipRemovalIsAnimating.value = false;
        },
      );

      relationshipRemovalCurrentState.value = boundedTarget;
      runOnJS(setCurrentRelationshipRemovalSnapPoint)(boundedTarget);
    });

  // Relationship removal modal show/hide functions (updated for snap points)
  const openRelationshipRemovalModal = () => {
    console.log('🔗 [GettingStarted] Opening relationship removal modal');
    if (showRelationshipRemovalModal) return; // Prevent multiple calls
    console.log('🔗 [GettingStarted] Setting showRelationshipRemovalModal to true');
    setShowRelationshipRemovalModal(true);
    relationshipRemovalIsAnimating.value = false; // Reset animation state
    console.log('🔗 [GettingStarted] Setting relationshipRemovalIsAnimating to false');
    relationshipRemovalTranslateY.value = withSpring(relationshipRemovalSnapPoints.large, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    console.log(
      '🔗 [GettingStarted] Setting relationshipRemovalCurrentState to relationshipRemovalSnapPoints.large',
    );
    relationshipRemovalCurrentState.value = relationshipRemovalSnapPoints.large;
    setCurrentRelationshipRemovalSnapPoint(relationshipRemovalSnapPoints.large);
    console.log(
      '🔗 [GettingStarted] Setting currentRelationshipRemovalSnapPoint to relationshipRemovalSnapPoints.large',
    );
    Animated.timing(relationshipRemovalBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    console.log('🔗 [GettingStarted] Starting animation for relationshipRemovalBackdropOpacity');
  };

  const closeRelationshipRemovalModal = () => {
    if (!showRelationshipRemovalModal) return; // Prevent multiple calls

    relationshipRemovalIsAnimating.value = false; // Stop any ongoing gestures
    relationshipRemovalTranslateY.value = withSpring(relationshipRemovalSnapPoints.dismissed, {
      damping: 20,
      stiffness: 300,
    });
    Animated.timing(relationshipRemovalBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      setShowRelationshipRemovalModal(false);
      setRelationshipRemovalTarget(null);
      setRelationshipRemovalMessage('');
    }, 300);
  };

  // Role and connections handlers (copied from OnboardingInteractive)
  const handleRoleSelect = async (roleId: string) => {
    setSelectedRole(roleId);

    if (!user) return;

    try {
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
      } else {
        // Refresh the profile to get the updated data
        await refreshProfile();
        hideRoleSheet();
      }
    } catch (err) {
      console.error('Error saving role selection:', err);
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
      } else if (selectedRole === 'instructor' /* || selectedRole === 'school' */) {
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

  const handleCreateConnections = async () => {
    if (!user?.id || selectedConnections.length === 0) return;

    try {
      console.log(
        '🔗 [GettingStarted] Creating connections for:',
        selectedConnections.length,
        'users',
      );
      console.log('🔗 [GettingStarted] User role:', selectedRole);

      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;

      // Create invitations for each selected connection
      for (const targetUser of selectedConnections) {
        if (!targetUser.email) {
          console.warn('🔗 [GettingStarted] Skipping user without email:', targetUser);
          failCount++;
          continue;
        }

        try {
          // Check if relationship already exists
          const { data: existingRelationship } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(
              `and(student_id.eq.${user.id},supervisor_id.eq.${targetUser.id}),and(student_id.eq.${targetUser.id},supervisor_id.eq.${user.id})`,
            )
            .single();

          if (existingRelationship) {
            console.log('⚠️ [GettingStarted] Relationship already exists with:', targetUser.email);
            duplicateCount++;
            continue;
          }

          // Check if pending invitation already exists
          const { data: existingInvitation } = await supabase
            .from('pending_invitations')
            .select('id')
            .eq('invited_by', user.id)
            .eq('email', targetUser.email.toLowerCase())
            .eq('status', 'pending')
            .single();

          if (existingInvitation) {
            console.log(
              '⚠️ [GettingStarted] Pending invitation already exists for:',
              targetUser.email,
            );
            duplicateCount++;
            continue;
          }

          // Determine relationship type and target role
          const relationshipType =
            selectedRole === 'student'
              ? 'student_invites_supervisor'
              : 'supervisor_invites_student';
          const targetRole = selectedRole === 'student' ? 'instructor' : 'student';

          console.log(
            '🔗 [GettingStarted] Creating invitation for:',
            targetUser.email,
            'as',
            targetRole,
          );

          // Create pending invitation (exactly like OnboardingInteractive)
          const { data: invitationData, error: inviteError } = await supabase
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
            })
            .select()
            .single();

          if (inviteError && inviteError.code !== '23505') {
            console.error('🔗 [GettingStarted] Error creating invitation:', inviteError);
            failCount++;
            continue;
          }

          console.log('✅ [GettingStarted] Invitation created successfully');

          // Create notification for the target user (exactly like OnboardingInteractive)
          const notificationType =
            selectedRole === 'student' ? 'supervisor_invitation' : 'student_invitation';
          const baseMessage =
            selectedRole === 'student'
              ? `${profile?.full_name || user.email || 'Someone'} wants you to be their supervisor`
              : `${profile?.full_name || user.email || 'Someone'} wants you to be their student`;

          // Include custom message if provided
          const fullMessage = connectionCustomMessage.trim()
            ? `${baseMessage}\n\nPersonal message: "${connectionCustomMessage.trim()}"`
            : baseMessage;

          await supabase.from('notifications').insert({
            user_id: targetUser.id,
            actor_id: user.id,
            type: notificationType as any,
            title: 'New Supervision Request',
            message: fullMessage,
            metadata: {
              relationship_type: relationshipType,
              from_user_id: user.id,
              from_user_name: profile?.full_name || user.email,
              customMessage: connectionCustomMessage.trim() || undefined,
              invitation_id: invitationData.id,
            },
            action_url: 'vromm://notifications',
            priority: 'high',
            is_read: false,
          });

          console.log('✅ [GettingStarted] Notification created for:', targetUser.email);

          successCount++;
        } catch (error) {
          console.error(
            '🔗 [GettingStarted] Error processing invitation for:',
            targetUser.email,
            error,
          );
          failCount++;
        }
      }

      console.log(
        '🔗 [GettingStarted] Invitations complete. Success:',
        successCount,
        'Duplicates:',
        duplicateCount,
        'Failed:',
        failCount,
      );

      // Show success message
      if (successCount > 0) {
        console.log('🎉 [GettingStarted] Showing success message for', successCount, 'invitations');
      }

      // Refresh pending invitations to show the new ones
      await loadPendingInvitations();

      // Clear selections and search query
      setSelectedConnections([]);
      setConnectionCustomMessage('');
      setConnectionSearchQuery('');
      setSearchResults([]);

      // Close the modal after sending invitations
      hideConnectionsSheet();
    } catch (error) {
      console.error('🔗 [GettingStarted] Error creating connections:', error);
    }
  };

  // Handle relationship removal (copied from OnboardingInteractive)
  const handleRemoveRelationship = async (relationship: any) => {
    if (!relationship || !user?.id) return;
    const relationshipRemovalTarget = relationship;

    try {
      // Remove the relationship
      const { error } = await supabase
        .from('student_supervisor_relationships')
        .delete()
        .or(
          relationshipRemovalTarget.relationship_type === 'has_supervisor'
            ? `and(student_id.eq.${user.id},supervisor_id.eq.${relationshipRemovalTarget.id})`
            : `and(student_id.eq.${relationshipRemovalTarget.id},supervisor_id.eq.${user.id})`,
        );

      if (error) throw error;

      // TODO: Save removal message if provided
      if (relationshipRemovalMessage.trim()) {
        console.log('Removal message:', relationshipRemovalMessage.trim());
        // Could save to a removal_logs table or as metadata
      }

      loadExistingRelationships(); // Refresh the list
      closeRelationshipRemovalModal(); // Use animated close
    } catch (error) {
      console.error('Error removing relationship:', error);
    }
  };

  // Load existing relationships (copied from OnboardingInteractive)
  const loadExistingRelationships = async () => {
    if (!user?.id) return;

    try {
      // Get relationships where user is either student or supervisor
      const { data: relationships, error } = await supabase
        .from('student_supervisor_relationships')
        .select(
          `
          student_id,
          supervisor_id,
          created_at,
          student:profiles!ssr_student_id_fkey (id, full_name, email, role),
          supervisor:profiles!ssr_supervisor_id_fkey (id, full_name, email, role)
        `,
        )
        .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

      if (error) {
        console.error('Error loading relationships:', error);
        return;
      }

      const transformedRelationships =
        relationships?.map((rel) => {
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

      setExistingRelationships(transformedRelationships);
    } catch (error) {
      console.error('Error loading existing relationships:', error);
    }
  };

  // Type assertion helper for profile to handle new fields
  const typedProfile = profile as typeof profile & {
    license_plan_completed?: boolean;
    license_plan_data?: {
      target_date?: string;
      has_theory?: boolean;
      has_practice?: boolean;
      previous_experience?: string;
      specific_goals?: string;
    };
    role_confirmed?: boolean;
  };

  const checkCreatedRoutes = React.useCallback(async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('routes')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id);

      if (!error && typeof count === 'number') {
        setHasCreatedRoutes(count > 0);
      } else {
        setHasCreatedRoutes(false);
      }
    } catch (err) {
      setHasCreatedRoutes(false);
    }
  }, [user]);

  React.useEffect(() => {
    checkCreatedRoutes();
  }, [checkCreatedRoutes]);

  React.useEffect(() => {
    if (hasCreatedRoutes) return;
    const subscription = supabase
      .channel(`getting-started-routes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'routes',
          filter: `creator_id=eq.${user?.id}`,
        },
        () => {
          checkCreatedRoutes();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [checkCreatedRoutes, hasCreatedRoutes, user?.id]);

  // Load learning paths (like ProgressSection.tsx)
  React.useEffect(() => {
    const loadLearningPaths = async () => {
      try {
        console.log('🎯 [GettingStarted] Loading learning paths for exercise sheet...');

        const { data, error } = await supabase
          .from('learning_paths')
          .select('*')
          .eq('active', true)
          .order('order_index', { ascending: true });

        if (error) {
          console.error('🎯 [GettingStarted] Error loading learning paths:', error);
          return;
        }

        if (data && data.length > 0) {
          setLearningPaths(data);

          // Use the first available path (like ProgressSection.tsx does)
          const firstPath = data[0];
          setFirstLearningPathId(firstPath.id);
          setFirstLearningPathTitle(
            firstPath.title?.[language] || firstPath.title?.en || 'Learning Path',
          );

          console.log('🎯 [GettingStarted] First learning path loaded:', {
            id: firstPath.id,
            title: firstPath.title?.[language] || firstPath.title?.en,
            totalPaths: data.length,
          });
        } else {
          console.log('🎯 [GettingStarted] No active learning paths found');
          setFirstLearningPathId(null);
          setFirstLearningPathTitle('');
        }
      } catch (error) {
        console.error('🎯 [GettingStarted] Error loading learning paths:', error);
        setFirstLearningPathId(null);
        setFirstLearningPathTitle('');
      }
    };

    if (user) {
      loadLearningPaths();
    }
  }, [user, language]);

  // Query supabase and check if the user has completed at least one exercise
  React.useEffect(() => {
    if (!user) return;
    const checkCompletedExercises = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('learning_path_exercise_completions')
          .select('exercise_id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setHasCompletedExercise(count > 0);
        } else {
          setHasCompletedExercise(false);
        }
      } catch (err) {
        setHasCompletedExercise(false);
      }
    };

    checkCompletedExercises();

    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('exercise-completions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkCompletedExercises();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Query supabase and check if the user has at least one saved route
  React.useEffect(() => {
    const checkSavedRoutes = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('saved_routes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setHasSavedRoute(count > 0);
        } else {
          setHasSavedRoute(false);
        }
      } catch (err) {
        setHasSavedRoute(false);
      }
    };

    checkSavedRoutes();
  }, [user]);

  // Check if user has connections (supervisors or students)
  React.useEffect(() => {
    const checkConnections = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('student_supervisor_relationships')
          .select('id', { count: 'exact', head: true })
          .or(`student_id.eq.${user.id},supervisor_id.eq.${user.id}`);

        if (!error && typeof count === 'number') {
          setHasConnections(count > 0);
        } else {
          setHasConnections(false);
        }
      } catch (err) {
        setHasConnections(false);
      }
    };

    checkConnections();
  }, [user]);

  // Check if user has created events - DISABLED FOR BETA
  // React.useEffect(() => {
  //   const checkCreatedEvents = async () => {
  //     if (!user) return;
  //     try {
  //       const { count, error } = await supabase
  //         .from('events')
  //         .select('id', { count: 'exact', head: true })
  //         .eq('creator_id', user.id);

  //       if (!error && typeof count === 'number') {
  //         setHasCreatedEvent(count > 0);
  //       } else {
  //         setHasCreatedEvent(false);
  //       }
  //     } catch (err) {
  //       setHasCreatedEvent(false);
  //     }
  //   };

  //   checkCreatedEvents();
  // }, [user]);

  // Update license plan form data when profile changes (copied from ProfileScreen)
  React.useEffect(() => {
    if (profile) {
      const planData = profile.license_plan_data as any;
      if (planData?.target_date) {
        setTargetDate(new Date(planData.target_date));
      } else {
        setTargetDate(null);
      }
      setHasTheory(planData?.has_theory || false);
      setHasPractice(planData?.has_practice || false);
      setPreviousExperience(planData?.previous_experience || '');
      setSpecificGoals(planData?.specific_goals || '');

      // Also update role selection
      setSelectedRole(profile?.role || 'student');
    }
  }, [profile]);

  const hasLicensePlan = typedProfile?.license_plan_completed;
  const hasRoleSelected = typedProfile?.role_confirmed === true;

  // Add this helper function before the return statement in the HomeScreen component
  const isAllOnboardingCompleted =
    hasLicensePlan &&
    hasCreatedRoutes &&
    hasCompletedExercise &&
    hasSavedRoute &&
    hasRoleSelected &&
    hasConnections;
  // hasCreatedEvent; // DISABLED FOR BETA

  // Check for celebration when getting started is completed
  React.useEffect(() => {
    if (isAllOnboardingCompleted && user?.id) {
      const checkKey = `getting_started_celebrated_${user.id}`;
      AsyncStorage.getItem(checkKey).then((celebrated) => {
        if (!celebrated) {
          // Play celebration sound + haptic
          const playCelebration = async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await Audio.setAudioModeAsync({
                playsInSilentModeIOS: false,
                staysActiveInBackground: false,
              });
              const { sound } = await Audio.Sound.createAsync(
                require('../../../assets/sounds/ui-celebration.mp3'),
                { shouldPlay: true, volume: 0.6 },
              );
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                  sound.unloadAsync();
                }
              });
            } catch (error) {
              console.log('🔊 Celebration error:', error);
            }
          };

          playCelebration();

          showCelebration({
            learningPathTitle: { en: 'Getting Started Complete! 🎉', sv: 'Komma Igång Klart! 🎉' },
            completedExercises: 6,
            totalExercises: 6,
          });

          AsyncStorage.setItem(checkKey, 'true');
        }
      });
    }
  }, [isAllOnboardingCompleted, user?.id, showCelebration]);

  // Always show GettingStarted section for all users
  // if (isAllOnboardingCompleted) {
  //   return <></>;
  // }
  return (
    <YStack marginBottom="$3">
      {/* <SectionHeader title={t('home.gettingStarted.title') || 'Getting Started'} variant="chevron" onAction={() => {}} actionLabel="" /> */}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack space="$4" paddingHorizontal="$4">
          {/* 1. Din körkortsplan */}
          <TouchableOpacity
            ref={licensePlanRef}
            onPress={showKorkortsplanSheet}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[
              // ✅ Simplified tour highlighting - let TourOverlay handle main highlight
              isLicensePlanHighlighted() && {
                backgroundColor: 'rgba(0, 230, 195, 0.1)',
              },
            ]}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={
                isLicensePlanHighlighted()
                  ? 'rgba(0, 230, 195, 0.2)' // Tour highlight background
                  : typedProfile?.license_plan_completed
                    ? '$green5'
                    : '$blue5'
              }
              borderRadius={16}
              padding="$0"
              style={{ position: 'relative' }}
            >
              {/* Percentage badge - absolutely positioned */}
              {typedProfile?.license_plan_completed ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#000" fontWeight="bold">
                    100%
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#4B6BFF',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#fff" fontWeight="bold">
                    0%
                  </Text>
                </View>
              )}
              <Image
                source={GETTING_STARTED_IMAGES.licensePlan}
                style={{
                  width: 180,
                  height: 100,
                  resizeMode: 'cover',
                  borderRadius: 16,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              />
              <YStack padding="$2" flex={1} justifyContent="flex-start">
                <Text fontSize={12} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.licensePlan.title') || 'Your License Plan'}
                </Text>
                <Text fontSize={10} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.licensePlan.description') ||
                    'Tell us about yourself and your goals'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 2. Lägg till din första rutt */}
          <TouchableOpacity
            onPress={() => setShowCreateRouteSheet(true)}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasCreatedRoutes ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$0"
              style={{ position: 'relative' }}
            >
              {/* Completion badge - absolutely positioned */}
              {hasCreatedRoutes && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#000" fontWeight="bold">
                    {t('home.gettingStarted.status.completed') || 'DONE'}
                  </Text>
                </View>
              )}
              <Image
                source={GETTING_STARTED_IMAGES.firstRoute}
                style={{
                  width: 180,
                  height: 100,
                  resizeMode: 'cover',
                  borderRadius: 16,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              />
              <YStack padding="$2" flex={1} justifyContent="flex-start">
                <Text fontSize={12} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.firstRoute.title') || 'Add Your First Route'}
                </Text>
                <Text fontSize={10} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.firstRoute.description') ||
                    'Create a route you use often'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 3. Progress start step 1 */}
          <TouchableOpacity
            onPress={() => {
              console.log(
                '🎯 [GettingStarted] Start Learning pressed - opening Learning Paths overview',
              );
              setShowLearningPathsSheet(true);
            }}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasCompletedExercise ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$0"
              style={{ position: 'relative' }}
            >
              {/* Completion badge - absolutely positioned */}
              {hasCompletedExercise && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#000" fontWeight="bold">
                    {t('home.gettingStarted.status.completed') || 'DONE'}
                  </Text>
                </View>
              )}
              <Image
                source={GETTING_STARTED_IMAGES.startLearning}
                style={{
                  width: 180,
                  height: 100,
                  resizeMode: 'cover',
                  borderRadius: 16,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              />
              <YStack padding="$2" flex={1} justifyContent="flex-start">
                <Text fontSize={12} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.startLearning.title') || 'Start on Step 1 of 16'}
                </Text>
                <Text fontSize={10} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.startLearning.description') ||
                    'Start your license journey'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 4. Save a public route */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'MapTab',
                params: { screen: 'MapScreen' },
              } as any)
            }
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasSavedRoute ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$0"
              style={{ position: 'relative' }}
            >
              {/* Completion badge - absolutely positioned */}
              {hasSavedRoute && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#000" fontWeight="bold">
                    {t('home.gettingStarted.status.completed') || 'DONE'}
                  </Text>
                </View>
              )}
              <Image
                source={GETTING_STARTED_IMAGES.saveRoute}
                style={{
                  width: 180,
                  height: 100,
                  resizeMode: 'cover',
                  borderRadius: 16,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              />
              <YStack padding="$2" flex={1} justifyContent="flex-start">
                <Text fontSize={12} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.saveRoute.title') || 'Save a Route'}
                </Text>
                <Text fontSize={10} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.saveRoute.description') ||
                    'Find and save a route from the map'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 5. Select your role */}
          <TouchableOpacity
            onPress={showRoleSheet}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasRoleSelected ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$0"
              style={{ position: 'relative' }}
            >
              {/* Percentage badge - absolutely positioned */}
              {hasRoleSelected ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#000" fontWeight="bold">
                    100%
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#4B6BFF',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    zIndex: 1,
                  }}
                >
                  <Text fontSize={9} color="#fff" fontWeight="bold">
                    0%
                  </Text>
                </View>
              )}
              <Image
                source={GETTING_STARTED_IMAGES.chooseRole}
                style={{
                  width: 180,
                  height: 100,
                  resizeMode: 'cover',
                  borderRadius: 16,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              />
              <YStack padding="$2" flex={1} justifyContent="flex-start">
                <Text fontSize={12} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.chooseRole.title') || 'Choose Your Role'}
                </Text>
                <Text fontSize={10} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.chooseRole.description') ||
                    'Student, instructor, or driving school?'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity>

          {/* 6. Connect with others - only show if role is selected */}
          {hasRoleSelected && (
            <TouchableOpacity
              onPress={showConnectionsSheet}
              activeOpacity={0.8}
              delayPressIn={50}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <YStack
                width={180}
                height={180}
                backgroundColor={hasConnections ? '$green5' : '$backgroundStrong'}
                borderRadius={16}
                padding="$0"
                style={{ position: 'relative' }}
              >
                {/* Completion badge - absolutely positioned */}
                {hasConnections && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: '#00E6C3',
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      zIndex: 1,
                    }}
                  >
                    <Text fontSize={9} color="#000" fontWeight="bold">
                      KLART
                    </Text>
                  </View>
                )}
                <Image
                  source={GETTING_STARTED_IMAGES.connections}
                  style={{
                    width: 180,
                    height: 100,
                    resizeMode: 'cover',
                    borderRadius: 16,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }}
                />
                <YStack padding="$2" flex={1} justifyContent="flex-start">
                  <Text fontSize={12} fontWeight="bold" color="$color">
                    {typedProfile?.role === 'student'
                      ? t('home.gettingStarted.connectStudent.title') || 'Add Supervisor'
                      : t('home.gettingStarted.connectInstructor.title') || 'Add Students'}
                  </Text>
                  <Text fontSize={10} color="$gray11" marginTop="$1">
                    {typedProfile?.role === 'student'
                      ? t('home.gettingStarted.connectStudent.description') ||
                        'Connect with instructors and supervisors'
                      : t('home.gettingStarted.connectInstructor.description') ||
                        'Connect with students to supervise'}
                  </Text>
                </YStack>
              </YStack>
            </TouchableOpacity>
          )}

          {/* 7. Plan Your First Practice Event - DISABLED FOR BETA */}
          {/* <TouchableOpacity
            onPress={() => navigation.navigate('CreateEvent', {})}
            activeOpacity={0.8}
            delayPressIn={50}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <YStack
              width={180}
              height={180}
              backgroundColor={hasCreatedEvent ? '$green5' : '$backgroundStrong'}
              borderRadius={16}
              padding="$4"
              justifyContent="space-between"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Feather name="calendar" size={24} color={hasCreatedEvent ? '#00E6C3' : '#8B5CF6'} />
                {hasCreatedEvent && (
                  <View
                    style={{
                      backgroundColor: '#00E6C3',
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text fontSize={10} color="#000" fontWeight="bold">
                      {t('home.gettingStarted.status.completed') || 'DONE'}
                    </Text>
                  </View>
                )}
              </XStack>

              <YStack>
                <Text fontSize={18} fontWeight="bold" color="$color">
                  {t('home.gettingStarted.createEvent.title') || 'Plan Practice Event'}
                </Text>
                <Text fontSize={14} color="$gray11" marginTop="$1">
                  {t('home.gettingStarted.createEvent.description') || 'Create your first practice session or driving event'}
                </Text>
              </YStack>
            </YStack>
          </TouchableOpacity> */}
        </XStack>
      </ScrollView>

      {/* Körkortsplan Modal - with BlurView background */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showKorkortsplanModal}
        onRequestClose={hideKorkortsplanSheet}
      >
        <BlurView
          style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
          intensity={10}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          pointerEvents="none"
        />
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            opacity: korkortsplanBackdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                licensePlanIsAnimating.value = false; // Reset state on backdrop tap
                hideKorkortsplanSheet();
              }}
            />
            <GestureDetector gesture={licensePlanPanGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height,
                    backgroundColor: backgroundColor,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                  },
                  {
                    transform: [{ translateY: licensePlanTranslateY }],
                  },
                ]}
              >
                {/* Drag Handle - outside ScrollView with gesture */}
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                    }}
                  />
                </View>

                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={{ flex: 1 }}
                  keyboardVerticalOffset={0}
                >
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <YStack gap="$4" paddingBottom="$16">
                      {/* Header - matching connections modal style (centered, no X) */}
                      <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                        {t('onboarding.licensePlan.title') || 'Your License Journey'}
                      </Text>

                      <Text fontSize="$3" color="$gray11" textAlign="center">
                        {t('onboarding.licensePlan.description') ||
                          'Tell us about your experience level, driving goals and vehicle preferences'}
                      </Text>

                      <YStack gap="$4" marginTop="$4">
                        {/* Target License Date with Quick Options */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.date.title') || 'When do you want your license?'}
                          </Text>

                          {/* Quick Date Options */}
                          {[
                            {
                              label: t('onboarding.date.within3months') || 'Within 3 months',
                              months: 3,
                              key: '3months',
                            },
                            {
                              label: t('onboarding.date.within6months') || 'Within 6 months',
                              months: 6,
                              key: '6months',
                            },
                            {
                              label: t('onboarding.date.within1year') || 'Within 1 year',
                              months: 12,
                              key: '1year',
                            },
                            {
                              label: t('onboarding.date.noSpecific') || 'No specific date',
                              months: 24,
                              key: 'nodate',
                            },
                          ].map((option) => {
                            const optionTargetDate = new Date();
                            optionTargetDate.setMonth(optionTargetDate.getMonth() + option.months);
                            const isSelected = selectedDateOption === option.key;

                            return (
                              <RadioButton
                                key={option.label}
                                onPress={() => {
                                  setTargetDate(optionTargetDate);
                                  setSelectedDateOption(option.key);
                                }}
                                title={option.label}
                                description={optionTargetDate.toLocaleDateString('sv-SE')}
                                isSelected={isSelected}
                              />
                            );
                          })}

                          {/* Custom Date Picker with Popover - using RadioButton component */}
                          <View ref={dateButtonRef}>
                            <RadioButton
                              onPress={() => {
                                console.log('🗓️ [GettingStarted] Opening date popover');
                                setSelectedDateOption('custom');
                                setShowDatePopover(true);
                              }}
                              title={t('onboarding.date.pickSpecific') || 'Pick specific date'}
                              description={
                                targetDate
                                  ? targetDate.toLocaleDateString()
                                  : new Date().toLocaleDateString()
                              }
                              isSelected={selectedDateOption === 'custom'}
                            />
                          </View>

                          <Popover
                            isVisible={showDatePopover}
                            onRequestClose={() => {
                              console.log('🗓️ [GettingStarted] Popover onRequestClose called');
                              setShowDatePopover(false);
                              // Complete cleanup to prevent any blocking issues
                              setTimeout(() => {
                                console.log(
                                  '🗓️ [GettingStarted] Complete cleanup after popover close',
                                );
                                setSelectedDateOption('custom');
                              }, 10);
                            }}
                            from={dateButtonRef}
                            placement={'top' as any}
                            backgroundStyle={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                            popoverStyle={{
                              backgroundColor: '$background',
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
                              <Text
                                color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                                size="lg"
                                weight="semibold"
                                textAlign="center"
                              >
                                {t('onboarding.date.selectTarget') || 'Select Target Date'}
                              </Text>

                              {/* Container for full inline DateTimePicker */}
                              <View
                                style={{
                                  width: 350,
                                  height: 380,
                                  backgroundColor: '$background',
                                  borderRadius: 8,
                                  overflow: 'visible',
                                }}
                              >
                                <DateTimePicker
                                  testID="dateTimePicker"
                                  value={targetDate || new Date()}
                                  mode="date"
                                  display="inline"
                                  minimumDate={new Date()}
                                  maximumDate={(() => {
                                    const maxDate = new Date();
                                    maxDate.setFullYear(maxDate.getFullYear() + 3);
                                    return maxDate;
                                  })()}
                                  onChange={(event, selectedDate) => {
                                    console.log(
                                      '🗓️ [GettingStarted] Date changed:',
                                      selectedDate?.toLocaleDateString(),
                                    );
                                    if (selectedDate) {
                                      setTargetDate(selectedDate);
                                      setSelectedDateOption('custom');
                                      // Don't auto-close - let user press save button
                                      console.log(
                                        '🗓️ [GettingStarted] Date updated, waiting for save button',
                                      );
                                    }
                                  }}
                                  style={{
                                    width: 350,
                                    height: 380,
                                    backgroundColor: '$background',
                                  }}
                                  themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                                  accentColor="#00E6C3"
                                  locale={language === 'sv' ? 'sv-SE' : 'en-US'}
                                />
                              </View>
                            </YStack>
                          </Popover>
                        </YStack>

                        {/* Experience Level */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.licensePlan.experienceLevel') ||
                              (language === 'sv' ? 'Erfarenhetsnivå' : 'Experience Level')}
                          </Text>
                          <DropdownButton
                            onPress={() => setShowExperienceModal(true)}
                            value={
                              experienceLevelOptions.find((e) => e.id === experienceLevel)?.title ||
                              (language === 'sv'
                                ? 'Nybörjare (aldrig kört)'
                                : 'Beginner (never driven)')
                            }
                            isActive={showExperienceModal}
                          />
                        </YStack>

                        {/* Vehicle Type */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.licensePlan.vehicleType') ||
                              (language === 'sv' ? 'Fordonstyp' : 'Vehicle Type')}
                          </Text>
                          <DropdownButton
                            onPress={() => setShowVehicleModal(true)}
                            value={
                              vehicleTypeOptions.find((v) => v.id === vehicleType)?.title ||
                              (language === 'sv' ? 'Bil' : 'Car')
                            }
                            isActive={showVehicleModal}
                          />
                        </YStack>

                        {/* Transmission Type */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.licensePlan.transmissionType') ||
                              (language === 'sv' ? 'Växellådstyp' : 'Transmission Type')}
                          </Text>
                          <DropdownButton
                            onPress={() => setShowTransmissionModal(true)}
                            value={
                              transmissionTypeOptions.find((t) => t.id === transmissionType)
                                ?.title || (language === 'sv' ? 'Manuell' : 'Manual')
                            }
                            isActive={showTransmissionModal}
                          />
                        </YStack>

                        {/* License Type */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.licensePlan.licenseType') ||
                              (language === 'sv' ? 'Körkortstyp' : 'License Type')}
                          </Text>
                          <DropdownButton
                            onPress={() => setShowLicenseModal(true)}
                            value={
                              licenseTypeOptions.find((l) => l.id === licenseType)?.title ||
                              (language === 'sv' ? 'Standardkörkort (B)' : 'Standard License (B)')
                            }
                            isActive={showLicenseModal}
                          />
                        </YStack>

                        {/* Theory Test - Yes/No Buttons */}
                        <YStack gap="$2">
                          <Text size="sm" fontWeight="400" color="$color">
                            {t('onboarding.licensePlan.hasTheory') ||
                              (language === 'sv'
                                ? 'Har du klarat teoriprov?'
                                : 'Have you passed the theory test?')}
                          </Text>
                          <XStack gap="$3">
                            <Button
                              variant={hasTheory ? 'primary' : 'outlined'}
                              size="md"
                              flex={1}
                              onPress={() => setHasTheory(true)}
                            >
                              {t('common.yes') || (language === 'sv' ? 'Ja' : 'Yes')}
                            </Button>
                            <Button
                              variant={!hasTheory ? 'primary' : 'outlined'}
                              size="md"
                              flex={1}
                              onPress={() => setHasTheory(false)}
                            >
                              {t('common.no') || (language === 'sv' ? 'Nej' : 'No')}
                            </Button>
                          </XStack>
                        </YStack>

                        {/* Practice Test - Yes/No Buttons */}
                        <YStack gap="$2">
                          <Text size="sm" fontWeight="400" color="$color">
                            {t('onboarding.licensePlan.hasPractice') ||
                              (language === 'sv'
                                ? 'Har du klarat körprov?'
                                : 'Have you passed the practical test?')}
                          </Text>
                          <XStack gap="$3">
                            <Button
                              variant={hasPractice ? 'primary' : 'outlined'}
                              size="md"
                              flex={1}
                              onPress={() => setHasPractice(true)}
                            >
                              {t('common.yes') || (language === 'sv' ? 'Ja' : 'Yes')}
                            </Button>
                            <Button
                              variant={!hasPractice ? 'primary' : 'outlined'}
                              size="md"
                              flex={1}
                              onPress={() => setHasPractice(false)}
                            >
                              {t('common.no') || (language === 'sv' ? 'Nej' : 'No')}
                            </Button>
                          </XStack>
                        </YStack>

                        {/* Previous Experience */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.licensePlan.previousExperience') ||
                              'Previous driving experience'}
                          </Text>
                          <TextArea
                            placeholder={
                              t('onboarding.licensePlan.experiencePlaceholder') ||
                              'Describe your previous driving experience'
                            }
                            value={previousExperience}
                            onChangeText={setPreviousExperience}
                            minHeight={100}
                            backgroundColor="$background"
                            borderColor="$borderColor"
                            color="$color"
                            focusStyle={{
                              borderColor: '$blue8',
                            }}
                          />
                        </YStack>

                        {/* Specific Goals */}
                        <YStack gap="$2">
                          <Text weight="bold" size="lg">
                            {t('onboarding.licensePlan.specificGoals') || 'Specific goals'}
                          </Text>
                          <TextArea
                            placeholder={
                              t('onboarding.licensePlan.goalsPlaceholder') ||
                              'Do you have specific goals with your license?'
                            }
                            value={specificGoals}
                            onChangeText={setSpecificGoals}
                            minHeight={100}
                            backgroundColor="$background"
                            borderColor="$borderColor"
                            color="$color"
                            focusStyle={{
                              borderColor: '$blue8',
                            }}
                          />
                        </YStack>
                      </YStack>

                      <Button
                        variant="primary"
                        size="lg"
                        onPress={handleLicensePlanSubmit}
                        marginTop="$4"
                      >
                        {t('onboarding.licensePlan.savePreferences') || 'Save My Preferences'}
                      </Button>
                    </YStack>
                  </ScrollView>
                </KeyboardAvoidingView>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </Modal>

      {/* Experience Level Selection Modal */}
      <Modal
        visible={showExperienceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExperienceModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowExperienceModal(false)}
        >
          <Pressable
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: backgroundColor,
              borderRadius: 20,
              padding: 20,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$4">
              {t('onboarding.experience.title') || 'Select Experience Level'}
            </Text>
            <YStack gap="$2">
              {experienceLevelOptions.map((option) => (
                <RadioButton
                  key={option.id}
                  onPress={() => {
                    setExperienceLevel(option.id);
                    setShowExperienceModal(false);
                  }}
                  title={option.title}
                  isSelected={experienceLevel === option.id}
                  size="lg"
                />
              ))}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowVehicleModal(false)}
        >
          <Pressable
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: backgroundColor,
              borderRadius: 20,
              padding: 20,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$4">
              {t('onboarding.vehicle.title') || 'Select Vehicle Type'}
            </Text>
            <YStack gap="$2">
              {vehicleTypeOptions.map((option) => (
                <RadioButton
                  key={option.id}
                  onPress={() => {
                    setVehicleType(option.id);
                    setShowVehicleModal(false);
                  }}
                  title={option.title}
                  isSelected={vehicleType === option.id}
                  size="lg"
                />
              ))}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Transmission Type Selection Modal */}
      <Modal
        visible={showTransmissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransmissionModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowTransmissionModal(false)}
        >
          <Pressable
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: backgroundColor,
              borderRadius: 20,
              padding: 20,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$4">
              {t('onboarding.transmission.title') || 'Select Transmission Type'}
            </Text>
            <YStack gap="$2">
              {transmissionTypeOptions.map((option) => (
                <RadioButton
                  key={option.id}
                  onPress={() => {
                    setTransmissionType(option.id);
                    setShowTransmissionModal(false);
                  }}
                  title={option.title}
                  isSelected={transmissionType === option.id}
                  size="lg"
                />
              ))}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* License Type Selection Modal */}
      <Modal
        visible={showLicenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLicenseModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowLicenseModal(false)}
        >
          <Pressable
            style={{
              width: '90%',
              maxWidth: 400,
              backgroundColor: backgroundColor,
              borderRadius: 20,
              padding: 20,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text size="xl" weight="bold" color="$color" textAlign="center" marginBottom="$4">
              {t('onboarding.license.title') || 'Select License Type'}
            </Text>
            <YStack gap="$2">
              {licenseTypeOptions.map((option) => (
                <RadioButton
                  key={option.id}
                  onPress={() => {
                    setLicenseType(option.id);
                    setShowLicenseModal(false);
                  }}
                  title={option.title}
                  isSelected={licenseType === option.id}
                  size="lg"
                />
              ))}
            </YStack>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Role Selection Modal - with BlurView background */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="none"
        onRequestClose={hideRoleSheet}
      >
        <BlurView
          style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
          intensity={10}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          pointerEvents="none"
        />
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.3)',
            opacity: roleBackdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                roleIsAnimating.value = false; // Reset state on backdrop tap
                hideRoleSheet();
              }}
            />
            <GestureDetector gesture={rolePanGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: height,
                    backgroundColor: backgroundColor,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                  },
                  {
                    transform: [{ translateY: roleTranslateY }],
                  },
                ]}
              >
                {/* Drag Handle */}
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                    }}
                  />
                </View>

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  Choose Your Role
                </Text>
                <YStack gap="$2">
                  {[
                    {
                      id: 'student',
                      title: t('onboarding.role.student') || 'Student',
                      description:
                        t('onboarding.role.studentDescription') || 'I want to learn to drive',
                    },
                    {
                      id: 'instructor',
                      title: t('onboarding.role.instructor') || 'Instructor',
                      description:
                        t('onboarding.role.instructorDescription') || 'I teach others to drive',
                    },
                    // School option hidden for beta
                    /*
                    {
                      id: 'school',
                      title: t('onboarding.role.school') || 'Driving School',
                      description:
                        t('onboarding.role.schoolDescription') || 'I represent a driving school',
                    },
                    */
                  ].map((role) => (
                    <RadioButton
                      key={role.id}
                      onPress={() => handleRoleSelect(role.id)}
                      title={role.title}
                      description={role.description}
                      isSelected={selectedRole === role.id}
                    />
                  ))}
                </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </Modal>

      {/* Connections Selection Modal - with gesture handling like RouteDetailSheet */}
      <Modal
        visible={showConnectionsModal}
        transparent
        animationType="none"
        onRequestClose={hideConnectionsSheet}
      >
        <ReanimatedAnimated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: connectionsBackdropOpacityShared,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={hideConnectionsSheet} />
            <ReanimatedAnimated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: height,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                connectionsAnimatedStyle,
              ]}
            >
              <YStack
                backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF'}
                padding="$4"
                paddingBottom={24}
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
                height="100%"
                flex={1}
              >
                {/* Drag Handle */}
                <GestureDetector gesture={connectionsPanGesture}>
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colorScheme === 'dark' ? '#CCC' : '#666',
                      }}
                    />
                  </View>
                </GestureDetector>

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {selectedRole === 'student'
                    ? 'Find Instructors'
                    : selectedRole === 'instructor' /* || selectedRole === 'school' */
                      ? 'Find Students'
                      : 'Find Users'}
                </Text>

                <Text fontSize="$3" color="$gray11" textAlign="center" marginBottom="$3">
                  {selectedRole === 'student'
                    ? 'Search for driving instructors to connect with'
                    : selectedRole === 'instructor' /* || selectedRole === 'school' */
                      ? 'Search for students to connect with'
                      : 'Search for users to connect with'}
                </Text>

                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={{ flex: 1 }}
                  keyboardVerticalOffset={0}
                >
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Tabbed interface for relationships */}
                    {(existingRelationships.length > 0 || pendingInvitations.length > 0) && (
                      <YStack
                        gap="$3"
                        padding="$4"
                        backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                        borderRadius="$4"
                        maxHeight="300"
                      >
                        {/* Tab headers */}
                        <XStack gap="$2" marginBottom="$2">
                          <TouchableOpacity
                            onPress={() => setActiveRelationshipsTab('pending')}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor:
                                activeRelationshipsTab === 'pending'
                                  ? colorScheme === 'dark'
                                    ? '#333'
                                    : '#E5E5E5'
                                  : 'transparent',
                            }}
                          >
                            <Text
                              size="sm"
                              fontWeight={activeRelationshipsTab === 'pending' ? '600' : '400'}
                              color={
                                activeRelationshipsTab === 'pending'
                                  ? colorScheme === 'dark'
                                    ? '#ECEDEE'
                                    : '#11181C'
                                  : colorScheme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.3)'
                                    : 'rgba(0, 0, 0, 0.3)'
                              }
                            >
                              {t('onboarding.relationships.pendingTitle') || 'Pending'} (
                              {pendingInvitations.length})
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setActiveRelationshipsTab('existing')}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor:
                                activeRelationshipsTab === 'existing'
                                  ? colorScheme === 'dark'
                                    ? '#333'
                                    : '#E5E5E5'
                                  : 'transparent',
                            }}
                          >
                            <Text
                              size="sm"
                              fontWeight={activeRelationshipsTab === 'existing' ? '600' : '400'}
                              color={
                                activeRelationshipsTab === 'existing'
                                  ? colorScheme === 'dark'
                                    ? '#ECEDEE'
                                    : '#11181C'
                                  : colorScheme === 'dark'
                                    ? 'rgba(255, 255, 255, 0.3)'
                                    : 'rgba(0, 0, 0, 0.3)'
                              }
                            >
                              {t('onboarding.relationships.existingTitle') || 'Existing'} (
                              {existingRelationships.length})
                            </Text>
                          </TouchableOpacity>
                        </XStack>

                        {/* Tab content */}
                        <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                          <YStack gap="$3">
                            {activeRelationshipsTab === 'pending' ? (
                              // Pending invitations
                              pendingInvitations.length > 0 ? (
                                pendingInvitations.map((invitation) => (
                                  <XStack key={invitation.id} gap="$2" alignItems="center">
                                    <YStack flex={1}>
                                      <Text fontSize="$4" fontWeight="600" color="$color">
                                        {invitation.metadata?.targetUserName || invitation.email}
                                      </Text>
                                      <Text fontSize="$3" color="$gray11">
                                        {invitation.email} • Invited as {invitation.role} •{' '}
                                        {new Date(invitation.created_at).toLocaleDateString()}
                                      </Text>
                                      {invitation.metadata?.customMessage && (
                                        <Text fontSize="$2" color="$gray9" fontStyle="italic">
                                          Message: "{invitation.metadata.customMessage}"
                                        </Text>
                                      )}
                                    </YStack>
                                    <Text fontSize="$3" color="$orange10" fontWeight="600">
                                      PENDING
                                    </Text>
                                    <TouchableOpacity
                                      onPress={async () => {
                                        console.log(
                                          '🗑️ [GettingStarted] TRASH BUTTON PRESSED for invitation:',
                                          invitation.id,
                                        );

                                        // Add haptic feedback to confirm tap
                                        try {
                                          await Haptics.impactAsync(
                                            Haptics.ImpactFeedbackStyle.Medium,
                                          );
                                        } catch (e) {
                                          // Haptics might not be available
                                        }

                                        try {
                                          console.log(
                                            '🗑️ [GettingStarted] FORCE DELETING invitation with ID:',
                                            invitation.id,
                                          );
                                          console.log(
                                            '🗑️ [GettingStarted] Full invitation object:',
                                            JSON.stringify(invitation, null, 2),
                                          );

                                          // First, let's check if the invitation actually exists
                                          const { data: checkData, error: checkError } =
                                            await supabase
                                              .from('pending_invitations')
                                              .select('*')
                                              .eq('id', invitation.id);

                                          console.log(
                                            '🗑️ [GettingStarted] Check if invitation exists:',
                                            { data: checkData, error: checkError },
                                          );

                                          // Try multiple deletion approaches
                                          let deletionSuccess = false;

                                          // Method 1: Direct DELETE with RLS
                                          console.log(
                                            '🗑️ [GettingStarted] Method 1: Direct DELETE with RLS',
                                          );
                                          const { data: pendingData, error: pendingError } =
                                            await supabase
                                              .from('pending_invitations')
                                              .delete()
                                              .eq('id', invitation.id)
                                              .select();

                                          console.log('🗑️ [GettingStarted] Method 1 result:', {
                                            data: pendingData,
                                            error: pendingError,
                                          });

                                          if (pendingData && pendingData.length > 0) {
                                            deletionSuccess = true;
                                            console.log(
                                              '✅ [GettingStarted] Method 1 successful - deleted',
                                              pendingData.length,
                                              'rows',
                                            );
                                          } else if (pendingError) {
                                            console.log(
                                              '❌ [GettingStarted] Method 1 failed with error:',
                                              pendingError,
                                            );
                                          }

                                          // Method 2: Try UPDATE to 'cancelled' status first, then DELETE
                                          if (!deletionSuccess) {
                                            console.log(
                                              '🗑️ [GettingStarted] Method 2: UPDATE to cancelled, then DELETE',
                                            );

                                            // First update to cancelled
                                            const { data: updateData, error: updateError } =
                                              await supabase
                                                .from('pending_invitations')
                                                .update({ status: 'cancelled' })
                                                .eq('id', invitation.id)
                                                .select();

                                            console.log(
                                              '🗑️ [GettingStarted] Method 2 UPDATE result:',
                                              {
                                                data: updateData,
                                                error: updateError,
                                              },
                                            );

                                            if (updateData && updateData.length > 0) {
                                              // Now try to delete
                                              const { data: deleteData, error: deleteError } =
                                                await supabase
                                                  .from('pending_invitations')
                                                  .delete()
                                                  .eq('id', invitation.id)
                                                  .select();

                                              console.log(
                                                '🗑️ [GettingStarted] Method 2 DELETE result:',
                                                { data: deleteData, error: deleteError },
                                              );

                                              if (deleteData && deleteData.length > 0) {
                                                deletionSuccess = true;
                                                console.log(
                                                  '✅ [GettingStarted] Method 2 successful - deleted',
                                                  deleteData.length,
                                                  'rows',
                                                );
                                              }
                                            }
                                          }

                                          // Method 3: Try using RPC function if available
                                          if (!deletionSuccess) {
                                            console.log(
                                              '🗑️ [GettingStarted] Method 3: Try RPC function',
                                            );
                                            try {
                                              const { data: rpcData, error: rpcError } =
                                                await supabase.rpc('delete_pending_invitation', {
                                                  invitation_id: invitation.id,
                                                });

                                              console.log(
                                                '🗑️ [GettingStarted] Method 3 RPC result:',
                                                {
                                                  data: rpcData,
                                                  error: rpcError,
                                                },
                                              );

                                              if (!rpcError && rpcData?.success) {
                                                deletionSuccess = true;
                                                console.log(
                                                  '✅ [GettingStarted] Method 3 successful',
                                                );
                                              }
                                            } catch (rpcErr) {
                                              console.log(
                                                '❌ [GettingStarted] Method 3 RPC not available:',
                                                rpcErr,
                                              );
                                            }
                                          }

                                          // Method 4: Try alternative RPC function (UPDATE then DELETE)
                                          if (!deletionSuccess) {
                                            console.log(
                                              '🗑️ [GettingStarted] Method 4: Try alternative RPC function',
                                            );
                                            try {
                                              const { data: altRpcData, error: altRpcError } =
                                                await supabase.rpc('cancel_and_delete_invitation', {
                                                  invitation_id: invitation.id,
                                                });

                                              console.log(
                                                '🗑️ [GettingStarted] Method 4 RPC result:',
                                                {
                                                  data: altRpcData,
                                                  error: altRpcError,
                                                },
                                              );

                                              if (!altRpcError && altRpcData?.success) {
                                                deletionSuccess = true;
                                                console.log(
                                                  '✅ [GettingStarted] Method 4 successful',
                                                );
                                              }
                                            } catch (altRpcErr) {
                                              console.log(
                                                '❌ [GettingStarted] Method 4 RPC not available:',
                                                altRpcErr,
                                              );
                                            }
                                          }

                                          // Also try to delete from notifications table
                                          const { data: notifData, error: notifError } =
                                            await supabase
                                              .from('notifications')
                                              .delete()
                                              .eq('id', invitation.id)
                                              .select();

                                          console.log(
                                            '🗑️ [GettingStarted] Notifications DELETE result:',
                                            { data: notifData, error: notifError },
                                          );

                                          // Also try to delete by invitation_id in metadata
                                          const { data: metadataData, error: metadataError } =
                                            await supabase
                                              .from('notifications')
                                              .delete()
                                              .eq('metadata->>invitation_id', invitation.id)
                                              .select();

                                          console.log(
                                            '🗑️ [GettingStarted] Metadata DELETE result:',
                                            {
                                              data: metadataData,
                                              error: metadataError,
                                            },
                                          );

                                          if (!deletionSuccess) {
                                            console.log(
                                              '❌ [GettingStarted] All deletion methods failed - this might be an RLS policy issue',
                                            );
                                            console.log(
                                              '❌ [GettingStarted] Please run the SQL scripts to fix RLS policies',
                                            );
                                          }

                                          // FORCE REMOVE from local state immediately
                                          setPendingInvitations((prev) =>
                                            prev.filter((inv) => inv.id !== invitation.id),
                                          );
                                          console.log(
                                            '🗑️ [GettingStarted] Removed from local state immediately',
                                          );

                                          // Refresh the pending invitations list
                                          console.log(
                                            '🔄 [GettingStarted] Refreshing pending invitations list...',
                                          );
                                          await loadPendingInvitations();
                                          console.log(
                                            '🔄 [GettingStarted] Pending invitations refreshed',
                                          );
                                        } catch (error) {
                                          console.error(
                                            '❌ [GettingStarted] Caught error removing invitation:',
                                            error,
                                          );
                                          // Even if there's an error, remove from local state
                                          setPendingInvitations((prev) =>
                                            prev.filter((inv) => inv.id !== invitation.id),
                                          );
                                        }
                                      }}
                                      style={{
                                        padding: 12,
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 8,
                                        marginLeft: 8,
                                      }}
                                      activeOpacity={0.6}
                                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                      <Feather name="trash-2" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                  </XStack>
                                ))
                              ) : (
                                <Text
                                  size="sm"
                                  color="$gray11"
                                  textAlign="center"
                                  paddingVertical="$4"
                                >
                                  {t('onboarding.relationships.noPending') ||
                                    'No pending invitations'}
                                </Text>
                              )
                            ) : // Existing relationships
                            existingRelationships.length > 0 ? (
                              existingRelationships.map((relationship) => (
                                <XStack key={relationship.id} gap="$2" alignItems="center">
                                  <YStack flex={1}>
                                    <RadioButton
                                      onPress={() => {}} // No action on tap for existing relationships
                                      title={relationship.name}
                                      description={`${relationship.email} • ${relationship.role} • ${relationship.relationship_type === 'has_supervisor' ? t('onboarding.relationships.yourSupervisor') || 'Your supervisor' : t('onboarding.relationships.studentYouSupervise') || 'Student you supervise'} ${t('onboarding.relationships.since') || 'since'} ${new Date(relationship.created_at).toLocaleDateString()}`}
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
                                      handleRemoveRelationship({
                                        id: relationship.id,
                                        name: relationship.name,
                                        email: relationship.email,
                                        role: relationship.role,
                                        relationship_type: relationship.relationship_type,
                                      });
                                    }}
                                  >
                                    <Feather name="trash-2" size={16} color="#EF4444" />
                                  </TouchableOpacity>
                                </XStack>
                              ))
                            ) : (
                              <Text
                                size="sm"
                                color="$gray11"
                                textAlign="center"
                                paddingVertical="$4"
                              >
                                {t('onboarding.relationships.noExisting') ||
                                  'No existing relationships'}
                              </Text>
                            )}
                          </YStack>
                        </ScrollView>
                      </YStack>
                    )}

                    {/* Show selected connections with message - using OnboardingInteractive styling */}
                    {selectedConnections.length > 0 && (
                      <YStack
                        gap="$3"
                        padding="$4"
                        backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                        borderRadius="$4"
                      >
                        <Text size="md" fontWeight="600" color="$color">
                          {t('onboarding.relationships.newConnectionsTitle') ||
                            'New Connection to Add'}{' '}
                          ({selectedConnections.length}):
                        </Text>
                        {selectedConnections.map((connection) => (
                          <RadioButton
                            key={connection.id}
                            onPress={() => {
                              // Remove this connection
                              setSelectedConnections((prev) =>
                                prev.filter((conn) => conn.id !== connection.id),
                              );
                            }}
                            title={connection.full_name || connection.email}
                            description={`${connection.email} • ${connection.role || 'instructor'} • ${t('onboarding.connections.tapToRemove') || 'Tap to remove'}`}
                            isSelected={true}
                          />
                        ))}

                        {/* Show custom message if provided */}
                        {connectionCustomMessage.trim() && (
                          <YStack
                            gap="$1"
                            marginTop="$2"
                            padding="$3"
                            backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                            borderRadius="$3"
                          >
                            <Text size="sm" color="$gray11" fontWeight="600">
                              Your message:
                            </Text>
                            <Text size="sm" color="$color" fontStyle="italic">
                              "{connectionCustomMessage.trim()}"
                            </Text>
                          </YStack>
                        )}
                      </YStack>
                    )}

                    {/* Custom message input */}
                    <YStack gap="$2">
                      <Text fontSize="$3" color="$gray11">
                        Optional message:
                      </Text>
                      <TextInput
                        value={connectionCustomMessage}
                        onChangeText={setConnectionCustomMessage}
                        placeholder="Add a personal message..."
                        multiline
                        style={{
                          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF',
                          color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                          borderColor:
                            colorScheme === 'dark'
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.1)',
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 12,
                          minHeight: 60,
                          textAlignVertical: 'top',
                        }}
                        placeholderTextColor={
                          colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                        }
                      />
                    </YStack>

                    <FormField
                      placeholder="Search by name or email..."
                      value={connectionSearchQuery}
                      onChangeText={handleSearchUsers}
                    />

                    <YStack gap="$2">
                      {searchResults.length === 0 && connectionSearchQuery.length >= 2 && (
                        <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                          No users found
                        </Text>
                      )}

                      {searchResults.length === 0 && connectionSearchQuery.length < 2 && (
                        <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                          Start typing to search for users
                        </Text>
                      )}

                      {searchResults.map((user) => {
                        const isSelected = selectedConnections.some((conn) => conn.id === user.id);
                        return (
                          <TouchableOpacity
                            key={user.id}
                            onPress={async () => {
                              if (isSelected) {
                                // Remove from selection
                                setSelectedConnections((prev) =>
                                  prev.filter((conn) => conn.id !== user.id),
                                );
                              } else {
                                // Add to selection
                                setSelectedConnections((prev) => [...prev, user]);
                              }
                            }}
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? '#00E6C3' : '#ccc',
                              backgroundColor: isSelected
                                ? 'rgba(0, 230, 195, 0.1)'
                                : 'transparent',
                              marginVertical: 4,
                            }}
                          >
                            <XStack gap={8} alignItems="center">
                              <YStack flex={1}>
                                <Text color="$color" fontSize={14} fontWeight="600">
                                  {user.full_name || 'Unknown User'}
                                </Text>
                                <Text fontSize={12} color="$gray11">
                                  {user.email} • {user.role}
                                </Text>
                              </YStack>
                              {isSelected ? (
                                <Feather name="check" size={16} color="#00E6C3" />
                              ) : (
                                <Feather name="plus-circle" size={16} color="#ccc" />
                              )}
                            </XStack>
                          </TouchableOpacity>
                        );
                      })}
                    </YStack>
                  </ScrollView>
                </KeyboardAvoidingView>

                {/* Action Buttons - OUTSIDE KeyboardAvoidingView */}
                <YStack gap="$2" marginTop="$4">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleCreateConnections}
                    disabled={selectedConnections.length === 0}
                  >
                    <Text color="white" fontWeight="600">
                      {selectedConnections.length > 0
                        ? `Send ${selectedConnections.length} Invitation${selectedConnections.length > 1 ? 's' : ''}`
                        : 'Select Users to Invite'}
                    </Text>
                  </Button>

                  <Button variant="outlined" size="lg" onPress={hideConnectionsSheet}>
                    <Text color="$color">Cancel</Text>
                  </Button>
                </YStack>
              </YStack>
            </ReanimatedAnimated.View>
          </View>
        </ReanimatedAnimated.View>
      </Modal>

      {/* Create Route Sheet Modal */}
      <CreateRouteSheet
        visible={showCreateRouteSheet}
        onClose={() => setShowCreateRouteSheet(false)}
        onRouteCreated={(routeId) => {
          console.log('Route created:', routeId);
          setShowCreateRouteSheet(false);
          // Refresh routes state to update the "hasCreatedRoutes" status
          // This will be handled by the existing useEffect for checking created routes
        }}
      />

      {/* Learning Paths Overview Sheet Modal (Level 0) */}
      <LearningPathsSheet
        visible={showLearningPathsSheet}
        onClose={() => {
          console.log('🎯 [GettingStarted] LearningPathsSheet closed');
          setShowLearningPathsSheet(false);
        }}
        onPathSelected={(path) => {
          console.log(
            '🎯 [GettingStarted] Learning path selected:',
            path.title[language] || path.title.en,
          );
          setSelectedLearningPath(path);
          setShowLearningPathsSheet(false);
          setShowExerciseListSheet(true);
        }}
        title={t('exercises.allLearningPaths') || 'All Learning Paths'}
      />

      {/* Exercise List Sheet Modal (Level 1) */}
      <ExerciseListSheet
        visible={showExerciseListSheet}
        onClose={() => {
          console.log('🎯 [GettingStarted] ExerciseListSheet closed');
          setShowExerciseListSheet(false);
          setSelectedLearningPath(null);
        }}
        onBackToAllPaths={() => {
          console.log('🎯 [GettingStarted] Back to all paths from ExerciseListSheet');
          setShowExerciseListSheet(false);
          setSelectedLearningPath(null);
          setShowLearningPathsSheet(true);
        }}
        title={
          selectedLearningPath
            ? selectedLearningPath.title[language] || selectedLearningPath.title.en
            : firstLearningPathTitle || t('exercises.allLearningPaths') || 'All Learning Paths'
        }
        learningPathId={selectedLearningPath?.id || firstLearningPathId || undefined}
        showAllPaths={!selectedLearningPath && !firstLearningPathId}
      />
    </YStack>
  );
};
