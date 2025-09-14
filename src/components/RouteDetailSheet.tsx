import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions, ScrollView, TouchableOpacity, RefreshControl, Alert, Image, Share, Linking, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { YStack, XStack, Text, Card, Button, Progress } from 'tamagui';
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
import { parseRecordingStats, isRecordedRoute, formatRecordingStatsDisplay } from '../utils/routeUtils';
import { RouteExerciseList } from './RouteExerciseList';
import { AddToPresetSheetModal } from './AddToPresetSheet';
import { useModal } from '../contexts/ModalContext';
import { IconButton } from './IconButton';

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
}

export function RouteDetailSheet({
  visible,
  onClose,
  routeId,
  onStartRoute,
  onNavigateToProfile,
  onReopen,
}: RouteDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const { showModal } = useModal();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling for drag-to-dismiss and snap points
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);
  
  // Snap points for resizing (top Y coordinates like RoutesDrawer)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1,   // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4,  // Top at 40% of screen (show 60% - medium)  
      small: height * 0.7,   // Top at 70% of screen (show 30% - small)
      mini: height * 0.85,   // Top at 85% of screen (show 15% - just title)
      dismissed: height,     // Completely off-screen
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

  const snapTo = useCallback((point: number) => {
    currentState.value = point;
    setCurrentSnapPoint(point);
  }, [currentState]);

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
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.large),
        snapPoints.mini,
      );
      
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
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
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
  const [refreshing, setRefreshing] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);
  const [showReviewsDetails, setShowReviewsDetails] = useState(false);
  const [showCommentsDetails, setShowCommentsDetails] = useState(false);

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

  // Handle functions (exact copy from RouteDetailScreen)
  const handleSaveRoute = async () => {
    if (!user) {
      Alert.alert(t('routeDetail.signInRequired') || 'Sign in required', t('routeDetail.pleaseSignInToSave') || 'Please sign in to save routes');
      return;
    }

    try {
      if (isSaved) {
        await supabase.from('saved_routes').delete().eq('route_id', routeId).eq('user_id', user.id);
      } else {
        await supabase.from('saved_routes').insert({
          route_id: routeId,
          user_id: user.id,
          saved_at: new Date().toISOString(),
        });
      }
      setIsSaved(!isSaved);
    } catch (err) {
      console.error('Error toggling save status:', err);
      Alert.alert(t('common.error') || 'Error', t('routeDetail.failedToUpdateSave') || 'Failed to update save status');
    }
  };

  // Handle adding route to preset
  const handleAddToPreset = () => {
    if (!user || !routeId) {
      Alert.alert(t('routeDetail.signInRequired') || 'Sign in required', t('routeDetail.pleaseSignInToAdd') || 'Please sign in to add routes to presets');
      return;
    }

    console.log('🎯 RouteDetailSheet: Closing and opening AddToPresetSheet modal - routeId:', routeId);
    
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
            Alert.alert(
              t('routeDetail.addedToCollection') || 'Added to Collection',
              t('routeDetail.routeHasBeenAdded')?.replace('{collectionName}', presetName) || `Route has been added to "${presetName}"`,
              [{ text: t('common.ok') || 'OK' }]
            );
          }}
          onRouteRemoved={(presetId, presetName) => {
            Alert.alert(
              t('routeDetail.removedFromCollection') || 'Removed from Collection',
              t('routeDetail.routeHasBeenRemoved')?.replace('{collectionName}', presetName) || `Route has been removed from "${presetName}"`,
              [{ text: t('common.ok') || 'OK' }]
            );
          }}
          onPresetCreated={(preset) => {
            Alert.alert(
              t('routeDetail.collectionCreated') || 'Collection Created',
              t('routeDetail.newCollectionCreated')?.replace('{collectionName}', preset.name) || `New collection "${preset.name}" has been created and route added to it`,
              [{ text: t('common.ok') || 'OK' }]
            );
          }}
          onClose={() => {
            // When AddToPresetSheet closes, reopen the RouteDetailSheet
            setTimeout(() => {
              console.log('🎯 AddToPresetSheet closed, reopening RouteDetailSheet - currentRouteId:', currentRouteId);
              if (onReopen) {
                onReopen();
              } else {
                console.warn('🎯 onReopen callback not provided to RouteDetailSheet');
              }
            }, 200); // Increased delay to ensure proper timing
          }}
        />
      );
    }, 300); // Wait for the close animation to complete
  };

  const handleMarkDriven = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error') || 'Error', t('routeDetail.pleaseSignInToMark') || 'Please sign in to mark this route as driven');
      return;
    }

    if (isDriven) {
      // If already driven, show options
      Alert.alert(t('routeDetail.routeReview') || 'Route Review', t('routeDetail.whatWouldYouLikeToDo') || 'What would you like to do?', [
        {
          text: t('routeDetail.addNewReview') || 'Add New Review',
          onPress: () => {
            navigation.navigate('AddReview', { 
              routeId: routeId!,
              returnToRouteDetail: true 
            } as any);
            onClose();
          },
        },
        {
          text: t('routeDetail.unmarkAsDriven') || 'Unmark as Driven',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('driven_routes')
                .delete()
                .eq('route_id', routeId)
                .eq('user_id', user.id);

              if (error) throw error;

              setIsDriven(false);
              Alert.alert(t('common.success') || 'Success', t('routeDetail.routeUnmarkedAsDriven') || 'Route unmarked as driven');
            } catch (err) {
              console.error('Error unmarking route:', err);
              Alert.alert(t('common.error') || 'Error', t('routeDetail.failedToUnmark') || 'Failed to unmark route as driven');
            }
          },
        },
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
      ]);
    } else {
      // First time marking as driven
      navigation.navigate('AddReview', { 
        routeId: routeId!,
        returnToRouteDetail: true 
      } as any);
      onClose();
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
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert(t('common.error') || 'Error', t('routeDetail.failedToShare') || 'Failed to share route');
    }
  };

  const handleStartRoute = () => {
    if (!routeId) return;
    
    if (onStartRoute) {
      onStartRoute(routeId);
    } else {
      // Default behavior - navigate to map
      navigation.navigate('MainTabs', {
        screen: 'MapTab',
        params: { screen: 'MapScreen', params: { routeId: routeId! } },
      } as any);
    }
    onClose();
  };

  const handleNavigateToProfile = (userId: string) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(userId);
    } else {
      navigation.navigate('PublicProfile', { userId });
      onClose();
    }
  };

  const handleShowOptions = () => {
    // Track options button press
    AppAnalytics.trackButtonPress('options_menu', 'RouteDetailSheet', {
      route_id: routeData?.id,
    }).catch(() => {
      // Silently fail analytics
    });

    const alertButtons: any[] = [
      {
        text: t('routeDetail.openInMaps') || 'Open in Maps',
        onPress: handleOpenInMaps,
      },
      {
        text: t('routeDetail.shareRoute') || 'Share Route',
        onPress: handleShare,
      },
      user?.id === routeData?.creator_id
        ? {
            text: t('routeDetail.deleteRoute') || 'Delete Route',
            onPress: handleDelete,
            style: 'destructive',
          }
        : undefined,
      user?.id !== routeData?.creator_id
        ? {
            text: t('routeDetail.reportRoute') || 'Report Route',
            onPress: () => setShowReportDialog(true),
            style: 'destructive',
          }
        : undefined,
      {
        text: t('common.cancel') || 'Cancel',
        style: 'cancel',
      },
    ].filter(Boolean);

    Alert.alert(t('routeDetail.routeOptions') || 'Route Options', '', alertButtons);
  };

  const handleOpenInMaps = () => {
    if (!routeData?.waypoint_details?.length) {
      Alert.alert(t('common.error') || 'Error', t('routeDetail.noWaypointsAvailable') || 'No waypoints available for this route');
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
      Alert.alert(t('common.error') || 'Error', t('routeDetail.unableToDelete') || 'Unable to delete route');
      return;
    }

    Alert.alert(
      t('routeDetail.deleteRouteTitle') || 'Delete Route',
      t('routeDetail.deleteRouteConfirm') || 'Are you sure you want to delete this route? This action cannot be undone.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('routes').delete().eq('id', routeData.id || '');
              if (error) throw error;
              onClose();
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert(t('common.error') || 'Error', t('routeDetail.failedToDelete') || 'Failed to delete route');
            }
          },
        },
      ],
    );
  };

  const handleAdminDelete = async () => {
    if (!showAdminControls || !routeData) return;

    Alert.alert(
      t('routeDetail.adminDeleteTitle') || 'Admin: Delete Route',
      t('routeDetail.adminDeleteConfirm') || 'Are you sure you want to delete this route as an admin? This action cannot be undone.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('routes').delete().eq('id', routeData.id || '');
              if (error) throw error;
              onClose();
              Alert.alert(t('common.success') || 'Success', t('routeDetail.routeDeletedByAdmin') || 'Route deleted by admin');
            } catch (err) {
              console.error('Admin delete error:', err);
              Alert.alert(t('common.error') || 'Error', t('routeDetail.failedToDelete') || 'Failed to delete route');
            }
          },
        },
      ],
    );
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
    if (routeData.vehicle_types && Array.isArray(routeData.vehicle_types) && routeData.vehicle_types.length > 0) {
      metadata.push({ label: 'Vehicle Types', value: routeData.vehicle_types.join(', '), icon: 'truck' });
    }
    if (routeData.transmission_type) {
      metadata.push({ label: 'Transmission', value: routeData.transmission_type, icon: 'settings' });
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
      metadata.push({ label: 'Public Route', value: routeData.is_public ? 'Yes' : 'No', icon: routeData.is_public ? 'globe' : 'lock' });
    }
    if (routeData.is_verified !== undefined) {
      metadata.push({ label: 'Verified', value: routeData.is_verified ? 'Yes' : 'No', icon: routeData.is_verified ? 'check-circle' : 'alert-circle' });
    }
    if ((routeData as any).is_draft !== undefined) {
      metadata.push({ label: 'Draft', value: (routeData as any).is_draft ? 'Yes' : 'No', icon: (routeData as any).is_draft ? 'edit' : 'check' });
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

      items.push({
        type: 'map',
        waypoints,
        region,
        routePath,
        showStartEndMarkers: true,
      });
    }

    // Add media attachments
    const uniqueMedia = routeData?.media_attachments?.filter((attachment, index, arr) => 
      arr.findIndex(a => a.url === attachment.url && a.type === attachment.type) === index
    ) || [];
    
    const validMedia = uniqueMedia.filter((attachment) => {
      const isValidUrl = attachment.url && (
        attachment.url.startsWith('http://') || 
        attachment.url.startsWith('https://') || 
        attachment.url.startsWith('file://') ||
        attachment.url.startsWith('data:') ||
        attachment.url.startsWith('content://')
      );
      return isValidUrl;
    });
    
    validMedia.forEach((attachment) => {
      items.push({ 
        type: attachment.type, 
        url: attachment.url,
        description: attachment.description 
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
          <View style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#000', 
            justifyContent: 'center', 
            alignItems: 'center',
            borderRadius: 12,
          }}>
            <View style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 50,
              width: 80,
              height: 80,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
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
            await Promise.all([checkSavedStatus(), checkDrivenStatus()]);
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
        await Promise.all([checkSavedStatus(), checkDrivenStatus()]);
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
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
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
                  height: height,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                animatedGestureStyle
              ]}
            >
              <YStack
                padding="$4"
                paddingBottom={insets.bottom || 20}
                gap="$4"
                flex={1}
              >
                  {/* Drag Handle */}
                  <View style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}>
                    <View style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colorScheme === 'dark' ? '#666' : '#CCC',
                    }} />
                  </View>

              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontWeight="bold" color="$color" numberOfLines={1} flex={1}>
                  {routeData?.name || t('routeDetail.loading') || 'Loading...'}
                </Text>
                <XStack gap="$2">
                  {showAdminControls && (
                    <TouchableOpacity onPress={() => {
                      AppAnalytics.trackButtonPress('admin_delete', 'RouteDetailSheet', {
                        route_id: routeData?.id,
                      }).catch(() => {});
                      handleAdminDelete();
                    }}>
                      <Feather name="trash-2" size={20} color="red" />
                    </TouchableOpacity>
                  )}
                  {user?.id === routeData?.creator_id && (
                    <TouchableOpacity 
                      onPress={() => {
                        AppAnalytics.trackButtonPress('edit_route', 'RouteDetailSheet', {
                          route_id: routeData?.id,
                        }).catch(() => {});
                        navigation.navigate('CreateRoute', { routeId: routeData?.id });
                        onClose();
                      }}
                    >
                      <Feather name="edit-2" size={20} color={iconColor} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleShowOptions}>
                    <Feather name="more-vertical" size={20} color={iconColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose}>
                    <Feather name="x" size={24} color={iconColor} />
                  </TouchableOpacity>
                </XStack>
              </XStack>

              {/* Show content only if not in mini mode */}
              {currentSnapPoint !== snapPoints.mini && (
                <>
              {loading ? (
                <YStack f={1} jc="center" ai="center">
                  <Text>{t('routeDetail.loading') || 'Loading route data...'}</Text>
                </YStack>
              ) : error || !routeData ? (
                <YStack f={1} jc="center" ai="center" padding="$4">
                  <Text color="$red10">{error || t('routeDetail.routeNotFound') || 'Route not found'}</Text>
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
                      <View style={{ height: height * 0.3, borderRadius: 12, overflow: 'hidden' }}>
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
                            backgroundColor="rgba(0,0,0,0.5)"
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
                          label={isSaved ? (t('routeDetail.saved') || 'Saved') : (t('routeDetail.saveRoute') || 'Save')}
                          onPress={handleSaveRoute}
                          selected={isSaved}
                          backgroundColor="transparent"
                          borderColor="transparent"
                          flex={1}
                        />
                        <IconButton
                          icon="check-circle"
                          label={isDriven ? (t('routeDetail.markedAsDriven') || 'Marked as Driven') : (t('routeDetail.markAsDriven') || 'Mark as Driven')}
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
                          backgroundColor={isSaved ? 'transparent' : 'transparent'}
                          borderColor={isSaved ? 'transparent' : 'transparent'}                    
                          flex={1}
                        />
                        <IconButton
                          icon="map"
                          label={t('routeDetail.addToCollection') || 'Add to Collection'}
                          onPress={() => {
                            if (routeData?.exercises) {
                              navigation.navigate('RouteExercise', {
                                routeId: routeId!,
                                exercises: routeData.exercises,
                                routeName: routeData.name,
                                startIndex: 0,
                              });
                              onClose();
                            }
                          }}
                          backgroundColor={isSaved ? 'transparent' : 'transparent'}
                          borderColor={isSaved ? 'transparent' : 'transparent'}                    
                          flex={1}
                        />
                      </XStack>
                    </YStack>

                    {/* Basic Info Card */}
                    <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                      <YStack gap="$2">
                        <XStack gap="$2" alignItems="center">
                          <Text fontSize="$5" fontWeight="600" color="$color">
                            {routeData.difficulty?.toUpperCase() || ''}
                          </Text>
                          <Text fontSize="$4" color="$gray11">•</Text>
                          <Text fontSize="$5" color="$gray11">
                            {routeData.spot_type || ''}
                          </Text>
                          <Text fontSize="$4" color="$gray11">•</Text>
                          <Text fontSize="$5" color="$gray11">
                            {routeData.category || ''}
                          </Text>
                        </XStack>

                        {/* Creator info with clickable name */}
                        {routeData.creator && (
                          <XStack alignItems="center" gap="$2" marginTop="$2">
                            <TouchableOpacity
                              onPress={() => handleNavigateToProfile(routeData.creator?.id || '')}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
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
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <XStack alignItems="center" gap="$2">
                              <Feather name="info" size={20} color={iconColor} />
                              <Text fontSize="$5" fontWeight="600" color="$color">
                                {t('routeDetail.additionalInfo') || 'Additional Information'}
                              </Text>
                            </XStack>
                            <Feather 
                              name={showMetadataDetails ? "chevron-up" : "chevron-down"} 
                              size={20} 
                              color={iconColor} 
                            />
                          </TouchableOpacity>

                          {showMetadataDetails && (
                            <YStack gap="$2">
                              {getAdditionalMetadata().map((item, index) => (
                                <XStack key={index} justifyContent="space-between" alignItems="center" paddingVertical="$1">
                                  <XStack alignItems="center" gap="$2" flex={1}>
                                    <Feather name={item.icon as any} size={16} color="$gray11" />
                                    <Text fontSize="$4" color="$gray11" flex={1}>
                                      {item.label}
                                    </Text>
                                  </XStack>
                                  <Text fontSize="$4" fontWeight="600" color="$color" textAlign="right" flex={1}>
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
                        const recordingStats = parseRecordingStats(routeData.description || '');
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
                                  <XStack key={index} justifyContent="space-between" alignItems="center">
                                    <XStack alignItems="center" gap="$2">
                                      <Feather name={stat.icon as any} size={16} color="$gray11" />
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
                                {t('routeDetail.recordedWithGPS') || 'Recorded with live GPS tracking'}
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
                                    navigation.navigate('RouteExercise', {
                                      routeId: routeId!,
                                      exercises: routeData.exercises,
                                      routeName: routeData.name,
                                      startIndex: 0,
                                    });
                                    onClose();
                                  }
                                }}
                                backgroundColor="$blue10"
                                icon={<Feather name="play" size={16} color="white" />}
                                size="sm"
                              >
                                <Text color="white" fontSize="$3" fontWeight="600">
                                  {allExercisesCompleted ? (t('routeDetail.reviewExercises') || 'Review') : (t('routeDetail.startExercises') || 'Start')}
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
                                  navigation.navigate('RouteExercise', {
                                    routeId: routeId!,
                                    exercises: routeData.exercises,
                                    routeName: routeData.name || 'Route',
                                    startIndex: index,
                                  });
                                  onClose();
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
                                      {Math.round((exerciseStats.completed / exerciseStats.total) * 100)}%
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
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <XStack alignItems="center" gap="$2">
                            <Feather name="star" size={20} color={iconColor} />
                            <Text fontSize="$5" fontWeight="600" color="$color">
                              {t('routeDetail.reviews') || 'Reviews'}
                            </Text>
                            {reviews.length > 0 && (
                              <View style={{
                                backgroundColor: '#00E6C3',
                                borderRadius: 12,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                minWidth: 20,
                                alignItems: 'center',
                              }}>
                                <Text fontSize={12} color="#000" fontWeight="bold">
                                  {reviews.length}
                                </Text>
                              </View>
                            )}
                          </XStack>
                          <Feather 
                            name={showReviewsDetails ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={iconColor} 
                          />
                        </TouchableOpacity>

                        {showReviewsDetails && (
                          <YStack>
                            <ReviewSection routeId={routeId!} reviews={reviews} onReviewAdded={loadReviews} />
                          </YStack>
                        )}
                      </YStack>
                    </Card>

                    {/* Comments Section */}
                    <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                      <YStack gap="$3">
                        <TouchableOpacity
                          onPress={() => setShowCommentsDetails(!showCommentsDetails)}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <XStack alignItems="center" gap="$2">
                            <Feather name="message-circle" size={20} color={iconColor} />
                            <Text fontSize="$5" fontWeight="600" color="$color">
                              {t('routeDetail.comments') || 'Comments'}
                            </Text>
                          </XStack>
                          <Feather 
                            name={showCommentsDetails ? "chevron-up" : "chevron-down"} 
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
                </>
              )}

              </YStack>
            </ReanimatedAnimated.View>
          </GestureDetector>
        </View>
      </Animated.View>
    </Modal>
  );
}
