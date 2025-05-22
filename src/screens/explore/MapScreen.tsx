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
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, Waypoint } from '../../components/Map';
import { supabase } from '../../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp, FilterCategory } from '../../types/navigation';
import { Database } from '../../lib/database.types';
import { YStack, XStack, Card, Input, Text, Sheet, Button } from 'tamagui';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { useRoutes } from '../../hooks/useRoutes';
import type { Route as RouteType, WaypointData } from '../../hooks/useRoutes';
import { RoutePreviewCard } from '../../components/RoutePreviewCard';
import { RoutesDrawer } from './RoutesDrawer';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import MapView from 'react-native-maps';
import { ScrollView } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { useTranslation } from '../../contexts/TranslationContext';
import { FilterOptions, FilterSheetModal } from '../../components/FilterSheet';
import { useModal } from '../../contexts/ModalContext';
import { RecordDrivingModal } from '../../components/RecordDrivingSheet';
import { SelectedRoute } from './SelectedRoute';

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

const DARK_THEME = {
  background: '#1A1A1A',
  bottomSheet: '#1F1F1F',
  text: 'white',
  secondaryText: '#AAAAAA',
  borderColor: '#333',
  handleColor: '#666',
  iconColor: 'white',
  cardBackground: '#2D3130',
};

const BOTTOM_NAV_HEIGHT = 80; // Height of bottom navigation bar including safe area

