import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Image,
  Dimensions,
  Alert,
  View,
  Modal,
  useColorScheme,
  Share,
  Linking,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { YStack, XStack, Text, Card, Button, TextArea, Progress, Separator } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Map } from '../components/Map';
import { Feather } from '@expo/vector-icons';
import { Play } from '@tamagui/lucide-icons';
import Carousel from 'react-native-reanimated-carousel';
import { WebView } from 'react-native-webview';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { format } from 'date-fns';
import { Database } from '../lib/database.types';
import { ReviewSection } from '../components/ReviewSection';
import { CommentsSection } from '../components/CommentsSection';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { AppAnalytics } from '../utils/analytics';
import { MediaCarousel, CarouselMediaItem } from '../components/MediaCarousel';
import { Region } from '../types/maps';
import { ReportDialog } from '../components/report/ReportDialog';
import { useTranslation } from '../contexts/TranslationContext';
import {
  parseRecordingStats,
  isRecordedRoute,
  formatRecordingStatsDisplay,
} from '../utils/routeUtils';
import { RouteExerciseList, ExerciseDetailModal } from '../components';
import { AddToPresetSheetModal } from '../components/AddToPresetSheet';
import { useModal } from '../contexts/ModalContext';
// Tour imports disabled to prevent performance issues
// import { useTourTarget } from '../components/TourOverlay';
// import { useScreenTours } from '../utils/screenTours';
// import { useTour } from '../contexts/TourContext';

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type RouteRow = Database['public']['Tables']['routes']['Row'];
type Json = Database['public']['Tables']['routes']['Row']['waypoint_details'];

type RouteDetailProps = {
  route: {
    params: {
      routeId: string;
    };
  };
};

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

function getTranslation(t: (key: string) => string, key: string, fallback: string): string {
  const translation = t(key);
  return translation === key ? fallback : translation;
}

