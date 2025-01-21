import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { YStack, Text, Card, XStack, Button } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';
import { Feather } from '@expo/vector-icons';
import { Map } from './Map';

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

type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
  metadata: RouteMetadata;
  waypoint_details: WaypointData[];
};

type RouteListProps = {
  routes: Route[];
  onRefresh?: () => Promise<void>;
};

export function RouteList({ routes, onRefresh }: RouteListProps) {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

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

    return (
      <Card
        marginVertical="$2"
        padding="$4"
        bordered
        pressStyle={{ scale: 0.98 }}
        onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
      >
        <YStack space="$2">
          <Text fontSize="$5" fontWeight="bold">{route.name}</Text>
          
          <XStack space="$2" alignItems="center">
            <Feather name="user" size={16} />
            <Text color="$gray11">{route.creator?.full_name || 'Unknown'}</Text>
          </XStack>
          
          {region && waypoints.length > 0 && (
            <View style={{ height: 150, marginVertical: 8 }}>
              <Map
                waypoints={waypoints}
                region={region}
                style={{ borderRadius: 8 }}
              />
            </View>
          )}
          
          <XStack space="$4">
            <XStack space="$1" alignItems="center">
              <Feather name="bar-chart" size={16} />
              <Text>{route.difficulty}</Text>
            </XStack>
            
            <XStack space="$1" alignItems="center">
              <Feather name="map-pin" size={16} />
              <Text>{route.spot_type}</Text>
            </XStack>
          </XStack>

          {route.description && (
            <Text numberOfLines={2} color="$gray11">
              {route.description}
            </Text>
          )}
        </YStack>
      </Card>
    );
  };

  return (
    <FlatList
      data={routes}
      renderItem={renderRoute}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={() => (
        <YStack padding="$4" alignItems="center">
          <Text color="$gray11">No routes found</Text>
        </YStack>
      )}
    />
  );
} 