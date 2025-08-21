import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map } from '../../components/Map';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp, FilterCategory } from '../../types/navigation';

import * as Location from 'expo-location';
import { Screen } from '../../components/Screen';
import { useRoutes } from '../../hooks/useRoutes';
import type { Route as RouteType, WaypointData } from '../../hooks/useRoutes';
import { RoutesDrawer } from './RoutesDrawer';
import MapView from '../../components/MapView';
import { AppHeader } from '../../components/AppHeader';
import { useTranslation } from '../../contexts/TranslationContext';
import { FilterOptions, FilterSheetModal } from '../../components/FilterSheet';
import { useModal } from '../../contexts/ModalContext';
import { SelectedRoute } from './SelectedRoute';
import { useActiveRoutes, useRoutesFilters, useWaypoints } from './hooks';
import { calculateDistance, getDistanceFromLatLonInKm } from './utils';

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

export function MapScreen({ route }: { route: { params?: { selectedLocation?: any } } }) {
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const { fetchRoutes } = useRoutes();

  const [isMapReady, setIsMapReady] = useState(false);
  const { showModal } = useModal();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 60.1282,
    longitude: 18.6435,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({});

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

  const availableFilters = useRoutesFilters(routes);
  const { activeRoutes, filters, setFilters, setActiveRoutes } = useActiveRoutes(routes);
  const activeWaypoints = useWaypoints(activeRoutes);

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

  // Update focus effect to reset both route and pin selection
  useFocusEffect(
    React.useCallback(() => {
      setSelectedRoute(null);
      setSelectedPin(null);
    }, []),
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
    [routes, setRegion],
  );

  // Handle filter selection
  const handleFilterPress = useCallback(
    (filter: FilterCategory) => {
      if (filters?.id === filter.id) {
        setFilters(null);
      } else {
        // setFilters(filter);
      }
    },
    [filters, setFilters],
  );

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
      setFilters(filters);
    },
    [setFilters],
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
    <Screen edges={[]} padding={false} hideStatusBar scroll={false}>
      <SafeAreaView edges={['top']} style={{ zIndex: 1000 }}>
        <AppHeader
          onLocateMe={handleLocateMe}
          filters={availableFilters}
          onFilterPress={handleFilterPress}
          onFilterButtonPress={handleFilterButtonPress}
        />
      </SafeAreaView>
      <Map
        waypoints={activeWaypoints}
        region={region}
        onPress={handleMapPress}
        style={StyleSheet.absoluteFillObject}
        selectedPin={selectedPin}
        onMarkerPress={handleMarkerPress}
        ref={mapRef}
      />
      <RoutesDrawer
        selectedRoute={selectedRoute}
        filteredRoutes={activeRoutes}
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
