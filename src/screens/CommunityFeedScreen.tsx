import React, { useState, useEffect } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, useColorScheme, View, Dimensions } from 'react-native';
import { YStack, XStack, Avatar, Spinner } from 'tamagui';
import { ArrowLeft, Play } from '@tamagui/lucide-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Text } from '../components/Text';
import { Chip } from '../components/Chip';
import { Map } from '../components/Map';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import Carousel from 'react-native-reanimated-carousel';

interface ActivityItem {
  id: string;
  type: 'route_created' | 'event_created' | 'event_attending' | 'exercise_completed' | 'learning_path_step';
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  created_at: string;
  data: any;
}

export const CommunityFeedScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  useEffect(() => {
    loadFollowingUsers();
    loadCommunityFeed();
  }, []);

  useEffect(() => {
    loadCommunityFeed();
  }, [filter, followingUserIds]);

  const loadFollowingUsers = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!error && data) {
        setFollowingUserIds(data.map(f => f.following_id));
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
        .select(`
          *,
          creator:profiles!routes_creator_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .neq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(30);

      if (shouldFilterByFollowing) {
        routesQuery = routesQuery.in('creator_id', followingUserIds);
      }

      const { data: routes, error: routesError } = await routesQuery;

      if (!routesError && routes) {
        routes.forEach(route => {
          if (route.creator) {
            feedItems.push({
              id: `route_${route.id}`,
              type: 'route_created',
              user: route.creator,
              created_at: route.created_at,
              data: route
            });
          }
        });
      }

      // Load recent public events
      let eventsQuery = supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_created_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .neq('visibility', 'private')
        .order('created_at', { ascending: false })
        .limit(30);

      if (shouldFilterByFollowing) {
        eventsQuery = eventsQuery.in('created_by', followingUserIds);
      }

      const { data: events, error: eventsError } = await eventsQuery;

      if (!eventsError && events) {
        events.forEach(event => {
          if (event.creator) {
            feedItems.push({
              id: `event_${event.id}`,
              type: 'event_created',
              user: event.creator,
              created_at: event.created_at,
              data: event
            });
          }
        });
      }

      // Load recent exercise completions
      let completionsQuery = supabase
        .from('virtual_repeat_completions')
        .select(`
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
        `)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (shouldFilterByFollowing) {
        completionsQuery = completionsQuery.in('user_id', followingUserIds);
      }

      const { data: completions, error: completionsError } = await completionsQuery;

      if (!completionsError && completions) {
        completions.forEach(completion => {
          if (completion.user && completion.learning_path_exercises) {
            feedItems.push({
              id: `completion_${completion.id}`,
              type: 'exercise_completed',
              user: completion.user,
              created_at: completion.completed_at,
              data: {
                exercise: completion.learning_path_exercises,
                completion: completion
              }
            });
          }
        });
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
    navigation.navigate('PublicProfile', { userId });
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
    const mediaAttachmentsArray = Array.isArray(route.media_attachments) ? route.media_attachments : [];
    const validAttachments = mediaAttachmentsArray.filter((m: any) =>
      m?.url && (
        m.url.startsWith('http://') ||
        m.url.startsWith('https://') ||
        m.url.startsWith('file://') ||
        m.url.startsWith('data:') ||
        m.url.startsWith('content://')
      )
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
          const validWaypoints = locationData.waypoints.filter((wp: any) =>
            typeof wp.latitude === 'number' &&
            typeof wp.longitude === 'number' &&
            !isNaN(wp.latitude) &&
            !isNaN(wp.longitude) &&
            wp.latitude >= -90 && wp.latitude <= 90 &&
            wp.longitude >= -180 && wp.longitude <= 180
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
            !isNaN(latitude) && !isNaN(longitude) &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180
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
    // Get media items for this activity (no useMemo needed here)
    let mediaItems = [];
    if (activity.type === 'route_created') {
      mediaItems = getRouteMediaItems(activity.data);
    } else if (activity.type === 'event_created') {
      mediaItems = getEventMediaItems(activity.data);
    }

    const screenWidth = Dimensions.get('window').width;

    return (
      <YStack
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius={12}
        padding={16}
        margin={8}
        gap={16}
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        {/* User info header */}
        <TouchableOpacity onPress={() => navigateToProfile(activity.user.id)}>
          <XStack alignItems="center" gap={12}>
            {/* Fixed Avatar Display */}
            {activity.user.avatar_url ? (
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20, 
                overflow: 'hidden',
                backgroundColor: colorScheme === 'dark' ? '#444' : '#eee'
              }}>
                <ImageWithFallback
                  source={{ uri: activity.user.avatar_url }}
                  style={{ width: 40, height: 40 }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colorScheme === 'dark' ? '#444' : '#eee',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather name="user" size={20} color={colorScheme === 'dark' ? '#ddd' : '#666'} />
              </View>
            )}
            
            <YStack flex={1}>
              <Text fontSize={16} fontWeight="600" color="#FFFFFF">
                {activity.user.full_name}
              </Text>
              <XStack alignItems="center" gap={6}>
                <Feather 
                  name={getActivityIcon(activity.type)} 
                  size={14} 
                  color="#00FFBC" 
                />
                <Text fontSize={14} color="#9CA3AF">
                  {getActivityText(activity.type)}
                </Text>
              </XStack>
            </YStack>
            
            <Text fontSize={12} color="#6B7280">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </Text>
          </XStack>
        </TouchableOpacity>

        {/* Media Preview (like RouteCard/EventCard) */}
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
                    <View style={{ 
                      width: '100%', 
                      height: '100%', 
                      backgroundColor: '#000', 
                      justifyContent: 'center', 
                      alignItems: 'center' 
                    }}>
                      <View style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        borderRadius: 40,
                        width: 80,
                        height: 80,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
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
                        <View style={{ 
                          width: '100%', 
                          height: '100%', 
                          backgroundColor: '#000', 
                          justifyContent: 'center', 
                          alignItems: 'center' 
                        }}>
                          <View style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: 40,
                            width: 80,
                            height: 80,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
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
          <TouchableOpacity onPress={() => navigation.navigate('RouteDetail', { routeId: activity.data.id })}>
            <YStack gap={8} backgroundColor="rgba(0, 255, 188, 0.05)" borderRadius={8} padding={12}>
              <Text fontSize={16} fontWeight="500" color="#FFFFFF">
                {activity.data.name}
              </Text>
              <XStack gap={16}>
                <XStack alignItems="center" gap={6}>
                  <Feather name="bar-chart" size={14} color="#9CA3AF" />
                  <Text fontSize={13} color="#9CA3AF">{activity.data.difficulty}</Text>
                </XStack>
                <XStack alignItems="center" gap={6}>
                  <Feather name="map-pin" size={14} color="#9CA3AF" />
                  <Text fontSize={13} color="#9CA3AF">{activity.data.spot_type}</Text>
                </XStack>
              </XStack>
              {activity.data.description && (
                <Text fontSize={13} color="#CCCCCC" numberOfLines={3}>
                  {activity.data.description}
                </Text>
              )}
            </YStack>
          </TouchableOpacity>
        )}

        {activity.type === 'event_created' && (
          <TouchableOpacity onPress={() => navigation.navigate('EventDetail', { eventId: activity.data.id })}>
            <YStack gap={8} backgroundColor="rgba(245, 158, 11, 0.05)" borderRadius={8} padding={12}>
              <Text fontSize={16} fontWeight="500" color="#FFFFFF">
                {activity.data.title}
              </Text>
              <XStack alignItems="center" gap={6}>
                <Feather name="calendar" size={14} color="#9CA3AF" />
                <Text fontSize={13} color="#9CA3AF">
                  {activity.data.event_date ? 
                    new Date(activity.data.event_date).toLocaleDateString() : 
                    'No date set'
                  }
                </Text>
              </XStack>
              {activity.data.description && (
                <Text fontSize={13} color="#CCCCCC" numberOfLines={3}>
                  {activity.data.description}
                </Text>
              )}
            </YStack>
          </TouchableOpacity>
        )}

        {activity.type === 'exercise_completed' && (
          <TouchableOpacity onPress={() => navigation.navigate('RouteExercise', { 
            routeId: null,
            exercises: [activity.data.exercise],
            routeName: 'Exercise',
            startIndex: 0
          })}>
            <YStack gap={8} backgroundColor="rgba(16, 185, 129, 0.05)" borderRadius={8} padding={12}>
              <Text fontSize={16} fontWeight="500" color="#FFFFFF">
                {activity.data.exercise.title?.en || activity.data.exercise.title?.sv || 'Exercise'}
              </Text>
              <XStack alignItems="center" gap={6}>
                <Feather name="check-circle" size={14} color="#10B981" />
                <Text fontSize={13} color="#10B981">Exercise Completed</Text>
              </XStack>
              {activity.data.exercise.description && (
                <Text fontSize={13} color="#CCCCCC" numberOfLines={3}>
                  {activity.data.exercise.description?.en || activity.data.exercise.description?.sv}
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
        <Feather 
          name={isFollowingFilter ? "users" : "activity"} 
          size={64} 
          color="$gray9" 
        />
        <Text fontSize={20} fontWeight="600" color="$gray11" textAlign="center" marginTop={16}>
          {isFollowingFilter ? 'No activity from people you follow' : 'No community activity yet'}
        </Text>
        <Text fontSize={16} color="$gray9" textAlign="center" marginTop={8}>
          {isFollowingFilter 
            ? 'The people you follow haven\'t posted anything recently'
            : 'Be the first to create routes, events, or complete exercises!'
          }
        </Text>
        
        {isFollowingFilter && (
          <TouchableOpacity 
            onPress={() => navigation.navigate('UsersScreen')}
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

  return (
    <YStack flex={1} backgroundColor="#0F172A">
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack alignItems="center" gap={12} flex={1}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text fontSize={20} fontWeight="600" color="#FFFFFF">
            Community Feed
          </Text>
        </XStack>
      </XStack>

      {/* Filter chips */}
      <XStack padding={16} gap={12}>
        <Chip
          active={filter === 'all'}
          onPress={() => setFilter('all')}
          icon="activity"
        >
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
          contentContainerStyle={activities.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        />
      )}
    </YStack>
  );
}; 