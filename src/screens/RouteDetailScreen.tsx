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
} from 'react-native';
import { YStack, XStack, Text, Card, Button, TextArea, Progress, Separator } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Map } from '../components/Map';
import { Feather } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import { WebView } from 'react-native-webview';
import { format } from 'date-fns';
import { Database } from '../lib/database.types';
import { ReviewSection } from '../components/ReviewSection';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { AppAnalytics } from '../utils/analytics';
import { MediaCarousel, CarouselMediaItem } from '../components/MediaCarousel';
import { Region } from 'react-native-maps';
import { ReportDialog } from '../components/report/ReportDialog';
import { useTranslation } from '../contexts/TranslationContext';

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

interface SupabaseRouteResponse extends Omit<RouteRow, 'waypoint_details' | 'media_attachments'> {
  creator: {
    id: string;
    full_name: string;
  } | null;
  waypoint_details: RawWaypointDetail[];
  media_attachments: RawMediaAttachment[];
  reviews: { count: number }[];
  average_rating: { rating: number }[];
}

type RouteData = Omit<RouteRow, 'waypoint_details' | 'media_attachments'> & {
  waypoint_details: (WaypointDetail & Json)[];
  media_attachments: (MediaAttachment & Json)[];
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
        } catch (error) {
          console.error('Error loading route data:', error);
          setError(error instanceof Error ? error.message : 'Failed to load route data');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [routeId, user]);

  useEffect(() => {
    loadRouteData();
    checkSavedStatus();
    checkDrivenStatus();
    loadReviews();

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
  }, [routeId]);

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

    // Transform the raw data into our expected format
    const transformedData: RouteData = {
      ...routeResponse,
      waypoint_details: waypoints as (WaypointDetail & Json)[],
      media_attachments: media as (MediaAttachment & Json)[],
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

    const baseUrl = 'https://app.korvagen.se';
    const shareUrl = `${baseUrl}/routes/${routeData.id}`;

    // Add parameters
    const params = new URLSearchParams();
    const metadata = routeData.metadata as {
      location?: string;
      coordinates?: { lat: number; lng: number }[];
    };
    if (metadata?.location) params.append('city', metadata.location);
    if (routeData.difficulty) params.append('difficulty', routeData.difficulty);
    if (routeData.category) params.append('category', routeData.category);
    if (metadata?.coordinates?.[0]) {
      params.append('lat', metadata.coordinates[0].lat.toString());
      params.append('lng', metadata.coordinates[0].lng.toString());
    }

    const fullUrl = `${shareUrl}?${params.toString()}`;

    try {
      await Share.share({
        message: routeData.description || `Check out this route: ${routeData.name}`,
        url: fullUrl, // iOS only
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
      const showStartEndMarkers = waypoints.length > 2 && (routeData.drawing_mode === 'waypoint' || routeData.drawing_mode === 'record');

      items.push({ 
        type: 'map', 
        waypoints, 
        region, 
        routePath,
        showStartEndMarkers,
        drawingMode: routeData.drawing_mode 
      });
    }

    // Add media attachments
    routeData?.media_attachments?.forEach((attachment) => {
      items.push({ type: attachment.type, url: attachment.url });
    });

    return items;
  };

  const renderCarouselItem = ({ item }: { item: any }) => {
    if (item.type === 'map') {
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
        />
      );
    } else if (item.type === 'image') {
      return (
        <Image
          source={{ uri: item.url }}
          style={{ width: windowWidth, height: HERO_HEIGHT }}
          resizeMode="cover"
        />
      );
    } else if (item.type === 'youtube') {
      return (
        <WebView source={{ uri: item.url }} style={{ width: windowWidth, height: HERO_HEIGHT }} />
      );
    }
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
      selectedWaypoints = intermediateWaypoints.filter((_, index) => index % step === 0).slice(0, maxIntermediateWaypoints);
    }

    const waypointsStr = selectedWaypoints
      .map((wp) => `${wp.lat},${wp.lng}`)
      .join('|');

    let url;
    if (Platform.OS === 'ios') {
      // Apple Maps URL scheme
      url = `maps://?saddr=${origin}&daddr=${destination}`;
      if (waypointsStr) {
        url += `&via=${waypointsStr}`;
      }
    } else {
      // Google Maps URL scheme
      url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
      if (waypointsStr) {
        url += `&waypoints=${waypointsStr}`;
      }
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open maps application');
      }
    });
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
      navigation.navigate('Map', { routeId });
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
            onPress={() => navigation.goBack()}
            icon={<Feather name="arrow-left" size={18} color={iconColor} />}
          >
            {getTranslation(t, 'common.goBack', 'Go Back')}
          </Button>
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen edges={[]} padding={false} hideStatusBar>
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
          scrollEventThrottle={16}
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
                  delayPressIn={50}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                  delayPressIn={50}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text color="white" fontSize="$3">
                    {isSaved
                      ? getTranslation(t, 'routeDetail.saved', 'Saved')
                      : getTranslation(t, 'routeDetail.saveRoute', 'Save route')}
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
                        variant="secondary"
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

              {/* Map Card */}
              <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                <YStack gap="$3">
                  <Text fontSize="$6" fontWeight="600" color="$color">
                    {getTranslation(t, 'routeDetail.location', 'Location')}
                  </Text>
                  <View style={{ height: 250, borderRadius: 12, overflow: 'hidden' }}>
                    <Map
                      waypoints={
                        (routeData as RouteData)?.waypoint_details?.map((wp) => ({
                          latitude: wp.lat,
                          longitude: wp.lng,
                          title: wp.title,
                          description: wp.description,
                        })) || []
                      }
                      region={getMapRegion() || {
                        latitude: (routeData as RouteData)?.waypoint_details?.[0]?.lat || 0,
                        longitude: (routeData as RouteData)?.waypoint_details?.[0]?.lng || 0,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }}
                      routePath={
                        (routeData as RouteData)?.waypoint_details?.length > 2
                          ? (routeData as RouteData)?.waypoint_details?.map((wp) => ({
                              latitude: wp.lat,
                              longitude: wp.lng,
                            }))
                          : undefined
                      }
                      showStartEndMarkers={
                        (routeData as RouteData)?.waypoint_details?.length > 2 && 
                        ((routeData as RouteData)?.drawing_mode === 'waypoint' || (routeData as RouteData)?.drawing_mode === 'record')
                      }
                      drawingMode={(routeData as RouteData)?.drawing_mode}
                    />
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

            {/* Reviews Section */}
            <ReviewSection routeId={routeId} reviews={reviews} onReviewAdded={loadReviews} />
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
    </Screen>
  );
}
