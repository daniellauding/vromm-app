import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';

import { supabase } from '../../lib/supabase';
import { Spinner } from 'tamagui';
import { Chip } from '../../components/Chip';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { Map } from '../../components/Map';
import { Play } from '@tamagui/lucide-icons';
import { formatDistanceToNow } from 'date-fns';
import { Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default React.memo(function CommunityTab({
  handleRoutePress,
  setSelectedUserId,
  setShowUserProfileSheet,
}: {
  handleRoutePress: (routeId: string) => void;
  setSelectedUserId: (userId: string) => void;
  setShowUserProfileSheet: (show: boolean) => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [communityActivities, setCommunityActivities] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityFilter, setCommunityFilter] = useState<'all' | 'following'>('all');
  const [followingUserIds, setFollowingUserIds] = useState<string[] | null>(null);

  const loadFollowingUsers = React.useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!error && data) {
        setFollowingUserIds(data.map((f) => f.following_id));
      } else {
        setFollowingUserIds([]);
      }
    } catch (error) {
      console.error('Error loading following users:', error);
      setFollowingUserIds([]);
    }
  }, [user?.id]);

  const loadCommunityFeed = React.useCallback(
    async (followingUserIds: string[], communityFilter: 'all' | 'following') => {
      try {
        setCommunityLoading(true);
        const feedItems: any[] = [];

        const shouldFilterByFollowing =
          communityFilter === 'following' && followingUserIds.length > 0;

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

        // Sort all activities by date
        feedItems.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setCommunityActivities(feedItems);
      } catch (error) {
        console.error('Error loading community feed:', error);
      } finally {
        setCommunityLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadFollowingUsers();
  }, [loadFollowingUsers]);

  useEffect(() => {
    if (followingUserIds === null) return;
    loadCommunityFeed(followingUserIds, communityFilter);
  }, [followingUserIds, communityFilter, loadCommunityFeed]);

  // Helper function to generate route media items
  const getRouteMediaItems = useCallback((route: any) => {
    const items = [];

    // Add map if waypoints exist
    const waypointsData = route.waypoint_details || route.metadata?.waypoints || [];
    if (waypointsData.length > 0) {
      const waypoints = waypointsData.map((wp: any) => ({
        latitude: Number(wp.lat),
        longitude: Number(wp.lng),
        title: wp.title?.toString(),
        description: wp.description?.toString(),
      }));

      const latitudes = waypoints.map((wp: any) => wp.latitude);
      const longitudes = waypoints.map((wp: any) => wp.longitude);
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
      type: m.type,
      data: { url: m.url, description: m.description },
    }));

    return [...items, ...media];
  }, []);
  

  return (
    <YStack paddingTop="$4" gap="$4">
      {/* Community Tab Content - Full vertical feed */}

      {/* Filter chips */}
      <XStack paddingHorizontal="$4" gap="$3">
        <Chip
          active={communityFilter === 'all'}
          onPress={() => setCommunityFilter('all')}
          icon="activity"
        >
          All Activity
        </Chip>
        <Chip
          active={communityFilter === 'following'}
          onPress={() => setCommunityFilter('following')}
          icon="users"
        >
          Following ({(followingUserIds || []).length})
        </Chip>
      </XStack>

      {/* Activity list */}
      {communityLoading ? (
        <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$8">
          <Spinner size="large" color="$primary" />
          <Text color="$gray11" marginTop="$4">
            Loading community activity...
          </Text>
        </YStack>
      ) : communityActivities.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$8">
          <Feather
            name={communityFilter === 'following' ? 'users' : 'activity'}
            size={64}
            color="$gray9"
          />
          <Text fontSize={20} fontWeight="600" color="$gray11" textAlign="center" marginTop="$4">
            {communityFilter === 'following'
              ? 'No activity from people you follow'
              : 'No community activity yet'}
          </Text>
          <Text fontSize={16} color="$gray9" textAlign="center" marginTop="$2">
            {communityFilter === 'following'
              ? "The people you follow haven't posted anything recently"
              : 'Be the first to create routes, events, or complete exercises!'}
          </Text>
        </YStack>
      ) : (
        <YStack gap="$4" paddingHorizontal="$4">
          {communityActivities.map((activity) => {
            // Get media items for this activity
            const mediaItems =
              activity.type === 'route_created' ? getRouteMediaItems(activity.data) : [];

            return (
              <YStack
                key={activity.id}
                backgroundColor="rgba(255, 255, 255, 0.05)"
                borderRadius={12}
                padding="$4"
                gap="$4"
                borderWidth={1}
                borderColor="rgba(255, 255, 255, 0.1)"
              >
                {/* User info header */}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedUserId(activity.user.id);
                    setShowUserProfileSheet(true);
                  }}
                >
                  <XStack alignItems="center" gap="$3">
                    {activity.user.avatar_url ? (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          overflow: 'hidden',
                          backgroundColor: '#444',
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
                          backgroundColor: '#444',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name="user" size={20} color="#ddd" />
                      </View>
                    )}

                    <YStack flex={1}>
                      <Text fontSize={16} fontWeight="600" color="$color">
                        {activity.user.full_name}
                      </Text>
                      <XStack alignItems="center" gap={6}>
                        <Feather
                          name={
                            activity.type === 'route_created'
                              ? 'map'
                              : activity.type === 'event_created'
                                ? 'calendar'
                                : 'check-circle'
                          }
                          size={14}
                          color="$primary"
                        />
                        <Text fontSize={14} color="$gray11">
                          {activity.type === 'route_created'
                            ? 'created a route'
                            : activity.type === 'event_created'
                              ? 'created an event'
                              : 'completed exercise'}
                        </Text>
                      </XStack>
                    </YStack>

                    <Text fontSize={12} color="$gray9">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </Text>
                  </XStack>
                </TouchableOpacity>

                {/* Media Preview */}
                {mediaItems.length > 0 && (
                  <View style={{ height: 180, borderRadius: 12, overflow: 'hidden' }}>
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
                        onPress={() =>
                          console.log('🎥 Video play requested:', mediaItems[0].data.url)
                        }
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
                              width: 60,
                              height: 60,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Play size={24} color="#FFF" />
                          </View>
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
                )}

                {/* Activity content */}
                {activity.type === 'route_created' && (
                  <TouchableOpacity onPress={() => handleRoutePress(activity.data.id)}>
                    <YStack gap="$2">
                      <Text fontSize={16} fontWeight="500" color="$color">
                        {activity.data.name}
                      </Text>
                      <XStack gap="$4">
                        <XStack alignItems="center" gap={4}>
                          <Feather name="bar-chart" size={12} color="$gray11" />
                          <Text fontSize={13} color="$gray11">
                            {activity.data.difficulty}
                          </Text>
                        </XStack>
                        <XStack alignItems="center" gap={4}>
                          <Feather name="map-pin" size={12} color="$gray11" />
                          <Text fontSize={13} color="$gray11">
                            {activity.data.spot_type}
                          </Text>
                        </XStack>
                      </XStack>
                      {activity.data.description && (
                        <Text fontSize={13} color="$gray10" numberOfLines={2}>
                          {activity.data.description}
                        </Text>
                      )}
                    </YStack>
                  </TouchableOpacity>
                )}

                {activity.type === 'event_created' && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('EventDetail', { eventId: activity.data.id })
                    }
                  >
                    <YStack gap="$2">
                      <Text fontSize={16} fontWeight="500" color="$color">
                        {activity.data.title}
                      </Text>
                      <XStack alignItems="center" gap={4}>
                        <Feather name="calendar" size={12} color="$gray11" />
                        <Text fontSize={13} color="$gray11">
                          {activity.data.event_date
                            ? new Date(activity.data.event_date).toLocaleDateString()
                            : 'No date set'}
                        </Text>
                      </XStack>
                      {activity.data.description && (
                        <Text fontSize={13} color="$gray10" numberOfLines={2}>
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
                        routeId: '',
                        exercises: [activity.data.exercise],
                        routeName: 'Exercise',
                        startIndex: 0,
                      });
                    }}
                  >
                    <YStack gap="$2">
                      <Text fontSize={16} fontWeight="500" color="$color">
                        {activity.data.exercise.title?.en ||
                          activity.data.exercise.title?.sv ||
                          'Exercise'}
                      </Text>
                      <XStack alignItems="center" gap={4}>
                        <Feather name="check-circle" size={12} color="$green9" />
                        <Text fontSize={13} color="$green9">
                          Exercise Completed
                        </Text>
                      </XStack>
                      {activity.data.exercise.description && (
                        <Text fontSize={13} color="$gray10" numberOfLines={2}>
                          {activity.data.exercise.description?.en ||
                            activity.data.exercise.description?.sv}
                        </Text>
                      )}
                    </YStack>
                  </TouchableOpacity>
                )}
              </YStack>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
});
