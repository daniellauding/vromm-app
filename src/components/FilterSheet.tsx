import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, XStack, YStack, Slider, Button, SizableText, Input, useTheme } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useSmartFilters } from '../hooks/useSmartFilters';
import { useUserCollections } from '../hooks/useUserCollections';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { LeaveCollectionModal } from './LeaveCollectionModal';
import { CollectionSharingModal } from './CollectionSharingModal';

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
  experience_level?: string; // Added for experience level filter
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
  // Removed old sheet styles - now using gesture system
  header: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 4, // Reduced since sheet now has padding
  },
  filterSection: {
    marginBottom: 20,
    paddingHorizontal: 4, // Reduced since sheet now has padding
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
    // Color will be set dynamically based on theme
  },
  selectedChipText: {
    color: '#000000',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 4, // Reduced since sheet now has padding
    paddingVertical: 16,
    borderTopWidth: 1,
    paddingBottom: 16 + BOTTOM_INSET, // Extra padding to ensure button is above home indicator
  },
  // Removed old handle styles - now using gesture system
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
  const { showToast } = useToast();

  // Use proper theming instead of hardcoded colors
  const theme = useTheme();
  const backgroundColor = theme.background?.val || '#FFFFFF';
  const textColor = theme.color?.val || '#11181C';
  const borderColor = theme.borderColor?.val || '#E5E5E5';
  const handleColor = theme.gray8?.val || '#999';

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

  // Collection display state
  const [showAllCollections, setShowAllCollections] = useState(false);
  const MAX_VISIBLE_COLLECTIONS = 5; // Changed to 5 for better UX
  
  // Loading state for collections
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // Leave collection modal state
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [selectedCollectionForLeave, setSelectedCollectionForLeave] = useState<any>(null);

  // Collection settings modal state
  const [collectionSettingsVisible, setCollectionSettingsVisible] = useState(false);
  const [selectedCollectionForSettings, setSelectedCollectionForSettings] = useState<any>(null);

  // Snap points for resizing (like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: screenHeight * 0.1,   // Top at 10% of screen (show 90% - largest)
      medium: screenHeight * 0.4,  // Top at 40% of screen (show 60% - medium)  
      small: screenHeight * 0.7,   // Top at 70% of screen (show 30% - small)
      mini: screenHeight * 0.85,   // Top at 85% of screen (show 15% - just title)
      dismissed: screenHeight,     // Completely off-screen
    };
    return points;
  }, [screenHeight]);
  
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);
  const translateY = useSharedValue(snapPoints.large);
  const isDragging = useRef(false);
  const backdropOpacityShared = useSharedValue(0.7); // Make backdrop more transparent by default

  // Use the routeCount prop directly from MapScreen (which is already filtered by activeRoutes.length)
  const filteredCount = useMemo(() => {
    console.log('🔢 [FilterSheet] Using routeCount from MapScreen (already filtered):', routeCount);
    console.log('🔢 [FilterSheet] Current filters:', filters);
    console.log('🔢 [FilterSheet] Selected preset ID:', selectedPresetId);
    
    // The routeCount prop from MapScreen is already the filtered count (activeRoutes.length)
    // So we can use it directly instead of recalculating
    return routeCount;
  }, [routeCount, filters, selectedPresetId]);

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
      case 'experienceLevel': // Added for experience level
        count = routes.filter(route => route.experience_level === value).length;
        break;
      case 'maxDistance': // Added for distance filtering
        // For distance, we need to calculate based on current user location or route center
        // For now, return total routes since distance calculation requires location data
        count = routes.length;
        break;
      default:
        count = 0;
    }
    
    return count;
  }, [routes]);

  // Helper function to count routes for cities (simplified - just return total for now)
  const getCityRouteCount = useCallback((cityName: string) => {
    // For now, return a placeholder count. In a real implementation, 
    // you'd filter routes by city/region
    return Math.floor(Math.random() * 10) + 1; // Random count 1-10 for demo
  }, []);

  // Helper function to count routes for sort options
  const getSortRouteCount = useCallback((sortType: string) => {
    // For sort options, return the total route count since sorting doesn't filter
    return routes?.length || 0;
  }, [routes]);

  // Animation values (keeping original for backdrop)
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Snap functions
  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed]);

  const snapTo = useCallback((point: number) => {
    currentState.value = point;
    setCurrentSnapPoint(point);
  }, [currentState]);

  // Pan gesture for drag-to-dismiss and snap points
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;
        
        // Constrain to snap points range
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.mini + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);
        
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;
      
      const currentPosition = currentState.value + translationY;
      
      // Dismiss if dragged down past the mini snap point with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }
      
      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.mini;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }
      
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.large),
        snapPoints.mini,
      );
      
      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      
      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

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

  // Track collections loading state
  useEffect(() => {
    if (userCollections.length > 0) {
      setCollectionsLoading(false);
      console.log('✅ [FilterSheet] Collections loaded, setting loading to false');
    } else if (isVisible) {
      // Reset loading state when sheet becomes visible
      setCollectionsLoading(true);
      console.log('🔄 [FilterSheet] Sheet visible, setting loading to true');
      
      // Set a timeout to stop loading state after 3 seconds
      const timeout = setTimeout(() => {
        setCollectionsLoading(false);
        console.log('⏰ [FilterSheet] Loading timeout reached, setting loading to false');
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [userCollections, isVisible]);

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      // Reset gesture translateY when opening and set to large snap point
      translateY.value = withSpring(snapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.large;
      setCurrentSnapPoint(snapPoints.large);
      
      // Set backdrop opacity to be more transparent for better map interaction
      backdropOpacityShared.value = 0.3;
      
      Animated.timing(backdropOpacity, {
        toValue: 0.3, // More transparent for map interaction
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, snapPoints.large, currentState]);

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
    
    // Close the filter sheet immediately (like city selection)
    onClose();
  }, [onPresetSelect, filters, saveFilterPreferences, onClose]);

  // Handle collection settings
  const handleCollectionSettings = React.useCallback((collection: any) => {
    console.log('⚙️ [FilterSheet] User wants to view collection settings:', collection.name);
    setSelectedCollectionForSettings(collection);
    setCollectionSettingsVisible(true);
  }, []);

  // Handle leaving a collection
  const handleLeaveCollection = React.useCallback((collection: any) => {
    console.log('🚪 [FilterSheet] User wants to leave collection:', collection.name);
    setSelectedCollectionForLeave(collection);
    setLeaveModalVisible(true);
  }, []);

  // Handle leave collection confirmation
  const handleLeaveCollectionConfirm = React.useCallback(async (customMessage?: string) => {
    if (!selectedCollectionForLeave) return;

    try {
      // Remove user from collection
      const { error } = await supabase
        .from('map_preset_members')
        .delete()
        .eq('preset_id', selectedCollectionForLeave.id)
        .eq('user_id', getEffectiveUserId());

      if (error) throw error;

      // Create notification for collection owner with custom message
      const baseMessage = `A member has left your collection "${selectedCollectionForLeave.name}".`;
      const fullMessage = customMessage?.trim() 
        ? `${baseMessage}\n\nPersonal message: "${customMessage.trim()}"`
        : baseMessage;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedCollectionForLeave.creator_id,
          actor_id: getEffectiveUserId(),
          type: 'collection_member_left',
          title: 'Member Left Collection',
          message: fullMessage,
          metadata: {
            collection_id: selectedCollectionForLeave.id,
            collection_name: selectedCollectionForLeave.name,
            member_id: getEffectiveUserId(),
            member_role: (selectedCollectionForLeave as any).member_role || 'member',
            custom_message: customMessage?.trim() || null,
          },
          action_url: 'vromm://collections',
          priority: 'normal',
          is_read: false,
        });

      if (notificationError) {
        console.warn('Failed to create leave notification:', notificationError);
      }

      showToast({
        title: t('routeCollections.leftCollection') || 'Left Collection',
        message: t('routeCollections.leftCollectionSuccess') || `You have left "${selectedCollectionForLeave.name}".`,
        type: 'success',
      });

      // Refresh collections
      if (onPresetSelect) {
        onPresetSelect(null); // Clear selection
      }
      
      // Close filter sheet
      onClose();
    } catch (error) {
      console.error('Error leaving collection:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToLeaveCollection') || 'Failed to leave collection',
        type: 'error',
      });
    } finally {
      setLeaveModalVisible(false);
      setSelectedCollectionForLeave(null);
    }
  }, [selectedCollectionForLeave, getEffectiveUserId, showToast, t, onPresetSelect, onClose]);

  // Handle leave collection cancellation
  const handleLeaveCollectionCancel = React.useCallback(() => {
    setLeaveModalVisible(false);
    setSelectedCollectionForLeave(null);
  }, []);

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
      <GestureDetector gesture={panGesture}>
        <ReanimatedAnimated.View 
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: screenHeight,
              backgroundColor,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              zIndex: 1501, // Above backdrop
              width: screenWidth,
            },
            animatedGestureStyle
          ]}
        >
          <YStack
            padding="$3"
            paddingBottom={20 + BOTTOM_INSET}
            gap="$3"
            flex={1}
          >
            {/* Drag Handle */}
            <View style={{
              alignItems: 'center',
              paddingVertical: 8,
              paddingBottom: 16,
            }}>
              <View style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: handleColor,
              }} />
            </View>

            {/* Header */}
            <XStack width="100%" paddingHorizontal="$2" justifyContent="center" alignItems="center">
              <Text fontWeight="600" fontSize="$5" color={textColor}>
                {t('map.filters')}
              </Text>
              <TouchableOpacity 
                onPress={onClose}
                style={{ position: 'absolute', right: 0 }}
              >
                <Feather name="x" size={24} color={textColor} />
              </TouchableOpacity>
            </XStack>

            {/* Show content only if not in mini mode */}
            {currentSnapPoint !== snapPoints.mini && (
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }}>
          {/* Search Section - MOVED TO TOP */}
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

                {/* Popular Swedish Cities - All 10 with wrapping and route counts */}
                <Text color="$gray10" fontSize="$2" marginTop="$2" marginBottom="$2">
                  {t('search.popularCities') || 'Popular Cities'}
                </Text>
                <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
                  {POPULAR_CITIES.map((city, index) => {
                    const cityCount = getCityRouteCount(city.name);
                    return (
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
                        <XStack alignItems="center" gap="$1">
                          <Text style={[styles.chipText, { color: textColor }]}>{city.name}</Text>
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: textColor,
                                fontSize: 12,
                                opacity: 0.7,
                              },
                            ]}
                          >
                            ({cityCount})
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </YStack>
            ) : (
              /* No results found */
              <XStack padding="$2" justifyContent="center">
                <Text color={textColor}>{t('search.noResults') || 'No results found'}</Text>
              </XStack>
            )}
          </YStack>

          {/* Collections Section */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('routeCollections.title') || 'Collections'}
            </SizableText>
            
            {/* Collection Chips - REMOVED ICONS */}
            <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
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
              </TouchableOpacity>

              {/* User Collections - Filter out VROMM collections and show only relevant ones */}
              {(() => {
                console.log('🔍 [FilterSheet] All userCollections:', userCollections);
                console.log('🔍 [FilterSheet] Current user ID:', getEffectiveUserId());
                
                // Debug each collection individually
                userCollections.forEach((collection, index) => {
                  console.log(`🔍 [FilterSheet] Collection ${index}:`, {
                    id: collection.id,
                    name: collection.name,
                    nameType: typeof collection.name,
                    nameLength: collection.name?.length,
                    nameValue: JSON.stringify(collection.name),
                    visibility: collection.visibility,
                    creator_id: collection.creator_id,
                    route_count: collection.route_count
                  });
                });
                
                const filteredCollections = userCollections
                  .filter(collection => {
                    console.log(`🔍 [FilterSheet] Processing collection:`, {
                      id: collection.id,
                      name: collection.name,
                      visibility: collection.visibility,
                      creator_id: collection.creator_id,
                      current_user_id: getEffectiveUserId(),
                      route_count: collection.route_count,
                      member_role: collection.member_role
                    });
                    
                    // Filter out VROMM collections (legacy global collection)
                    const name = collection.name?.toLowerCase() || '';
                    if (name.includes('vromm')) {
                      console.log(`🔍 [FilterSheet] Filtering out VROMM collection: "${collection.name}"`);
                      return false;
                    }
                    
                    // Show collections where user is a member, has routes, or is the creator
                    const isCreator = collection.creator_id === getEffectiveUserId();
                    const hasRoutes = collection.route_count && collection.route_count > 0;
                    const isMember = collection.member_role; // If user is a member, they should see it
                    const isPublic = collection.visibility === 'public';
                    const isShared = collection.visibility === 'shared';
                    
                    console.log(`🔍 [FilterSheet] Collection "${collection.name}" filtering logic:`, {
                      isCreator,
                      hasRoutes,
                      isMember,
                      isPublic,
                      isShared,
                      member_role: collection.member_role,
                      visibility: collection.visibility,
                      route_count: collection.route_count,
                      willShow: isCreator || isMember || isPublic || isShared
                    });
                    
                    // Show if user is creator, member, or if it's a public/shared collection
                    // Don't require routes for user's own collections or collections they're members of
                    return isCreator || isMember || isPublic || isShared;
                  });
                
                console.log('🔍 [FilterSheet] Filtered collections:', filteredCollections);

                const visibleCollections = showAllCollections 
                  ? filteredCollections 
                  : filteredCollections.slice(0, MAX_VISIBLE_COLLECTIONS);

                console.log('🔍 [FilterSheet] Visible collections to render:', visibleCollections);

                // Show loading state while collections are being loaded
                if (collectionsLoading) {
                  console.log('🔄 [FilterSheet] Collections still loading...');
                  return (
                    <XStack alignItems="center" gap="$2" padding="$2">
                      <Feather name="loader" size={16} color={textColor} />
                      <Text color="$gray10" fontSize="$2" fontStyle="italic">
                        {t('common.loading') || 'Loading collections...'}
                      </Text>
                    </XStack>
                  );
                }

                // If no collections to show after loading, return empty
                if (visibleCollections.length === 0) {
                  console.log('🔍 [FilterSheet] No collections to show');
                  return (
                    <Text color="$gray10" fontSize="$2" fontStyle="italic">
                      {t('routeCollections.noCollections') || 'No collections available'}
                    </Text>
                  );
                }

                return (
                  <>
                    {visibleCollections.map((collection) => {
                      const isMember = (collection as any).member_role;
                      const isCreator = collection.creator_id === getEffectiveUserId();
                      const canLeave = isMember && !isCreator; // Can leave if member but not creator
                      
                      console.log('🔍 [FilterSheet] Rendering collection:', {
                        id: collection.id,
                        name: collection.name,
                        nameType: typeof collection.name,
                        nameLength: collection.name?.length,
                        route_count: collection.route_count,
                        visibility: collection.visibility,
                        selectedPresetId: selectedPresetId,
                        isSelected: selectedPresetId === collection.id,
                        textColor: selectedPresetId === collection.id ? '#000000' : textColor,
                        backgroundColor: selectedPresetId === collection.id ? '#00E6C3' : 'transparent'
                      });
                      
                      // Debug the actual text content
                      const rawText = collection.name || collection.id || 'Unnamed Collection';
                      const displayText = rawText.replace(/[\r\n]/g, '').trim(); // Remove line breaks and trim
                      console.log('🔍 [FilterSheet] Text to display:', {
                        rawText,
                        displayText,
                        textLength: displayText.length,
                        textType: typeof displayText,
                        textColor: selectedPresetId === collection.id ? '#000000' : '#FFFFFF',
                        backgroundColor: selectedPresetId === collection.id ? '#00E6C3' : 'transparent',
                        hasLineBreaks: rawText !== displayText
                      });
                      
                      return (
                        <XStack key={collection.id || `collection-${Math.random()}`} alignItems="center" gap="$1">
                          <TouchableOpacity
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
                              <Text
                                color={selectedPresetId === collection.id ? '#000000' : textColor}
                                fontWeight={selectedPresetId === collection.id ? '600' : '500'}
                                fontSize={14}
                              >
                                {displayText}
                              </Text>
                              {collection.route_count != null && collection.route_count > 0 && (
                                <Text
                                  color={selectedPresetId === collection.id ? '#000000' : textColor}
                                  fontSize={12}
                                  opacity={0.7}
                                >
                                  ({String(collection.route_count || 0)})
                                </Text>
                              )}
                            </XStack>
                          </TouchableOpacity>
                          
                          {/* Settings cog for collection info */}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCollectionSettings(collection);
                            }}
                            style={{
                              padding: 4,
                              backgroundColor: 'rgba(0, 230, 195, 0.1)',
                              borderRadius: 4,
                              marginLeft: 4,
                            }}
                            activeOpacity={0.7}
                          >
                            <Feather name="settings" size={14} color="#00E6C3" />
                          </TouchableOpacity>
                          
                          {/* X button for leaving collection */}
                          {canLeave && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleLeaveCollection(collection);
                              }}
                              style={{
                                padding: 4,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 4,
                                marginLeft: 4,
                              }}
                              activeOpacity={0.7}
                            >
                              <Feather name="x" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </XStack>
                      );
                    })}

                    {/* View More/Less Toggle */}
                    {filteredCollections.length > MAX_VISIBLE_COLLECTIONS && (
                      <TouchableOpacity
                        onPress={() => setShowAllCollections(!showAllCollections)}
                        style={[
                          styles.filterChip,
                          {
                            borderColor,
                            backgroundColor: 'transparent',
                            borderStyle: 'dashed',
                          },
                        ]}
                      >
                        <XStack alignItems="center" gap="$1">
                          <Feather 
                            name={showAllCollections ? "chevron-up" : "chevron-down"} 
                            size={14} 
                            color={textColor} 
                          />
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: textColor,
                                fontWeight: '500',
                                fontStyle: 'italic',
                              },
                            ]}
                          >
                            {showAllCollections 
                              ? `${t('filters.showLess') || 'Show Less'} (${MAX_VISIBLE_COLLECTIONS})` 
                              : `${t('filters.viewMore') || 'View More'} (${filteredCollections.length - MAX_VISIBLE_COLLECTIONS} ${t('filters.more') || 'more'})`
                            }
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>
          </YStack>


          {/* Sort Options - WITH ROUTE COUNTS */}
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
              ].map((sort) => {
                const sortCount = getSortRouteCount(sort);
                return (
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
                    <XStack alignItems="center" gap="$1">
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
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: filters.sort === sort ? '#000000' : textColor,
                            fontSize: 12,
                            opacity: 0.7,
                          },
                        ]}
                      >
                        ({sortCount})
                      </Text>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
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

          {/* Content Filters - REMOVED ICONS */}
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

          {/* Route Type - REMOVED ICONS */}
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

          {/* Minimum Rating - REMOVED ICONS */}
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

          {/* Distance Range - IMPROVED STYLING */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.maxDistance')}
            </SizableText>
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
              <Text color={textColor} fontWeight="600" fontSize="$4">
                {String(filters.maxDistance || 100)} km
              </Text>
              <Text color="$gray10" fontSize="$3">
                ({getFilterCount('maxDistance', filters.maxDistance || 100)} routes)
              </Text>
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
              <Slider.Track backgroundColor={borderColor} height={6}>
                <Slider.TrackActive backgroundColor="#00E6C3" />
              </Slider.Track>
              <Slider.Thumb circular index={0} backgroundColor="#00E6C3" borderWidth={2} borderColor="#FFFFFF">
                <View
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: '#00E6C3',
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <Feather name="move" size={12} color="#000000" />
                </View>
              </Slider.Thumb>
            </Slider>
            <XStack marginTop="$2" alignItems="center" justifyContent="space-between">
              <Text color="$gray10" fontSize="$2">
                0 km
              </Text>
              <Text color="$gray10" fontSize="$2">
                100 km
              </Text>
            </XStack>
          </YStack>
                </ScrollView>

                {/* Footer Buttons */}
                <View
                  style={[
                    styles.footer,
                    {
                      borderColor,
                      backgroundColor,
                    },
                  ]}
                >
                  <YStack gap="$2">
                    <Button backgroundColor="#00E6C3" color="#000000" size="$5" onPress={handleApply}>
                      <Text color="#000000" fontWeight="700">
                        {t('filters.seeRoutes')} ({filteredCount})
                      </Text>
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="$4" 
                      onPress={handleReset}
                      borderColor={borderColor}
                    >
                      <Text color={textColor} fontWeight="500">
                        {t('common.reset')}
                      </Text>
                    </Button>
                  </YStack>
                </View>
              </View>
            )}
          </YStack>
        </ReanimatedAnimated.View>
      </GestureDetector>

      {/* Leave Collection Modal */}
      <LeaveCollectionModal
        visible={leaveModalVisible}
        collectionName={selectedCollectionForLeave?.name || ''}
        routeCount={selectedCollectionForLeave?.route_count || 0}
        memberRole={(selectedCollectionForLeave as any)?.member_role || 'member'}
        onConfirm={handleLeaveCollectionConfirm}
        onCancel={handleLeaveCollectionCancel}
      />

      {/* Collection Settings Modal */}
      <CollectionSharingModal
        visible={collectionSettingsVisible}
        onClose={() => setCollectionSettingsVisible(false)}
        preset={selectedCollectionForSettings}
        onInvitationsSent={() => {
          // Refresh collections when invitations are sent
          console.log('🔄 [FilterSheet] Invitations sent, refreshing collections');
        }}
      />
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
