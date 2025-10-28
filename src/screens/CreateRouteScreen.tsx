import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Image,
  Alert,
  useColorScheme,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Platform,
  PanResponder,
  BackHandler,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { YStack, Form, Input, TextArea, XStack, Card, Separator, Group, Heading, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Map, Waypoint, Screen, Button, Text, Header, FormField, Chip, IconButton } from '../components';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import MapView, { Marker, Polyline, Region } from '../components/MapView';
import { decode } from 'base64-arraybuffer';
import { useLocation } from '../context/LocationContext';
import { AppAnalytics } from '../utils/analytics';
import { MediaCarousel } from '../components/MediaCarousel';
import { MediaItem, Exercise, WaypointData, MediaUrl, RouteData } from '../types/route';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { useCreateRoute } from '../contexts/CreateRouteContext';
import { RecordDrivingModal } from '../components/RecordDrivingModal';
import { ExerciseSelector, RouteExercise } from '../components/ExerciseSelector';
import { AdvancedExerciseCreator } from '../components/AdvancedExerciseCreator';
import * as mediaUtils from '../utils/mediaUtils';
import { AddToPresetSheet } from '../components/AddToPresetSheet';

// Helper function to extract YouTube video ID
const extractYoutubeVideoId = (url: string): string | null => {
  return mediaUtils.extractYoutubeVideoId(url);
};

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type SpotType = Database['public']['Enums']['spot_type'];
type SpotVisibility = Database['public']['Enums']['spot_visibility'];
type Category = Database['public']['Enums']['spot_category'];

const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
const SPOT_TYPES: SpotType[] = ['urban', 'rural', 'highway', 'residential'];
const VISIBILITY_OPTIONS: SpotVisibility[] = ['public', 'private', 'school_only'];
const CATEGORIES: Category[] = [
  'parking',
  'roundabout',
  'incline_start',
  'straight_driving',
  'reversing',
  'highway_entry_exit',
];

type MapPressEvent = {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
};

type Props = {
  route?: {
    params?: {
      routeId?: string;
      initialWaypoints?: Waypoint[];
      initialName?: string;
      initialDescription?: string;
      initialSearchCoordinates?: string;
      initialRoutePath?: Array<{
        latitude: number;
        longitude: number;
      }>;
      initialStartPoint?: {
        latitude: number;
        longitude: number;
      };
      initialEndPoint?: {
        latitude: number;
        longitude: number;
      };
      onClose?: () => void;
      onRouteCreated?: (routeId: string) => void;
    };
  };
  isModal?: boolean;
  hideHeader?: boolean;
};

function getTranslation(t: (key: string) => string, key: string, fallback: string): string {
  const translation = t(key);
  // If the translation is the same as the key, it means the translation is missing
  return translation === key ? fallback : translation;
}

