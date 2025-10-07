import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { Text, XStack, YStack, useTheme, Button, Input, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BetaTestingSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenBuyCoffee: () => void;
  onOpenBetaWebView: () => void;
  onShareApp: () => void;
  onOpenAbout: () => void;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Snap points for resizing (like RouteDetailSheet)
const snapPoints = {
  large: screenHeight * 0.1, // Top at 10% of screen (show 90% - largest)
  medium: screenHeight * 0.4, // Top at 40% of screen (show 60% - medium)
  small: screenHeight * 0.7, // Top at 70% of screen (show 30% - small)
  mini: screenHeight * 0.85, // Top at 85% of screen (show 15% - just title)
  dismissed: screenHeight, // Completely off-screen
};

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
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  const backgroundColor = theme.background?.val || '#FFFFFF';
  const textColor = theme.color?.val || '#000000';
  const borderColor = theme.borderColor?.val || '#DDD';
  const primaryColor = theme.primary?.val || '#69e3c4';

  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Tab state
  const [activeTab, setActiveTab] = useState<'checklist' | 'feedback' | 'pricing' | 'video'>(
    'checklist',
  );

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    role: 'student',
    rating: 0,
    feedback: '',
    areas: [] as string[],
  });

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

  // Storage keys
  const getStorageKey = (key: string) => `beta_testing_${key}_${user?.id || 'anonymous'}`;

  // Load saved data
  useEffect(() => {
    if (isVisible && user?.id) {
      loadSavedData();
      loadChecklistItems();
    }
  }, [isVisible, user?.id]);

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
  const loadChecklistItems = async () => {
    if (!user?.id) return;

    try {
      setChecklistLoading(true);
      console.log('🔍 [BetaTestingSheet] Loading checklist items for user:', user.id);

      // Get user's role from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'student';
      console.log('🔍 [BetaTestingSheet] User role from profile:', userRole);

      // Load assignments for this specific user
      const { data: assignments, error } = await supabase
        .from('beta_test_assignments')
        .select('*')
        .eq('browser_id', user.id)
        .order('order_index', { ascending: true });

      console.log('🔍 [BetaTestingSheet] Existing assignments:', assignments);
      console.log('🔍 [BetaTestingSheet] Assignment error:', error);

      // Check if assignments are standardized (should have 6 items for each role)
      const expectedCount = 6;
      const hasStandardizedAssignments =
        assignments &&
        assignments.length === expectedCount &&
        assignments.every((a) => a.role === userRole && a.order_index > 0);

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

        // Clean up old assignments if they exist
        if (assignments && assignments.length > 0) {
          console.log('🔍 [BetaTestingSheet] Cleaning up old assignments...');
          const { error: deleteError } = await supabase
            .from('beta_test_assignments')
            .delete()
            .eq('browser_id', user.id);

          if (deleteError) {
            console.error('🔍 [BetaTestingSheet] Error cleaning up old assignments:', deleteError);
          }
        }

        // Create default assignments for this user's role
        await createDefaultAssignments(user.id, userRole);

        // Reload assignments after creating them
        const { data: newAssignments, error: reloadError } = await supabase
          .from('beta_test_assignments')
          .select('*')
          .eq('browser_id', user.id)
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

        // Use the newly created assignments
        const itemsWithStatus =
          newAssignments?.map((assignment) => ({
            id: assignment.assignment_id,
            label: assignment.title,
            description: assignment.description,
            completed: assignment.is_completed || false,
            completedAt: assignment.completed_at,
            orderIndex: assignment.order_index,
            metadata: assignment.metadata,
            assignmentId: assignment.assignment_id,
          })) || [];

        console.log('🔍 [BetaTestingSheet] New assignments created:', itemsWithStatus);
        setChecklistItems(itemsWithStatus);
        return;
      }

      // Merge assignments with completion status
      const itemsWithStatus =
        assignments?.map((assignment) => ({
          id: assignment.assignment_id,
          label: assignment.title,
          description: assignment.description,
          completed: assignment.is_completed || false,
          completedAt: assignment.completed_at,
          orderIndex: assignment.order_index,
          metadata: assignment.metadata,
          assignmentId: assignment.assignment_id,
        })) || [];

      console.log('🔍 [BetaTestingSheet] Final checklist items:', itemsWithStatus);
      setChecklistItems(itemsWithStatus);
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
        setFeedbackForm(JSON.parse(savedFeedback));
      }

      // Load pricing form
      const pricingKey = getStorageKey('pricing');
      const savedPricing = await AsyncStorage.getItem(pricingKey);
      if (savedPricing) {
        setPricingForm(JSON.parse(savedPricing));
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
      await AsyncStorage.setItem(getStorageKey('pricing'), JSON.stringify(form));
    } catch (error) {
      console.error('Error saving pricing:', error);
    }
  };

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: screenHeight,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

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
        Alert.alert('Error', 'Failed to save progress. Please try again.');
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

  // Submit feedback
  const submitFeedback = async () => {
    if (!feedbackForm.name || !feedbackForm.feedback || feedbackForm.rating === 0) {
      Alert.alert('Missing Information', 'Please provide your name, rating, and feedback.');
      return;
    }

    try {
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
          metadata: {
            areas: feedbackForm.areas,
            submittedAt: Date.now(),
            userId: user?.id,
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
      };

      const existingFeedback = await AsyncStorage.getItem('beta_feedback_submissions');
      const submissions = existingFeedback ? JSON.parse(existingFeedback) : [];
      submissions.push(feedbackData);
      await AsyncStorage.setItem('beta_feedback_submissions', JSON.stringify(submissions));

      Alert.alert('Thank You!', 'Your feedback has been saved and will help us improve Vromm.');

      // Reset form
      setFeedbackForm({
        name: '',
        email: '',
        role: 'student',
        rating: 0,
        feedback: '',
        areas: [],
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert('Error', 'Could not save feedback. Please try again.');
    }
  };

  // Submit pricing feedback
  const submitPricing = async () => {
    if (!pricingForm.name || !pricingForm.suggestedPrice || !pricingForm.reasoning) {
      Alert.alert(
        'Missing Information',
        'Please provide your name, suggested price, and reasoning.',
      );
      return;
    }

    try {
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
        submittedAt: Date.now(),
        userId: user?.id,
        supabaseId: data.id,
      };

      const existingPricing = await AsyncStorage.getItem('beta_pricing_submissions');
      const submissions = existingPricing ? JSON.parse(existingPricing) : [];
      submissions.push(pricingData);
      await AsyncStorage.setItem('beta_pricing_submissions', JSON.stringify(submissions));

      Alert.alert(
        'Thank You!',
        'Your pricing feedback has been saved and will help us set the right price for Vromm.',
      );

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
    } catch (error) {
      console.error('Pricing feedback submission error:', error);
      Alert.alert('Error', 'Could not save pricing feedback. Please try again.');
    }
  };

  // Render tabs
  const renderTabs = () => {
    const tabs = [
      { key: 'checklist', label: 'Checklist', icon: 'check-square' },
      { key: 'feedback', label: 'Feedback', icon: 'message-square' },
      { key: 'pricing', label: 'Pricing', icon: 'dollar-sign' },
      { key: 'video', label: 'How It Works', icon: 'play-circle' },
    ];

    return (
      <XStack gap="$2" marginBottom="$4" flexWrap="wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            variant={activeTab === tab.key ? 'primary' : 'tertiary'}
            size="sm"
            flex={1}
            minWidth={80}
          >
            <XStack alignItems="center" gap="$1">
              <Feather name={tab.icon as any} size={14} />
              <Text size="xs">{tab.label}</Text>
            </XStack>
          </Button>
        ))}
      </XStack>
    );
  };

  // Render checklist tab
  const renderChecklistTab = () => (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700" color={textColor}>
        Testing Checklist
      </Text>
      <Text fontSize="$4" color={textColor} opacity={0.7}>
        Complete these tasks to help us test Vromm effectively:
      </Text>

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
                      {item.label}
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
                        {item.description}
                      </Text>
                    )}
                    {item.completed && item.completedAt && (
                      <Text fontSize="$2" color={primaryColor} opacity={0.8}>
                        Completed: {new Date(item.completedAt).toLocaleDateString()}
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
        <Input
          placeholder="Your name"
          value={feedbackForm.name}
          onChangeText={(text) => {
            const newForm = { ...feedbackForm, name: text };
            setFeedbackForm(newForm);
            saveFeedback(newForm);
          }}
        />

        <Input
          placeholder="Email (optional)"
          value={feedbackForm.email}
          onChangeText={(text) => {
            const newForm = { ...feedbackForm, email: text };
            setFeedbackForm(newForm);
            saveFeedback(newForm);
          }}
        />

        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="600" color={textColor}>
            Rate your experience (1-5 stars):
          </Text>
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

        <Input
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
        />

        <Button onPress={submitFeedback} backgroundColor={primaryColor}>
          <Text color="#FFFFFF" fontWeight="600">
            Submit Feedback
          </Text>
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
        <Input
          placeholder="Your name"
          value={pricingForm.name}
          onChangeText={(text) => {
            const newForm = { ...pricingForm, name: text };
            setPricingForm(newForm);
            savePricing(newForm);
          }}
        />

        <Input
          placeholder="Email (optional)"
          value={pricingForm.email}
          onChangeText={(text) => {
            const newForm = { ...pricingForm, email: text };
            setPricingForm(newForm);
            savePricing(newForm);
          }}
        />

        <Input
          placeholder="What do you currently pay for driving lessons? (e.g., 500 SEK/hour)"
          value={pricingForm.currentPrice}
          onChangeText={(text) => {
            const newForm = { ...pricingForm, currentPrice: text };
            setPricingForm(newForm);
            savePricing(newForm);
          }}
        />

        <Input
          placeholder="What would you be willing to pay for Vromm? (e.g., 99 SEK/month)"
          value={pricingForm.suggestedPrice}
          onChangeText={(text) => {
            const newForm = { ...pricingForm, suggestedPrice: text };
            setPricingForm(newForm);
            savePricing(newForm);
          }}
        />

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
        </YStack>

        <Input
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
        />

        <Button onPress={submitPricing} backgroundColor={primaryColor}>
          <Text color="#FFFFFF" fontWeight="600">
            Submit Pricing Feedback
          </Text>
        </Button>
      </YStack>
    </YStack>
  );

  // Render video tab
  const renderVideoTab = () => (
    <YStack gap="$4">
      <Text fontSize="$6" fontWeight="700" color={textColor}>
        Watch How It Works
      </Text>
      <Text fontSize="$4" color={textColor} opacity={0.7}>
        See Vromm in action and explore additional resources:
      </Text>

      {/* Video placeholder */}
      <Card padding="$6" backgroundColor={`${primaryColor}10`} alignItems="center">
        <Feather name="play-circle" size={48} color={primaryColor} />
        <Text fontSize="$5" fontWeight="600" color={textColor} marginTop="$3">
          Welcome Video
        </Text>
        <Text fontSize="$3" color={textColor} opacity={0.7} textAlign="center" marginTop="$2">
          Watch this personal message from our team about what makes Vromm special
        </Text>
      </Card>

      {/* Action buttons */}
      <YStack gap="$3">
        <Button
          onPress={() => {
            onOpenBetaWebView();
            onClose();
          }}
          backgroundColor={primaryColor}
          size="lg"
        >
          <XStack alignItems="center" gap="$2">
            <Feather name="globe" size={20} color="#FFFFFF" />
            <Text color="#FFFFFF" fontWeight="600">
              Visit Beta Website
            </Text>
          </XStack>
        </Button>

        <Button
          onPress={() => {
            onOpenBuyCoffee();
            onClose();
          }}
          backgroundColor="#FF6B6B"
          size="lg"
        >
          <XStack alignItems="center" gap="$2">
            <Feather name="coffee" size={20} color="#FFFFFF" />
            <Text color="#FFFFFF" fontWeight="600">
              Buy Me a Coffee
            </Text>
          </XStack>
        </Button>

        <Button
          onPress={() => {
            onShareApp();
            onClose();
          }}
          backgroundColor="#4ECDC4"
          size="lg"
        >
          <XStack alignItems="center" gap="$2">
            <Feather name="share-2" size={20} color="#FFFFFF" />
            <Text color="#FFFFFF" fontWeight="600">
              Share Vromm
            </Text>
          </XStack>
        </Button>

        <Button
          onPress={() => {
            onOpenAbout();
            onClose();
          }}
          variant="outlined"
          size="lg"
        >
          <XStack alignItems="center" gap="$2">
            <Feather name="info" size={20} color={textColor} />
            <Text color={textColor} fontWeight="600">
              About Vromm
            </Text>
          </XStack>
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

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            transform: [{ translateY }],
          },
        ]}
      >
        <YStack padding="$4" gap="$4" maxHeight={screenHeight * 0.9}>
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="700" color={textColor}>
                Beta Testing
              </Text>
              <Text fontSize="$3" color={textColor} opacity={0.7}>
                Help us perfect Vromm
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
            style={{ maxHeight: screenHeight * 0.6 }}
          >
            {renderTabContent()}
          </ScrollView>
        </YStack>
      </Animated.View>
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
    bottom: 0,
    left: 0,
    right: 0,
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
