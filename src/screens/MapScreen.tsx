import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map } from '../components/Map';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';

type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type PinData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type RouteMetadata = {
  waypoints?: WaypointData[];
  pins?: PinData[];
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

export function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [region, setRegion] = useState({
    latitude: 55.7047, // Centered on Sweden
    longitude: 13.191,
    latitudeDelta: 0.1, // Smaller number = more zoomed in
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          creator:creator_id(full_name)
        `)
        .eq('is_public', true);

      if (error) throw error;
      const typedData = data as Route[];
      setRoutes(typedData);

      // Calculate bounds for all waypoints across all routes
      const allWaypoints = typedData.flatMap(route => {
        const waypointsData = route.waypoint_details || route.metadata?.waypoints || [];
        return waypointsData as WaypointData[];
      });

      if (allWaypoints.length > 0) {
        const latitudes = allWaypoints.map((wp: WaypointData) => wp.lat);
        const longitudes = allWaypoints.map((wp: WaypointData) => wp.lng);
        
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        
        // Add more padding to show a wider area
        const latPadding = Math.max((maxLat - minLat) * 0.5, 0.02);
        const lngPadding = Math.max((maxLng - minLng) * 0.5, 0.02);
        
        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) + latPadding, 0.02),
          longitudeDelta: Math.max((maxLng - minLng) + lngPadding, 0.02),
        });
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const getAllWaypoints = () => {
    return routes.flatMap(route => {
      // Get waypoints from all possible sources
      const waypointsFromDetails = (route.waypoint_details || []).map((wp: WaypointData) => ({
        latitude: wp.lat,
        longitude: wp.lng,
        title: wp.title || route.name,
        description: wp.description || `${route.spot_type} - ${route.difficulty}`,
        onPress: () => navigation.navigate('RouteDetail', { routeId: route.id }),
      }));

      const waypointsFromMetadata = (route.metadata?.waypoints || []).map((wp: WaypointData) => ({
        latitude: wp.lat,
        longitude: wp.lng,
        title: wp.title || route.name,
        description: wp.description || `${route.spot_type} - ${route.difficulty}`,
        onPress: () => navigation.navigate('RouteDetail', { routeId: route.id }),
      }));

      const pinsFromMetadata = (route.metadata?.pins || []).map((pin: PinData) => ({
        latitude: pin.lat,
        longitude: pin.lng,
        title: pin.title || route.name,
        description: pin.description || `${route.spot_type} - ${route.difficulty}`,
        onPress: () => navigation.navigate('RouteDetail', { routeId: route.id }),
      }));

      // Combine all sources, prioritizing waypoint_details
      return waypointsFromDetails.length > 0 
        ? waypointsFromDetails 
        : waypointsFromMetadata.length > 0
          ? waypointsFromMetadata
          : pinsFromMetadata;
    });
  };

  useEffect(() => {
    console.log('MapScreen mounted, fetching routes...');
  }, []);

  useEffect(() => {
    if (routes.length > 0) {
      console.log('Routes loaded:', {
        count: routes.length,
        waypoints: getAllWaypoints().length,
      });
    }
  }, [routes]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Map
          waypoints={getAllWaypoints()}
          region={region}
          onRegionChangeComplete={setRegion}
        />
      </View>
    </SafeAreaView>
  );
} 