import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Button, Progress, useTheme } from 'tamagui';
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
import { Map } from './Map';
import { Play } from '@tamagui/lucide-icons';
import Carousel from 'react-native-reanimated-carousel';
import { WebView } from 'react-native-webview';
import { ImageWithFallback } from './ImageWithFallback';
import { ReviewSection } from './ReviewSection';
import { CommentsSection } from './CommentsSection';
import { AppAnalytics } from '../utils/analytics';
import { Region } from '../types/maps';
import { ReportDialog } from './report/ReportDialog';
import {
  parseRecordingStats,
  isRecordedRoute,
  formatRecordingStatsDisplay,
} from '../utils/routeUtils';
import { RouteExerciseList } from './RouteExerciseList';
import { AddToPresetSheetModal } from './AddToPresetSheet';
import { useModal } from '../contexts/ModalContext';
import { IconButton } from './IconButton';
import { useToast } from '../contexts/ToastContext';
import { PIN_COLORS } from '../styles/mapStyles';
import { CreateRouteSheet } from './CreateRouteSheet';
import { UserProfileSheet } from './UserProfileSheet';

const { height, width } = Dimensions.get('window');

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type RouteRow = Database['public']['Tables']['routes']['Row'];
type Json = Database['public']['Tables']['routes']['Row']['waypoint_details'];

type ReviewFromDB = Database['public']['Tables']['route_reviews']['Row'] & {
  user: {
    full_name: string;
  } | null;
};

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

interface RawExercise {
  id?: string;
  title?: string;
  description?: string;
  duration?: string;
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

