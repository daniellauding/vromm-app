import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  View,
  Dimensions,
  ScrollView,
  RefreshControl,
  Image,
  Share,
  TextInput,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Database } from '../lib/database.types';
import { ReportDialog } from './report/ReportDialog';
import { parseRecordingStats, isRecordedRoute } from '../utils/routeUtils';
import { messageService } from '../services/messageService';
import { RelationshipReviewSection } from './RelationshipReviewSection';
import { RelationshipReviewService } from '../services/relationshipReviewService';
import { IconButton } from './IconButton';
import { useToast } from '../contexts/ToastContext';
import VisibilityGuard from '../utils/visibilityGuard';

// 🖼️ Import invitation images (same as UnifiedInvitationModal)
// Note: These images should be imported as ES6 modules if available
const INVITATION_IMAGES = {
  supervisor: null, // require('../../assets/images/invitations/supervisor-invite.png'),
  student: null, // require('../../assets/images/invitations/student-invite.png'),
  collection: null, // require('../../assets/images/invitations/collection-invite.png'),
};

const { height } = Dimensions.get('window');

type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  routes_created: number;
  routes_driven: number;
  routes_saved: number;
  reviews_given: number;
  average_rating: number;
  total_distance_driven: number; // in km
  total_duration_driven: number; // in seconds
  recorded_routes_created: number; // routes created using recording
  email: string | null;
  school: {
    name: string;
    id: string;
  } | null;
  supervisor: {
    id: string;
    full_name: string;
  } | null;
};

interface UserProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  onViewAllRoutes?: (userId: string) => void;
  onEditProfile?: () => void;
}