export function RouteDetailScreen({ route }: RouteDetailProps) {
  const { t } = useTranslation();
  const { routeId } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const { showModal } = useModal();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({
    rating: 0,
    content: '',
    difficulty: 'beginner',
    images: [],
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const HERO_HEIGHT = windowHeight * 0.6; // 60% of screen height

  // New state variables
  const [isSaved, setIsSaved] = useState(false);
  const [isDriven, setIsDriven] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    type: 'spam' as Database['public']['Enums']['report_type'],
    content: '',
  });
  const [carouselHeight, setCarouselHeight] = useState(300); // Height for the carousel
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showAdminControls, setShowAdminControls] = useState(false);

  // Exercise-related state
  const [exerciseStats, setExerciseStats] = useState<{
    completed: number;
    total: number;
    lastSessionAt?: string;
  } | null>(null);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(new Set());
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);

  // Exercise detail modal state - Removed, now navigates directly to RouteExerciseScreen

  // Tour targets disabled for RouteDetailScreen to prevent performance issues
  // const saveButtonRef = useTourTarget('RouteDetailScreen.SaveButton');
  // const exercisesCardRef = useTourTarget('RouteDetailScreen.ExercisesCard');
  // const mapCardRef = useTourTarget('RouteDetailScreen.MapCard');
  // const reviewsSectionRef = useTourTarget('RouteDetailScreen.ReviewsSection');

  // Screen tours integration disabled
  // const { triggerScreenTour } = useScreenTours();
  // const tourContext = useTour();

  useEffect(() => {
    if (routeId) {
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
          
          // RouteDetailScreen tours disabled due to performance issues
          // TODO: Re-enable after fixing tour target registration issues
          
        } catch (error) {
          console.error('Error loading route data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load route data');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [routeId, user]); // Removed tour dependencies

  // Separate useEffect to prevent multiple tour triggers
  useEffect(() => {
    loadRouteData();
    checkSavedStatus();
    checkDrivenStatus();
    loadReviews();
  }, [routeId]);
  
  useEffect(() => {
    // Listen for navigation focus events
    const unsubscribe = navigation.addListener('focus', () => {
      // Check if we need to refresh data
      const params = navigation.getState().routes.find((r) => r.name === 'RouteDetail')?.params;
      if (params && ('shouldRefreshReviews' in params || 'shouldRefresh' in params)) {
        // Refresh all route data if shouldRefresh is true
        if ('shouldRefresh' in params && params.shouldRefresh) {
          loadRouteData();
          checkSavedStatus();
          checkDrivenStatus();
          loadReviews();
          // Clear the refresh flag
          navigation.setParams({ shouldRefresh: undefined });
        }
        // Refresh only reviews if shouldRefreshReviews is true
        if ('shouldRefreshReviews' in params && params.shouldRefreshReviews) {
          loadReviews();
          // Clear the refresh flag
          navigation.setParams({ shouldRefreshReviews: undefined });
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

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

  // Load exercise statistics when route data changes
  useEffect(() => {
    if (routeData?.exercises && user) {
      loadExerciseStats();
    }
  }, [routeData?.exercises, user]);

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

    // Parse JSON fields
    const waypoints = Array.isArray(routeResponse.waypoint_details)
      ? routeResponse.waypoint_details.map((wp) => ({
          lat: typeof wp?.lat === 'string' ? parseFloat(wp.lat) : (wp?.lat ?? 0),
          lng: typeof wp?.lng === 'string' ? parseFloat(wp.lng) : (wp?.lng ?? 0),
          title: String(wp?.title ?? ''),
          description: wp?.description ? String(wp.description) : undefined,
          ...wp, // Preserve other Json properties
        }))
      : [];
    const media = Array.isArray(routeResponse.media_attachments)
      ? routeResponse.media_attachments.map((m) => ({
          type: (m?.type as 'image' | 'video' | 'youtube') ?? 'image',
          url: String(m?.url ?? ''),
          description: m?.description ? String(m.description) : undefined,
          ...m, // Preserve other Json properties
        }))
      : [];

    // Parse exercises from suggested_exercises field in database
    let exercises: Exercise[] = [];
    if (routeResponse.suggested_exercises) {
      try {
        const exercisesData = Array.isArray(routeResponse.suggested_exercises)
          ? routeResponse.suggested_exercises
          : JSON.parse(String(routeResponse.suggested_exercises));

        // Process each exercise and fetch full data if it's from a learning path
        const enrichedExercises = await Promise.all(
          exercisesData.map(async (ex: any) => {
            // If this exercise is from a learning path, fetch the complete data
            if (ex.learning_path_exercise_id) {
              try {
                const { data: fullExercise } = await supabase
                  .from('learning_path_exercises')
                  .select('*')
                  .eq('id', ex.learning_path_exercise_id)
                  .single();

                if (fullExercise) {
                  // Merge route exercise data with full learning path exercise data
                  return {
                    id: ex.id || ex.learning_path_exercise_id,
                    title: fullExercise.title || ex.title || 'Exercise',
                    description: fullExercise.description || ex.description || '',
                    duration: ex.duration || ex.duration_minutes,
                    repetitions: ex.repetitions,
                    order_index: ex.order_index,
                    // Learning path data
                    learning_path_exercise_id: ex.learning_path_exercise_id,
                    learning_path_id: ex.learning_path_id,
                    learning_path_title: ex.learning_path_title,
                    // Media fields from learning path exercise (the missing data!)
                    youtube_url: fullExercise.youtube_url,
                    icon: fullExercise.icon,
                    image: fullExercise.image,
                    embed_code: fullExercise.embed_code,
                    language_specific_media: fullExercise.language_specific_media,
                    // Quiz fields from learning path exercise
                    has_quiz: fullExercise.has_quiz || ex.has_quiz,
                    quiz_required: fullExercise.quiz_required || ex.quiz_required,
                    quiz_pass_score: fullExercise.quiz_pass_score || ex.quiz_pass_score,
                    quiz_data: fullExercise.quiz_data || ex.quiz_data,
                    // Other fields from learning path exercise
                    repeat_count: fullExercise.repeat_count || ex.repeat_count,
                    bypass_order: fullExercise.bypass_order || ex.bypass_order,
                    is_locked: fullExercise.is_locked || ex.is_locked,
                    lock_password: fullExercise.lock_password || ex.lock_password,
                    paywall_enabled: fullExercise.paywall_enabled || ex.paywall_enabled,
                    price_usd: fullExercise.price_usd || ex.price_usd,
                    price_sek: fullExercise.price_sek || ex.price_sek,
                    source: ex.source || 'learning_path',
                    source_route_id: fullExercise.source_route_id,
                    source_type: fullExercise.source_type,
                    created_at: fullExercise.created_at,
                    updated_at: fullExercise.updated_at,
                  };
                }
              } catch (error) {
                console.error('Error fetching full exercise data:', error);
              }
            }

            // Fallback to route exercise data only (for custom exercises)
            return {
              id: ex.id || `exercise_${Date.now()}`,
              title: ex.title || 'Exercise',
              description: ex.description || '',
              duration: ex.duration || ex.duration_minutes,
              repetitions: ex.repetitions,
              order_index: ex.order_index,
              // Basic fields from route exercise
              youtube_url: ex.youtube_url,
              icon: ex.icon,
              image: ex.image,
              embed_code: ex.embed_code,
              has_quiz: ex.has_quiz,
              quiz_data: ex.quiz_data,
              source: ex.source || 'custom',
              is_user_generated: ex.is_user_generated,
              category: ex.category,
              difficulty_level: ex.difficulty_level,
              vehicle_type: ex.vehicle_type,
              visibility: ex.visibility,
              creator_id: ex.creator_id,
              created_at: ex.created_at,
            };
          }),
        );

        exercises = enrichedExercises;
      } catch (err) {
        console.error('Error parsing exercises:', err);
      }
    }

    // Transform the raw data into our expected format
    const transformedData: RouteData = {
      ...routeResponse,
      waypoint_details: waypoints as (WaypointDetail & Json)[],
      media_attachments: media as (MediaAttachment & Json)[],
      exercises: exercises, // Add parsed exercises
      creator: routeResponse.creator || undefined,
      reviews: routeResponse.reviews || [],
      average_rating: routeResponse.average_rating || [],
    };

    setRouteData(transformedData);
  }, [routeId]);

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

  const handleSaveRoute = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to save routes');
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
      Alert.alert('Error', 'Failed to update save status');
    }
  };

  // Handle adding route to preset
  const handleAddToPreset = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add routes to presets');
      return;
    }

    showModal(
      <AddToPresetSheetModal
        routeId={routeId}
        onRouteAdded={(presetId, presetName) => {
          Alert.alert(
            'Added to Preset',
            `Route has been added to "${presetName}"`,
            [{ text: 'OK' }]
          );
        }}
        onRouteRemoved={(presetId, presetName) => {
          Alert.alert(
            'Removed from Preset',
            `Route has been removed from "${presetName}"`,
            [{ text: 'OK' }]
          );
        }}
        onPresetCreated={(preset) => {
          Alert.alert(
            'Preset Created',
            `New preset "${preset.name}" has been created and route added to it`,
            [{ text: 'OK' }]
          );
        }}
      />
    );
  };

  const handleMarkDriven = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to mark this route as driven');
      return;
    }

    if (isDriven) {
      // If already driven, show options
      Alert.alert('Route Review', 'What would you like to do?', [
        {
          text: 'View My Review',
          onPress: () => {
            // Find the user's review in the reviews list
            const userReview = reviews.find((review) => review.user_id === user?.id);
            if (userReview) {
              Alert.alert(
                'Your Review',
                `Rating: ${userReview.rating}/5\n` +
                  `${userReview.content}\n` +
                  `Difficulty: ${userReview.difficulty}\n` +
                  `Visited: ${new Date(userReview.visited_at || '').toLocaleDateString()}`,
              );
            } else {
              Alert.alert(
                'No Review Found',
                "You have marked this route as driven but haven't left a review yet.",
              );
            }
          },
        },
        {
          text: 'Add New Review',
          onPress: () => {
            navigation.navigate('AddReview', { routeId: routeId });
          },
        },
        {
          text: 'Unmark as Driven',
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
              Alert.alert('Success', 'Route unmarked as driven');
            } catch (err) {
              console.error('Error unmarking route:', err);
              Alert.alert('Error', 'Failed to unmark route as driven');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } else {
      // First time marking as driven
      navigation.navigate('AddReview', { routeId: routeId });
    }
  };

  const handleReport = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to report routes');
      return;
    }

    try {
      await supabase.from('reports').insert({
        reportable_id: routeId,
        reportable_type: 'route',
        reporter_id: user.id,
        report_type: reportData.type,
        content: reportData.content,
        status: 'pending',
      });

      setShowReportModal(false);
      Alert.alert('Success', 'Report submitted successfully');
    } catch (err) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const handleShare = async () => {
    if (!routeData) return;

    const baseUrl = 'https://routes.vromm.se';
    const shareUrl = `${baseUrl}/?route=${routeData.id}`;

    try {
      await Share.share({
        message: routeData.description || `Check out this route: ${routeData.name}`,
        url: shareUrl, // iOS only
        title: routeData.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share route');
    }
  };

  const handleDelete = async () => {
    if (!user || !routeData) {
      Alert.alert('Error', 'Unable to delete route');
      return;
    }

    const routeIdToDelete = routeData.id; // Store ID before deletion

    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('routes').delete().eq('id', routeIdToDelete);

              if (error) throw error;

              // Clear the route data before navigating
              setRouteData(null);
              navigation.goBack();
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ],
    );
  };

  const handleAdminDelete = async () => {
    if (!showAdminControls || !routeData) return;

    Alert.alert(
      'Admin: Delete Route',
      'Are you sure you want to delete this route as an admin? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('routes').delete().eq('id', routeData.id);

              if (error) throw error;

              // Clear the route data before navigating
              setRouteData(null);
              navigation.goBack();

              // Show confirmation
              Alert.alert('Success', 'Route deleted by admin');
            } catch (err) {
              console.error('Admin delete error:', err);
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ],
    );
  };

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

      // Calculate region from waypoints
      const lats = waypoints.map((w) => w.latitude);
      const lngs = waypoints.map((w) => w.longitude);
      const region: Region = {
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        latitudeDelta: Math.max(...lats) - Math.min(...lats) + 0.02,
        longitudeDelta: Math.max(...lngs) - Math.min(...lngs) + 0.02,
      };

      // Create route path for recorded routes (more than just waypoints)
      const routePath = waypoints.length > 2 ? waypoints : undefined;
      const showStartEndMarkers =
        waypoints.length > 2 &&
        (routeData.drawing_mode === 'waypoint' || routeData.drawing_mode === 'record');

      // Handle both web and iOS pen drawing formats
      let penDrawingCoordinates: any[] = [];
      let actualDrawingMode = routeData.drawing_mode;

      if (routeData.drawing_mode === 'pen') {
        // WEB FORMAT: Pen coordinates are stored as the main waypoints
        console.log('🎨 [RouteDetail] WEB FORMAT - Pen coordinates from waypoints');
        penDrawingCoordinates = waypoints.map((wp) => ({
          latitude: wp.latitude,
          longitude: wp.longitude,
        }));
        actualDrawingMode = 'pen';
      } else if (routeData.metadata?.coordinates?.length > 0) {
        // iOS FORMAT: Pen coordinates are in metadata
        console.log('🎨 [RouteDetail] iOS FORMAT - Pen coordinates from metadata');
        penDrawingCoordinates = routeData.metadata.coordinates;
        actualDrawingMode = routeData.metadata.actualDrawingMode || routeData.drawing_mode;
      }

      console.log('🎨 [RouteDetail] Final pen drawing setup:', {
        format: routeData.drawing_mode === 'pen' ? 'WEB' : 'iOS',
        originalDrawingMode: routeData.drawing_mode,
        actualDrawingMode,
        penCoordinatesLength: penDrawingCoordinates.length,
        waypointsLength: waypoints.length,
        penSample: penDrawingCoordinates.slice(0, 2),
      });

      items.push({
        type: 'map',
        waypoints,
        region,
        routePath,
        showStartEndMarkers: true, // Always show markers for better visibility
        drawingMode: actualDrawingMode,
        penDrawingCoordinates,
      });
    }

    // Add media attachments (deduplicated) - include videos
    const uniqueMedia = routeData?.media_attachments?.filter((attachment, index, arr) => 
      arr.findIndex(a => a.url === attachment.url && a.type === attachment.type) === index
    ) || [];
    
    console.log('📷 [RouteDetail] Media attachments:', {
      total: routeData?.media_attachments?.length || 0,
      afterDedup: uniqueMedia.length,
      mediaTypes: uniqueMedia.map(m => ({ type: m.type, url: m.url.substring(0, 50) + '...' }))
    });
    
    // Validate and filter out invalid URLs
    const validMedia = uniqueMedia.filter((attachment) => {
      const isValidUrl = attachment.url && (
        attachment.url.startsWith('http://') || 
        attachment.url.startsWith('https://') || 
        attachment.url.startsWith('file://') ||
        attachment.url.startsWith('data:') ||
        attachment.url.startsWith('content://')
      );
      
      if (!isValidUrl) {
        console.warn('⚠️ [RouteDetail] Invalid media URL detected (skipping):', {
          type: attachment.type,
          url: attachment.url,
          description: attachment.description
        });
        return false;
      }
      
      return true;
    });

    console.log('📷 [RouteDetail] Valid media after URL validation:', {
      beforeValidation: uniqueMedia.length,
      afterValidation: validMedia.length,
      skipped: uniqueMedia.length - validMedia.length
    });
    
    validMedia.forEach((attachment) => {
      console.log('📷 [RouteDetail] Adding valid media item:', { type: attachment.type, url: attachment.url });
      items.push({ 
        type: attachment.type, 
        url: attachment.url,
        description: attachment.description 
      });
    });

    console.log('🎬 [RouteDetail] Final carousel items:', {
      totalItems: items.length,
      itemTypes: items.map(i => i.type)
    });

    return items;
  };

  const renderCarouselItem = ({ item }: { item: any }) => {
    console.log('🎬 [RouteDetail] Rendering carousel item:', { type: item.type, url: item.url });
    
    if (item.type === 'map') {
      console.log('🎨 [RouteDetail] Rendering map carousel item with:', {
        waypointsLength: item.waypoints?.length || 0,
        penCoordinatesLength: item.penDrawingCoordinates?.length || 0,
        drawingMode: item.drawingMode,
        hasPenCoordinates: !!item.penDrawingCoordinates,
        penSample: item.penDrawingCoordinates?.slice(0, 2),
      });

      return (
        <Map
          waypoints={item.waypoints}
          region={item.region}
          style={{ width: windowWidth, height: HERO_HEIGHT }}
          zoomEnabled={true}
          scrollEnabled={false}
          routePath={item.routePath}
          showStartEndMarkers={item.showStartEndMarkers}
          drawingMode={item.drawingMode}
          penDrawingCoordinates={item.penDrawingCoordinates}
        />
      );
    } else if (item.type === 'image') {
      console.log('📷 [RouteDetail] Rendering image:', item.url);
      return (
        <ImageWithFallback
          source={{ uri: item.url }}
          style={{ width: windowWidth, height: HERO_HEIGHT }}
          resizeMode="cover"
        />
      );
    } else if (item.type === 'video') {
      console.log('🎥 [RouteDetail] Rendering video preview:', item.url);
      return (
        <TouchableOpacity 
          style={{ width: windowWidth, height: HERO_HEIGHT, position: 'relative' }}
          onPress={() => console.log('🎥 Video play requested:', item.url)}
          activeOpacity={0.8}
        >
          <View style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#000', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <View style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 50,
              width: 100,
              height: 100,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Play size={48} color="#FFF" />
            </View>
            <Text style={{ color: '#FFF', marginTop: 16, fontSize: 16, fontWeight: '600' }}>
              Tap to play video
            </Text>
          </View>
        </TouchableOpacity>
      );
    } else if (item.type === 'youtube') {
      console.log('📺 [RouteDetail] Rendering YouTube:', item.url);
      return (
        <WebView 
          source={{ uri: item.url }} 
          style={{ width: windowWidth, height: HERO_HEIGHT }}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      );
    }
    console.warn('⚠️ [RouteDetail] Unknown carousel item type:', item.type);
    return null;
  };

  const handleShowOptions = () => {
    const alertButtons: any[] = [
      {
        text: t('routeDetail.openInMaps'),
        onPress: handleOpenInMaps,
      },
      {
        text: t('routeDetail.shareRoute'),
        onPress: handleShare,
      },
      user?.id === routeData?.creator_id
        ? {
            text: t('routeDetail.deleteRoute'),
            onPress: handleDelete,
            style: 'destructive',
          }
        : undefined,
      user?.id !== routeData?.creator_id
        ? {
            text: t('routeDetail.reportRoute'),
            onPress: () => setShowReportDialog(true),
            style: 'destructive',
          }
        : undefined,
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
    ].filter(Boolean);

    Alert.alert(t('routeDetail.routeOptions'), '', alertButtons);
  };

  const handleOpenInMaps = () => {
    if (!routeData?.waypoint_details?.length) {
      Alert.alert('Error', 'No waypoints available for this route');
      return;
    }

    const waypoints = routeData.waypoint_details;
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${
      waypoints[waypoints.length - 1].lng
    }`;

    // For recorded routes with many waypoints, limit intermediate waypoints to avoid URL length issues
    const maxIntermediateWaypoints = 8;
    const intermediateWaypoints = waypoints.slice(1, -1);

    // If too many waypoints, sample them evenly
    let selectedWaypoints = intermediateWaypoints;
    if (intermediateWaypoints.length > maxIntermediateWaypoints) {
      const step = Math.floor(intermediateWaypoints.length / maxIntermediateWaypoints);
      selectedWaypoints = intermediateWaypoints
        .filter((_, index) => index % step === 0)
        .slice(0, maxIntermediateWaypoints);
    }

    const waypointsStr = selectedWaypoints.map((wp) => `${wp.lat},${wp.lng}`).join('|');

    // Create URL options for different map apps
    const mapOptions = [
      {
        title: 'Google Maps',
        url: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsStr ? `&waypoints=${waypointsStr}` : ''}`,
      },
    ];

    // Add Apple Maps option on iOS
    if (Platform.OS === 'ios') {
      mapOptions.unshift({
        title: 'Apple Maps',
        url: `maps://?saddr=${origin}&daddr=${destination}${waypointsStr ? `&via=${waypointsStr}` : ''}`,
      });
    }

    // Add Waze option
    mapOptions.push({
      title: 'Waze',
      url: `https://waze.com/ul?ll=${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}&navigate=yes`,
    });

    // Show selection dialog
    const alertButtons = mapOptions.map((option) => ({
      text: option.title,
      onPress: () => {
        Linking.canOpenURL(option.url).then((supported) => {
          if (supported) {
            Linking.openURL(option.url);
          } else {
            Alert.alert(
              'Error',
              `Could not open ${option.title}. Please make sure the app is installed.`,
            );
          }
        });
      },
    }));

    alertButtons.push({
      text: 'Cancel',
      style: 'cancel' as const,
    });

    Alert.alert('Open in Maps', 'Choose which map app to use:', alertButtons);
  };

  const loadExerciseStats = async () => {
    try {
      if (!user || !routeData?.exercises) return;

      // Get ALL route exercise sessions for this user and route
      const { data: sessions } = await supabase
        .from('route_exercise_sessions')
        .select('*')
        .eq('route_id', routeId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!sessions?.length) {
        setExerciseStats({
          completed: 0,
          total: routeData.exercises.length,
        });
        return;
      }

      // Get the latest completed session for timestamp
      const latestCompletedSession = sessions.find((s) => s.status === 'completed');

      // Get ALL completed exercises from ALL sessions (for cross-device sync)
      const allSessionIds = sessions.map((s) => s.id);
      let completedExerciseIds = new Set<string>();

      if (allSessionIds.length > 0) {
        const { data: allCompletions } = await supabase
          .from('route_exercise_completions')
          .select('exercise_id')
          .in('session_id', allSessionIds);

        if (allCompletions) {
          completedExerciseIds = new Set(allCompletions.map((c) => c.exercise_id));
        }
      }

      setCompletedExerciseIds(completedExerciseIds);
      setAllExercisesCompleted(completedExerciseIds.size === routeData.exercises.length);

      setExerciseStats({
        completed: completedExerciseIds.size,
        total: routeData.exercises.length,
        lastSessionAt: latestCompletedSession?.completed_at || sessions[0]?.created_at,
      });
    } catch (error) {
      console.error('Error loading exercise stats:', error);
    }
  };

  const handleStartExercises = () => {
    if (!routeData?.exercises || !Array.isArray(routeData.exercises)) {
      Alert.alert('Error', 'No exercises available for this route');
      return;
    }

    navigation.navigate('RouteExercise', {
      routeId,
      exercises: routeData.exercises,
      routeName: routeData.name,
      startIndex: 0,
    });
  };

  const handleExercisePress = (exercise: Exercise, index: number) => {
    // Navigate directly to RouteExerciseScreen starting at the selected exercise
    if (routeData && routeData.exercises) {
      navigation.navigate('RouteExercise', {
        routeId,
        exercises: routeData.exercises,
        routeName: routeData.name || 'Route',
        startIndex: index,
      });
    }
  };

  const handleExerciseComplete = (exerciseId: string) => {
    // Update the completed exercises state
    setCompletedExerciseIds((prev) => new Set([...prev, exerciseId]));

    // Reload exercise stats
    if (routeData?.exercises) {
      loadExerciseStats();
    }
  };



  const startRoute = async () => {
    try {
      if (!user || !routeId) {
        Alert.alert(t('common.error'), t('routeDetail.loginRequired'));
        return;
      }

      // Create a driven_routes entry
      const { error } = await supabase.from('driven_routes').insert({
        user_id: user.id,
        route_id: routeId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
      });

      if (error) throw error;

      // Refresh routes
      await loadRouteData();

      // Track analytics
      await AppAnalytics.trackRouteStart(routeId);

      // Navigate to the map screen with the route data
      // Navigate to Map tab's MapScreen within MainTabs to keep tab bar visible
      // @ts-ignore
      navigation.navigate('MainTabs', {
        screen: 'MapTab',
        params: { screen: 'MapScreen', params: { routeId } },
      });
    } catch (err) {
      console.error('Error starting route:', err);
      Alert.alert(t('common.error'), t('routeDetail.errorStarting'));
    }
  };

  if (loading) {
    return (
      <Screen>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text>{getTranslation(t, 'routeDetail.loading', 'Loading...')}</Text>
        </YStack>
      </Screen>
    );
  }

  if (error || !routeData) {
    return (
      <Screen>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text color="$red10">
            {error || getTranslation(t, 'routeDetail.routeNotFound', 'Route not found')}
          </Text>
          <Button
            marginTop="$4"
            onPress={() => {
              if (previousScreen === 'Home') {
                // Navigate back to HomeScreen tab
                navigation.navigate('MainTabs', {
                  screen: 'HomeTab',
                  params: { screen: 'HomeScreen' },
                });
              } else {
                navigation.goBack();
              }
            }}
            icon={<Feather name="arrow-left" size={18} color={iconColor} />}
          >
            {getTranslation(t, 'common.goBack', 'Go Back')}
          </Button>
        </YStack>
      </Screen>
    );
  }

  return (
    // Give extra bottom space to clear the floating tab bar on iOS
    <Screen edges={[]} padding={false} hideStatusBar bottomInset={80}>
      <YStack f={1}>

        {/* Hero Carousel */}
        {getCarouselItems().length > 0 && (
          <View style={{ height: HERO_HEIGHT }}>
            <Carousel
              loop
              width={windowWidth}
              height={HERO_HEIGHT}
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <YStack gap="$4" padding="$4">
            {/* Header */}
            <Header
              title={routeData?.name || ''}
              showBack
              rightElement={
                <XStack gap="$2">
                  {showAdminControls && (
                    <Button
                      icon={<Feather name="trash-2" size={20} color="red" />}
                      onPress={handleAdminDelete}
                      variant="outlined"
                      size="md"
                    />
                  )}
                  {user?.id === routeData?.creator_id && (
                    <Button
                      icon={<Feather name="edit-2" size={20} color={iconColor} />}
                      onPress={() => navigation.navigate('CreateRoute', { routeId })}
                      variant="outlined"
                      size="md"
                    />
                  )}
                  <Button
                    icon={
                      <Feather
                        name={isSaved ? 'bookmark' : 'bookmark'}
                        size={20}
                        color={iconColor}
                      />
                    }
                    onPress={handleSaveRoute}
                    variant="outlined"
                    size="md"
                  />
                  <Button
                    icon={<Feather name="more-vertical" size={20} color={iconColor} />}
                    onPress={handleShowOptions}
                    variant="outlined"
                    size="md"
                  />
                </XStack>
              }
            />

            {/* Route info section */}
            <YStack gap="$2">
              <XStack gap="$4" alignItems="center">
                <Button
                  onPress={handleMarkDriven}
                  backgroundColor={isDriven ? '$gray10' : '$blue10'}
                  icon={<Feather name="check-circle" size={20} color="white" />}
                  size="$5"
                >
                  <Text color="white" fontSize="$3">
                    {isDriven
                      ? getTranslation(t, 'routeDetail.markedAsDriven', 'Marked as driven')
                      : getTranslation(t, 'routeDetail.markAsDriven', 'Mark as driven')}
                  </Text>
                </Button>

                <Button
                  onPress={handleSaveRoute}
                  backgroundColor={isSaved ? '$gray10' : '$blue10'}
                  icon={<Feather name="bookmark" size={20} color="white" />}
                  size="$5"
                >
                  <Text color="white" fontSize="$3">
                    {isSaved
                      ? getTranslation(t, 'routeDetail.saved', 'Saved')
                      : getTranslation(t, 'routeDetail.saveRoute', 'Save route')}
                  </Text>
                </Button>

                <Button
                  onPress={handleAddToPreset}
                  backgroundColor="$green10"
                  icon={<Feather name="map" size={20} color="white" />}
                  size="$5"
                >
                  <Text color="white" fontSize="$3">
                    {getTranslation(t, 'routeDetail.addToPreset', 'Add to Preset')}
                  </Text>
                </Button>
              </XStack>

              {/* Basic Info Card */}
              <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                <YStack gap="$2">
                  <XStack gap="$2" alignItems="center">
                    <Text fontSize="$6" fontWeight="600" color="$color">
                      {getTranslation(
                        t,
                        `common.difficulty.${routeData.difficulty?.toLowerCase() || 'unknown'}`,
                        routeData.difficulty?.toUpperCase() || '',
                      )}
                    </Text>
                    <Text fontSize="$4" color="$gray11">
                      •
                    </Text>
                    <Text fontSize="$6" color="$gray11">
                      {getTranslation(
                        t,
                        `common.spotTypes.${routeData.spot_type?.toLowerCase() || 'unknown'}`,
                        routeData.spot_type || '',
                      )}
                    </Text>
                    <Text fontSize="$4" color="$gray11">
                      •
                    </Text>
                    <Text fontSize="$6" color="$gray11">
                      {routeData.category
                        ? getTranslation(
                            t,
                            `common.categories.${routeData.category?.toLowerCase() || 'unknown'}`,
                            routeData.category
                              ?.split('_')
                              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' '),
                          )
                        : ''}
                    </Text>
                  </XStack>

                  {/* Creator info with clickable name */}
                  {routeData.creator && (
                    <XStack alignItems="center" gap="$2" marginTop="$2">
                      <Button
                        variant="outlined"
                        icon={<Feather name="user" size={16} color={iconColor} />}
                        onPress={() => {
                          if (routeData?.creator?.id) {
                            navigation.navigate('PublicProfile', { userId: routeData.creator.id });
                          } else if (routeData?.creator_id) {
                            navigation.navigate('PublicProfile', { userId: routeData.creator_id });
                          }
                        }}
                      >
                        {routeData?.creator?.full_name || t('routeDetail.unknownCreator')}
                      </Button>
                    </XStack>
                  )}

                  {routeData.description && (
                    <Text fontSize="$4" color="$gray11" marginTop="$2">
                      {routeData.description}
                    </Text>
                  )}
                </YStack>
              </Card>

              {/* Recording Stats Card - Only show for recorded routes */}
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
                          <Text fontSize="$6" fontWeight="600" color="$color">
                            {getTranslation(t, 'routeDetail.recordingStats', 'Recording Stats')}
                          </Text>
                        </XStack>

                        <YStack gap="$3">
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
                          Recorded with live GPS tracking
                        </Text>
                      </YStack>
                    </Card>
                  );
                })()}

              {/* Map Card */}
              <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                <YStack gap="$3">
                  <Text fontSize="$6" fontWeight="600" color="$color">
                    {getTranslation(t, 'routeDetail.location', 'Location')}
                  </Text>
                  <View style={{ height: 250, borderRadius: 12, overflow: 'hidden' }}>
                    {(() => {
                      // Handle both web and iOS pen drawing formats
                      let penCoords: any[] = [];
                      let actualDrawingMode = (routeData as RouteData)?.drawing_mode;

                      if ((routeData as RouteData)?.drawing_mode === 'pen') {
                        // WEB FORMAT: Pen coordinates are stored as the main waypoints
                        console.log('🎨 [RouteDetail] Map Card - WEB FORMAT detected');
                        const waypoints =
                          (routeData as RouteData)?.waypoint_details?.map((wp) => ({
                            latitude: wp.lat,
                            longitude: wp.lng,
                            title: wp.title,
                            description: wp.description,
                          })) || [];
                        penCoords = waypoints.map((wp) => ({
                          latitude: wp.latitude,
                          longitude: wp.longitude,
                        }));
                        actualDrawingMode = 'pen';
                      } else if ((routeData as RouteData)?.metadata?.coordinates?.length > 0) {
                        // iOS FORMAT: Pen coordinates are in metadata
                        console.log('🎨 [RouteDetail] Map Card - iOS FORMAT detected');
                        penCoords = (routeData as RouteData)?.metadata?.coordinates || [];
                        actualDrawingMode =
                          (routeData as RouteData)?.metadata?.actualDrawingMode ||
                          (routeData as RouteData)?.drawing_mode;
                      }

                      console.log('🎨 [RouteDetail] Map Card - Final setup:', {
                        format: (routeData as RouteData)?.drawing_mode === 'pen' ? 'WEB' : 'iOS',
                        originalDrawingMode: (routeData as RouteData)?.drawing_mode,
                        actualDrawingMode,
                        penCoordsLength: penCoords.length,
                        sample: penCoords.slice(0, 2),
                      });

                      // Validate coordinates before passing to Map
                      const validWaypoints =
                        (routeData as RouteData)?.waypoint_details
                          ?.filter(
                            (wp) =>
                              typeof wp.lat === 'number' &&
                              typeof wp.lng === 'number' &&
                              !isNaN(wp.lat) &&
                              !isNaN(wp.lng) &&
                              wp.lat >= -90 &&
                              wp.lat <= 90 &&
                              wp.lng >= -180 &&
                              wp.lng <= 180,
                          )
                          ?.map((wp) => ({
                            latitude: wp.lat,
                            longitude: wp.lng,
                            title: wp.title || '',
                            description: wp.description || '',
                          })) || [];

                      const validPenCoords =
                        penCoords?.filter(
                          (coord) =>
                            coord &&
                            typeof coord.latitude === 'number' &&
                            typeof coord.longitude === 'number' &&
                            !isNaN(coord.latitude) &&
                            !isNaN(coord.longitude) &&
                            coord.latitude >= -90 &&
                            coord.latitude <= 90 &&
                            coord.longitude >= -180 &&
                            coord.longitude <= 180,
                        ) || [];

                      const mapRegion = getMapRegion();
                      const firstValidWaypoint = validWaypoints[0];
                      const defaultRegion = {
                        latitude: firstValidWaypoint?.latitude || 59.3293, // Stockholm default
                        longitude: firstValidWaypoint?.longitude || 18.0686,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      };

                      // Only render Map if we have valid data
                      if (validWaypoints.length === 0 && validPenCoords.length === 0) {
                        return (
                          <View
                            style={{
                              height: 200,
                              backgroundColor: '#f5f5f5',
                              borderRadius: 8,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text>No map data available</Text>
                          </View>
                        );
                      }

                      return (
                        <Map
                          waypoints={validWaypoints}
                          region={mapRegion || defaultRegion}
                          style={{ flex: 1 }}
                          routePath={
                            validWaypoints.length > 2
                              ? validWaypoints.map((wp) => ({
                                  latitude: wp.latitude,
                                  longitude: wp.longitude,
                                }))
                              : undefined
                          }
                          showStartEndMarkers={
                            validWaypoints.length > 2 &&
                            (actualDrawingMode === 'waypoint' || actualDrawingMode === 'record')
                          }
                          drawingMode={actualDrawingMode || 'waypoint'}
                          penDrawingCoordinates={validPenCoords}
                        />
                      );
                    })()}
                  </View>
                </YStack>
              </Card>
            </YStack>

            {/* Details Card */}
            <Card backgroundColor="$backgroundStrong" bordered padding="$4">
              <YStack gap="$4">
                <Text fontSize="$6" fontWeight="600" color="$color">
                  {getTranslation(t, 'routeDetail.details', 'Details')}
                </Text>
                {routeData.waypoint_details?.map((waypoint, index) => (
                  <YStack key={index} gap="$2">
                    <Text fontSize="$5" fontWeight="600" color="$color">
                      {waypoint.title}
                    </Text>
                    {waypoint.description && (
                      <Text fontSize="$4" color="$gray11">
                        {waypoint.description}
                      </Text>
                    )}
                  </YStack>
                ))}
              </YStack>
            </Card>

            {/* Route Exercises Section */}
            {routeData.exercises &&
              Array.isArray(routeData.exercises) &&
              routeData.exercises.length > 0 && (
                <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                  <YStack gap="$4">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$6" fontWeight="600" color="$color">
                        {t('routeDetail.exercises')}
                      </Text>
                      <Button
                        onPress={handleStartExercises}
                        backgroundColor="$blue10"
                        icon={<Feather name="play" size={18} color="white" />}
                        size="md"
                      >
                        <Text color="white" fontSize={14} fontWeight="600">
                          {allExercisesCompleted
                            ? t('routeDetail.reviewExercises')
                            : t('routeDetail.startExercises')}
                        </Text>
                        {allExercisesCompleted && (
                          <View
                            style={{
                              backgroundColor: '#10B981',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                              marginLeft: 8,
                            }}
                          >
                            <XStack alignItems="center" gap={2}>
                              <Feather name="check" size={10} color="white" />
                              <Text fontSize={10} color="white" fontWeight="600">
                                COMPLETED
                              </Text>
                            </XStack>
                          </View>
                        )}
                      </Button>
                    </XStack>

                    {/* Exercise List Preview */}
                    <RouteExerciseList
                      exercises={routeData.exercises}
                      completedIds={completedExerciseIds}
                      maxPreview={3}
                      onExercisePress={handleExercisePress}
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

                          {exerciseStats.lastSessionAt && (
                            <Text fontSize={10} color="$gray9" marginTop="$1">
                              {t('routeDetail.lastSession')}:{' '}
                              {new Date(exerciseStats.lastSessionAt).toLocaleDateString()}
                            </Text>
                          )}
                        </YStack>
                      </Card>
                    )}
                  </YStack>
                </Card>
              )}

            {/* Reviews Section */}
            <ReviewSection routeId={routeId} reviews={reviews} onReviewAdded={loadReviews} />

            {/* Comments Section for this Route */}
            <YStack gap="$2">
              <Text fontSize="$6" fontWeight="600" color="$color">Comments</Text>
              <CommentsSection targetType="route" targetId={routeId} />
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Card bordered elevate size="$4" backgroundColor="$background" margin="$4" padding="$4">
            <YStack space="$4">
              <Text fontSize="$6" fontWeight="bold">
                {getTranslation(t, 'routeDetail.reportRoute', 'Report Route')}
              </Text>

              <YStack space="$2">
                <Text fontSize="$4" fontWeight="600">
                  {getTranslation(t, 'routeDetail.reportType', 'Report Type')}
                </Text>
                <XStack space="$2" flexWrap="wrap">
                  {(['spam', 'harmful_content', 'privacy_issue', 'other'] as const).map((type) => (
                    <Button
                      key={type}
                      size="$2"
                      variant="outlined"
                      backgroundColor={reportData.type === type ? '$red10' : undefined}
                      onPress={() => setReportData((prev) => ({ ...prev, type }))}
                    >
                      {type
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Button>
                  ))}
                </XStack>
              </YStack>

              <YStack space="$2">
                <Text fontSize="$4" fontWeight="600">
                  {getTranslation(t, 'routeDetail.details', 'Details')}
                </Text>
                <TextArea
                  size="$4"
                  value={reportData.content}
                  onChangeText={(content) => setReportData((prev) => ({ ...prev, content }))}
                  placeholder={getTranslation(
                    t,
                    'routeDetail.reportDetailsPlaceholder',
                    'Please provide details about your report...',
                  )}
                  numberOfLines={4}
                />
              </YStack>

              <XStack space="$2">
                <Button flex={1} variant="outlined" onPress={() => setShowReportModal(false)}>
                  {getTranslation(t, 'common.cancel', 'Cancel')}
                </Button>
                <Button
                  flex={1}
                  variant="outlined"
                  backgroundColor="$red10"
                  onPress={handleReport}
                  disabled={!reportData.content.trim()}
                >
                  {getTranslation(t, 'routeDetail.submitReport', 'Submit Report')}
                </Button>
              </XStack>
            </YStack>
          </Card>
        </View>
      </Modal>

      {/* Report Dialog */}
      {showReportDialog && routeData && (
        <ReportDialog
          reportableId={routeData.id}
          reportableType="route"
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {/* Exercise Detail Modal - Removed, now navigates directly to RouteExerciseScreen */}
    </Screen>
  );
}
