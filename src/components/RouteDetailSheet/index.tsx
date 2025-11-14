import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Progress, useTheme } from 'tamagui';
import { Button } from '../../components/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Database } from '../../lib/database.types';
import { ReviewSection } from './../ReviewSection';
import { CommentsSection } from './../CommentsSection';
import { AppAnalytics } from '../../utils/analytics';
import {
  parseRecordingStats,
  isRecordedRoute,
  formatRecordingStatsDisplay,
} from '../../utils/routeUtils';
import { RouteExerciseList } from './../RouteExerciseList';
import { useToast } from '../../contexts/ToastContext';
import { UserProfileSheet } from './../UserProfileSheet';

import { getCarouselItems } from './utils';
import RouteDetailsCarousel from './RouteDetailsCarousel';
import RouteActions from './RouteActions';
import RouteDetailsMeta from './RouteDetailsMeta';

const { height, width } = Dimensions.get('window');

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type RouteRow = Database['public']['Tables']['routes']['Row'];
type Json = Database['public']['Tables']['routes']['Row']['waypoint_details'];

type Review = {
  id: string;
  user_id: string;
  rating: number;
  content: string;
  difficulty: DifficultyLevel;
  visited_at: string;
  images: { url: string }[];
  user?: {
    full_name: string;
  };
};

interface WaypointDetail {
  lat: number;
  lng: number;
  title: string;
  description?: string;
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  has_quiz?: boolean;
  quiz_data?: any;
}

interface MediaAttachment {
  type: 'image' | 'video' | 'youtube';
  url: string;
  description?: string;
}

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

interface RawWaypointDetail {
  lat?: number | string;
  lng?: number | string;
  title?: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface RawMediaAttachment {
  type?: 'image' | 'video' | 'youtube';
  url?: string;
  description?: string;
  [key: string]: JsonValue | undefined;
}

interface SupabaseRouteResponse
  extends Omit<RouteRow, 'waypoint_details' | 'media_attachments' | 'suggested_exercises'> {
  creator: {
    id: string;
    full_name: string;
  } | null;
  waypoint_details: RawWaypointDetail[];
  media_attachments: RawMediaAttachment[];
  suggested_exercises: any;
  reviews: { count: number }[];
  average_rating: { rating: number }[];
}

type RouteData = Omit<RouteRow, 'waypoint_details' | 'media_attachments'> & {
  waypoint_details: (WaypointDetail & Json)[];
  media_attachments: (MediaAttachment & Json)[];
  exercises?: Exercise[];
  creator?: {
    id: string;
    full_name: string;
  };
  reviews?: { count: number }[];
  average_rating?: { rating: number }[];
};

interface RouteDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  routeId: string | null;
  onStartRoute?: (routeId: string) => void;
  onNavigateToProfile?: (userId: string) => void;
  onReopen?: () => void;
  nearbyRoutes?: Array<{ id: string; name: string; waypoint_details?: any[] }>;
  onRouteChange?: (routeId: string) => void;
}

