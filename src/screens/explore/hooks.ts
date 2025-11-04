import { Waypoint } from '@/src/components';
import { FilterOptions } from '@/src/components/FilterSheet';
import { FilterCategory } from '@/src/types/navigation';
import { Route, WaypointData } from '@/src/types/route';
import React from 'react';
import * as Location from 'expo-location';
import { useTranslation } from '../../contexts/TranslationContext';
import { supabase } from '../../lib/supabase';

// Hardcoded fallback translations for filter labels (same as FilterSheet)
const FILTER_LABEL_FALLBACKS: Record<string, { en: string; sv: string }> = {
  // Difficulty
  beginner: { en: 'Beginner', sv: 'Nybörjare' },
  intermediate: { en: 'Intermediate', sv: 'Medel' },
  advanced: { en: 'Advanced', sv: 'Avancerad' },
  // Spot Type
  urban: { en: 'Urban', sv: 'Urban' },
  highway: { en: 'Highway', sv: 'Motorväg' },
  rural: { en: 'Rural', sv: 'Landsbygd' },
  parking: { en: 'Parking', sv: 'Parkering' },
  // Category
  incline_start: { en: 'Incline Start', sv: 'Backstart' },
  // Transmission
  automatic: { en: 'Automatic', sv: 'Automat' },
  manual: { en: 'Manual', sv: 'Manuell' },
  both: { en: 'Both', sv: 'Båda' },
  // Activity Level
  moderate: { en: 'Moderate', sv: 'Måttlig' },
  high: { en: 'High', sv: 'Hög' },
  // Season
  all: { en: 'All', sv: 'Alla' },
  'year-round': { en: 'Year-round', sv: 'Året runt' },
  'avoid-winter': { en: 'Avoid Winter', sv: 'Undvik vinter' },
  // Vehicle Types
  passenger_car: { en: 'Passenger Car', sv: 'Personbil' },
  rv: { en: 'RV', sv: 'Husbil' },
};

export const useWaypoints = (routes: Route[], activeRoutes?: Route[]): Waypoint[] => {
  const getAllWaypoints = React.useMemo(() => {
    console.log(
      '🗺️ useWaypoints: total routes',
      routes.length,
      'active routes',
      activeRoutes?.length,
    );

    // Only show waypoints from filtered/active routes when filters are applied
    const routesToShow = activeRoutes && activeRoutes.length > 0 ? activeRoutes : routes;

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
          isFiltered: true, // All shown waypoints are from filtered routes
        };
      })
      .filter((wp): wp is NonNullable<typeof wp> => wp !== null);

    console.log('🗺️ Final waypoints count:', waypoints.length);
    console.log(
      '🗺️ Sample waypoints:',
      waypoints
        .slice(0, 3)
        .map((w) => ({ id: w.id, title: w.title, lat: w.latitude, lng: w.longitude })),
    );
    return waypoints;
  }, [routes, activeRoutes]);

  return getAllWaypoints;
};

