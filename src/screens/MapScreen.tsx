import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Animated,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, Waypoint } from '../components/Map';
import { supabase } from '../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp, FilterCategory } from '../types/navigation';
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
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import MapView from 'react-native-maps';
import { ScrollView } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { useTranslation } from '../contexts/TranslationContext';

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

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
    user: { id: string; full_name: string };
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
    gap: 12,
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
  searchResultsContainer: {
    position: 'absolute',
    top: 60, // Below search bar
    left: 0,
    right: 0,
    backgroundColor: '$background',
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor',
    maxHeight: '80%',
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor',
  },
  distanceText: {
    fontSize: 14,
    color: '$gray11',
    marginLeft: 8,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  searchView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '$background',
    zIndex: 2,
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor',
    paddingBottom: 8,
  },
  searchResultsList: {
    maxHeight: '80%',
    backgroundColor: '$background',
  },
  searchBackButton: {
    padding: 8,
  },
});

const BOTTOM_NAV_HEIGHT = 80; // Height of bottom navigation bar including safe area

export function MapScreen({ route }: { route: any }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteType[]>([]);
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
  const [allFilters, setAllFilters] = useState<FilterCategory[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterCategory | null>(null);
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const { height: screenHeight } = Dimensions.get('window');
  const snapPoints = useMemo(
    () => ({
      expanded: screenHeight * 0.2, // Fully expanded
      mid: screenHeight * 0.4, // Show 60% of the screen
      collapsed: screenHeight - BOTTOM_NAV_HEIGHT - 80, // Show more of the handle + title above nav bar
    }),
    [screenHeight],
  );
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.collapsed);
  const translateY = useRef(new Animated.Value(snapPoints.collapsed)).current;
  const lastGesture = useRef(snapPoints.collapsed);
  const scrollOffset = useRef(0);
  const isDragging = useRef(false);

  // Add selectedPin state
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // Create a map of routes by ID for quick lookup
  const routesById = useMemo(() => {
    return routes.reduce(
      (acc, route) => {
        acc[route.id] = route;
        return acc;
      },
      {} as Record<string, RouteType>,
    );
  }, [routes]);

  const getAllWaypoints = useMemo(() => {
    return filteredRoutes
      .map((route) => {
        const waypointsData = (route.waypoint_details ||
          route.metadata?.waypoints ||
          []) as WaypointData[];
        const firstWaypoint = waypointsData[0];
        if (!firstWaypoint) return null;

        console.log(route);

        return {
          latitude: Number(firstWaypoint.lat),
          longitude: Number(firstWaypoint.lng),
          title: route.name,
          description: route.description || undefined,
          id: route.id,
        };
      })
      .filter((wp): wp is NonNullable<typeof wp> => wp !== null);
  }, [filteredRoutes]);

  const handleMarkerPress = useCallback(
    (waypoint: Waypoint) => {
      console.log('Pin pressed:', {
        waypointId: waypoint.id,
        currentSelectedPin: selectedPin,
        hasRoute: !!routesById[waypoint.id!],
      });

      const route = routesById[waypoint.id!];
      if (route) {
        // If clicking the same pin, hide it
        if (selectedPin === waypoint.id) {
          console.log('Same pin clicked - hiding preview');
          setSelectedRoute(null);
          setSelectedPin(null);
        }
        // Otherwise, show the new route
        else {
          console.log('New pin clicked - showing route:', route.name);
          setSelectedRoute(route);
          setSelectedPin(waypoint.id!);
        }
      }
      // Prevent map press from triggering
      return true;
    },
    [routesById, selectedPin, setSelectedRoute],
  );

  const handleMapPress = useCallback(
    (_: { defaultPrevented?: boolean } = {}) => {
      console.log('Map pressed:', {
        defaultPrevented: _.defaultPrevented,
        hasSelectedRoute: !!selectedRoute,
      });

      // Only hide if we actually clicked the map (not a marker)
      if (selectedRoute && !_.defaultPrevented) {
        console.log('Hiding route preview from map press');
        setSelectedRoute(null);
        setSelectedPin(null);
      }
    },
    [selectedRoute],
  );

  // Add effect to track state changes
  useEffect(() => {
    console.log('State updated:', {
      selectedPinId: selectedPin,
      selectedRouteName: selectedRoute?.name,
    });
  }, [selectedPin, selectedRoute]);

  /*
  // Memoize getMapRegion to prevent recreation
  const getMapRegion = useMemo(() => {
    if (routes.length === 0) return null;

    const allWaypoints = routes.flatMap(
      route => (route.waypoint_details || route.metadata?.waypoints || []) as WaypointData[]
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
    const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
    const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta
    };
  }, [routes]);

  // Update region only when getMapRegion changes
  useEffect(() => {
    const newRegion = getMapRegion;
    if (newRegion) {
      setRegion(newRegion);
    }
  }, [getMapRegion]);
  */

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
        const location = await Location.getLastKnownPositionAsync({});
        setRegion((prev) => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      }
      setIsMapReady(true);
    })();
  }, []);

  const handleSearch = useCallback(
    (text: string) => {
      console.log('Search input:', text);
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
            console.log('Fetching search results for:', text);
            // Use Mapbox Geocoding API for better place suggestions
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                text,
              )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,address,country,region&language=en`,
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Search response:', {
              status: response.status,
              resultCount: data.features?.length || 0,
            });

            setSearchResults(data.features || []);
            setShowSearchResults(true);
          } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
          } finally {
            setIsSearching(false);
          }
        } else {
          setSearchResults([]);
          setShowSearchResults(false);
        }

        // Filter routes based on search text
        const searchLower = text.toLowerCase();
        const filtered = routes.filter((route) => {
          return (
            route.name.toLowerCase().includes(searchLower) ||
            route.description?.toLowerCase().includes(searchLower) ||
            route.creator?.full_name.toLowerCase().includes(searchLower)
          );
        });
        setFilteredRoutes(filtered);
      }, 300);

      setSearchTimeout(timeout);
    },
    [routes],
  );

  // Reset filtered routes when routes change
  useEffect(() => {
    setFilteredRoutes(routes);
  }, [routes]);

  const handleLocationSelect = (result: SearchResult) => {
    console.log('Location selected:', {
      result,
      center: result?.center,
      place_type: result?.place_type?.[0],
    });

    try {
      if (!result?.center || result.center.length !== 2) {
        console.error('Invalid location data:', result);
        return;
      }

      const [longitude, latitude] = result.center;
      console.log('Parsed coordinates:', { latitude, longitude });

      // Validate coordinates
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        isNaN(latitude) ||
        isNaN(longitude)
      ) {
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

      console.log('Setting new region:', {
        latitude,
        longitude,
        zoomLevel,
        place_type: result.place_type[0],
      });

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: zoomLevel,
        longitudeDelta: zoomLevel,
      };

      // Update map region
      setRegion(newRegion);

      // Filter routes based on proximity to selected location
      const MAX_DISTANCE_KM = 50; // Maximum distance to show routes
      const filteredByLocation = routes.filter((route) => {
        const firstWaypoint = route.waypoint_details?.[0] || route.metadata?.waypoints?.[0];
        if (!firstWaypoint) return false;

        const routeLat = Number(firstWaypoint.lat);
        const routeLng = Number(firstWaypoint.lng);

        // Calculate distance between selected location and route
        const distance = calculateDistance(latitude, longitude, routeLat, routeLng);
        const distanceNum = parseFloat(distance.replace(/[^0-9.]/g, ''));
        const isKm = distance.includes('km');

        // Include routes within MAX_DISTANCE_KM kilometers
        return isKm ? distanceNum <= MAX_DISTANCE_KM : true;
      });

      console.log('Filtered routes:', {
        total: routes.length,
        filtered: filteredByLocation.length,
        location: result.place_name,
      });

      setFilteredRoutes(filteredByLocation);

      // Collapse bottom sheet to show more of the map
      snapTo(snapPoints.collapsed);
    } catch (error: any) {
      console.error('Error in handleLocationSelect:', error);
      console.error('Error details:', {
        error_message: error.message,
        error_stack: error.stack,
        result_data: result,
      });
    }
  };

  const handleLocateMe = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('map.permissionDenied'));
        return;
      }

      const location = await Location.getLastKnownPositionAsync({});

      console.log('setRegion', location);
      console.log(mapRef.current);
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    } catch (err) {
      console.error('Error getting location:', err);
    }
  }, [t]);

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
      const maxTop = snapPoints.expanded; // Don't allow dragging above expanded position
      const maxBottom = snapPoints.collapsed; // Don't allow dragging below collapsed position
      const boundedPosition = Math.min(Math.max(newPosition, maxTop), maxBottom);

      translateY.setValue(boundedPosition);
    },
    [snapPoints],
  );

  const snapTo = useCallback(
    (point: number) => {
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
    },
    [translateY],
  );

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
            Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
          );
        }

        // Ensure the target point is within bounds
        const boundedTarget = Math.min(
          Math.max(targetSnapPoint, snapPoints.expanded),
          snapPoints.collapsed,
        );

        snapTo(boundedTarget);
      }
    },
    [snapPoints, snapTo],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    },
    [currentSnapPoint, snapPoints, snapTo],
  );

  // Update focus effect to reset both route and pin selection
  useFocusEffect(
    React.useCallback(() => {
      setSelectedRoute(null);
      setSelectedPin(null);
    }, []),
  );

  // Add distance calculation
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
    },
    [],
  );

  // Update search results with distance
  const searchResultsWithDistance = useMemo(() => {
    if (!region || !searchResults.length) return [];
    return searchResults.map((result) => ({
      ...result,
      distance: calculateDistance(
        region.latitude,
        region.longitude,
        result.center[1],
        result.center[0],
      ),
    }));
  }, [searchResults, region, calculateDistance]);

  // Handle location selection from search screen
  useEffect(() => {
    if (route.params?.selectedLocation) {
      const result = route.params.selectedLocation;
      handleLocationSelect(result);
    }
  }, [route.params?.selectedLocation, handleLocationSelect]);

  // Extract filters from routes
  const extractFilters = useCallback((routes: RouteType[]) => {
    const filterMap: Record<string, FilterCategory> = {};

    routes.forEach((route) => {
      // Difficulty
      if (route.difficulty) {
        filterMap[`difficulty-${route.difficulty}`] = {
          id: `difficulty-${route.difficulty}`,
          label: route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1),
          value: route.difficulty,
          type: 'difficulty',
        };
      }

      // Spot Type
      if (route.spot_type) {
        filterMap[`spot-${route.spot_type}`] = {
          id: `spot-${route.spot_type}`,
          label:
            route.spot_type.replace(/_/g, ' ').charAt(0).toUpperCase() + route.spot_type.slice(1),
          value: route.spot_type,
          type: 'spot_type',
        };
      }

      // Category
      if (route.category) {
        filterMap[`category-${route.category}`] = {
          id: `category-${route.category}`,
          label:
            route.category.replace(/_/g, ' ').charAt(0).toUpperCase() + route.category.slice(1),
          value: route.category,
          type: 'category',
        };
      }

      // Transmission Type
      if (route.transmission_type) {
        filterMap[`transmission-${route.transmission_type}`] = {
          id: `transmission-${route.transmission_type}`,
          label:
            route.transmission_type.replace(/_/g, ' ').charAt(0).toUpperCase() +
            route.transmission_type.slice(1),
          value: route.transmission_type,
          type: 'transmission_type',
        };
      }

      // Activity Level
      if (route.activity_level) {
        filterMap[`activity-${route.activity_level}`] = {
          id: `activity-${route.activity_level}`,
          label:
            route.activity_level.replace(/_/g, ' ').charAt(0).toUpperCase() +
            route.activity_level.slice(1),
          value: route.activity_level,
          type: 'activity_level',
        };
      }

      // Best Season
      if (route.best_season) {
        filterMap[`season-${route.best_season}`] = {
          id: `season-${route.best_season}`,
          label:
            route.best_season.replace(/-/g, ' ').charAt(0).toUpperCase() +
            route.best_season.slice(1),
          value: route.best_season,
          type: 'best_season',
        };
      }

      // Vehicle Types
      if (route.vehicle_types && Array.isArray(route.vehicle_types)) {
        route.vehicle_types.forEach((type) => {
          filterMap[`vehicle-${type}`] = {
            id: `vehicle-${type}`,
            label: type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1),
            value: type,
            type: 'vehicle_types',
          };
        });
      }
    });

    setAllFilters(Object.values(filterMap));
  }, []);

  // Handle filter selection
  const handleFilterPress = useCallback(
    (filter: FilterCategory) => {
      if (activeFilter?.id === filter.id) {
        setActiveFilter(null);
        setFilteredRoutes(routes);
      } else {
        setActiveFilter(filter);
        const filtered = routes.filter((route) => {
          switch (filter.type) {
            case 'difficulty':
              return route.difficulty === filter.value;
            case 'spot_type':
              return route.spot_type === filter.value;
            case 'category':
              return route.category === filter.value;
            case 'transmission_type':
              return route.transmission_type === filter.value;
            case 'activity_level':
              return route.activity_level === filter.value;
            case 'best_season':
              return route.best_season === filter.value;
            case 'vehicle_types':
              return route.vehicle_types?.includes(filter.value);
            default:
              return false;
          }
        });
        setFilteredRoutes(filtered);
      }
    },
    [activeFilter, routes],
  );

  // Update filters when routes change
  useEffect(() => {
    if (routes.length > 0) {
      extractFilters(routes);
    }
  }, [routes, extractFilters]);

  if (!isMapReady) {
    return (
      <Screen edges={[]} padding={false} hideStatusBar>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]} padding={false} hideStatusBar>
      <View style={{ flex: 1 }}>
        <Map
          key={`map-${routes.length}`}
          waypoints={getAllWaypoints}
          region={region}
          onPress={handleMapPress}
          style={StyleSheet.absoluteFillObject}
          selectedPin={selectedPin}
          onMarkerPress={handleMarkerPress}
          ref={mapRef}
        />

        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 100,
            right: 16,
            backgroundColor: 'white',
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 1,
          }}
          onPress={handleLocateMe}
        >
          <Feather name="crosshair" size={24} color="#000" />
        </TouchableOpacity>

        <SafeAreaView edges={['top']}>
          <AppHeader
            onLocateMe={handleLocateMe}
            filters={allFilters}
            onFilterPress={handleFilterPress}
          />
        </SafeAreaView>

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
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: handleColor }]} />
                <XStack alignItems="center" gap="$2">
                  <Feather name="map" size={16} color={iconColor} />
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    {filteredRoutes.length}{' '}
                    {filteredRoutes.length === 1 ? t('home.route') : t('home.routes')}
                  </Text>
                </XStack>
              </View>
              <View style={styles.routeListContainer}>
                <RouteList routes={filteredRoutes} onRefresh={loadRoutes} onScroll={handleScroll} />
              </View>
            </Animated.View>
          </PanGestureHandler>
        )}

        {selectedRoute && (
          <View
            style={{
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
            }}
          >
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
