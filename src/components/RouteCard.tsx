import React, { useMemo } from 'react';
import { View, Image, useColorScheme, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { YStack, Text, Card, XStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Feather } from '@expo/vector-icons';
import { Play } from '@tamagui/lucide-icons';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { ImageWithFallback } from './ImageWithFallback';
import { Database } from '../lib/database.types';
import { parseRecordingStats, isRecordedRoute } from '../utils/routeUtils';
import { AppAnalytics } from '../utils/analytics';
import { PIN_COLORS } from '../styles/mapStyles';

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
  onPress?: () => void;
}

export function RouteCard({ route, onPress }: RouteCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const width = Dimensions.get('window').width - 32; // Account for padding

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Navigation function to be called from runOnJS
  const navigateToRoute = () => {
    // Track route card interaction
    AppAnalytics.trackButtonPress(
      'route_card', 
      'RouteCard',
      {
        route_id: route.id,
        route_title: route.title,
        route_type: route.spot_type,
        has_onpress_callback: !!onPress,
      }
    ).catch(() => {
      // Silently fail analytics
    });

    if (onPress) {
      // When onPress is provided, ONLY call the callback (for sheets)
      onPress();
    } else {
      // Default behavior: Open route detail under Map tab so Map tab remains active
      // @ts-ignore
      navigation.navigate('MainTabs', {
        screen: 'MapTab',
        params: { screen: 'RouteDetail', params: { routeId: route.id } },
      });
    }
  };

  // Enhanced press handler with animations
  const handlePress = () => {
    // Zoom and fade animation sequence
    scale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 300 }),
      withSpring(1.05, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    opacity.value = withSequence(
      withSpring(0.8, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 }, () => {
        // Navigate after animation completes
        runOnJS(navigateToRoute)();
      })
    );
  };

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
      const showStartEndMarkers = true; // Always show markers for better visibility

      // Extract pen drawing coordinates from metadata
      const penDrawingCoordinates = route.metadata?.coordinates || [];

      // Map item added

      items.push({
        type: 'map' as const,
        data: {
          region,
          waypoints,
          routePath,
          showStartEndMarkers,
          drawingMode: route.drawing_mode,
          penDrawingCoordinates,
        },
      });
    }

    // Add route media attachments (deduplicated) - include images AND videos
    const uniqueAttachments = route.media_attachments
      ?.filter((m, index, arr) => 
        (m.type === 'image' || m.type === 'video') && 
        arr.findIndex(a => a.url === m.url && a.type === m.type) === index
      ) || [];

    // Media attachments processed

    // Validate and filter out invalid URLs
    const validAttachments = uniqueAttachments.filter((m) => {
      const isValidUrl = m.url && (
        m.url.startsWith('http://') || 
        m.url.startsWith('https://') || 
        m.url.startsWith('file://') ||
        m.url.startsWith('data:') ||
        m.url.startsWith('content://')
      );
      
      if (!isValidUrl) {
        // Invalid media URL skipped
        return false;
      }
      
      return true;
    });

    // Media validation completed

    const media = validAttachments.map((m) => ({
      type: m.type as const,
      data: {
        url: m.url,
        description: m.description,
      },
    }));

    return [...items, ...media];
  }, [route.media_attachments, region, waypoints, route.drawing_mode]);

  return (
    <Animated.View style={animatedStyle}>
      <Card
        padding="$4"
        onPress={handlePress}
      >
      <YStack space="$4">
        {carouselItems.length > 0 && (
          <View style={{ height: 200, borderRadius: 16, overflow: 'hidden' }}>
            {carouselItems.length === 1 ? (
              <View style={{ flex: 1 }}>
                {carouselItems[0].type === 'map' ? (
                  (() => {
                    return (
                      <Map
                        waypoints={carouselItems[0].data.waypoints}
                        region={carouselItems[0].data.region}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        style={{ width: '100%', height: '100%' }}
                        routePath={carouselItems[0].data.routePath}
                        routePathColor={PIN_COLORS.ROUTE_PATH}
                        showStartEndMarkers={carouselItems[0].data.showStartEndMarkers}
                        drawingMode={carouselItems[0].data.drawingMode}
                        penDrawingCoordinates={carouselItems[0].data.penDrawingCoordinates}
                      />
                    );
                  })()
                                  ) : carouselItems[0].type === 'video' ? (
                    <TouchableOpacity 
                      style={{ width: '100%', height: '100%', position: 'relative' }}
                      onPress={() => console.log('🎥 Video play requested:', carouselItems[0].data.url)}
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
                          width: 80,
                          height: 80,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          <Play size={32} color="#FFF" />
                        </View>
                        <Text style={{ color: '#FFF', marginTop: 8, fontSize: 12 }}>
                          Tap to play video
                        </Text>
                      </View>
                    </TouchableOpacity>
                ) : (
                  <ImageWithFallback
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
                        routePathColor={PIN_COLORS.ROUTE_PATH}
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
                              borderRadius: 50,
                              width: 80,
                              height: 80,
                              justifyContent: 'center',
                              alignItems: 'center'
                            }}>
                              <Play size={32} color="#FFF" />
                            </View>
                            <Text style={{ color: '#FFF', marginTop: 8, fontSize: 12 }}>
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
          {isRecordedRoute(route) &&
            (() => {
              const recordingStats = parseRecordingStats(route.description || '');
              if (!recordingStats) return null;

              return (
                <XStack gap="$3" alignItems="center" marginTop="$2">
                  <Feather name="activity" size={14} color="$green10" />
                  <Text fontSize="$3" color="$green10" fontWeight="600">
                    📍 {recordingStats.distance} • ⏱️ {recordingStats.duration} • 🚗{' '}
                    {recordingStats.maxSpeed}
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
    </Animated.View>
  );
}
