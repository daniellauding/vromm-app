import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Animated, Easing, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { MapPresetSheetModal } from '../../components/MapPresetSheet';
import { SelectedRoute } from './SelectedRoute';
import { useActiveRoutes, useRoutesFilters, useWaypoints } from './hooks';
import { calculateDistance, getDistanceFromLatLonInKm } from './utils';
import { useLocation } from '../../context/LocationContext';
import { RouteDetailSheet } from '../../components/RouteDetailSheet';
import { UserProfileSheet } from '../../components/UserProfileSheet';
import { useUserCollections } from '../../hooks/useUserCollections';
// Tour imports disabled to prevent performance issues
// import { useTourTarget } from '../../components/TourOverlay';
// import { useScreenTours } from '../../utils/screenTours';
// import { useTour } from '../../contexts/TourContext';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';

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

export function MapScreen({ route }: { route: { params?: { selectedLocation?: any; fromSearch?: boolean; ts?: number; selectedPresetId?: string; presetName?: string; fromHomeScreen?: boolean } } }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteType[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const { fetchRoutes } = useRoutes();
  const { userLocation } = useLocation();
  const { profile } = useAuth();
  const { getEffectiveUserId } = useStudentSwitch();
  const { collections: userCollections } = useUserCollections();

  const [isMapReady, setIsMapReady] = useState(false);
  const { showModal } = useModal();

  // Screen tours integration disabled
  // const { triggerScreenTour } = useScreenTours();
  // const tourContext = useTour();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 55.7047, // Lund, Sweden
    longitude: 13.1910,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [originalRegion, setOriginalRegion] = useState(region);
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({});
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Add selectedPin state
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // Sheet states
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);
  const [showUserProfileSheet, setShowUserProfileSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Loading animation state (similar to OnboardingInteractive)
  const [locationLoading, setLocationLoading] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [dotsCount, setDotsCount] = useState(0);

  // Tour targets disabled for MapScreen to prevent performance issues
  // const locateButtonRef = useTourTarget('MapScreen.LocateButton');
  // const routesDrawerRef = useTourTarget('MapScreen.RoutesDrawer');
  // const mapViewRef = useTourTarget('MapScreen.MapView');

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

  // Loading animation effect (similar to OnboardingInteractive)
  useEffect(() => {
    if (locationLoading) {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      
      // Animate dots
      const dotsInterval = setInterval(() => {
        setDotsCount(prev => (prev + 1) % 4); // 0, 1, 2, 3, then back to 0
      }, 500);
      
      return () => {
        spin.stop();
        clearInterval(dotsInterval);
        setDotsCount(0);
      };
    } else {
      spinValue.setValue(0);
      setDotsCount(0);
    }
  }, [locationLoading, spinValue]);
  const { activeRoutes, filters, setFilters, setActiveRoutes } = useActiveRoutes(routes, selectedPresetId);
  const allWaypoints = useWaypoints(routes, activeRoutes); // Show all waypoints with filtered status

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

  const handleRoutePress = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
    setShowRouteDetailSheet(true);
    setSelectedRoute(null);
    setSelectedPin(null);
  }, []);

  const handleUserPress = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setShowUserProfileSheet(true);
  }, []);

  // Optimize loadRoutes to prevent unnecessary re-renders
  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutes();
    setRoutes(data);
  }, [fetchRoutes]);

  // Load saved collection selection and routes on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load routes first
      await loadRoutes();
      
      // Load saved collection selection
      try {
        const effectiveUserId = getEffectiveUserId();
        const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
        const savedFilters = await AsyncStorage.getItem(filterKey);
        
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters);
          console.log('🗺️ [MapScreen] Loaded saved filters on startup:', parsedFilters);
          
          // Restore collection selection if it exists
          if (parsedFilters.selectedPresetId) {
            console.log('🗺️ [MapScreen] Restoring saved collection selection:', parsedFilters.selectedPresetId);
            setSelectedPresetId(parsedFilters.selectedPresetId);
            setAppliedFilters(parsedFilters);
            
            // Apply the saved filters after a short delay to ensure routes are loaded
            setTimeout(() => {
              setFilters(parsedFilters);
            }, 100);
          }
        }
      } catch (error) {
        console.error('❌ [MapScreen] Error loading saved collection selection:', error);
      }
    };
    
    loadInitialData();
  }, [loadRoutes, getEffectiveUserId]);

  useEffect(() => {
    (async () => {
      // First try to use user location from context (onboarding/profile)
      if (userLocation) {
        // Using user location from context
        setRegion((prev) => ({
          ...prev,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05, // Closer zoom for user's preferred area
          longitudeDelta: 0.05,
        }));
        setIsMapReady(true);
        
        // Force marker re-render after initial load
        setTimeout(() => {
          if (mapRef.current) {
            console.log('🗺️ [MapScreen] Forcing initial marker re-render');
            const currentRegion = {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };
            mapRef.current.animateToRegion(currentRegion, 100);
          }
        }, 500);
        return;
      }

      // Fallback to GPS location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getLastKnownPositionAsync({});
        if (location) {
          // Using GPS location as fallback
          setRegion((prev) => ({
            ...prev,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }));
        }
      }
      setIsMapReady(true);
      
      // Force marker re-render after initial load (GPS fallback)
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ [MapScreen] Forcing initial marker re-render (GPS fallback)');
          const currentRegion = { ...region };
          mapRef.current.animateToRegion(currentRegion, 100);
        }
      }, 500);
    })();
  }, [userLocation]);

  // Function to zoom to show filtered results
  const zoomToFilteredResults = useCallback(() => {
    if (!activeRoutes.length || !mapRef.current) return;
    
    console.log('🔴 [MapScreen] Zooming to', activeRoutes.length, 'filtered results');
    
    // Get coordinates of filtered routes with enhanced validation
    const filteredCoordinates = activeRoutes
      .map(route => {
        const waypoints = route.waypoint_details || route.metadata?.waypoints || [];
        const firstWaypoint = waypoints[0];
        if (!firstWaypoint) {
          console.warn('🚨 [MapScreen] No waypoints for route:', route.id, route.name);
          return null;
        }
        
        // Debug the waypoint structure to understand the data format
        console.log('🔍 [MapScreen] Raw waypoint data for route', route.name, ':', {
          waypoint: firstWaypoint,
          type: typeof firstWaypoint.lat,
          latValue: firstWaypoint.lat,
          lngValue: firstWaypoint.lng
        });
        
        const lat = Number(firstWaypoint.lat);
        const lng = Number(firstWaypoint.lng);
        
        // Enhanced coordinate validation 
        const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90 && lat !== 0;
        const isValidLng = !isNaN(lng) && lng >= -180 && lng <= 180 && lng !== 0;
        
        // Only accept coordinates that are clearly in Sweden/Europe region (lat: 55-70, lng: 10-25)
        // This is a temporary fix to ensure we only zoom to realistic Swedish coordinates
        const isInSweden = lat >= 50 && lat <= 70 && lng >= 5 && lng <= 30;
        
        if (!isValidLat || !isValidLng || !isInSweden) {
          console.warn('🚨 [MapScreen] Invalid/non-Swedish coordinates for route:', route.id, route.name, {
            lat,
            lng,
            validLat: isValidLat,
            validLng: isValidLng,
            isInSweden,
            rawData: firstWaypoint
          });
          return null;
        }
        
        console.log('✅ [MapScreen] Valid route coordinate:', route.name, { lat, lng });
        return {
          latitude: lat,
          longitude: lng,
        };
      })
      .filter((coord): coord is NonNullable<typeof coord> => coord !== null);
    
    console.log('📍 [MapScreen] Filtered coordinates count:', filteredCoordinates.length);
    if (filteredCoordinates.length > 0) {
      console.log('📍 [MapScreen] Sample coordinates:', filteredCoordinates.slice(0, 3));
    }
    
    if (filteredCoordinates.length === 0) {
      console.log('🚨 [MapScreen] No valid coordinates found, staying at current location');
      return;
    }
    
    if (filteredCoordinates.length === 1) {
      // Single result - zoom to it
      const coord = filteredCoordinates[0];
      const newRegion = {
        latitude: coord.latitude,
        longitude: coord.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      console.log('🔴 [MapScreen] Zooming to single result:', newRegion);
      setRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1000);
      
      // Force marker re-render after animation completes
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ [MapScreen] Forcing marker re-render after single result zoom');
          const currentRegion = { ...newRegion };
          mapRef.current.animateToRegion(currentRegion, 100);
        }
      }, 1200);
    } else {
      // Multiple results - fit all
      const lats = filteredCoordinates.map(c => c.latitude);
      const lngs = filteredCoordinates.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      const newRegion = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat, 0.02) * 1.3, // Add padding
        longitudeDelta: Math.max(maxLng - minLng, 0.02) * 1.3,
      };
      
      console.log('🔴 [MapScreen] Multiple results region calculation:', {
        coordinates: filteredCoordinates,
        minLat, maxLat, minLng, maxLng,
        finalRegion: newRegion
      });
      setRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 1500);
      
      // Force marker re-render after animation completes
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ [MapScreen] Forcing marker re-render after multiple results zoom');
          const currentRegion = { ...newRegion };
          mapRef.current.animateToRegion(currentRegion, 100);
        }
      }, 1600); // Wait for longer animation to complete
    }
  }, [activeRoutes, mapRef]);

  // Update focus effect to reset both route and pin selection
  useFocusEffect(
    React.useCallback(() => {
      setSelectedRoute(null);
      setSelectedPin(null);
      
      // MapScreen tours disabled due to performance issues
      // TODO: Re-enable after fixing RoutesDrawer ref registration
    }, []), // No dependencies to prevent re-triggers
  );

  const handleLocationSelect = useCallback(
    async (result: SearchResult) => {
      console.log('🗺️ [MapScreen] handleLocationSelect called with:', {
        result,
        center: result?.center,
        place_type: result?.place_type?.[0],
      });

      try {
        if (!result?.center || result.center.length !== 2) {
          console.error('🗺️ [MapScreen] Invalid location data:', result);
          return;
        }

        const [longitude, latitude] = result.center;
        console.log('🗺️ [MapScreen] Parsed coordinates:', { latitude, longitude });

        // Validate coordinates
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          isNaN(latitude) ||
          isNaN(longitude)
        ) {
          console.error('🗺️ [MapScreen] Invalid coordinates:', { latitude, longitude });
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

        console.log('🗺️ [MapScreen] Setting new region:', newRegion);
        
        // Update map region
        setRegion(newRegion);
        
        // Also animate map if ref is available
        if (mapRef.current) {
          console.log('🗺️ [MapScreen] Animating map to region');
          mapRef.current.animateToRegion(newRegion, 1000);
          
          // Force marker re-render after animation completes
          setTimeout(() => {
            if (mapRef.current) {
              console.log('🗺️ [MapScreen] Forcing marker re-render after region change');
              // Trigger a slight region change to force marker re-render
              const currentRegion = { ...newRegion };
              mapRef.current.animateToRegion(currentRegion, 100);
            }
          }, 1200); // Wait for animation to complete + small buffer
        } else {
          console.log('🗺️ [MapScreen] MapRef not available for animation');
        }

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

        console.log('🗺️ [MapScreen] Filtered routes by location:', filteredByLocation.length, 'out of', routes.length);
        setFilteredRoutes(filteredByLocation);

        // Clear filters when using search results to show all routes in the area
        console.log('🗺️ [MapScreen] Clearing filters due to location selection');
        setFilters({});
        setAppliedFilters({});
        
        // Clear saved filters from AsyncStorage
        try {
          const effectiveUserId = getEffectiveUserId();
          const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
          await AsyncStorage.removeItem(filterKey);
          console.log('🗑️ [MapScreen] Cleared saved filters from storage due to location selection');
        } catch (error) {
          console.error('❌ [MapScreen] Failed to clear saved filters due to location selection:', error);
        }
        
        // Collapse bottom sheet to show more of the map
        // snapTo(snapPoints.collapsed);
      } catch (error: unknown) {
        console.error('🗺️ [MapScreen] Error in handleLocationSelect:', error);
        console.error('🗺️ [MapScreen] Error details:', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_stack: error instanceof Error ? error.stack : 'No stack available',
          result_data: result,
        });
      }
    },
    [routes, setRegion],
  );

  // React to navigation from SearchScreen or HomeScreen: center map on selectedLocation or apply preset
  useEffect(() => {
    const handleRouteParams = async () => {
      console.log('🗺️ [MapScreen] Route params changed:', {
        hasParams: !!route?.params,
        selectedLocation: route?.params?.selectedLocation,
        selectedPresetId: route?.params?.selectedPresetId,
        presetName: route?.params?.presetName,
        fromSearch: route?.params?.fromSearch,
        fromHomeScreen: route?.params?.fromHomeScreen,
        ts: route?.params?.ts,
        fullParams: route?.params
      });
      
      const selected = route?.params?.selectedLocation as SearchResult | undefined;
      const selectedPresetId = (route?.params as any)?.selectedPresetId;
      const presetName = (route?.params as any)?.presetName;
      const fromSearch = (route?.params as any)?.fromSearch;
      const fromHomeScreen = (route?.params as any)?.fromHomeScreen;
      const ts = (route?.params as any)?.ts;
      
      // Handle preset selection from HomeScreen
      if (selectedPresetId && fromHomeScreen) {
        console.log('🗺️ [MapScreen] Processing preset selection from HomeScreen:', {
          presetId: selectedPresetId,
          presetName: presetName,
        });
        
        // Set the selected preset
        setSelectedPresetId(selectedPresetId);
        
        // Clear other filters when selecting a preset
        console.log('🗺️ [MapScreen] Clearing filters due to preset selection');
        setFilters({});
        setAppliedFilters({});
        
        // Clear saved filters from AsyncStorage
        try {
          const effectiveUserId = getEffectiveUserId();
          const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
          await AsyncStorage.removeItem(filterKey);
          console.log('🗑️ [MapScreen] Cleared saved filters from storage due to preset selection');
        } catch (error) {
          console.error('❌ [MapScreen] Failed to clear saved filters due to preset selection:', error);
        }
        
        // Apply the preset filter
        const presetFilters = {
          selectedPresetId: selectedPresetId,
        };
        setFilters(presetFilters);
        setAppliedFilters(presetFilters);
        
        // Zoom to filtered results after a short delay
        setTimeout(() => {
          zoomToFilteredResults();
        }, 100);
        
        return;
      }
      
      // Handle location selection from SearchScreen
      if (selected && selected.center?.length === 2) {
        console.log('🗺️ [MapScreen] Processing selectedLocation from Search:', {
          id: selected.id,
          place: selected.place_name,
          center: selected.center,
          fromSearch,
          ts,
        });
        
        // Clear any existing filters when navigating from search
        console.log('🗺️ [MapScreen] Clearing filters due to search navigation');
        setFilters({});
        setAppliedFilters({});
        
        // Clear saved filters from AsyncStorage
        try {
          const effectiveUserId = getEffectiveUserId();
          const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
          await AsyncStorage.removeItem(filterKey);
          console.log('🗑️ [MapScreen] Cleared saved filters from storage due to search');
        } catch (error) {
          console.error('❌ [MapScreen] Failed to clear saved filters due to search:', error);
        }
        
        handleLocationSelect(selected);
      } else if (selected) {
        console.log('🗺️ [MapScreen] Invalid selectedLocation data:', selected);
      }
    };
    
    handleRouteParams();
  }, [route?.params?.selectedLocation, route?.params?.selectedPresetId, route?.params?.presetName, route?.params?.fromSearch, route?.params?.fromHomeScreen, route?.params?.ts, handleLocationSelect, setFilters, zoomToFilteredResults]);

  // Handle filter selection
  const handleFilterPress = useCallback(
    (filter: FilterCategory) => {
      console.log('🔴 [MapScreen] Filter pressed:', filter);
      console.log('🔴 [MapScreen] Current filters before:', filters);
      
      // Apply filter based on filter type
      const currentFilters = filters || {};
      const updatedFilters = { ...currentFilters };
      
      switch(filter.type) {
        case 'difficulty':
          updatedFilters.difficulty = updatedFilters.difficulty?.includes(filter.value) 
            ? updatedFilters.difficulty.filter(v => v !== filter.value)
            : [...(updatedFilters.difficulty || []), filter.value];
          break;
        case 'spot_type':
          updatedFilters.spotType = updatedFilters.spotType?.includes(filter.value)
            ? updatedFilters.spotType.filter(v => v !== filter.value) 
            : [...(updatedFilters.spotType || []), filter.value];
          break;
        case 'category':
          updatedFilters.category = updatedFilters.category?.includes(filter.value)
            ? updatedFilters.category.filter(v => v !== filter.value)
            : [...(updatedFilters.category || []), filter.value];
          break;
        case 'transmission_type':
          updatedFilters.transmissionType = updatedFilters.transmissionType?.includes(filter.value)
            ? updatedFilters.transmissionType.filter(v => v !== filter.value)
            : [...(updatedFilters.transmissionType || []), filter.value];
          break;
        case 'activity_level':
          updatedFilters.activityLevel = updatedFilters.activityLevel?.includes(filter.value)
            ? updatedFilters.activityLevel.filter(v => v !== filter.value)
            : [...(updatedFilters.activityLevel || []), filter.value];
          break;
        case 'best_season':
          updatedFilters.bestSeason = updatedFilters.bestSeason?.includes(filter.value)
            ? updatedFilters.bestSeason.filter(v => v !== filter.value)
            : [...(updatedFilters.bestSeason || []), filter.value];
          break;
        case 'vehicle_types':
          updatedFilters.vehicleTypes = updatedFilters.vehicleTypes?.includes(filter.value)
            ? updatedFilters.vehicleTypes.filter(v => v !== filter.value)
            : [...(updatedFilters.vehicleTypes || []), filter.value];
          break;
        default:
          console.log('🔴 [MapScreen] Unknown filter type:', filter.type);
          break;
      }
      
      console.log('🔴 [MapScreen] Updated filters:', updatedFilters);
      setFilters(updatedFilters);
      
      // Auto-zoom to filtered results after a short delay
      setTimeout(() => {
        if (Object.keys(updatedFilters).length > 0) {
          zoomToFilteredResults();
        }
      }, 100);
    },
    [filters, setFilters, zoomToFilteredResults],
  );

  const handleLocateMe = useCallback(async () => {
    try {
      setLocationLoading(true);
      
      // Clear filters when locating user
      console.log('📍 [MapScreen] Clearing filters on locate me');
      setFilters({});
      setAppliedFilters({});
      setFilteredRoutes([]);
      setActiveRoutes(routes);
      
      // Clear saved filters from AsyncStorage
      try {
        const effectiveUserId = getEffectiveUserId();
        const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
        await AsyncStorage.removeItem(filterKey);
        console.log('🗑️ [MapScreen] Cleared saved filters from storage on locate me');
      } catch (error) {
        console.error('❌ [MapScreen] Failed to clear saved filters on locate me:', error);
      }
      
      // Check current permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();
      
      if (currentStatus.status === 'granted') {
        // Permission already granted, get location
        console.log('📍 [MapScreen] Permission already granted, getting location...');
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (location && mapRef.current) {
            const newRegion = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            };
            console.log('📍 [MapScreen] Got user location:', newRegion);
            setRegion(newRegion);
            setOriginalRegion(newRegion); // Save as original location
            mapRef.current.animateToRegion(newRegion, 1000);
            
            // Force marker re-render after location change
            setTimeout(() => {
              if (mapRef.current) {
                console.log('🗺️ [MapScreen] Forcing marker re-render after locate me');
                const currentRegion = { ...newRegion };
                mapRef.current.animateToRegion(currentRegion, 100);
              }
            }, 1200);
            return;
          }
        } catch (locationError) {
          console.log('📍 [MapScreen] Location failed despite permission, using Lund fallback');
          const fallbackRegion = {
            latitude: 55.7047,
            longitude: 13.1910,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          };
          setRegion(fallbackRegion);
          setOriginalRegion(fallbackRegion);
          if (mapRef.current) {
            mapRef.current.animateToRegion(fallbackRegion, 1000);
          }
          return;
        }
      }
      
      // Request permission - this shows the native dialog
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Permission granted, get location
        try {
          const location = await Location.getCurrentPositionAsync({});
          if (location && mapRef.current) {
            const newRegion = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            };
            setRegion(newRegion);
            setOriginalRegion(newRegion);
            mapRef.current.animateToRegion(newRegion, 1000);
            
            // Force marker re-render after location change
            setTimeout(() => {
              if (mapRef.current) {
                console.log('🗺️ [MapScreen] Forcing marker re-render after locate me (permission granted)');
                const currentRegion = { ...newRegion };
                mapRef.current.animateToRegion(currentRegion, 100);
              }
            }, 1200);
          }
        } catch (locationError) {
          console.log('📍 [MapScreen] Location failed after permission granted, using Lund fallback');
          const fallbackRegion = {
            latitude: 55.7047,
            longitude: 13.1910,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          };
          setRegion(fallbackRegion);
          setOriginalRegion(fallbackRegion);
          if (mapRef.current) {
            mapRef.current.animateToRegion(fallbackRegion, 1000);
          }
        }
      } else {
        // Permission denied, use Lund, Sweden as fallback (same as OnboardingInteractive)
        console.log('📍 [MapScreen] Permission denied, using Lund fallback');
        const fallbackRegion = {
          latitude: 55.7047,
          longitude: 13.1910,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setRegion(fallbackRegion);
        setOriginalRegion(fallbackRegion);
        if (mapRef.current) {
          mapRef.current.animateToRegion(fallbackRegion, 1000);
        }
      }
    } catch (err) {
      console.error('Error getting location:', err);
      // Use Lund, Sweden as fallback instead of showing error (same as OnboardingInteractive)
      console.log('📍 [MapScreen] Location error, using Lund fallback');
      const fallbackRegion = {
        latitude: 55.7047,
        longitude: 13.1910,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
      setRegion(fallbackRegion);
      setOriginalRegion(fallbackRegion);
      if (mapRef.current) {
        mapRef.current.animateToRegion(fallbackRegion, 1000);
      }
    } finally {
      setLocationLoading(false);
    }
  }, [setFilters, routes, setActiveRoutes]);

  // Apply filters from the filter sheet
  const handleApplyFilters = useCallback(
    (filters: FilterOptions) => {
      console.log('[MapScreen] applying filters', filters);
      setFilters(filters);
      setAppliedFilters(filters); // Update appliedFilters to keep FilterSheet in sync
      
      // Handle selectedPresetId from filters
      if (filters.selectedPresetId !== undefined) {
        setSelectedPresetId(filters.selectedPresetId);
        console.log('🗺️ [MapScreen] Updated selectedPresetId from filters:', filters.selectedPresetId);
      }
      
      // Zoom to filtered results after filters are applied
      // Use setTimeout to ensure state updates have propagated
      setTimeout(() => {
        zoomToFilteredResults();
      }, 100);
    },
    [setFilters, zoomToFilteredResults],
  );

  // Handle expanding search area for smart suggestions
  const handleExpandSearch = useCallback(async () => {
    console.log('[MapScreen] expanding search area');
    
    try {
      // Try to center on user's current location if available
      if (userLocation?.latitude && userLocation?.longitude) {
        setRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: Math.min(region.latitudeDelta * 2, 1.0), // Double the search radius
          longitudeDelta: Math.min(region.longitudeDelta * 2, 1.0),
        });
      } else {
        // Fallback to just expanding current region
        setRegion(prevRegion => ({
          ...prevRegion,
          latitudeDelta: Math.min(prevRegion.latitudeDelta * 2, 1.0),
          longitudeDelta: Math.min(prevRegion.longitudeDelta * 2, 1.0),
        }));
      }
    } catch (error) {
      // If location fails, just expand current region
      setRegion(prevRegion => ({
        ...prevRegion,
        latitudeDelta: Math.min(prevRegion.latitudeDelta * 2, 1.0),
        longitudeDelta: Math.min(prevRegion.longitudeDelta * 2, 1.0),
      }));
    }
    
    // Clear any active filters to show more results
    setFilters({});
    setAppliedFilters({});
  }, [setFilters, userLocation, region]);

  // Handle preset selection
  const handlePresetSelect = useCallback(async (presetId: string | null) => {
    console.log('🗺️ [MapScreen] Preset selected:', presetId);
    setSelectedPresetId(presetId);
    
    // Create filters with the selected preset
    const presetFilters = {
      selectedPresetId: presetId,
    };
    
    // Clear other filters when selecting a preset
    setFilters(presetFilters);
    setAppliedFilters(presetFilters);
    
    // Save the collection selection to AsyncStorage for persistence
    try {
      const effectiveUserId = getEffectiveUserId();
      const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
      await AsyncStorage.setItem(filterKey, JSON.stringify(presetFilters));
      console.log('💾 [MapScreen] Saved collection selection to storage:', presetId);
    } catch (error) {
      console.error('❌ [MapScreen] Error saving collection selection:', error);
    }
  }, [setFilters, getEffectiveUserId]);

  // Handle filter button press
  const handleFilterButtonPress = useCallback(() => {
    showModal(
      <FilterSheetModal
        onApplyFilters={handleApplyFilters}
        routeCount={selectedPresetId ? activeRoutes.length : routes.length}
        routes={routes}
        initialFilters={appliedFilters}
        onSearchResultSelect={handleLocationSelect}
        onNearMePress={handleLocateMe}
        onPresetSelect={handlePresetSelect}
        selectedPresetId={selectedPresetId}
      />,
    );
  }, [showModal, handleApplyFilters, activeRoutes.length, routes, appliedFilters, handleLocationSelect, handleLocateMe, handlePresetSelect, selectedPresetId]);

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
      <AppHeader
            onSearchFilterPress={handleFilterButtonPress}
            filters={availableFilters}
            onFilterPress={handleFilterPress}
            activeFilters={(() => {
              const activeFilterIds = filters ? availableFilters.filter(filter => {
                let filterValue;
                // Map filter types to FilterOptions keys
                switch(filter.type) {
                  case 'spot_type':
                    filterValue = filters.spotType;
                    break;
                  case 'transmission_type':
                    filterValue = filters.transmissionType;
                    break;
                  case 'activity_level':
                    filterValue = filters.activityLevel;
                    break;
                  case 'best_season':
                    filterValue = filters.bestSeason;
                    break;
                  case 'vehicle_types':
                    filterValue = filters.vehicleTypes;
                    break;
                  default:
                    filterValue = filters[filter.type as keyof FilterOptions];
                }
                
                if (Array.isArray(filterValue)) {
                  return filterValue.includes(filter.value);
                }
                return filterValue === filter.value;
              }).map(filter => filter.id) : [];
              console.log('🔴 [MapScreen] Active filter IDs:', activeFilterIds);
              console.log('🔴 [MapScreen] Current filters:', filters);
              return activeFilterIds;
            })()}
            filterCounts={availableFilters.reduce((acc, filter) => {
              // Count how many routes have this filter value
              const count = routes.filter(route => {
                switch (filter.type) {
                  case 'difficulty': return route.difficulty === filter.value;
                  case 'spot_type': return route.spot_type === filter.value;
                  case 'category': return route.category === filter.value;
                  case 'transmission_type': return route.transmission_type === filter.value;
                  case 'activity_level': return route.activity_level === filter.value;
                  case 'best_season': return route.best_season === filter.value;
                  case 'vehicle_types': return route.vehicle_types?.includes(filter.value);
                  default: return false;
                }
              }).length;
              acc[filter.id] = count;
              return acc;
            }, {} as Record<string, number>)}
            hasActiveFilters={filters && Object.keys(filters).length > 0}
          />
      <View style={{ flex: 1 }}>
        <Map
          waypoints={allWaypoints}
          region={region}
          onPress={handleMapPress}
          style={StyleSheet.absoluteFillObject}
          selectedPin={selectedPin}
          onMarkerPress={handleMarkerPress}
          ref={mapRef}
        />
        
        {/* Clear Filters Button */}
        {(filters && Object.keys(filters).some(key => {
          const value = filters[key as keyof FilterOptions];
          // Don't show clear button for selectedPresetId alone - only when user changes it
          if (key === 'selectedPresetId') return false;
          return Array.isArray(value) ? value.length > 0 : value;
        })) || (selectedPresetId && filters?.selectedPresetId !== selectedPresetId) && (
          <View style={{
            position: 'absolute',
            top: 160, // Position below header chips
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 1000,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 22,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
              onPress={async () => {
                console.log('🔴 [MapScreen] Clear filters pressed - clearing all filters and presets');
                
                // Clear local filters and preset
                setFilters({});
                setAppliedFilters({});
                setFilteredRoutes([]);
                setActiveRoutes(routes);
                setSelectedPresetId(null);
                
                // Clear saved filters from AsyncStorage
                try {
                  const effectiveUserId = getEffectiveUserId();
                  const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
                  await AsyncStorage.removeItem(filterKey);
                  console.log('🗑️ [MapScreen] Cleared saved filters from storage');
                } catch (error) {
                  console.error('❌ [MapScreen] Failed to clear saved filters:', error);
                }
                
                // Return to original/user location
                if (mapRef.current) {
                  setRegion(originalRegion);
                  mapRef.current.animateToRegion(originalRegion, 1000);
                  console.log('🔄 [MapScreen] Returned to original location:', originalRegion);
                }
              }}
            >
              <Feather name="x" size={16} color="rgba(255, 255, 255, 0.9)" />
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600', marginLeft: 6, fontSize: 14 }}>
                Clear {selectedPresetId && filters?.selectedPresetId !== selectedPresetId ? 'preset & filters' : 'filters'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Locate Me Button - Bottom Right */}
        <View style={{
          position: 'absolute',
          bottom: 180, // Position above routes drawer
          right: 16,
          zIndex: 1000,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: locationLoading 
                ? (colorScheme === 'dark' ? 'rgba(42, 42, 42, 0.9)' : 'rgba(245, 245, 245, 0.9)')
                : (colorScheme === 'dark' ? 'rgba(26, 26, 26, 0.85)' : '#F5F5F5'),
              borderRadius: 25,
              width: 50,
              height: 50,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? 'rgba(26, 26, 26, 0.85)' : '#E0E0E0',
            }}
            onPress={handleLocateMe}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <Animated.View
                style={{
                  transform: [{
                    rotate: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}
              >
                <Feather 
                  name="loader" 
                  size={20} 
                  color={colorScheme === 'dark' ? '#E0E0E0' : '#666666'} 
                />
              </Animated.View>
            ) : (
              <Feather 
                name="navigation" 
                size={20} 
                color={colorScheme === 'dark' ? '#E0E0E0' : '#666666'} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {selectedRoute ? null : (
        <RoutesDrawer
          selectedRoute={selectedRoute}
          filteredRoutes={activeRoutes}
          loadRoutes={loadRoutes}
          onClearFilters={() => {
            setFilters({});
            setAppliedFilters({});
          }}
          hasActiveFilters={filters && Object.keys(filters).length > 0}
          onExpandSearch={handleExpandSearch}
          onRoutePress={handleRoutePress}
  // ref={routesDrawerRef} // Disabled
        />
      )}
      {selectedRoute && (
        <SelectedRoute
          selectedRoute={selectedRoute}
          setSelectedRoute={setSelectedRoute}
          setSelectedPin={setSelectedPin}
          onRoutePress={handleRoutePress}
        />
      )}

      {/* Route Detail Sheet */}
      <RouteDetailSheet
        visible={showRouteDetailSheet}
        onClose={() => {
          console.log('🎯 MapScreen: RouteDetailSheet closing - selectedRouteId:', selectedRouteId);
          setShowRouteDetailSheet(false);
          // Don't clear selectedRouteId here to allow for reopening
        }}
        routeId={selectedRouteId}
        onStartRoute={(routeId) => {
          // Close sheet and navigate to map with route
          setShowRouteDetailSheet(false);
          // Already on map, just load the route
          console.log('Starting route on MapScreen:', routeId);
        }}
        onNavigateToProfile={handleUserPress}
        onReopen={() => {
          console.log('🎯 MapScreen: Reopening RouteDetailSheet - selectedRouteId:', selectedRouteId);
          if (selectedRouteId) {
            setShowRouteDetailSheet(true);
          } else {
            console.warn('🎯 MapScreen: No selectedRouteId, cannot reopen RouteDetailSheet');
          }
        }}
      />

      {/* User Profile Sheet */}
      <UserProfileSheet
        visible={showUserProfileSheet}
        onClose={() => setShowUserProfileSheet(false)}
        userId={selectedUserId}
        onViewAllRoutes={(userId) => {
          // Close profile sheet and show routes (could implement RouteListSheet here)
          setShowUserProfileSheet(false);
          console.log('View all routes for user:', userId);
        }}
      />
    </Screen>
  );
}