export const useActiveRoutes = (
  routes: Route[],
  selectedPresetId?: string | null,
): {
  activeRoutes: Route[];
  filters: FilterOptions | null;
  setFilters: (filters: FilterOptions | null) => void;
  setActiveRoutes: (routes: Route[]) => void;
} => {
  const [activeRoutes, setActiveRoutes] = React.useState<Route[]>(routes);
  const [filters, setFilters] = React.useState<FilterOptions | null>(null);
  const [presetRoutes, setPresetRoutes] = React.useState<Route[]>([]);

  React.useEffect(() => {
    setActiveRoutes(routes);
  }, [routes]);

  // Load preset routes when preset is selected
  React.useEffect(() => {
    const loadPresetRoutes = async () => {
      if (!selectedPresetId) {
        setPresetRoutes([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('map_preset_routes')
          .select('route_id')
          .eq('preset_id', selectedPresetId);

        if (error) throw error;

        const presetRouteIds = data?.map((item) => item.route_id) || [];
        const filteredRoutes = routes.filter((route) => presetRouteIds.includes(route.id));
        setPresetRoutes(filteredRoutes);
        console.log('🗺️ [useActiveRoutes] Loaded preset routes:', filteredRoutes.length);
      } catch (error) {
        console.error('Error loading preset routes:', error);
        setPresetRoutes([]);
      }
    };

    loadPresetRoutes();
  }, [selectedPresetId, routes]);

  React.useEffect(() => {
    console.log('🔍 [useActiveRoutes] Applying filters:', filters);
    console.log('🔍 [useActiveRoutes] Selected preset:', selectedPresetId);
    console.log('🔍 [useActiveRoutes] Total routes available:', routes.length);

    // If preset is selected, use preset routes as base
    const baseRoutes = selectedPresetId ? presetRoutes : routes;

    if (!filters || Object.keys(filters).length === 0) {
      console.log(
        '🔍 [useActiveRoutes] No filters active, showing base routes:',
        baseRoutes.length,
      );
      setActiveRoutes(baseRoutes);
      return;
    }

    let filtered = [...baseRoutes];

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

    // Apply has exercises filter
    if (filters.hasExercises) {
      const beforeExerciseFilter = filtered.length;
      filtered = filtered.filter((route) => {
        // Check if route has exercises in suggested_exercises field
        if (route.suggested_exercises) {
          try {
            const exercises = Array.isArray(route.suggested_exercises)
              ? route.suggested_exercises
              : typeof route.suggested_exercises === 'string' &&
                  route.suggested_exercises.trim() !== ''
                ? JSON.parse(route.suggested_exercises)
                : null;
            const hasExercises = Array.isArray(exercises) && exercises.length > 0;
            if (hasExercises) {
              console.log('✅ Route has exercises:', route.name, exercises.length);
            }
            return hasExercises;
          } catch (error) {
            console.warn('Error parsing suggested_exercises for route:', route.name, error);
            return false;
          }
        }
        return false;
      });
      console.log(
        '🔍 [useActiveRoutes] Exercise filter:',
        beforeExerciseFilter,
        '→',
        filtered.length,
      );
    }

    // Apply has media filter
    if (filters.hasMedia) {
      filtered = filtered.filter((route) => {
        // Check if route has media attachments
        if (route.media_attachments) {
          try {
            const media = Array.isArray(route.media_attachments)
              ? route.media_attachments
              : typeof route.media_attachments === 'string'
                ? JSON.parse(route.media_attachments)
                : [];
            return Array.isArray(media) && media.length > 0;
          } catch (error) {
            console.warn('Error parsing media_attachments:', error);
            return false;
          }
        }
        return false;
      });
    }

    // Apply verified filter
    if (filters.isVerified) {
      filtered = filtered.filter((route) => route.is_verified === true);
    }

    // Apply minimum rating filter
    if (filters.minRating !== undefined && filters.minRating > 0) {
      filtered = filtered.filter((route) => {
        // Routes without ratings should be excluded when filtering by rating
        if (!route.average_rating) return false;
        return route.average_rating >= filters.minRating;
      });
    }

    // Apply route type filter
    if (filters.routeType?.length) {
      const beforeRouteTypeFilter = filtered.length;
      filtered = filtered.filter((route) => {
        // Check drawing mode for route type
        let matches = false;

        if (filters.routeType?.includes('recorded')) {
          // Recorded routes have 'record' drawing mode or contain recording stats in description
          if (
            route.drawing_mode === 'record' ||
            route.description?.includes('Recorded drive') ||
            route.description?.includes('Distance:') ||
            route.description?.includes('Duration:')
          ) {
            matches = true;
          }
        }
        if (filters.routeType?.includes('waypoint') && route.drawing_mode === 'waypoint') {
          matches = true;
        }
        if (filters.routeType?.includes('pen') && route.drawing_mode === 'pen') {
          matches = true;
        }

        return matches;
      });
      console.log(
        '🔍 [useActiveRoutes] Route type filter:',
        beforeRouteTypeFilter,
        '→',
        filtered.length,
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

    console.log('🔍 [useActiveRoutes] Final filtered routes:', filtered.length);
    console.log(
      '🔍 [useActiveRoutes] Sample filtered routes:',
      filtered
        .slice(0, 3)
        .map((r) => ({ id: r.id, name: r.name, difficulty: r.difficulty, category: r.category })),
    );
    setActiveRoutes(filtered);
  }, [filters, routes, selectedPresetId, presetRoutes]);

  return { activeRoutes, filters, setFilters, setActiveRoutes };
};

export const useRoutesFilters = (routes: Route[]): FilterCategory[] => {
  const { t, language } = useTranslation();

  // Helper to get label with fallback
  const getLabel = (key: string, value: string): string => {
    const translation = t(key);
    if (translation === key && FILTER_LABEL_FALLBACKS[value]) {
      const lang = (language === 'sv' ? 'sv' : 'en') as 'en' | 'sv';
      return FILTER_LABEL_FALLBACKS[value][lang];
    }
    return translation !== key
      ? translation
      : value.replace(/_/g, ' ').charAt(0).toUpperCase() + value.slice(1);
  };

  // Extract filters from routes
  return React.useMemo(() => {
    const filterMap: Record<string, FilterCategory> = {};

    routes.forEach((route) => {
      // Difficulty
      if (route.difficulty) {
        filterMap[`difficulty-${route.difficulty}`] = {
          id: `difficulty-${route.difficulty}`,
          label: getLabel(`filters.difficulty.${route.difficulty}`, route.difficulty),
          value: route.difficulty,
          type: 'difficulty',
        };
      }

      // Spot Type
      if (route.spot_type) {
        filterMap[`spot-${route.spot_type}`] = {
          id: `spot-${route.spot_type}`,
          label: getLabel(`filters.spotType.${route.spot_type}`, route.spot_type),
          value: route.spot_type,
          type: 'spot_type',
        };
      }

      // Category
      if (route.category) {
        filterMap[`category-${route.category}`] = {
          id: `category-${route.category}`,
          label: getLabel(`filters.category.${route.category}`, route.category),
          value: route.category,
          type: 'category',
        };
      }

      // Transmission Type
      if (route.transmission_type) {
        filterMap[`transmission-${route.transmission_type}`] = {
          id: `transmission-${route.transmission_type}`,
          label: getLabel(`filters.transmissionType.${route.transmission_type}`, route.transmission_type),
          value: route.transmission_type,
          type: 'transmission_type',
        };
      }

      // Activity Level
      if (route.activity_level) {
        filterMap[`activity-${route.activity_level}`] = {
          id: `activity-${route.activity_level}`,
          label: getLabel(`filters.activityLevel.${route.activity_level}`, route.activity_level),
          value: route.activity_level,
          type: 'activity_level',
        };
      }

      // Best Season
      if (route.best_season) {
        filterMap[`season-${route.best_season}`] = {
          id: `season-${route.best_season}`,
          label: getLabel(`filters.bestSeason.${route.best_season}`, route.best_season),
          value: route.best_season,
          type: 'best_season',
        };
      }

      // Vehicle Types
      if (route.vehicle_types && Array.isArray(route.vehicle_types)) {
        route.vehicle_types.forEach((type) => {
          filterMap[`vehicle-${type}`] = {
            id: `vehicle-${type}`,
            label: getLabel(`filters.vehicleTypes.${type}`, type),
            value: type,
            type: 'vehicle_types',
          };
        });
      }
    });

    return Object.values(filterMap);
  }, [routes, t, language]);
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