export function MapScreen({ route }: { route: { params?: { selectedLocation?: any } } }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const { fetchRoutes } = useRoutes();
  const backgroundColor = DARK_THEME.background;
  const handleColor = DARK_THEME.handleColor;
  const iconColor = DARK_THEME.iconColor;
  const textColor = DARK_THEME.text;
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [allFilters, setAllFilters] = useState<FilterCategory[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterCategory | null>(null);
  const { showModal } = useModal();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({});
  const [showActionSheet, setShowActionSheet] = useState(false);

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
    (waypointId: string) => {
      const route = routesById[waypointId];
      if (route) {
        // If clicking the same pin, hide it

        setSelectedPin((prev) => {
          if (prev === waypointId) {
            setSelectedRoute(null);
            return null;
          }

          setSelectedRoute(route);
          return waypointId;
        });
      }
      // Prevent map press from triggering
      return true;
    },
    [routesById, setSelectedRoute],
  );

  const handleMapPress = useCallback(() => {
    setSelectedRoute(null);
    setSelectedPin(null);
  }, []);

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
        if (location) {
          setRegion((prev) => ({
            ...prev,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }));
        }
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

      setSearchTimeout(timeout as unknown as NodeJS.Timeout);
    },
    [routes],
  );

  // Reset filtered routes when routes change
  useEffect(() => {
    setFilteredRoutes(routes);
  }, [routes]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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

  const handleLocationSelect = useCallback(
    (result: SearchResult) => {
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

        setFilteredRoutes(filteredByLocation);

        // Collapse bottom sheet to show more of the map
        // snapTo(snapPoints.collapsed);
      } catch (error: unknown) {
        console.error('Error in handleLocationSelect:', error);
        console.error('Error details:', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_stack: error instanceof Error ? error.stack : 'No stack available',
          result_data: result,
        });
      }
    },
    [routes, setRegion, calculateDistance],
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
          // console.log('route', route);
          switch (filter.type) {
            case 'difficulty':
              return route.difficulty === filter.value;
            case 'spot_type':
              console.log('spot_type', route.spot_type, filter.value);
              return route.spot_type === filter.value;
            case 'category':
              console.log('category', route.category, filter.value);
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

  const handleLocateMe = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('map.permissionDenied'));
        return;
      }

      const location = await Location.getLastKnownPositionAsync({});

      if (location && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    } catch (err) {
      console.error('Error getting location:', err);
    }
  }, [t]);

  // Apply filters from the filter sheet
  const handleApplyFilters = useCallback(
    (filters: FilterOptions) => {
      setAppliedFilters(filters);

      let filtered = [...routes];

      // Apply difficulty filter
      if (filters.difficulty?.length) {
        filtered = filtered.filter((route) => filters.difficulty?.includes(route.difficulty || ''));
      }

      // Apply spot type filter
      if (filters.spotType?.length) {
        filtered = filtered.filter((route) => filters.spotType?.includes(route.spot_type || ''));
      }

      // Apply category filter
      if (filters.category?.length) {
        filtered = filtered.filter((route) => filters.category?.includes(route.category || ''));
      }

      // Apply transmission type filter
      if (filters.transmissionType?.length) {
        filtered = filtered.filter((route) =>
          filters.transmissionType?.includes(route.transmission_type || ''),
        );
      }

      // Apply activity level filter
      if (filters.activityLevel?.length) {
        filtered = filtered.filter((route) =>
          filters.activityLevel?.includes(route.activity_level || ''),
        );
      }

      // Apply best season filter
      if (filters.bestSeason?.length) {
        filtered = filtered.filter((route) =>
          filters.bestSeason?.includes(route.best_season || ''),
        );
      }

      // Apply vehicle types filter
      if (filters.vehicleTypes?.length) {
        filtered = filtered.filter((route) =>
          route.vehicle_types?.some((type) => filters.vehicleTypes?.includes(type)),
        );
      }

      // Apply max distance filter (would need current location)
      if (filters.maxDistance && region.latitude && region.longitude) {
        filtered = filtered.filter((route) => {
          const firstWaypoint = route.waypoint_details?.[0] || route.metadata?.waypoints?.[0];
          if (!firstWaypoint) return false;

          const routeLat = Number(firstWaypoint.lat);
          const routeLng = Number(firstWaypoint.lng);

          // Calculate distance
          const distanceKm = getDistanceFromLatLonInKm(
            region.latitude,
            region.longitude,
            routeLat,
            routeLng,
          );

          return distanceKm <= (filters.maxDistance || 100);
        });
      }

      setFilteredRoutes(filtered);
    },
    [routes, region],
  );

  // Handle filter button press
  const handleFilterButtonPress = useCallback(() => {
    showModal(
      <FilterSheetModal
        onApplyFilters={handleApplyFilters}
        routeCount={filteredRoutes.length}
        initialFilters={appliedFilters}
      />,
    );
  }, [showModal, handleApplyFilters, filteredRoutes.length, appliedFilters]);

  // Handle + button to show action sheet
  const handleAddButtonPress = useCallback(() => {
    setShowActionSheet(true);
  }, []);

  // Handle Create Route option
  const handleCreateRoute = useCallback(() => {
    setShowActionSheet(false);
    navigation.navigate('CreateRoute', {});
  }, [navigation]);

  // Handle Record Driving option
  const handleRecordDriving = useCallback(() => {
    setShowActionSheet(false);
    // Directly render instead of using React element
    showModal(<RecordDrivingModal />);
  }, [showModal]);

  // Helper function to calculate distance
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Check for recorded route data when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('MapScreen: useFocusEffect triggered');

      // Check if we have recorded route data from RecordDrivingSheet
      if (global && (global as any).shouldOpenCreateRoute) {
        console.log('MapScreen: global.shouldOpenCreateRoute is true');
        const routeData = (global as any).recordedRouteData;

        if (routeData) {
          console.log('MapScreen: Found route data', {
            waypointsCount: routeData.waypoints?.length || 0,
            name: routeData.name,
            description: routeData.description,
          });

          // Reset the flag
          (global as any).shouldOpenCreateRoute = false;
          console.log('MapScreen: Reset shouldOpenCreateRoute to false');

          // Navigate to create route screen with the recorded data
          console.log('MapScreen: Attempting navigation to CreateRouteScreen');
          (navigation.navigate as any)('CreateRoute', {
            initialWaypoints: routeData.waypoints,
            initialName: routeData.name,
            initialDescription: routeData.description,
            initialSearchCoordinates: routeData.searchCoordinates,
            initialRoutePath: routeData.routePath,
            initialStartPoint: routeData.startPoint,
            initialEndPoint: routeData.endPoint,
          });
          console.log('MapScreen: Navigation attempted');
        } else {
          console.log('MapScreen: routeData is null or undefined');
        }
      } else {
        console.log('MapScreen: No recorded route data to process');
      }
    }, [navigation]),
  );

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
      <SafeAreaView edges={['top']} style={{ zIndex: 1000 }}>
        <AppHeader
          onLocateMe={handleLocateMe}
          filters={allFilters}
          onFilterPress={handleFilterPress}
          onFilterButtonPress={handleFilterButtonPress}
        />
      </SafeAreaView>
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
          right: 20,
          bottom: BOTTOM_NAV_HEIGHT + 20, // Position above tab bar
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#1A3D3D', // Match the app's primary color
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.27,
          shadowRadius: 4.65,
          zIndex: 10,
        }}
        onPress={handleAddButtonPress}
        accessibilityLabel="Add route or record driving"
      >
        <Feather name="plus" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setShowActionSheet(false)}
        >
          <View
            style={{
              backgroundColor: DARK_THEME.bottomSheet,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
              paddingBottom: Platform.OS === 'ios' ? 34 + 16 : 16, // Account for bottom safe area
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: DARK_THEME.handleColor,
                  marginBottom: 8,
                }}
              />
              <Text fontWeight="600" fontSize={24} color={DARK_THEME.text}>
                {t('map.actions') || 'Actions'}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: DARK_THEME.borderColor,
              }}
              onPress={handleCreateRoute}
            >
              <Feather name="map-pin" size={24} color={DARK_THEME.iconColor} />
              <Text fontWeight="500" fontSize={18} color={DARK_THEME.text} marginLeft={12}>
                {'Create Route'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: DARK_THEME.borderColor,
              }}
              onPress={handleRecordDriving}
            >
              <Feather name="video" size={24} color={DARK_THEME.iconColor} />
              <Text fontWeight="500" fontSize={18} color={DARK_THEME.text} marginLeft={12}>
                {'Record Driving'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <RoutesDrawer
        selectedRoute={selectedRoute}
        filteredRoutes={filteredRoutes}
        loadRoutes={loadRoutes}
      />

      <SelectedRoute
        selectedRoute={selectedRoute}
        setSelectedRoute={setSelectedRoute}
        setSelectedPin={setSelectedPin}
      />
    </Screen>
  );
}
