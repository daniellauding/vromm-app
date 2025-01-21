import React, { useState, useEffect } from 'react';
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

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];

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

type WaypointJson = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type WaypointDetail = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type RouteData = Database['public']['Tables']['routes']['Row'] & {
  creator?: {
    full_name: string;
  };
  exercises?: Array<{
    id: string;
    title: string;
    description?: string;
    duration?: string;
  }>;
  media?: Array<{
    type: 'image' | 'video' | 'youtube';
    uri: string;
    description?: string;
  }>;
  waypoint_details?: WaypointDetail[];
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
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
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
    loadRouteData();
    loadReviews();
    loadCompletedExercises();
    if (user) {
      checkSavedStatus();
      checkDrivenStatus();
    }
  }, [routeId, user]);

  const loadRouteData = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          creator:creator_id(full_name)
        `)
        .eq('id', routeId)
        .single();

      if (error) throw error;

      // Parse JSON fields with type checking
      let exercises = [];
      let media = [];
      
      try {
        if (data.suggested_exercises && typeof data.suggested_exercises === 'string' && data.suggested_exercises !== '') {
          const parsedExercises = JSON.parse(data.suggested_exercises);
          if (Array.isArray(parsedExercises)) {
            exercises = parsedExercises.map(ex => ({
              id: ex.id,
              title: ex.title,
              description: ex.description,
              duration: ex.duration
            }));
          }
        }
      } catch (e) {
        console.error('Error parsing exercises:', e);
      }

      try {
        if (data.media_attachments && typeof data.media_attachments === 'string' && data.media_attachments !== '') {
          media = JSON.parse(data.media_attachments);
        } else if (Array.isArray(data.media_attachments)) {
          media = data.media_attachments.map(m => ({
            type: m.type,
            uri: m.url, // Map url to uri for the frontend
            description: m.description
          }));
        }
      } catch (e) {
        console.error('Error parsing media:', e);
      }

      // Transform waypoint_details and other JSON fields
      const transformedData: RouteData = {
        ...data,
        waypoint_details: data.waypoint_details || [],
        exercises,
        media
      };
      
      console.log('Route Data:', transformedData); // Debug log
      setRouteData(transformedData);
    } catch (err) {
      setError('Failed to load route data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('route_reviews')
        .select(`
          id,
          user_id,
          rating,
          content,
          difficulty,
          visited_at,
          images,
          user:user_id(
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

  const loadCompletedExercises = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('route_exercise_completions')
        .select('exercise_id')
        .eq('route_id', routeId)
        .eq('user_id', user.id);

      if (error) throw error;
      setCompletedExercises(data.map(d => d.exercise_id));
    } catch (err) {
      console.error('Error loading completed exercises:', err);
    }
  };

  const handleExerciseToggle = async (exerciseId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to track exercises');
      return;
    }

    try {
      if (completedExercises.includes(exerciseId)) {
        // Remove completion
        const { error } = await supabase
          .from('route_exercise_completions')
          .delete()
          .eq('route_id', routeId)
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId);
        
        if (error) throw error;
        setCompletedExercises(prev => prev.filter(id => id !== exerciseId));
      } else {
        // Add completion
        const { error } = await supabase
          .from('route_exercise_completions')
          .insert({
            route_id: routeId,
            user_id: user.id,
            exercise_id: exerciseId,
            completed_at: new Date().toISOString(),
          });
        
        if (error) throw error;
        setCompletedExercises(prev => [...prev, exerciseId]);
      }
    } catch (err) {
      console.error('Error toggling exercise:', err);
      Alert.alert('Error', 'Failed to update exercise status');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to leave a review');
      return;
    }

    try {
      const { error } = await supabase
        .from('route_reviews')
        .insert({
          route_id: routeId,
          user_id: user.id,
          rating: newReview.rating,
          content: newReview.content,
          difficulty: newReview.difficulty as DifficultyLevel,
          visited_at: new Date().toISOString(),
          images: newReview.images,
        });

      if (error) throw error;

      setNewReview({
        rating: 0,
        content: '',
        difficulty: 'beginner',
        images: [],
      });
      setShowReviewForm(false);
      loadReviews();
    } catch (err) {
      console.error('Error submitting review:', err);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const renderMediaItem = ({ item }: { item: any }) => {
    if (item.type === 'youtube' || (item.type === 'video' && item.url?.includes('youtube'))) {
      return (
        <Card bordered elevate style={{ width: windowWidth - 32, height: 200 }}>
          <WebView
            source={{ uri: item.url }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
          />
        </Card>
      );
    }

    return (
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
    );
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView>
        <YStack padding="$4" space="$4">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Button
              size="$3"
              theme="alt2"
              onPress={() => navigation.goBack()}
              icon={<Feather name="arrow-left" size={18} />}
            >
              Back
            </Button>
            <XStack space="$2">
              {user?.id === routeData?.creator_id && (
                <Button
                  size="$3"
                  theme="blue"
                  onPress={() => {
                    if (routeId) {
                      // @ts-ignore - Navigation type issue
                      navigation.navigate('CreateRoute', { routeId });
                    }
                  }}
                  icon={<Feather name="edit-2" size={18} color="white" />}
                >
                  Edit
                </Button>
              )}
              <Button
                size="$3"
                // @ts-ignore - Theme type issue
                theme={isSaved ? "positive" : "alt2"}
                onPress={handleSaveRoute}
                icon={<Feather name="bookmark" size={18} />}
              >
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                size="$3"
                // @ts-ignore - Theme type issue
                theme={isDriven ? "positive" : "alt2"}
                onPress={handleMarkDriven}
                icon={<Feather name="check-circle" size={18} />}
              >
                {isDriven ? 'Driven' : 'Mark Driven'}
              </Button>
              <Button
                size="$3"
                theme="red"
                onPress={() => setShowReportModal(true)}
                icon={<Feather name="flag" size={18} />}
              />
            </XStack>
          </XStack>

          {/* Basic Info */}
          <Card bordered elevate size="$4" padding="$4">
            <YStack space="$2">
              <Text fontSize="$8" fontWeight="bold" color="$gray12">
                {routeData?.name}
              </Text>
              <Text fontSize="$3" color="$gray11">
                {routeData?.description}
              </Text>
              <XStack space="$2" marginTop="$2">
                <Text fontSize="$2" color="$blue10">
                  {routeData?.difficulty.toUpperCase()}
                </Text>
                <Text fontSize="$2" color="$gray10">•</Text>
                <Text fontSize="$2" color="$gray11">
                  {routeData?.spot_type}
                </Text>
                <Text fontSize="$2" color="$gray10">•</Text>
                <Text fontSize="$2" color="$gray11">
                  {routeData?.category?.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Text>
              </XStack>
            </YStack>
          </Card>

          {/* Metadata */}
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

          {/* Map */}
          <Card bordered elevate size="$4" padding="$4">
            <YStack space="$2">
              <Text fontSize="$6" fontWeight="600" color="$gray11">Location</Text>
              <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
                <Map
                  waypoints={routeData?.waypoint_details?.map((wp) => ({
                    latitude: wp.lat,
                    longitude: wp.lng,
                    title: wp.title,
                    description: wp.description,
                  })) || []}
                  region={{
                    latitude: routeData?.waypoint_details?.[0]?.lat || 0,
                    longitude: routeData?.waypoint_details?.[0]?.lng || 0,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  showControls
                />
              </View>
            </YStack>
          </Card>

          {/* Media Gallery */}
          {routeData?.media && routeData.media.length > 0 && (
            <YStack space="$4">
              {/* Videos */}
              {routeData.media.filter(item => item.type === 'video' || item.type === 'youtube' || item.uri?.includes('youtube')).length > 0 && (
                <Card bordered elevate size="$4" padding="$4">
                  <YStack space="$2">
                    <Text fontSize="$6" fontWeight="600" color="$gray11">Videos</Text>
                    <YStack space="$2">
                      {routeData.media
                        .filter(item => item.type === 'video' || item.type === 'youtube' || item.uri?.includes('youtube'))
                        .map((item, index) => (
                          <Card key={index} bordered elevate style={{ height: 200 }}>
                            <WebView
                              source={{ uri: item.uri }}
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
              {routeData.media.filter(item => item.type === 'image' || (!item.type && !item.uri?.includes('youtube'))).length > 0 && (
                <Card bordered elevate size="$4" padding="$4">
                  <YStack space="$2">
                    <Text fontSize="$6" fontWeight="600" color="$gray11">Images</Text>
                    <Carousel
                      width={windowWidth - 32}
                      height={200}
                      data={routeData.media.filter(item => item.type === 'image' || (!item.type && !item.uri?.includes('youtube')))}
                      renderItem={({ item }) => (
                        <Card bordered elevate style={{ width: windowWidth - 32, height: 200 }}>
                          <Image
                            source={{ uri: item.uri }}
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
                      {routeData.media
                        .filter(item => item.type === 'image' || (!item.type && !item.uri?.includes('youtube')))
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

          {/* Exercises */}
          {routeData?.exercises && routeData.exercises.length > 0 && (
            <Card bordered elevate size="$4" padding="$4">
              <YStack space="$3">
                <Text fontSize="$6" fontWeight="600" color="$gray11">Exercises</Text>
                <Progress
                  value={completedExercises.length}
                  max={routeData.exercises.length}
                  marginVertical="$2"
                >
                  <Progress.Indicator animation="unset" />
                </Progress>
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {completedExercises.length} of {routeData.exercises.length} completed
                </Text>
                {routeData.exercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    bordered
                    size="$2"
                    padding="$3"
                    pressStyle={{ opacity: 0.8 }}
                    onPress={() => handleExerciseToggle(exercise.id)}
                  >
                    <XStack space="$3" alignItems="center">
                      <Button
                        size="$2"
                        // @ts-ignore - Theme type issue
                        theme={completedExercises.includes(exercise.id) ? "positive" : "alt2"}
                        onPress={() => handleExerciseToggle(exercise.id)}
                        icon={
                          <Feather
                            name={completedExercises.includes(exercise.id) ? "check-square" : "square"}
                            size={18}
                            color={completedExercises.includes(exercise.id) ? "white" : "black"}
                          />
                        }
                      />
                      <YStack flex={1}>
                        <Text fontWeight="600">{exercise.title}</Text>
                        {exercise.description && (
                          <Text fontSize="$2" color="$gray11">{exercise.description}</Text>
                        )}
                        <XStack space="$2" marginTop="$1">
                          {exercise.duration && (
                            <Text fontSize="$2" color="$blue10">Duration: {exercise.duration}</Text>
                          )}
                        </XStack>
                      </YStack>
                    </XStack>
                  </Card>
                ))}
              </YStack>
            </Card>
          )}

          {/* Reviews */}
          <Card bordered elevate size="$4" padding="$4">
            <YStack space="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontWeight="600" color="$gray11">Reviews</Text>
                <Button
                  size="$3"
                  theme="blue"
                  onPress={() => setShowReviewForm(!showReviewForm)}
                  icon={<Feather name={showReviewForm ? "x" : "plus"} size={18} color="white" />}
                >
                  {showReviewForm ? 'Cancel' : 'Add Review'}
                </Button>
              </XStack>

              {showReviewForm && (
                <Card bordered size="$2" padding="$3">
                  <YStack space="$3">
                    <XStack space="$2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <Button
                          key={rating}
                          size="$2"
                          // @ts-ignore - Theme type issue
                          theme={newReview.rating >= rating ? "positive" : "alt2"}
                          onPress={() => setNewReview(prev => ({ ...prev, rating }))}
                          icon={<Feather name="star" size={18} />}
                        />
                      ))}
                    </XStack>
                    <TextArea
                      size="$4"
                      value={newReview.content}
                      onChangeText={content => setNewReview(prev => ({ ...prev, content }))}
                      placeholder="Write your review..."
                      numberOfLines={4}
                    />
                    <Button
                      theme="blue"
                      onPress={handleSubmitReview}
                      disabled={!newReview.rating || !newReview.content.trim()}
                    >
                      Submit Review
                    </Button>
                  </YStack>
                </Card>
              )}

              <YStack space="$3">
                {reviews.map(review => (
                  <Card key={review.id} bordered size="$2" padding="$3">
                    <YStack space="$2">
                      <XStack space="$2" alignItems="center">
                        <YStack>
                          <Text fontWeight="600">{review.user?.full_name}</Text>
                          <Text fontSize="$2" color="$gray10">
                            {format(new Date(review.visited_at), 'MMM d, yyyy')}
                          </Text>
                        </YStack>
                      </XStack>
                      <XStack space="$1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Feather
                            key={i}
                            name="star"
                            size={16}
                            color={i < review.rating ? '#FFD700' : '#E5E5E5'}
                          />
                        ))}
                      </XStack>
                      <Text>{review.content}</Text>
                      {review.images && review.images.length > 0 && (
                        <XStack space="$2" flexWrap="wrap">
                          {review.images.map((image, index) => (
                            <Image
                              key={index}
                              source={{ uri: image.url }}
                              style={{ width: 80, height: 80, borderRadius: 8, margin: 4 }}
                            />
                          ))}
                        </XStack>
                      )}
                    </YStack>
                  </Card>
                ))}
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

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
                      theme={reportData.type === type ? 'red' : 'alt2'}
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
                  theme="alt2"
                  onPress={() => setShowReportModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  theme="red"
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
    </SafeAreaView>
  );
} 