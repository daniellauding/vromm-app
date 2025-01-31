import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, Image, Dimensions, Alert, View, Modal, useColorScheme, Share, Linking, Platform } from 'react-native';
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
    full_name: string;
  };
  reviews?: { count: number }[];
  average_rating?: { rating: number }[];
};

export function RouteDetailScreen({ route }: RouteDetailProps) {
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

  useEffect(() => {
    if (routeId) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          await Promise.all([
            loadRouteData(),
            loadReviews()
          ]);
    if (user) {
            await Promise.all([
              checkSavedStatus(),
              checkDrivenStatus()
            ]);
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
      // Check if we need to refresh reviews
      const params = navigation.getState().routes.find(r => r.name === 'RouteDetail')?.params;
      if (params && 'shouldRefreshReviews' in params) {
        loadReviews();
        // Clear the refresh flag
        navigation.setParams({ shouldRefreshReviews: undefined });
      }
    });

    return unsubscribe;
  }, [routeId]);

  const loadRouteData = useCallback(async () => {
    if (!routeId) return;

      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
        creator:creator_id(full_name),
        waypoint_details,
        media_attachments,
        reviews:route_reviews(
          id,
          rating,
          content
        ),
        average_rating:route_reviews(rating)
        `)
        .eq('id', routeId)
        .single();

      if (error) throw error;
    if (!data) throw new Error('Route not found');

    const routeResponse = data as unknown as SupabaseRouteResponse;
    
    // Parse JSON fields
    const waypoints = Array.isArray(routeResponse.waypoint_details) 
      ? routeResponse.waypoint_details.map(wp => ({
          lat: typeof wp?.lat === 'string' ? parseFloat(wp.lat) : (wp?.lat ?? 0),
          lng: typeof wp?.lng === 'string' ? parseFloat(wp.lng) : (wp?.lng ?? 0),
          title: String(wp?.title ?? ''),
          description: wp?.description ? String(wp.description) : undefined,
          ...wp // Preserve other Json properties
        }))
      : [];
    const media = Array.isArray(routeResponse.media_attachments)
      ? routeResponse.media_attachments.map(m => ({
          type: (m?.type as 'image' | 'video' | 'youtube') ?? 'image',
          url: String(m?.url ?? ''),
          description: m?.description ? String(m.description) : undefined,
          ...m // Preserve other Json properties
        }))
      : [];
    
    // Transform the raw data into our expected format
      const transformedData: RouteData = {
      ...routeResponse,
      waypoint_details: waypoints as (WaypointDetail & Json)[],
      media_attachments: media as (MediaAttachment & Json)[],
      creator: routeResponse.creator || undefined,
      reviews: routeResponse.reviews || [],
      average_rating: routeResponse.average_rating || []
    };

      setRouteData(transformedData);
  }, [routeId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('route_reviews')
        .select(`
          id,
          rating,
          content,
          difficulty,
          visited_at,
          images,
          user:profiles!user_id(
            full_name
          )
        `)
        .eq('route_id', routeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validReviews = (data as any[])?.map(review => ({
        id: review.id,
        user_id: review.user_id,
        rating: review.rating,
        content: review.content || '',
        difficulty: review.difficulty,
        visited_at: review.visited_at || new Date().toISOString(),
        images: Array.isArray(review.images) ? review.images.map((img: { url: string }) => ({ url: img.url })) : [],
        user: review.user ? {
          full_name: review.user.full_name
        } : undefined
      } as Review));

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
        await supabase
          .from('saved_routes')
          .delete()
          .eq('route_id', routeId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('saved_routes')
          .insert({
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
      Alert.alert(
        'Route Review',
        'What would you like to do?',
        [
          {
            text: 'View My Review',
            onPress: () => {
              // Find the user's review in the reviews list
              const userReview = reviews.find(review => review.user_id === user?.id);
              if (userReview) {
                Alert.alert('Your Review', 
                  `Rating: ${userReview.rating}/5\n` +
                  `${userReview.content}\n` +
                  `Difficulty: ${userReview.difficulty}\n` +
                  `Visited: ${new Date(userReview.visited_at || '').toLocaleDateString()}`
                );
              } else {
                Alert.alert('No Review Found', 'You have marked this route as driven but haven\'t left a review yet.');
              }
            }
          },
          {
            text: 'Add New Review',
            onPress: () => {
              navigation.navigate('AddReview', { routeId: routeId });
            }
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
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
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
      await supabase
        .from('reports')
        .insert({
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

    const baseUrl = 'https://www.korvagen.se';
    const shareUrl = `${baseUrl}/routes/${routeData.id}`;
    
    // Add parameters
    const params = new URLSearchParams();
    const metadata = routeData.metadata as { location?: string; coordinates?: { lat: number; lng: number }[] };
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
              const { error } = await supabase
                .from('routes')
                .delete()
                .eq('id', routeIdToDelete);
              
              if (error) throw error;
              
              // Clear the route data before navigating
              setRouteData(null);
              navigation.goBack();
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete route');
            }
          }
        }
      ]
    );
  };

  const getMapRegion = useCallback(() => {
    if (!routeData?.waypoint_details?.length) return null;
    
    const waypoints = routeData.waypoint_details;
    const latitudes = waypoints.map(wp => wp.lat);
    const longitudes = waypoints.map(wp => wp.lng);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;
    
    const minDelta = 0.01;
    const latDelta = Math.max((maxLat - minLat) + latPadding, minDelta);
    const lngDelta = Math.max((maxLng - minLng) + lngPadding, minDelta);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [routeData?.waypoint_details]);

  const carouselItems = useMemo(() => {
    const items = [];

    // Add map if waypoints exist
    const region = getMapRegion();
    if (region && routeData?.waypoint_details?.length) {
      items.push({
        type: 'map' as const,
        data: {
          region,
          waypoints: routeData.waypoint_details.map(wp => ({
            latitude: wp.lat,
            longitude: wp.lng,
            title: wp.title,
            description: wp.description,
          })),
        },
      });
    }

    // Add route media attachments
    const media = routeData?.media_attachments
      ?.filter(m => m.type === 'image')
      .map(m => ({
        type: 'image' as const,
        data: {
          url: m.url,
          description: m.description,
        },
      })) || [];

    // Add review images
    const reviewImages = reviews
      .flatMap(review => 
        review.images.map(image => ({
          type: 'image' as const,
          data: {
            url: image.url,
            description: `Review image from ${review.user?.full_name || 'Anonymous'}`,
          },
        }))
      );

    return [...items, ...media, ...reviewImages];
  }, [routeData, getMapRegion, reviews]);

  const handleOpenInMaps = () => {
    if (!routeData?.waypoint_details?.length) {
      Alert.alert('Error', 'No waypoints available for this route');
      return;
    }

    const waypoints = routeData.waypoint_details;
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
    
    // Create waypoints string for intermediate points (skip first and last)
    const waypointsStr = waypoints
      .slice(1, -1)
      .map(wp => `${wp.lat},${wp.lng}`)
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

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open maps application');
      }
    });
  };

  if (loading) {
    return (
      <Screen>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text>Loading...</Text>
        </YStack>
      </Screen>
    );
  }

  if (error || !routeData) {
    return (
      <Screen>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text color="$red10">{error || 'Failed to load route'}</Text>
          <Button
            marginTop="$4"
            onPress={() => navigation.goBack()}
            icon={<Feather name="arrow-left" size={18} color={iconColor} />}
          >
            Go Back
          </Button>
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <YStack f={1}>
        <Header
          title={routeData?.name || ''}
          showBack
          rightElement={
            <XStack gap="$2">
              {user?.id === routeData?.creator_id && (
            <Button
                  onPress={() => navigation.navigate('CreateRoute', { routeId: routeData?.id })}
                  icon={<Feather name="edit-2" size={20} color="white" />}
                  backgroundColor="$blue10"
                />
              )}
              <Button
                onPress={handleOpenInMaps}
                icon={<Feather name="map" size={20} color="white" />}
                backgroundColor="$blue10"
              />
              <Button
                onPress={handleShare}
                icon={<Feather name="share-2" size={20} color="white" />}
                backgroundColor="$blue10"
              />
              {user?.id === routeData?.creator_id && (
                <Button
                  onPress={handleDelete}
                  icon={<Feather name="trash-2" size={20} color="white" />}
                  backgroundColor="$red10"
                />
              )}
            </XStack>
          }
        />

        <ScrollView style={{ flex: 1 }}>
          <YStack gap="$4" padding="$4">
            {/* Route info section */}
            <YStack gap="$2">
              <XStack gap="$4" alignItems="center">
                <Button
                  onPress={handleMarkDriven}
                  backgroundColor={isDriven ? "$gray10" : "$blue10"}
                  icon={<Feather name="check-circle" size={20} color="white" />}
                  size="$5"
                >
                  <Text color="white" fontSize="$3">
                    {isDriven ? "Marked as driven" : "Mark as driven"}
                  </Text>
                </Button>

              <Button
                onPress={handleSaveRoute}
                  backgroundColor={isSaved ? "$gray10" : "$blue10"}
                  icon={<Feather name="bookmark" size={20} color="white" />}
                  size="$5"
              >
                  <Text color="white" fontSize="$3">
                    {isSaved ? "Saved" : "Save route"}
                  </Text>
              </Button>
          </XStack>

              {/* Basic Info Card */}
              <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                <YStack gap="$2">
                  <XStack gap="$2" alignItems="center">
                    <Text fontSize="$6" fontWeight="600" color="$color">{routeData.difficulty?.toUpperCase()}</Text>
                    <Text fontSize="$4" color="$gray11">•</Text>
                    <Text fontSize="$6" color="$gray11">{routeData.spot_type}</Text>
                    <Text fontSize="$4" color="$gray11">•</Text>
                    <Text fontSize="$6" color="$gray11">
                      {routeData.category?.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Text>
              </XStack>
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
                    <Text fontSize="$6" fontWeight="600" color="$color">Location</Text>
                    <View style={{ height: 250, borderRadius: 12, overflow: 'hidden' }}>
                      <Map
                        waypoints={(routeData as RouteData)?.waypoint_details?.map((wp) => ({
                    latitude: wp.lat,
                    longitude: wp.lng,
                    title: wp.title,
                    description: wp.description,
                  })) || []}
                  region={{
                          latitude: (routeData as RouteData)?.waypoint_details?.[0]?.lat || 0,
                          longitude: (routeData as RouteData)?.waypoint_details?.[0]?.lng || 0,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                />
              </View>
            </YStack>
          </Card>

                {/* Details Card */}
                <Card backgroundColor="$backgroundStrong" bordered padding="$4">
                  <YStack gap="$4">
                    <Text fontSize="$6" fontWeight="600" color="$color">Details</Text>
                    {routeData.waypoint_details?.map((waypoint, index) => (
                      <YStack key={index} gap="$2">
                        <Text fontSize="$5" fontWeight="600" color="$color">{waypoint.title}</Text>
                        {waypoint.description && (
                          <Text fontSize="$4" color="$gray11">{waypoint.description}</Text>
                        )}
                    </YStack>
                    ))}
                  </YStack>
                </Card>

                {/* Reviews Section */}
                <ReviewSection
                  routeId={routeId}
                  reviews={reviews}
                  onReviewAdded={loadReviews}
                />
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
          <Card
            bordered
            elevate
            size="$4"
            backgroundColor="$background"
            margin="$4"
            padding="$4"
          >
            <YStack space="$4">
              <Text fontSize="$6" fontWeight="bold">Report Route</Text>
              
              <YStack space="$2">
                <Text fontSize="$4" fontWeight="600">Report Type</Text>
                <XStack space="$2" flexWrap="wrap">
                  {(['spam', 'harmful_content', 'privacy_issue', 'other'] as const).map((type) => (
                    <Button
                      key={type}
                      size="$2"
                      variant="outlined"
                      backgroundColor={reportData.type === type ? "$red10" : undefined}
                      onPress={() => setReportData(prev => ({ ...prev, type }))}
                    >
                      {type.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Button>
                  ))}
                </XStack>
              </YStack>

              <YStack space="$2">
                <Text fontSize="$4" fontWeight="600">Details</Text>
                <TextArea
                  size="$4"
                  value={reportData.content}
                  onChangeText={content => setReportData(prev => ({ ...prev, content }))}
                  placeholder="Please provide details about your report..."
                  numberOfLines={4}
                />
              </YStack>

              <XStack space="$2">
                <Button
                  flex={1}
                  variant="outlined"
                  onPress={() => setShowReportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  variant="outlined"
                  backgroundColor="$red10"
                  onPress={handleReport}
                  disabled={!reportData.content.trim()}
                >
                  Submit Report
                </Button>
              </XStack>
            </YStack>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
} 