export const UserProfileSheet = VisibilityGuard(function UserProfileSheet({
  visible,
  onClose,
  userId,
  onViewAllRoutes,
  onEditProfile,
}: UserProfileSheetProps) {
  console.log('🔍 [UserProfileSheet] Component rendered with visible:', visible, 'userId:', userId);
  const insets = useSafeAreaInsets();
  const { user, profile: currentUserProfile } = useAuth();
  const { t, language } = useTranslation();
  const { showToast } = useToast();

  // 🔧 Make navigation optional (for use in modals outside NavigationContainer)
  let navigation: NavigationProp | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigation = useNavigation<NavigationProp>();
  } catch (error) {
    console.log('🔍 [UserProfileSheet] No navigation context available (modal mode)');
    navigation = null;
  }

  const colorScheme = useColorScheme();
  const theme = useTheme();
  const iconColor = theme.color?.val || '#000000';

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Gesture handling for drag-to-dismiss and snap points (from RouteDetailSheet)
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);

  // Snap points for resizing (top Y coordinates like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.7, // Top at 70% of screen (show 30% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, [height]);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);

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

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;

        // Constrain to snap points range (large is smallest Y, allow dragging past mini for dismissal)
        const minPosition = snapPoints.large; // Smallest Y (show most - like expanded)
        const maxPosition = snapPoints.mini + 100; // Allow dragging past mini for dismissal
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        // Set translateY directly like RouteDetailSheet
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentState.value + translationY;

      // Only dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        // Fast upward swipe - go to larger size (smaller Y)
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        // Fast downward swipe - go to smaller size (larger Y)
        targetSnapPoint = snapPoints.mini;
      } else {
        // Find closest snap point
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      // Constrain target to valid range
      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.mini);

      // Animate to target position - set translateY directly like RouteDetailSheet
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

  // State (exact copy from PublicProfileScreen)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [learningPathSteps, setLearningPathSteps] = useState({
    total: 25,
    completed: 0,
    currentTitle: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  // Follow/Unfollow system state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Relationship data
  const [supervisors, setSupervisors] = useState<
    Array<{ supervisor_id: string; supervisor_name: string; supervisor_email: string }>
  >([]);
  const [schools, setSchools] = useState<
    Array<{ school_id: string; school_name: string; school_location: string }>
  >([]);

  // Instructor/Student relationship states
  const [isInstructor, setIsInstructor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(false);

  // Pending invitation states
  const [hasPendingInvitation, setHasPendingInvitation] = useState(false);
  const [pendingInvitationType, setPendingInvitationType] = useState<'sent' | 'received' | null>(
    null,
  );
  const [pendingInvitationData, setPendingInvitationData] = useState<any>(null);

  // Cancel pending invitation function
  const handleCancelPendingInvitation = async () => {
    if (!pendingInvitationData || !user?.id) return;

    try {
      console.log('🚫 [UserProfileSheet] Canceling pending invitation:', pendingInvitationData.id);

      // Remove pending invitation
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', pendingInvitationData.id);

      if (error) throw error;

      // Remove related notification
      await supabase
        .from('notifications')
        .delete()
        .eq('metadata->>invitation_id', pendingInvitationData.id);

      showToast({
        title: 'Invitation Canceled',
        message: `Connection request to ${profile?.full_name || 'this user'} has been canceled.`,
        type: 'success',
      });

      // Reset pending state
      setHasPendingInvitation(false);
      setPendingInvitationType(null);
      setPendingInvitationData(null);
      setShowRelationshipModal(false);
    } catch (error) {
      console.error('🚫 [UserProfileSheet] Error canceling invitation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to cancel invitation',
        type: 'error',
      });
    }
  };

  // Accept invitation function (copied from UnifiedInvitationModal)
  const handleAcceptInvitation = async () => {
    if (!pendingInvitationData || !user?.id) return;

    try {
      console.log('✅ [UserProfileSheet] Accepting invitation:', pendingInvitationData.id);

      // Use the same universal function as UnifiedInvitationModal
      const { data, error } = await supabase.rpc('accept_any_invitation_universal', {
        p_invitation_id: pendingInvitationData.id,
        p_accepted_by: user.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      showToast({
        title: 'Invitation Accepted!',
        message: `You are now connected with ${profile?.full_name || 'this user'}.`,
        type: 'success',
      });

      // Reset pending state and refresh relationship status
      setHasPendingInvitation(false);
      setPendingInvitationType(null);
      setPendingInvitationData(null);
      setShowRelationshipModal(false);

      // Refresh relationship status to update UI
      await checkRelationshipStatus();
      await checkPendingInvitations();
    } catch (error) {
      console.error('✅ [UserProfileSheet] Error accepting invitation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to accept invitation',
        type: 'error',
      });
    }
  };

  // Decline invitation function (copied from UnifiedInvitationModal)
  const handleDeclineInvitation = async () => {
    if (!pendingInvitationData || !user?.id) return;

    try {
      console.log('❌ [UserProfileSheet] Declining invitation:', pendingInvitationData.id);

      // Remove pending invitation (same as UnifiedInvitationModal)
      const { error: pendingError } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', pendingInvitationData.id);

      // Remove related notification
      await supabase
        .from('notifications')
        .delete()
        .eq('metadata->>invitation_id', pendingInvitationData.id);

      showToast({
        title: 'Invitation Declined',
        message: `Connection request from ${profile?.full_name || 'this user'} has been declined.`,
        type: 'success',
      });

      // Reset pending state
      setHasPendingInvitation(false);
      setPendingInvitationType(null);
      setPendingInvitationData(null);
      setShowRelationshipModal(false);
    } catch (error) {
      console.error('❌ [UserProfileSheet] Error declining invitation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to decline invitation',
        type: 'error',
      });
    }
  };

  // Relationship reviews state
  const [relationshipReviews, setRelationshipReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState({
    averageRating: 0,
    reviewCount: 0,
    canReview: false,
    alreadyReviewed: false,
  });

  // Relationship request modal state
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [relationshipCustomMessage, setRelationshipCustomMessage] = useState('');

  // Relationship modal snap points
  const relationshipSnapPoints = useMemo(() => {
    const points = {
      large: height * 0.2, // Top at 20% of screen (show 80% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.6, // Top at 60% of screen (show 40% - small)
      tiny: height * 0.8, // Top at 80% of screen (show 20% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, [height]);

  const relationshipTranslateY = useSharedValue(height);
  const [currentRelationshipSnapPoint, setCurrentRelationshipSnapPoint] = useState(
    relationshipSnapPoints.large,
  );
  const currentRelationshipState = useSharedValue(relationshipSnapPoints.large);

  // Relationship modal gesture handler
  const relationshipPanGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentRelationshipState.value + translationY;

        const minPosition = relationshipSnapPoints.large;
        const maxPosition = relationshipSnapPoints.tiny + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        relationshipTranslateY.value = boundedPosition;
      } catch (error) {
        console.log('relationshipPanGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentRelationshipState.value + translationY;

      if (currentPosition > relationshipSnapPoints.tiny + 30 && velocityY > 200) {
        runOnJS(() => setShowRelationshipModal(false))();
        return;
      }

      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = relationshipSnapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = relationshipSnapPoints.tiny;
      } else {
        const positions = [
          relationshipSnapPoints.large,
          relationshipSnapPoints.medium,
          relationshipSnapPoints.small,
          relationshipSnapPoints.tiny,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, relationshipSnapPoints.large),
        relationshipSnapPoints.tiny,
      );

      relationshipTranslateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentRelationshipState.value = boundedTarget;
      runOnJS(setCurrentRelationshipSnapPoint)(boundedTarget);
    });

  const relationshipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: relationshipTranslateY.value }],
  }));

  // Connection handling functions (copied from GettingStarted.tsx)
  const handleCreateConnection = async () => {
    if (!user?.id || !profile || !currentUserProfile) return;

    try {
      console.log('🔗 [UserProfileSheet] Creating connection with user:', profile.full_name);

      // Check if relationship already exists
      const { data: existingRelationship } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .or(
          `and(student_id.eq.${user.id},supervisor_id.eq.${userId}),and(student_id.eq.${userId},supervisor_id.eq.${user.id})`,
        )
        .single();

      if (existingRelationship) {
        showToast({
          title: 'Already Connected',
          message: 'Relationship already exists with this user',
          type: 'info',
        });
        return;
      }

      // Check if pending invitation already exists
      const { data: existingInvitation } = await supabase
        .from('pending_invitations')
        .select('id')
        .eq('invited_by', user.id)
        .eq('email', profile.email!.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        console.log(
          '🔗 [UserProfileSheet] Found existing invitation, setting pending state and showing modal',
        );

        // Update the pending invitation state immediately
        setHasPendingInvitation(true);
        setPendingInvitationType('sent');
        setPendingInvitationData(existingInvitation);

        showToast({
          title: 'Already Pending',
          message: 'Invitation already exists for this user - you can manage it in the modal',
          type: 'info',
        });

        // The modal will be shown by the IconButton onPress handler
        return;
      }

      // Determine relationship type and target role
      const relationshipType =
        profile.role === 'instructor' ? 'student_invites_supervisor' : 'supervisor_invites_student';
      const targetRole = profile.role === 'instructor' ? 'instructor' : 'student';

      // Create pending invitation (same as GettingStarted.tsx)
      const { data: invitationData, error: inviteError } = await supabase
        .from('pending_invitations')
        .insert({
          email: profile.email!.toLowerCase(),
          role: targetRole,
          invited_by: user.id,
          metadata: {
            supervisorName: currentUserProfile.full_name || user.email,
            inviterRole: currentUserProfile.role,
            relationshipType,
            invitedAt: new Date().toISOString(),
            targetUserId: userId,
            targetUserName: profile?.full_name || 'Unknown User',
            customMessage: relationshipCustomMessage.trim() || undefined,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (inviteError && inviteError.code !== '23505') {
        console.error('🔗 [UserProfileSheet] Error creating invitation:', inviteError);
        throw inviteError;
      }

      // Create notification (same as GettingStarted.tsx)
      const notificationType =
        profile.role === 'instructor' ? 'supervisor_invitation' : 'student_invitation';
      const baseMessage =
        profile.role === 'instructor'
          ? `${currentUserProfile.full_name || user.email} wants you to be their supervisor`
          : `${currentUserProfile.full_name || user.email} wants you to be their student`;

      const fullMessage = relationshipCustomMessage.trim()
        ? `${baseMessage}\n\nPersonal message: "${relationshipCustomMessage.trim()}"`
        : baseMessage;

      await supabase.from('notifications').insert({
        user_id: userId!,
        actor_id: user.id,
        type: notificationType as any,
        title: 'New Connection Request',
        message: fullMessage,
        metadata: {
          relationship_type: relationshipType,
          from_user_id: user.id,
          from_user_name: currentUserProfile.full_name || user.email,
          customMessage: relationshipCustomMessage.trim() || undefined,
          invitation_id: invitationData.id,
        },
        action_url: 'vromm://notifications',
        priority: 'high',
        is_read: false,
      });

      showToast({
        title: 'Request Sent!',
        message: `Connection request sent to ${profile?.full_name || 'the user'}. They will receive a notification.`,
        type: 'success',
      });

      // Update pending invitation status
      setHasPendingInvitation(true);
      setPendingInvitationType('sent');
      setPendingInvitationData(invitationData); // Set the invitation data
      setShowRelationshipModal(false);
      setRelationshipCustomMessage('');

      // Refresh pending invitations to ensure UI is up to date
      await checkPendingInvitations();
    } catch (error) {
      console.error('🔗 [UserProfileSheet] Error creating connection:', error);
      showToast({
        title: 'Error',
        message: 'Failed to send connection request',
        type: 'error',
      });
    }
  };

  // Load profile data (exact copy from PublicProfileScreen)
  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError('No user ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get profile data with counts - ensure proper field selection
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          id,
          license_plan_completed,
          license_plan_data,
          school:school_id(*)
        `,
        )
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');

      // Get counts and driving statistics
      const counts = await Promise.all([
        // Count routes created
        supabase.from('routes').select('id', { count: 'exact' }).eq('creator_id', userId),

        // Count routes driven
        supabase.from('driven_routes').select('id', { count: 'exact' }).eq('user_id', userId),

        // Count routes saved
        supabase.from('saved_routes').select('id', { count: 'exact' }).eq('user_id', userId),

        // Count reviews given
        supabase.from('route_reviews').select('id', { count: 'exact' }).eq('user_id', userId),

        // Average rating
        supabase.from('route_reviews').select('rating').eq('user_id', userId),

        // Recent routes created
        supabase
          .from('routes')
          .select('id, name, created_at, difficulty, spot_type')
          .eq('creator_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),

        // Recent reviews
        supabase
          .from('route_reviews')
          .select('id, rating, content, created_at, route:route_id(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),

        // Get all routes created by user for driving stats calculation
        supabase.from('routes').select('description, metadata').eq('creator_id', userId),

        // Get all routes driven by user (via driven_routes table)
        supabase
          .from('driven_routes')
          .select('route:route_id(description, metadata)')
          .eq('user_id', userId),
      ]);

      const reviewsWithRating = counts[4].data || [];
      const averageRating =
        reviewsWithRating.length > 0
          ? reviewsWithRating.reduce((sum: number, review: any) => sum + review.rating, 0) /
            reviewsWithRating.length
          : 0;

      // Calculate driving statistics from both created and driven routes
      const createdRoutes = counts[7].data || [];
      const drivenRoutesData = counts[8].data || [];

      // Extract actual route data from driven_routes (which has nested route data)
      const drivenRoutes = drivenRoutesData
        .map((dr: any) => dr.route)
        .filter((route: any) => route !== null);

      // Combine all routes (avoid duplicates by checking route content)
      const allRoutesMap = new Map();

      // Add created routes
      createdRoutes.forEach((route: any) => {
        if (route.description) {
          allRoutesMap.set(route.description, route);
        }
      });

      // Add driven routes (may include duplicates if user created and drove same route)
      drivenRoutes.forEach((route: any) => {
        if (route && route.description) {
          allRoutesMap.set(route.description, route);
        }
      });

      const allUniqueRoutes = Array.from(allRoutesMap.values());

      let totalDistanceDriven = 0; // in km
      let totalDurationDriven = 0; // in seconds
      let recordedRoutesCount = 0;

      allUniqueRoutes.forEach((route: any) => {
        // Check if this is a recorded route
        if (isRecordedRoute(route)) {
          recordedRoutesCount++;

          // Parse recording stats from description
          const recordingStats = parseRecordingStats(route.description || '');

          if (recordingStats) {
            // Parse distance (format: "X.XX km")
            const distanceMatch = recordingStats.distance.match(/([0-9.]+)/);
            if (distanceMatch) {
              const distance = parseFloat(distanceMatch[1]);
              totalDistanceDriven += distance;
            }

            // Parse duration (format: "HH:MM" or "MM:SS")
            const durationParts = recordingStats.drivingTime.split(':');
            if (durationParts.length === 2) {
              const minutes = parseInt(durationParts[0]);
              const seconds = parseInt(durationParts[1]);
              const duration = minutes * 60 + seconds;
              totalDurationDriven += duration;
            } else if (durationParts.length === 3) {
              const hours = parseInt(durationParts[0]);
              const minutes = parseInt(durationParts[1]);
              const seconds = parseInt(durationParts[2]);
              const duration = hours * 3600 + minutes * 60 + seconds;
              totalDurationDriven += duration;
            }
          }
        }
      });

      // Create complete profile object with driving stats
      const profileWithCounts = {
        ...data,
        routes_created: counts[0].count || 0,
        routes_driven: counts[1].count || 0,
        routes_saved: counts[2].count || 0,
        reviews_given: counts[3].count || 0,
        average_rating: averageRating,
        total_distance_driven: totalDistanceDriven,
        total_duration_driven: totalDurationDriven,
        recorded_routes_created: recordedRoutesCount,
      };

      setProfile(profileWithCounts);
      setRecentRoutes(counts[5].data || []);
      setRecentReviews(counts[6].data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setLoading(false);
    }
  }, [userId]);

  // Load other data when profile loads
  useEffect(() => {
    if (visible && userId) {
      loadProfile();
      if (userId && user?.id && userId !== user.id) {
        loadFollowData();
        checkRelationshipStatus();
        checkPendingInvitations();
      }
      if (userId) {
        loadUserRelationships();
        loadRelationshipReviews();
        loadUserRating();
      }
    }
    // Avoid dependency array issues by defining callback functions at module level
  }, [visible, userId, user?.id]);

  // Check if this is the current user's profile
  useEffect(() => {
    if (user && profile) {
      setIsCurrentUser(user.id === profile.id);
    }
  }, [user, profile]);

  // Fetch learning path data when profile loads
  useEffect(() => {
    if (profile?.id) {
      fetchLearningPathData();
    }
  }, [profile?.id]);

  // Function to fetch learning path data
  const fetchLearningPathData = async () => {
    try {
      // Fetch completed steps
      const { data: completedData } = await supabase
        .from('learning_path_exercise_completions')
        .select('exercise_id')
        .eq('user_id', userId);

      const completedCount = completedData?.length || 0;

      // Fetch the first learning path to get title
      const { data: pathData } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('active', true)
        .order('order_index', { ascending: true })
        .limit(1);

      const currentTitle = pathData?.[0]?.title?.en || '';

      setLearningPathSteps({
        total: 25, // Hardcoded total as specified
        completed: completedCount,
        currentTitle,
      });
    } catch (err) {
      console.error('Error fetching learning path data:', err);
    }
  };

  // All the same functions from PublicProfileScreen (loadFollowData, checkRelationshipStatus, etc.)
  const loadFollowData = async () => {
    try {
      if (!user?.id || !userId) return;

      // Check if current user is following this profile
      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!followData);

      // Get followers count for this profile
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId);

      // Get following count for this profile
      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId);

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  const checkRelationshipStatus = async () => {
    if (!user?.id || !userId) return;

    try {
      // Check if this profile is supervising the current user
      const { data: instructorData } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .eq('student_id', user.id)
        .eq('supervisor_id', userId)
        .single();

      setIsInstructor(!!instructorData);

      // Check if current user is supervising this profile
      const { data: studentData } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .eq('supervisor_id', user.id)
        .eq('student_id', userId)
        .single();

      setIsStudent(!!studentData);
    } catch (error) {
      console.log('No existing relationship');
    }
  };

  const checkPendingInvitations = async () => {
    if (!user?.id || !userId || !profile?.email || !user.email) {
      console.log('🔍 [UserProfileSheet] checkPendingInvitations - Missing required data:', {
        userId: !!user?.id,
        targetUserId: !!userId,
        profileEmail: !!profile?.email,
        userEmail: !!user.email,
      });
      return;
    }

    try {
      console.log(
        '🔍 [UserProfileSheet] Checking for pending invitations between:',
        user.email,
        'and',
        profile.email,
      );

      // Check if current user sent invitation to this profile
      const { data: sentInvitations, error: sentError } = await supabase
        .from('pending_invitations')
        .select('id, email, status, metadata, created_at')
        .eq('invited_by', user.id)
        .eq('email', profile.email.toLowerCase())
        .eq('status', 'pending');

      console.log('🔍 [UserProfileSheet] Sent invitations query:', {
        data: sentInvitations,
        error: sentError,
      });

      // Check if this profile sent invitation to current user
      const { data: receivedInvitations, error: receivedError } = await supabase
        .from('pending_invitations')
        .select('id, email, status, metadata, created_at')
        .eq('invited_by', userId)
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending');

      console.log('🔍 [UserProfileSheet] Received invitations query:', {
        data: receivedInvitations,
        error: receivedError,
      });

      if (sentInvitations && sentInvitations.length > 0) {
        console.log('🔍 [UserProfileSheet] Found SENT invitation:', sentInvitations[0]);
        setHasPendingInvitation(true);
        setPendingInvitationType('sent');
        setPendingInvitationData(sentInvitations[0]);
      } else if (receivedInvitations && receivedInvitations.length > 0) {
        console.log('🔍 [UserProfileSheet] Found RECEIVED invitation:', receivedInvitations[0]);
        setHasPendingInvitation(true);
        setPendingInvitationType('received');
        setPendingInvitationData(receivedInvitations[0]);
      } else {
        console.log('🔍 [UserProfileSheet] No pending invitations found');
        setHasPendingInvitation(false);
        setPendingInvitationType(null);
        setPendingInvitationData(null);
      }
    } catch (error) {
      console.error('🔍 [UserProfileSheet] Error checking pending invitations:', error);
    }
  };

  const loadUserRelationships = async () => {
    try {
      if (!userId) return;

      // Get supervisors using the RPC function
      const { data: supervisorsData, error: supervisorsError } = await supabase.rpc(
        'get_user_supervisor_details',
        { target_user_id: userId },
      );

      // Get schools using direct table query since the function doesn't exist
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('school_memberships')
        .select(
          `
          school_id,
          schools!inner(
            id,
            name,
            location
          )
        `,
        )
        .eq('user_id', userId);

      if (!supervisorsError) {
        setSupervisors(supervisorsData || []);
      }

      // Transform school data to match expected format
      const transformedSchools = schoolsError
        ? []
        : schoolsData?.map((membership) => ({
            school_id: membership.school_id,
            school_name: membership.schools.name,
            school_location: membership.schools.location,
          })) || [];

      if (!schoolsError) {
        setSchools(transformedSchools);
      }
    } catch (error) {
      console.error('Error loading user relationships:', error);
    }
  };

  // Load relationship reviews
  const loadRelationshipReviews = useCallback(async () => {
    if (!userId) return;

    try {
      const reviews = await RelationshipReviewService.getReviewsForUser(userId);
      setRelationshipReviews(reviews);
    } catch (error) {
      console.error('Error loading relationship reviews:', error);
    }
  }, [userId]);

  // Load user rating data
  const loadUserRating = useCallback(async () => {
    if (!userId || !profile?.role) return;

    try {
      const rating = await RelationshipReviewService.getUserRating(userId, profile.role);
      setUserRating(rating);
    } catch (error) {
      console.error('Error loading user rating:', error);
    }
  }, [userId, profile?.role]);

  // Handle functions (exact copy from PublicProfileScreen)
  const handleFollow = async () => {
    try {
      if (!user?.id || !userId || followLoading) return;

      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
      } else {
        // Follow
        const { error } = await supabase.from('user_follows').insert([
          {
            follower_id: user.id,
            following_id: userId,
          },
        ]);

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      showToast({
        title: 'Error',
        message: 'Failed to update follow status. Please try again.',
        type: 'error',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile || !user?.id || profile.id === user.id) return;

    // 🔧 Check if navigation is available
    if (!navigation) {
      showToast({
        title: 'Navigation not available',
        message: 'Please open this profile from the main app to send messages.',
        type: 'error',
      });
      return;
    }

    try {
      // Check if conversation already exists
      const conversations = await messageService.getConversations();
      const existingConversation = conversations.find(
        (conv) => !conv.is_group && conv.participants?.some((p) => p.user_id === profile.id),
      );

      if (existingConversation) {
        // Navigate to existing conversation
        navigation.navigate('Conversation', { conversationId: existingConversation.id });
      } else {
        // Create new conversation
        const conversation = await messageService.createConversation([profile.id]);
        navigation.navigate('Conversation', { conversationId: conversation.id });
      }

      // Close sheet after navigation
      onClose();
    } catch (error) {
      console.error('Error starting conversation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to start conversation. Please try again.',
        type: 'error',
      });
    }
  };

  const handleShare = async () => {
    if (!profile) return;

    const baseUrl = 'https://routes.vromm.se';
    const shareUrl = `${baseUrl}/?publicProfile=${profile.id}`;

    try {
      await Share.share({
        message: `Check out ${profile.full_name}'s profile on Vromm`,
        url: shareUrl, // iOS only
        title: profile.full_name || 'User Profile',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      showToast({
        title: 'Error',
        message: 'Failed to share profile',
        type: 'error',
      });
    }
  };

  const handleViewAllRoutes = () => {
    if (onViewAllRoutes && userId) {
      onViewAllRoutes(userId);
      onClose();
    }
  };

  // Helper function to format driving time
  const formatDrivingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Animation effects
  useEffect(() => {
    if (visible) {
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
  }, [visible, backdropOpacity, snapPoints.large, currentState]);

  // Animation effects for relationship modal
  useEffect(() => {
    console.log('🎯 [UserProfileSheet] showRelationshipModal changed to:', showRelationshipModal);
    if (showRelationshipModal) {
      console.log('🎯 [UserProfileSheet] Animating relationship modal to large position');
      relationshipTranslateY.value = withSpring(relationshipSnapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentRelationshipState.value = relationshipSnapPoints.large;
      setCurrentRelationshipSnapPoint(relationshipSnapPoints.large);
    }
  }, [showRelationshipModal, relationshipSnapPoints.large, currentRelationshipState]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfile();
      if (userId && user?.id && userId !== user.id) {
        await Promise.all([loadFollowData(), checkRelationshipStatus(), checkPendingInvitations()]);
      }
      if (userId) {
        await Promise.all([loadUserRelationships(), loadRelationshipReviews(), loadUserRating()]);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'transparent',
        }}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: height, // Keep original height
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                animatedGestureStyle,
              ]}
            >
              <YStack padding="$4" paddingBottom={insets.bottom || 20} gap="$4" flex={1}>
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
                      backgroundColor: theme.gray8?.val || '#CCC',
                    }}
                  />
                </View>

                {/* Header */}
                {/* <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontWeight="bold" color="$color">
                  {profile?.full_name || t('profile.user') || 'User'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </XStack> */}

                {loading ? (
                  <YStack f={1} jc="center" ai="center">
                    <Text>{t('profile.loading') || 'Loading profile data...'}</Text>
                  </YStack>
                ) : error || !profile ? (
                  <YStack f={1} jc="center" ai="center" padding="$4">
                    <Text color="$red10">
                      {error || t('profile.notFound') || 'Profile not found'}
                    </Text>
                    <Button onPress={onClose} marginTop="$4" variant="primary" size="$4">
                      <Feather
                        name="arrow-left"
                        size={18}
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      {t('common.goBack') || 'Go Back'}
                    </Button>
                  </YStack>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#00E6C3"
                        colors={['#00E6C3']}
                        progressBackgroundColor="#1a1a1a"
                      />
                    }
                  >
                    <YStack gap="$4">
                      {/* Profile header with avatar */}
                      <YStack alignItems="center" gap="$2">
                        {profile.avatar_url ? (
                          <Image
                            source={{ uri: profile.avatar_url }}
                            style={{ width: 100, height: 100, borderRadius: 50 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 100,
                              height: 100,
                              borderRadius: 50,
                              backgroundColor: '#444',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Feather name="user" size={50} color="#ddd" />
                          </View>
                        )}

                        <Text fontSize="$5" fontWeight="bold">
                          {profile.full_name || t('profile.unnamed')}
                        </Text>

                        {profile.is_trusted && (
                          <Card padding="$1" backgroundColor="$green5" borderRadius="$3">
                            <Text color="$green11" fontSize="$2">
                              {t('profile.verifiedBadge') || 'Verified'}
                            </Text>
                          </Card>
                        )}

                        {!profile.is_trusted && (
                          <Card padding="$1" backgroundColor="$red5" borderRadius="$3">
                            <Text color="$red11" fontSize="$2">
                              {t('profile.notVerifiedBadge') || 'Not verified yet'}
                            </Text>
                          </Card>
                        )}

                        <XStack alignItems="center" gap="$1">
                          <Feather name="map-pin" size={16} color={iconColor} />
                          <Text>
                            {profile.location ||
                              (language === 'sv' ? 'Inte specificerad' : 'Not specified')}
                          </Text>
                        </XStack>

                        {profile.role && (
                          <Card padding="$2" backgroundColor="$blue5" borderRadius="$4">
                            <Text color="$blue11" fontWeight="500">
                              {profile.role === 'student'
                                ? t('profile.roles.student') || 'Student'
                                : profile.role === 'instructor'
                                  ? t('profile.roles.instructor') || 'Instructor'
                                  : t('profile.roles.school') || 'School'}
                            </Text>
                          </Card>
                        )}

                        {/* Action buttons for non-current users */}
                        {!isCurrentUser && (
                          <XStack gap="$2" flexWrap="wrap" justifyContent="center" marginTop="$2">
                            {/* Follow/Unfollow Button */}
                            {/* <Button
                            onPress={handleFollow}
                            disabled={followLoading}
                            variant={isFollowing ? 'secondary' : 'primary'}
                            backgroundColor={isFollowing ? '$red5' : '$blue10'}
                            size="sm"
                          >
                            <XStack gap="$1" alignItems="center">
                              {followLoading ? (
                                <Text color={isFollowing ? '$red11' : 'white'} fontSize="$3">
                                  {t('profile.loading') || '...'}
                                </Text>
                              ) : (
                                <>
                                  <Feather
                                    name={isFollowing ? 'user-minus' : 'user-plus'}
                                    size={14}
                                    color={isFollowing ? '#EF4444' : 'white'}
                                  />
                                  <Text
                                    color={isFollowing ? '$red11' : 'white'}
                                    fontSize="$2"
                                    fontWeight="500"
                                  >
                                    {isFollowing
                                      ? t('profile.unfollow') || 'Unfollow'
                                      : t('profile.follow') || 'Follow'}
                                  </Text>
                                </>
                              )}
                            </XStack>
                            </Button> */}

                            <IconButton
                              icon={isFollowing ? 'user-minus' : 'user-plus'}
                              label={
                                isFollowing
                                  ? t('profile.unfollow') || 'Unfollow'
                                  : t('profile.follow') || 'Follow'
                              }
                              onPress={handleFollow}
                              disabled={followLoading}
                              selected={isFollowing}
                              backgroundColor="transparent"
                              borderColor="transparent"
                              flex={1}
                            />

                            {/* Relationship Button - Only show for opposite user types */}
                            {((currentUserProfile?.role === 'student' &&
                              profile?.role === 'instructor') ||
                              (currentUserProfile?.role === 'instructor' &&
                                profile?.role === 'student') ||
                              isInstructor ||
                              isStudent ||
                              hasPendingInvitation) && (
                              <IconButton
                                icon={
                                  isInstructor || isStudent
                                    ? 'users'
                                    : hasPendingInvitation
                                      ? 'clock'
                                      : 'user-check'
                                }
                                label={
                                  isInstructor
                                    ? t('profile.yourInstructor') || 'Your Instructor'
                                    : isStudent
                                      ? t('profile.yourStudent') || 'Your Student'
                                      : hasPendingInvitation
                                        ? t('profile.pending') || 'Pending'
                                        : profile?.role === 'instructor'
                                          ? t('profile.requestSupervision') || 'Request Supervision'
                                          : profile?.role === 'student'
                                            ? t('profile.superviseStudent') || 'Supervise Student'
                                            : t('profile.connect') || 'Connect'
                                }
                                onPress={async () => {
                                  if (!profile || !user?.id) return;

                                  console.log(
                                    '🎯 [UserProfileSheet] IconButton pressed for relationship',
                                  );
                                  console.log('🎯 [UserProfileSheet] Current state:', {
                                    isInstructor,
                                    isStudent,
                                    hasPendingInvitation,
                                    pendingInvitationType,
                                  });

                                  if (isInstructor || isStudent) {
                                    // Show existing relationship toast
                                    console.log(
                                      '🎯 [UserProfileSheet] Showing existing relationship toast',
                                    );
                                    showToast({
                                      title: 'Connected',
                                      message: isInstructor
                                        ? `${profile?.full_name || 'This user'} is your instructor`
                                        : `${profile?.full_name || 'This user'} is your student`,
                                      type: 'info',
                                    });
                                  } else {
                                    // First refresh the pending invitation state, then show modal
                                    console.log('🎯 [UserProfileSheet] Opening relationship modal');
                                    console.log(
                                      '🎯 [UserProfileSheet] Checking for pending invitations...',
                                    );

                                    // Force refresh of pending invitation state
                                    await checkPendingInvitations();

                                    // Small delay to allow state to update in React
                                    setTimeout(() => {
                                      console.log(
                                        '🎯 [UserProfileSheet] Opening modal with refreshed state',
                                      );
                                      setShowRelationshipModal(true);
                                      relationshipTranslateY.value = withSpring(
                                        relationshipSnapPoints.large,
                                        {
                                          damping: 20,
                                          mass: 1,
                                          stiffness: 100,
                                          overshootClamping: true,
                                          restDisplacementThreshold: 0.01,
                                          restSpeedThreshold: 0.01,
                                        },
                                      );
                                      currentRelationshipState.value = relationshipSnapPoints.large;
                                      setCurrentRelationshipSnapPoint(relationshipSnapPoints.large);
                                    }, 150);
                                  }
                                }}
                                selected={isInstructor || isStudent || hasPendingInvitation}
                                backgroundColor="transparent"
                                borderColor="transparent"
                                flex={1}
                              />
                            )}

                            {/* Message Button */}
                            {/* <Button
                            onPress={handleMessage}
                            variant="primary"
                            backgroundColor="$green10"
                            size="sm"
                          >
                            <Feather
                              name="message-circle"
                              size={14}
                              color="white"
                              style={{ marginRight: 6 }}
                            />
                            <Text color="white" fontSize="$2" fontWeight="500">
                              {t('profile.message') || 'Message'}
                            </Text>
                            </Button> */}

                            {/* Share Button */}
                            {/* <Button onPress={handleShare} variant="secondary" size="sm" /> */}

                            {/* Report Button */}

                            <IconButton
                              icon="flag"
                              label={t('profile.report') || 'Report Profile'}
                              onPress={() => setShowReportDialog(true)}
                              backgroundColor="transparent"
                              borderColor="transparent"
                              flex={1}
                            />
                          </XStack>
                        )}

                        {/* Action buttons for current user */}
                        {isCurrentUser && (
                          <XStack gap="$2" flexWrap="wrap" justifyContent="center" marginTop="$2">
                            {/* Edit Profile Button */}
                            {/* <Button
                            onPress={() => {
                              onClose();
                              if (onEditProfile) {
                                onEditProfile();
                              }
                            }}
                            icon={<Feather name="edit" size={14} color="white" />}
                            variant="primary"
                            backgroundColor="$blue10"
                            size="sm"
                          >
                            <Text color="white" fontSize="$2" fontWeight="500">
                              {t('profile.edit') || 'Edit Profile'}
                            </Text>
                            </Button> */}

                            <IconButton
                              icon="edit"
                              label={t('profile.edit') || 'Edit Profile'}
                              onPress={() => {
                                onClose();
                                if (onEditProfile) {
                                  onEditProfile();
                                }
                              }}
                              backgroundColor="transparent"
                              borderColor="transparent"
                              flex={1}
                            />

                            {/* Share Button */}
                            {/* <Button onPress={handleShare} variant="secondary" size="sm" /> */}
                          </XStack>
                        )}
                      </YStack>

                      {/* Stats Grid - 2x3 layout with driving stats */}
                      <Card padding="$4" bordered>
                        <YStack gap="$4">
                          {/* First row */}
                          <XStack justifyContent="space-between">
                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold">
                                {profile.routes_created}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.routesCreated') || 'Routes Created'}
                              </Text>
                            </YStack>

                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold">
                                {profile.routes_driven}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.routesDriven') || 'Routes Driven'}
                              </Text>
                            </YStack>

                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold">
                                {profile.routes_saved}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.routesSaved') || 'Routes Saved'}
                              </Text>
                            </YStack>
                          </XStack>

                          {/* Second row */}
                          <XStack justifyContent="space-around">
                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold">
                                {profile.reviews_given}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.reviewsGiven') || 'Reviews Given'}
                              </Text>
                            </YStack>

                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold">
                                {profile.average_rating.toFixed(1)}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.avgRating') || 'Avg Rating'}
                              </Text>
                            </YStack>

                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold" color="$green10">
                                {profile.total_distance_driven.toFixed(1)}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.kmDriven') || 'km Driven'}
                              </Text>
                            </YStack>
                          </XStack>

                          {/* Third row - Follow Stats */}
                          <XStack justifyContent="space-around">
                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold" color="$blue10">
                                {followersCount}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.followers') || 'Followers'}
                              </Text>
                            </YStack>

                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold" color="$blue10">
                                {followingCount}
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center">
                                {t('profile.following') || 'Following'}
                              </Text>
                            </YStack>

                            {/* Empty space for alignment */}
                            <YStack alignItems="center" flex={1}>
                              <Text fontSize="$6" fontWeight="bold" opacity={0}>
                                -
                              </Text>
                              <Text fontSize="$3" color="$gray11" textAlign="center" opacity={0}>
                                -
                              </Text>
                            </YStack>
                          </XStack>
                        </YStack>
                      </Card>

                      {/* Recent routes */}
                      {recentRoutes.length > 0 && (
                        <Card padding="$4" bordered>
                          <YStack gap="$3">
                            <XStack justifyContent="space-between" alignItems="center">
                              <Text fontSize="$5" fontWeight="bold">
                                {t('profile.recentRoutes') || 'Recent Routes'}
                              </Text>

                              <Button size="sm" variant="outlined" onPress={handleViewAllRoutes}>
                                {t('profile.viewAll') || 'View All'}
                              </Button>
                            </XStack>

                            {recentRoutes.map((route) => (
                              <Card
                                key={route.id}
                                padding="$3"
                                bordered
                                pressStyle={{ scale: 0.98 }}
                                onPress={() => {
                                  if (navigation) {
                                    navigation.navigate('RouteDetail', { routeId: route.id });
                                    onClose();
                                  } else {
                                    showToast({
                                      title: 'Navigation not available',
                                      message: 'Please open this route from the main app',
                                      type: 'info',
                                    });
                                  }
                                }}
                              >
                                <YStack gap="$1">
                                  <Text fontSize="$4" fontWeight="500">
                                    {route.name}
                                  </Text>

                                  <XStack gap="$3">
                                    <XStack alignItems="center" gap="$1">
                                      <Feather name="bar-chart" size={14} color={iconColor} />
                                      <Text fontSize="$3">{route.difficulty}</Text>
                                    </XStack>

                                    <XStack alignItems="center" gap="$1">
                                      <Feather name="map-pin" size={14} color={iconColor} />
                                      <Text fontSize="$3">{route.spot_type}</Text>
                                    </XStack>
                                  </XStack>
                                </YStack>
                              </Card>
                            ))}
                          </YStack>
                        </Card>
                      )}

                      {/* Relationship Reviews Section */}
                      {profile && !isCurrentUser && (
                        <RelationshipReviewSection
                          profileUserId={profile.id}
                          profileUserRole={profile.role as any}
                          profileUserName={profile.full_name || profile.email || 'Unknown User'}
                          canReview={userRating.canReview}
                          reviews={relationshipReviews}
                          onReviewAdded={loadRelationshipReviews}
                        />
                      )}
                    </YStack>
                  </ScrollView>
                )}

                {/* Report dialog */}
                {showReportDialog && userId && (
                  <ReportDialog
                    reportableId={userId}
                    reportableType="user"
                    onClose={() => setShowReportDialog(false)}
                  />
                )}
              </YStack>
            </ReanimatedAnimated.View>
          </GestureDetector>
        </View>
      </Animated.View>

      {/* Relationship Request Modal - styled like CollectionSharingModal */}
      {(() => {
        console.log('🎯 [UserProfileSheet] Relationship modal render check:', {
          profile: !!profile,
          showRelationshipModal,
          hasPendingInvitation,
          pendingInvitationType,
          pendingInvitationData: !!pendingInvitationData,
          profileRole: profile?.role,
          currentUserRole: currentUserProfile?.role,
          profileEmail: profile?.email,
          profileName: profile?.full_name,
        });
        return profile && showRelationshipModal;
      })() && (
        <Modal
          key={`relationship-modal-${hasPendingInvitation}-${pendingInvitationType}-${Date.now()}`}
          visible={showRelationshipModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            console.log('🎯 [UserProfileSheet] Modal onRequestClose called');
            setShowRelationshipModal(false);
          }}
          statusBarTranslucent
          presentationStyle="overFullScreen"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'flex-end',
              zIndex: 999999,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setShowRelationshipModal(false)} />
            <GestureDetector gesture={relationshipPanGesture}>
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
                  relationshipAnimatedStyle,
                ]}
              >
                <YStack padding="$3" paddingBottom={24} gap="$3" flex={1}>
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
                        backgroundColor: theme.gray8?.val || '#CCC',
                      }}
                    />
                  </View>

                  {/* Header with image */}
                  <YStack alignItems="center" gap="$3" paddingHorizontal="$2">
                    {/* Role-specific image - using same images as UnifiedInvitationModal */}
                    <View
                      style={{
                        width: '100%',
                        height: 200,
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {INVITATION_IMAGES &&
                      INVITATION_IMAGES.supervisor &&
                      INVITATION_IMAGES.student ? (
                        <Image
                          source={
                            hasPendingInvitation
                              ? profile?.role === 'instructor'
                                ? INVITATION_IMAGES.supervisor
                                : INVITATION_IMAGES.student
                              : profile?.role === 'instructor'
                                ? INVITATION_IMAGES.supervisor
                                : INVITATION_IMAGES.student
                          }
                          style={{
                            width: '100%',
                            height: '100%',
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        // Fallback colored background if images not available
                        <View
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: hasPendingInvitation
                              ? '#F59E0B' // Orange for pending
                              : profile?.role === 'instructor'
                                ? '#4F46E5' // Purple for instructor
                                : '#059669', // Green for student
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Feather
                            name={
                              hasPendingInvitation
                                ? 'clock'
                                : profile?.role === 'instructor'
                                  ? 'user-check'
                                  : 'users'
                            }
                            size={40}
                            color="white"
                          />
                        </View>
                      )}
                    </View>

                    <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                      {(() => {
                        console.log('🎯 [UserProfileSheet] Modal title render - state check:', {
                          hasPendingInvitation,
                          pendingInvitationType,
                          profileRole: profile?.role,
                        });
                        return hasPendingInvitation
                          ? 'Pending Connection'
                          : profile?.role === 'instructor'
                            ? 'Request Supervision'
                            : 'Invite as Student';
                      })()}
                    </Text>

                    <Text fontSize="$3" color="$gray11" textAlign="center">
                      {hasPendingInvitation
                        ? `Manage your ${pendingInvitationType === 'sent' ? 'sent' : 'received'} connection request`
                        : profile?.role === 'instructor'
                          ? `Ask ${profile?.full_name || 'this user'} to be your driving instructor`
                          : `Invite ${profile?.full_name || 'this user'} to supervise their driving progress`}
                    </Text>
                  </YStack>

                  {/* Show content only if not in tiny mode */}
                  {currentRelationshipSnapPoint !== relationshipSnapPoints.tiny && (
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                      showsVerticalScrollIndicator={false}
                    >
                      <YStack gap="$4">
                        {/* User info card */}
                        <YStack
                          gap="$2"
                          padding="$3"
                          backgroundColor="$backgroundHover"
                          borderRadius="$3"
                        >
                          <XStack alignItems="center" gap="$2">
                            <Feather
                              name="user"
                              size={16}
                              color={profile?.role === 'instructor' ? '#4F46E5' : '#059669'}
                            />
                            <Text fontSize="$4" fontWeight="600" color="$color">
                              {profile?.full_name || 'Unknown User'}
                            </Text>
                          </XStack>
                          <Text fontSize="$3" color="$gray11">
                            {profile?.email || 'No email'} •{' '}
                            {profile?.role === 'instructor' ? 'Instructor' : 'Student'}
                          </Text>
                          {profile?.location && (
                            <Text fontSize="$3" color="$gray11">
                              📍 {profile.location}
                            </Text>
                          )}
                        </YStack>

                        {/* Pending Invitation Status */}
                        {(() => {
                          console.log('🎯 [UserProfileSheet] Pending invitation section render:', {
                            hasPendingInvitation,
                            pendingInvitationType,
                            pendingInvitationData: !!pendingInvitationData,
                          });
                          return hasPendingInvitation;
                        })() && (
                          <YStack
                            gap="$2"
                            padding="$3"
                            backgroundColor={
                              pendingInvitationType === 'sent' ? '$orange5' : '$blue5'
                            }
                            borderRadius="$3"
                          >
                            <XStack alignItems="center" gap="$2">
                              <Feather
                                name="clock"
                                size={16}
                                color={pendingInvitationType === 'sent' ? '#F59E0B' : '#3B82F6'}
                              />
                              <Text fontSize="$4" fontWeight="600" color="$color">
                                {pendingInvitationType === 'sent'
                                  ? 'Invitation Sent'
                                  : 'Invitation Received'}
                              </Text>
                            </XStack>
                            <Text fontSize="$3" color="$gray11">
                              {pendingInvitationType === 'sent'
                                ? `You have sent a connection request to ${profile?.full_name || 'this user'}`
                                : `${profile?.full_name || 'This user'} has sent you a connection request`}
                            </Text>
                            {pendingInvitationType === 'sent' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onPress={async () => {
                                  try {
                                    // Cancel pending invitation
                                    const { error } = await supabase
                                      .from('pending_invitations')
                                      .delete()
                                      .eq('invited_by', user?.id)
                                      .eq('email', profile?.email?.toLowerCase())
                                      .eq('status', 'pending');

                                    if (error) throw error;

                                    showToast({
                                      title: 'Cancelled',
                                      message: 'Connection request has been cancelled',
                                      type: 'success',
                                    });
                                    setHasPendingInvitation(false);
                                    setPendingInvitationType(null);
                                    setPendingInvitationData(null);
                                    setShowRelationshipModal(false);
                                  } catch (error) {
                                    console.error('Error cancelling invitation:', error);
                                    showToast({
                                      title: 'Error',
                                      message: 'Failed to cancel invitation',
                                      type: 'error',
                                    });
                                  }
                                }}
                                backgroundColor="$red5"
                              >
                                <XStack gap="$2" alignItems="center">
                                  <Feather name="x" size={14} color="#EF4444" />
                                  <Text color="#EF4444" fontWeight="500">
                                    Cancel Request
                                  </Text>
                                </XStack>
                              </Button>
                            )}
                          </YStack>
                        )}

                        {/* Custom Message - only show if not pending */}
                        {!hasPendingInvitation && (
                          <YStack gap="$2">
                            <Text fontSize="$4" color="$color" fontWeight="500">
                              Personal Message (Optional):
                            </Text>
                            <TextInput
                              value={relationshipCustomMessage}
                              onChangeText={setRelationshipCustomMessage}
                              placeholder={
                                profile?.role === 'instructor'
                                  ? 'Tell them why you want them as your instructor...'
                                  : 'Tell them why you want to supervise them...'
                              }
                              multiline
                              style={{
                                backgroundColor: theme.background?.val || '#fff',
                                color: theme.color?.val || '#11181C',
                                borderColor: theme.borderColor?.val || 'rgba(0, 0, 0, 0.1)',
                                borderWidth: 1,
                                borderRadius: 8,
                                padding: 12,
                                minHeight: 80,
                                textAlignVertical: 'top',
                              }}
                              placeholderTextColor={theme.gray10?.val || 'rgba(0, 0, 0, 0.3)'}
                            />
                          </YStack>
                        )}

                        {/* Action Buttons */}
                        <YStack gap="$2">
                          {(() => {
                            console.log('🎯 [UserProfileSheet] Action buttons render check:', {
                              hasPendingInvitation,
                              pendingInvitationType,
                              willShowSendButton: !hasPendingInvitation,
                              willShowCancelButton:
                                hasPendingInvitation && pendingInvitationType === 'sent',
                              willShowAcceptDeclineButtons:
                                hasPendingInvitation && pendingInvitationType === 'received',
                            });
                            return !hasPendingInvitation;
                          })() ? (
                            <Button
                              onPress={handleCreateConnection}
                              backgroundColor={
                                profile?.role === 'instructor' ? '$blue10' : '$green10'
                              }
                            >
                              <XStack gap="$2" alignItems="center">
                                <Feather name="send" size={16} color="white" />
                                <Text color="white" fontWeight="600">
                                  {profile?.role === 'instructor'
                                    ? 'Send Supervision Request'
                                    : 'Send Student Invitation'}
                                </Text>
                              </XStack>
                            </Button>
                          ) : pendingInvitationType === 'sent' ? (
                            <Button onPress={handleCancelPendingInvitation} backgroundColor="$red5">
                              <XStack gap="$2" alignItems="center">
                                <Feather name="x" size={16} color="#EF4444" />
                                <Text color="#EF4444" fontWeight="600">
                                  Cancel Request
                                </Text>
                              </XStack>
                            </Button>
                          ) : (
                            // Received invitation - show accept/decline buttons (UnifiedInvitationModal style)
                            <XStack gap="$3" justifyContent="space-around">
                              <Button
                                flex={1}
                                onPress={handleDeclineInvitation}
                                backgroundColor="$gray5"
                              >
                                <Text color="$color" fontWeight="600">
                                  Decline
                                </Text>
                              </Button>
                              <Button
                                flex={1}
                                onPress={handleAcceptInvitation}
                                backgroundColor="$green10"
                              >
                                <Text color="white" fontWeight="600">
                                  Accept
                                </Text>
                              </Button>
                            </XStack>
                          )}
                          <Button
                            onPress={() => {
                              setShowRelationshipModal(false);
                              setRelationshipCustomMessage('');
                            }}
                            backgroundColor="$gray5"
                          >
                            <Text color="$color">Close</Text>
                          </Button>
                        </YStack>
                      </YStack>
                    </ScrollView>
                  )}
                </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Modal>
      )}
    </Modal>
  );
});