export function CreateRouteScreen({ route, isModal, hideHeader }: Props) {
  console.log('🏗️ ==================== CREATE ROUTE SCREEN INIT ====================');
  console.log('🏗️ CreateRouteScreen initialized with props:', {
    isModal,
    hideHeader,
    hasRoute: !!route,
    hasParams: !!route?.params,
  });

  if (route?.params) {
    console.log('🏗️ Route params received:', {
      routeId: route.params.routeId,
      hasInitialWaypoints: !!route.params.initialWaypoints,
      waypointCount: route.params.initialWaypoints?.length || 0,
      initialName: route.params.initialName,
      hasInitialDescription: !!route.params.initialDescription,
      hasInitialSearchCoordinates: !!route.params.initialSearchCoordinates,
      hasInitialRoutePath: !!route.params.initialRoutePath,
      routePathLength: route.params.initialRoutePath?.length || 0,
      hasInitialStartPoint: !!route.params.initialStartPoint,
      hasInitialEndPoint: !!route.params.initialEndPoint,
      hasOnClose: !!route.params.onClose,
      hasOnRouteCreated: !!route.params.onRouteCreated,
    });

    if (route.params.initialWaypoints) {
      console.log('🏗️ Initial waypoints details:', {
        count: route.params.initialWaypoints.length,
        firstWaypoint: route.params.initialWaypoints[0],
        lastWaypoint: route.params.initialWaypoints[route.params.initialWaypoints.length - 1],
      });
    }
  }

  const { t } = useTranslation();
  const { showModal } = useModal();
  const { showRouteCreatedToast, showToast } = useToast();
  const createRouteContext = useCreateRoute();
  const routeId = route?.params?.routeId;
  const initialWaypoints = route?.params?.initialWaypoints;
  const initialName = route?.params?.initialName;
  const initialDescription = route?.params?.initialDescription;
  const initialSearchCoordinates = route?.params?.initialSearchCoordinates;
  const initialRoutePath = route?.params?.initialRoutePath;
  const initialStartPoint = route?.params?.initialStartPoint;
  const initialEndPoint = route?.params?.initialEndPoint;
  const onCloseModal = route?.params?.onClose;
  const onRouteCreated = route?.params?.onRouteCreated;
  const isEditing = !!routeId;

  console.log('🏗️ Extracted params:', {
    routeId,
    initialWaypointsCount: initialWaypoints?.length || 0,
    initialName,
    isEditing,
    hasOnCloseModal: !!onCloseModal,
    hasOnRouteCreated: !!onRouteCreated,
  });
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const searchInputRef = useRef<any>(null);
  
  // Use proper theming for search results
  const theme = useTheme();
  const textColor = theme.color?.val || '#11181C';
  const borderColor = theme.borderColor?.val || '#E5E5E5';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location.LocationGeocodedAddress[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { user } = useAuth();

  // Always call useNavigation hook (required by React)
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    console.log('🏗️ Initializing waypoints state:', {
      hasInitialWaypoints: !!initialWaypoints,
      count: initialWaypoints?.length || 0,
      waypoints: initialWaypoints,
    });
    return initialWaypoints || [];
  });
  const [region, setRegion] = useState({
    latitude: 55.7047,
    longitude: 13.191,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({});
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [activeSection, setActiveSection] = useState('basic'); // 'basic', 'exercises', 'media', 'details'
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showAdvancedExerciseCreator, setShowAdvancedExerciseCreator] = useState(false);
  const { getCurrentLocation, locationPermission, requestLocationPermission } = useLocation();
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  const HERO_HEIGHT = windowHeight * 0.6;
  const [youtubeLink, setYoutubeLink] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  // Drawing modes system - set to 'record' if coming from recorded route
  const [drawingMode, setDrawingMode] = useState<'pin' | 'waypoint' | 'pen' | 'record'>(
    initialWaypoints?.length ? 'record' : 'pin',
  );
  const [snapToRoads, setSnapToRoads] = useState(false);
  const [undoneWaypoints, setUndoneWaypoints] = useState<Waypoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penPath, setPenPath] = useState<Array<{ latitude: number; longitude: number }>>([]);

  // Drawing state refs for continuous drawing
  const drawingRef = useRef(false);
  const lastDrawPointRef = useRef<{
    latitude: number;
    longitude: number;
    timestamp?: number;
  } | null>(null);

  // Initialize search query with coordinates if provided
  useEffect(() => {
    console.log('🏗️ ==================== USE EFFECT - SEARCH COORDINATES ====================');
    console.log('🏗️ Search coordinates effect triggered:', {
      hasInitialSearchCoordinates: !!initialSearchCoordinates,
      initialSearchCoordinates,
      currentSearchQuery: searchQuery,
      shouldSet: initialSearchCoordinates && searchQuery === '',
    });

    if (initialSearchCoordinates && searchQuery === '') {
      console.log('🏗️ Setting initial search coordinates:', initialSearchCoordinates);
      setSearchQuery(initialSearchCoordinates);
      console.log('🏗️ ✅ Search coordinates set successfully');
    }
  }, [initialSearchCoordinates, searchQuery]);

  // Setup routePath for map if provided
  const [routePath, setRoutePath] = useState<Array<{ latitude: number; longitude: number }> | null>(
    initialRoutePath || null,
  );

  useEffect(() => {
    // Only try to get current location if we're creating a new route (not editing) and there are no initial waypoints
    if (!isEditing && !initialWaypoints?.length) {
      (async () => {
        try {
          if (!locationPermission) {
            await requestLocationPermission();
          }

          if (locationPermission) {
            const location = await getCurrentLocation();
            if (location) {
              const { latitude, longitude } = location.coords;

              // Update region
              setRegion({
                latitude,
                longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });

              // Only add automatic waypoint in pin mode
              if (drawingMode === 'pin') {
                // Get address from coordinates
                const [address] = await Location.reverseGeocodeAsync({
                  latitude,
                  longitude,
                });

                if (address) {
                  // Create location title
                  const title = [address.street, address.city, address.country]
                    .filter(Boolean)
                    .join(', ');

                  // Add pin for current location
                  const newWaypoint = {
                    latitude,
                    longitude,
                    title,
                    description: 'Current location',
                  };
                  setWaypoints([newWaypoint]);

                  // Update search input with location name
                  setSearchQuery(title);
                }
              }
              // Waypoint, pen, and record modes start completely empty
            }
          }
        } catch (err) {
          console.error('Error getting current location:', err);
          // Fallback to default location if there's an error
          setRegion({
            latitude: 55.7047,
            longitude: 13.191,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }
      })();
    }

    // If we have initial waypoints, set up the region based on them
    console.log('🏗️ ==================== USE EFFECT - INITIAL WAYPOINTS ====================');
    console.log('🏗️ Checking initial waypoints:', {
      hasInitialWaypoints: !!initialWaypoints?.length,
      count: initialWaypoints?.length || 0,
      waypoints: initialWaypoints,
    });

    if (initialWaypoints?.length) {
      console.log('🏗️ Setting up region from initial waypoints...');

      const latitudes = initialWaypoints.map((wp) => wp.latitude);
      const longitudes = initialWaypoints.map((wp) => wp.longitude);

      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const newRegion = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.2, 0.02),
        longitudeDelta: Math.max((maxLng - minLng) * 1.2, 0.02),
      };

      console.log('🏗️ Calculated region:', newRegion);

      // Create a region that contains all waypoints
      setRegion(newRegion);

      // Set active section to basic to allow naming the route
      setActiveSection('basic');

      console.log('🏗️ ✅ Region and active section set for recorded route');
    }
  }, [isEditing, locationPermission, initialWaypoints]);

  useEffect(() => {
    if (isEditing && routeId) {
      loadRouteData(routeId);
    }
  }, [isEditing, routeId]);

  const [formData, setFormData] = useState({
    name: initialName || '',
    description: initialDescription || '',
    difficulty: 'beginner' as DifficultyLevel,
    spot_type: 'urban' as SpotType,
    visibility: 'public' as SpotVisibility,
    best_season: 'all',
    best_times: 'anytime',
    vehicle_types: ['passenger_car'],
    activity_level: 'moderate',
    spot_subtype: 'standard',
    transmission_type: 'both',
    category: 'parking' as Category,
  });

  // Validation helpers
  const isBasicInfoComplete = formData.name.trim().length > 0;
  
  const isLocationComplete = 
    (drawingMode === 'pin' && waypoints.length > 0) ||
    (drawingMode === 'waypoint' && waypoints.length >= 2) ||
    (drawingMode === 'pen' && (penPath.length > 0 || waypoints.length > 0)) ||
    (drawingMode === 'record' && waypoints.length > 0);

  // ==================== UNSAVED CHANGES DETECTION ====================

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [initialStateSnapshot, setInitialStateSnapshot] = useState<any>(null);

  // Create initial snapshot for comparison (after all state is initialized)
  useEffect(() => {
    // Wait a bit for all state to be initialized
    setTimeout(() => {
      const snapshot = {
        formData,
        waypoints,
        exercises,
        media,
        youtubeLink,
      };
      setInitialStateSnapshot(snapshot);
    }, 1000);
  }, []); // Only run once on mount

  // Check for unsaved changes whenever state changes
  useEffect(() => {
    if (!initialStateSnapshot) return;

    const currentState = {
      formData,
      waypoints,
      exercises,
      media,
      youtubeLink,
    };

    const hasChanges = JSON.stringify(currentState) !== JSON.stringify(initialStateSnapshot);
    setHasUnsavedChanges(hasChanges);
  }, [formData, waypoints, exercises, media, youtubeLink, initialStateSnapshot]);

  // Location loading animation effect (similar to MapScreen)
  useEffect(() => {
    if (locationLoading) {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      spin.start();

      return () => {
        spin.stop();
      };
    } else {
      spinValue.setValue(0);
    }
  }, [locationLoading, spinValue]);

  // Handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (hasUnsavedChanges) {
          setShowExitConfirmation(true);
          return true; // Prevent default back behavior
        }
        return false; // Allow default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [hasUnsavedChanges]),
  );

  // Handle cancel button press
  const handleCancelPress = () => {
    console.log('🎯 [CreateRouteScreen] Cancel button pressed!', {
      hasUnsavedChanges,
      showExitConfirmation,
    });

    if (hasUnsavedChanges) {
      // Show confirmation dialog if there are unsaved changes
      console.log('🎯 [CreateRouteScreen] ✅ Showing exit confirmation due to unsaved changes');
      setShowExitConfirmation(true);
    } else {
      // No changes, close directly
      console.log('🎯 [CreateRouteScreen] ❌ No unsaved changes - closing directly');
      if (onCloseModal) {
        onCloseModal();
      } else if (navigation) {
        navigation.goBack();
      }
    }
  };

  // ==================== CONTEXT STATE INTEGRATION ====================

  // Check if we should restore state from context (coming back from recording)
  useEffect(() => {
    console.log('🔄 ==================== CHECKING FOR STATE RESTORATION ====================');

    const shouldRestore = createRouteContext.isFromRecording() && createRouteContext.persistedState;
    console.log('🔄 Should restore state:', {
      isFromRecording: createRouteContext.isFromRecording(),
      hasPersistedState: !!createRouteContext.persistedState,
      shouldRestore,
    });

    if (shouldRestore && createRouteContext.persistedState) {
      const restoredState = createRouteContext.persistedState;
      console.log('🔄 Restoring state from context:', {
        waypointsCount: restoredState.waypoints.length,
        formName: restoredState.formData.name,
        drawingMode: restoredState.drawingMode,
      });

      // Restore all state
      setWaypoints(restoredState.waypoints);
      setFormData(restoredState.formData);
      setExercises(restoredState.exercises);
      setMedia(restoredState.media);
      setDrawingMode(restoredState.drawingMode);
      setSnapToRoads(restoredState.snapToRoads);
      setPenPath(restoredState.penPath);
      setRoutePath(restoredState.routePath);
      setRegion(restoredState.region);
      setActiveSection(restoredState.activeSection);
      setSearchQuery(restoredState.searchQuery);
      setYoutubeLink(restoredState.youtubeLink);

      // Clear the recording flag after restoration
      createRouteContext.clearRecordingFlag();

      console.log('🔄 ✅ State restoration completed');
    }
  }, []); // Run only once on mount

  // Save state to context when user starts recording
  const saveCurrentStateToContext = () => {
    console.log('🔄 Saving current state to context before recording');

    const currentState = {
      formData,
      waypoints,
      exercises,
      media,
      drawingMode,
      snapToRoads,
      penPath,
      routePath,
      region,
      activeSection,
      searchQuery,
      youtubeLink,
      isFromRecording: false,
      originalRouteId: routeId,
    };

    createRouteContext.saveState(currentState);
    console.log('🔄 ✅ State saved to context');
  };

  // ==================== DRAFT FUNCTIONALITY ====================

  const saveAsDraft = async () => {
    try {
      console.log('💾 Saving route as draft...');

      if (!user?.id) {
        Alert.alert('Error', 'You must be logged in to save drafts');
        return;
      }

      // Create draft data
      const draftData = {
        user_id: user.id,
        draft_name: formData.name || `Draft - ${new Date().toLocaleDateString()}`,
        form_data: formData,
        waypoints,
        exercises,
        media,
        drawing_mode: drawingMode,
        snap_to_roads: snapToRoads,
        pen_path: penPath,
        route_path: routePath,
        region,
        active_section: activeSection,
        search_query: searchQuery,
        youtube_link: youtubeLink,
        created_at: new Date().toISOString(),
      };

      // Save to Supabase drafts table (you'll need to create this table)
      const { error } = await supabase.from('route_drafts').insert([draftData]);

      if (error) throw error;

      console.log('💾 ✅ Draft saved successfully');
      Alert.alert('Success', 'Route saved as draft! You can continue editing it later.');

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      setShowExitConfirmation(false);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('💾 ❌ Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    }
  };

  const handleExitWithoutSaving = () => {
    console.log('🚪 Exiting without saving changes');
    setHasUnsavedChanges(false);
    setShowExitConfirmation(false);
    navigation.goBack();
  };

  const handleContinueEditing = () => {
    setShowExitConfirmation(false);
  };

  // Enhanced map press handler with drawing modes
  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    if (drawingMode === 'pin') {
      // Pin mode: Replace existing pin with new one
      handlePinMode(latitude, longitude);
    } else if (drawingMode === 'waypoint') {
      // Waypoint mode: Add new waypoint to sequence
      handleWaypointMode(latitude, longitude);
    } else if (drawingMode === 'pen') {
      // Pen mode: Add to continuous path
      handlePenMode(latitude, longitude);
    }
    // Record mode is handled by RecordDrivingSheet
  };

  const handlePinMode = async (latitude: number, longitude: number) => {
    console.log(`Pin mode: Dropping pin at ${latitude}, ${longitude}`);

    // Create basic title with coordinates
    const basicTitle = `Pin (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

    // Create waypoint immediately to prevent crashes
    const newWaypoint: Waypoint = {
      latitude,
      longitude,
      title: basicTitle,
      description: 'Pin location',
    };

    // Set waypoint first
    setWaypoints([newWaypoint]);
    setSearchQuery(basicTitle);
    console.log('Pin waypoint set successfully');

    // Try to get address in background with rate limiting protection
    try {
      // Add delay to prevent rate limiting
      setTimeout(async () => {
        try {
          const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (address) {
            const title = [address.street, address.city, address.country]
              .filter(Boolean)
              .join(', ');

            // Update with real address
            setWaypoints([
              {
                latitude,
                longitude,
                title,
                description: 'Pin location',
              },
            ]);
            setSearchQuery(title);
            console.log(`Pin address resolved: ${title}`);
          }
        } catch (err) {
          console.log('Address lookup failed, keeping coordinate title');
        }
      }, 1000); // 1 second delay to prevent rate limiting
    } catch (err) {
      console.error('Error setting up address lookup:', err);
    }

    // Don't move the map in pin mode - just drop the pin where user tapped
  };

  const handleWaypointMode = async (latitude: number, longitude: number) => {
    try {
      console.log(`Waypoint mode: Adding waypoint at ${latitude}, ${longitude}`);

      // Create basic title with waypoint number and coordinates
      const waypointNumber = waypoints.length + 1;
      const basicTitle = `Waypoint ${waypointNumber} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

      const newWaypoint: Waypoint = {
        latitude,
        longitude,
        title: basicTitle,
        description: 'Route waypoint',
      };

      // Add to waypoint sequence immediately
      console.log('About to add waypoint to state...');
      setWaypoints((prev) => {
        console.log('Previous waypoints:', prev.length);
        const newList = [...prev, newWaypoint];
        console.log('New waypoints list:', newList.length);
        return newList;
      });
      setUndoneWaypoints([]);
      setSearchQuery(basicTitle);
      console.log(`Waypoint ${waypointNumber} added successfully`);
      console.log(`Current waypoints after adding: ${waypoints.length + 1}`);

      // Performance protection for Expo Go
      if (waypointNumber > 5) {
        console.warn(`Performance: ${waypointNumber} waypoints may cause crashes in Expo Go`);
        if (waypointNumber > 8) {
          Alert.alert(
            'Too Many Waypoints',
            'Maximum 8 waypoints allowed in development mode. Please use fewer waypoints or test on device.',
            [{ text: 'OK' }],
          );
          return; // Stop adding more waypoints
        }
      }

      // Try to get address in background with rate limiting protection
      try {
        // Add delay to prevent rate limiting
        setTimeout(
          async () => {
            try {
              const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (address) {
                const addressTitle = [address.street, address.city, address.country]
                  .filter(Boolean)
                  .join(', ');

                // Update the specific waypoint with real address
                setWaypoints((prev) =>
                  prev.map((wp, index) =>
                    index === prev.length - 1 ? { ...wp, title: addressTitle } : wp,
                  ),
                );
                console.log(`Waypoint ${waypointNumber} address resolved: ${addressTitle}`);
              }
            } catch (err) {
              console.log(
                `Address lookup failed for waypoint ${waypointNumber}, keeping coordinate title`,
              );
            }
          },
          Math.min(500 * waypointNumber, 5000),
        ); // Staggered delays to prevent rate limiting, max 5s
      } catch (err) {
        console.error('Error setting up address lookup:', err);
      }

      // Don't move the map in waypoint mode - just drop the waypoint where user tapped
    } catch (error) {
      console.error('Error in handleWaypointMode:', error);
      // Still try to add the waypoint even if address lookup fails
      const waypointNumber = waypoints.length + 1;
      const basicTitle = `Waypoint ${waypointNumber} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

      setWaypoints((prev) => [
        ...prev,
        {
          latitude,
          longitude,
          title: basicTitle,
          description: 'Route waypoint',
        },
      ]);
    }
  };

  const handlePenMode = (latitude: number, longitude: number) => {
    console.log(
      `Pen mode: ${isDrawing ? 'Adding to' : 'Starting'} pen path at ${latitude}, ${longitude}`,
    );

    if (isDrawing) {
      // Add to pen path for continuous drawing
      const newPath = [...penPath, { latitude, longitude }];
      setPenPath(newPath);
      console.log(`Drawing: ${newPath.length} points`);
    } else {
      // Start new pen drawing
      setIsDrawing(true);
      const newPath = [{ latitude, longitude }];
      setPenPath(newPath);
      console.log(`Started drawing at: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  };

  // Convert screen coordinates to map coordinates for continuous drawing
  const convertScreenToMapCoords = (screenX: number, screenY: number, mapRef: any) => {
    // This is a simplified conversion - in reality you'd need the map's current bounds
    // For now, we'll use the tap-based approach but this sets up for future enhancement
    return null;
  };

  // Continuous drawing functions
  const startContinuousDrawing = (latitude: number, longitude: number) => {
    console.log(
      `🎨 STARTING CONTINUOUS DRAWING at: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    );

    // Clear any existing drawing first
    if (penPath.length === 0) {
      drawingRef.current = true;
      setIsDrawing(true);

      const initialPath = [{ latitude, longitude }];
      setPenPath(initialPath);
      lastDrawPointRef.current = { latitude, longitude, timestamp: Date.now() };
      console.log(`🎨 Initial pen path set with 1 point at:`, initialPath[0]);
    } else {
      // Continue existing drawing
      drawingRef.current = true;
      const newPoint = { latitude, longitude };
      setPenPath((prev) => [...prev, newPoint]);
      lastDrawPointRef.current = { latitude, longitude, timestamp: Date.now() };
      console.log(`🎨 Continuing drawing, added point:`, newPoint);
    }
  };

  const addContinuousDrawingPoint = (latitude: number, longitude: number) => {
    if (!drawingRef.current) {
      console.log(`🎨 NOT ADDING POINT - drawingRef.current is false`);
      return;
    }

    // Add distance filtering to avoid too many points but keep drawing smooth
    const lastPoint = lastDrawPointRef.current;
    if (lastPoint) {
      const distance = Math.sqrt(
        Math.pow(latitude - lastPoint.latitude, 2) + Math.pow(longitude - lastPoint.longitude, 2),
      );

      // Reduced threshold for smoother drawing (was 0.00001, now 0.000005)
      if (distance < 0.000005) {
        console.log(`🎨 NOT ADDING POINT - too close to last point (${distance})`);
        return;
      }
    }

    console.log(`🎨 ADDING DRAWING POINT: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setPenPath((prev) => {
      const newPath = [...prev, { latitude, longitude }];
      console.log(`🎨 New pen path length: ${newPath.length}`);
      return newPath;
    });
    lastDrawPointRef.current = { latitude, longitude };
  };

  const stopContinuousDrawing = () => {
    console.log(`Stopping continuous drawing. Total points: ${penPath.length}`);
    drawingRef.current = false;
    // Keep isDrawing true so user can continue or finish
  };

  const handleMapPressWrapper = (event?: any) => {
    // Handle map press for drawing modes
    console.log('Map press event:', event);
    if (event && event.nativeEvent && event.nativeEvent.coordinate) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      console.log(`Map pressed at: ${latitude}, ${longitude} - Mode: ${drawingMode}`);
      console.log(`Current waypoints before press:`, waypoints.length, waypoints);

      // For pen mode, handle continuous drawing
      if (drawingMode === 'pen') {
        console.log(`🎨 PEN MODE TAP - isDrawing: ${isDrawing}, penPath length: ${penPath.length}`);
        if (!isDrawing) {
          // Start drawing on first tap
          console.log(`🎨 FIRST TAP - Starting drawing`);
          startContinuousDrawing(latitude, longitude);
        } else {
          // Add point if already drawing
          console.log(`🎨 ADDITIONAL TAP - Adding point to existing drawing`);
          addContinuousDrawingPoint(latitude, longitude);
        }
      } else {
        // Handle other modes normally
        handleMapPress(event);
      }

      // Log waypoints after press (with slight delay to see state update)
      setTimeout(() => {
        console.log(`Waypoints after press:`, waypoints.length, waypoints);
      }, 100);
    }
  };

  // Map ref for coordinate conversion
  const mapRef = useRef<any>(null);
  const containerRef = useRef<any>(null);

  // Create PanResponder for continuous drawing with improved coordinate handling
  const drawingPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only capture in pen mode with single touch
      return drawingMode === 'pen' && evt.nativeEvent.touches.length === 1;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Capture pen drawing movement
      if (drawingMode === 'pen' && evt.nativeEvent.touches.length === 1) {
        // Only capture if user has moved enough (avoid accidental captures)
        const hasMovedEnough = Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
        return hasMovedEnough;
      }
      return false;
    },
    onPanResponderTerminationRequest: () => {
      // Don't allow termination during active pen drawing
      return !(drawingMode === 'pen' && drawingRef.current);
    },
    onShouldBlockNativeResponder: () => {
      // Block native responder in pen mode to prevent map interference
      return drawingMode === 'pen';
    },
    onPanResponderGrant: (evt, gestureState) => {
      if (drawingMode === 'pen' && evt.nativeEvent.touches.length === 1) {
        console.log('🎨 PEN DRAWING STARTED');
        const { locationX, locationY } = evt.nativeEvent;

        // Try coordinate conversion, fallback to approximate method
        if (mapRef.current && mapRef.current.coordinateForPoint) {
          mapRef.current
            .coordinateForPoint({ x: locationX, y: locationY })
            .then((coordinate: { latitude: number; longitude: number }) => {
              console.log('🎨 DRAG START at:', coordinate);
              startContinuousDrawing(coordinate.latitude, coordinate.longitude);
            })
            .catch((error: any) => {
              console.log('🎨 Coordinate conversion failed, using region center');
              // Fallback: Start at region center
              startContinuousDrawing(region.latitude, region.longitude);
            });
        } else {
          // If coordinate conversion not available, start at region center
          console.log('🎨 Starting at region center (no coordinate conversion)');
          startContinuousDrawing(region.latitude, region.longitude);
        }
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      if (drawingMode === 'pen' && drawingRef.current && evt.nativeEvent.touches.length === 1) {
        const { locationX, locationY } = evt.nativeEvent;

        // Throttle updates to prevent lag (reduced to 30ms for smoother drawing)
        const now = Date.now();
        if (now - (lastDrawPointRef.current?.timestamp || 0) < 30) {
          return;
        }

        if (mapRef.current && mapRef.current.coordinateForPoint) {
          mapRef.current
            .coordinateForPoint({ x: locationX, y: locationY })
            .then((coordinate: { latitude: number; longitude: number }) => {
              console.log('🎨 DRAG MOVE to:', coordinate);
              addContinuousDrawingPoint(coordinate.latitude, coordinate.longitude);
              lastDrawPointRef.current = { ...coordinate, timestamp: now };
            })
            .catch((error: any) => {
              // If coordinate conversion fails, approximate based on gesture
              const lastPoint = lastDrawPointRef.current;
              if (lastPoint) {
                // Simple approximation based on gesture movement
                const deltaLat = gestureState.dy * 0.0001; // Rough conversion
                const deltaLng = gestureState.dx * 0.0001;
                const newCoordinate = {
                  latitude: lastPoint.latitude + deltaLat,
                  longitude: lastPoint.longitude + deltaLng,
                };
                console.log('🎨 APPROXIMATED MOVE to:', newCoordinate);
                addContinuousDrawingPoint(newCoordinate.latitude, newCoordinate.longitude);
                lastDrawPointRef.current = { ...newCoordinate, timestamp: now };
              }
            });
        }
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (drawingMode === 'pen') {
        console.log('🎨 PEN DRAWING PAUSED - Can continue or finish');
        drawingRef.current = false;
        // Keep isDrawing true so user can continue drawing
      }
    },
  });

  const handleLocateMe = async () => {
    try {
      setLocationLoading(true);
      let location;
      try {
        location = await Location.getCurrentPositionAsync({});
      } catch (locationError) {
        console.log('📍 Location failed, using Lund, Sweden fallback');
        // Fallback location for simulator - Lund, Sweden (same as ProfileScreen)
        location = {
          coords: {
            latitude: 55.7047,
            longitude: 13.191,
          },
        };
      }

      const { latitude, longitude } = location.coords;

      // Update region
      setRegion((prev) => ({
        ...prev,
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }));

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      // Create location title
      const title =
        [address?.street, address?.city, address?.country].filter(Boolean).join(', ') ||
        t('createRoute.locateMe');

      // Add waypoint based on current drawing mode
      if (drawingMode === 'pin') {
        setWaypoints([{ latitude, longitude, title, description: t('createRoute.locateMe') }]);
        // Update search input with location name
        setSearchQuery(title);
      }
      // In waypoint/pen/record modes, just center the map without adding waypoints
      // This allows waypoint mode to start completely empty

      // Clear keyboard focus
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert(t('common.error'), t('createRoute.locationPermissionMsg'));
    } finally {
      setLocationLoading(false);
    }
  };

  // Undo/Redo system
  const handleUndo = () => {
    if (waypoints.length > 0) {
      const lastWaypoint = waypoints[waypoints.length - 1];
      setUndoneWaypoints([lastWaypoint, ...undoneWaypoints]);
      setWaypoints(waypoints.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (undoneWaypoints.length > 0) {
      const lastUndone = undoneWaypoints[0];
      setWaypoints([...waypoints, lastUndone]);
      setUndoneWaypoints(undoneWaypoints.slice(1));
    }
  };

  // Finish pen drawing
  const finishPenDrawing = () => {
    if (penPath.length > 0) {
      // Convert pen path to waypoints with proper start/end labeling
      const newWaypoints = penPath.map((point, index) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        title:
          index === 0
            ? 'Drawing Start'
            : index === penPath.length - 1
              ? 'Drawing End'
              : `Drawing Point ${index + 1}`,
        description:
          index === 0
            ? 'Start of drawn route'
            : index === penPath.length - 1
              ? 'End of drawn route'
              : 'Drawing waypoint',
      }));

      setWaypoints((prev) => [...prev, ...newWaypoints]);
      // DON'T clear penPath - keep it for saving to metadata
      // setPenPath([]);
      setIsDrawing(false);
      drawingRef.current = false;
      lastDrawPointRef.current = null;
      console.log(`✅ Finished pen drawing: ${newWaypoints.length} connected waypoints created`);
      console.log(`🎨 Keeping ${penPath.length} pen coordinates for saving to metadata`);
    }
  };

  // Handle record button click
  const handleRecordRoute = () => {
    try {
      // Save current state before starting recording
      saveCurrentStateToContext();

      // Mark that recording was started from CreateRoute
      createRouteContext.setRecordingContext(routeId);

      showModal(<RecordDrivingModal />);
    } catch (error) {
      console.error('Error opening record modal:', error);
      Alert.alert('Error', 'Failed to open recording screen');
    }
  };

  // Clear all waypoints and pen drawing
  const clearAllWaypoints = () => {
    setUndoneWaypoints([]);
    setWaypoints([]);
    setPenPath([]); // Clear pen path when explicitly clearing all
    setIsDrawing(false);
    drawingRef.current = false;
    lastDrawPointRef.current = null;
    console.log('🎨 Cleared all waypoints and pen drawing');
  };

  const handleAddExercise = () => {
    if (!newExercise.title) return;

    setExercises([
      ...exercises,
      {
        id: Date.now().toString(),
        title: newExercise.title,
        description: newExercise.description || '',
        duration: newExercise.duration,
        repetitions: newExercise.repetitions,
        source: 'custom',
        // Set defaults for user-generated content
        is_user_generated: true,
        visibility: 'private', // Default to private
        category: 'user-created',
        difficulty_level: 'beginner',
        vehicle_type: 'both',
        creator_id: user?.id,
        created_at: new Date().toISOString(),
        promotion_status: 'none',
        quality_score: 0,
        rating: 0,
        rating_count: 0,
        completion_count: 0,
        report_count: 0,
        // Add quiz support for simple exercises
        has_quiz: false,
        quiz_data: null,
      },
    ]);
    setNewExercise({});
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const [editingExercise, setEditingExercise] = useState<any>(null);

  const handleEditExercise = (exercise: any) => {
    // For custom exercises, we can edit them using the AdvancedExerciseCreator
    console.log('📝 [CreateRoute] Editing custom exercise:', {
      id: exercise.id,
      title: exercise.title,
      has_quiz: exercise.has_quiz,
      quiz_data: exercise.quiz_data,
    });

    // Set up the form data for editing
    if (exercise.source === 'custom') {
      // Remove the exercise from the list temporarily
      handleRemoveExercise(exercise.id);

      // Set the exercise data for editing and open the creator
      setEditingExercise(exercise);
      setShowAdvancedExerciseCreator(true);
    }
  };

  // Handle exercise selector changes
  const handleExercisesChange = (updatedExercises: RouteExercise[]) => {
    // Convert RouteExercise[] to Exercise[] for compatibility
    const convertedExercises: Exercise[] = updatedExercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      description: ex.description,
      duration: ex.duration,
      repetitions: ex.repetitions,
      learning_path_exercise_id: ex.learning_path_exercise_id,
      learning_path_id: ex.learning_path_id,
      learning_path_title: ex.learning_path_title,
      youtube_url: ex.youtube_url,
      icon: ex.icon,
      image: ex.image,
      embed_code: ex.embed_code,
      has_quiz: ex.has_quiz,
      quiz_required: ex.quiz_required,
      isRepeat: ex.isRepeat,
      originalId: ex.originalId,
      repeatNumber: ex.repeatNumber,
      source: ex.source,
    }));

    setExercises(convertedExercises);
  };

  // Handle exercises created from AdvancedExerciseCreator
  const handleAdvancedExerciseCreated = (exercise: any) => {
    const isEditing = !!editingExercise;

    console.log('🔧 [CreateRoute] Advanced exercise created/updated:', {
      isEditing,
      originalId: editingExercise?.id,
      has_quiz: exercise.has_quiz,
      quiz_data: !!exercise.quiz_data,
      quiz_data_type: typeof exercise.quiz_data,
      quiz_questions_count: exercise.quiz_data?.questions?.length || 0,
    });

    const newExercise: Exercise = {
      id: isEditing ? editingExercise.id : Date.now().toString(), // Preserve ID when editing
      title: typeof exercise.title === 'string' ? exercise.title : exercise.title.en,
      description:
        typeof exercise.description === 'string'
          ? exercise.description
          : exercise.description?.en || '',
      duration: exercise.duration,
      repetitions: exercise.repetitions,
      source: 'custom',
      is_user_generated: true,
      visibility: exercise.visibility || 'private',
      category: exercise.category || 'user-created',
      difficulty_level: exercise.difficulty_level || 'beginner',
      vehicle_type: exercise.vehicle_type || 'both',
      creator_id: user?.id,
      created_at: isEditing ? editingExercise.created_at : new Date().toISOString(), // Preserve created_at when editing
      promotion_status: 'none',
      quality_score: 0,
      rating: 0,
      rating_count: 0,
      completion_count: 0,
      report_count: 0,
      youtube_url: exercise.youtube_url,
      embed_code: exercise.embed_code,
      has_quiz: exercise.has_quiz,
      quiz_required: exercise.quiz_required,
      quiz_data: exercise.quiz_data,
      // Preserve any additional fields from the original exercise when editing
      ...(isEditing
        ? {
            repeat_count: exercise.repeat_count || editingExercise.repeat_count,
            tags: exercise.tags || editingExercise.tags || [],
            is_locked: exercise.is_locked || editingExercise.is_locked,
            lock_password: exercise.lock_password || editingExercise.lock_password,
          }
        : {}),
    };

    console.log(`✅ [CreateRoute] ${isEditing ? 'Updated' : 'Adding'} exercise to list:`, {
      id: newExercise.id,
      title: newExercise.title,
      has_quiz: newExercise.has_quiz,
      quiz_data: !!newExercise.quiz_data,
      quiz_data_preview: newExercise.quiz_data
        ? JSON.stringify(newExercise.quiz_data).substring(0, 100) + '...'
        : null,
    });

    setExercises((prev) => [...prev, newExercise]);
    setShowAdvancedExerciseCreator(false);
    setEditingExercise(null); // Clear editing state
  };

  const pickMedia = async (useCamera = false) => {
    try {
      setLoadingMedia(true);
      let newMediaItems: mediaUtils.MediaItem[] | null = null;

      if (useCamera) {
        // Take a photo with the camera
        const newMedia = await mediaUtils.takePhoto();
        if (newMedia) {
          newMediaItems = [newMedia];
        }
      } else {
        // Pick media from library
        newMediaItems = await mediaUtils.pickMediaFromLibrary(true);
      }

      if (newMediaItems && newMediaItems.length > 0) {
        setMedia([...media, ...newMediaItems]);
      }
    } catch (err) {
      console.error('Error picking media:', err);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    } finally {
      setLoadingMedia(false);
    }
  };

  const takePhoto = async () => {
    try {
      setLoadingMedia(true);
      const newMedia = await mediaUtils.takePhoto();
      if (newMedia) {
        setMedia([...media, newMedia]);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert(t('common.error'), 'Error taking photo');
    } finally {
      setLoadingMedia(false);
    }
  };

  const uploadPhoto = async () => {
    try {
      const newMedia = await mediaUtils.pickMediaFromLibrary(false); // Single photo selection
      if (newMedia && newMedia.length > 0) {
        setMedia([...media, ...newMedia]);
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    }
  };

  const recordVideo = async () => {
    try {
      setLoadingMedia(true);
      const newMedia = await mediaUtils.recordVideo();
      if (newMedia) {
        setMedia([...media, newMedia]);
      }
    } catch (err) {
      console.error('Error recording video:', err);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    } finally {
      setLoadingMedia(false);
    }
  };

  const uploadVideo = async () => {
    try {
      const newMedia = await mediaUtils.pickVideoFromLibrary(false); // Single video selection
      if (newMedia && newMedia.length > 0) {
        setMedia([...media, ...newMedia]);
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      Alert.alert('Error', 'Failed to upload video. Please try again.');
    }
  };

  const addYoutubeLink = () => {
    const newMedia = mediaUtils.createYoutubeMediaItem(youtubeLink);
    if (!newMedia) {
      Alert.alert(t('common.error'), t('createRoute.invalidYoutubeLink'));
      return;
    }
    setMedia([...media, newMedia]);
    setYoutubeLink(''); // Clear the input after adding
  };

  const handleAddMedia = (newMedia: Pick<MediaItem, 'type' | 'uri'>) => {
    const newMediaItem: MediaItem = {
      id: Date.now().toString(),
      type: newMedia.type,
      uri: newMedia.uri,
      fileName: newMedia.uri.split('/').pop() || 'unknown',
    };
    // Keep existing media and add new one
    setMedia((prev) => [...prev, newMediaItem]);
  };

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMediaInBackground = async (media: mediaUtils.MediaItem[], routeId: string) => {
    try {
      // Only upload new media items (ones that don't start with http)
      const newMediaItems = media.filter((m) => !m.uri.startsWith('http'));
      const uploadResults: { type: mediaUtils.MediaType; url: string; description?: string }[] = [];

      for (const item of newMediaItems) {
        try {
          const publicUrl = await mediaUtils.uploadMediaToSupabase(
            item,
            'media',
            `routes/${routeId}`,
          );

          if (publicUrl) {
            uploadResults.push({
              type: item.type,
              url: publicUrl,
              description: item.description || '',
            });
          }
        } catch (itemError) {
          console.error('Error uploading media item:', itemError);
          // Continue with other items even if one fails
        }
      }

      if (uploadResults.length > 0) {
        // Get current media_attachments
        const { data: currentRoute } = await supabase
          .from('routes')
          .select('media_attachments')
          .eq('id', routeId)
          .single();

        const currentAttachments = (currentRoute?.media_attachments || []) as mediaUtils.MediaUrl[];

        // Add new media to the array
        const updatedAttachments = [...currentAttachments, ...uploadResults];

        // Update the route with the new media array
        const { error: updateError } = await supabase
          .from('routes')
          .update({ media_attachments: updatedAttachments })
          .eq('id', routeId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error in media upload process:', error);
      // Don't throw here, just log the error to prevent app crashes
    }
  };

  // Handle collection selection
  const handleSelectCollection = () => {
    setShowCollectionSelector(true);
  };

  const handleCollectionSelected = (collectionId: string, collectionName: string) => {
    setSelectedCollectionId(collectionId);
    setShowCollectionSelector(false);
    // Show success message
    Alert.alert(
      getTranslation(t, 'createRoute.collectionSelected', 'Collection Selected'),
      getTranslation(
        t,
        'createRoute.routeWillBeSavedTo',
        'Route will be saved to "{collectionName}"',
      ).replace('{collectionName}', collectionName),
      [{ text: getTranslation(t, 'common.ok', 'OK') }],
    );
  };

  const handleCreate = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to create a route');
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a route name');
      return;
    }

    // Validate waypoints based on drawing mode
    if (drawingMode === 'pin' && waypoints.length === 0) {
      Alert.alert('Error', 'Please drop a pin on the map');
      return;
    }

    if (drawingMode === 'waypoint' && waypoints.length < 2) {
      Alert.alert('Error', 'Waypoint mode requires at least 2 waypoints');
      return;
    }

    if (drawingMode === 'pen') {
      if (penPath.length === 0 && waypoints.length === 0) {
        Alert.alert('Error', 'Please draw a route on the map');
        return;
      } else if (penPath.length > 0 && waypoints.length === 0) {
        // User drew something but didn't finish - show helpful message
        Alert.alert(
          'Finish Your Drawing',
          'Please tap the "Finish" button to complete your pen drawing before saving.',
          [{ text: 'OK' }],
        );
        return;
      } else if (penPath.length > 0 && waypoints.length > 0) {
        // Valid: User has drawn and finished - both pen coordinates and waypoints exist
        console.log(
          `🎨 Valid pen drawing: ${penPath.length} coordinates, ${waypoints.length} waypoints`,
        );
      }
    }

    // For record mode, we should have waypoints from recording
    if (drawingMode === 'record' && waypoints.length === 0) {
      Alert.alert('Error', 'No recorded waypoints found. Please record a route first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const waypointDetails = waypoints.map((wp, index) => ({
        lat: wp.latitude,
        lng: wp.longitude,
        title: wp.title || `Waypoint ${index + 1}`,
        description: wp.description || '',
      }));

      // Sanitize spot_type to ensure it matches database enum
      const validSpotTypes = ['urban', 'rural', 'highway', 'residential'];
      const sanitizedSpotType = validSpotTypes.includes(formData.spot_type)
        ? formData.spot_type
        : 'urban';

      // Ensure waypoint data is valid
      const validWaypoints = waypointDetails.filter(
        (wp) =>
          wp.lat &&
          wp.lng &&
          !isNaN(wp.lat) &&
          !isNaN(wp.lng) &&
          wp.lat >= -90 &&
          wp.lat <= 90 &&
          wp.lng >= -180 &&
          wp.lng <= 180,
      );

      // When editing, preserve existing media
      let mediaToUpdate: mediaUtils.MediaUrl[] = [];
      if (isEditing && routeId) {
        // Get existing media from the route
        const { data: existingRoute } = await supabase
          .from('routes')
          .select('media_attachments')
          .eq('id', routeId)
          .single();

        const existingMedia = (existingRoute?.media_attachments || []) as mediaUtils.MediaUrl[];

        // Keep existing media that hasn't been removed
        const existingMediaUrls = existingMedia.map((m) => m.url);
        const currentMediaUrls = media.map((m) => m.uri);

        mediaToUpdate = [
          // Keep existing media that hasn't been removed
          ...existingMedia.filter((m) => currentMediaUrls.includes(m.url)),
          // Add new media (ones that don't exist in existingMediaUrls)
          ...media
            .filter((m) => !existingMediaUrls.includes(m.uri) && !m.uri.startsWith('http'))
            .map((item) => ({
              type: item.type as 'image' | 'video' | 'youtube',
              url: item.uri,
              description: item.description,
            })),
        ];
      } else {
        // For new routes, use all media
        mediaToUpdate = media.map((item) => ({
          type: item.type as 'image' | 'video' | 'youtube',
          url: item.uri,
          description: item.description,
        }));
      }

      // Prepare route data based on drawing mode
      let finalWaypoints: typeof validWaypoints;
      let finalWaypointDetails: typeof validWaypoints;
      let finalMetadata: any;
      let finalDrawingMode: string;

      if (drawingMode === 'pen' && penPath.length > 0) {
        // PEN MODE: Save in web-compatible format
        console.log('🎨 [SAVE] Using WEB-COMPATIBLE PEN FORMAT');

        // Convert pen coordinates to web format (lat/lng objects)
        const penWaypoints = penPath.map((coord, index) => ({
          lat: coord.latitude,
          lng: coord.longitude,
          title: `Waypoint ${index + 1}`,
          description: '',
        }));

        finalWaypoints = penWaypoints;
        finalWaypointDetails = penWaypoints;
        finalDrawingMode = 'pen'; // Save as 'pen' like web does
        finalMetadata = {
          // Keep basic metadata but don't duplicate coordinates
          pins: [],
          options: {
            reverse: false,
            closeLoop: false,
            doubleBack: false,
          },
        };

        console.log('🎨 [SAVE] Web-compatible format:', {
          waypointsCount: finalWaypoints.length,
          drawingMode: finalDrawingMode,
          firstCoordinate: finalWaypoints[0],
          lastCoordinate: finalWaypoints[finalWaypoints.length - 1],
        });
      } else {
        // OTHER MODES: Use existing logic
        finalWaypoints = validWaypoints;
        finalWaypointDetails = validWaypoints;
        finalDrawingMode = 'waypoint'; // Map all other modes to 'waypoint' for database compatibility
        finalMetadata = {
          waypoints: validWaypoints,
          pins: [],
          options: {
            reverse: false,
            closeLoop: false,
            doubleBack: false,
          },
          // Only add coordinates to metadata for non-pen modes if needed
          actualDrawingMode: drawingMode,
        };
      }

      const baseRouteData = {
        name: formData.name,
        description: formData.description || '',
        difficulty: formData.difficulty,
        spot_type: sanitizedSpotType,
        visibility: formData.visibility,
        best_season: formData.best_season,
        best_times: formData.best_times,
        vehicle_types: formData.vehicle_types,
        activity_level: formData.activity_level,
        spot_subtype: formData.spot_subtype,
        transmission_type: formData.transmission_type,
        category: formData.category,
        creator_id: user.id,
        updated_at: new Date().toISOString(),
        is_public: formData.visibility === 'public',
        waypoint_details: finalWaypointDetails,
        metadata: finalMetadata,
        suggested_exercises:
          exercises.length > 0
            ? JSON.stringify(
                exercises.map((ex) => ({
                  ...ex,
                  // Ensure quiz data is properly saved
                  has_quiz: ex.has_quiz || false,
                  quiz_data: ex.quiz_data || null,
                })),
              )
            : '',
        media_attachments: mediaToUpdate,
        drawing_mode: finalDrawingMode,
      };

      let route;
      if (isEditing && routeId) {
        // Update existing route
        const { data: updatedRoute, error: updateError } = await supabase
          .from('routes')
          .update(baseRouteData)
          .eq('id', routeId)
          .select()
          .single();

        if (updateError) throw updateError;
        route = updatedRoute;

        // Debug: Confirm what was saved for edit
        console.log('🎨 [SAVE] Route updated successfully!');
        console.log('🎨 [SAVE] Updated metadata:', JSON.stringify(updatedRoute.metadata, null, 2));

        // Track route edit
        await AppAnalytics.trackRouteEdit(routeId);

        // Show success message only in non-modal mode
        if (!isModal) {
          // Alert.alert(t('common.success'), t('createRoute.routeUpdated'));
        }
      } else {
        // Create new route
        console.log('Creating new route with data:', {
          name: formData.name,
          waypoints: validWaypoints.length,
          spotType: sanitizedSpotType,
          drawingMode: drawingMode,
        });

        const { data: newRoute, error: createError } = await supabase
          .from('routes')
          .insert({ ...baseRouteData, created_at: new Date().toISOString() })
          .select()
          .single();

        if (createError) {
          console.error('Database error details:', {
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint,
          });
          throw createError;
        }
        route = newRoute;

        // Debug: Confirm what was saved
        console.log('🎨 [SAVE] Route saved successfully!');
        console.log('🎨 [SAVE] Saved metadata:', JSON.stringify(newRoute.metadata, null, 2));

        // Track route creation
        await AppAnalytics.trackRouteCreate(formData.spot_type);

        // Add route to selected collection if one was selected
        if (selectedCollectionId && route?.id) {
          try {
            const { error: collectionError } = await supabase.from('map_preset_routes').insert({
              preset_id: selectedCollectionId,
              route_id: route.id,
              added_at: new Date().toISOString(),
            });

            if (collectionError) {
              console.error('Error adding route to collection:', collectionError);
              // Don't throw here, just log the error
            } else {
              console.log('✅ Route added to collection successfully');
            }
          } catch (error) {
            console.error('Error adding route to collection:', error);
            // Don't throw here, just log the error
          }
        }

        // Show success message only in non-modal mode
        if (!isModal) {
          // Alert.alert(t('common.success'), t('createRoute.routeCreated'));
        }
      }

      // Only upload new media items that aren't already in storage
      if (media.length > 0 && route?.id) {
        const newMedia = media.filter((m) => !m.uri.startsWith('http'));
        if (newMedia.length > 0) {
          try {
            await uploadMediaInBackground(newMedia, route.id);
          } catch (mediaError) {
            console.error('Media upload error:', mediaError);
            // Continue with navigation even if media upload fails
          }
        }
      }

      // Set loading to false before navigation
      setLoading(false);

      // Show toast notification BEFORE navigation (so component is still mounted)
      if (route?.id && route?.name) {
        console.log('🍞 [CreateRouteScreen] Showing toast for route:', route.id, route.name);
        showRouteCreatedToast(route.id, route.name, isEditing);
        console.log('🍞 [CreateRouteScreen] Toast call completed');
      }

      // Navigate/close AFTER showing toast (small delay for animation)
      setTimeout(() => {
        // Different navigation behavior based on whether we're in modal mode
        if (isModal && onCloseModal) {
          // If in modal mode, call the onClose callback
          onCloseModal();

          // Call onRouteCreated callback if provided
          if (onRouteCreated && route?.id) {
            onRouteCreated(route.id);
          }
        } else if (navigation) {
          // Navigate back to Home root inside tabs
          // @ts-ignore
          navigation.navigate('MainTabs', {
            screen: 'HomeTab',
            params: { screen: 'HomeScreen', params: { resetKey: Date.now() } },
          });
        }
      }, 100); // Small delay to ensure toast is rendered before navigation/close
    } catch (err) {
      console.error('Route operation error:', err);

      // Handle specific database constraint errors
      let errorMessage = 'Failed to save route. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('routes_drawing_mode_check')) {
          errorMessage = 'Invalid route drawing mode. Please try again.';
        } else if (err.message.includes('constraint')) {
          errorMessage = 'Route data validation failed. Please check your inputs and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const loadRouteData = async (id: string) => {
    try {
      const { data: routeData, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!routeData) return;

      const route = routeData as RouteData;

      setFormData({
        name: route.name || '',
        description: route.description || '',
        difficulty: route.difficulty || 'beginner',
        spot_type: route.spot_type || 'urban',
        visibility: route.visibility || 'public',
        best_season: route.best_season || 'all',
        best_times: route.best_times || 'anytime',
        vehicle_types: route.vehicle_types || ['passenger_car'],
        activity_level: route.activity_level || 'moderate',
        spot_subtype: route.spot_subtype || 'standard',
        transmission_type: route.transmission_type || 'both',
        category: route.category || 'parking',
      });

      if (route.waypoint_details) {
        const waypoints = route.waypoint_details.map((wp: any) => ({
          latitude: wp.lat,
          longitude: wp.lng,
          title: wp.title,
          description: wp.description,
        }));

        setWaypoints(waypoints);

        // Set initial region based on first waypoint
        if (waypoints.length > 0) {
          const firstWaypoint = waypoints[0];
          setRegion({
            latitude: firstWaypoint.latitude,
            longitude: firstWaypoint.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });

          // Set search query to first waypoint title
          setSearchQuery(firstWaypoint.title || '');
        }
      }

      // Load existing exercises from suggested_exercises field
      if ((route as any).suggested_exercises) {
        try {
          let loadedExercises: RouteExercise[] = [];

          if (typeof (route as any).suggested_exercises === 'string') {
            // Parse JSON string
            const cleanedString = (route as any).suggested_exercises.trim();
            if (cleanedString && cleanedString !== 'null' && cleanedString !== '') {
              loadedExercises = JSON.parse(cleanedString);
            }
          } else if (Array.isArray((route as any).suggested_exercises)) {
            // Already an array
            loadedExercises = (route as any).suggested_exercises;
          }

          console.log('📚 [CreateRoute] Loaded existing exercises:', {
            count: loadedExercises.length,
            exercises: loadedExercises.map((ex) => ({
              id: ex.id,
              title: ex.title,
              source: ex.source,
              has_quiz: ex.has_quiz,
            })),
          });

          setExercises(loadedExercises);
        } catch (parseError) {
          console.error('❌ [CreateRoute] Error parsing existing exercises:', parseError);
          setExercises([]);
        }
      } else if (route.exercises) {
        // Fallback to old field name
        setExercises(route.exercises);
      }

      if (route.media_attachments) {
        const mediaItems: MediaItem[] = route.media_attachments.map((m: any) => ({
          id: Date.now().toString() + Math.random(),
          type: m.type as 'image' | 'video' | 'youtube',
          uri: m.url,
          description: m.description,
          fileName: m.url.split('/').pop() || 'unknown',
          thumbnail:
            m.type === 'youtube'
              ? `https://img.youtube.com/vi/${extractYoutubeVideoId(m.url)}/hqdefault.jpg`
              : undefined,
        }));
        setMedia(mediaItems);
      }
    } catch (err) {
      console.error('Error loading route:', err);
      setError('Failed to load route data');
    }
  };

  const handleDelete = async () => {
    if (!routeId) return;

    Alert.alert(t('common.delete'), t('createRoute.confirmDelete'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.from('routes').delete().eq('id', routeId);

            if (error) throw error;

            // Track route deletion
            await AppAnalytics.trackRouteCreate(formData.spot_type); // Reusing existing method for deletion tracking

            // Navigate back
            if (navigation) {
              navigation.goBack();
            } else if (isModal && onCloseModal) {
              onCloseModal();
            } else {
              console.warn('No navigation or onClose callback available');
            }
          } catch (err) {
            Alert.alert(t('common.error'), 'Failed to delete route');
            setLoading(false);
          }
        },
      },
    ]);
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
            query, // Original query as fallback
          ];

          for (const term of searchTerms) {
            results = await Location.geocodeAsync(term);
            if (results.length > 0) break;
          }
        }

        if (results.length > 0) {
          const addresses = await Promise.all(
            results.map(async (result) => {
              const address = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });
              return {
                ...address[0],
                coords: {
                  latitude: result.latitude,
                  longitude: result.longitude,
                },
              };
            }),
          );

          // Filter out duplicates and null values
          const uniqueAddresses = addresses.filter(
            (addr, index, self) =>
              addr &&
              addr.coords &&
              index ===
                self.findIndex(
                  (a) =>
                    a.coords?.latitude === addr.coords?.latitude &&
                    a.coords?.longitude === addr.coords?.longitude,
                ),
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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleLocationSelect = (
    result: Location.LocationGeocodedAddress & { coords?: { latitude: number; longitude: number } },
  ) => {
    if (result.coords) {
      const { latitude, longitude } = result.coords;

      // Update region
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Create location title
      const title = [result.street, result.city, result.country].filter(Boolean).join(', ');

      // Add waypoint
      const newWaypoint = {
        latitude,
        longitude,
        title,
        description: 'Searched location',
      };
      setWaypoints((prev) => [...prev, newWaypoint]);

      // Update search UI
      setSearchQuery(title);
      setShowSearchResults(false);

      // Clear keyboard focus
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }
  };

  const handleManualCoordinates = () => {
    Alert.prompt(
      'Enter Coordinates',
      'Enter latitude and longitude separated by comma (e.g., 55.7047, 13.191)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: (text) => {
            const [lat, lng] = text?.split(',').map((n) => parseFloat(n.trim())) || [];
            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
              setRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });

              // Get address from coordinates
              Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
              })
                .then(([address]) => {
                  if (address) {
                    // Update search input with location name
                    const locationString = [
                      address.street,
                      address.city,
                      address.region,
                      address.country,
                    ]
                      .filter(Boolean)
                      .join(', ');

                    setSearchQuery(locationString);
                  } else {
                    // If no address found, show coordinates
                    setSearchQuery(`${lat}, ${lng}`);
                  }
                })
                .catch((err) => {
                  console.error('Error getting address:', err);
                  // If reverse geocoding fails, show coordinates
                  setSearchQuery(`${lat}, ${lng}`);
                });
            } else {
              Alert.alert(
                'Invalid coordinates',
                'Please enter valid latitude and longitude values',
              );
            }
          },
        },
      ],
      'plain-text',
      searchQuery,
    );
  };

  // Update region state when map region changes
  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
  };

  return (
    <Screen edges={[]} padding={false} hideStatusBar bottomInset={120}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={drawingMode !== 'pen'}
        showsVerticalScrollIndicator={drawingMode !== 'pen'}
      >
        {/* Existing Content */}
        <YStack f={1} gap={2}>
          {/* {!hideHeader && (
            <Header
              title={
                isEditing
                  ? getTranslation(t, 'createRoute.editTitle', 'Edit Route')
                  : getTranslation(t, 'createRoute.createTitle', 'Create Route')
              }
              showBack={!isModal}
              onBackPress={isModal && onCloseModal ? onCloseModal : undefined}
            />
          )} */}
          <XStack padding="$4" gap="$2" flexWrap="wrap">
            <View style={{ flex: 1, position: 'relative' }}>
              <IconButton
                icon="info"
                label={getTranslation(t, 'createRoute.routeName', 'Route Name')}
                onPress={() => setActiveSection('basic')}
                selected={activeSection === 'basic'}
                backgroundColor="transparent"
                borderColor="transparent"
                flex={1}
              />
              {!isBasicInfoComplete && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
                </View>
              )}
            </View>
            {/* Exercises tab temporarily disabled - will be re-enabled later */}
            {/* <IconButton
              icon="activity"
              label={getTranslation(t, 'createRoute.exercises', 'Exercises')}
              onPress={() => setActiveSection('exercises')}
              selected={activeSection === 'exercises'}
              backgroundColor="transparent"
              borderColor="transparent"
              flex={1}
            /> */}
            <IconButton
              icon="image"
              label={getTranslation(t, 'createRoute.media', 'Media')}
              onPress={() => setActiveSection('media')}
              selected={activeSection === 'media'}
              backgroundColor="transparent"
              borderColor="transparent"
              flex={1}
            />
            <IconButton
              icon="settings"
              label={getTranslation(t, 'common.details', 'Details')}
              onPress={() => setActiveSection('details')}
              selected={activeSection === 'details'}
              backgroundColor="transparent"
              borderColor="transparent"
              flex={1}
            />
          </XStack>

          {/* Section Content */}
          <YStack f={1} backgroundColor="$background">
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 100 }}
              scrollEnabled={drawingMode !== 'pen'}
              showsVerticalScrollIndicator={drawingMode !== 'pen'}
            >
              <YStack padding="$4" gap="$4">
                {activeSection === 'basic' && (
                  <YStack gap="$4">
                    {/* Basic Information */}
                    <YStack>
                      {/* <Text size="lg" weight="medium" mb="$2" color="$color">
                        {getTranslation(t, 'createRoute.routeName', 'Route Name')}
                      </Text> */}
                      <FormField
                        value={formData.name}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                        placeholder={getTranslation(
                          t,
                          'createRoute.routeNamePlaceholder',
                          'Enter route name',
                        )}
                        accessibilityLabel={getTranslation(
                          t,
                          'createRoute.routeName',
                          'Route Name',
                        )}
                        autoCapitalize="none"
                      />
                      
                      {/* Quick name suggestions */}
                      {waypoints.length > 0 && waypoints[0]?.title && (
                        <XStack gap="$2" marginTop="$2" flexWrap="wrap">
                          <Pressable
                            onPress={() => {
                              const locationName = waypoints[0]?.title?.split(',')[0].trim() || '';
                              setFormData((prev) => ({ ...prev, name: locationName }));
                            }}
                            style={({ pressed }) => {
                              const chipText = waypoints[0].title.split(',')[0].trim();
                              const isSelected = formData.name === chipText;
                              return {
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                                backgroundColor: (pressed || isSelected) ? '#00E6C3' : 'transparent',
                              };
                            }}
                          >
                            {({ pressed }) => {
                              const chipText = waypoints[0].title.split(',')[0].trim();
                              const isSelected = formData.name === chipText;
                              return (
                                <Text fontSize={14} color={(pressed || isSelected) ? '#000000' : '$color'}>
                                  {chipText}
                                </Text>
                              );
                            }}
                          </Pressable>
                          
                          {waypoints[0]?.title?.includes(',') && waypoints[0]?.title?.split(',')[1] && (
                            <Pressable
                              onPress={() => {
                                const cityName = waypoints[0]?.title?.split(',').slice(0, 2).join(',').trim() || '';
                                setFormData((prev) => ({ ...prev, name: cityName }));
                              }}
                              style={({ pressed }) => {
                                const chipText = waypoints[0].title.split(',').slice(0, 2).join(',').trim();
                                const isSelected = formData.name === chipText;
                                return {
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 20,
                                  borderWidth: 1,
                                  borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                                  backgroundColor: (pressed || isSelected) ? '#00E6C3' : 'transparent',
                                };
                              }}
                            >
                              {({ pressed }) => {
                                const chipText = waypoints[0].title.split(',').slice(0, 2).join(',').trim();
                                const isSelected = formData.name === chipText;
                                return (
                                  <Text fontSize={14} color={(pressed || isSelected) ? '#000000' : '$color'}>
                                    {chipText}
                                  </Text>
                                );
                              }}
                            </Pressable>
                          )}
                        </XStack>
                      )}
                      <TextArea
                        value={formData.description}
                        onChangeText={(text) =>
                          setFormData((prev) => ({ ...prev, description: text }))
                        }
                        placeholder={getTranslation(
                          t,
                          'createRoute.descriptionPlaceholder',
                          'Enter description',
                        )}
                        accessibilityLabel={getTranslation(
                          t,
                          'createRoute.description',
                          'Description',
                        )}
                        minHeight={80}
                        mt="$2"
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        borderWidth={1}
                        borderRadius={4}
                        paddingHorizontal={16}
                        paddingVertical={12}
                        fontSize={14}
                        color="$color"
                        placeholderTextColor="#9ca3af"
                        focusStyle={{
                          borderColor: '#34d399',
                          borderWidth: 2,
                          backgroundColor: '$backgroundFocus',
                        }}
                      />
                    </YStack>

                    {/* Drawing Mode Controls */}
                    <YStack gap="$4">
                      <XStack gap="$2" flexWrap="wrap">
                        <TouchableOpacity
                          onPress={() => setDrawingMode('pin')}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor:
                              drawingMode === 'pin' ? 'rgba(0, 230, 195, 0.15)' : 'transparent',
                            borderWidth: 1,
                            borderColor:
                              drawingMode === 'pin'
                                ? 'rgba(0, 230, 195, 0.5)'
                                : colorScheme === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <XStack gap="$2" alignItems="center" justifyContent="center">
                            {/* <Feather
                              name="map-pin"
                              size={16}
                              color={
                                drawingMode === 'pin'
                                  ? '#00E6C3'
                                  : colorScheme === 'dark'
                                    ? '#999'
                                    : '#666'
                              }
                            /> */}
                            <Text
                              fontWeight={drawingMode === 'pin' ? '700' : '500'}
                              color={drawingMode === 'pin' ? '$primary' : '$gray11'}
                            >
                              Pin
                            </Text>
                          </XStack>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setDrawingMode('waypoint')}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor:
                              drawingMode === 'waypoint'
                                ? 'rgba(0, 230, 195, 0.15)'
                                : 'transparent',
                            borderWidth: 1,
                            borderColor:
                              drawingMode === 'waypoint'
                                ? 'rgba(0, 230, 195, 0.5)'
                                : colorScheme === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <XStack gap="$2" alignItems="center" justifyContent="center">
                            {/* <Feather
                              name="navigation"
                              size={16}
                              color={
                                drawingMode === 'waypoint'
                                  ? '#00E6C3'
                                  : colorScheme === 'dark'
                                    ? '#999'
                                    : '#666'
                              }
                            /> */}
                            <Text
                              fontWeight={drawingMode === 'waypoint' ? '700' : '500'}
                              color={drawingMode === 'waypoint' ? '$primary' : '$gray11'}
                            >
                              Waypoints
                            </Text>
                          </XStack>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setDrawingMode('pen')}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor:
                              drawingMode === 'pen' ? 'rgba(0, 230, 195, 0.15)' : 'transparent',
                            borderWidth: 1,
                            borderColor:
                              drawingMode === 'pen'
                                ? 'rgba(0, 230, 195, 0.5)'
                                : colorScheme === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <XStack gap="$2" alignItems="center" justifyContent="center">
                            {/* <Feather
                              name="edit-3"
                              size={16}
                              color={
                                drawingMode === 'pen'
                                  ? '#00E6C3'
                                  : colorScheme === 'dark'
                                    ? '#999'
                                    : '#666'
                              }
                            /> */}
                            <Text
                              fontWeight={drawingMode === 'pen' ? '700' : '500'}
                              color={drawingMode === 'pen' ? '$primary' : '$gray11'}
                            >
                              Draw
                            </Text>
                          </XStack>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setDrawingMode('record');
                            handleRecordRoute();
                          }}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor:
                              drawingMode === 'record' ? 'rgba(0, 230, 195, 0.15)' : 'transparent',
                            borderWidth: 1,
                            borderColor:
                              drawingMode === 'record'
                                ? 'rgba(0, 230, 195, 0.5)'
                                : colorScheme === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <XStack gap="$2" alignItems="center" justifyContent="center">
                            {/* <Feather
                              name="circle"
                              size={16}
                              color={
                                drawingMode === 'record'
                                  ? '#00E6C3'
                                  : colorScheme === 'dark'
                                    ? '#999'
                                    : '#666'
                              }
                            /> */}
                            <Text
                              fontWeight={drawingMode === 'record' ? '700' : '500'}
                              color={drawingMode === 'record' ? '$primary' : '$gray11'}
                            >
                              Record
                            </Text>
                          </XStack>
                        </TouchableOpacity>
                      </XStack>

                      {/* Mode descriptions */}
                      <Text size="sm" color="$gray10">
                        {drawingMode === 'pin' && 'Drop a single location marker'}
                        {drawingMode === 'waypoint' &&
                          'Create discrete waypoints connected by lines (minimum 2 required)'}
                        {drawingMode === 'pen' &&
                          'Freehand drawing: click and drag to draw continuous lines'}
                        {drawingMode === 'record' && initialWaypoints?.length
                          ? 'Recorded route loaded • Click Record Again to start new recording'
                          : 'GPS-based live route recording with real-time stats'}
                      </Text>

                      {/* Record Again Button when in record mode with existing route */}
                      {drawingMode === 'record' && initialWaypoints?.length && (
                        <Button
                          onPress={handleRecordRoute}
                          variant="secondary"
                          backgroundColor="$green10"
                          size="lg"
                          marginTop="$2"
                        >
                          <XStack gap="$2" alignItems="center">
                            <Feather name="circle" size={20} color="white" />
                            <Text color="white" weight="bold">
                              Record Again
                            </Text>
                          </XStack>
                        </Button>
                      )}
                    </YStack>

                    {/* Route Location */}
                    <YStack gap="$4">
                      <Heading>
                        {getTranslation(
                          t,
                          'createRoute.locationCoordinates',
                          'Location Coordinates',
                        )}
                      </Heading>
                      <Text size="sm" color="$gray11">
                        {t('createRoute.searchLocation')}
                      </Text>

                      <YStack gap="$2">
                        <XStack gap="$2" alignItems="center">
                          <View style={{ flex: 1 }}>
                          <FormField
                            ref={searchInputRef}
                              variant="search"
                              rounded="full"
                              size="md"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            placeholder={t('createRoute.searchLocation')}
                            autoComplete="street-address"
                            autoCapitalize="none"
                            accessibilityLabel={t('createRoute.searchLocation')}
                            />
                          </View>
                          <TouchableOpacity
                            onPress={handleLocateMe}
                            disabled={locationLoading}
                            style={{
                              width: 48,
                              height: 48,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                              borderRadius: 24,
                              backgroundColor: 'transparent',
                            }}
                          >
                            {locationLoading ? (
                              <Animated.View
                                style={{
                                  transform: [
                                    {
                                      rotate: spinValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg'],
                                      }),
                                    },
                                  ],
                                }}
                              >
                                <Feather
                                  name="loader"
                                  size={20}
                                  color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                                />
                              </Animated.View>
                            ) : (
                              <Feather
                                name="navigation"
                                size={20}
                                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                              />
                            )}
                          </TouchableOpacity>
                        </XStack>

                        {showSearchResults && searchResults.length > 0 && (
                          <YStack
                            overflow="hidden"
                            marginBottom="$4"
                            borderTopWidth={1}
                            borderBottomWidth={1}
                            borderLeftWidth={1}
                            borderRightWidth={1}
                            borderColor={borderColor}
                            borderRadius="$2"
                          >
                            <ScrollView>
                              {searchResults.map((result, index, array) => {
                                const isLastItem = index === array.length - 1;
                                return (
                                  <TouchableOpacity
                                    key={index}
                                    onPress={() => handleLocationSelect(result)}
                                    style={{
                                      paddingVertical: 12,
                                      paddingHorizontal: 12,
                                      borderBottomWidth: isLastItem ? 0 : 1,
                                      borderBottomColor: borderColor,
                                    }}
                                  >
                                    <XStack alignItems="center" gap="$2">
                                      <YStack flex={1}>
                                        <Text numberOfLines={1} fontWeight="600" color={textColor}>
                                          {[result.street, result.city].filter(Boolean).join(', ') ||
                                            'Unknown location'}
                                        </Text>
                                        {result.country && (
                                          <Text numberOfLines={1} fontSize="$3" color="$gray10">
                                            {result.country}
                                          </Text>
                                        )}
                                      </YStack>
                                    </XStack>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </YStack>
                        )}
                      </YStack>

                      <View
                        ref={containerRef}
                        style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}
                        {...(drawingMode === 'pen' ? drawingPanResponder.panHandlers : {})}
                      >
                        <MapView
                          ref={mapRef}
                          style={{ flex: 1 }}
                          region={region}
                          onPress={handleMapPressWrapper}
                          scrollEnabled={
                            !(drawingMode === 'pen' && isDrawing && Platform.OS === 'android')
                          }
                          zoomEnabled={
                            !(drawingMode === 'pen' && isDrawing && Platform.OS === 'android')
                          }
                          pitchEnabled={!(drawingMode === 'pen' && isDrawing)}
                          rotateEnabled={!(drawingMode === 'pen' && isDrawing)}
                          moveOnMarkerPress={false}
                          showsUserLocation={true}
                          userInterfaceStyle="dark"
                          zoomTapEnabled={
                            !(drawingMode === 'pen' && isDrawing && Platform.OS === 'android')
                          }
                          scrollDuringRotateOrZoomEnabled={
                            !(drawingMode === 'pen' && isDrawing && Platform.OS === 'android')
                          }
                        >
                          {/* Render waypoints as individual markers (not in pen drawing mode) */}
                          {drawingMode !== 'pen' &&
                            waypoints.map((waypoint, index) => {
                              const isFirst = index === 0;
                              const isLast = index === waypoints.length - 1 && waypoints.length > 1;
                              const markerColor = isFirst ? 'green' : isLast ? 'red' : 'blue';

                              return (
                                <Marker
                                  key={`waypoint-${index}`}
                                  coordinate={{
                                    latitude: waypoint.latitude,
                                    longitude: waypoint.longitude,
                                  }}
                                  title={waypoint.title}
                                  description={waypoint.description}
                                  pinColor={markerColor}
                                />
                              );
                            })}

                          {/* Render pen drawing as smooth continuous line */}
                          {drawingMode === 'pen' && penPath.length > 0 && (
                            <>
                              {/* Show single point as a marker if only one point */}
                              {penPath.length === 1 && (
                                <Marker
                                  coordinate={penPath[0]}
                                  title="Drawing Start"
                                  description="Drag to continue drawing"
                                  pinColor="orange"
                                />
                              )}

                              {/* Show continuous line for multiple points */}
                              {penPath.length > 1 && (
                                <Polyline
                                  coordinates={penPath}
                                  strokeWidth={8}
                                  strokeColor="#FF6B35"
                                  lineJoin="round"
                                  lineCap="round"
                                  geodesic={false}
                                />
                              )}
                            </>
                          )}

                          {/* Orange dots removed - only showing continuous orange lines */}

                          {/* Render connecting lines for waypoints (not in pen mode) */}
                          {drawingMode === 'waypoint' && waypoints.length > 1 && (
                            <Polyline
                              coordinates={waypoints.map((wp) => ({
                                latitude: wp.latitude,
                                longitude: wp.longitude,
                              }))}
                              strokeWidth={3}
                              strokeColor="#1A73E8"
                              lineJoin="round"
                            />
                          )}

                          {/* Render route path if provided */}
                          {routePath && routePath.length > 1 && (
                            <Polyline
                              coordinates={routePath}
                              strokeWidth={drawingMode === 'record' ? 5 : 3}
                              strokeColor={drawingMode === 'record' ? '#22C55E' : '#1A73E8'}
                              lineJoin="round"
                              lineCap="round"
                            />
                          )}
                        </MapView>

                        {/* Map Controls - Top Right */}
                        <XStack position="absolute" top={16} right={16} gap="$2">
                          <Button
                            onPress={handleUndo}
                            disabled={waypoints.length === 0}
                            variant="secondary"
                            backgroundColor="rgba(0,0,0,0.7)"
                            size="sm"
                          >
                            <Feather name="corner-up-left" size={16} color="white" />
                          </Button>

                          <Button
                            onPress={handleRedo}
                            disabled={undoneWaypoints.length === 0}
                            variant="secondary"
                            backgroundColor="rgba(0,0,0,0.7)"
                            size="sm"
                          >
                            <Feather name="corner-up-right" size={16} color="white" />
                          </Button>
                        </XStack>

                        {/* Zoom Controls - Top Left */}
                        <YStack position="absolute" top={16} left={16} gap="$2">
                          <Button
                            onPress={() => {
                              setRegion((prev) => ({
                                ...prev,
                                latitudeDelta: prev.latitudeDelta * 0.5,
                                longitudeDelta: prev.longitudeDelta * 0.5,
                              }));
                            }}
                            variant="secondary"
                            backgroundColor="rgba(0,0,0,0.7)"
                            size="sm"
                          >
                            <Feather name="plus" size={16} color="white" />
                          </Button>

                          <Button
                            onPress={() => {
                              setRegion((prev) => ({
                                ...prev,
                                latitudeDelta: prev.latitudeDelta * 2,
                                longitudeDelta: prev.longitudeDelta * 2,
                              }));
                            }}
                            variant="secondary"
                            backgroundColor="rgba(0,0,0,0.7)"
                            size="sm"
                          >
                            <Feather name="minus" size={16} color="white" />
                          </Button>
                        </YStack>

                        <TouchableOpacity
                          onPress={handleLocateMe}
                          disabled={locationLoading}
                          style={{
                            position: 'absolute',
                            bottom: 16,
                            left: 16,
                            width: 48,
                            height: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                            borderRadius: 24,
                            backgroundColor:
                              colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
                          }}
                        >
                          {locationLoading ? (
                            <Animated.View
                              style={{
                                transform: [
                                  {
                                    rotate: spinValue.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: ['0deg', '360deg'],
                                    }),
                                  },
                                ],
                              }}
                            >
                              <Feather
                                name="loader"
                                size={20}
                                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                              />
                            </Animated.View>
                          ) : (
                            <Feather
                              name="navigation"
                              size={20}
                              color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                            />
                          )}
                        </TouchableOpacity>

                        {/* Drawing Mode Indicator */}
                        <View
                          style={{
                            position: 'absolute',
                            top: 16,
                            left: '50%',
                            transform: [{ translateX: -50 }],
                            backgroundColor:
                              drawingMode === 'pen' ? 'rgba(255,107,53,0.9)' : 'rgba(0,0,0,0.8)',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Feather
                            name={
                              drawingMode === 'pin'
                                ? 'map-pin'
                                : drawingMode === 'waypoint'
                                  ? 'navigation'
                                  : drawingMode === 'pen'
                                    ? 'edit-3'
                                    : 'circle'
                            }
                            size={14}
                            color="white"
                          />
                          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                            {drawingMode === 'pin' && 'Tap to drop pin'}
                            {drawingMode === 'waypoint' && 'Tap to add waypoints'}
                            {drawingMode === 'pen' &&
                              (isDrawing
                                ? `Drawing (${penPath.length} points) • Pinch to zoom • Drag to continue`
                                : waypoints.length > 0
                                  ? `Finished (${penPath.length} coordinates) • Ready to save`
                                  : 'Drag to draw • Two fingers to zoom/pan')}
                            {drawingMode === 'record' &&
                              (initialWaypoints?.length
                                ? `Recorded route (${waypoints.length} waypoints) • Tap Record Again below`
                                : 'Use Record button below')}
                          </Text>
                        </View>

                        {/* Pen Drawing Controls */}
                        {drawingMode === 'pen' && isDrawing && (
                          <Button
                            position="absolute"
                            bottom={16}
                            right={16}
                            onPress={finishPenDrawing}
                            variant="secondary"
                            backgroundColor="$green10"
                            size="md"
                            opacity={0.9}
                          >
                            <XStack gap="$2" alignItems="center">
                              <Feather name="check" size={20} color="white" />
                              <Text color="white">Finish</Text>
                            </XStack>
                          </Button>
                        )}
                      </View>

                      {/* Waypoint Management Controls */}
                      <XStack gap="$2" flexWrap="wrap">
                        <TouchableOpacity
                          onPress={handleUndo}
                          disabled={waypoints.length === 0}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor:
                              colorScheme === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(0, 0, 0, 0.1)',
                            opacity: waypoints.length === 0 ? 0.5 : 1,
                          }}
                        >
                          <XStack gap="$2" alignItems="center" justifyContent="center">
                            <Feather
                              name="corner-up-left"
                              size={18}
                              color={colorScheme === 'dark' ? '#999' : '#666'}
                            />
                            <Text color="$gray11" fontWeight="500">
                              Undo
                            </Text>
                          </XStack>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={clearAllWaypoints}
                          disabled={waypoints.length === 0 && penPath.length === 0}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor:
                              colorScheme === 'dark'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(0, 0, 0, 0.1)',
                            opacity: waypoints.length === 0 && penPath.length === 0 ? 0.5 : 1,
                          }}
                        >
                          <XStack gap="$2" alignItems="center" justifyContent="center">
                            <Feather
                              name="trash-2"
                              size={18}
                              color={colorScheme === 'dark' ? '#999' : '#666'}
                            />
                            <Text color="$gray11" fontWeight="500">
                              Clear All
                            </Text>
                          </XStack>
                        </TouchableOpacity>
                      </XStack>

                      {/* Current waypoint count and mode info */}
                      <XStack
                        justifyContent="space-between"
                        alignItems="center"
                        paddingHorizontal="$2"
                      >
                        <Text size="sm" color="$gray11">
                          {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} •{' '}
                          {drawingMode} mode
                        </Text>
                        {drawingMode === 'waypoint' && waypoints.length === 1 && (
                          <Text size="sm" color="$orange10">
                            Need 1 more waypoint minimum
                          </Text>
                        )}
                        {drawingMode === 'pen' && (
                          <Text
                            size="sm"
                            color={
                              isDrawing
                                ? '$orange10'
                                : waypoints.length > 0
                                  ? '$green10'
                                  : '$blue10'
                            }
                          >
                            {isDrawing
                              ? `Drawing (${penPath.length} points) • Drag to continue, pinch to zoom`
                              : waypoints.length > 0
                                ? `Finished (${penPath.length} coordinates → ${waypoints.length} waypoints)`
                                : `Drawing mode (${penPath.length} points drawn) • Drag to draw, two fingers to zoom`}
                          </Text>
                        )}
                        {drawingMode === 'record' && initialWaypoints?.length && (
                          <Text size="sm" color="$green10">
                            Recorded route loaded • {routePath?.length || 0} GPS points • Click
                            Record Again to start new recording
                          </Text>
                        )}
                      </XStack>

                      {/* Waypoint Management */}
                      {waypoints.length > 0 && (
                        <YStack gap="$3" marginTop="$4">
                          <Text size="lg" weight="bold">
                            Waypoints
                          </Text>
                          {waypoints.map((waypoint, index) => (
                            <Card key={index} bordered padding="$3">
                              <XStack
                                justifyContent="space-between"
                                alignItems="flex-start"
                                gap="$3"
                              >
                                <YStack flex={1} gap="$2">
                                  <XStack alignItems="center" gap="$2">
                                    <View
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor:
                                          index === 0
                                            ? '#22C55E'
                                            : index === waypoints.length - 1 && waypoints.length > 1
                                              ? '#EF4444'
                                              : '#3B82F6',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Text size="xs" color="white" weight="bold">
                                        {index + 1}
                                      </Text>
                                    </View>
                                    <Text size="sm" weight="medium" flex={1} numberOfLines={1}>
                                      {waypoint.title}
                                    </Text>
                                  </XStack>
                                  <Text size="xs" color="$gray11">
                                    Lat: {waypoint.latitude.toFixed(6)}, Lng:{' '}
                                    {waypoint.longitude.toFixed(6)}
                                  </Text>
                                  {waypoint.description && (
                                    <Text size="xs" color="$gray10">
                                      {waypoint.description}
                                    </Text>
                                  )}
                                </YStack>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onPress={() => {
                                    const newWaypoints = waypoints.filter((_, i) => i !== index);
                                    setWaypoints(newWaypoints);
                                  }}
                                  backgroundColor="$red5"
                                >
                                  <Feather name="trash-2" size={14} color="$red10" />
                                </Button>
                              </XStack>
                            </Card>
                          ))}
                        </YStack>
                      )}

                      {/* Drawing Info */}
                      {drawingMode === 'pen' && penPath.length > 0 && (
                        <YStack gap="$2" marginTop="$4">
                          <Text size="lg" weight="bold">
                            Drawing
                          </Text>
                          <Card bordered padding="$3">
                            <YStack gap="$2">
                              <XStack justifyContent="space-between" alignItems="center">
                                <Text size="sm" color="$gray11">
                                  {isDrawing
                                    ? `Drawing (${penPath.length} points) • Drag to continue, pinch to zoom/pan`
                                    : waypoints.length > 0
                                      ? `Drawing finished (${penPath.length} raw coordinates → ${waypoints.length} waypoints)`
                                      : `Drawing paused (${penPath.length} points) • Drag to continue drawing`}
                                </Text>
                                <XStack gap="$2">
                                  {isDrawing && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onPress={finishPenDrawing}
                                      backgroundColor="$green10"
                                    >
                                      <XStack gap="$1" alignItems="center">
                                        <Feather name="check" size={14} color="white" />
                                        <Text size="sm" color="white">
                                          Finish
                                        </Text>
                                      </XStack>
                                    </Button>
                                  )}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onPress={() => {
                                      setPenPath([]);
                                      setIsDrawing(false);
                                      drawingRef.current = false;
                                      lastDrawPointRef.current = null;
                                      // Also clear waypoints if they were generated from pen drawing
                                      if (
                                        waypoints.length > 0 &&
                                        waypoints[0]?.title?.includes('Drawing')
                                      ) {
                                        setWaypoints([]);
                                      }
                                    }}
                                    backgroundColor="$red5"
                                  >
                                    <Feather name="trash-2" size={14} color="$red10" />
                                  </Button>
                                </XStack>
                              </XStack>

                              {/* Show status when finished */}
                              {!isDrawing && waypoints.length > 0 && (
                                <YStack gap="$1">
                                  <Text size="xs" color="$green10">
                                    ✅ Raw drawing coordinates will be saved to metadata for
                                    accurate display
                                  </Text>
                                  <Text size="xs" color="$gray9">
                                    Metadata will contain: {penPath.length} coordinate points
                                  </Text>
                                </YStack>
                              )}
                            </YStack>
                          </Card>
                        </YStack>
                      )}
                    </YStack>

                    {/* Basic Information */}
                    <YStack>
                      <Text size="lg" weight="medium" mb="$2" color="$color">
                        {getTranslation(t, 'createRoute.routeName', 'Route Name')}
                      </Text>
                      <FormField
                        value={formData.name}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                        placeholder={getTranslation(
                          t,
                          'createRoute.routeNamePlaceholder',
                          'Enter route name',
                        )}
                        accessibilityLabel={getTranslation(
                          t,
                          'createRoute.routeName',
                          'Route Name',
                        )}
                        autoCapitalize="none"
                      />
                      <TextArea
                        value={formData.description}
                        onChangeText={(text) =>
                          setFormData((prev) => ({ ...prev, description: text }))
                        }
                        placeholder={getTranslation(
                          t,
                          'createRoute.descriptionPlaceholder',
                          'Enter description',
                        )}
                        accessibilityLabel={getTranslation(
                          t,
                          'createRoute.description',
                          'Description',
                        )}
                        numberOfLines={4}
                        mt="$2"
                        size="md"
                        backgroundColor="$backgroundHover"
                        borderColor="$borderColor"
                      />
                    </YStack>
                  </YStack>
                )}

                {activeSection === 'exercises' && (
                  <YStack gap="$4">
                    <Heading>{getTranslation(t, 'createRoute.exercises', 'Exercises')}</Heading>
                    <Text size="sm" color="$gray11">
                      Add exercises from learning paths or create custom ones
                    </Text>

                    {/* Learning Path Exercises Selector */}
                    <YStack gap="$3">
                      <Heading size="$4">From Learning Paths</Heading>
                      <Button
                        onPress={() => setShowExerciseSelector(true)}
                        variant="secondary"
                        size="lg"
                        backgroundColor="$green5"
                      >
                        <XStack gap="$2" alignItems="center">
                          <Feather name="book-open" size={18} color="$green11" />
                          <Text color="$green11" fontWeight="500">
                            Select from Learning Paths (
                            {exercises.filter((ex) => ex.source === 'learning_path').length}{' '}
                            selected)
                          </Text>
                        </XStack>
                      </Button>
                    </YStack>

                    <Separator marginVertical="$4" />

                    {/* Advanced Custom Exercise Creator */}
                    <YStack gap="$3">
                      <Heading size="$4">Create Custom Exercise</Heading>
                      <Text size="sm" color="$gray11">
                        Create rich, feature-complete exercises with multimedia support, quizzes,
                        and multilingual content
                      </Text>

                      <Button
                        onPress={() => setShowAdvancedExerciseCreator(true)}
                        variant="secondary"
                        size="lg"
                        backgroundColor="$blue5"
                        marginTop="$2"
                      >
                        <XStack gap="$2" alignItems="center">
                          <Feather name="plus-circle" size={20} color="$blue11" />
                          <Text color="$blue11" fontWeight="500">
                            Create Advanced Exercise
                          </Text>
                        </XStack>
                      </Button>

                      <YStack gap="$2" marginTop="$2">
                        <Text size="sm" color="$green11" fontWeight="500">
                          🎯 Features Available:
                        </Text>
                        <Text size="xs" color="$gray11">
                          ✅ Photos, Videos & YouTube integration • ✅ Interactive quizzes & embeds
                        </Text>
                        <Text size="xs" color="$gray11">
                          ✅ Public/Private visibility • ✅ Categories & difficulty levels
                        </Text>
                        <Text size="xs" color="$gray11">
                          ✅ Multilingual support (EN/SV) • ✅ Rich descriptions & instructions
                        </Text>
                      </YStack>
                    </YStack>

                    <Separator marginVertical="$4" />

                    {exercises.length > 0 ? (
                      <YStack gap="$4">
                        <Text size="lg" weight="bold">
                          Selected Exercises ({exercises.length})
                        </Text>
                        {exercises.map((exercise) => (
                          <Card
                            key={exercise.id}
                            bordered
                            padding="$3"
                            backgroundColor={
                              exercise.source === 'learning_path' ? '$green1' : '$background'
                            }
                            borderColor={
                              exercise.source === 'learning_path' ? '$green8' : '$borderColor'
                            }
                          >
                            <YStack gap="$2">
                              <XStack justifyContent="space-between" alignItems="flex-start">
                                <YStack flex={1} gap="$1">
                                  <XStack alignItems="center" gap="$2">
                                    <Text size="lg" weight="medium">
                                      {exercise.title}
                                    </Text>
                                    {exercise.source === 'learning_path' && (
                                      <View
                                        style={{
                                          backgroundColor: '#10B981',
                                          paddingHorizontal: 6,
                                          paddingVertical: 2,
                                          borderRadius: 8,
                                        }}
                                      >
                                        <Text fontSize={10} color="white" fontWeight="500">
                                          LEARNING PATH
                                        </Text>
                                      </View>
                                    )}
                                    {exercise.isRepeat && (
                                      <View
                                        style={{
                                          backgroundColor: '#F59E0B',
                                          paddingHorizontal: 6,
                                          paddingVertical: 2,
                                          borderRadius: 8,
                                        }}
                                      >
                                        <Text fontSize={10} color="white" fontWeight="500">
                                          REPEAT {exercise.repeatNumber || ''}
                                        </Text>
                                      </View>
                                    )}
                                    {exercise.has_quiz && (
                                      <View
                                        style={{
                                          backgroundColor: '#3B82F6',
                                          paddingHorizontal: 6,
                                          paddingVertical: 2,
                                          borderRadius: 8,
                                        }}
                                      >
                                        <Text fontSize={10} color="white" fontWeight="500">
                                          QUIZ
                                        </Text>
                                      </View>
                                    )}
                                    {exercise.youtube_url && (
                                      <View
                                        style={{
                                          backgroundColor: '#EF4444',
                                          paddingHorizontal: 6,
                                          paddingVertical: 2,
                                          borderRadius: 8,
                                        }}
                                      >
                                        <Text fontSize={10} color="white" fontWeight="500">
                                          VIDEO
                                        </Text>
                                      </View>
                                    )}
                                  </XStack>

                                  {exercise.learning_path_title && (
                                    <Text size="sm" color="$green11">
                                      From: {exercise.learning_path_title}
                                    </Text>
                                  )}
                                </YStack>

                                <XStack gap="$2">
                                  {exercise.source === 'custom' && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onPress={() => handleEditExercise(exercise)}
                                      backgroundColor="$blue5"
                                    >
                                      <Feather name="edit-3" size={16} color="$blue10" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onPress={() => handleRemoveExercise(exercise.id)}
                                    backgroundColor="$red5"
                                  >
                                    <Feather name="trash-2" size={16} color="$red10" />
                                  </Button>
                                </XStack>
                              </XStack>

                              {exercise.description && (
                                <Text color="$gray11">{exercise.description}</Text>
                              )}

                              <XStack gap="$3" alignItems="center" flexWrap="wrap">
                                {exercise.duration && (
                                  <XStack gap="$1" alignItems="center">
                                    <Feather name="clock" size={14} color="$gray11" />
                                    <Text size="sm" color="$gray11">
                                      {exercise.duration}
                                    </Text>
                                  </XStack>
                                )}

                                {exercise.repetitions && (
                                  <XStack gap="$1" alignItems="center">
                                    <Feather name="repeat" size={14} color="$gray11" />
                                    <Text size="sm" color="$gray11">
                                      {exercise.repetitions}
                                    </Text>
                                  </XStack>
                                )}

                                {exercise.source === 'learning_path' && (
                                  <XStack gap="$1" alignItems="center">
                                    <Feather name="link" size={14} color="$gray11" />
                                    <Text size="sm" color="$gray11">
                                      Linked to Learning Path
                                    </Text>
                                  </XStack>
                                )}
                              </XStack>
                            </YStack>
                          </Card>
                        ))}
                      </YStack>
                    ) : (
                      <Text color="$gray11" textAlign="center">
                        {getTranslation(t, 'createRoute.noExercises', 'No exercises added yet')}
                      </Text>
                    )}
                  </YStack>
                )}

                {activeSection === 'media' && (
                  <YStack gap="$4">
                    <Heading>{getTranslation(t, 'createRoute.media', 'Media')}</Heading>
                    <Text size="sm" color="$gray11">
                      {getTranslation(t, 'createRoute.addMedia', 'Add Media')}
                    </Text>

                    <YStack gap="$3">
                      <TouchableOpacity
                        onPress={() => pickMedia(false)}
                        style={{
                          paddingVertical: 16,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <XStack gap="$2" alignItems="center" justifyContent="center">
                          <Feather name="image" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                          <Text color="$color">
                            {getTranslation(t, 'createRoute.addMedia', 'Add Media')}
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={takePhoto}
                        style={{
                          paddingVertical: 16,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <XStack gap="$2" alignItems="center" justifyContent="center">
                          <Feather name="camera" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                          <Text color="$color">
                            {getTranslation(t, 'createRoute.takePicture', 'Take Picture')}
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={recordVideo}
                        style={{
                          paddingVertical: 16,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <XStack gap="$2" alignItems="center" justifyContent="center">
                          <Feather name="video" size={20} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />
                          <Text color="$color">
                            {getTranslation(t, 'createRoute.takeVideo', 'Take Video')}
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    </YStack>

                    {/* YouTube Link */}
                    {/* <YStack gap="$2">
                      <Heading marginTop="$4">
                        {getTranslation(t, 'createRoute.youtubeLink', 'YouTube Link')}
                      </Heading>
                      <XStack gap="$2">
                        <FormField
                          flex={1}
                          value={youtubeLink}
                          onChangeText={setYoutubeLink}
                          placeholder={t('createRoute.youtubeLinkPlaceholder')}
                          accessibilityLabel={t('createRoute.youtubeLink')}
                        />
                        <Button
                          onPress={addYoutubeLink}
                          disabled={!youtubeLink}
                          variant="secondary"
                          size="md"
                          marginTop="$2"
                        >
                          <XStack gap="$2" alignItems="center">
                            <Feather name="plus" size={18} color="$blue10" />
                            <Text color="$blue10">
                              {getTranslation(t, 'createRoute.addYoutubeLink', 'Add YouTube Link')}
                            </Text>
                          </XStack>
                        </Button>
                      </XStack>
                    </YStack> */}

                    {/* Media Preview Grid */}
                    {(media.length > 0 || loadingMedia) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {loadingMedia && (
                          <View
                            style={{
                              width: 100,
                              height: 100,
                              borderRadius: 8,
                              backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#F5F5F5',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Text size="sm" color="$gray11">Loading...</Text>
                          </View>
                        )}
                        {media.map((item, index) => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => setSelectedMediaIndex(index)}
                            style={{
                              width: 100,
                              height: 100,
                              position: 'relative',
                            }}
                          >
                            {item.type === 'image' && (
                              <Image
                                source={{ uri: item.uri }}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: 8,
                                }}
                              />
                            )}
                            {item.type === 'video' && (
                              <View
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: 8,
                                  backgroundColor: '#000',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Feather name="video" size={32} color="white" />
                              </View>
                            )}
                            {item.type === 'youtube' && (
                              <View
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: 8,
                                  backgroundColor: '#FF0000',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <Feather name="youtube" size={32} color="white" />
                              </View>
                            )}
                            {/* Delete button - small X in top right corner */}
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveMedia(index);
                              }}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                width: 28,
                                height: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                                borderRadius: 14,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              }}
                            >
                              <Feather
                                name="x"
                                size={16}
                                color="#FFFFFF"
                              />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </YStack>
                )}

                {activeSection === 'details' && (
                  <YStack gap="$4">
                    <Text size="lg" weight="medium" color="$color">
                      {t('common.details')}
                    </Text>

                    {/* Difficulty */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {getTranslation(t, 'createRoute.difficulty', 'Difficulty')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['beginner', 'intermediate', 'advanced'].map((level) => {
                          const isSelected = formData.difficulty === (level as DifficultyLevel);
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                            key={level}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                            onPress={() =>
                              setFormData((prev) => ({
                                ...prev,
                                difficulty: level as DifficultyLevel,
                              }))
                            }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                          >
                            {level === 'beginner'
                              ? t('profile.experienceLevels.beginner')
                              : level === 'intermediate'
                                ? t('profile.experienceLevels.intermediate')
                                : t('profile.experienceLevels.advanced')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Spot Type */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('createRoute.spotType')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['city', 'highway', 'rural', 'track', 'parking'].map((type) => {
                          const isSelected = formData.spot_type === (type as SpotType);
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                            key={type}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                            onPress={() =>
                              setFormData((prev) => ({ ...prev, spot_type: type as SpotType }))
                            }
                          >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                              >
                            {getTranslation(
                              t,
                              `createRoute.spotTypes.${type}`,
                              type.charAt(0).toUpperCase() + type.slice(1),
                            )}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Visibility */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('createRoute.visibility')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['public', 'private'].map((vis) => {
                          const isSelected = formData.visibility === (vis as SpotVisibility);
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                            key={vis}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                            onPress={() =>
                              setFormData((prev) => ({
                                ...prev,
                                visibility: vis as SpotVisibility,
                              }))
                            }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                          >
                            {vis === 'public'
                              ? getTranslation(t, 'createRoute.public', 'Public')
                              : getTranslation(t, 'createRoute.private', 'Private')}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Category */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('filters.category')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['parking', 'incline_start'].map((cat) => {
                          const isSelected = formData.category === (cat as Category);
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                              key={cat}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                              onPress={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  category: cat as Category,
                                }))
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                              >
                                {t(`filters.category.${cat}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Transmission Type */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('filters.transmissionType')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['automatic', 'manual', 'both'].map((trans) => {
                          const isSelected = formData.transmission_type === trans;
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                              key={trans}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                              onPress={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  transmission_type: trans,
                                }))
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                              >
                                {t(`filters.transmissionType.${trans}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Activity Level */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('filters.activityLevel')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['moderate', 'high'].map((level) => {
                          const isSelected = formData.activity_level === level;
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                              key={level}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                              onPress={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  activity_level: level,
                                }))
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                              >
                                {t(`filters.activityLevel.${level}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Best Season */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('filters.bestSeason')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['all', 'year-round', 'avoid-winter'].map((season) => {
                          const isSelected = formData.best_season === season;
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                              key={season}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                              onPress={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  best_season: season,
                                }))
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                              >
                                {t(`filters.bestSeason.${season}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Vehicle Types */}
                    <YStack gap="$2">
                      <Text weight="medium" color="$color">
                        {t('filters.vehicleTypes')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}
                      >
                        {['passenger_car', 'rv'].map((vehicle) => {
                          const isSelected = formData.vehicle_types.includes(vehicle);
                          const borderColor = colorScheme === 'dark' ? '#333333' : '#E5E5E5';
                          const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';

                          return (
                            <TouchableOpacity
                              key={vehicle}
                              style={{
                                marginRight: 8,
                                marginBottom: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: isSelected ? '#00E6C3' : 'transparent',
                              }}
                              onPress={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  vehicle_types: prev.vehicle_types.includes(vehicle)
                                    ? prev.vehicle_types.filter((v) => v !== vehicle)
                                    : [...prev.vehicle_types, vehicle],
                                }))
                              }
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#000000' : textColor,
                                }}
                              >
                                {t(`filters.vehicleTypes.${vehicle}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </YStack>

                    {/* Delete Button (only when editing) */}
                    {isEditing && (
                      <Button
                        onPress={handleDelete}
                        variant="secondary"
                        backgroundColor="$red5"
                        marginTop="$4"
                      >
                        <XStack gap="$2" alignItems="center">
                          <Feather name="trash-2" size={18} color="$red10" />
                          <Text color="$red10">
                            {getTranslation(t, 'createRoute.deleteRoute', 'Delete Route')}
                          </Text>
                        </XStack>
                      </Button>
                    )}
                  </YStack>
                )}
              </YStack>
            </ScrollView>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Save Button */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        backgroundColor="$background"
        borderTopWidth={1}
        borderTopColor="$borderColor"
        gap="$3"
      >
        {/* Collection Selector Button */}
        {/* <Button
          onPress={handleSelectCollection}
          backgroundColor="transparent"
          borderColor="$borderColor"
          borderWidth={1}
          size="md"
          width="100%"
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="map" size={18} color="$color" />
            <Text color="$color">
              {selectedCollectionId
                ? getTranslation(t, 'createRoute.collectionSelected', 'Collection Selected')
                : getTranslation(t, 'createRoute.selectCollection', 'Select Collection (Optional)')}
            </Text>
          </XStack>
        </Button> */}

        {/* Validation messages */}
        {!isBasicInfoComplete && (
          <XStack gap="$2" alignItems="center" justifyContent="center" paddingHorizontal="$2">
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <Text size="sm" color="#EF4444" fontWeight="500">
              {getTranslation(t, 'createRoute.nameRequired', 'Route name is required')}
            </Text>
          </XStack>
        )}
        
        {!isLocationComplete && (
          <XStack gap="$2" alignItems="center" justifyContent="center" paddingHorizontal="$2">
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <Text size="sm" color="#EF4444" fontWeight="500">
              {drawingMode === 'pin' && getTranslation(t, 'createRoute.locationRequired', 'Please drop a pin on the map')}
              {drawingMode === 'waypoint' && getTranslation(t, 'createRoute.waypointsRequired', 'At least 2 waypoints required')}
              {drawingMode === 'pen' && getTranslation(t, 'createRoute.drawingRequired', 'Please draw a route on the map')}
              {drawingMode === 'record' && getTranslation(t, 'createRoute.recordingRequired', 'Please record a route first')}
            </Text>
          </XStack>
        )}

        {/* Create Route Button */}
        <Button
          onPress={handleCreate}
          disabled={loading || !formData.name.trim() || !isLocationComplete}
          variant="primary"
          size="md"
          width="100%"
        >
          {loading
            ? getTranslation(t, 'createRoute.saving', 'Saving...')
            : isEditing
              ? getTranslation(t, 'createRoute.save', 'Save')
              : getTranslation(t, 'createRoute.createTitle', 'Create Route')}
        </Button>

        {/* Cancel Button */}
        <Button
          onPress={handleCancelPress}
          disabled={loading}
          variant="outline"
          size="md"
          width="100%"
        >
          {getTranslation(t, 'common.cancel', 'Cancel')}
        </Button>
      </YStack>

      {/* Exercise Selector Modal */}
      <ExerciseSelector
        visible={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        selectedExercises={exercises as RouteExercise[]}
        onExercisesChange={handleExercisesChange}
      />

      {/* Advanced Exercise Creator Modal */}
      <AdvancedExerciseCreator
        visible={showAdvancedExerciseCreator}
        onClose={() => {
          // If we were editing an exercise and user cancels, restore the original exercise
          if (editingExercise) {
            console.log(
              '📝 [CreateRoute] User cancelled edit - restoring original exercise:',
              editingExercise.id,
            );
            setExercises((prev) => [...prev, editingExercise]);
          }
          setShowAdvancedExerciseCreator(false);
          setEditingExercise(null); // Clear editing state
        }}
        onExerciseCreated={handleAdvancedExerciseCreated}
        initialData={editingExercise} // Pass exercise data for editing
      />

      {/* Exit Confirmation Bottom Sheet */}
      <Modal
        visible={showExitConfirmation}
        transparent
        animationType="none"
        onRequestClose={() => setShowExitConfirmation(false)}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
            zIndex: 99999,
          }}
        >
          <Animated.View
            style={{
              backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 20,
              maxHeight: '60%',
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colorScheme === 'dark' ? '#333' : '#DDD',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />

            <YStack gap="$4">
              <YStack gap="$2">
                <Text fontSize="$6" fontWeight="bold" textAlign="center">
                  {t('createRoute.unsavedChanges') || 'Unsaved Changes'}
                </Text>
                <Text fontSize="$4" color="$gray11" textAlign="center">
                  {t('createRoute.unsavedChangesMessage') ||
                    'You have unsaved changes. What would you like to do?'}
                </Text>
              </YStack>

              <YStack gap="$3">
                {/* Save as Draft Button */}
                {/* <Button
                  onPress={saveAsDraft}
                  variant="secondary"
                  size="lg"
                  backgroundColor="$blue5"
                >
                  {t('createRoute.saveAsDraft') || 'Save as Draft'}
                </Button> */}

                {/* Continue Editing Button */}
                <Button onPress={handleContinueEditing} variant="primary" size="md">
                  {t('createRoute.continueEditing') || 'Continue Editing'}
                </Button>

                {/* Exit Without Saving Button */}
                <Button
                  onPress={handleExitWithoutSaving}
                  variant="outline"
                  size="md"
                >
                  {t('createRoute.exitWithoutSaving') || 'Exit Without Saving'}
                </Button>
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Modal>

      {/* Collection Selector Sheet */}
      <AddToPresetSheet
        isVisible={showCollectionSelector}
        routeId={isEditing && routeId ? routeId : 'temp-route-id'} // Use actual route ID when editing, temp ID for new routes
        selectedCollectionId={selectedCollectionId} // Pass the currently selected collection ID
        onRouteAdded={(presetId, presetName) => {
          setSelectedCollectionId(presetId);
          setShowCollectionSelector(false);
          showToast({
            title: getTranslation(t, 'createRoute.collectionSelected', 'Collection Selected'),
            message: getTranslation(
              t,
              'createRoute.routeWillBeSavedTo',
              'Route will be saved to "{collectionName}"',
            ).replace('{collectionName}', presetName),
            type: 'success',
          });
        }}
        onRouteRemoved={() => {}} // Not applicable for new routes
        onPresetCreated={(preset) => {
          setSelectedCollectionId(preset.id);
          setShowCollectionSelector(false);
          showToast({
            title: getTranslation(t, 'createRoute.collectionCreated', 'Collection Created'),
            message: getTranslation(
              t,
              'createRoute.newCollectionCreated',
              'New collection "{collectionName}" has been created',
            ).replace('{collectionName}', preset.name),
            type: 'success',
          });
        }}
        onClose={() => setShowCollectionSelector(false)}
      />

      {/* Media Preview Modal */}
      <Modal
        visible={selectedMediaIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMediaIndex(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {selectedMediaIndex !== null && media[selectedMediaIndex] && (
            <>
              {media[selectedMediaIndex].type === 'image' && (
                <Image
                  source={{ uri: media[selectedMediaIndex].uri }}
                  style={{
                    width: windowWidth * 0.9,
                    height: windowHeight * 0.7,
                    borderRadius: 8,
                  }}
                  resizeMode="contain"
                />
              )}
              {media[selectedMediaIndex].type === 'video' && (
                <View
                  style={{
                    width: windowWidth * 0.9,
                    height: windowHeight * 0.7,
                    borderRadius: 8,
                    backgroundColor: '#000',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Feather name="video" size={64} color="white" />
                  <Text color="white" marginTop="$4">Video Preview</Text>
                </View>
              )}
              
              {/* Close button - top right */}
              <TouchableOpacity
                onPress={() => setSelectedMediaIndex(null)}
                style={{
                  position: 'absolute',
                  top: 60,
                  right: 20,
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#FFFFFF',
                  borderRadius: 22,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                }}
              >
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Delete button - bottom center */}
              <TouchableOpacity
                onPress={() => {
                  if (selectedMediaIndex !== null) {
                    handleRemoveMedia(selectedMediaIndex);
                    setSelectedMediaIndex(null);
                  }
                }}
                style={{
                  position: 'absolute',
                  bottom: 80,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 24,
                  backgroundColor: '#EF4444',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Feather name="trash-2" size={20} color="#FFFFFF" />
                <Text color="white" fontWeight="600">Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </Screen>
  );
}