export function RouteDetailSheet({
  visible,
  onClose,
  routeId,
  onStartRoute,
  onNavigateToProfile,
  onReopen,
  nearbyRoutes = [],
  onRouteChange,
}: RouteDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Make navigation optional to handle modal context
  let navigation: any = null;
  try {
    navigation = useNavigation<NavigationProp>();
  } catch (error) {
    console.warn('Navigation not available in modal context:', error);
    navigation = null;
  }

  const { showToast } = useToast();
  const theme = useTheme();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling for drag-to-dismiss and snap points
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);

  // Animation values for Tinder-like swipe
  const swipeTranslateX = useSharedValue(0);
  const swipeTranslateY = useSharedValue(0);
  const swipeRotate = useSharedValue(0);
  const swipeOpacity = useSharedValue(1);

  // Snap points for resizing (top Y coordinates like RoutesDrawer)
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

  // Swipe navigation handlers
  const handleSwipeToNext = useCallback(() => {
    if (!routeId || !nearbyRoutes.length || !onRouteChange) return;

    const currentIndex = nearbyRoutes.findIndex((route) => route.id === routeId);
    if (currentIndex < nearbyRoutes.length - 1) {
      const nextRoute = nearbyRoutes[currentIndex + 1];
      onRouteChange(nextRoute.id);
    }
  }, [routeId, nearbyRoutes, onRouteChange]);

  const handleSwipeToPrevious = useCallback(() => {
    if (!routeId || !nearbyRoutes.length || !onRouteChange) return;

    const currentIndex = nearbyRoutes.findIndex((route) => route.id === routeId);
    if (currentIndex > 0) {
      const previousRoute = nearbyRoutes[currentIndex - 1];
      onRouteChange(previousRoute.id);
    }
  }, [routeId, nearbyRoutes, onRouteChange]);

  // Horizontal swipe gesture for route navigation with Tinder-like animation
  const swipeGesture = Gesture.Pan()
    .onStart(() => {
      // Reset swipe animation values
      swipeTranslateX.value = 0;
      swipeTranslateY.value = 0;
      swipeRotate.value = 0;
      swipeOpacity.value = 1;
    })
    .onUpdate((event) => {
      const { translationX, translationY } = event;

      // Only consider it a horizontal swipe if horizontal movement is significantly greater than vertical
      if (Math.abs(translationX) > Math.abs(translationY) * 2) {
        // Update swipe animation values
        swipeTranslateX.value = translationX;
        swipeTranslateY.value = translationY;

        // Calculate rotation based on horizontal movement (Tinder-like effect)
        const rotation = (translationX / width) * 0.3; // Max rotation of ~17 degrees
        swipeRotate.value = rotation;

        // Fade out slightly as it moves away from center
        const opacityValue = 1 - Math.abs(translationX) / (width * 0.5);
        swipeOpacity.value = Math.max(0.3, opacityValue);
      }
    })
    .onEnd((event) => {
      const { translationX, translationY, velocityX } = event;

      // Only handle horizontal swipes with sufficient movement/velocity
      if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 500) {
        // Animate card off screen with Tinder-like effect
        const exitDirection = translationX > 0 ? width : -width;

        swipeTranslateX.value = withSpring(exitDirection, {
          damping: 15,
          mass: 1,
          stiffness: 200,
        });
        swipeTranslateY.value = withSpring(translationY * 2, {
          damping: 15,
          mass: 1,
          stiffness: 200,
        });
        swipeRotate.value = withSpring(translationX > 0 ? 0.3 : -0.3, {
          damping: 15,
          mass: 1,
          stiffness: 200,
        });
        swipeOpacity.value = withSpring(0, {
          damping: 15,
          mass: 1,
          stiffness: 200,
        });

        // After animation completes, trigger route change and reset
        setTimeout(() => {
          // Reset animation values
          swipeTranslateX.value = 0;
          swipeTranslateY.value = 0;
          swipeRotate.value = 0;
          swipeOpacity.value = 1;

          // Trigger route change
          if (translationX > 0 || velocityX > 0) {
            // Swipe right - go to previous route
            runOnJS(handleSwipeToPrevious)();
          } else {
            // Swipe left - go to next route
            runOnJS(handleSwipeToNext)();
          }
        }, 200);
      } else {
        // Snap back to center with spring animation
        swipeTranslateX.value = withSpring(0, {
          damping: 20,
          mass: 1,
          stiffness: 300,
        });
        swipeTranslateY.value = withSpring(0, {
          damping: 20,
          mass: 1,
          stiffness: 300,
        });
        swipeRotate.value = withSpring(0, {
          damping: 20,
          mass: 1,
          stiffness: 300,
        });
        swipeOpacity.value = withSpring(1, {
          damping: 20,
          mass: 1,
          stiffness: 300,
        });
      }
    });

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

        // Set translateY directly like RoutesDrawer
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

      // Animate to target position - set translateY directly like RoutesDrawer
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
    })
    .simultaneousWithExternalGesture(swipeGesture);

  // Combine gestures - vertical pan for drag-to-dismiss, horizontal pan for route navigation
  const combinedGesture = Gesture.Simultaneous(panGesture, swipeGesture);

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: swipeTranslateX.value },
      { translateY: swipeTranslateY.value },
      { rotate: `${swipeRotate.value}rad` },
    ],
    opacity: swipeOpacity.value,
  }));

  // State (exact copy from RouteDetailScreen)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [routeCollections, setRouteCollections] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewsDetails, setShowReviewsDetails] = useState(false);
  const [showCommentsDetails, setShowCommentsDetails] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

  // Exercise-related state
  const [exerciseStats, setExerciseStats] = useState<{
    completed: number;
    total: number;
    lastSessionAt?: string;
  } | null>(null);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(new Set());
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);

  // Load route data (exact copy from RouteDetailScreen)
  const loadRouteData = useCallback(async () => {
    if (!routeId) return;

    const { data, error } = await supabase
      .from('routes')
      .select(
        `
        *,
        creator:creator_id(id, full_name),
        waypoint_details,
        media_attachments,
        suggested_exercises,
        reviews:route_reviews(
          id,
          rating,
          content
        ),
        average_rating:route_reviews(rating)
        `,
      )
      .eq('id', routeId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Route not found');

    const routeResponse = data as unknown as SupabaseRouteResponse;

    // Parse JSON fields (same logic as RouteDetailScreen)
    const waypoints = Array.isArray(routeResponse.waypoint_details)
      ? routeResponse.waypoint_details.map((wp) => ({
          lat: typeof wp?.lat === 'string' ? parseFloat(wp.lat) : (wp?.lat ?? 0),
          lng: typeof wp?.lng === 'string' ? parseFloat(wp.lng) : (wp?.lng ?? 0),
          title: String(wp?.title ?? ''),
          description: wp?.description ? String(wp.description) : undefined,
          ...wp,
        }))
      : [];

    const media = Array.isArray(routeResponse.media_attachments)
      ? routeResponse.media_attachments.map((m) => ({
          type: (m?.type as 'image' | 'video' | 'youtube') ?? 'image',
          url: String(m?.url ?? ''),
          description: m?.description ? String(m.description) : undefined,
          ...m,
        }))
      : [];

    // Parse exercises (same logic as RouteDetailScreen)
    let exercises: Exercise[] = [];
    if (routeResponse.suggested_exercises) {
      try {
        const exercisesData = Array.isArray(routeResponse.suggested_exercises)
          ? routeResponse.suggested_exercises
          : JSON.parse(String(routeResponse.suggested_exercises));

        exercises = exercisesData.map((ex: any) => ({
          id: ex.id || `exercise_${Date.now()}`,
          title: ex.title || 'Exercise',
          description: ex.description || '',
          duration: ex.duration || ex.duration_minutes,
          has_quiz: ex.has_quiz,
          quiz_data: ex.quiz_data,
        }));
      } catch (err) {
        console.error('Error parsing exercises:', err);
      }
    }

    // Transform the raw data into our expected format
    const transformedData: RouteData = {
      ...routeResponse,
      waypoint_details: waypoints as (WaypointDetail & Json)[],
      media_attachments: media as (MediaAttachment & Json)[],
      exercises: exercises,
      creator: routeResponse.creator || undefined,
      reviews: routeResponse.reviews || [],
      average_rating: routeResponse.average_rating || [],
    };

    setRouteData(transformedData);
  }, [routeId]);

  // Load other data functions (exact copy from RouteDetailScreen)
  const loadReviews = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('route_reviews')
        .select(
          `
          id,
          rating,
          content,
          difficulty,
          visited_at,
          images,
          user:profiles!user_id(
            full_name
          )
        `,
        )
        .eq('route_id', routeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validReviews = (data as any[])?.map(
        (review) =>
          ({
            id: review.id,
            user_id: review.user_id,
            rating: review.rating,
            content: review.content || '',
            difficulty: review.difficulty,
            visited_at: review.visited_at || new Date().toISOString(),
            images: Array.isArray(review.images)
              ? review.images.map((img: { url: string }) => ({ url: img.url }))
              : [],
            user: review.user
              ? {
                  full_name: review.user.full_name,
                }
              : undefined,
          }) as Review,
      );

      setReviews(validReviews || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  }, [routeId]);

  const checkRouteCollections = React.useCallback(async () => {
    if (!user || !routeId) return;
    try {
      const { data, error } = await supabase
        .from('map_preset_routes')
        .select('preset_id')
        .eq('route_id', routeId);

      if (error) throw error;

      const collectionIds = data?.map((item) => item.preset_id) || [];
      setRouteCollections(collectionIds);
    } catch (err) {
      console.error('Error checking route collections:', err);
    }
  }, [routeId, user]);

  const handleNavigateToProfile = React.useCallback(
    (userId: string) => {
      if (onNavigateToProfile) {
        onNavigateToProfile(userId);
      } else {
        // Show ProfileSheet as modal instead of navigating
        setSelectedProfileUserId(userId);
        setShowProfileSheet(true);
      }
    },
    [onNavigateToProfile],
  );

  // Load data when modal opens
  useEffect(() => {
    if (visible && routeId) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          await Promise.all([loadRouteData(), loadReviews()]);
          if (user) {
            await Promise.all([checkRouteCollections()]);
          }
          // Track route view
          await AppAnalytics.trackRouteView(routeId);
        } catch (error) {
          console.error('Error loading route data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load route data');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [visible, routeId, user, checkRouteCollections, loadRouteData, loadReviews]);

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
  }, [visible, backdropOpacity, snapPoints.large, currentState, translateY]);

  // Refresh function
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadRouteData(), loadReviews()]);
      if (user) {
        await Promise.all([checkRouteCollections()]);
      }
    } catch (error) {
      console.error('Error refreshing route data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadRouteData, loadReviews, user, checkRouteCollections]);

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
          <GestureDetector gesture={combinedGesture}>
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
              <YStack padding="$3" paddingBottom={insets.bottom || 10} gap="$3" flex={1}>
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

                {/* Header - removed route name, will be placed below carousel */}

                {/* Show carousel in mini mode */}
                {currentSnapPoint === snapPoints.mini && getCarouselItems(routeData).length > 0 && (
                  <RouteDetailsCarousel routeData={routeData} />
                )}

                {/* Show content only if not in mini mode */}
                {currentSnapPoint !== snapPoints.mini && (
                  <View style={{ flex: 1 }}>
                    {loading ? (
                      <YStack f={1} jc="center" ai="center">
                        <Text>{t('routeDetail.loading') || 'Loading route data...'}</Text>
                      </YStack>
                    ) : error || !routeData ? (
                      <YStack f={1} jc="center" ai="center" padding="$4">
                        <Text color="$red10">
                          {error || t('routeDetail.routeNotFound') || 'Route not found'}
                        </Text>
                        <Button
                          onPress={onClose}
                          marginTop="$4"
                          icon={<Feather name="arrow-left" size={18} color="white" />}
                          size="$4"
                        >
                          {t('common.goBack') || 'Go Back'}
                        </Button>
                      </YStack>
                    ) : (
                      <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
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
                          {/* Hero Carousel */}
                          <RouteDetailsCarousel routeData={routeData} />

                          {/* Route Name - placed below carousel */}
                          <Text
                            fontSize="$5"
                            fontWeight="bold"
                            color="$color"
                            textAlign="left"
                            marginTop="$2"
                          >
                            {routeData?.name || t('routeDetail.loading') || 'Loading...'}
                          </Text>

                          {/* Action Buttons */}
                          <RouteActions
                            routeData={routeData}
                            routeId={routeId}
                            onClose={onClose}
                            handleRefresh={handleRefresh}
                          />

                          {/* Basic Info Card */}
                          <Card backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#232323' : '#E5E5E5'} bordered padding="$4">
                            <YStack gap="$2">
                              <XStack gap="$2" alignItems="center" flexWrap="wrap">
                                <Text fontSize="$5" fontWeight="600" color="$color">
                                  {routeData.difficulty?.toUpperCase() || ''}
                                </Text>
                                <Text fontSize="$4" color="$gray11">
                                  •
                                </Text>
                                <Text fontSize="$5" color="$gray11">
                                  {routeData.spot_type || ''}
                                </Text>
                                {routeData.spot_subtype && (
                                  <>
                                    <Text fontSize="$4" color="$gray11">
                                      •
                                    </Text>
                                    <Text fontSize="$5" color="$gray11">
                                      {routeData.spot_subtype}
                                    </Text>
                                  </>
                                )}
                                <Text fontSize="$4" color="$gray11">
                                  •
                                </Text>
                                <Text fontSize="$5" color="$gray11">
                                  {routeData.category || ''}
                                </Text>
                              </XStack>

                              {/* Creator info with clickable name */}
                              {routeData.creator && (
                                <XStack alignItems="center" gap="$2" marginTop="$2">
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleNavigateToProfile(routeData.creator?.id || '')
                                    }
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 8,
                                      backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                                      paddingHorizontal: 12,
                                      paddingVertical: 8,
                                      borderRadius: 8,
                                    }}
                                  >
                                    <Feather name="user" size={16} color={iconColor} />
                                    <Text fontSize="$3" color="$color">
                                      {routeData.creator.full_name || 'Unknown Creator'}
                                    </Text>
                                  </TouchableOpacity>
                                </XStack>
                              )}

                              {routeData.description && (
                                <Text fontSize="$4" color="$gray11" marginTop="$2">
                                  {routeData.description}
                                </Text>
                              )}
                            </YStack>
                          </Card>

                          {/* Additional Metadata Section */}
                          <RouteDetailsMeta routeData={routeData} />

                          {/* Recording Stats Card */}
                          {isRecordedRoute(routeData) &&
                            (() => {
                              const recordingStats = parseRecordingStats(
                                routeData.description || '',
                              );
                              if (!recordingStats) return null;

                              const formattedStats = formatRecordingStatsDisplay(recordingStats);

                              return (
                                <Card backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#232323' : '#E5E5E5'} bordered padding="$4">
                                  <YStack gap="$3">
                                    <XStack alignItems="center" gap="$2">
                                      <Feather name="activity" size={20} color={iconColor} />
                                      <Text fontSize="$5" fontWeight="600" color="$color">
                                        {t('routeDetail.recordingStats') || 'Recording Stats'}
                                      </Text>
                                    </XStack>

                                    <YStack gap="$2">
                                      {formattedStats.map((stat, index) => (
                                        <XStack
                                          key={index}
                                          justifyContent="space-between"
                                          alignItems="center"
                                        >
                                          <XStack alignItems="center" gap="$2">
                                            <Feather
                                              name={stat.icon as any}
                                              size={16}
                                              color="$gray11"
                                            />
                                            <Text fontSize="$4" color="$gray11">
                                              {stat.label}
                                            </Text>
                                          </XStack>
                                          <Text fontSize="$4" fontWeight="600" color="$color">
                                            {stat.value}
                                          </Text>
                                        </XStack>
                                      ))}
                                    </YStack>

                                    <Text fontSize="$3" color="$gray9" fontStyle="italic">
                                      {t('routeDetail.recordedWithGPS') ||
                                        'Recorded with live GPS tracking'}
                                    </Text>
                                  </YStack>
                                </Card>
                              );
                            })()}

                          {/* Route Exercises Section */}
                          {routeData.exercises &&
                            Array.isArray(routeData.exercises) &&
                            routeData.exercises.length > 0 && (
                              <Card backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#232323' : '#E5E5E5'} bordered padding="$4">
                                <YStack gap="$4">
                                  <XStack justifyContent="space-between" alignItems="center">
                                    <Text fontSize="$5" fontWeight="600" color="$color">
                                      {t('routeDetail.exercises')}
                                    </Text>
                                    <Button
                                      onPress={() => {
                                        if (routeData?.exercises) {
                                          if (navigation) {
                                            try {
                                              navigation.navigate('RouteExercise', {
                                                routeId: routeId!,
                                                exercises: routeData.exercises,
                                                routeName: routeData.name,
                                                startIndex: 0,
                                              });
                                              onClose();
                                            } catch (error) {
                                              console.warn(
                                                'Navigation not available in modal context:',
                                                error,
                                              );
                                              showToast({
                                                title: t('common.error') || 'Error',
                                                message:
                                                  t('routeDetail.navigationNotAvailable') ||
                                                  'Navigation not available in this context',
                                                type: 'error',
                                              });
                                            }
                                          } else {
                                            console.warn(
                                              'Navigation not available in modal context',
                                            );
                                            showToast({
                                              title: t('common.error') || 'Error',
                                              message:
                                                t('routeDetail.navigationNotAvailable') ||
                                                'Navigation not available in this context',
                                              type: 'error',
                                            });
                                          }
                                        }
                                      }}
                                      backgroundColor="$blue10"
                                      icon={<Feather name="play" size={16} color="white" />}
                                      size="sm"
                                    >
                                      <Text color="white" fontSize="$3" fontWeight="600">
                                        {allExercisesCompleted
                                          ? t('routeDetail.reviewExercises') || 'Review'
                                          : t('routeDetail.startExercises') || 'Start'}
                                      </Text>
                                    </Button>
                                  </XStack>

                                  {/* Exercise List Preview */}
                                  <RouteExerciseList
                                    exercises={routeData.exercises}
                                    completedIds={completedExerciseIds}
                                    maxPreview={3}
                                    onExercisePress={(exercise, index) => {
                                      if (routeData?.exercises) {
                                        if (navigation) {
                                          try {
                                            navigation.navigate('RouteExercise', {
                                              routeId: routeId!,
                                              exercises: routeData.exercises,
                                              routeName: routeData.name || 'Route',
                                              startIndex: index,
                                            });
                                            onClose();
                                          } catch (error) {
                                            console.warn(
                                              'Navigation not available in modal context:',
                                              error,
                                            );
                                            showToast({
                                              title: t('common.error') || 'Error',
                                              message:
                                                t('routeDetail.navigationNotAvailable') ||
                                                'Navigation not available in this context',
                                              type: 'error',
                                            });
                                          }
                                        } else {
                                          console.warn('Navigation not available in modal context');
                                          showToast({
                                            title: t('common.error') || 'Error',
                                            message:
                                              t('routeDetail.navigationNotAvailable') ||
                                              'Navigation not available in this context',
                                            type: 'error',
                                          });
                                        }
                                      }
                                    }}
                                  />

                                  {/* Exercise Statistics */}
                                  {exerciseStats && (
                                    <Card bordered padding="$3" backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}>
                                      <YStack gap="$2">
                                        <Text fontSize={12} fontWeight="600" color="$gray11">
                                          {t('routeDetail.yourProgress')}
                                        </Text>
                                        <XStack justifyContent="space-between" alignItems="center">
                                          <Text fontSize={11} color="$gray11">
                                            {t('routeDetail.completed')}: {exerciseStats.completed}/
                                            {exerciseStats.total}
                                          </Text>
                                          <Text fontSize={11} color="$gray11">
                                            {Math.round(
                                              (exerciseStats.completed / exerciseStats.total) * 100,
                                            )}
                                            %
                                          </Text>
                                        </XStack>
                                        <Progress
                                          value={Math.round(
                                            (exerciseStats.completed / exerciseStats.total) * 100,
                                          )}
                                          backgroundColor="$gray6"
                                          size="$0.5"
                                        >
                                          <Progress.Indicator backgroundColor="$blue10" />
                                        </Progress>
                                      </YStack>
                                    </Card>
                                  )}
                                </YStack>
                              </Card>
                            )}

                          {/* Reviews Section */}
                          <Card backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#232323' : '#E5E5E5'} bordered padding="$4">
                            <YStack gap="$3">
                              <TouchableOpacity
                                onPress={() => setShowReviewsDetails(!showReviewsDetails)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <XStack alignItems="center" gap="$2">
                                  <Feather name="star" size={20} color={iconColor} />
                                  <Text fontSize="$5" fontWeight="600" color="$color">
                                    {t('routeDetail.reviews') || 'Reviews'}
                                  </Text>
                                  {reviews.length > 0 && (
                                    <View
                                      style={{
                                        backgroundColor: '#00E6C3',
                                        borderRadius: 12,
                                        paddingHorizontal: 8,
                                        paddingVertical: 2,
                                        minWidth: 20,
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Text fontSize={12} color="#000" fontWeight="bold">
                                        {reviews.length}
                                      </Text>
                                    </View>
                                  )}
                                </XStack>
                                <Feather
                                  name={showReviewsDetails ? 'chevron-up' : 'chevron-down'}
                                  size={20}
                                  color={iconColor}
                                />
                              </TouchableOpacity>

                              {showReviewsDetails && (
                                <YStack>
                                  <ReviewSection
                                    routeId={routeId!}
                                    reviews={reviews}
                                    onReviewAdded={loadReviews}
                                  />
                                </YStack>
                              )}
                            </YStack>
                          </Card>

                          {/* Comments Section */}
                          <Card backgroundColor={colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF'} borderColor={colorScheme === 'dark' ? '#232323' : '#E5E5E5'} bordered padding="$4">
                            <YStack gap="$3">
                              <TouchableOpacity
                                onPress={() => setShowCommentsDetails(!showCommentsDetails)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <XStack alignItems="center" gap="$2">
                                  <Feather name="message-circle" size={20} color={iconColor} />
                                  <Text fontSize="$5" fontWeight="600" color="$color">
                                    {t('routeDetail.comments') || 'Comments'}
                                  </Text>
                                </XStack>
                                <Feather
                                  name={showCommentsDetails ? 'chevron-up' : 'chevron-down'}
                                  size={20}
                                  color={iconColor}
                                />
                              </TouchableOpacity>

                              {showCommentsDetails && (
                                <YStack>
                                  <CommentsSection targetType="route" targetId={routeId!} />
                                </YStack>
                              )}
                            </YStack>
                          </Card>
                        </YStack>
                      </ScrollView>
                    )}
                  </View>
                )}
              </YStack>
            </ReanimatedAnimated.View>
          </GestureDetector>
        </View>
      </Animated.View>

      {/* UserProfileSheet Modal - reopens RouteDetailSheet on close */}
      {showProfileSheet && selectedProfileUserId && (
        <UserProfileSheet
          visible={showProfileSheet}
          onClose={() => {
            setShowProfileSheet(false);
            setSelectedProfileUserId(null);
            // Reopen RouteDetailSheet after ProfileSheet closes
            if (onReopen) {
              setTimeout(() => {
                onReopen();
              }, 300);
            }
          }}
          userId={selectedProfileUserId}
        />
      )}
    </Modal>
  );
}
