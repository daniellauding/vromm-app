import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map } from '../components/Map';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';
import { YStack, XStack, Card, Input, Text } from 'tamagui';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

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
  const searchInputRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location.LocationGeocodedAddress[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [region, setRegion] = useState({
    latitude: 55.7047,
    longitude: 13.191,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion(prev => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      }
    })();
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
        return Array.isArray(waypointsData) ? waypointsData : [];
      });

      if (allWaypoints.length > 0) {
        const latitudes = allWaypoints.map((wp: WaypointData) => wp.lat).filter(Boolean);
        const longitudes = allWaypoints.map((wp: WaypointData) => wp.lng).filter(Boolean);
        
        if (latitudes.length > 0 && longitudes.length > 0) {
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
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const getAllWaypoints = () => {
    return routes.flatMap(route => {
      const waypointsFromDetails = Array.isArray(route.waypoint_details) ? route.waypoint_details.map((wp: WaypointData) => ({
        latitude: wp.lat,
        longitude: wp.lng,
        title: wp.title || route.name,
        description: wp.description || `${route.spot_type} - ${route.difficulty}`,
        onPress: () => navigation.navigate('RouteDetail', { routeId: route.id }),
      })) : [];

      const waypointsFromMetadata = Array.isArray(route.metadata?.waypoints) ? route.metadata.waypoints.map((wp: WaypointData) => ({
        latitude: wp.lat,
        longitude: wp.lng,
        title: wp.title || route.name,
        description: wp.description || `${route.spot_type} - ${route.difficulty}`,
        onPress: () => navigation.navigate('RouteDetail', { routeId: route.id }),
      })) : [];

      const pinsFromMetadata = Array.isArray(route.metadata?.pins) ? route.metadata.pins.map((pin: PinData) => ({
        latitude: pin.lat,
        longitude: pin.lng,
        title: pin.title || route.name,
        description: pin.description || `${route.spot_type} - ${route.difficulty}`,
        onPress: () => navigation.navigate('RouteDetail', { routeId: route.id }),
      })) : [];

      return waypointsFromDetails.length > 0 
        ? waypointsFromDetails 
        : waypointsFromMetadata.length > 0
          ? waypointsFromMetadata
          : pinsFromMetadata;
    });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      try {
        // Try with city/country first
        let results = await Location.geocodeAsync(query);
        
        // If no results, try with more specific search
        if (results.length === 0) {
          // Add country/city to make search more specific
          const searchTerms = [
            `${query}, Sweden`,
            `${query}, Gothenburg`,
            `${query}, Stockholm`,
            `${query}, Malmö`,
            query // Original query as fallback
          ];

          for (const term of searchTerms) {
            results = await Location.geocodeAsync(term);
            if (results.length > 0) break;
          }
        }

        if (results.length > 0) {
          const addresses = await Promise.all(
            results.map(async result => {
              const address = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });
              return {
                ...address[0],
                coords: {
                  latitude: result.latitude,
                  longitude: result.longitude,
                }
              };
            })
          );

          // Filter out duplicates and null values
          const uniqueAddresses = addresses.filter((addr, index, self) => 
            addr && addr.coords &&
            index === self.findIndex(a => 
              a.coords?.latitude === addr.coords?.latitude && 
              a.coords?.longitude === addr.coords?.longitude
            )
          );

          setSearchResults(uniqueAddresses);
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }, 300); // Reduced delay to 300ms for more responsive feel

    setSearchTimeout(timeout);
  };

  const handleLocationSelect = (result: (Location.LocationGeocodedAddress & { coords?: { latitude: number; longitude: number } })) => {
    if (result.coords) {
      setRegion({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSearchQuery(`${result.street || ''} ${result.city || ''} ${result.country || ''}`.trim());
      setShowSearchResults(false);
    }
  };

  const handleLocateMe = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setRegion(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }));
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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
    <View style={styles.container}>
      <Map
        waypoints={getAllWaypoints()}
        region={region}
        onRegionChangeComplete={setRegion}
        style={styles.map}
        showControls={false}
      />
      
      <SafeAreaView style={styles.searchContainer} edges={['top']}>
        <XStack padding="$4" gap="$2">
          <Input
            ref={searchInputRef}
            flex={1}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search location..."
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$2"
            height="$10"
            paddingLeft="$3"
            fontSize="$2"
          />
          <XStack
            backgroundColor="$background"
            borderRadius="$2"
            width="$10"
            height="$10"
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor="$borderColor"
            onPress={handleLocateMe}
            pressStyle={{ opacity: 0.7 }}
          >
            <Feather name="navigation" size={20} />
          </XStack>
        </XStack>

        {showSearchResults && searchResults.length > 0 && (
          <Card
            elevate
            bordered
            backgroundColor="$background"
            margin="$4"
            marginTop={0}
          >
            <YStack padding="$2">
              {searchResults.map((result, index) => (
                <XStack
                  key={index}
                  padding="$3"
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => handleLocationSelect(result)}
                >
                  <Feather name="map-pin" size={16} marginRight="$2" />
                  <YStack>
                    <Text>
                      {[result.street, result.city, result.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </YStack>
                </XStack>
              ))}
            </YStack>
          </Card>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
}); 