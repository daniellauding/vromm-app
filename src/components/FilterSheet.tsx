import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, XStack, YStack, Slider, Button, SizableText, Input } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useSmartFilters } from '../hooks/useSmartFilters';
import { useUserCollections } from '../hooks/useUserCollections';

// Route type definition
type Route = {
  id: string;
  difficulty?: string;
  spot_type?: string;
  category?: string;
  transmission_type?: string;
  activity_level?: string;
  best_season?: string;
  vehicle_types?: string[];
  suggested_exercises?: string | unknown[];
  media_attachments?: string | unknown[];
  is_verified?: boolean;
  average_rating?: number;
  drawing_mode?: string;
  description?: string;
};

export type FilterOptions = {
  difficulty?: string[];
  spotType?: string[];
  category?: string[];
  transmissionType?: string[];
  activityLevel?: string[];
  bestSeason?: string[];
  vehicleTypes?: string[];
  maxDistance?: number;
  hasExercises?: boolean;
  hasMedia?: boolean;
  isVerified?: boolean;
  minRating?: number;
  routeType?: string[]; // 'recorded' | 'drawn' | 'waypoint' | 'pen'
  sort?:
    | 'best_match'
    | 'most_popular'
    | 'closest'
    | 'newly_added'
    | 'newest'
    | 'my_created'
    | 'best_review'
    | 'has_image';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  selectedPresetId?: string | null; // NEW: Collection/preset selection
};

interface FilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  routeCount: number;
  routes?: Route[]; // Full list of routes to calculate filtered count
  initialFilters?: FilterOptions;
  onSearchResultSelect?: (result: SearchResult) => void;
  onNearMePress?: () => void; // Callback to trigger MapScreen locate animation
  onPresetSelect?: (presetId: string | null) => void; // Callback for preset selection
  selectedPresetId?: string | null; // Currently selected preset
}

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1500, // Higher than TabNavigator's 100
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.9,
    paddingBottom: 20 + BOTTOM_INSET, // Add extra padding to account for bottom inset
  },
  header: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedChip: {
    backgroundColor: '#00E6C3',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#000000',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    paddingBottom: 16 + BOTTOM_INSET, // Extra padding to ensure button is above home indicator
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -TAB_BAR_HEIGHT - BOTTOM_INSET, // Extend beyond bottom nav to fully cover it
    backgroundColor: 'rgba(0,0,0,0.7)', // Make it more opaque
  },
});

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

// Popular Swedish cities for quick selection
const POPULAR_CITIES = [
  { name: 'Stockholm', country: 'Sweden' },
  { name: 'Malmö', country: 'Sweden' },
  { name: 'Göteborg', country: 'Sweden' },
  { name: 'Umeå', country: 'Sweden' },
  { name: 'Norrköping', country: 'Sweden' },
  { name: 'Västerås', country: 'Sweden' },
  { name: 'Lund', country: 'Sweden' },
  { name: 'Helsingborg', country: 'Sweden' },
  { name: 'Jönköping', country: 'Sweden' },
  { name: 'Karlstad', country: 'Sweden' },
];

