import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { Text, XStack, YStack, useTheme, Card } from 'tamagui';
import { Button } from './Button';
import { FormField } from './FormField';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as mediaUtils from '../utils/mediaUtils';

interface BetaTestingSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBuyCoffee: () => void;
  onOpenBetaWebView: () => void;
  onShareApp: () => void;
  onOpenAbout: () => void;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

// Dynamic checklist items will be loaded from database

// Feedback areas
const FEEDBACK_AREAS = [
  {
    id: 'ux',
    label: 'User Experience',
    description: 'Is the app intuitive? Are features easy to find?',
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'How fast does the app load? Any crashes?',
  },
  { id: 'navigation', label: 'Navigation & GPS', description: 'How accurate is route tracking?' },
  { id: 'exercises', label: 'Exercise Quality', description: 'Are the driving exercises helpful?' },
  {
    id: 'community',
    label: 'Community Features',
    description: 'How engaging are social features?',
  },
  { id: 'concept', label: 'Overall Concept', description: 'Does the app solve real problems?' },
];

// Premium features for pricing feedback
const PREMIUM_FEATURES = [
  {
    id: 'advanced_analytics',
    label: 'Advanced Analytics',
    description: 'Detailed progress tracking and insights',
  },
  {
    id: 'personalized_routes',
    label: 'Personalized Routes',
    description: 'AI-generated routes based on your needs',
  },
  {
    id: 'instructor_access',
    label: 'Instructor Access',
    description: 'Connect with certified driving instructors',
  },
  {
    id: 'offline_mode',
    label: 'Offline Mode',
    description: 'Practice without internet connection',
  },
  { id: 'priority_support', label: 'Priority Support', description: '24/7 customer support' },
  {
    id: 'premium_exercises',
    label: 'Premium Exercises',
    description: 'Advanced driving exercises and scenarios',
  },
  {
    id: 'family_sharing',
    label: 'Family Sharing',
    description: 'Share progress with family members',
  },
  {
    id: 'certification_tracking',
    label: 'Certification Tracking',
    description: 'Track driving license progress',
  },
];

