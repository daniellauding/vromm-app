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
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, useTheme } from 'tamagui';
import { Button } from './../Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Database } from '../../lib/database.types';
import { ReportDialog } from '../report/ReportDialog';
import { parseRecordingStats, isRecordedRoute } from '../../utils/routeUtils';
import { RelationshipReviewSection } from '../RelationshipReviewSection';
import { RelationshipReviewService } from '../../services/relationshipReviewService';
import { IconButton } from '../IconButton';
import { useToast } from '../../contexts/ToastContext';
import VisibilityGuard from '../../utils/visibilityGuard';
import { RelationshipModal } from './RelationshipModal';

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
  is_trusted: boolean;
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
  const insets = useSafeAreaInsets();
  const { user, profile: currentUserProfile } = useAuth();
  const { t, language } = useTranslation();
  const { showToast } = useToast();

  // 🔧 Make navigation optional (for use in modals outside NavigationContainer)
  let navigation: NavigationProp | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigation = useNavigation<NavigationProp>();
  } catch {
    console.log('🔍 [UserProfileSheet] No navigation context available (modal mode)');
    navigation = null;
  }

  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const theme = useTheme();
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
  }, []);

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
  }, [onClose, snapPoints.dismissed, translateY]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
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
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // State (exact copy from PublicProfileScreen)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Follow/Unfollow system state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Instructor/Student relationship states
  const [isInstructor, setIsInstructor] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  // Pending invitation states
  const [hasPendingInvitation, setHasPendingInvitation] = useState(false);

  // Relationship reviews state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [relationshipReviews, setRelationshipReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState({
    averageRating: 0,
    reviewCount: 0,
    canReview: false,
    alreadyReviewed: false,
  });

  // Relationship request modal state
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((dr: any) => dr.route)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((route: any) => route !== null);

      // Combine all routes (avoid duplicates by checking route content)
      const allRoutesMap = new Map();

      // Add created routes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdRoutes.forEach((route: any) => {
        if (route.description) {
          allRoutesMap.set(route.description, route);
        }
      });

      // Add driven routes (may include duplicates if user created and drove same route)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      setLoading(false);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setLoading(false);
    }
  }, [userId]);

  const isCurrentUser = user?.id === profile?.id;

  // All the same functions from PublicProfileScreen (loadFollowData, checkRelationshipStatus, etc.)
  const loadFollowData = React.useCallback(async () => {
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
  }, [user?.id, userId]);

  const checkRelationshipStatus = React.useCallback(async () => {
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
    } catch {
      console.log('No existing relationship');
    }
  }, [user?.id, userId]);

  const checkPendingInvitations = React.useCallback(async () => {
    if (!user?.id || !userId || !profile?.email || !user.email) {
      return;
    }

    try {
      // Check if current user sent invitation to this profile
      const { data: sentInvitations } = await supabase
        .from('pending_invitations')
        .select('id, email, status, metadata, created_at')
        .eq('invited_by', user.id)
        .eq('email', profile.email.toLowerCase())
        .eq('status', 'pending');
      // Check if this profile sent invitation to current user
      const { data: receivedInvitations } = await supabase
        .from('pending_invitations')
        .select('id, email, status, metadata, created_at')
        .eq('invited_by', userId)
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending');

      if (sentInvitations && sentInvitations.length > 0) {
        setHasPendingInvitation(true);
      } else if (receivedInvitations && receivedInvitations.length > 0) {
        setHasPendingInvitation(true);
      } else {
        setHasPendingInvitation(false);
      }
    } catch (error) {
      console.error('🔍 [UserProfileSheet] Error checking pending invitations:', error);
    }
  }, [user?.id, userId, profile?.email, user?.email]);

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
  const handleFollow = React.useCallback(async () => {
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
  }, [
    user?.id,
    userId,
    followLoading,
    isFollowing,
    setFollowLoading,
    setFollowersCount,
    showToast,
  ]);

  const handleViewAllRoutes = () => {
    if (onViewAllRoutes && userId) {
      onViewAllRoutes(userId);
      onClose();
    }
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
  }, [visible, backdropOpacity, snapPoints.large, currentState, translateY]);

  // Refresh function
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
      if (userId && user?.id && userId !== user.id) {
        await Promise.all([loadFollowData(), checkRelationshipStatus(), checkPendingInvitations()]);
      }
      if (userId) {
        await Promise.all([loadRelationshipReviews(), loadUserRating()]);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadProfile,
    userId,
    user?.id,
    loadFollowData,
    checkRelationshipStatus,
    checkPendingInvitations,
    loadRelationshipReviews,
    loadUserRating,
  ]);

  // Load other data when profile loads
  useEffect(() => {
    if (visible && userId) {
      loadProfile();
      if (userId && user?.id && userId !== user.id) {
        loadFollowData();
        checkRelationshipStatus();
      }

      if (userId) {
        loadRelationshipReviews();
      }
    }
  }, [
    visible,
    userId,
    user?.id,
    loadFollowData,
    loadRelationshipReviews,
    loadProfile,
    checkRelationshipStatus,
  ]);

  useEffect(() => {
    if (userId && profile) {
      loadUserRating();
      checkPendingInvitations();
    }
  }, [userId, loadUserRating, checkPendingInvitations, profile]);

  const shouldShowRelationshipButton =
    (currentUserProfile?.role === 'student' && profile?.role === 'instructor') ||
    (currentUserProfile?.role === 'instructor' && profile?.role === 'student') ||
    isInstructor ||
    isStudent ||
    hasPendingInvitation;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 10000, // Higher z-index than UserListSheet
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

                        <XStack
                          alignItems="center"
                          gap="$1"
                          onLayout={() => {
                            console.log('🗺️ [UserProfileSheet] Location UI rendered:', {
                              userId: profile.id,
                              location: profile.location || 'NOT SET',
                              coordinates: {
                                lat: profile.location_lat || 'NOT SET',
                                lng: profile.location_lng || 'NOT SET',
                              },
                            });
                          }}
                        >
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
                            {shouldShowRelationshipButton && (
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
                                  if (isInstructor || isStudent) {
                                    showToast({
                                      title: 'Connected',
                                      message: isInstructor
                                        ? `${profile?.full_name || 'This user'} is your instructor`
                                        : `${profile?.full_name || 'This user'} is your student`,
                                      type: 'info',
                                    });
                                  } else {
                                    setShowRelationshipModal(true);
                                  }
                                }}
                                selected={isInstructor || isStudent || hasPendingInvitation}
                                backgroundColor="transparent"
                                borderColor="transparent"
                                flex={1}
                              />
                            )}

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
      {profile && showRelationshipModal ? (
        <RelationshipModal
          visible={showRelationshipModal}
          onClose={() => {
            setShowRelationshipModal(false);
            checkPendingInvitations();
          }}
          userId={userId}
          profile={profile}
        />
      ) : null}
    </Modal>
  );
});