export function FilterSheet({
  isVisible,
  onClose,
  onApplyFilters,
  routeCount,
  routes = [],
  initialFilters = {},
  onSearchResultSelect,
  onNearMePress,
  onPresetSelect,
  selectedPresetId,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const { showModal } = useModal();
  const { getEffectiveUserId } = useStudentSwitch();
  const { trackFilterUsage } = useSmartFilters();
  const { collections: userCollections } = useUserCollections();
  const colorScheme = useColorScheme();

  // Use proper theming instead of hardcoded dark theme
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : '#11181C';
  const borderColor = colorScheme === 'dark' ? '#333' : '#E5E5E5';
  const handleColor = colorScheme === 'dark' ? '#666' : '#999';

  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  
  // Get effective user ID for student-specific storage
  const effectiveUserId = getEffectiveUserId();

  // Save filter preferences to AsyncStorage - USER-SPECIFIC (similar to ProgressScreen)
  const saveFilterPreferences = async (filters: FilterOptions) => {
    try {
      // Make filter storage user-specific for supervisors viewing different students
      const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
      await AsyncStorage.setItem(filterKey, JSON.stringify(filters));
      console.log('✅ [FilterSheet] Saved filter preferences for user:', effectiveUserId, filters);
    } catch (error) {
      console.error('❌ [FilterSheet] Error saving filter preferences:', error);
    }
  };

  // Load filter preferences from AsyncStorage - USER-SPECIFIC (similar to ProgressScreen)
  const loadFilterPreferences = async (): Promise<FilterOptions | null> => {
    try {
      // Make filter loading user-specific for supervisors viewing different students
      const filterKey = `vromm_map_filters_${effectiveUserId || 'default'}`;
      const saved = await AsyncStorage.getItem(filterKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ [FilterSheet] Loaded saved filter preferences for user:', effectiveUserId, parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ [FilterSheet] Error loading filter preferences:', error);
    }
    return null;
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate filtered route count based on current filters
  const filteredCount = useMemo(() => {
    console.log('🔢 [FilterSheet] Calculating filtered count with filters:', filters);
    console.log('🔢 [FilterSheet] Routes available:', routes?.length || 0);

    if (!routes || routes.length === 0) {
      console.log('🔢 [FilterSheet] No routes available, returning routeCount:', routeCount);
      return routeCount;
    }

    // Check if any filters are actually applied (excluding sort since it doesn't filter, just reorders)
    const hasActiveFilters = 
      (filters.difficulty?.length ?? 0) > 0 ||
      (filters.spotType?.length ?? 0) > 0 ||
      (filters.category?.length ?? 0) > 0 ||
      (filters.transmissionType?.length ?? 0) > 0 ||
      (filters.activityLevel?.length ?? 0) > 0 ||
      (filters.bestSeason?.length ?? 0) > 0 ||
      (filters.vehicleTypes?.length ?? 0) > 0 ||
      (filters.routeType?.length ?? 0) > 0 ||
      filters.hasExercises ||
      filters.hasMedia ||
      filters.isVerified ||
      (filters.minRating !== undefined && filters.minRating > 0);

    console.log('🔢 [FilterSheet] Has active filters:', hasActiveFilters);

    // If no filters are applied, return the total route count
    if (!hasActiveFilters) {
      console.log('🔢 [FilterSheet] No active filters, returning total routes:', routes.length);
      return routes.length;
    }

    let filtered = [...routes];
    console.log('🔢 [FilterSheet] Starting with', filtered.length, 'routes');

    // Apply difficulty filter
    if (filters.difficulty?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) => filters.difficulty?.includes(route.difficulty || ''));
      console.log('🔢 [FilterSheet] Difficulty filter:', before, '->', filtered.length);
    }

    // Apply spot type filter
    if (filters.spotType?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) => filters.spotType?.includes(route.spot_type || ''));
      console.log('🔢 [FilterSheet] Spot type filter:', before, '->', filtered.length);
    }

    // Apply category filter
    if (filters.category?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) => filters.category?.includes(route.category || ''));
      console.log('🔢 [FilterSheet] Category filter:', before, '->', filtered.length);
    }

    // Apply transmission type filter
    if (filters.transmissionType?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) =>
        filters.transmissionType?.includes(route.transmission_type || ''),
      );
      console.log('🔢 [FilterSheet] Transmission filter:', before, '->', filtered.length);
    }

    // Apply activity level filter
    if (filters.activityLevel?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) =>
        filters.activityLevel?.includes(route.activity_level || ''),
      );
      console.log('🔢 [FilterSheet] Activity level filter:', before, '->', filtered.length);
    }

    // Apply best season filter
    if (filters.bestSeason?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) => filters.bestSeason?.includes(route.best_season || ''));
      console.log('🔢 [FilterSheet] Best season filter:', before, '->', filtered.length);
    }

    // Apply vehicle types filter
    if (filters.vehicleTypes?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) =>
        route.vehicle_types?.some((type: string) => filters.vehicleTypes?.includes(type)),
      );
      console.log('🔢 [FilterSheet] Vehicle types filter:', before, '->', filtered.length);
    }

    // Apply has exercises filter
    if (filters.hasExercises) {
      const before = filtered.length;
      filtered = filtered.filter((route) => {
        if (route.suggested_exercises) {
          try {
            const exercises = Array.isArray(route.suggested_exercises)
              ? route.suggested_exercises
              : JSON.parse(String(route.suggested_exercises));
            return Array.isArray(exercises) && exercises.length > 0;
          } catch {
            return false;
          }
        }
        return false;
      });
      console.log('🔢 [FilterSheet] Has exercises filter:', before, '->', filtered.length);
    }

    // Apply has media filter
    if (filters.hasMedia) {
      const before = filtered.length;
      filtered = filtered.filter((route) => {
        if (route.media_attachments) {
          try {
            const media = Array.isArray(route.media_attachments)
              ? route.media_attachments
              : typeof route.media_attachments === 'string'
                ? JSON.parse(route.media_attachments)
                : [];
            return Array.isArray(media) && media.length > 0;
          } catch {
            return false;
          }
        }
        return false;
      });
      console.log('🔢 [FilterSheet] Has media filter:', before, '->', filtered.length);
    }

    // Apply verified filter
    if (filters.isVerified) {
      const before = filtered.length;
      filtered = filtered.filter((route) => route.is_verified === true);
      console.log('🔢 [FilterSheet] Verified filter:', before, '->', filtered.length);
    }

    // Apply minimum rating filter
    if (filters.minRating !== undefined && filters.minRating > 0) {
      const before = filtered.length;
      filtered = filtered.filter((route) => {
        if (!route.average_rating) return false;
        return route.average_rating >= (filters.minRating || 0);
      });
      console.log('🔢 [FilterSheet] Min rating filter:', before, '->', filtered.length);
    }

    // Apply route type filter
    if (filters.routeType?.length) {
      const before = filtered.length;
      filtered = filtered.filter((route) => {
        if (filters.routeType?.includes('recorded')) {
          if (
            route.drawing_mode === 'record' ||
            route.description?.includes('Recorded drive') ||
            route.description?.includes('Distance:') ||
            route.description?.includes('Duration:')
          ) {
            return true;
          }
        }
        if (filters.routeType?.includes('waypoint') && route.drawing_mode === 'waypoint') {
          return true;
        }
        if (filters.routeType?.includes('pen') && route.drawing_mode === 'pen') {
          return true;
        }
        return false;
      });
      console.log('🔢 [FilterSheet] Route type filter:', before, '->', filtered.length);
    }

    // Apply sort filter (doesn't affect count, just ordering)
    if (filters.sort) {
      console.log('🔢 [FilterSheet] Sort filter applied:', filters.sort);
    }

    console.log('🔢 [FilterSheet] Final filtered count:', filtered.length);
    return filtered.length;
  }, [filters, routes, routeCount]);

  // Helper function to count routes for a specific filter value
  const getFilterCount = useCallback((filterType: keyof FilterOptions, value: string | number | boolean) => {
    if (!routes || routes.length === 0) return 0;

    let count = 0;
    
    switch (filterType) {
      case 'difficulty':
        count = routes.filter(route => route.difficulty === value).length;
        break;
      case 'spotType':
        count = routes.filter(route => route.spot_type === value).length;
        break;
      case 'category':
        count = routes.filter(route => route.category === value).length;
        break;
      case 'transmissionType':
        count = routes.filter(route => route.transmission_type === value).length;
        break;
      case 'activityLevel':
        count = routes.filter(route => route.activity_level === value).length;
        break;
      case 'bestSeason':
        count = routes.filter(route => route.best_season === value).length;
        break;
      case 'vehicleTypes':
        count = routes.filter(route => 
          route.vehicle_types?.some((type: string) => type === value)
        ).length;
        break;
      case 'hasExercises':
        count = routes.filter(route => {
          if (route.suggested_exercises) {
            try {
              const exercises = Array.isArray(route.suggested_exercises)
                ? route.suggested_exercises
                : JSON.parse(String(route.suggested_exercises));
              return Array.isArray(exercises) && exercises.length > 0;
            } catch {
              return false;
            }
          }
          return false;
        }).length;
        break;
      case 'hasMedia':
        count = routes.filter(route => {
          if (route.media_attachments) {
            try {
              const media = Array.isArray(route.media_attachments)
                ? route.media_attachments
                : typeof route.media_attachments === 'string'
                  ? JSON.parse(route.media_attachments)
                  : [];
              return Array.isArray(media) && media.length > 0;
            } catch {
              return false;
            }
          }
          return false;
        }).length;
        break;
      case 'isVerified':
        count = routes.filter(route => route.is_verified === true).length;
        break;
      case 'minRating':
        count = routes.filter(route => {
          if (!route.average_rating) return false;
          return route.average_rating >= (value as number);
        }).length;
        break;
      case 'routeType':
        count = routes.filter(route => {
          if (value === 'recorded') {
            return (
              route.drawing_mode === 'record' ||
              route.description?.includes('Recorded drive') ||
              route.description?.includes('Distance:') ||
              route.description?.includes('Duration:')
            );
          }
          if (value === 'waypoint') return route.drawing_mode === 'waypoint';
          if (value === 'pen') return route.drawing_mode === 'pen';
          return false;
        }).length;
        break;
      default:
        count = 0;
    }
    
    return count;
  }, [routes]);

  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Load saved filters when component mounts or effectiveUserId changes
  useEffect(() => {
    const loadSavedFilters = async () => {
      if (isVisible && effectiveUserId) {
        const savedFilters = await loadFilterPreferences();
        if (savedFilters) {
          // Merge saved filters with initial filters, giving priority to initial filters
          const mergedFilters = { ...savedFilters, ...initialFilters };
          setFilters(mergedFilters);
          console.log('✅ [FilterSheet] Loaded and merged saved filters:', mergedFilters);
        }
      }
    };
    
    loadSavedFilters();
  }, [isVisible, effectiveUserId, initialFilters]);

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: screenHeight,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  // Reset filters
  const handleReset = React.useCallback(async () => {
    console.log('🔄 [FilterSheet] Reset button pressed - clearing all filters');
    setFilters({});
    
    // Also clear the selected preset/collection
    if (onPresetSelect) {
      onPresetSelect(null);
    }
    
    // Clear saved filter preferences
    await saveFilterPreferences({});
    console.log('🔄 [FilterSheet] Cleared all filters and saved preferences');
  }, [onPresetSelect, saveFilterPreferences]);

  // Apply filters and close sheet
  const handleApply = React.useCallback(async () => {
    console.log('✅ [FilterSheet] Apply filters pressed with:', filters);

    // Include selectedPresetId in filters
    const filtersWithPreset = {
      ...filters,
      selectedPresetId: selectedPresetId,
    };

    // Track filter usage for smart recommendations
    if (filters.difficulty?.length) {
      filters.difficulty.forEach(diff => trackFilterUsage(`difficulty_${diff}`, 'difficulty'));
    }
    if (filters.spotType?.length) {
      filters.spotType.forEach(spot => trackFilterUsage(`spot_type_${spot}`, 'spot_type'));
    }
    if (filters.category?.length) {
      filters.category.forEach(cat => trackFilterUsage(`category_${cat}`, 'category'));
    }
    if (filters.transmissionType?.length) {
      filters.transmissionType.forEach(trans => trackFilterUsage(`transmission_type_${trans}`, 'transmission_type'));
    }
    if (filters.activityLevel?.length) {
      filters.activityLevel.forEach(level => trackFilterUsage(`activity_level_${level}`, 'activity_level'));
    }
    if (filters.bestSeason?.length) {
      filters.bestSeason.forEach(season => trackFilterUsage(`best_season_${season}`, 'best_season'));
    }
    if (filters.vehicleTypes?.length) {
      filters.vehicleTypes.forEach(vehicle => trackFilterUsage(`vehicle_types_${vehicle}`, 'vehicle_types'));
    }
    if (filters.hasExercises) {
      trackFilterUsage('has_exercises', 'content');
    }
    if (filters.hasMedia) {
      trackFilterUsage('has_media', 'content');
    }
    if (filters.isVerified) {
      trackFilterUsage('is_verified', 'content');
    }
    if (selectedPresetId) {
      trackFilterUsage(`collection_${selectedPresetId}`, 'collection');
    }

    // Save filters to AsyncStorage for persistence (user-specific)
    await saveFilterPreferences(filtersWithPreset);

    onApplyFilters(filtersWithPreset);
    onClose();
  }, [onApplyFilters, filters, selectedPresetId, onClose, saveFilterPreferences, trackFilterUsage]);

  // Toggle array-based filter selection
  const toggleFilter = (type: keyof FilterOptions, value: string) => {
    setFilters((prev) => {
      const arrayProp = type as keyof Pick<
        FilterOptions,
        | 'difficulty'
        | 'spotType'
        | 'category'
        | 'transmissionType'
        | 'activityLevel'
        | 'bestSeason'
        | 'vehicleTypes'
      >;
      const currentArray = (prev[arrayProp] as string[]) || [];

      if (currentArray.includes(value)) {
        return {
          ...prev,
          [arrayProp]: currentArray.filter((v) => v !== value),
        };
      } else {
        return {
          ...prev,
          [arrayProp]: [...currentArray, value],
        };
      }
    });
  };

  // Set single value filter
  const setSingleFilter = React.useCallback(
    (type: keyof FilterOptions, value: string | number | boolean | undefined) => {
      setFilters((prev) => {
        if (value === undefined) {
          // Remove the property by destructuring it out
          const newFilters = { ...prev };
          delete newFilters[type];
          return newFilters;
        }
        return {
          ...prev,
          [type]: value,
        };
      });
    },
    [],
  );

  // Check if a filter chip is selected
  const isSelected = React.useCallback(
    (type: keyof FilterOptions, value: string) => {
      const arrayProp = filters[type] as string[] | undefined;
      return arrayProp?.includes(value) || false;
    },
    [filters],
  );

  // Handle backdrop press
  const handleBackdropPress = React.useCallback(() => {
    onClose();
  }, [onClose]);

  // Search functionality (similar to SearchScreen)
  const handleSearch = React.useCallback(async (text: string) => {
    setSearchQuery(text);

    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set a new timeout for search
    const timeout = setTimeout(async () => {
      if (text.length > 0) {
        setIsSearching(true);
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              text,
            )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,address,country,region&language=en`,
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          setSearchResults(data.features || []);
        } catch (error: unknown) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    searchTimeout.current = timeout;
  }, []);

  // Handle search result selection
  const handleResultSelect = React.useCallback(
    (result: SearchResult) => {
      console.log('🔍 [FilterSheet] Search result selected:', result);

      if (onSearchResultSelect) {
        onSearchResultSelect(result);
      }

      // Clear the search query and results after selection
      setSearchQuery('');
      setSearchResults([]);

      onClose(); // Close the filter sheet
    },
    [onSearchResultSelect, onClose],
  );

  // Handle city selection from popular cities
  const handleCitySelect = React.useCallback(
    (city: string, country: string) => {
      const query = `${city}, ${country}`;

      // Clear search query immediately when selecting a city
      setSearchQuery('');
      setSearchResults([]);

      // Manually trigger search
      setTimeout(() => {
        if (searchTimeout.current) {
          clearTimeout(searchTimeout.current);
        }

        setIsSearching(true);
        fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query,
          )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality&language=en`,
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            if (data.features && data.features.length > 0) {
              handleResultSelect(data.features[0]);
            }
          })
          .catch((error) => {
            console.error('Error selecting city:', error);
          })
          .finally(() => {
            setIsSearching(false);
          });
      }, 100);
    },
    [handleResultSelect],
  );

  // Handle Near Me functionality
  const handleNearMe = React.useCallback(async () => {
    try {
      setIsLocating(true);

      // Trigger MapScreen locate animation if callback provided
      if (onNearMePress) {
        onNearMePress();
      }

      // Close the filter sheet immediately and let MapScreen handle the location
      onClose();

      // Clear search state
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error in handleNearMe:', error);
    } finally {
      setIsLocating(false);
    }
  }, [onNearMePress, onClose]);

  // Handle preset selection
  const handlePresetSelect = React.useCallback(async (presetId: string | null) => {
    console.log('✅ [FilterSheet] Collection selected:', presetId);
    onPresetSelect?.(presetId);
    
    // Save the preset selection immediately as part of filters
    const updatedFilters = {
      ...filters,
      selectedPresetId: presetId,
    };
    
    // Save to storage immediately
    await saveFilterPreferences(updatedFilters);
    console.log('💾 [FilterSheet] Saved collection selection immediately:', presetId);
  }, [onPresetSelect, filters, saveFilterPreferences]);

  // Clean up search timeout
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        onTouchEnd={handleBackdropPress}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderColor,
            transform: [{ translateY }],
            zIndex: 1501, // Above backdrop
            width: screenWidth,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          <XStack width="100%" paddingHorizontal="$4" justifyContent="space-between">
            <TouchableOpacity onPress={handleReset}>
              <Text color="$blue10">{t('common.reset')}</Text>
            </TouchableOpacity>
            <Text fontWeight="600" fontSize="$5" color={textColor}>
              {t('map.filters')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={textColor} />
            </TouchableOpacity>
          </XStack>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Collections Section */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('routeCollections.title') || 'Collections'}
            </SizableText>
            
            {/* Collection Chips */}
            <View style={styles.filterRow}>
              {/* "All Routes" option */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    borderColor,
                    backgroundColor: !selectedPresetId ? '#00E6C3' : 'transparent',
                  },
                ]}
                onPress={() => handlePresetSelect(null)}
              >
                <XStack alignItems="center" gap="$1">
                  <Feather
                    name="globe"
                    size={14}
                    color={!selectedPresetId ? '#000000' : textColor}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: !selectedPresetId ? '#000000' : textColor,
                        fontWeight: !selectedPresetId ? '600' : '500',
                      },
                    ]}
                  >
                    {t('routeCollections.allRoutes') || 'All Routes'}
                  </Text>
                </XStack>
              </TouchableOpacity>

              {/* User Collections */}
              {userCollections.map((collection) => (
                <TouchableOpacity
                  key={collection.id || `collection-${Math.random()}`}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: selectedPresetId === collection.id ? '#00E6C3' : 'transparent',
                    },
                  ]}
                  onPress={() => handlePresetSelect(collection.id)}
                >
                  <XStack alignItems="center" gap="$1">
                    <Feather
                      name={collection.is_default === true ? 'star' : 'folder'}
                      size={14}
                      color={selectedPresetId === collection.id ? '#000000' : textColor}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selectedPresetId === collection.id ? '#000000' : textColor,
                          fontWeight: selectedPresetId === collection.id ? '600' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {collection.name || 'Unnamed Collection'}
                    </Text>
                    {collection.route_count != null && collection.route_count > 0 && (
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selectedPresetId === collection.id ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({String(collection.route_count || 0)})
                      </Text>
                    )}
                  </XStack>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Search Section */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('search.title') || 'Search'}
            </SizableText>

            {/* Search Input */}
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <Input
                flex={1}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder={t('search.placeholder') || 'Search for cities, places...'}
                backgroundColor="$backgroundHover"
                borderColor={borderColor}
                color={textColor}
                placeholderTextColor="$gray10"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={20} color={textColor} />
                </TouchableOpacity>
              )}
            </XStack>

            {/* Search Results */}
            {isSearching ? (
              <XStack padding="$2" justifyContent="center">
                <Text color={textColor}>{t('search.searching') || 'Searching...'}</Text>
              </XStack>
            ) : searchResults.length > 0 ? (
              <YStack gap="$1" maxHeight={200}>
                <ScrollView>
                  {searchResults.slice(0, 5).map((result) => {
                    if (!result || !result.id) {
                      console.warn('⚠️ [FilterSheet] Invalid search result:', result);
                      return null;
                    }
                    return (
                    <TouchableOpacity
                      key={result.id}
                      onPress={() => handleResultSelect(result)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: borderColor,
                      }}
                    >
                      <XStack alignItems="center" gap="$2">
                        <Feather
                          name={
                            result.place_type[0] === 'country'
                              ? 'flag'
                              : result.place_type[0] === 'region'
                                ? 'map'
                                : result.place_type[0] === 'place'
                                  ? 'map-pin'
                                  : 'navigation'
                          }
                          size={16}
                          color={textColor}
                        />
                        <YStack flex={1}>
                          <Text numberOfLines={1} fontWeight="600" color={textColor}>
                            {result.place_name.split(',')[0]}
                          </Text>
                          <Text numberOfLines={1} fontSize="$1" color="$gray10">
                            {result.place_name.split(',').slice(1).join(',').trim()}
                          </Text>
                        </YStack>
                      </XStack>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </YStack>
            ) : searchQuery.length === 0 ? (
              /* Default content when no search */
              <YStack gap="$2">
                {/* Near Me Button */}
                <TouchableOpacity
                  onPress={handleNearMe}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: borderColor,
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    opacity: isLocating ? 0.6 : 1,
                  }}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <Animated.View
                      style={{
                        marginRight: 12,
                        transform: [
                          {
                            rotate: '45deg', // Static rotation for navigation icon during loading
                          },
                        ],
                      }}
                    >
                      <Feather name="navigation" size={20} color={textColor} />
                    </Animated.View>
                  ) : (
                    <Feather
                      name="navigation"
                      size={20}
                      color={textColor}
                      style={{ marginRight: 12 }}
                    />
                  )}
                  <Text color={textColor} fontWeight="500">
                    {isLocating
                      ? t('search.locating') || 'Locating...'
                      : t('search.nearMe') || 'Near Me'}
                  </Text>
                </TouchableOpacity>

                {/* Popular Swedish Cities - All 10 with wrapping */}
                <Text color="$gray10" fontSize="$2" marginTop="$2" marginBottom="$2">
                  {t('search.popularCities') || 'Popular Cities'}
                </Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
                  {POPULAR_CITIES.map((city, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleCitySelect(city.name, city.country)}
                      style={[
                        styles.filterChip,
                        {
                          borderColor,
                          backgroundColor: 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: textColor }]}>{city.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </YStack>
            ) : (
              /* No results found */
              <XStack padding="$2" justifyContent="center">
                <Text color={textColor}>{t('search.noResults') || 'No results found'}</Text>
              </XStack>
            )}
          </YStack>

          {/* Sort Options */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.sortBy')}
            </SizableText>
            <View style={styles.filterRow}>
              {[
                'best_match',
                'most_popular',
                'closest',
                'newly_added',
                'newest',
                'my_created',
                'best_review',
                'has_image',
              ].map((sort) => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: filters.sort === sort ? '#00E6C3' : 'transparent',
                    },
                  ]}
                  onPress={() => setSingleFilter('sort', filters.sort === sort ? undefined : sort)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.sort === sort ? '#000000' : textColor,
                        fontWeight: filters.sort === sort ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.sort.${sort}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Difficulty */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.difficulty')}
            </SizableText>
            <View style={styles.filterRow}>
              {['beginner', 'intermediate', 'advanced'].map((difficulty) => {
                const count = getFilterCount('difficulty', difficulty);
                return (
                  <TouchableOpacity
                    key={difficulty}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('difficulty', difficulty)
                          ? '#00E6C3'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('difficulty', difficulty)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('difficulty', difficulty) ? '#000000' : textColor,
                            fontWeight: isSelected('difficulty', difficulty) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.difficulty.${difficulty}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('difficulty', difficulty) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Spot Type */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.spotType')}
            </SizableText>
            <View style={styles.filterRow}>
              {['urban', 'highway', 'rural', 'parking'].map((spotType) => {
                const count = getFilterCount('spotType', spotType);
                return (
                  <TouchableOpacity
                    key={spotType}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('spotType', spotType) ? '#00E6C3' : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('spotType', spotType)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('spotType', spotType) ? '#000000' : textColor,
                            fontWeight: isSelected('spotType', spotType) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.spotType.${spotType}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('spotType', spotType) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Category */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.category')}
            </SizableText>
            <View style={styles.filterRow}>
              {['parking', 'incline_start'].map((category) => {
                const count = getFilterCount('category', category);
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('category', category) ? '#00E6C3' : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('category', category)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('category', category) ? '#000000' : textColor,
                            fontWeight: isSelected('category', category) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.category.${category}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('category', category) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Transmission Type */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.transmissionType')}
            </SizableText>
            <View style={styles.filterRow}>
              {['automatic', 'manual', 'both'].map((transmissionType) => {
                const count = getFilterCount('transmissionType', transmissionType);
                return (
                  <TouchableOpacity
                    key={transmissionType}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('transmissionType', transmissionType)
                          ? '#00E6C3'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('transmissionType', transmissionType)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('transmissionType', transmissionType)
                              ? '#000000'
                              : textColor,
                            fontWeight: isSelected('transmissionType', transmissionType)
                              ? '600'
                              : '500',
                          },
                        ]}
                      >
                        {t(`filters.transmissionType.${transmissionType}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('transmissionType', transmissionType)
                              ? '#000000'
                              : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Activity Level */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.activityLevel')}
            </SizableText>
            <View style={styles.filterRow}>
              {['moderate', 'high'].map((activityLevel) => {
                const count = getFilterCount('activityLevel', activityLevel);
                return (
                  <TouchableOpacity
                    key={activityLevel}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('activityLevel', activityLevel)
                          ? '#00E6C3'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('activityLevel', activityLevel)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('activityLevel', activityLevel) ? '#000000' : textColor,
                            fontWeight: isSelected('activityLevel', activityLevel) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.activityLevel.${activityLevel}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('activityLevel', activityLevel) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Best Season */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.bestSeason')}
            </SizableText>
            <View style={styles.filterRow}>
              {['all', 'year-round', 'avoid-winter'].map((bestSeason) => {
                const count = getFilterCount('bestSeason', bestSeason);
                return (
                  <TouchableOpacity
                    key={bestSeason}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('bestSeason', bestSeason)
                          ? '#00E6C3'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('bestSeason', bestSeason)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('bestSeason', bestSeason) ? '#000000' : textColor,
                            fontWeight: isSelected('bestSeason', bestSeason) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.bestSeason.${bestSeason}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('bestSeason', bestSeason) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Vehicle Types */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.vehicleTypes')}
            </SizableText>
            <View style={styles.filterRow}>
              {['passenger_car', 'rv'].map((vehicleType) => {
                const count = getFilterCount('vehicleTypes', vehicleType);
                return (
                  <TouchableOpacity
                    key={vehicleType}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: isSelected('vehicleTypes', vehicleType)
                          ? '#00E6C3'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('vehicleTypes', vehicleType)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('vehicleTypes', vehicleType) ? '#000000' : textColor,
                            fontWeight: isSelected('vehicleTypes', vehicleType) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.vehicleTypes.${vehicleType}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected('vehicleTypes', vehicleType) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Experience Level */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.experienceLevel')}
            </SizableText>
            <View style={styles.filterRow}>
              {['beginner', 'intermediate', 'advanced', 'expert'].map((level) => {
                const count = getFilterCount('experienceLevel', level);
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor:
                          filters.experienceLevel === level ? '#00E6C3' : 'transparent',
                      },
                    ]}
                    onPress={() =>
                      setSingleFilter(
                        'experienceLevel',
                        filters.experienceLevel === level ? undefined : level,
                      )
                    }
                  >
                    <XStack alignItems="center" gap="$1">
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.experienceLevel === level ? '#000000' : textColor,
                            fontWeight: filters.experienceLevel === level ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.experienceLevel.${level}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.experienceLevel === level ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Content Filters */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.content')}
            </SizableText>
            <View style={styles.filterRow}>
              {/* Has Exercises */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    borderColor,
                    backgroundColor: filters.hasExercises ? '#00E6C3' : 'transparent',
                  },
                ]}
                onPress={() =>
                  setSingleFilter('hasExercises', filters.hasExercises ? undefined : true)
                }
              >
                <XStack alignItems="center" gap="$1">
                  <Feather
                    name="activity"
                    size={14}
                    color={filters.hasExercises ? '#000000' : textColor}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.hasExercises ? '#000000' : textColor,
                        fontWeight: filters.hasExercises ? '600' : '500',
                      },
                    ]}
                  >
                    {t('filters.hasExercises')}
                  </Text>
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.hasExercises ? '#000000' : textColor,
                        fontSize: 12,
                        opacity: 0.7,
                      },
                    ]}
                  >
                    ({getFilterCount('hasExercises', true)})
                  </Text>
                </XStack>
              </TouchableOpacity>

              {/* Has Media */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    borderColor,
                    backgroundColor: filters.hasMedia ? '#00E6C3' : 'transparent',
                  },
                ]}
                onPress={() => setSingleFilter('hasMedia', filters.hasMedia ? undefined : true)}
              >
                <XStack alignItems="center" gap="$1">
                  <Feather
                    name="image"
                    size={14}
                    color={filters.hasMedia ? '#000000' : textColor}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.hasMedia ? '#000000' : textColor,
                        fontWeight: filters.hasMedia ? '600' : '500',
                      },
                    ]}
                  >
                    {t('filters.hasMedia')}
                  </Text>
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.hasMedia ? '#000000' : textColor,
                        fontSize: 12,
                        opacity: 0.7,
                      },
                    ]}
                  >
                    ({getFilterCount('hasMedia', true)})
                  </Text>
                </XStack>
              </TouchableOpacity>

              {/* Verified Routes */}
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    borderColor,
                    backgroundColor: filters.isVerified ? '#00E6C3' : 'transparent',
                  },
                ]}
                onPress={() => setSingleFilter('isVerified', filters.isVerified ? undefined : true)}
              >
                <XStack alignItems="center" gap="$1">
                  <Feather
                    name="check-circle"
                    size={14}
                    color={filters.isVerified ? '#000000' : textColor}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.isVerified ? '#000000' : textColor,
                        fontWeight: filters.isVerified ? '600' : '500',
                      },
                    ]}
                  >
                    {t('filters.verified')}
                  </Text>
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.isVerified ? '#000000' : textColor,
                        fontSize: 12,
                        opacity: 0.7,
                      },
                    ]}
                  >
                    ({getFilterCount('isVerified', true)})
                  </Text>
                </XStack>
              </TouchableOpacity>
            </View>
          </YStack>

          {/* Route Type */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.routeType')}
            </SizableText>
            <View style={styles.filterRow}>
              {['recorded', 'waypoint', 'pen'].map((type) => {
                const count = getFilterCount('routeType', type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: filters.routeType?.includes(type)
                          ? '#00E6C3'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleFilter('routeType', type)}
                  >
                    <XStack alignItems="center" gap="$1">
                      <Feather
                        name={
                          type === 'recorded' ? 'navigation' : type === 'pen' ? 'edit-3' : 'map-pin'
                        }
                        size={14}
                        color={filters.routeType?.includes(type) ? '#000000' : textColor}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.routeType?.includes(type) ? '#000000' : textColor,
                            fontWeight: filters.routeType?.includes(type) ? '600' : '500',
                          },
                        ]}
                      >
                        {t(`filters.routeType.${type}`)}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.routeType?.includes(type) ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Minimum Rating */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.minRating')}
            </SizableText>
            <View style={styles.filterRow}>
              {[0, 3, 4, 5].map((rating) => {
                const count = getFilterCount('minRating', rating);
                return (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.filterChip,
                      {
                        borderColor,
                        backgroundColor: filters.minRating === rating ? '#00E6C3' : 'transparent',
                      },
                    ]}
                    onPress={() =>
                      setSingleFilter('minRating', filters.minRating === rating ? undefined : rating)
                    }
                  >
                    <XStack alignItems="center" gap="$1">
                      <Feather
                        name="star"
                        size={14}
                        color={filters.minRating === rating ? '#000000' : textColor}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.minRating === rating ? '#000000' : textColor,
                            fontWeight: filters.minRating === rating ? '600' : '500',
                          },
                        ]}
                      >
                        {rating === 0 ? t('filters.allRatings') : `${rating}+`}
                      </Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.minRating === rating ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({count})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </View>
          </YStack>

          {/* Distance Range */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.maxDistance')}
            </SizableText>
            <XStack alignItems="center" justifyContent="space-between">
              <Text>{String(filters.maxDistance || 100)} km</Text>
            </XStack>
            <Slider
              defaultValue={[filters.maxDistance || 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={(value) => {
                setSingleFilter('maxDistance', value[0]);
              }}
            >
              <Slider.Track>
                <Slider.TrackActive />
              </Slider.Track>
              <Slider.Thumb circular index={0}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: '#00E6C3',
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="move" size={14} color="#000000" />
                </View>
              </Slider.Thumb>
            </Slider>
            <XStack marginTop="$2" alignItems="center" justifyContent="space-between">
              <Text color="$gray10" fontSize="$1">
                0 km
              </Text>
              <Text color="$gray10" fontSize="$1">
                100 km
              </Text>
            </XStack>
          </YStack>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderColor,
              backgroundColor,
            },
          ]}
        >
          <Button backgroundColor="#00E6C3" color="#000000" size="$5" onPress={handleApply}>
            <Text color="#000000" fontWeight="700">
              {t('filters.seeRoutes')} ({filteredCount})
            </Text>
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}

export function FilterSheetModal({
  onApplyFilters,
  routeCount,
  routes,
  initialFilters = {},
  onSearchResultSelect,
  onNearMePress,
  onPresetSelect,
  selectedPresetId,
}: Omit<FilterSheetProps, 'isVisible' | 'onClose'>) {
  const { hideModal } = useModal();

  // Handle closing the sheet
  const handleClose = React.useCallback(() => {
    hideModal();
  }, [hideModal]);

  // Handle apply filters and close
  const handleApply = React.useCallback(
    async (filters: FilterOptions) => {
      console.log('✅ [FilterSheetModal] Apply filters with:', filters);

      // Note: Filter persistence is now handled in the main FilterSheet component
      // This ensures user-specific storage works correctly with student switching
      onApplyFilters(filters);
      hideModal();
    },
    [onApplyFilters, hideModal],
  );

  return (
    <FilterSheet
      isVisible={true}
      onClose={handleClose}
      onApplyFilters={handleApply}
      routeCount={routeCount}
      routes={routes}
      initialFilters={initialFilters}
      onSearchResultSelect={onSearchResultSelect}
      onNearMePress={onNearMePress}
      onPresetSelect={onPresetSelect}
      selectedPresetId={selectedPresetId}
    />
  );
}