  const colorScheme = useColorScheme();
  const { showModal } = useModal();
  const { showToast } = useToast();
  const theme = useTheme();
  const iconColor = theme.color?.val || '#000000';

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

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
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDriven, setIsDriven] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [routeCollections, setRouteCollections] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);
  const [showReviewsDetails, setShowReviewsDetails] = useState(false);
  const [showCommentsDetails, setShowCommentsDetails] = useState(false);
  const [showDrivenOptionsSheet, setShowDrivenOptionsSheet] = useState(false);
  const [showDeleteConfirmSheet, setShowDeleteConfirmSheet] = useState(false);
  const [showAdminDeleteConfirmSheet, setShowAdminDeleteConfirmSheet] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showCreateRouteSheet, setShowCreateRouteSheet] = useState(false);
  const [showMediaDetails, setShowMediaDetails] = useState(false);
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
  const loadReviews = async () => {
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
  };

  const checkSavedStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('saved_routes')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      setIsSaved(!!data);
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const checkDrivenStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('driven_routes')
        .select('id')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .single();

      setIsDriven(!!data);
    } catch (err) {
      console.error('Error checking driven status:', err);
    }
  };

  const checkRouteCollections = async () => {
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
  };

  // Handle functions (exact copy from RouteDetailScreen)
  const handleSaveRoute = async () => {
    if (!user) {
      showToast({
        title: t('routeDetail.signInRequired') || 'Sign in required',
        message: t('routeDetail.pleaseSignInToSave') || 'Please sign in to save routes',
        type: 'error',
      });
      return;
    }

    try {
      if (isSaved) {
        await supabase.from('saved_routes').delete().eq('route_id', routeId).eq('user_id', user.id);
        showToast({
          title: t('routeDetail.removedFromSaved') || 'Removed from Saved',
          message:
            t('routeDetail.routeRemovedFromSaved') ||
            'Route has been removed from your saved routes',
          type: 'info',
        });
      } else {
        await supabase.from('saved_routes').insert({
          route_id: routeId,
          user_id: user.id,
          saved_at: new Date().toISOString(),
        });
        showToast({
          title: t('routeDetail.saved') || 'Saved',
          message: t('routeDetail.routeSaved') || 'Route has been saved to your collection',
          type: 'success',
        });
      }
      setIsSaved(!isSaved);
    } catch (err) {
      console.error('Error toggling save status:', err);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToUpdateSave') || 'Failed to update save status',
        type: 'error',
      });
    }
  };

  // Handle adding route to preset
  const handleAddToPreset = () => {
    if (!user || !routeId) {
      showToast({
        title: t('routeDetail.signInRequired') || 'Sign in required',
        message: t('routeDetail.pleaseSignInToAdd') || 'Please sign in to add routes to presets',
        type: 'error',
      });
      return;
    }

    console.log(
      '🎯 RouteDetailSheet: Closing and opening AddToPresetSheet modal - routeId:',
      routeId,
    );

    // Store the routeId to ensure it's available when reopening
    const currentRouteId = routeId;

    // Close the current sheet first
    onClose();

    // Use setTimeout to ensure the current modal is closed before showing the new one
    setTimeout(() => {
      showModal(
        <AddToPresetSheetModal
          routeId={currentRouteId}
          onRouteAdded={(presetId, presetName) => {
            showToast({
              title: t('routeDetail.addedToCollection') || 'Added to Collection',
              message:
                t('routeDetail.routeHasBeenAdded')?.replace('{collectionName}', presetName) ||
                `Route has been added to "${presetName}"`,
              type: 'success',
            });
            // Refresh collection status
            checkRouteCollections();
          }}
          onRouteRemoved={(presetId, presetName) => {
            showToast({
              title: t('routeDetail.removedFromCollection') || 'Removed from Collection',
              message:
                t('routeDetail.routeHasBeenRemoved')?.replace('{collectionName}', presetName) ||
                `Route has been removed from "${presetName}"`,
              type: 'info',
            });
            // Refresh collection status
            checkRouteCollections();
          }}
          onPresetCreated={(preset) => {
            showToast({
              title: t('routeDetail.collectionCreated') || 'Collection Created',
              message:
                t('routeDetail.newCollectionCreated')?.replace('{collectionName}', preset.name) ||
                `New collection "${preset.name}" has been created and route added to it`,
              type: 'success',
            });
            // Refresh collection status
            checkRouteCollections();
          }}
          onClose={() => {
            // When AddToPresetSheet closes, reopen the RouteDetailSheet
            setTimeout(() => {
              console.log(
                '🎯 AddToPresetSheet closed, reopening RouteDetailSheet - currentRouteId:',
                currentRouteId,
              );
              if (onReopen) {
                onReopen();
              } else {
                console.warn('🎯 onReopen callback not provided to RouteDetailSheet');
              }
            }, 1000); // Increased delay to allow sharing modal to appear
          }}
          onReopen={() => {
            // When AddToPresetSheet needs to reopen after sharing modal closes
            setTimeout(() => {
              console.log('🎯 AddToPresetSheet reopening after sharing modal closed');
              if (onReopen) {
                onReopen();
              }
            }, 200);
          }}
        />,
      );
    }, 300); // Wait for the close animation to complete
  };

  const handleMarkDriven = async () => {
    if (!user?.id) {
      showToast({
        title: t('common.error') || 'Error',
        message:
          t('routeDetail.pleaseSignInToMark') || 'Please sign in to mark this route as driven',
        type: 'error',
      });
      return;
    }

    if (isDriven) {
      // If already driven, show options sheet instead of alert
      setShowDrivenOptionsSheet(true);
    } else {
      // First time marking as driven
      if (navigation) {
        try {
          navigation.navigate('AddReview', {
            routeId: routeId!,
            returnToRouteDetail: true,
          } as any);
          onClose();
        } catch (error) {
          console.warn('Navigation not available in modal context:', error);
          showToast({
            title: t('common.error') || 'Error',
            message:
              t('routeDetail.navigationNotAvailable') || 'Navigation not available in this context',
            type: 'error',
          });
        }
      } else {
        console.warn('Navigation not available in modal context');
        showToast({
          title: t('common.error') || 'Error',
          message:
            t('routeDetail.navigationNotAvailable') || 'Navigation not available in this context',
          type: 'error',
        });
      }
    }
  };

  const handleUnmarkDriven = async () => {
    if (!user?.id || !routeId) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.pleaseSignInToUnmark') || 'Please sign in to unmark this route',
        type: 'error',
      });
      return;
    }

    try {
      // Remove from driven routes
      const { error } = await supabase
        .from('driven_routes')
        .delete()
        .eq('route_id', routeId)
        .eq('user_id', user.id);

      if (error) throw error;

      setIsDriven(false);
      showToast({
        title: t('routeDetail.unmarkedAsDriven') || 'Unmarked as Driven',
        message: t('routeDetail.routeUnmarkedAsDriven') || 'Route has been unmarked as driven',
        type: 'success',
      });
    } catch (error) {
      console.error('Error unmarking route as driven:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToUnmark') || 'Failed to unmark route as driven',
        type: 'error',
      });
    }
  };

  const handleShare = async () => {
    if (!routeData) return;

    const baseUrl = 'https://routes.vromm.se';
    const shareUrl = `${baseUrl}/?route=${routeData.id || ''}`;

    try {
      await Share.share({
        message: routeData.description || `Check out this route: ${routeData.name}`,
        url: shareUrl,
        title: routeData.name || 'Route',
      });
      showToast({
        title: t('routeDetail.shared') || 'Shared',
        message: t('routeDetail.routeShared') || 'Route has been shared successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToShare') || 'Failed to share route',
        type: 'error',
      });
    }
  };

  const handleStartRoute = () => {
    if (!routeId) return;

    if (onStartRoute) {
      onStartRoute(routeId);
    } else {
      // Only try to navigate if we have navigation context
      if (navigation) {
        try {
          navigation.navigate('MainTabs', {
            screen: 'MapTab',
            params: { screen: 'MapScreen', params: { routeId: routeId! } },
          } as any);
        } catch (error) {
          console.warn('Navigation not available in modal context:', error);
          // Fallback: just close the sheet
        }
      } else {
        console.warn('Navigation not available in modal context');
        // Fallback: just close the sheet
      }
    }
    onClose();
  };

  const handleNavigateToProfile = (userId: string) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(userId);
    } else {
      // Show ProfileSheet as modal instead of navigating
      setSelectedProfileUserId(userId);
      setShowProfileSheet(true);
    }
  };

  const handleShowOptions = () => {
    // Track options button press
    AppAnalytics.trackButtonPress('options_menu', 'RouteDetailSheet', {
      route_id: routeData?.id,
    }).catch(() => {
      // Silently fail analytics
    });

    // Show options sheet instead of alert
    setShowOptionsSheet(true);
  };

  const handleOpenInMaps = () => {
    if (!routeData?.waypoint_details?.length) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.noWaypointsAvailable') || 'No waypoints available for this route',
        type: 'error',
      });
      return;
    }

    const waypoints = routeData.waypoint_details;
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;

    const maxIntermediateWaypoints = 8;
    const intermediateWaypoints = waypoints.slice(1, -1);
    let selectedWaypoints = intermediateWaypoints;

    if (intermediateWaypoints.length > maxIntermediateWaypoints) {
      const step = Math.floor(intermediateWaypoints.length / maxIntermediateWaypoints);
      selectedWaypoints = intermediateWaypoints
        .filter((_, index) => index % step === 0)
        .slice(0, maxIntermediateWaypoints);
    }

    const waypointsStr = selectedWaypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsStr ? `&waypoints=${waypointsStr}` : ''}`;

    Linking.openURL(googleMapsUrl);
  };

  const handleDelete = async () => {
    if (!user || !routeData) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.unableToDelete') || 'Unable to delete route',
        type: 'error',
      });
      return;
    }

    // Show confirmation sheet instead of alert
    setShowDeleteConfirmSheet(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !routeData) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeData.id || '');
      if (error) throw error;

      showToast({
        title: t('routeDetail.deleted') || 'Route Deleted',
        message: t('routeDetail.routeDeleted') || 'Route has been deleted successfully',
        type: 'success',
      });

      onClose();
    } catch (err) {
      console.error('Delete error:', err);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToDelete') || 'Failed to delete route',
        type: 'error',
      });
    }
  };

  const handleAdminDelete = async () => {
    if (!showAdminControls || !routeData) return;

    // Show admin delete confirmation sheet
    setShowAdminDeleteConfirmSheet(true);
  };

  const handleConfirmAdminDelete = async () => {
    if (!showAdminControls || !routeData) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeData.id || '');
      if (error) throw error;

      showToast({
        title: t('routeDetail.deleted') || 'Route Deleted',
        message: t('routeDetail.routeDeletedByAdmin') || 'Route has been deleted by admin',
        type: 'success',
      });

      onClose();
    } catch (err) {
      console.error('Admin delete error:', err);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeDetail.failedToDelete') || 'Failed to delete route',
        type: 'error',
      });
    }
  };

  // Get map region
  const getMapRegion = useCallback(() => {
    if (!routeData?.waypoint_details?.length) return null;

    const waypoints = routeData.waypoint_details;
    const latitudes = waypoints.map((wp) => wp.lat);
    const longitudes = waypoints.map((wp) => wp.lng);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    const minDelta = 0.01;
    const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
    const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [routeData?.waypoint_details]);

  // Get additional metadata that's not currently displayed
  const getAdditionalMetadata = () => {
    if (!routeData) return [];

    const metadata = [];

    // Route type and visibility
    if (routeData.route_type) {
      metadata.push({ label: 'Route Type', value: routeData.route_type, icon: 'map' });
    }
    if (routeData.visibility) {
      metadata.push({ label: 'Visibility', value: routeData.visibility, icon: 'eye' });
    }

    // Vehicle and transmission info
    if (
      routeData.vehicle_types &&
      Array.isArray(routeData.vehicle_types) &&
      routeData.vehicle_types.length > 0
    ) {
      metadata.push({
        label: 'Vehicle Types',
        value: routeData.vehicle_types.join(', '),
        icon: 'truck',
      });
    }
    if (routeData.transmission_type) {
      metadata.push({
        label: 'Transmission',
        value: routeData.transmission_type,
        icon: 'settings',
      });
    }

    // Activity and timing info
    if (routeData.activity_level) {
      metadata.push({ label: 'Activity Level', value: routeData.activity_level, icon: 'activity' });
    }
    if (routeData.best_times) {
      metadata.push({ label: 'Best Times', value: routeData.best_times, icon: 'clock' });
    }
    if (routeData.best_season) {
      metadata.push({ label: 'Best Season', value: routeData.best_season, icon: 'sun' });
    }

    // Location details
    if (routeData.full_address) {
      metadata.push({ label: 'Full Address', value: routeData.full_address, icon: 'map-pin' });
    }
    if (routeData.country) {
      metadata.push({ label: 'Country', value: routeData.country, icon: 'globe' });
    }
    if (routeData.region) {
      metadata.push({ label: 'Region', value: routeData.region, icon: 'map' });
    }

    // Brand info
    if (routeData.brand) {
      metadata.push({ label: 'Brand', value: routeData.brand, icon: 'tag' });
    }

    // Duration and status
    if (routeData.estimated_duration_minutes) {
      const hours = Math.floor(routeData.estimated_duration_minutes / 60);
      const minutes = routeData.estimated_duration_minutes % 60;
      const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      metadata.push({ label: 'Estimated Duration', value: durationText, icon: 'clock' });
    }
    if (routeData.status) {
      metadata.push({ label: 'Status', value: routeData.status, icon: 'check-circle' });
    }

    // Creation and update info
    if (routeData.created_at) {
      const createdDate = new Date(routeData.created_at).toLocaleDateString();
      metadata.push({ label: 'Created', value: createdDate, icon: 'calendar' });
    }
    if (routeData.updated_at && routeData.updated_at !== routeData.created_at) {
      const updatedDate = new Date(routeData.updated_at).toLocaleDateString();
      metadata.push({ label: 'Last Updated', value: updatedDate, icon: 'edit' });
    }

    // Additional flags
    if (routeData.is_public !== undefined) {
      metadata.push({
        label: 'Public Route',
        value: routeData.is_public ? 'Yes' : 'No',
        icon: routeData.is_public ? 'globe' : 'lock',
      });
    }
    if (routeData.is_verified !== undefined) {
      metadata.push({
        label: 'Verified',
        value: routeData.is_verified ? 'Yes' : 'No',
        icon: routeData.is_verified ? 'check-circle' : 'alert-circle',
      });
    }
    if ((routeData as any).is_draft !== undefined) {
      metadata.push({
        label: 'Draft',
        value: (routeData as any).is_draft ? 'Yes' : 'No',
        icon: (routeData as any).is_draft ? 'edit' : 'check',
      });
    }

    return metadata;
  };

  // Get carousel items
  const getCarouselItems = () => {
    const items = [];

    // Add map as first item if we have waypoints
    if (routeData?.waypoint_details?.length) {
      const waypoints = routeData.waypoint_details.map((wp) => ({
        latitude: wp.lat,
        longitude: wp.lng,
        title: wp.title,
        description: wp.description,
      }));

      const lats = waypoints.map((w) => w.latitude);
      const lngs = waypoints.map((w) => w.longitude);
      const region: Region = {
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        latitudeDelta: Math.max(...lats) - Math.min(...lats) + 0.02,
        longitudeDelta: Math.max(...lngs) - Math.min(...lngs) + 0.02,
      };

      const routePath = waypoints.length > 2 ? waypoints : undefined;

      // Extract pins from route data
      const pins =
        routeData.pins && Array.isArray(routeData.pins)
          ? routeData.pins
              .map((pin: any) => ({
                latitude: pin.lat,
                longitude: pin.lng,
                title: pin.title,
                description: pin.description,
              }))
              .filter((pin) => pin.latitude && pin.longitude)
          : [];

      items.push({
        type: 'map',
        waypoints,
        region,
        routePath,
        showStartEndMarkers: true,
        pins,
      });
    }

    // Add media attachments
    const uniqueMedia =
      routeData?.media_attachments?.filter(
        (attachment, index, arr) =>
          arr.findIndex((a) => a.url === attachment.url && a.type === attachment.type) === index,
      ) || [];

    const validMedia = uniqueMedia.filter((attachment) => {
      const isValidUrl =
        attachment.url &&
        (attachment.url.startsWith('http://') ||
          attachment.url.startsWith('https://') ||
          attachment.url.startsWith('file://') ||
          attachment.url.startsWith('data:') ||
          attachment.url.startsWith('content://'));
      return isValidUrl;
    });

    validMedia.forEach((attachment) => {
      items.push({
        type: attachment.type,
        url: attachment.url,
        description: attachment.description,
      });
    });

    return items;
  };

  // Render carousel item
  const renderCarouselItem = ({ item }: { item: any }): React.JSX.Element => {
    const HERO_HEIGHT = height * 0.3; // Smaller height for sheet

    if (item.type === 'map') {
      return (
        <Map
          waypoints={item.waypoints}
          region={item.region}
          style={{ width: width - 32, height: HERO_HEIGHT }}
          zoomEnabled={true}
          scrollEnabled={false}
          routePath={item.routePath}
          pins={item.pins}
          routePathColor={PIN_COLORS.ROUTE_PATH}
          showStartEndMarkers={item.showStartEndMarkers}
        />
      );
    } else if (item.type === 'image') {
      return (
        <ImageWithFallback
          source={{ uri: item.url }}
          style={{ width: width - 32, height: HERO_HEIGHT }}
          resizeMode="cover"
        />
      );
    } else if (item.type === 'video') {
      return (
        <TouchableOpacity
          style={{ width: width - 32, height: HERO_HEIGHT, position: 'relative' }}
          onPress={() => console.log('🎥 Video play requested:', item.url)}
          activeOpacity={0.8}
        >
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#000',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 12,
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 50,
                width: 80,
                height: 80,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Play size={40} color="#FFF" />
            </View>
            <Text style={{ color: '#FFF', marginTop: 12, fontSize: 14, fontWeight: '600' }}>
              Tap to play video
            </Text>
          </View>
        </TouchableOpacity>
      );
    } else if (item.type === 'youtube') {
      return (
        <WebView
          source={{ uri: item.url }}
          style={{ width: width - 32, height: HERO_HEIGHT }}
          allowsInlineMediaPlaybook={true}
          mediaPlaybackRequiresUserAction={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      );
    }
    return <View style={{ width: width - 32, height: HERO_HEIGHT }} />;
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible && routeId) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          await Promise.all([loadRouteData(), loadReviews()]);
          if (user) {
            await Promise.all([checkSavedStatus(), checkDrivenStatus(), checkRouteCollections()]);
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
  }, [visible, routeId, user]);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data && data.role === 'admin') {
          setShowAdminControls(true);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminStatus();
  }, [user]);

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

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadRouteData(), loadReviews()]);
      if (user) {
        await Promise.all([checkSavedStatus(), checkDrivenStatus(), checkRouteCollections()]);
      }
    } catch (error) {
      console.error('Error refreshing route data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!visible) return null;

  console.log('🎯 RouteDetailSheet rendering with visible:', visible);

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

                {/* Header - removed route name, will be placed below carousel */}

                {/* Show carousel in mini mode */}
                {currentSnapPoint === snapPoints.mini && getCarouselItems().length > 0 && (
                  <View
                    style={{
                      height: height * 0.3,
                      borderRadius: 12,
                      overflow: 'hidden',
                      marginBottom: 16,
                    }}
                  >
                    <Carousel
                      loop
                      width={width - 32}
                      height={height * 0.3}
                      data={getCarouselItems()}
                      renderItem={renderCarouselItem}
                      onSnapToItem={setActiveMediaIndex}
                    />
                    {/* Pagination dots */}
                    {getCarouselItems().length > 1 && (
                      <XStack
                        position="absolute"
                        bottom={16}
                        alignSelf="center"
                        gap="$2"
                        padding="$2"
                        backgroundColor="transparent"
                        borderRadius="$4"
                      >
                        {getCarouselItems().map((_, index) => (
                          <View
                            key={index}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor:
                                index === activeMediaIndex ? 'white' : 'rgba(255,255,255,0.5)',
                            }}
                          />
                        ))}
                      </XStack>
                    )}
                  </View>
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
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
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
                          {getCarouselItems().length > 0 && (
                            <View
                              style={{ height: height * 0.3, borderRadius: 12, overflow: 'hidden' }}
                            >
                              <Carousel
                                loop
                                width={width - 32}
                                height={height * 0.3}
                                data={getCarouselItems()}
                                renderItem={renderCarouselItem}
                                onSnapToItem={setActiveMediaIndex}
                              />
                              {/* Pagination dots */}
                              {getCarouselItems().length > 1 && (
                                <XStack
                                  position="absolute"
                                  bottom={16}
                                  alignSelf="center"
                                  gap="$2"
                                  padding="$2"
                                  backgroundColor="transparent"
                                  borderRadius="$4"
                                >
                                  {getCarouselItems().map((_, index) => (
                                    <View
                                      key={index}
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor:
                                          index === activeMediaIndex
                                            ? 'white'
                                            : 'rgba(255,255,255,0.5)',
                                      }}
                                    />
                                  ))}
                                </XStack>
                              )}
                            </View>
                          )}

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
                          <YStack gap="$3">
                            <XStack gap="$2" justifyContent="space-between">
                              {/* <Button
                          onPress={handleStartRoute}
                          backgroundColor="$blue10"
                          icon={<Feather name="navigation" size={18} color="white" />}
                          flex={1}
                        >
                          <Text color="white" fontSize="$3" fontWeight="600">
                            Start Route
                          </Text>
                        </Button> */}

                              <IconButton
                                icon="bookmark"
                                label={
                                  isSaved
                                    ? t('routeDetail.saved') || 'Saved'
                                    : t('routeDetail.saveRoute') || 'Save'
                                }
                                onPress={handleSaveRoute}
                                selected={isSaved}
                                backgroundColor="transparent"
                                borderColor="transparent"
                                flex={1}
                              />
                              <IconButton
                                icon="check-circle"
                                label={
                                  isDriven
                                    ? t('routeDetail.markedAsDriven') || 'Marked as Driven'
                                    : t('routeDetail.markAsDriven') || 'Mark as Driven'
                                }
                                onPress={handleMarkDriven}
                                selected={isDriven}
                                backgroundColor="transparent"
                                borderColor="transparent"
                                flex={1}
                              />
                              <IconButton
                                icon="map"
                                label={t('routeDetail.addToCollection') || 'Add to Collection'}
                                onPress={handleAddToPreset}
                                selected={routeCollections.length > 0}
                                backgroundColor={
                                  routeCollections.length > 0 ? 'transparent' : 'transparent'
                                }
                                borderColor={
                                  routeCollections.length > 0 ? 'transparent' : 'transparent'
                                }
                                badge={
                                  routeCollections.length > 0
                                    ? routeCollections.length.toString()
                                    : undefined
                                }
                                flex={1}
                              />
                              {routeData?.exercises &&
                                Array.isArray(routeData.exercises) &&
                                routeData.exercises.length > 0 && (
                                  <IconButton
                                    icon="play"
                                    label={
                                      allExercisesCompleted
                                        ? t('routeDetail.reviewExercises') || 'Review'
                                        : t('routeDetail.startExercises') || 'Start'
                                    }
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
                                    backgroundColor={isSaved ? 'transparent' : 'transparent'}
                                    borderColor={isSaved ? 'transparent' : 'transparent'}
                                    flex={1}
                                  />
                                )}
                              {showAdminControls && (
                                <IconButton
                                  icon="trash-2"
                                  label={t('routeDetail.adminDelete') || 'Delete'}
                                  onPress={() => {
                                    AppAnalytics.trackButtonPress(
                                      'admin_delete',
                                      'RouteDetailSheet',
                                      {
                                        route_id: routeData?.id,
                                      },
                                    ).catch(() => {});
                                    handleAdminDelete();
                                  }}
                                  backgroundColor={isSaved ? 'transparent' : 'transparent'}
                                  borderColor={isSaved ? 'transparent' : 'transparent'}
                                  flex={1}
                                />
                              )}
                              {user?.id === routeData?.creator_id && (
                                <IconButton
                                  icon="edit-2"
                                  label={t('routeDetail.addEdit') || 'Edit'}
                                  onPress={() => {
                                    AppAnalytics.trackButtonPress(
                                      'edit_route',
                                      'RouteDetailSheet',
                                      {
                                        route_id: routeData?.id,
                                      },
                                    ).catch(() => {});
                                    // Show CreateRouteSheet as modal
                                    setShowCreateRouteSheet(true);
                                  }}
                                  backgroundColor={isSaved ? 'transparent' : 'transparent'}
                                  borderColor={isSaved ? 'transparent' : 'transparent'}
                                  flex={1}
                                />
                              )}
                              <IconButton
                                icon="more-vertical"
                                label={t('routeDetail.more') || 'Op'}
                                onPress={handleShowOptions}
                                backgroundColor={isSaved ? 'transparent' : 'transparent'}
                                borderColor={isSaved ? 'transparent' : 'transparent'}
                                flex={1}
                              />
                            </XStack>
                          </YStack>

                          {/* Basic Info Card */}
                          <Card backgroundColor="$backgroundStrong" bordered padding="$4">
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
                          {getAdditionalMetadata().length > 0 && (
                            <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                              <YStack gap="$3">
                                <TouchableOpacity
                                  onPress={() => setShowMetadataDetails(!showMetadataDetails)}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <XStack alignItems="center" gap="$2">
                                    <Feather name="info" size={20} color={iconColor} />
                                    <Text fontSize="$5" fontWeight="600" color="$color">
                                      {t('routeDetail.additionalInfo') || 'Additional Information'}
                                    </Text>
                                  </XStack>
                                  <Feather
                                    name={showMetadataDetails ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color={iconColor}
                                  />
                                </TouchableOpacity>

                                {showMetadataDetails && (
                                  <YStack gap="$2">
                                    {getAdditionalMetadata().map((item, index) => (
                                      <XStack
                                        key={index}
                                        justifyContent="space-between"
                                        alignItems="center"
                                        paddingVertical="$1"
                                      >
                                        <XStack alignItems="center" gap="$2" flex={1}>
                                          <Feather
                                            name={item.icon as any}
                                            size={16}
                                            color="$gray11"
                                          />
                                          <Text fontSize="$4" color="$gray11" flex={1}>
                                            {item.label}
                                          </Text>
                                        </XStack>
                                        <Text
                                          fontSize="$4"
                                          fontWeight="600"
                                          color="$color"
                                          textAlign="right"
                                          flex={1}
                                        >
                                          {item.value}
                                        </Text>
                                      </XStack>
                                    ))}
                                  </YStack>
                                )}
                              </YStack>
                            </Card>
                          )}

                          {/* Recording Stats Card */}
                          {isRecordedRoute(routeData) &&
                            (() => {
                              const recordingStats = parseRecordingStats(
                                routeData.description || '',
                              );
                              if (!recordingStats) return null;

                              const formattedStats = formatRecordingStatsDisplay(recordingStats);

                              return (
                                <Card backgroundColor="$backgroundStrong" bordered padding="$4">
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
                              <Card backgroundColor="$backgroundStrong" bordered padding="$4">
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
                                    <Card bordered padding="$3" backgroundColor="$gray2">
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
                          <Card backgroundColor="$backgroundStrong" bordered padding="$4">
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
                          <Card backgroundColor="$backgroundStrong" bordered padding="$4">
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

                    {/* Report dialog */}
                    {showReportDialog && routeData && (
                      <ReportDialog
                        reportableId={routeData.id}
                        reportableType="route"
                        onClose={() => setShowReportDialog(false)}
                      />
                    )}

                    {/* Options Sheet */}
                    {showOptionsSheet && (
                      <Modal
                        visible={showOptionsSheet}
                        transparent
                        animationType="none"
                        onRequestClose={() => setShowOptionsSheet(false)}
                      >
                        <Animated.View
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                          }}
                        >
                          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                            <Pressable
                              style={{ flex: 1 }}
                              onPress={() => setShowOptionsSheet(false)}
                            />
                            <Animated.View
                              style={{
                                backgroundColor: backgroundColor,
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                padding: 20,
                                paddingBottom: 40,
                              }}
                            >
                              <YStack gap="$4">
                                <Text
                                  fontSize="$6"
                                  fontWeight="bold"
                                  color="$color"
                                  textAlign="center"
                                >
                                  {t('routeDetail.routeOptions') || 'Route Options'}
                                </Text>

                                <YStack gap="$2">
                                  <TouchableOpacity
                                    onPress={() => {
                                      setShowOptionsSheet(false);
                                      handleOpenInMaps();
                                    }}
                                    style={{
                                      padding: 16,
                                      backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                                      borderRadius: 12,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12,
                                    }}
                                  >
                                    <Feather name="map" size={20} color={iconColor} />
                                    <Text fontSize="$4" color="$color">
                                      {t('routeDetail.openInMaps') || 'Open in Maps'}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => {
                                      setShowOptionsSheet(false);
                                      handleShare();
                                    }}
                                    style={{
                                      padding: 16,
                                      backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                                      borderRadius: 12,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12,
                                    }}
                                  >
                                    <Feather name="share" size={20} color={iconColor} />
                                    <Text fontSize="$4" color="$color">
                                      {t('routeDetail.shareRoute') || 'Share Route'}
                                    </Text>
                                  </TouchableOpacity>

                                  {user?.id === routeData?.creator_id && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        setShowOptionsSheet(false);
                                        handleDelete();
                                      }}
                                      style={{
                                        padding: 16,
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                      }}
                                    >
                                      <Feather name="trash-2" size={20} color="#EF4444" />
                                      <Text fontSize="$4" color="#EF4444">
                                        {t('routeDetail.deleteRoute') || 'Delete Route'}
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  {user?.id !== routeData?.creator_id && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        setShowOptionsSheet(false);
                                        setShowReportDialog(true);
                                      }}
                                      style={{
                                        padding: 16,
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                      }}
                                    >
                                      <Feather name="flag" size={20} color="#EF4444" />
                                      <Text fontSize="$4" color="#EF4444">
                                        {t('routeDetail.reportRoute') || 'Report Route'}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </YStack>

                                <Button
                                  variant="outlined"
                                  size="lg"
                                  onPress={() => setShowOptionsSheet(false)}
                                >
                                  {t('common.cancel') || 'Cancel'}
                                </Button>
                              </YStack>
                            </Animated.View>
                          </View>
                        </Animated.View>
                      </Modal>
                    )}

                    {/* Driven Options Sheet */}
                    {showDrivenOptionsSheet && (
                      <Modal
                        visible={showDrivenOptionsSheet}
                        transparent
                        animationType="none"
                        onRequestClose={() => setShowDrivenOptionsSheet(false)}
                      >
                        <Animated.View
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                          }}
                        >
                          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                            <Pressable
                              style={{ flex: 1 }}
                              onPress={() => setShowDrivenOptionsSheet(false)}
                            />
                            <Animated.View
                              style={{
                                backgroundColor: backgroundColor,
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                padding: 20,
                                paddingBottom: 40,
                              }}
                            >
                              <YStack gap="$4">
                                <Text
                                  fontSize="$6"
                                  fontWeight="bold"
                                  color="$color"
                                  textAlign="center"
                                >
                                  {t('routeDetail.drivenOptions') || 'Driven Options'}
                                </Text>

                                <YStack gap="$2">
                                  <TouchableOpacity
                                    onPress={() => {
                                      setShowDrivenOptionsSheet(false);
                                      if (navigation) {
                                        try {
                                          navigation.navigate('AddReview', {
                                            routeId: routeId!,
                                            returnToRouteDetail: true,
                                          } as any);
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
                                    }}
                                    style={{
                                      padding: 16,
                                      backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                                      borderRadius: 12,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12,
                                    }}
                                  >
                                    <Feather name="edit" size={20} color={iconColor} />
                                    <Text fontSize="$4" color="$color">
                                      {t('routeDetail.editReview') || 'Edit Review'}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => {
                                      setShowDrivenOptionsSheet(false);
                                      handleUnmarkDriven();
                                    }}
                                    style={{
                                      padding: 16,
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      borderRadius: 12,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12,
                                    }}
                                  >
                                    <Feather name="x-circle" size={20} color="#EF4444" />
                                    <Text fontSize="$4" color="#EF4444">
                                      {t('routeDetail.unmarkAsDriven') || 'Unmark as Driven'}
                                    </Text>
                                  </TouchableOpacity>
                                </YStack>

                                <Button
                                  variant="outlined"
                                  size="lg"
                                  onPress={() => setShowDrivenOptionsSheet(false)}
                                >
                                  {t('common.cancel') || 'Cancel'}
                                </Button>
                              </YStack>
                            </Animated.View>
                          </View>
                        </Animated.View>
                      </Modal>
                    )}
                  </View>
                )}
              </YStack>
            </ReanimatedAnimated.View>
          </GestureDetector>
        </View>
      </Animated.View>

      {/* CreateRouteSheet Modal for Editing */}
      {showCreateRouteSheet && routeData && (
        <CreateRouteSheet
          visible={showCreateRouteSheet}
          onClose={() => {
            setShowCreateRouteSheet(false);
            // Refresh route data after editing
            handleRefresh();
          }}
          routeId={routeData.id}
          onRouteUpdated={(updatedRouteId) => {
            console.log('Route updated:', updatedRouteId);
            setShowCreateRouteSheet(false);
            // Refresh route data
            handleRefresh();
          }}
          isModal={true}
        />
      )}

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
