import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Play } from '@tamagui/lucide-icons';
import Carousel from 'react-native-reanimated-carousel';
import { ImageWithFallback } from './ImageWithFallback';
import { Map } from './Map';
import { Chip } from './Chip';

const { height } = Dimensions.get('window');

interface ActivityItem {
  id: string;
  type:
    | 'route_created'
    | 'event_created'
    | 'event_attending'
    | 'exercise_completed'
    | 'learning_path_step'
    | 'learning_path_completed';
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  created_at: string;
  data: any;
}

interface CommunityFeedSheetProps {
  visible: boolean;
  onClose: () => void;
  onUserPress?: (userId: string) => void;
  onRoutePress?: (routeId: string) => void;
  onEventPress?: (eventId: string) => void;
}

export function CommunityFeedSheet({
  visible,
  onClose,
  onUserPress,
  onRoutePress,
  onEventPress,
}: CommunityFeedSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // State (exact copy from CommunityFeedScreen)
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  // Load data when modal opens
  useEffect(() => {
    if (visible) {
      loadFollowingUsers();
      loadCommunityFeed();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      loadCommunityFeed();
    }
  }, [filter, followingUserIds, visible]);

  // Functions (exact copy from CommunityFeedScreen)
  const loadFollowingUsers = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!error && data) {
        setFollowingUserIds(data.map((f) => f.following_id));
      }
    } catch (error) {
      console.error('Error loading following users:', error);
    }
  };

  const loadCommunityFeed = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const feedItems: ActivityItem[] = [];

      // Base query modifier for following filter
      const shouldFilterByFollowing = filter === 'following' && followingUserIds.length > 0;

      // Load recent public routes
      let routesQuery = supabase
        .from('routes')
        .select(
          `
          *,
          creator:profiles!routes_creator_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .neq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(30);

      if (shouldFilterByFollowing) {
        routesQuery = routesQuery.in('creator_id', followingUserIds);
      }

      const { data: routes, error: routesError } = await routesQuery;

      if (!routesError && routes) {
        routes.forEach((route) => {
          if (route.creator) {
            feedItems.push({
              id: `route_${route.id}`,
              type: 'route_created',
              user: route.creator,
              created_at: route.created_at,
              data: route,
            });
          }
        });
      }

      // Load recent public events
      let eventsQuery = supabase
        .from('events')
        .select(
          `
          *,
          creator:profiles!events_created_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .neq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(30);

      if (shouldFilterByFollowing) {
        eventsQuery = eventsQuery.in('created_by', followingUserIds);
      }

      const { data: events, error: eventsError } = await eventsQuery;

      if (!eventsError && events) {
        events.forEach((event) => {
          if (event.creator) {
            feedItems.push({
              id: `event_${event.id}`,
              type: 'event_created',
              user: event.creator,
              created_at: event.created_at,
              data: event,
            });
          }
        });
      }

      // Load recent exercise completions
      let completionsQuery = supabase
        .from('virtual_repeat_completions')
        .select(
          `
          *,
          user:profiles!virtual_repeat_completions_user_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          learning_path_exercises(
            id,
            title,
            description,
            icon,
            image
          )
        `,
        )
        .order('completed_at', { ascending: false })
        .limit(50);

      if (shouldFilterByFollowing) {
        completionsQuery = completionsQuery.in('user_id', followingUserIds);
      }

      const { data: completions, error: completionsError } = await completionsQuery;

      if (!completionsError && completions) {
        completions.forEach((completion) => {
          if (completion.user && completion.learning_path_exercises) {
            feedItems.push({
              id: `completion_${completion.id}`,
              type: 'exercise_completed',
              user: completion.user,
              created_at: completion.completed_at,
              data: {
                exercise: completion.learning_path_exercises,
                completion: completion,
              },
            });
          }
        });
      }

      // Load learning path completions (celebration activities)
      let pathCompletionsQuery = supabase
        .from('learning_path_exercise_completions')
        .select(
          `
          *,
          user:profiles!learning_path_exercise_completions_user_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          learning_path_exercises!inner(
            id,
            title,
            description,
            icon,
            learning_path_id,
            learning_paths!inner(
              id,
              title,
              description,
              icon
            )
          )
        `,
        )
        .order('completed_at', { ascending: false })
        .limit(100);

      if (shouldFilterByFollowing) {
        pathCompletionsQuery = pathCompletionsQuery.in('user_id', followingUserIds);
      }

      const { data: pathCompletions, error: pathCompletionsError } = await pathCompletionsQuery;

      if (!pathCompletionsError && pathCompletions) {
        // Group completions by learning path to detect path completions
        const pathCompletionMap = new Map<string, any[]>();

        pathCompletions.forEach((completion) => {
          if (completion.user && completion.learning_path_exercises?.learning_paths) {
            const pathId = completion.learning_path_exercises.learning_path_id;
            if (!pathCompletionMap.has(pathId)) {
              pathCompletionMap.set(pathId, []);
            }
            pathCompletionMap.get(pathId)!.push(completion);
          }
        });

        // Check for completed learning paths
        for (const [pathId, completions] of pathCompletionMap) {
          if (completions.length > 0) {
            const learningPath = completions[0].learning_path_exercises.learning_paths;
            const user = completions[0].user;

            // Get total exercises in this learning path
            const { data: totalExercises } = await supabase
              .from('learning_path_exercises')
              .select('id')
              .eq('learning_path_id', pathId);

            // If user completed all exercises, add celebration activity
            if (totalExercises && completions.length >= totalExercises.length) {
              feedItems.push({
                id: `path_completion_${pathId}_${user.id}`,
                type: 'learning_path_completed',
                user: user,
                created_at: completions[completions.length - 1].completed_at, // Use latest completion time
                data: {
                  learningPath: learningPath,
                  completedExercises: completions.length,
                  totalExercises: totalExercises.length,
                  completion: completions[completions.length - 1],
                },
              });
            }
          }
        }
      }

      // Sort all activities by date
      feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(feedItems);
    } catch (error) {
      console.error('Error loading community feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadCommunityFeed(true);
  };

  const navigateToProfile = (userId: string) => {
    if (onUserPress) {
      onUserPress(userId);
    } else {
      navigation.navigate('PublicProfile', { userId });
      onClose();
    }
  };

  const handleRoutePress = (routeId: string) => {
    if (onRoutePress) {
      onRoutePress(routeId);
    } else {
      navigation.navigate('RouteDetail', { routeId });
      onClose();
    }
  };

  const handleEventPress = (eventId: string) => {
    if (onEventPress) {
      onEventPress(eventId);
    } else {
      navigation.navigate('EventDetail', { eventId });
      onClose();
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'route_created':
        return 'map';
      case 'event_created':
        return 'calendar';
      case 'event_attending':
        return 'users';
      case 'exercise_completed':
        return 'check-circle';
      case 'learning_path_step':
        return 'book-open';
      case 'learning_path_completed':
        return 'trophy';
      default:
        return 'activity';
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'route_created':
        return 'created a route';
      case 'event_created':
        return 'created an event';
      case 'event_attending':
        return 'is attending';
      case 'exercise_completed':
        return 'completed exercise';
      case 'learning_path_step':
        return 'finished learning step';
      case 'learning_path_completed':
        return 'completed learning path';
      default:
        return 'had activity';
    }
  };

  // Helper function to generate route media items like RouteCard
  const getRouteMediaItems = (route: any) => {
    const items = [];
    const screenWidth = Dimensions.get('window').width;

    // Add map if waypoints exist
    const waypointsData = route.waypoint_details || route.metadata?.waypoints || [];
    if (waypointsData.length > 0) {
      const waypoints = waypointsData.map((wp: any) => ({
        latitude: Number(wp.lat),
        longitude: Number(wp.lng),
        title: wp.title?.toString(),
        description: wp.description?.toString(),
      }));

      const latitudes = waypoints.map((wp) => wp.latitude);
      const longitudes = waypoints.map((wp) => wp.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      const latPadding = Math.max((maxLat - minLat) * 0.1, 0.01);
      const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.01);
      const minDelta = 0.01;
      const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
      const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

      const region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };

      items.push({
        type: 'map' as const,
        data: {
          region,
          waypoints,
          routePath: waypoints.length > 2 ? waypoints : undefined,
          showStartEndMarkers: true,
          drawingMode: route.drawing_mode,
          penDrawingCoordinates: route.metadata?.coordinates || [],
        },
      });
    }

    // Add media attachments
    const mediaAttachmentsArray = Array.isArray(route.media_attachments)
      ? route.media_attachments
      : [];
    const validAttachments = mediaAttachmentsArray.filter(
      (m: any) =>
        m?.url &&
        (m.url.startsWith('http://') ||
          m.url.startsWith('https://') ||
          m.url.startsWith('file://') ||
          m.url.startsWith('data:') ||
          m.url.startsWith('content://')),
    );

    const media = validAttachments.map((m: any) => ({
      type: m.type as const,
      data: { url: m.url, description: m.description },
    }));

    return [...items, ...media];
  };

  // Helper function to generate event media items like EventCard
  const getEventMediaItems = (event: any) => {
    const items = [];

    // Add map if location data exists
    if (event.location) {
      try {
        const locationData = JSON.parse(event.location);

        if (locationData.waypoints && locationData.waypoints.length > 0) {
          const validWaypoints = locationData.waypoints.filter(
            (wp: any) =>
              typeof wp.latitude === 'number' &&
              typeof wp.longitude === 'number' &&
              !isNaN(wp.latitude) &&
              !isNaN(wp.longitude) &&
              wp.latitude >= -90 &&
              wp.latitude <= 90 &&
              wp.longitude >= -180 &&
              wp.longitude <= 180,
          );

          if (validWaypoints.length > 0) {
            const latitudes = validWaypoints.map((wp: any) => wp.latitude);
            const longitudes = validWaypoints.map((wp: any) => wp.longitude);
            const minLat = Math.min(...latitudes);
            const maxLat = Math.max(...latitudes);
            const minLng = Math.min(...longitudes);
            const maxLng = Math.max(...longitudes);
            const latPadding = Math.max((maxLat - minLat) * 0.1, 0.01);
            const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.01);
            const minDelta = 0.01;
            const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
            const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

            const region = {
              latitude: (minLat + maxLat) / 2,
              longitude: (minLng + maxLng) / 2,
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            };

            items.push({
              type: 'map' as const,
              data: {
                region,
                waypoints: validWaypoints,
                drawingMode: locationData.drawingMode || 'pin',
              },
            });
          }
        } else if (locationData.coordinates) {
          const { latitude, longitude } = locationData.coordinates;
          if (
            typeof latitude === 'number' &&
            typeof longitude === 'number' &&
            !isNaN(latitude) &&
            !isNaN(longitude) &&
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180
          ) {
            const region = {
              latitude,
              longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };

            items.push({
              type: 'map' as const,
              data: {
                region,
                waypoints: [{ latitude, longitude, title: 'Event Location' }],
                drawingMode: locationData.drawingMode || 'pin',
              },
            });
          }
        }
      } catch (e) {
        // Invalid JSON, skip map
      }
    }

    // Add media attachments
    const mediaArray = Array.isArray(event.media) ? event.media : [];
    const media = mediaArray.map((m: any) => ({
      type: m.type,
      data: { url: m.url, description: m.description },
    }));

    return [...items, ...media];
  };

  const renderActivityItem = ({ item: activity }: { item: ActivityItem }) => {
    // Get media items for this activity
    let mediaItems = [];
    if (activity.type === 'route_created') {
      mediaItems = getRouteMediaItems(activity.data);
    } else if (activity.type === 'event_created') {
      mediaItems = getEventMediaItems(activity.data);
    }

    const screenWidth = Dimensions.get('window').width;

    return (
      <YStack
        backgroundColor="$backgroundStrong"
        borderRadius={12}
        padding={16}
        margin={8}
        gap={16}
        borderWidth={1}
        borderColor="$borderColor"
      >
        {/* User info header */}
        <TouchableOpacity onPress={() => navigateToProfile(activity.user.id)}>
          <XStack alignItems="center" gap={12}>
            {/* Avatar Display */}
            {activity.user.avatar_url ? (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: colorScheme === 'dark' ? '#444' : '#eee',
                }}
              >
                <ImageWithFallback
                  source={{ uri: activity.user.avatar_url }}
                  style={{ width: 40, height: 40 }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colorScheme === 'dark' ? '#444' : '#eee',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="user" size={20} color={colorScheme === 'dark' ? '#ddd' : '#666'} />
              </View>
            )}

            <YStack flex={1}>
              <Text fontSize={16} fontWeight="600" color="$color">
                {activity.user.full_name}
              </Text>
              <XStack alignItems="center" gap={6}>
                <Feather name={getActivityIcon(activity.type)} size={14} color="#00FFBC" />
                <Text fontSize={14} color="$gray11">
                  {getActivityText(activity.type)}
                </Text>
              </XStack>
            </YStack>

            <Text fontSize={12} color="$gray9">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </Text>
          </XStack>
        </TouchableOpacity>

        {/* Media Preview */}
        {mediaItems.length > 0 && (
          <View style={{ height: 180, borderRadius: 12, overflow: 'hidden' }}>
            {mediaItems.length === 1 ? (
              <View style={{ flex: 1 }}>
                {mediaItems[0].type === 'map' ? (
                  <Map
                    waypoints={mediaItems[0].data.waypoints}
                    region={mediaItems[0].data.region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    style={{ width: '100%', height: '100%' }}
                    routePath={mediaItems[0].data.routePath}
                    showStartEndMarkers={mediaItems[0].data.showStartEndMarkers}
                    drawingMode={mediaItems[0].data.drawingMode}
                    penDrawingCoordinates={mediaItems[0].data.penDrawingCoordinates}
                  />
                ) : mediaItems[0].type === 'video' ? (
                  <TouchableOpacity
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                    onPress={() => console.log('🎥 Video play requested:', mediaItems[0].data.url)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          borderRadius: 40,
                          width: 80,
                          height: 80,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Play size={32} color="#FFF" />
                      </View>
                      <Text style={{ color: '#FFF', marginTop: 8, fontSize: 14 }}>
                        Tap to play video
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <ImageWithFallback
                    source={{ uri: mediaItems[0].data.url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                )}
              </View>
            ) : (
              <Carousel
                loop
                width={screenWidth - 32} // Account for margin
                height={180}
                data={mediaItems}
                defaultIndex={0}
                autoPlay={false}
                enabled={true}
                renderItem={({ item }) => (
                  <View style={{ flex: 1 }}>
                    {item.type === 'map' ? (
                      <Map
                        waypoints={item.data.waypoints}
                        region={item.data.region}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        style={{ width: '100%', height: '100%' }}
                        routePath={item.data.routePath}
                        showStartEndMarkers={item.data.showStartEndMarkers}
                        drawingMode={item.data.drawingMode}
                        penDrawingCoordinates={item.data.penDrawingCoordinates}
                      />
                    ) : item.type === 'video' ? (
                      <TouchableOpacity
                        style={{ width: '100%', height: '100%', position: 'relative' }}
                        onPress={() => console.log('🎥 Video play requested:', item.data.url)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#000',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.6)',
                              borderRadius: 40,
                              width: 80,
                              height: 80,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Play size={32} color="#FFF" />
                          </View>
                          <Text style={{ color: '#FFF', marginTop: 8, fontSize: 14 }}>
                            Tap to play video
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <ImageWithFallback
                        source={{ uri: item.data.url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* Activity content */}
        {activity.type === 'route_created' && (
          <TouchableOpacity onPress={() => handleRoutePress(activity.data.id)}>
            <YStack gap={8} backgroundColor="$backgroundStrong" borderRadius={8} padding={12}>
              <Text fontSize={16} fontWeight="500" color="$color">
                {activity.data.name}
              </Text>
              <XStack gap={16}>
                <XStack alignItems="center" gap={6}>
                  <Feather name="bar-chart" size={14} color="$gray11" />
                  <Text fontSize={13} color="$gray11">
                    {activity.data.difficulty}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap={6}>
                  <Feather name="map-pin" size={14} color="$gray11" />
                  <Text fontSize={13} color="$gray11">
                    {activity.data.spot_type}
                  </Text>
                </XStack>
              </XStack>
              {activity.data.description && (
                <Text fontSize={13} color="$gray9" numberOfLines={3}>
                  {activity.data.description}
                </Text>
              )}
            </YStack>
          </TouchableOpacity>
        )}

        {activity.type === 'event_created' && (
          <TouchableOpacity onPress={() => handleEventPress(activity.data.id)}>
            <YStack gap={8} backgroundColor="$backgroundStrong" borderRadius={8} padding={12}>
              <Text fontSize={16} fontWeight="500" color="$color">
                {activity.data.title}
              </Text>
              <XStack alignItems="center" gap={6}>
                <Feather name="calendar" size={14} color="$gray11" />
                <Text fontSize={13} color="$gray11">
                  {activity.data.event_date
                    ? new Date(activity.data.event_date).toLocaleDateString()
                    : 'No date set'}
                </Text>
              </XStack>
              {activity.data.description && (
                <Text fontSize={13} color="$gray9" numberOfLines={3}>
                  {activity.data.description}
                </Text>
              )}
            </YStack>
          </TouchableOpacity>
        )}

        {activity.type === 'exercise_completed' && (
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('RouteExercise', {
                routeId: null,
                exercises: [activity.data.exercise],
                routeName: 'Exercise',
                startIndex: 0,
              });
              onClose();
            }}
          >
            <YStack gap={8} backgroundColor="$backgroundStrong" borderRadius={8} padding={12}>
              <Text fontSize={16} fontWeight="500" color="$color">
                {activity.data.exercise.title?.en || activity.data.exercise.title?.sv || 'Exercise'}
              </Text>
              <XStack alignItems="center" gap={6}>
                <Feather name="check-circle" size={14} color="#10B981" />
                <Text fontSize={13} color="#10B981">
                  Exercise Completed
                </Text>
              </XStack>
              {activity.data.exercise.description && (
                <Text fontSize={13} color="$gray9" numberOfLines={3}>
                  {activity.data.exercise.description?.en || activity.data.exercise.description?.sv}
                </Text>
              )}
            </YStack>
          </TouchableOpacity>
        )}

        {activity.type === 'learning_path_completed' && (
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('ProgressTab', {
                selectedPathId: activity.data.learningPath.id,
              });
              onClose();
            }}
          >
            <YStack gap={8} backgroundColor="$backgroundStrong" borderRadius={8} padding={12}>
              <XStack alignItems="center" gap={8}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#FFD700',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="trophy" size={16} color="#000" />
                </View>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600" color="$color">
                    {activity.data.learningPath.title?.en ||
                      activity.data.learningPath.title?.sv ||
                      'Learning Path'}
                  </Text>
                  <XStack alignItems="center" gap={6}>
                    <Feather name="trophy" size={14} color="#FFD700" />
                    <Text fontSize={13} color="#FFD700">
                      Path Completed!
                    </Text>
                  </XStack>
                </YStack>
              </XStack>
              <XStack alignItems="center" gap={12}>
                <XStack alignItems="center" gap={4}>
                  <Feather name="check-circle" size={12} color="#10B981" />
                  <Text fontSize={12} color="#10B981">
                    {activity.data.completedExercises}/{activity.data.totalExercises} exercises
                  </Text>
                </XStack>
                <Text fontSize={12} color="$gray9">
                  {Math.round(
                    (activity.data.completedExercises / activity.data.totalExercises) * 100,
                  )}
                  % complete
                </Text>
              </XStack>
              {activity.data.learningPath.description && (
                <Text fontSize={13} color="$gray9" numberOfLines={2}>
                  {activity.data.learningPath.description?.en ||
                    activity.data.learningPath.description?.sv}
                </Text>
              )}
            </YStack>
          </TouchableOpacity>
        )}
      </YStack>
    );
  };

  const EmptyState = () => {
    const isFollowingFilter = filter === 'following';

    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding={32}>
        <Feather name={isFollowingFilter ? 'users' : 'activity'} size={64} color="$gray9" />
        <Text fontSize={20} fontWeight="600" color="$gray11" textAlign="center" marginTop={16}>
          {isFollowingFilter ? 'No activity from people you follow' : 'No community activity yet'}
        </Text>
        <Text fontSize={16} color="$gray9" textAlign="center" marginTop={8}>
          {isFollowingFilter
            ? "The people you follow haven't posted anything recently"
            : 'Be the first to create routes, events, or complete exercises!'}
        </Text>

        {isFollowingFilter && (
          <TouchableOpacity
            onPress={() => {
              // Could trigger UserListSheet here if available
              navigation.navigate('UsersScreen');
              onClose();
            }}
            style={{
              backgroundColor: '#00FFBC',
              borderRadius: 8,
              paddingHorizontal: 24,
              paddingVertical: 12,
              marginTop: 24,
            }}
          >
            <XStack alignItems="center" gap={8}>
              <Feather name="user-plus" size={16} color="#000" />
              <Text fontSize={16} fontWeight="600" color="#000">
                Find people to follow
              </Text>
            </XStack>
          </TouchableOpacity>
        )}
      </YStack>
    );
  };

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              height={height * 0.9}
              maxHeight={height * 0.9}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$6" fontWeight="bold" color="$color">
                  Community Feed
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </XStack>

              {/* Filter chips */}
              <XStack gap={12}>
                <Chip active={filter === 'all'} onPress={() => setFilter('all')} icon="activity">
                  All Activity
                </Chip>
                <Chip
                  active={filter === 'following'}
                  onPress={() => setFilter('following')}
                  icon="users"
                >
                  Following ({followingUserIds.length})
                </Chip>
              </XStack>

              {/* Activity list */}
              <YStack flex={1}>
                {loading ? (
                  <YStack flex={1} justifyContent="center" alignItems="center">
                    <Spinner size="large" color="#00FFBC" />
                    <Text color="$gray11" marginTop={16}>
                      Loading community activity...
                    </Text>
                  </YStack>
                ) : (
                  <FlatList
                    data={activities}
                    renderItem={renderActivityItem}
                    keyExtractor={(item) => item.id}
                    nestedScrollEnabled
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#00FFBC"
                      />
                    }
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={EmptyState}
                    contentContainerStyle={
                      activities.length === 0 ? { flex: 1 } : { paddingBottom: 32 }
                    }
                  />
                )}
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
