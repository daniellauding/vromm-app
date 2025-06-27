import React, { useMemo } from 'react';
import { View, Image, useColorScheme, Dimensions } from 'react-native';
import { YStack, Text, Card, XStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Feather } from '@expo/vector-icons';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { Database } from '../lib/database.types';
import { parseRecordingStats, isRecordedRoute } from '../utils/routeUtils';

type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type MediaAttachment = {
  url: string;
  type: 'image' | 'video';
  description?: string;
};

type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    id?: string;
    full_name: string;
  } | null;
  creator_id?: string;
  metadata: {
    waypoints?: WaypointData[];
  };
  waypoint_details: WaypointData[];
  media_attachments?: MediaAttachment[];
  reviews?: {
    id: string;
    rating: number;
    content: string;
    difficulty: string;
    visited_at: string;
    created_at: string;
    images: { url: string; description?: string }[];
    user: { id: string; full_name: string };
  }[];
};

interface RouteCardProps {
  route: Route;
}

export function RouteCard({ route }: RouteCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const width = Dimensions.get('window').width - 32; // Account for padding

  const getMapRegion = () => {
    const waypointsData = (route.waypoint_details ||
      route.metadata?.waypoints ||
      []) as WaypointData[];
    if (waypointsData.length > 0) {
      const latitudes = waypointsData.map((wp) => Number(wp.lat));
      const longitudes = waypointsData.map((wp) => Number(wp.lng));

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
    }
    return null;
  };

  const getWaypoints = () => {
    const waypointsData = (route.waypoint_details ||
      route.metadata?.waypoints ||
      []) as WaypointData[];
    return waypointsData.map((wp) => ({
      latitude: Number(wp.lat),
      longitude: Number(wp.lng),
      title: wp.title?.toString(),
      description: wp.description?.toString(),
    }));
  };

  const region = getMapRegion();
  const waypoints = getWaypoints();
  const imageAttachments = route.media_attachments?.filter((m) => m.type === 'image') || [];

  const carouselItems = useMemo(() => {
    const items = [];

    // Add map if waypoints exist
    if (region && waypoints.length > 0) {
      // Create route path for recorded routes (more than just waypoints)
      const routePath = waypoints.length > 2 ? waypoints : undefined;
      const showStartEndMarkers = waypoints.length > 2 && (route.drawing_mode === 'waypoint' || route.drawing_mode === 'record');

      items.push({
        type: 'map' as const,
        data: { 
          region, 
          waypoints, 
          routePath,
          showStartEndMarkers,
          drawingMode: route.drawing_mode 
        },
      });
    }

    // Add route media attachments
    const media =
      route.media_attachments
        ?.filter((m) => m.type === 'image')
        .map((m) => ({
          type: 'image' as const,
          data: {
            url: m.url,
            description: m.description,
          },
        })) || [];

    return [...items, ...media];
  }, [route.media_attachments, region, waypoints, route.drawing_mode]);

  return (
    <Card
      padding="$4"
      pressStyle={{ scale: 0.98 }}
      onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
    >
      <YStack space="$4">
        {carouselItems.length > 0 && (
          <View style={{ height: 200, borderRadius: 16, overflow: 'hidden' }}>
            {carouselItems.length === 1 ? (
              <View style={{ flex: 1 }}>
                {carouselItems[0].type === 'map' ? (
                  <Map
                    waypoints={carouselItems[0].data.waypoints}
                    region={carouselItems[0].data.region}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    style={{ width: '100%', height: '100%' }}
                    routePath={carouselItems[0].data.routePath}
                    showStartEndMarkers={carouselItems[0].data.showStartEndMarkers}
                    drawingMode={carouselItems[0].data.drawingMode}
                  />
                ) : (
                  <Image
                    source={{ uri: carouselItems[0].data.url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                )}
              </View>
            ) : (
              <Carousel
                loop
                width={width}
                height={200}
                data={carouselItems}
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
                      />
                    ) : (
                      <Image
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

        <YStack space="$3">
          <Text fontSize="$5" fontWeight="bold">
            {route.name}
          </Text>

          <XStack space="$2" alignItems="center">
            <Feather name="user" size={16} color={iconColor} />
            <Text
              color="$gray11"
              onPress={() => {
                console.log('RouteCard: Navigating to profile, creator:', route.creator);
                if (route.creator?.id) {
                  console.log('RouteCard: Using creator.id:', route.creator.id);
                  navigation.navigate('PublicProfile', { userId: route.creator.id });
                } else if (route.creator_id) {
                  console.log('RouteCard: Using creator_id:', route.creator_id);
                  navigation.navigate('PublicProfile', { userId: route.creator_id });
                } else {
                  console.log('RouteCard: No creator ID available');
                }
              }}
              pressStyle={{ opacity: 0.7 }}
            >
              {route.creator?.full_name || 'Unknown'}
            </Text>
          </XStack>

          <XStack space="$4">
            <XStack space="$1" alignItems="center">
              <Feather name="bar-chart" size={16} color={iconColor} />
              <Text>{route.difficulty}</Text>
            </XStack>

            <XStack space="$1" alignItems="center">
              <Feather name="map-pin" size={16} color={iconColor} />
              <Text>{route.spot_type}</Text>
            </XStack>
          </XStack>

          <XStack space="$2" alignItems="center">
            <XStack space="$1" alignItems="center">
              <Feather name="star" size={16} color={iconColor} />
              <Text fontSize="$4" fontWeight="bold" color="$yellow10">
                {route.reviews?.[0]?.rating?.toFixed(1) || '0.0'}
              </Text>
            </XStack>
            <Text color="$gray11">
              {route.reviews?.length || 0} {route.reviews?.length === 1 ? 'review' : 'reviews'}
            </Text>
          </XStack>

          {/* Recording Stats - Only show for recorded routes */}
          {isRecordedRoute(route) && (() => {
            const recordingStats = parseRecordingStats(route.description || '');
            if (!recordingStats) return null;
            
            return (
              <XStack gap="$3" alignItems="center" marginTop="$2">
                <Feather name="activity" size={14} color="$green10" />
                <Text fontSize="$3" color="$green10" fontWeight="600">
                  📍 {recordingStats.distance} • ⏱️ {recordingStats.duration} • 🚗 {recordingStats.maxSpeed}
                </Text>
              </XStack>
            );
          })()}

          {route.description && !isRecordedRoute(route) && (
            <Text numberOfLines={2} color="$gray11">
              {route.description}
            </Text>
          )}
        </YStack>
      </YStack>
    </Card>
  );
}
