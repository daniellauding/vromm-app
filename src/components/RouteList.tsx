import { useState, useCallback } from 'react';
import { FlatList, RefreshControl, View, useColorScheme, Image, Dimensions } from 'react-native';
import { YStack, Text, Card, XStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';
import { Feather } from '@expo/vector-icons';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { Region } from 'react-native-maps';
import { useSharedValue } from 'react-native-reanimated';

type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type RouteMetadata = {
  waypoints?: WaypointData[];
  pins?: any[];
  options?: {
    reverse: boolean;
    closeLoop: boolean;
    doubleBack: boolean;
  };
  coordinates?: any[];
};

type MediaAttachment = {
  url: string;
  type: 'image' | 'video';
  description?: string;
};

type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
  metadata: RouteMetadata;
  waypoint_details: WaypointData[];
  media_attachments?: MediaAttachment[];
  reviews?: { count: number }[];
  average_rating?: { rating: number }[];
  review_count?: number;
  comment_count?: number;
};

type RouteListProps = {
  routes: Route[];
  onRefresh?: () => Promise<void>;
};

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

export function RouteList({ routes, onRefresh }: RouteListProps) {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndices, setActiveIndices] = useState<Record<string, number>>({});
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const width = Dimensions.get('window').width - 32; // Full width minus padding
  const progressValues = useSharedValue<Record<string, number>>({});

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleProgressChange = useCallback((routeId: string, value: number) => {
    setActiveIndices(prev => ({
      ...prev,
      [routeId]: Math.round(value)
    }));
  }, []);

  const getMapRegion = (route: Route) => {
    const waypointsData = route.waypoint_details || route.metadata?.waypoints || [];
    if (waypointsData && waypointsData.length > 0) {
      const latitudes = waypointsData.map((wp: WaypointData) => wp.lat);
      const longitudes = waypointsData.map((wp: WaypointData) => wp.lng);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      // Add small padding for closer zoom
      const latPadding = (maxLat - minLat) * 0.1;
      const lngPadding = (maxLng - minLng) * 0.1;
      
      // Ensure minimum zoom level for single waypoint
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

  const getWaypoints = (route: Route) => {
    const waypointsData = (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[];
    return waypointsData.map((wp: WaypointData) => ({
      latitude: wp.lat,
      longitude: wp.lng,
      title: wp.title,
      description: wp.description,
    }));
  };

  const renderRoute = ({ item: route }: { item: Route }) => {
    const region = getMapRegion(route);
    const waypoints = getWaypoints(route);
    const imageAttachments = route.media_attachments?.filter(attachment => attachment.type === 'image') || [];

    // Combine map and images into a single carousel data array
    const carouselItems: CarouselItem[] = [];
    
    // Add map as first item if we have waypoints
    if (region && waypoints.length > 0) {
      carouselItems.push({
        type: 'map',
        data: {
          waypoints,
          region
        }
      });
    }

    // Add images
    imageAttachments.forEach(attachment => {
      carouselItems.push({
        type: 'image',
        data: {
          url: attachment.url
        }
      });
    });

    return (
      <Card
        padding="$0"
        pressStyle={{ scale: 1 }}
        onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
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
                    onProgressChange={(value) => handleProgressChange(route.id, value)}
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
                    const isActive = index === (activeIndices[route.id] || 0);
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
          
          <YStack space="$4" padding="$0" margin="$0">
            <Text fontSize="$5" fontWeight="bold">{route.name}</Text>
            
            <YStack space="$3">
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
                    {route.average_rating?.[0]?.rating || '0.0'}
                  </Text>
                </XStack>
                <Text color="$gray11">
                  {route.reviews?.[0]?.count || route.review_count || 0} {(route.reviews?.[0]?.count || route.review_count || 0) === 1 ? 'review' : 'reviews'}
                </Text>
              </XStack>

              {route.description && (
                <Text numberOfLines={2} color="$gray11">
                  {route.description}
                </Text>
              )}
            </YStack>
          </YStack>
        </YStack>
      </Card>
    );
  };

  return (
    <FlatList
      data={routes}
      renderItem={renderRoute}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ 
        padding: 0,
        paddingBottom: 100 // Extra padding for bottom tab bar
      }}
      ItemSeparatorComponent={() => <YStack height={64} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={() => (
        <YStack padding="$0" alignItems="center">
          <Text color="$gray11">No routes found</Text>
        </YStack>
      )}
    />
  );
} 