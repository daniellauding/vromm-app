import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, Image, Dimensions, Alert, View, Modal } from 'react-native';
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
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to mark routes as driven');
      return;
    }

    try {
      if (isDriven) {
        await supabase
          .from('driven_routes')
          .delete()
          .eq('route_id', routeId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('driven_routes')
          .insert({
            route_id: routeId,
            user_id: user.id,
            driven_at: new Date().toISOString(),
          });
      }
      setIsDriven(!isDriven);
    } catch (err) {
      console.error('Error toggling driven status:', err);
      Alert.alert('Error', 'Failed to update driven status');
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

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text>Loading...</Text>
        </YStack>
      </SafeAreaView>
    );
  }

  if (error || !routeData) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text color="$red10">{error || 'Failed to load route'}</Text>
          <Button
            marginTop="$4"
            onPress={() => navigation.goBack()}
            icon={<Feather name="arrow-left" size={18} />}
          >
            Go Back
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <Screen>
      <YStack f={1} gap="$4">
        {/* Header */}
        <Header 
          title={routeData?.name || 'Route Details'}
          leftElement={
            <Button
              size="$3"
              variant="outlined"
              backgroundColor="transparent"
              onPress={() => navigation.goBack()}
              icon={<Feather name="arrow-left" size={18} />}
            />
          }
          rightElement={
            <XStack space="$2">
              {user?.id === routeData?.creator_id && (
                <Button
                  size="$3"
                  variant="outlined"
                  backgroundColor="$blue10"
                  onPress={() => {
                    if (routeId) {
                      navigation.navigate('CreateRoute', { routeId } as any);
                    }
                  }}
                  icon={<Feather name="edit-2" size={18} color="white" />}
                />
              )}
              <Button
                size="$3"
                variant="outlined"
                backgroundColor={isSaved ? "$green10" : undefined}
                onPress={handleSaveRoute}
                icon={<Feather name="bookmark" size={18} color={isSaved ? "white" : undefined} />}
              />
              <Button
                size="$3"
                variant="outlined"
                backgroundColor={isDriven ? "$green10" : undefined}
                onPress={handleMarkDriven}
                icon={<Feather name="check-circle" size={18} color={isDriven ? "white" : undefined} />}
              />
              <Button
                size="$3"
                variant="outlined"
                backgroundColor="$red10"
                onPress={() => setShowReportModal(true)}
                icon={<Feather name="flag" size={18} color="white" />}
              />
            </XStack>
          }
        />

        {/* Content */}
        <ScrollView>
          <YStack gap="$4">
            {/* Basic Info */}
            <Card bordered elevate size="$4" padding="$4">
              <YStack space="$3">
                <Text fontSize="$3" color="$gray11">
                  {routeData?.description}
                </Text>
                <XStack space="$2" marginTop="$2">
                  <Text fontSize="$2" color="$blue10">
                    {routeData?.difficulty?.toUpperCase()}
                  </Text>
                  <Text fontSize="$2" color="$gray10">•</Text>
                  <Text fontSize="$2" color="$gray11">
                    {routeData?.spot_type}
                  </Text>
                  <Text fontSize="$2" color="$gray10">•</Text>
                  <Text fontSize="$2" color="$gray11">
                    {routeData?.category?.split('_').map((word: string) => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Text>
                </XStack>
              </YStack>
            </Card>

            {/* Map */}
            <Card bordered elevate size="$4" padding="$4">
              <YStack space="$3">
                <Text fontSize="$6" fontWeight="600" color="$gray11">Location</Text>
                <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
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

            {/* Details */}
            <Card bordered elevate size="$4" padding="$4">
              <YStack space="$3">
                <Text fontSize="$6" fontWeight="600" color="$gray11">Details</Text>
                <XStack flexWrap="wrap" gap="$2">
                  {routeData?.best_season && (
                    <Card bordered size="$2" padding="$2">
                      <XStack space="$2" alignItems="center">
                        <Feather name="sun" size={16} />
                        <Text>Best Season: {routeData.best_season}</Text>
                      </XStack>
                    </Card>
                  )}
                  {routeData?.best_times && (
                    <Card bordered size="$2" padding="$2">
                      <XStack space="$2" alignItems="center">
                        <Feather name="clock" size={16} />
                        <Text>Best Times: {routeData.best_times}</Text>
                      </XStack>
                    </Card>
                  )}
                  {routeData?.activity_level && (
                    <Card bordered size="$2" padding="$2">
                      <XStack space="$2" alignItems="center">
                        <Feather name="activity" size={16} />
                        <Text>Activity Level: {routeData.activity_level}</Text>
                      </XStack>
                    </Card>
                  )}
                  {routeData?.transmission_type && (
                    <Card bordered size="$2" padding="$2">
                      <XStack space="$2" alignItems="center">
                        <Feather name="settings" size={16} />
                        <Text>Transmission: {routeData.transmission_type}</Text>
                      </XStack>
                    </Card>
                  )}
                  {routeData?.vehicle_types?.length > 0 && (
                    <Card bordered size="$2" padding="$2">
                      <XStack space="$2" alignItems="center">
                        <Feather name="truck" size={16} />
                        <Text>Vehicles: {routeData.vehicle_types.join(', ')}</Text>
                      </XStack>
                    </Card>
                  )}
                  {routeData?.full_address && (
                    <Card bordered size="$2" padding="$2">
                      <XStack space="$2" alignItems="center">
                        <Feather name="map-pin" size={16} />
                        <Text>{routeData.full_address}</Text>
                      </XStack>
                    </Card>
                  )}
                </XStack>
              </YStack>
            </Card>

            {/* Media */}
            {(routeData as RouteData)?.media_attachments?.length > 0 && (
              <YStack space="$4">
                {/* Videos */}
                {(routeData as RouteData).media_attachments.filter(item => item.type === 'video').length > 0 && (
                  <Card bordered elevate size="$4" padding="$4">
                    <YStack space="$3">
                      <Text fontSize="$6" fontWeight="600" color="$gray11">Videos</Text>
                      <YStack space="$2">
                        {(routeData as RouteData).media_attachments
                          .filter(item => item.type === 'video')
                          .map((item, index) => (
                            <Card key={index} bordered elevate style={{ height: 200 }}>
                              <WebView
                                source={{ uri: item.url }}
                                style={{ flex: 1 }}
                                allowsFullscreenVideo
                              />
                              {item.description && (
                                <Text
                                  padding="$2"
                                  fontSize="$2"
                                  color="$gray11"
                                >
                                  {item.description}
                                </Text>
                              )}
                            </Card>
                          ))}
                      </YStack>
                    </YStack>
                  </Card>
                )}

                {/* Images */}
                {(routeData as RouteData).media_attachments.filter(item => item.type === 'image').length > 0 && (
                  <Card bordered elevate size="$4" padding="$4">
                    <YStack space="$3">
                      <Text fontSize="$6" fontWeight="600" color="$gray11">Images</Text>
                      <Carousel
                        width={windowWidth - 32}
                        height={200}
                        data={(routeData as RouteData).media_attachments.filter(item => item.type === 'image')}
                        renderItem={({ item }: { item: MediaAttachment & Json }) => (
                          <Card bordered elevate style={{ width: windowWidth - 32, height: 200 }}>
                            <Image
                              source={{ uri: item.url }}
                              style={{ width: '100%', height: '100%', borderRadius: 12 }}
                              resizeMode="cover"
                            />
                            {item.description && (
                              <Text
                                position="absolute"
                                bottom={0}
                                left={0}
                                right={0}
                                backgroundColor="rgba(0,0,0,0.5)"
                                color="white"
                                padding="$2"
                                fontSize="$2"
                              >
                                {item.description}
                              </Text>
                            )}
                          </Card>
                        )}
                        onSnapToItem={setActiveMediaIndex}
                        loop={false}
                        mode="parallax"
                        modeConfig={{
                          parallaxScrollingScale: 0.9,
                          parallaxScrollingOffset: 50,
                        }}
                      />
                      <XStack justifyContent="center" space="$1" marginTop="$2">
                        {(routeData as RouteData).media_attachments
                          .filter(item => item.type === 'image')
                          .map((_, index) => (
                            <View
                              key={index}
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: index === activeMediaIndex ? '#007AFF' : '#E5E5E5',
                              }}
                            />
                          ))}
                      </XStack>
                    </YStack>
                  </Card>
                )}
              </YStack>
            )}

            {/* Reviews */}
            <ReviewSection
              routeId={routeId}
              reviews={reviews}
              onReviewAdded={loadReviews}
            />
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