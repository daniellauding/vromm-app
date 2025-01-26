import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map } from '../components/Map';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';
import { YStack, XStack, Card, Input, Text } from 'tamagui';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { useRoutes } from '../hooks/useRoutes';
import type { Route as RouteType, WaypointData } from '../hooks/useRoutes';
import { RoutePreviewCard } from '../components/RoutePreviewCard';
import { Region } from 'react-native-maps';

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
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const { fetchRoutes } = useRoutes();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
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

  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutes();
    setRoutes(data);
  }, [fetchRoutes]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

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

  const handleMarkerPress = (route: RouteType) => {
    setSelectedRoute(route);
  };

  const handleMapPress = () => {
    setSelectedRoute(null);
  };

  const getAllWaypoints = () => {
    return routes.map(route => {
      const waypointsData = (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[];
      if (waypointsData.length === 0) return null;
      
      const firstWaypoint = waypointsData[0];
      return {
        latitude: firstWaypoint.lat,
        longitude: firstWaypoint.lng,
        onPress: () => handleMarkerPress(route),
      };
    }).filter((wp): wp is NonNullable<typeof wp> => wp !== null);
  };

  const getMapRegion = (): Region | undefined => {
    const allWaypoints = routes.flatMap(route => 
      (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[]
    );
    
    if (allWaypoints.length > 0) {
      const latitudes = allWaypoints.map(wp => wp.lat);
      const longitudes = allWaypoints.map(wp => wp.lng);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      const latPadding = (maxLat - minLat) * 0.1;
      const lngPadding = (maxLng - minLng) * 0.1;
      
      const minDelta = 0.01;
      const latDelta = Math.max((maxLat - minLat) + latPadding, minDelta);
      const lngDelta = Math.max((maxLng - minLng) + lngPadding, minDelta);

      const region: Region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
      return region;
    }
    return undefined;
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
    <View style={StyleSheet.absoluteFill}>
      <Map
        waypoints={getAllWaypoints()}
        region={getMapRegion()}
        onPress={handleMapPress}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.searchContainer} edges={['top']}>
        <XStack padding="$2" gap="$2">
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
            <Feather name="navigation" size={20} color={iconColor} />
          </XStack>
        </XStack>

        {showSearchResults && searchResults.length > 0 && (
          <Card
            elevate
            bordered
            backgroundColor="$background"
            margin="$2"
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

      {selectedRoute && (
        <YStack
          position="absolute"
          bottom={16}
          left={16}
          right={16}
        >
          <RoutePreviewCard
            route={selectedRoute}
            showMap={false}
          />
        </YStack>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
}); 