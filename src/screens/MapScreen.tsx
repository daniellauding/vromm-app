import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, useColorScheme, Animated, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, Waypoint } from '../components/Map';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';
import { YStack, XStack, Card, Input, Text, Sheet } from 'tamagui';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { useRoutes } from '../hooks/useRoutes';
import type { Route as RouteType, WaypointData } from '../hooks/useRoutes';
import { RoutePreviewCard } from '../components/RoutePreviewCard';
import { Region } from 'react-native-maps';
import { RouteList } from '../components/RouteList';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import MapView from 'react-native-maps';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

type SnapPoints = {
  collapsed: number;
  mid: number;
  expanded: number;
};

type GestureContext = {
  startY: number;
  offsetY: number;
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
  reviews?: { 
    id: string;
    rating: number;
    content: string;
    difficulty: string;
    visited_at: string;
    created_at: string;
    images: { url: string; description?: string }[];
    user: { id: string; full_name: string; };
  }[];
};

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  previewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: 0,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  routeListContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
});

const BOTTOM_NAV_HEIGHT = 80; // Height of bottom navigation bar including safe area

export function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const { fetchRoutes } = useRoutes();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const handleColor = colorScheme === 'dark' ? '#666' : '#CCC';
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const searchInputRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Memoize initial region
  const initialRegion = useMemo(() => ({
    latitude: 55.7047,
    longitude: 13.191,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }), []);

  const [region, setRegion] = useState(initialRegion);
  const { height: screenHeight } = Dimensions.get('window');
  const snapPoints = {
    expanded: 0, // Fully expanded
    mid: screenHeight * 0.4, // Show 60% of the screen
    collapsed: screenHeight - BOTTOM_NAV_HEIGHT - 140 // Show more of the handle + title above nav bar
  };
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.collapsed);
  const translateY = useRef(new Animated.Value(snapPoints.collapsed)).current;
  const lastGesture = useRef(snapPoints.collapsed);
  const scrollOffset = useRef(0);
  const isDragging = useRef(false);

  // Add selectedPin state
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // Create a map of routes by ID for quick lookup
  const routesById = useMemo(() => {
    return routes.reduce((acc, route) => {
      acc[route.id] = route;
      return acc;
    }, {} as Record<string, RouteType>);
  }, [routes]);

  const getAllWaypoints = useMemo(() => {
    return routes.map(route => {
      const waypointsData = (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[];
      const firstWaypoint = waypointsData[0];
      if (!firstWaypoint) return null;
      
      return {
        latitude: Number(firstWaypoint.lat),
        longitude: Number(firstWaypoint.lng),
        title: route.name,
        description: route.description || undefined,
        id: route.id
      };
    }).filter((wp): wp is NonNullable<typeof wp> => wp !== null);
  }, [routes]);

  const handleMarkerPress = useCallback((waypoint: Waypoint) => {
    const route = routesById[waypoint.id!];
    if (route) {
      setSelectedRoute(route);
      setSelectedPin(waypoint.id!);
    }
  }, [routesById]);

  const handleMapPress = useCallback(() => {
    if (selectedRoute) {
      setSelectedRoute(null);
      setSelectedPin(null);
    }
  }, [selectedRoute]);

  // Memoize getMapRegion to prevent recreation
  const getMapRegion = useMemo(() => {
    if (routes.length === 0) return null;
    
    const allWaypoints = routes.flatMap(route => 
      (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[]
    );
    
    if (allWaypoints.length === 0) return null;
    
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

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [routes]);

  // Update region only when getMapRegion changes
  useEffect(() => {
    const newRegion = getMapRegion;
    if (newRegion) {
      setRegion(newRegion);
    }
  }, [getMapRegion]);

  // Optimize loadRoutes to prevent unnecessary re-renders
  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutes();
    setRoutes(data);
  }, [fetchRoutes]);

  // Only run effect once on mount
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
      setIsMapReady(true);
    })();
  }, []);

  // Add filtered routes state
  const [filteredRoutes, setFilteredRoutes] = useState<RouteType[]>(routes);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set a new timeout for search
    const timeout = setTimeout(async () => {
      if (text.length > 0) {
        setIsSearching(true);
        try {
          // Use Mapbox Geocoding API for better place suggestions
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,address,country,region&language=en`
          );
          const data = await response.json();
          setSearchResults(data.features || []);
          setShowSearchResults(true);
        } catch (error) {
          console.error('Error searching locations:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }

      // Filter routes based on search text
      const searchLower = text.toLowerCase();
      const filtered = routes.filter(route => {
        return (
          route.name.toLowerCase().includes(searchLower) ||
          (route.description?.toLowerCase().includes(searchLower)) ||
          (route.creator?.full_name.toLowerCase().includes(searchLower))
        );
      });
      setFilteredRoutes(filtered);
    }, 300); // Reduced debounce time for better responsiveness

    setSearchTimeout(timeout);
  }, [routes]);

  // Reset filtered routes when routes change
  useEffect(() => {
    setFilteredRoutes(routes);
  }, [routes]);

  const handleLocationSelect = (result: SearchResult) => {
    try {
      if (!result?.center || result.center.length !== 2) {
        console.error('Invalid location data:', result);
        return;
      }

      const [longitude, latitude] = result.center;
      
      // Validate coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
          isNaN(latitude) || isNaN(longitude)) {
        console.error('Invalid coordinates:', { latitude, longitude });
        return;
      }

      // Different zoom levels based on place type
      let zoomLevel = 0.02; // default zoom (city level)
      if (result.place_type[0] === 'country') {
        zoomLevel = 8; // wide zoom for countries
      } else if (result.place_type[0] === 'region') {
        zoomLevel = 4; // medium zoom for regions
      } else if (result.place_type[0] === 'address') {
        zoomLevel = 0.005; // close zoom for addresses
      }

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: zoomLevel,
        longitudeDelta: zoomLevel,
      };

      setRegion(newRegion);
      setSearchQuery(result.place_name || '');
      setShowSearchResults(false);
    } catch (error) {
      console.error('Error selecting location:', error);
      // Optionally show an error message to the user
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

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!isDragging.current) return;

      const { translationY } = event.nativeEvent;
      const newPosition = lastGesture.current + translationY;

      // Add bounds checking
      const maxTop = snapPoints.expanded;  // Don't allow dragging above expanded position
      const maxBottom = snapPoints.collapsed; // Don't allow dragging below collapsed position
      const boundedPosition = Math.min(Math.max(newPosition, maxTop), maxBottom);

      translateY.setValue(boundedPosition);
    },
    [snapPoints]
  );

  const snapTo = useCallback((point: number) => {
    lastGesture.current = point;
    setCurrentSnapPoint(point);

    Animated.spring(translateY, {
      toValue: point,
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
      useNativeDriver: true,
    }).start();
  }, []);

  const onHandleStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      if (event.nativeEvent.state === State.BEGAN) {
        isDragging.current = true;
      } else if (event.nativeEvent.state === State.END) {
        isDragging.current = false;
        const { translationY, velocityY } = event.nativeEvent;
        const currentPosition = lastGesture.current + translationY;

        // Determine which snap point to go to based on position and velocity
        let targetSnapPoint;
        if (velocityY < -500) {
          // Fast upward swipe - go to expanded
          targetSnapPoint = snapPoints.expanded;
        } else if (velocityY > 500) {
          // Fast downward swipe - go to collapsed
          targetSnapPoint = snapPoints.collapsed;
        } else {
          // Based on position
          const positions = [snapPoints.expanded, snapPoints.mid, snapPoints.collapsed];
          targetSnapPoint = positions.reduce((prev, curr) => 
            Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev
          );
        }

        // Ensure the target point is within bounds
        const boundedTarget = Math.min(
          Math.max(targetSnapPoint, snapPoints.expanded),
          snapPoints.collapsed
        );

        snapTo(boundedTarget);
      }
    },
    [snapPoints, snapTo]
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isDragging.current) return;
    
    const { contentOffset } = event.nativeEvent;
    scrollOffset.current = contentOffset.y;

    // If user is scrolling and sheet is not expanded, expand it
    if (contentOffset.y > 0 && currentSnapPoint === snapPoints.collapsed) {
      snapTo(snapPoints.mid);
    }

    // If user scrolls to top and sheet is expanded, collapse it
    if (contentOffset.y === 0 && currentSnapPoint !== snapPoints.collapsed) {
      snapTo(snapPoints.collapsed);
    }
  }, [currentSnapPoint, snapPoints, snapTo]);

  // Update focus effect to reset both route and pin selection
  useFocusEffect(
    React.useCallback(() => {
      setSelectedRoute(null);
      setSelectedPin(null);
    }, [])
  );

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <Map
          key={`map-${routes.length}`}
          waypoints={getAllWaypoints}
          region={region}
          onPress={handleMapPress}
          style={StyleSheet.absoluteFillObject}
          selectedPin={selectedPin}
          onMarkerPress={handleMarkerPress}
        />

        {/* Search bar overlay */}
        <SafeAreaView style={[styles.searchContainer, { backgroundColor }]} edges={['top']}>
          <XStack padding="$2" gap="$2">
            <Input
              ref={searchInputRef}
              flex={1}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search cities, addresses, routes..."
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
              maxHeight={300}
            >
              <YStack padding="$2" space="$1">
                {searchResults.map((result) => (
                  <XStack
                    key={result.id}
                    padding="$3"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => handleLocationSelect(result)}
                    alignItems="center"
                    gap="$2"
                  >
                    <Feather 
                      name={
                        result.place_type[0] === 'country' ? 'flag' :
                        result.place_type[0] === 'region' ? 'map' :
                        result.place_type[0] === 'place' ? 'map-pin' :
                        'navigation'
                      } 
                      size={16} 
                      color={iconColor}
                    />
                    <YStack flex={1}>
                      <Text numberOfLines={1} fontWeight="600">
                        {result.place_name.split(',')[0]}
                      </Text>
                      <Text numberOfLines={1} fontSize="$1" color="$gray11">
                        {result.place_name.split(',').slice(1).join(',')}
                      </Text>
                    </YStack>
                  </XStack>
                ))}
              </YStack>
            </Card>
          )}
        </SafeAreaView>

        {/* Bottom sheet - hide when preview card is shown */}
        {!selectedRoute && (
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandleStateChange}
          >
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  height: screenHeight,
                  backgroundColor,
                  transform: [{ translateY }]
                }
              ]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: handleColor }]} />
                <XStack alignItems="center" gap="$2">
                  <Feather name="map" size={16} color={iconColor} />
                  <Text
                    fontSize="$4"
                    fontWeight="600"
                    color="$color"
                  >
                    {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'}
                  </Text>
                </XStack>
              </View>
              <View style={styles.routeListContainer}>
                <RouteList
                  routes={filteredRoutes}
                  onRefresh={loadRoutes}
                  onScroll={handleScroll}
                />
              </View>
            </Animated.View>
          </PanGestureHandler>
        )}

        {/* Route preview card */}
        {selectedRoute && (
          <View style={{ 
            position: 'absolute',
            bottom: BOTTOM_NAV_HEIGHT,
            left: 0,
            right: 0,
            backgroundColor: '$background',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}>
            <RoutePreviewCard
              route={selectedRoute}
              showMap={false}
              onPress={() => {
                navigation.navigate('RouteDetail', { routeId: selectedRoute.id });
                setSelectedRoute(null);
                setSelectedPin(null);
              }}
            />
          </View>
        )}
      </View>
    </Screen>
  );
} 