export function BetaTestingSheet({
  isVisible,
  onClose,
  onOpenBuyCoffee,
  onOpenBetaWebView,
  onShareApp,
  onOpenAbout,
}: BetaTestingSheetProps) {
  const { t, language } = useTranslation();
  const theme = useTheme();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const backgroundColor = theme.background?.val || '#FFFFFF';
  const textColor = theme.color?.val || '#000000';
  const borderColor = theme.borderColor?.val || '#DDD';
  const primaryColor = theme.primary?.val || '#69e3c4';

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Helper function to get translated checklist item text
  const getChecklistItemTranslation = (item: any, field: 'title' | 'description'): string => {
    // Try to parse assignment_id to get role and id
    // Format: {role}_{id}_{timestamp}
    const assignmentIdParts = item.assignmentId?.split('_') || [];
    if (assignmentIdParts.length >= 2) {
      const role = assignmentIdParts[0];
      const id = assignmentIdParts.slice(1, -1).join('_'); // Everything except first and last (timestamp)
      const translationKey = `beta.checklist.${role}.${id}.${field}`;
      const translated = getTranslation(translationKey, field === 'title' ? item.label : item.description);
      return translated;
    }
    // Fallback to original text if parsing fails
    return field === 'title' ? item.label : item.description;
  };

  // Snap points for resizing (like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: screenHeight * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: screenHeight * 0.4, // Top at 40% of screen (show 60% - medium)
      small: screenHeight * 0.7, // Top at 70% of screen (show 30% - small)
      mini: screenHeight * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: screenHeight, // Completely off-screen
    };
    return points;
  }, [screenHeight]);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);
  const isDragging = useRef(false);

  // Animation values
  const translateY = useSharedValue(screenHeight);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Snap functions
  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed]);

  const snapTo = useCallback(
    (point: number) => {
      currentState.value = point;
      setCurrentSnapPoint(point);
    },
    [currentState],
  );

  // Pan gesture for drag-to-dismiss and snap points
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;

        // Constrain to snap points range
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.mini + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentState.value + translationY;

      // Dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.mini;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.mini);

      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Tab state
  const [activeTab, setActiveTab] = useState<'checklist' | 'feedback' | 'pricing' | 'video'>(
    'checklist',
  );

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  // Viewing role for checklist (separate from user's actual role)
  const [viewingRole, setViewingRole] = useState<'student' | 'supervisor' | 'other'>('student');

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    role: 'student',
    rating: 0,
    feedback: '',
    areas: [] as string[],
  });
  const [feedbackMedia, setFeedbackMedia] = useState<mediaUtils.MediaItem[]>([]);
  const [uploadingFeedback, setUploadingFeedback] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Pricing form state
  const [pricingForm, setPricingForm] = useState({
    name: '',
    email: '',
    role: 'student',
    currentPrice: '',
    suggestedPrice: '',
    reasoning: '',
    willingness: 0,
    premiumFeatures: [] as string[],
  });
  const [customFeatures, setCustomFeatures] = useState<string[]>([]);
  const [newCustomFeature, setNewCustomFeature] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioSoundRef = useRef<Audio.Sound | null>(null);

  // Storage keys
  const getStorageKey = (key: string) => `beta_testing_${key}_${user?.id || 'anonymous'}`;

  // Load saved data
  useEffect(() => {
    if (isVisible && user?.id) {
      loadSavedData();
      loadChecklistItems(viewingRole);
    }
  }, [isVisible, user?.id, viewingRole]);

  // Cleanup audio on unmount or when sheet closes
  useEffect(() => {
    if (!isVisible && audioSoundRef.current) {
      audioSoundRef.current.stopAsync().catch(console.error);
      audioSoundRef.current.unloadAsync().catch(console.error);
      audioSoundRef.current = null;
      setIsAudioPlaying(false);
    }
    return () => {
      if (audioSoundRef.current) {
        audioSoundRef.current.unloadAsync().catch(console.error);
      }
    };
  }, [isVisible]);

  // Handle audio play/pause
  const toggleAudio = async () => {
    try {
      if (isAudioPlaying) {
        // Pause
        if (audioSoundRef.current) {
          await audioSoundRef.current.pauseAsync();
          setIsAudioPlaying(false);
        }
      } else {
        // Play
        if (!audioSoundRef.current) {
          // Load audio if not loaded
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/voice-intro.mp3'),
            { shouldPlay: true, volume: 1.0 }
          );
          audioSoundRef.current = sound;
          
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                setIsAudioPlaying(false);
                sound.unloadAsync();
                audioSoundRef.current = null;
              } else {
                setIsAudioPlaying(status.isPlaying);
              }
            }
          });
        } else {
          await audioSoundRef.current.playAsync();
          setIsAudioPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      showToast({
        title: 'Error',
        message: 'Failed to play audio. Please try again.',
        type: 'error',
      });
    }
  };

  // Create default assignments for a user based on their role
  const createDefaultAssignments = async (userId: string, userRole: string) => {
    console.log(
      '🔍 [BetaTestingSheet] Creating default assignments for user:',
      userId,
      'role:',
      userRole,
    );

    const roleAssignments = {
      student: [
        {
          id: 'connect_supervisor',
          title: 'Connect with a supervisor',
          description: 'Find and connect with a supervisor through the app',
          order: 1,
        },
        {
          id: 'browse_routes',
          title: 'Browse driving routes',
          description: 'Explore available routes in your area',
          order: 2,
        },
        {
          id: 'create_account',
          title: 'Create your student account',
          description: 'Complete the registration process and set up your profile',
          order: 3,
        },
        {
          id: 'join_session',
          title: 'Join a practice session',
          description: 'Participate in a group practice session or theory test event',
          order: 4,
        },
        {
          id: 'complete_exercise',
          title: 'Complete a practice exercise',
          description: 'Try at least one interactive exercise along a route',
          order: 5,
        },
        {
          id: 'test_features',
          title: 'Test core features',
          description: 'Spend 15-20 minutes exploring the main app features',
          order: 6,
        },
      ],
      supervisor: [
        {
          id: 'create_supervisor_account',
          title: 'Create supervisor account',
          description: 'Set up your account and verify credentials',
          order: 1,
        },
        {
          id: 'guide_student_route',
          title: 'Guide student through route',
          description: 'Use the app to guide a student through a practice route',
          order: 2,
        },
        {
          id: 'provide_realtime_feedback',
          title: 'Provide real-time feedback',
          description: 'Give feedback during a driving session using app features',
          order: 3,
        },
        {
          id: 'track_student_improvement',
          title: 'Track student improvement',
          description: 'Monitor and log student progress over multiple sessions',
          order: 4,
        },
        {
          id: 'coordinate_with_instructors',
          title: 'Coordinate with instructors',
          description: 'Communicate with driving schools or instructors through the app',
          order: 5,
        },
        {
          id: 'use_safety_features',
          title: 'Use safety features',
          description: 'Test emergency and safety features during practice sessions',
          order: 6,
        },
      ],
      instructor: [
        {
          id: 'setup_profile',
          title: 'Set up instructor profile',
          description: 'Complete your instructor profile and verification',
          order: 1,
        },
        {
          id: 'create_routes',
          title: 'Create driving routes',
          description: 'Create at least 3 driving routes for your students',
          order: 2,
        },
        {
          id: 'invite_students',
          title: 'Invite students',
          description: 'Invite students to join your supervision',
          order: 3,
        },
        {
          id: 'test_supervision',
          title: 'Test supervision features',
          description: 'Test the supervision and monitoring features',
          order: 4,
        },
        {
          id: 'provide_feedback',
          title: 'Provide student feedback',
          description: 'Give feedback to at least one student',
          order: 5,
        },
        {
          id: 'test_analytics',
          title: 'Test analytics dashboard',
          description: 'Explore the analytics and progress tracking features',
          order: 6,
        },
      ],
      school: [
        {
          id: 'setup_school',
          title: 'Set up school profile',
          description: 'Complete your school profile and verification',
          order: 1,
        },
        {
          id: 'create_instructors',
          title: 'Add instructors',
          description: 'Add instructor accounts to your school',
          order: 2,
        },
        {
          id: 'create_students',
          title: 'Add students',
          description: 'Add student accounts to your school',
          order: 3,
        },
        {
          id: 'test_management',
          title: 'Test management features',
          description: 'Test the school management and administration features',
          order: 4,
        },
        {
          id: 'test_reporting',
          title: 'Test reporting',
          description: 'Test the reporting and analytics features',
          order: 5,
        },
        {
          id: 'test_billing',
          title: 'Test billing features',
          description: 'Test the billing and payment features',
          order: 6,
        },
      ],
      other: [
        {
          id: 'browse_interface',
          title: 'Browse the app interface',
          description: 'Navigate through all main sections and explore the app structure',
          order: 1,
        },
        {
          id: 'test_navigation',
          title: 'Test basic navigation flows',
          description: 'Test moving between different screens and features',
          order: 2,
        },
        {
          id: 'check_performance',
          title: 'Check app performance and loading',
          description: 'Monitor loading times, responsiveness, and overall app speed',
          order: 3,
        },
        {
          id: 'test_edge_cases',
          title: 'Test edge cases and error handling',
          description: 'Try unusual inputs, poor network conditions, and error scenarios',
          order: 4,
        },
        {
          id: 'stress_test',
          title: 'Stress test core features',
          description: 'Use features intensively to find performance issues and bottlenecks',
          order: 5,
        },
        {
          id: 'document_usability',
          title: 'Document general usability issues',
          description: 'Note any confusing UI elements, unclear instructions, or usability problems',
          order: 6,
        },
      ],
    };

    const assignments =
      roleAssignments[userRole as keyof typeof roleAssignments] || roleAssignments.student;
    console.log(
      '🔍 [BetaTestingSheet] Selected assignments for role:',
      userRole,
      'assignments:',
      assignments,
    );

    try {
      const assignmentData = assignments.map((assignment) => ({
        assignment_id: `${userRole}_${assignment.id}_${Date.now()}`,
        browser_id: userId,
        role: userRole,
        title: assignment.title,
        description: assignment.description,
        order_index: assignment.order,
        is_completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      console.log('🔍 [BetaTestingSheet] Assignment data to insert:', assignmentData);

      const { error } = await supabase.from('beta_test_assignments').insert(assignmentData);

      if (error) {
        console.error('🔍 [BetaTestingSheet] Error creating default assignments:', error);
        throw error;
      }

      console.log(
        `✅ [BetaTestingSheet] Created ${assignments.length} default assignments for ${userRole}`,
      );
    } catch (error) {
      console.error('🔍 [BetaTestingSheet] Error creating default assignments:', error);
    }
  };

  // Load checklist items from database
  const loadChecklistItems = async (roleToView: 'student' | 'supervisor' | 'other' = viewingRole) => {
    if (!user?.id) return;

    try {
      setChecklistLoading(true);
      console.log('🔍 [BetaTestingSheet] Loading checklist items for user:', user.id, 'viewing role:', roleToView);

      // Get user's role from profile (this is the actual user role, not the viewing role)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'student';
      console.log('🔍 [BetaTestingSheet] User role from profile:', userRole, 'Viewing role:', roleToView);

      // Load assignments for this specific user filtered by the viewing role
      const { data: assignments, error } = await supabase
        .from('beta_test_assignments')
        .select('*')
        .eq('browser_id', user.id)
        .eq('role', roleToView)
        .order('order_index', { ascending: true });

      console.log('🔍 [BetaTestingSheet] Existing assignments:', assignments);
      console.log('🔍 [BetaTestingSheet] Assignment error:', error);

      // Check if assignments are standardized (should have 6 items for the viewing role)
      const expectedCount = 6;
      const hasStandardizedAssignments =
        assignments &&
        assignments.length === expectedCount &&
        assignments.every((a) => a.role === roleToView && a.order_index > 0);

      console.log(
        '🔍 [BetaTestingSheet] Has standardized assignments:',
        hasStandardizedAssignments,
        'count:',
        assignments?.length,
      );

      if (error || !assignments || assignments.length === 0 || !hasStandardizedAssignments) {
        console.log(
          '🔍 [BetaTestingSheet] No standardized assignments found, cleaning up and creating new ones...',
        );

        // Clean up old assignments for this specific role if they exist
        if (assignments && assignments.length > 0) {
          console.log('🔍 [BetaTestingSheet] Cleaning up old assignments for role:', roleToView);
          const { error: deleteError } = await supabase
            .from('beta_test_assignments')
            .delete()
            .eq('browser_id', user.id)
            .eq('role', roleToView);

          if (deleteError) {
            console.error('🔍 [BetaTestingSheet] Error cleaning up old assignments:', deleteError);
          }
        }

        // Create default assignments for the viewing role (not user's actual role)
        await createDefaultAssignments(user.id, roleToView);

        // Reload assignments after creating them
        const { data: newAssignments, error: reloadError } = await supabase
          .from('beta_test_assignments')
          .select('*')
          .eq('browser_id', user.id)
          .eq('role', roleToView)
          .order('order_index', { ascending: true });

        if (reloadError) {
          console.error('Error reloading assignments:', reloadError);
          // Fallback to basic checklist if database fails
          setChecklistItems([
            {
              id: 'download',
              label: 'Download and install the app',
              description: 'Get the app from the store',
              completed: false,
            },
            {
              id: 'account',
              label: 'Create account and complete onboarding',
              description: 'Set up your profile',
              completed: false,
            },
            {
              id: 'explore',
              label: 'Spend 15-20 minutes exploring core features',
              description: 'Try different features',
              completed: false,
            },
            {
              id: 'workflows',
              label: 'Complete typical user workflows',
              description: 'Test common use cases',
              completed: false,
            },
            {
              id: 'edge_cases',
              label: 'Test edge cases (poor internet, GPS issues)',
              description: 'Test in different conditions',
              completed: false,
            },
            {
              id: 'document',
              label: 'Document bugs, crashes, or confusing experiences',
              description: 'Note any issues you find',
              completed: false,
            },
          ]);
          return;
        }

        // Use the newly created assignments and remove duplicates
        // Use role + order_index as the key to prevent duplicates with same order_index
        const itemsMap = new Map();
        newAssignments?.forEach((assignment) => {
          const key = `${assignment.role}-${assignment.order_index}`;
          // If we already have this order_index, keep the one with the most recent completion or creation
          if (!itemsMap.has(key)) {
            itemsMap.set(key, {
              id: assignment.assignment_id,
              label: assignment.title,
              description: assignment.description,
              completed: assignment.is_completed || false,
              completedAt: assignment.completed_at,
              orderIndex: assignment.order_index,
              metadata: assignment.metadata,
              assignmentId: assignment.assignment_id,
              createdAt: assignment.created_at,
            });
          } else {
            // If duplicate found, keep the one with completion or most recent
            const existing = itemsMap.get(key);
            const existingDate = existing.completedAt || existing.createdAt;
            const newDate = assignment.completed_at || assignment.created_at;
            
            // Prefer completed items, or more recent if both completed or both not completed
            if (
              (assignment.is_completed && !existing.completed) ||
              (assignment.is_completed === existing.completed && newDate > existingDate)
            ) {
              itemsMap.set(key, {
                id: assignment.assignment_id,
                label: assignment.title,
                description: assignment.description,
                completed: assignment.is_completed || false,
                completedAt: assignment.completed_at,
                orderIndex: assignment.order_index,
                metadata: assignment.metadata,
                assignmentId: assignment.assignment_id,
                createdAt: assignment.created_at,
              });
            }
          }
        });

        const itemsWithStatus = Array.from(itemsMap.values()).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        console.log('🔍 [BetaTestingSheet] New assignments created (deduplicated):', itemsWithStatus);
        setChecklistItems(itemsWithStatus);
        return;
      }

      // Merge assignments with completion status and remove duplicates
      // Use role + order_index as the key to prevent duplicates with same order_index
      const itemsMap = new Map();
      assignments?.forEach((assignment) => {
        const key = `${assignment.role}-${assignment.order_index}`;
        // If we already have this order_index, keep the one with the most recent completion or creation
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: assignment.assignment_id,
            label: assignment.title,
            description: assignment.description,
            completed: assignment.is_completed || false,
            completedAt: assignment.completed_at,
            orderIndex: assignment.order_index,
            metadata: assignment.metadata,
            assignmentId: assignment.assignment_id,
            createdAt: assignment.created_at,
          });
        } else {
          // If duplicate found, keep the one with completion or most recent
          const existing = itemsMap.get(key);
          const existingDate = existing.completedAt || existing.createdAt;
          const newDate = assignment.completed_at || assignment.created_at;
          
          // Prefer completed items, or more recent if both completed or both not completed
          if (
            (assignment.is_completed && !existing.completed) ||
            (assignment.is_completed === existing.completed && newDate > existingDate)
          ) {
            itemsMap.set(key, {
              id: assignment.assignment_id,
              label: assignment.title,
              description: assignment.description,
              completed: assignment.is_completed || false,
              completedAt: assignment.completed_at,
              orderIndex: assignment.order_index,
              metadata: assignment.metadata,
              assignmentId: assignment.assignment_id,
              createdAt: assignment.created_at,
            });
          }
        }
      });

      const itemsWithStatus = Array.from(itemsMap.values()).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      console.log('🔍 [BetaTestingSheet] Final checklist items (deduplicated):', itemsWithStatus);
      setChecklistItems(itemsWithStatus);
      
      // Check for celebration if all items completed
      const allCompleted = itemsWithStatus.every((item) => item.completed);
      if (allCompleted && itemsWithStatus.length > 0 && user?.id) {
        const checkKey = `beta_testing_celebrated_${user.id}_${viewingRole}`;
        AsyncStorage.getItem(checkKey).then((celebrated) => {
          if (!celebrated) {
            const playCelebration = async () => {
              try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await Audio.setAudioModeAsync({
                  playsInSilentModeIOS: false,
                  staysActiveInBackground: false,
                });
                const { sound } = await Audio.Sound.createAsync(
                  require('../../assets/sounds/ui-celebration.mp3'),
                  { shouldPlay: true, volume: 0.6 }
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
            
            // Use showToast instead of showCelebration since we're not in CelebrationProvider context
            showToast({
              title: '🎉 Beta Testing Complete!',
              message: 'Thank you for completing all testing tasks!',
              type: 'success',
            });
            
            AsyncStorage.setItem(checkKey, 'true');
          }
        });
      }
    } catch (error) {
      console.error('Error loading checklist items:', error);
      // Fallback to basic checklist if everything fails
      setChecklistItems([
        {
          id: 'download',
          label: 'Download and install the app',
          description: 'Get the app from the store',
          completed: false,
        },
        {
          id: 'account',
          label: 'Create account and complete onboarding',
          description: 'Set up your profile',
          completed: false,
        },
        {
          id: 'explore',
          label: 'Spend 15-20 minutes exploring core features',
          description: 'Try different features',
          completed: false,
        },
        {
          id: 'workflows',
          label: 'Complete typical user workflows',
          description: 'Test common use cases',
          completed: false,
        },
        {
          id: 'edge_cases',
          label: 'Test edge cases (poor internet, GPS issues)',
          description: 'Test in different conditions',
          completed: false,
        },
        {
          id: 'document',
          label: 'Document bugs, crashes, or confusing experiences',
          description: 'Note any issues you find',
          completed: false,
        },
      ]);
    } finally {
      setChecklistLoading(false);
    }
  };

  const loadSavedData = async () => {
    try {
      // Load checklist
      const checklistKey = getStorageKey('checklist');
      const savedChecklist = await AsyncStorage.getItem(checklistKey);
      if (savedChecklist) {
        setChecklistItems(JSON.parse(savedChecklist));
      }

      // Load feedback form
      const feedbackKey = getStorageKey('feedback');
      const savedFeedback = await AsyncStorage.getItem(feedbackKey);
      if (savedFeedback) {
        const feedback = JSON.parse(savedFeedback);
        setFeedbackForm(feedback);
        // Load media if saved (though media URIs may not be valid after reload)
        if (feedback.mediaUrls) {
          // Note: Media items from previous sessions won't be reloadable
          // This is expected - users should add media fresh each time
        }
      }

      // Load pricing form
      const pricingKey = getStorageKey('pricing');
      const savedPricing = await AsyncStorage.getItem(pricingKey);
      if (savedPricing) {
        const pricing = JSON.parse(savedPricing);
        setPricingForm(pricing);
        // Load custom features if saved
        if (pricing.customFeatures && Array.isArray(pricing.customFeatures)) {
          setCustomFeatures(pricing.customFeatures);
        }
      }
    } catch (error) {
      console.error('Error loading saved beta testing data:', error);
    }
  };

  // Save data
  const saveChecklist = async (items: typeof checklistItems) => {
    try {
      await AsyncStorage.setItem(getStorageKey('checklist'), JSON.stringify(items));
    } catch (error) {
      console.error('Error saving checklist:', error);
    }
  };

  const saveFeedback = async (form: typeof feedbackForm) => {
    try {
      await AsyncStorage.setItem(getStorageKey('feedback'), JSON.stringify(form));
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const savePricing = async (form: typeof pricingForm) => {
    try {
      const dataToSave = {
        ...form,
        customFeatures: customFeatures,
      };
      await AsyncStorage.setItem(getStorageKey('pricing'), JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving pricing:', error);
    }
  };

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Reset gesture translateY when opening and set to large snap point
      translateY.value = withSpring(snapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.large;
      setCurrentSnapPoint(snapPoints.large);

      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, backdropOpacity, snapPoints.large, currentState]);

  // Handle checklist toggle
  const toggleChecklistItem = async (id: string) => {
    if (!user?.id) return;

    try {
      const item = checklistItems.find((item) => item.id === id);
      if (!item) return;

      const isCompleted = !item.completed;

      // Update local state immediately
      const updated = checklistItems.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: isCompleted,
              completedAt: isCompleted ? new Date().toISOString() : null,
            }
          : item,
      );
      setChecklistItems(updated);

      // Save to database - update the existing assignment
      const { error } = await supabase
        .from('beta_test_assignments')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('assignment_id', item.assignmentId || id)
        .eq('browser_id', user.id);

      if (error) {
        console.error('Error saving checklist completion:', error);
        // Revert local state on error
        setChecklistItems(checklistItems);
        showToast({
          title: 'Error',
          message: 'Failed to save progress. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  // Handle feedback area toggle
  const toggleFeedbackArea = (areaId: string) => {
    const updated = feedbackForm.areas.includes(areaId)
      ? feedbackForm.areas.filter((id) => id !== areaId)
      : [...feedbackForm.areas, areaId];

    const newForm = { ...feedbackForm, areas: updated };
    setFeedbackForm(newForm);
    saveFeedback(newForm);
  };

  // Handle premium features toggle
  const togglePremiumFeature = (featureId: string) => {
    const updated = pricingForm.premiumFeatures.includes(featureId)
      ? pricingForm.premiumFeatures.filter((id) => id !== featureId)
      : [...pricingForm.premiumFeatures, featureId];

    const newForm = { ...pricingForm, premiumFeatures: updated };
    setPricingForm(newForm);
    savePricing(newForm);
  };

  // Handle custom features
  const handleAddCustomFeature = () => {
    if (newCustomFeature.trim() && !customFeatures.includes(newCustomFeature.trim())) {
      const updated = [...customFeatures, newCustomFeature.trim()];
      setCustomFeatures(updated);
      setNewCustomFeature('');
      // Also save to pricing form state
      const newForm = { ...pricingForm };
      setPricingForm(newForm);
      savePricing(newForm);
    }
  };

  const handleRemoveCustomFeature = (feature: string) => {
    const updated = customFeatures.filter((f) => f !== feature);
    setCustomFeatures(updated);
    const newForm = { ...pricingForm };
    setPricingForm(newForm);
    savePricing(newForm);
  };

  // Handle media upload for feedback
  const handlePickMedia = async () => {
    try {
      const media = await mediaUtils.pickMediaFromLibrary(true);
      if (media && media.length > 0) {
        setFeedbackMedia([...feedbackMedia, ...media]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      showToast({
        title: 'Error',
        message: 'Failed to pick media. Please try again.',
        type: 'error',
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const media = await mediaUtils.takePhoto();
      if (media) {
        setFeedbackMedia([...feedbackMedia, media]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast({
        title: 'Error',
        message: 'Failed to take photo. Please try again.',
        type: 'error',
      });
    }
  };

  const handleRecordVideo = async () => {
    try {
      const media = await mediaUtils.recordVideo();
      if (media) {
        setFeedbackMedia([...feedbackMedia, media]);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      showToast({
        title: 'Error',
        message: 'Failed to record video. Please try again.',
        type: 'error',
      });
    }
  };

  const handleRemoveMedia = (index: number) => {
    const updated = feedbackMedia.filter((_, i) => i !== index);
    setFeedbackMedia(updated);
  };

  const showMediaPickerOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose how to add media',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Record Video', onPress: handleRecordVideo },
        { text: 'Choose from Library', onPress: handlePickMedia },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  // Submit feedback
  const submitFeedback = async () => {
    if (!feedbackForm.name || !feedbackForm.feedback || feedbackForm.rating === 0) {
      showToast({
        title: 'Missing Information',
        message: 'Please provide your name, rating, and feedback.',
        type: 'error',
      });
      return;
    }

    try {
      setUploadingFeedback(true);
      
      // Upload media files first
      let mediaUrls: string[] = [];
      if (feedbackMedia.length > 0) {
        setUploadProgress({ current: 0, total: feedbackMedia.length });

        for (let i = 0; i < feedbackMedia.length; i++) {
          const mediaItem = feedbackMedia[i];
          try {
            setUploadProgress({ current: i + 1, total: feedbackMedia.length });
            
            const publicUrl = await mediaUtils.uploadMediaToSupabase(
              mediaItem,
              'beta-test-images',
              `feedback/${user?.id || 'anonymous'}`,
            );
            if (publicUrl) {
              mediaUrls.push(publicUrl);
            }
          } catch (uploadError) {
            console.error('Error uploading media:', uploadError);
            // Continue with other files even if one fails
          }
        }
        
        setUploadProgress(null);
      }

      // Submit to Supabase database
      const { data, error } = await supabase
        .from('beta_test_feedback')
        .insert({
          name: feedbackForm.name,
          email: feedbackForm.email,
          role: feedbackForm.role,
          rating: feedbackForm.rating,
          comment: feedbackForm.feedback,
          feedback_type: 'general',
          image_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
          metadata: {
            areas: feedbackForm.areas,
            submittedAt: Date.now(),
            userId: user?.id,
            mediaCount: mediaUrls.length,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase feedback error:', error);
        throw error;
      }

      console.log('Feedback submitted to Supabase:', data);

      // Also save to local storage as backup
      const feedbackData = {
        ...feedbackForm,
        submittedAt: Date.now(),
        userId: user?.id,
        supabaseId: data.id,
        mediaUrls,
      };

      const existingFeedback = await AsyncStorage.getItem('beta_feedback_submissions');
      const submissions = existingFeedback ? JSON.parse(existingFeedback) : [];
      submissions.push(feedbackData);
      await AsyncStorage.setItem('beta_feedback_submissions', JSON.stringify(submissions));

      showToast({
        title: 'Thank You!',
        message: 'Your feedback has been saved and will help us improve Vromm.',
        type: 'success',
      });

      // Reset form
      setFeedbackForm({
        name: '',
        email: '',
        role: 'student',
        rating: 0,
        feedback: '',
        areas: [],
      });
      setFeedbackMedia([]);
    } catch (error) {
      console.error('Feedback submission error:', error);
      showToast({
        title: 'Error',
        message: 'Could not save feedback. Please try again.',
        type: 'error',
      });
    } finally {
      setUploadingFeedback(false);
      setUploadProgress(null);
    }
  };

  // Submit pricing feedback
  const submitPricing = async () => {
    if (!pricingForm.name || !pricingForm.suggestedPrice || !pricingForm.reasoning) {
      showToast({
        title: 'Missing Information',
        message: 'Please provide your name, suggested price, and reasoning.',
        type: 'error',
      });
      return;
    }

    try {
      // Combine standard and custom features
      const allFeatures = [...pricingForm.premiumFeatures, ...customFeatures];

      // Submit to Supabase database
      const { data, error } = await supabase
        .from('beta_test_feedback')
        .insert({
          name: pricingForm.name,
          email: pricingForm.email,
          role: pricingForm.role,
          rating: pricingForm.willingness,
          comment: pricingForm.reasoning,
          feedback_type: 'pricing',
          metadata: {
            currentPrice: pricingForm.currentPrice,
            suggestedPrice: pricingForm.suggestedPrice,
            premiumFeatures: pricingForm.premiumFeatures,
            customFeatures: customFeatures,
            allFeatures: allFeatures,
            submittedAt: Date.now(),
            userId: user?.id,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase pricing feedback error:', error);
        throw error;
      }

      console.log('Pricing feedback submitted to Supabase:', data);

      // Also save to local storage as backup
      const pricingData = {
        ...pricingForm,
        customFeatures,
        submittedAt: Date.now(),
        userId: user?.id,
        supabaseId: data.id,
      };

      const existingPricing = await AsyncStorage.getItem('beta_pricing_submissions');
      const submissions = existingPricing ? JSON.parse(existingPricing) : [];
      submissions.push(pricingData);
      await AsyncStorage.setItem('beta_pricing_submissions', JSON.stringify(submissions));

      showToast({
        title: 'Thank You!',
        message: 'Your pricing feedback has been saved and will help us set the right price for Vromm.',
        type: 'success',
      });

      // Reset form
      setPricingForm({
        name: '',
        email: '',
        role: 'student',
        currentPrice: '',
        suggestedPrice: '',
        reasoning: '',
        willingness: 0,
        premiumFeatures: [],
      });
      setCustomFeatures([]);
      setNewCustomFeature('');
    } catch (error) {
      console.error('Pricing feedback submission error:', error);
      showToast({
        title: 'Error',
        message: 'Could not save pricing feedback. Please try again.',
        type: 'error',
      });
    }
  };

  // Render tabs
  const renderTabs = () => {
    const tabs = [
      {
        key: 'checklist',
        label: getTranslation('beta.checklist', language === 'sv' ? 'Checklista' : 'Checklist'),
      },
      {
        key: 'feedback',
        label: getTranslation('beta.feedback', language === 'sv' ? 'Återkoppling' : 'Feedback'),
      },
      {
        key: 'pricing',
        label: getTranslation('beta.pricing', language === 'sv' ? 'Prissättning' : 'Pricing'),
      },
      {
        key: 'video',
        label: getTranslation('beta.resources', language === 'sv' ? 'Resurser' : 'Resources'),
      },
    ];

    return (
      <XStack gap="$2" marginBottom="$4" flexWrap="wrap">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: borderColor,
              backgroundColor: activeTab === tab.key ? primaryColor : 'transparent',
              flex: 1,
              minWidth: 80,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              fontSize="$3"
              fontWeight={activeTab === tab.key ? '600' : '500'}
              color={activeTab === tab.key ? '#000000' : textColor}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </XStack>
    );
  };

  // Render checklist tab
  const renderChecklistTab = () => (
    <YStack gap="$4">
      <YStack gap="$2">
        <Text fontSize="$6" fontWeight="700" color={textColor}>
          {getTranslation(
            'beta.testingChecklist',
            language === 'sv' ? 'Testchecklista' : 'Testing Checklist'
          )}
        </Text>
        <Text fontSize="$4" color={textColor} opacity={0.7}>
          {getTranslation(
            'beta.completeTasks',
            language === 'sv'
              ? 'Slutför dessa uppgifter för att hjälpa oss testa Vromm effektivt:'
              : 'Complete these tasks to help us test Vromm effectively:'
          )}
        </Text>
        
        {/* Role selector for checklist view */}
        <Card padding="$3" backgroundColor={`${primaryColor}10`} marginTop="$2">
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color={textColor} opacity={0.8}>
              {getTranslation(
                'beta.selectChecklist',
                language === 'sv' ? 'Välj checklista att visa:' : 'Select checklist to view:'
              )}
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              <TouchableOpacity
                onPress={() => {
                  setViewingRole('student');
                  setChecklistItems([]); // Clear items before loading new ones
                  loadChecklistItems('student');
                }}
                style={{
                  flex: 1,
                  minWidth: 100,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: viewingRole === 'student' ? primaryColor : borderColor,
                  backgroundColor: viewingRole === 'student' ? primaryColor : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  fontSize="$4"
                  fontWeight={viewingRole === 'student' ? '600' : '500'}
                  color={viewingRole === 'student' ? '#000000' : textColor}
                >
                  {getTranslation('beta.student', language === 'sv' ? 'Elev' : 'Student')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setViewingRole('supervisor');
                  setChecklistItems([]); // Clear items before loading new ones
                  loadChecklistItems('supervisor');
                }}
                style={{
                  flex: 1,
                  minWidth: 100,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: viewingRole === 'supervisor' ? primaryColor : borderColor,
                  backgroundColor: viewingRole === 'supervisor' ? primaryColor : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  fontSize="$4"
                  fontWeight={viewingRole === 'supervisor' ? '600' : '500'}
                  color={viewingRole === 'supervisor' ? '#000000' : textColor}
                >
                  {getTranslation('beta.supervisor', language === 'sv' ? 'Handledare' : 'Supervisor')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setViewingRole('other');
                  setChecklistItems([]); // Clear items before loading new ones
                  loadChecklistItems('other');
                }}
                style={{
                  flex: 1,
                  minWidth: 100,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: viewingRole === 'other' ? primaryColor : borderColor,
                  backgroundColor: viewingRole === 'other' ? primaryColor : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  fontSize="$4"
                  fontWeight={viewingRole === 'other' ? '600' : '500'}
                  color={viewingRole === 'other' ? '#000000' : textColor}
                >
                  {getTranslation(
                    'beta.other',
                    language === 'sv' ? 'Annat / Stresstest' : 'Other / Stress Test'
                  )}
                </Text>
              </TouchableOpacity>
            </XStack>
          </YStack>
        </Card>
      </YStack>

      {checklistLoading ? (
        <Card padding="$4" backgroundColor={`${primaryColor}10`}>
          <XStack alignItems="center" gap="$3">
            <Feather name="loader" size={20} color={primaryColor} />
            <Text fontSize="$4" color={textColor}>
              Loading checklist items...
            </Text>
          </XStack>
        </Card>
      ) : (
        <YStack gap="$3">
          {checklistItems.length === 0 ? (
            <Card padding="$4" backgroundColor={`${primaryColor}10`}>
              <Text fontSize="$4" color={textColor} opacity={0.7}>
                No checklist items available for your role. Please contact support.
              </Text>
            </Card>
          ) : (
            checklistItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}-${item.assignment_id || item.id}`}
                onPress={() => toggleChecklistItem(item.id)}
                style={[
                  styles.checklistItem,
                  { backgroundColor, borderColor },
                  item.completed && { backgroundColor: `${primaryColor}20` },
                ]}
              >
                <XStack alignItems="center" gap="$3">
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: item.completed ? primaryColor : borderColor },
                      item.completed && { backgroundColor: primaryColor },
                    ]}
                  >
                    {item.completed && <Feather name="check" size={16} color="#FFFFFF" />}
                  </View>
                  <YStack flex={1}>
                    <Text
                      fontSize="$4"
                      color={textColor}
                      style={
                        item.completed ? { textDecorationLine: 'line-through', opacity: 0.8 } : {}
                      }
                    >
                      {getChecklistItemTranslation(item, 'title')}
                    </Text>
                    {item.description && (
                      <Text
                        fontSize="$3"
                        color={textColor}
                        opacity={0.7}
                        style={
                          item.completed ? { textDecorationLine: 'line-through', opacity: 0.6 } : {}
                        }
                      >
                        {getChecklistItemTranslation(item, 'description')}
                      </Text>
                    )}
                    {item.completed && item.completedAt && (
                      <Text fontSize="$2" color={primaryColor} opacity={0.8}>
                        {getTranslation('beta.completed', language === 'sv' ? 'Slutförd' : 'Completed')}: {new Date(item.completedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </TouchableOpacity>
            ))
          )}
        </YStack>
      )}

      <Card padding="$4" backgroundColor={`${primaryColor}10`}>
        <Text fontSize="$3" color={textColor} opacity={0.8}>
          💡 Tip: Check off items as you complete them. Your progress is saved automatically to the
          database!
        </Text>
      </Card>
    </YStack>
  );

  // Render feedback tab
  const renderFeedbackTab = () => (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700" color={textColor}>
        Share Your Feedback
      </Text>
      <Text fontSize="$4" color={textColor} opacity={0.7}>
        Help us improve Vromm by sharing your experience:
      </Text>

      <YStack gap="$3">
        {/* Quick-fill chip for logged-in user */}
        {user && !feedbackForm.name && (
          <TouchableOpacity
            onPress={() => {
              const newForm = { 
                ...feedbackForm, 
                name: user.email?.split('@')[0] || 'User',
                email: user.email || ''
              };
              setFeedbackForm(newForm);
              saveFeedback(newForm);
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: borderColor,
              backgroundColor: 'transparent',
              alignSelf: 'flex-start',
            }}
          >
            <Text fontSize={14} color={textColor}>
              Use my info: {user.email?.split('@')[0]}
            </Text>
          </TouchableOpacity>
        )}
        
        <YStack position="relative">
          <YStack gap="$1">
            <XStack alignItems="center" gap="$1">
              <Text fontSize="$3" fontWeight="600" color={textColor}>
                Your name
              </Text>
              <Text fontSize="$3" color="#EF4444">*</Text>
            </XStack>
            <FormField
              placeholder="Your name"
              value={feedbackForm.name}
              onChangeText={(text) => {
                const newForm = { ...feedbackForm, name: text };
                setFeedbackForm(newForm);
                saveFeedback(newForm);
              }}
              size="md"
            />
          </YStack>
          {!feedbackForm.name && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
            </View>
          )}
        </YStack>

        <FormField
          placeholder="Email (optional)"
          value={feedbackForm.email}
          onChangeText={(text) => {
            const newForm = { ...feedbackForm, email: text };
            setFeedbackForm(newForm);
            saveFeedback(newForm);
          }}
          size="md"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <YStack gap="$2" position="relative">
          <XStack alignItems="center" gap="$1">
            <Text fontSize="$4" fontWeight="600" color={textColor}>
              Rate your experience (1-5 stars)
            </Text>
            <Text fontSize="$4" color="#EF4444">*</Text>
          </XStack>
          {feedbackForm.rating === 0 && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
            </View>
          )}
          <XStack gap="$2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  const newForm = { ...feedbackForm, rating: star };
                  setFeedbackForm(newForm);
                  saveFeedback(newForm);
                }}
              >
                <Feather
                  name={star <= feedbackForm.rating ? 'star' : 'star'}
                  size={24}
                  color={star <= feedbackForm.rating ? '#FFD700' : borderColor}
                />
              </TouchableOpacity>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="600" color={textColor}>
            What areas would you like to give feedback on?
          </Text>
          <YStack gap="$2">
            {FEEDBACK_AREAS.map((area, index) => (
              <TouchableOpacity
                key={`feedback-${area.id}-${index}`}
                onPress={() => toggleFeedbackArea(area.id)}
                style={[
                  styles.feedbackArea,
                  { backgroundColor, borderColor },
                  feedbackForm.areas.includes(area.id) && { backgroundColor: `${primaryColor}20` },
                ]}
              >
                <XStack alignItems="center" gap="$3">
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: feedbackForm.areas.includes(area.id)
                          ? primaryColor
                          : borderColor,
                      },
                      feedbackForm.areas.includes(area.id) && { backgroundColor: primaryColor },
                    ]}
                  >
                    {feedbackForm.areas.includes(area.id) && (
                      <Feather name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="600" color={textColor}>
                      {area.label}
                    </Text>
                    <Text fontSize="$3" color={textColor} opacity={0.7}>
                      {area.description}
                    </Text>
                  </YStack>
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>
        </YStack>

        <YStack position="relative">
          <YStack gap="$1">
            <XStack alignItems="center" gap="$1">
              <Text fontSize="$3" fontWeight="600" color={textColor}>
                Your detailed feedback
              </Text>
              <Text fontSize="$3" color="#EF4444">*</Text>
            </XStack>
            <FormField
              placeholder="Your detailed feedback..."
              value={feedbackForm.feedback}
              onChangeText={(text) => {
                const newForm = { ...feedbackForm, feedback: text };
                setFeedbackForm(newForm);
                saveFeedback(newForm);
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              size="md"
            />
          </YStack>
          {!feedbackForm.feedback && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
            </View>
          )}
        </YStack>

        {/* Media Upload Section */}
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="600" color={textColor}>
            Attach Media (optional)
          </Text>
          <Text fontSize="$3" color={textColor} opacity={0.7}>
            Add screenshots, videos, or photos to help explain your feedback
          </Text>

          {/* Media Grid */}
          {feedbackMedia.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {feedbackMedia.map((media, index) => (
                <View key={index} style={{ position: 'relative', width: 80, height: 80 }}>
                  {media.type === 'image' ? (
                    <Image
                      source={{ uri: media.uri }}
                      style={{ width: 80, height: 80, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        backgroundColor: '#000',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather name="play" size={24} color="#FFF" />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveMedia(index)}
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      backgroundColor: '#FF3B30',
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="x" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add Media Button */}
          <Button
            variant="outlined"
            onPress={showMediaPickerOptions}
            icon={<Feather name="plus" size={16} />}
          >
            Add Media
          </Button>
        </YStack>

        {/* Upload Progress */}
        {uploadProgress && (
          <Card padding="$3" backgroundColor={`${primaryColor}20`}>
            <YStack gap="$2">
              <Text fontSize={14} color={textColor} textAlign="center" fontWeight="600">
                Uploading media {uploadProgress.current}/{uploadProgress.total}...
              </Text>
              <View
                style={{
                  width: '100%',
                  height: 6,
                  backgroundColor: borderColor,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                    height: '100%',
                    backgroundColor: primaryColor,
                    borderRadius: 3,
                  }}
                />
              </View>
            </YStack>
          </Card>
        )}

        <Button 
          variant="primary" 
          onPress={submitFeedback}
          disabled={uploadingFeedback || uploadProgress !== null}
        >
          {uploadingFeedback ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </YStack>
    </YStack>
  );

  // Render pricing tab
  const renderPricingTab = () => (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700" color={textColor}>
        Help Us Price Vromm
      </Text>
      <Text fontSize="$4" color={textColor} opacity={0.7}>
        Your input on pricing will help us make Vromm accessible to everyone:
      </Text>

      <YStack gap="$3">
        {/* Quick-fill chip for logged-in user */}
        {user && !pricingForm.name && (
          <TouchableOpacity
            onPress={() => {
              const newForm = { 
                ...pricingForm, 
                name: user.email?.split('@')[0] || 'User',
                email: user.email || ''
              };
              setPricingForm(newForm);
              savePricing(newForm);
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: borderColor,
              backgroundColor: 'transparent',
              alignSelf: 'flex-start',
            }}
          >
            <Text fontSize={14} color={textColor}>
              Use my info: {user.email?.split('@')[0]}
            </Text>
          </TouchableOpacity>
        )}

        <YStack gap="$1" position="relative">
          <XStack alignItems="center" gap="$1">
            <Text fontSize="$3" fontWeight="600" color={textColor}>
              Your name
            </Text>
            <Text fontSize="$3" color="#EF4444">*</Text>
          </XStack>
          <FormField
            placeholder="Your name"
            value={pricingForm.name}
            onChangeText={(text) => {
              const newForm = { ...pricingForm, name: text };
              setPricingForm(newForm);
              savePricing(newForm);
            }}
            size="md"
          />
          {!pricingForm.name && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
            </View>
          )}
        </YStack>

        <FormField
          placeholder="Email (optional)"
          value={pricingForm.email}
          onChangeText={(text) => {
            const newForm = { ...pricingForm, email: text };
            setPricingForm(newForm);
            savePricing(newForm);
          }}
          size="md"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <FormField
          placeholder="What do you currently pay for driving lessons? (e.g., 500 SEK/hour)"
          value={pricingForm.currentPrice}
          onChangeText={(text) => {
            const newForm = { ...pricingForm, currentPrice: text };
            setPricingForm(newForm);
            savePricing(newForm);
          }}
          size="md"
        />

        <YStack gap="$1" position="relative">
          <XStack alignItems="center" gap="$1">
            <Text fontSize="$3" fontWeight="600" color={textColor}>
              Suggested price for Vromm
            </Text>
            <Text fontSize="$3" color="#EF4444">*</Text>
          </XStack>
          <FormField
            placeholder="What would you be willing to pay for Vromm? (e.g., 99 SEK/month)"
            value={pricingForm.suggestedPrice}
            onChangeText={(text) => {
              const newForm = { ...pricingForm, suggestedPrice: text };
              setPricingForm(newForm);
              savePricing(newForm);
            }}
            size="md"
          />
          {!pricingForm.suggestedPrice && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
            </View>
          )}
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="600" color={textColor}>
            How likely are you to pay for Vromm? (1-5)
          </Text>
          <XStack gap="$2">
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => {
                  const newForm = { ...pricingForm, willingness: num };
                  setPricingForm(newForm);
                  savePricing(newForm);
                }}
                style={[
                  styles.ratingButton,
                  { borderColor: num <= pricingForm.willingness ? primaryColor : borderColor },
                  num <= pricingForm.willingness && { backgroundColor: `${primaryColor}20` },
                ]}
              >
                <Text
                  fontSize="$4"
                  color={num <= pricingForm.willingness ? primaryColor : textColor}
                  fontWeight={num <= pricingForm.willingness ? '600' : '400'}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="600" color={textColor}>
            Which premium features matter most to you?
          </Text>
          <YStack gap="$2">
            {PREMIUM_FEATURES.map((feature, index) => (
              <TouchableOpacity
                key={`premium-${feature.id}-${index}`}
                onPress={() => togglePremiumFeature(feature.id)}
                style={[
                  styles.feedbackArea,
                  { backgroundColor, borderColor },
                  pricingForm.premiumFeatures.includes(feature.id) && {
                    backgroundColor: `${primaryColor}20`,
                  },
                ]}
              >
                <XStack alignItems="center" gap="$3">
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: pricingForm.premiumFeatures.includes(feature.id)
                          ? primaryColor
                          : borderColor,
                      },
                      pricingForm.premiumFeatures.includes(feature.id) && {
                        backgroundColor: primaryColor,
                      },
                    ]}
                  >
                    {pricingForm.premiumFeatures.includes(feature.id) && (
                      <Feather name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <YStack flex={1}>
                    <Text fontSize="$4" fontWeight="600" color={textColor}>
                      {feature.label}
                    </Text>
                    <Text fontSize="$3" color={textColor} opacity={0.7}>
                      {feature.description}
                    </Text>
                  </YStack>
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>

          {/* Custom Features Section */}
          <YStack gap="$2" marginTop="$2">
            <Text fontSize="$4" fontWeight="600" color={textColor}>
              Add your own important features:
            </Text>
            <XStack gap="$2" alignItems="center">
              <View style={{ flex: 1 }}>
                <FormField
                  placeholder="Enter a feature that matters to you..."
                  value={newCustomFeature}
                  onChangeText={setNewCustomFeature}
                  size="md"
                  onSubmitEditing={handleAddCustomFeature}
                />
              </View>
              <TouchableOpacity
                onPress={handleAddCustomFeature}
                disabled={!newCustomFeature.trim()}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: newCustomFeature.trim() ? primaryColor : borderColor,
                  opacity: newCustomFeature.trim() ? 1 : 0.5,
                }}
              >
                <Feather
                  name="plus"
                  size={20}
                  color={newCustomFeature.trim() ? '#000' : textColor}
                />
              </TouchableOpacity>
            </XStack>

            {/* Custom Features List */}
            {customFeatures.length > 0 && (
              <YStack gap="$2">
                {customFeatures.map((feature, index) => (
                  <Card
                    key={index}
                    padding="$3"
                    backgroundColor={`${primaryColor}20`}
                    borderColor={primaryColor}
                  >
                    <XStack alignItems="center" justifyContent="space-between">
                      <XStack alignItems="center" gap="$2" flex={1}>
                        <View
                          style={[
                            styles.checkbox,
                            { backgroundColor: primaryColor, borderColor: primaryColor },
                          ]}
                        >
                          <Feather name="check" size={16} color="#FFFFFF" />
                        </View>
                        <Text fontSize="$4" fontWeight="600" color={textColor} flex={1}>
                          {feature}
                        </Text>
                      </XStack>
                      <TouchableOpacity
                        onPress={() => handleRemoveCustomFeature(feature)}
                        style={{
                          padding: 4,
                          borderRadius: 4,
                        }}
                      >
                        <Feather name="x" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </XStack>
                  </Card>
                ))}
              </YStack>
            )}
          </YStack>
        </YStack>

        <YStack gap="$1" position="relative">
          <XStack alignItems="center" gap="$1">
            <Text fontSize="$3" fontWeight="600" color={textColor}>
              Explain your reasoning
            </Text>
            <Text fontSize="$3" color="#EF4444">*</Text>
          </XStack>
          <FormField
            placeholder="Explain your reasoning for the suggested price..."
            value={pricingForm.reasoning}
            onChangeText={(text) => {
              const newForm = { ...pricingForm, reasoning: text };
              setPricingForm(newForm);
              savePricing(newForm);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            size="md"
          />
          {!pricingForm.reasoning && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
            </View>
          )}
        </YStack>

        <Button variant="primary" onPress={submitPricing}>
          Submit Pricing Feedback
        </Button>
      </YStack>
    </YStack>
  );

  // Render video tab
  const renderVideoTab = () => (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700" color={textColor}>
        Listen to Our Story
      </Text>
      <Text fontSize="$4" color={textColor} opacity={0.7}>
        Hear from Vromm's co-founder and explore additional resources:
      </Text>

      {/* Audio player */}
      <Card padding="$6" backgroundColor={`${primaryColor}10`} alignItems="center">
        <TouchableOpacity
          onPress={toggleAudio}
          style={{
            padding: 12,
            borderRadius: 30,
            backgroundColor: primaryColor,
            marginBottom: 16,
          }}
        >
          <Feather 
            name={isAudioPlaying ? "pause" : "play"} 
            size={32} 
            color="#000" 
          />
        </TouchableOpacity>
        <Text fontSize="$5" fontWeight="600" color={textColor} marginTop="$2">
          Welcome Message
        </Text>
        <Text fontSize="$3" color={textColor} opacity={0.7} textAlign="center" marginTop="$2">
          Listen to this personal message from our team about what makes Vromm special
        </Text>
      </Card>

      {/* Action buttons */}
      <YStack gap="$3">
        <Button
          variant="primary"
          size="lg"
          onPress={() => {
            onOpenBetaWebView();
            onClose();
          }}
          icon={<Feather name="globe" size={20} color="#FFFFFF" />}
        >
          Visit Beta Website
        </Button>

        <Button
          variant="primary"
          size="lg"
          onPress={() => {
            onOpenBuyCoffee();
            onClose();
          }}
          icon={<Feather name="coffee" size={20} color="#FFFFFF" />}
        >
          Buy Me a Coffee
        </Button>

        <Button
          variant="primary"
          size="lg"
          onPress={() => {
            onShareApp();
            onClose();
          }}
          icon={<Feather name="share-2" size={20} color="#FFFFFF" />}
        >
          Share Vromm
        </Button>

        <Button
          variant="outlined"
          size="lg"
          onPress={() => {
            onOpenAbout();
            onClose();
          }}
          icon={<Feather name="info" size={20} />}
        >
          About Vromm
        </Button>
      </YStack>
    </YStack>
  );

  // Render current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'checklist':
        return renderChecklistTab();
      case 'feedback':
        return renderFeedbackTab();
      case 'pricing':
        return renderPricingTab();
      case 'video':
        return renderVideoTab();
      default:
        return renderChecklistTab();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <ReanimatedAnimated.View
          style={[
            styles.sheet,
            {
              backgroundColor,
            },
            animatedGestureStyle,
          ]}
        >
          <YStack padding="$3" paddingBottom={20 + BOTTOM_INSET} gap="$3" flex={1}>
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
                  backgroundColor: borderColor,
                }}
              />
            </View>

            {/* Show content only if not in mini mode */}
            {currentSnapPoint !== snapPoints.mini && (
              <View style={{ flex: 1 }}>
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
                  <YStack flex={1}>
                    <Text fontSize="$6" fontWeight="700" color={textColor}>
                      {getTranslation(
                        'beta.title',
                        language === 'sv' ? 'Betatestning' : 'Beta Testing'
                      )}
                    </Text>
                    <Text fontSize="$3" color={textColor} opacity={0.7}>
                      {getTranslation(
                        'beta.subtitle',
                        language === 'sv' ? 'Hjälp oss att perfekta Vromm' : 'Help us perfect Vromm'
                      )}
                    </Text>
                  </YStack>
                  <Button onPress={onClose} variant="outlined" size="sm">
                    <Feather name="x" size={16} />
                  </Button>
                </XStack>

                {/* Tabs */}
                {renderTabs()}

                {/* Content */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 40 + BOTTOM_INSET }}
                >
                  {renderTabContent()}
                </ScrollView>
              </View>
            )}
          </YStack>
        </ReanimatedAnimated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 8,
  },
  checklistItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackArea: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function BetaTestingSheetModal({
  onOpenBuyCoffee,
  onOpenBetaWebView,
  onShareApp,
  onOpenAbout,
}: {
  onOpenBuyCoffee: () => void;
  onOpenBetaWebView: () => void;
  onShareApp: () => void;
  onOpenAbout: () => void;
}) {
  const { hideModal } = useModal();

  return (
    <BetaTestingSheet
      isVisible={true}
      onClose={hideModal}
      onOpenBuyCoffee={onOpenBuyCoffee}
      onOpenBetaWebView={onOpenBetaWebView}
      onShareApp={onShareApp}
      onOpenAbout={onOpenAbout}
    />
  );
}
