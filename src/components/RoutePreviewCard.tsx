import { View, Image, useColorScheme, Dimensions } from 'react-native';
import { Card, YStack, XStack, Text } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Feather } from '@expo/vector-icons';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { Region } from 'react-native-maps';
import type { Route, WaypointData } from '../hooks/useRoutes';
import { useCallback, useState } from 'react';
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
  };
};

type CarouselItem = MapItem | ImageItem;

type RoutePreviewCardProps = {
  route: Route & {
    reviews: {
      id: string;
      rating: number;
      content: string;
      difficulty: string;
      visited_at: string;
      created_at: string;
      images: { url: string; description?: string }[];
      user: {
        id: string;
        full_name: string;
      };
    }[];
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
    const waypointsData = (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[];
    if (waypointsData && waypointsData.length > 0) {
      const latitudes = waypointsData.map(wp => wp.lat);
      const longitudes = waypointsData.map(wp => wp.lng);
      
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
    }
    return null;
  };

  const getWaypoints = () => {
    const waypointsData = (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[];
    return waypointsData.map(wp => ({
      latitude: wp.lat,
      longitude: wp.lng,
      title: wp.title,
      description: wp.description,
    }));
  };

  // Prepare carousel items
  const carouselItems: CarouselItem[] = [];
  const region = getMapRegion();
  const waypoints = getWaypoints();
  const imageAttachments = route.media_attachments?.filter(attachment => attachment.type === 'image') || [];
  
  if (showMap && region && waypoints.length > 0) {
    carouselItems.push({
      type: 'map',
      data: {
        waypoints,
        region
      }
    });
  }

  imageAttachments.forEach(attachment => {
    carouselItems.push({
      type: 'image',
      data: {
        url: attachment.url
      }
    });
  });

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('RouteDetail', { routeId: route.id });
    }
  };

  return (
    <Card
      padding="$4"
      pressStyle={{ scale: 0.98 }}
      onPress={handlePress}
    >
      <YStack space="$4">
        {carouselItems.length > 0 && (
          <View>
            <View style={{ height: 220 }}>
              {carouselItems.length === 1 ? (
                <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                  {carouselItems[0].type === 'map' ? (
                    <Map
                      waypoints={carouselItems[0].data.waypoints}
                      region={carouselItems[0].data.region}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
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
                  width={width - 32}
                  height={220}
                  data={carouselItems}
                  defaultIndex={0}
                  autoPlay={false}
                  enabled={true}
                  onProgressChange={handleProgressChange}
                  renderItem={({ item }) => (
                    <View style={{ borderRadius: 16, overflow: 'hidden' }}>
                      {item.type === 'map' ? (
                        <Map
                          waypoints={item.data.waypoints}
                          region={item.data.region}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          pitchEnabled={false}
                          rotateEnabled={false}
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
            {carouselItems.length > 1 && (
              <XStack 
                position="absolute" 
                bottom={8} 
                left={0} 
                right={0} 
                justifyContent="center" 
                space="$2"
                zIndex={1}
              >
                {carouselItems.map((_, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <View
                      key={index}
                      style={{
                        width: isActive ? 8 : 6,
                        height: isActive ? 8 : 6,
                        borderRadius: isActive ? 4 : 3,
                        backgroundColor: '#FFFFFF',
                        opacity: isActive ? 1 : 0.5,
                      }}
                    />
                  );
                })}
              </XStack>
            )}
          </View>
        )}
        
        <YStack space="$3">
          <Text fontSize="$5" fontWeight="bold">{route.name}</Text>
          
          <XStack space="$2" alignItems="center">
            <Feather name="user" size={16} color={iconColor} />
            <Text color="$gray11">{route.creator?.full_name || 'Unknown'}</Text>
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
                {route.reviews?.length > 0 
                  ? (route.reviews.reduce((sum, review) => sum + review.rating, 0) / route.reviews.length).toFixed(1)
                  : '0.0'
                }
              </Text>
            </XStack>
            <Text color="$gray11">
              {route.reviews?.length || 0} {route.reviews?.length === 1 ? 'review' : 'reviews'}
            </Text>
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