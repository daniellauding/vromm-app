import { Waypoint } from '@/src/components';
import { FilterOptions } from '@/src/components/FilterSheet';
import { FilterCategory } from '@/src/types/navigation';
import { Route, WaypointData } from '@/src/types/route';
import React from 'react';
import * as Location from 'expo-location';
import { useTranslation } from '../../contexts/TranslationContext';

export const useWaypoints = (routes: Route[], activeRoutes?: Route[]): Waypoint[] => {
  const getAllWaypoints = React.useMemo(() => {
    console.log('🗺️ useWaypoints: total routes', routes.length, 'active routes', activeRoutes?.length);
    
    // Only show waypoints from activeRoutes, not all routes
    const routesToShow = activeRoutes || routes;
    
    const waypoints = routesToShow
      .map((route) => {
        const waypointsData = (route.waypoint_details ||
          route.metadata?.waypoints ||
          []) as WaypointData[];
        const firstWaypoint = waypointsData[0];
        if (!firstWaypoint) {
          console.log('🚨 No waypoint for route:', route.name, route.id);
          return null;
        }

        const lat = Number(firstWaypoint.lat);
        const lng = Number(firstWaypoint.lng);
        
        // Validate coordinates before adding waypoint
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.warn('🚨 Invalid coordinates for route:', route.name, { lat, lng });
          return null;
        }

        return {
          latitude: lat,
          longitude: lng,
          title: route.name,
          description: route.description || undefined,
          id: route.id,
          isFiltered: true, // All waypoints shown are from active/filtered routes
        };
      })
      .filter((wp): wp is NonNullable<typeof wp> => wp !== null);
      
    console.log('🗺️ Final waypoints count:', waypoints.length);
    return waypoints;
  }, [routes, activeRoutes]);

  return getAllWaypoints;
};

export const useActiveRoutes = (
  routes: Route[],
): {
  activeRoutes: Route[];
  filters: FilterOptions | null;
  setFilters: (filters: FilterOptions | null) => void;
  setActiveRoutes: (routes: Route[]) => void;
} => {
  const [activeRoutes, setActiveRoutes] = React.useState<Route[]>(routes);
  const [filters, setFilters] = React.useState<FilterOptions | null>(null);

  React.useEffect(() => {
    setActiveRoutes(routes);
  }, [routes]);

  React.useEffect(() => {
    console.log('🔍 filters', filters);
    if (!filters) {
      setActiveRoutes(routes);
      return;
    }

    let filtered = routes;

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
      filtered = filtered.filter((route) => filters.bestSeason?.includes(route.best_season || ''));
    }

    // Apply vehicle types filter
    if (filters.vehicleTypes?.length) {
      filtered = filtered.filter((route) =>
        route.vehicle_types?.some((type) => filters.vehicleTypes?.includes(type)),
      );
    }

    /*
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
    */
    setActiveRoutes(filtered);
  }, [filters, routes]);

  return { activeRoutes, filters, setFilters, setActiveRoutes };
};

export const useRoutesFilters = (routes: Route[]): FilterCategory[] => {
  const { t } = useTranslation();
  
  // Extract filters from routes
  return React.useMemo(() => {
    const filterMap: Record<string, FilterCategory> = {};

    routes.forEach((route) => {
      // Difficulty
      if (route.difficulty) {
        filterMap[`difficulty-${route.difficulty}`] = {
          id: `difficulty-${route.difficulty}`,
          label: t(`filters.difficulty.${route.difficulty}`) || route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1),
          value: route.difficulty,
          type: 'difficulty',
        };
      }

      // Spot Type
      if (route.spot_type) {
        filterMap[`spot-${route.spot_type}`] = {
          id: `spot-${route.spot_type}`,
          label: t(`filters.spotType.${route.spot_type}`) || 
            route.spot_type.replace(/_/g, ' ').charAt(0).toUpperCase() + route.spot_type.slice(1),
          value: route.spot_type,
          type: 'spot_type',
        };
      }

      // Category
      if (route.category) {
        filterMap[`category-${route.category}`] = {
          id: `category-${route.category}`,
          label: t(`filters.category.${route.category}`) ||
            route.category.replace(/_/g, ' ').charAt(0).toUpperCase() + route.category.slice(1),
          value: route.category,
          type: 'category',
        };
      }

      // Transmission Type
      if (route.transmission_type) {
        filterMap[`transmission-${route.transmission_type}`] = {
          id: `transmission-${route.transmission_type}`,
          label: t(`filters.transmissionType.${route.transmission_type}`) ||
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
          label: t(`filters.activityLevel.${route.activity_level}`) ||
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
          label: t(`filters.bestSeason.${route.best_season}`) ||
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
            label: t(`filters.vehicleTypes.${type}`) || type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1),
            value: type,
            type: 'vehicle_types',
          };
        });
      }
    });

    return Object.values(filterMap);
  }, [routes, t]);
};

export const useUserLocation = () => {
  const [userLocation, setUserLocation] = React.useState<Location.LocationObject | null>(null);
  // Location and route organization effects
  React.useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        // Only check permission status, don't request it automatically
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
        }
      } catch (err) {
        console.warn('Error getting location:', err);
      }
    };

    checkLocationPermission();
  }, []);

  return userLocation;
};
