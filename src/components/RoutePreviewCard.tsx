import { View, Image, useColorScheme, Dimensions } from 'react-native';
import { Card, YStack, XStack, Text } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Feather } from '@expo/vector-icons';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { Region } from 'react-native-maps';
import type { Route, WaypointData } from '../hooks/useRoutes';
import { useCallback, useState, useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';

type MapItem = {
  type: 'map';
  data: {
    waypoints: {
      latitude: number;
      longitude: number;
      title?: string;
      description?: string;
    }[];
    region: Region;
  };
};

type ImageItem = {
  type: 'image';
  data: {
    url: string;
    description?: string;
  };
};

type CarouselItem = MapItem | ImageItem;

type RoutePreviewCardProps = {
  route: Route & {
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
    average_rating?: { rating: number }[];
  };
  showMap?: boolean;
  onPress?: () => void;
};

export function RoutePreviewCard({ route, showMap = true, onPress }: RoutePreviewCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const width = Dimensions.get('window').width - 32;
  const progressValue = useSharedValue<number>(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleProgressChange = useCallback((value: number) => {
    setActiveIndex(Math.round(value));
  }, []);

  const getMapRegion = () => {
    const waypointsData = (route.waypoint_details ||
      route.metadata?.waypoints ||
      []) as WaypointData[];
    if (waypointsData && waypointsData.length > 0) {
      const latitudes = waypointsData.map((wp) => wp.lat);
      const longitudes = waypointsData.map((wp) => wp.lng);

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

  const getAllWaypoints = () => {
    const waypointsData = (route.waypoint_details ||
      route.metadata?.waypoints ||
      []) as WaypointData[];
    return waypointsData.map((wp) => ({
      latitude: wp.lat,
      longitude: wp.lng,
      title: wp.title,
      description: wp.description,
    }));
  };

  const carouselItems = useMemo(() => {
    const items = [];

    // Add map if waypoints exist
    const region = getMapRegion();
    const waypoints = getAllWaypoints();
    if (showMap && region && waypoints.length > 0) {
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

    // Add review images
    const reviewImages =
      route.reviews?.flatMap((review) =>
        (review.images || []).map((image) => ({
          type: 'image' as const,
          data: {
            url: image.url,
            description: image.description,
          },
        })),
      ) || [];

    return [...items, ...media, ...reviewImages];
  }, [route.media_attachments, route.reviews, showMap, route.drawing_mode]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('RouteDetail', { routeId: route.id });
    }
  };

  return (
    <Card
      elevate
      bordered
      backgroundColor="$background"
      pressStyle={{ scale: 0.98 }}
      onPress={handlePress}
      margin="$4"
      marginBottom="$8"
      overflow="hidden"
    >
      <YStack>
        {/* Carousel */}
        {carouselItems.length > 0 && (
          <View
            style={{
              height: 220,
              width: '100%',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: 'hidden',
            }}
          >
            {carouselItems.length === 1 ? (
              <View style={{ flex: 1, width: '100%', height: '100%' }}>
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
            ) : carouselItems.length > 1 ? (
              <Carousel
                loop
                width={width}
                height={220}
                data={carouselItems}
                defaultIndex={0}
                autoPlay={false}
                enabled={true}
                onProgressChange={handleProgressChange}
                renderItem={({ item }) => (
                  <View style={{ flex: 1, width: '100%', height: '100%' }}>
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
            ) : null}
          </View>
        )}

        {/* Content */}
        <YStack padding="$4" gap="$2">
          <Text fontSize="$5" fontWeight="bold" numberOfLines={2}>
            {route.name}
          </Text>

          <XStack space="$2" alignItems="center">
            <XStack space="$1" alignItems="center">
              <Feather name="star" size={16} color={iconColor} />
              <Text fontSize="$4" fontWeight="bold" color="$yellow10">
                {route.average_rating?.[0]?.rating || 0}
              </Text>
            </XStack>
            <Text color="$gray11">
              {route.reviews?.length || 0}{' '}
              {(route.reviews?.length || 0) === 1 ? 'review' : 'reviews'}
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

          {route.description && (
            <Text numberOfLines={2} color="$gray11">
              {route.description}
            </Text>
          )}
        </YStack>
      </YStack>
    </Card>
  );
}
