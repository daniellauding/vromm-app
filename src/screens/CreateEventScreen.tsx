import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, TouchableOpacity, Alert, Dimensions, View, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Input, TextArea, Separator } from 'tamagui';
import {
  ArrowLeft,
  Save,
  Calendar,
  MapPin,
  Globe,
  Lock,
  Users,
  Camera,
  Image as ImageIcon,
  Video,
  Map as MapIcon,
  BookOpen,
  Route as RouteIcon,
  Plus,
  X,
  Search,
  Navigation,
  Undo,
  Redo,
  Edit3,
  Circle,
} from '@tamagui/lucide-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { db, supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { MediaCarousel, CarouselMediaItem } from '../components/MediaCarousel';
import { Waypoint } from '../components/Map';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { ExerciseSelector, RouteExercise } from '../components/ExerciseSelector';
import { RouteSelector } from '../components/RouteSelector';
import { RouteCard } from '../components/RouteCard';
import { RecurrencePicker, RecurrenceRule } from '../components/RecurrencePicker';
import { Exercise } from '../types/route';
import { useRoutes } from '../hooks/useRoutes';
import { Route as HookRoute } from '../types/route';
import * as mediaUtils from '../utils/mediaUtils';
import * as Location from 'expo-location';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type MapPressEvent = {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
};

interface EventLocation {
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  placeId?: string;
  // Enhanced location data like routes
  waypoints?: Waypoint[];
  searchQuery?: string;
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

interface EventEmbeds {
  exercises: any[];
  routes: any[];
}

interface CreateEventFormData {
  title: string;
  description: string;
  location: string;
  eventLocation?: EventLocation;
  waypoints: Waypoint[];
  visibility: 'public' | 'private' | 'invite-only';
  eventDate: string;
  recurrenceRule: RecurrenceRule | null;
  media: CarouselMediaItem[];
  embeds: EventEmbeds;
  drawingMode: 'pin' | 'waypoint' | 'search' | 'pen';
}

type SearchResult = Location.LocationGeocodedAddress & {
  coords?: { latitude: number; longitude: number };
};

export const CreateEventScreen: React.FC = () => {
  const [formData, setFormData] = useState<CreateEventFormData>({
    title: '',
    description: '',
    location: '',
    eventLocation: undefined,
    waypoints: [],
    visibility: 'public',
    eventDate: '',
    recurrenceRule: null,
    media: [],
    embeds: {
      exercises: [],
      routes: [],
    },
    drawingMode: 'pin',
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 59.3293, // Stockholm default
    longitude: 18.0686,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Enhanced location search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [penPath, setPenPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const searchInputRef = useRef<any>(null);
  
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { eventId } = (route.params as { eventId?: string }) || {};
  const { fetchRoutes } = useRoutes();
  const { showEventCreatedToast } = useToast();

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  useEffect(() => {
    if (eventId) {
      setIsEditing(true);
      loadEvent();
    }
  }, [eventId]);

  // Auto-location detection for new events (like CreateRouteScreen)
  useEffect(() => {
    // Only try to get current location if we're creating a new event (not editing) and there are no waypoints
    if (!isEditing && formData.waypoints.length === 0) {
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
              setMapRegion({
                latitude,
                longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });

              // Only add automatic waypoint in pin mode
              if (formData.drawingMode === 'pin') {
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

                  setFormData(prev => ({
                    ...prev,
                    waypoints: [newWaypoint],
                    location: title,
                    eventLocation: {
                      coordinates: { latitude, longitude },
                      address: title,
                    },
                  }));

                  // Update search input with location name
                  setSearchQuery(title);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error getting current location:', err);
          // Fallback to default location if there's an error
          setMapRegion({
            latitude: 55.7047,
            longitude: 13.191,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }
      })();
    }
  }, [isEditing, locationPermission, formData.waypoints.length, formData.drawingMode]);

  const loadEvent = async () => {
    try {
      if (!eventId) return;
      
      const event = await db.events.getById(eventId);
      const parsedEmbeds = event.embeds ? JSON.parse(JSON.stringify(event.embeds)) : { exercises: [], routes: [] };
      
      // Parse location data (can be simple string or complex JSON)
      let eventLocation = undefined;
      let waypoints: Waypoint[] = [];
      
      if (event.location) {
        try {
          const locationData = JSON.parse(event.location);
          if (locationData.waypoints) {
            waypoints = locationData.waypoints;
            eventLocation = locationData;
          } else if (locationData.coordinates) {
            // Simple coordinate format
            eventLocation = locationData;
            waypoints = [{
              latitude: locationData.coordinates.latitude,
              longitude: locationData.coordinates.longitude,
              title: 'Event Location',
              description: locationData.address || 'Event location',
            }];
          }
        } catch (e) {
          // Fallback for simple string location
          waypoints = [];
        }
      }
      
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        eventLocation,
        waypoints,
        visibility: event.visibility,
        eventDate: event.event_date ? event.event_date.split('T')[0] : '',
        recurrenceRule: event.recurrence_rule ? JSON.parse(JSON.stringify(event.recurrence_rule)) : null,
        media: event.media ? JSON.parse(JSON.stringify(event.media)) : [],
        embeds: {
          exercises: parsedEmbeds.exercises || [],
          routes: parsedEmbeds.routes || [],
        },
        drawingMode: 'pin',
      });

      // Set map region based on waypoints
      if (waypoints.length > 0) {
        const firstWaypoint = waypoints[0];
        setMapRegion({
          latitude: firstWaypoint.latitude,
          longitude: firstWaypoint.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    // Validate form
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      setLoading(true);

      // Upload media first
      const uploadedMedia: { type: string; url: string; description: string }[] = [];
      for (const mediaItem of formData.media) {
        if (mediaItem.type === 'upload') continue;

        if (mediaItem.uri && !mediaItem.uri.startsWith('http')) {
          try {
            const publicUrl = await mediaUtils.uploadMediaToSupabase(
              {
                id: Date.now().toString(),
                type: mediaItem.type as mediaUtils.MediaType,
                uri: mediaItem.uri,
                fileName: mediaItem.uri.split('/').pop() || 'media',
              },
              'media',
              `events/${Date.now()}`
            );

            if (publicUrl) {
              uploadedMedia.push({
                type: mediaItem.type,
                url: publicUrl,
                description: '',
              });
            }
          } catch (uploadError) {
            console.error('Error uploading media:', uploadError);
            // Continue with other media items
          }
        } else if (mediaItem.uri?.startsWith('http')) {
          // Already uploaded media
          uploadedMedia.push({
            type: mediaItem.type,
            url: mediaItem.uri,
            description: '',
          });
        }
      }

      // Prepare location data (enhanced format like routes)
      let locationData = undefined;
      if (formData.waypoints.length > 0) {
        locationData = JSON.stringify({
          waypoints: formData.waypoints,
          searchQuery: formData.location,
          region: mapRegion,
          drawingMode: formData.drawingMode,
        });
      } else if (formData.eventLocation) {
        locationData = JSON.stringify(formData.eventLocation);
      } else if (formData.location.trim()) {
        locationData = formData.location.trim();
      }
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        location: locationData,
        visibility: formData.visibility,
        event_date: formData.eventDate ? new Date(formData.eventDate).toISOString() : undefined,
        repeat: formData.recurrenceRule?.pattern || 'none',
        recurrence_rule: formData.recurrenceRule ? formData.recurrenceRule : undefined,
        recurrence_end_date: formData.recurrenceRule?.endType === 'date' && formData.recurrenceRule.endDate
          ? new Date(formData.recurrenceRule.endDate).toISOString()
          : undefined,
        recurrence_count: formData.recurrenceRule?.endType === 'count' 
          ? formData.recurrenceRule.count 
          : undefined,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        embeds: formData.embeds.exercises.length > 0 || formData.embeds.routes.length > 0 ? formData.embeds : undefined,
      };

      let createdEventId = eventId;
      if (isEditing && eventId) {
        await db.events.update(eventId, eventData);
      } else {
        const newEvent = await db.events.create(eventData);
        createdEventId = newEvent.id;
      }
      
      // Show toast notification instead of alert
      showEventCreatedToast(
        createdEventId || eventId || '',
        formData.title,
        isEditing
      );
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateEventFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddMedia = (newMedia: Pick<CarouselMediaItem, 'type' | 'uri'>) => {
    const newMediaItem: CarouselMediaItem = {
      type: newMedia.type,
      uri: newMedia.uri,
    };
    updateFormData('media', [...formData.media, newMediaItem]);
  };

  const handleRemoveMedia = (index: number) => {
    updateFormData(
      'media',
      formData.media.filter((_, i) => i !== index)
    );
  };

  // Enhanced media functions from CreateRouteScreen.tsx
  const [youtubeLink, setYoutubeLink] = useState('');

  const pickMedia = async (useCamera = false) => {
    try {
      const newMediaItems = await mediaUtils.pickMediaFromLibrary(!useCamera);
      if (newMediaItems && newMediaItems.length > 0) {
        const convertedMedia: CarouselMediaItem[] = newMediaItems.map(item => ({
          type: item.type,
          uri: item.uri,
        }));
        updateFormData('media', [...formData.media, ...convertedMedia]);
      }
    } catch (err) {
      console.error('Error picking media:', err);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const takePhoto = async () => {
    try {
      const newMedia = await mediaUtils.takePhoto();
      if (newMedia) {
        handleAddMedia({ type: newMedia.type, uri: newMedia.uri });
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async () => {
    try {
      const newMedia = await mediaUtils.pickMediaFromLibrary(false); // Single photo selection
      if (newMedia && newMedia.length > 0) {
        const convertedMedia: CarouselMediaItem[] = newMedia.map(item => ({
          type: item.type,
          uri: item.uri,
        }));
        updateFormData('media', [...formData.media, ...convertedMedia]);
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const recordVideo = async () => {
    try {
      const newMedia = await mediaUtils.recordVideo();
      if (newMedia) {
        handleAddMedia({ type: newMedia.type, uri: newMedia.uri });
      }
    } catch (err) {
      console.error('Error recording video:', err);
      Alert.alert('Error', 'Failed to record video');
    }
  };

  const uploadVideo = async () => {
    try {
      const newMedia = await mediaUtils.pickVideoFromLibrary(false); // Single video selection
      if (newMedia && newMedia.length > 0) {
        const convertedMedia: CarouselMediaItem[] = newMedia.map(item => ({
          type: item.type,
          uri: item.uri,
        }));
        updateFormData('media', [...formData.media, ...convertedMedia]);
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      Alert.alert('Error', 'Failed to upload video');
    }
  };

  const addYoutubeLink = () => {
    if (!youtubeLink.trim()) return;
    
    const newMedia = mediaUtils.createYoutubeMediaItem(youtubeLink);
    if (!newMedia) {
      Alert.alert('Invalid YouTube URL', 'Please enter a valid YouTube URL');
      return;
    }
    handleAddMedia({ type: newMedia.type, uri: newMedia.uri });
    setYoutubeLink(''); // Clear the input after adding
  };

  // Enhanced map handling functions (from CreateRouteScreen.tsx)
  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    switch (formData.drawingMode) {
      case 'pin':
        handlePinMode(latitude, longitude);
        break;
      case 'waypoint':
        handleWaypointMode(latitude, longitude);
        break;
      case 'pen':
        handlePenMode(latitude, longitude);
        break;
      default:
        handlePinMode(latitude, longitude);
    }
  };

  const handlePenMode = (latitude: number, longitude: number) => {
    const newPoint = { latitude, longitude };
    setPenPath(prev => [...prev, newPoint]);
    
    // Convert pen path to waypoints for storage
    const newWaypoint: Waypoint = {
      latitude,
      longitude,
      title: `Path Point ${penPath.length + 1}`,
      description: 'Pen drawing point',
    };

    setFormData((prev) => ({
      ...prev,
      waypoints: [...prev.waypoints, newWaypoint],
    }));
  };

  const handlePinMode = (latitude: number, longitude: number) => {
    // Clear existing waypoints and add single pin
    const newWaypoint: Waypoint = {
      latitude,
      longitude,
      title: 'Event Location',
      description: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };

    setFormData((prev) => ({
      ...prev,
      waypoints: [newWaypoint],
      location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      eventLocation: {
        coordinates: { latitude, longitude },
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      },
    }));

    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const handleWaypointMode = (latitude: number, longitude: number) => {
    // Add waypoint to existing list
    const newWaypoint: Waypoint = {
      latitude,
      longitude,
      title: `Waypoint ${formData.waypoints.length + 1}`,
      description: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };

    setFormData((prev) => ({
      ...prev,
      waypoints: [...prev.waypoints, newWaypoint],
    }));
  };

  // Location search functions (from CreateRouteScreen.tsx)
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setFormData((prev) => ({ ...prev, location: query }));

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
          const searchTerms = [
            `${query}, Sweden`,
            `${query}, Gothenburg`,
            `${query}, Stockholm`,
            `${query}, Malmö`,
            query,
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
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleLocationSelect = (result: SearchResult) => {
    if (result.coords) {
      const { latitude, longitude } = result.coords;

      // Update region
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Create location title
      const title = [result.street, result.city, result.country].filter(Boolean).join(', ');

      // Add waypoint
      const newWaypoint: Waypoint = {
        latitude,
        longitude,
        title,
        description: 'Searched location',
      };

      setFormData((prev) => ({
        ...prev,
        waypoints: [newWaypoint],
        location: title,
        eventLocation: {
          coordinates: { latitude, longitude },
          address: title,
        },
      }));

      // Update search UI
      setSearchQuery(title);
      setShowSearchResults(false);

      // Clear keyboard focus
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }

      // Map is always visible now
    }
  };

  const handleLocateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get address for the location
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      const locationName = address[0] ? 
        [address[0].street, address[0].city, address[0].country].filter(Boolean).join(', ') :
        `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      handlePinMode(latitude, longitude);
      setSearchQuery(locationName);

      Alert.alert('Location found', `Set event location to: ${locationName}`);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleManualCoordinates = () => {
    Alert.prompt(
      'Enter Coordinates',
      'Enter latitude and longitude separated by comma (e.g., 55.7047, 13.191)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (input) => {
            if (input) {
              const coords = input.split(',').map(s => parseFloat(s.trim()));
              if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                const [latitude, longitude] = coords;
                handlePinMode(latitude, longitude);
                setSearchQuery(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              } else {
                Alert.alert('Invalid format', 'Please enter coordinates as: latitude, longitude');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const clearWaypoints = () => {
    setFormData((prev) => ({
      ...prev,
      waypoints: [],
      eventLocation: undefined,
    }));
    setPenPath([]);
    setIsDrawing(false);
    setSearchQuery('');
  };



  const handleExercisesChange = (exercises: any[]) => {
    setFormData((prev) => ({
      ...prev,
      embeds: {
        ...prev.embeds,
        exercises,
      },
    }));
  };

  const handleRouteSelection = () => {
    setShowRouteSelector(true);
  };

  const handleRoutesChange = (routes: any[]) => {
    setFormData((prev) => ({
      ...prev,
      embeds: {
        ...prev.embeds,
        routes,
      },
    }));
  };

  const removeExercise = (exerciseId: string) => {
    setFormData((prev) => ({
      ...prev,
      embeds: {
        ...prev.embeds,
        exercises: prev.embeds.exercises.filter((ex) => ex.id !== exerciseId),
      },
    }));
  };

  const removeRoute = (routeId: string) => {
    setFormData((prev) => ({
      ...prev,
      embeds: {
        ...prev.embeds,
        routes: prev.embeds.routes.filter((route) => route.id !== routeId),
      },
    }));
  };

  const drawingModeOptions = [
    { value: 'pin' as const, label: 'Single Pin', icon: <MapPin size={16} />, description: 'Drop one location pin' },
    { value: 'waypoint' as const, label: 'Multiple Points', icon: <Navigation size={16} />, description: 'Add multiple waypoints' },
    { value: 'pen' as const, label: 'Draw Path', icon: <Edit3 size={16} />, description: 'Draw custom path on map' },
    { value: 'search' as const, label: 'Search', icon: <Search size={16} />, description: 'Search for locations' },
  ];

  const visibilityOptions = [
    {
      value: 'public' as const,
      label: 'Public',
      description: 'Anyone can see and join',
      icon: <Globe size={16} color="#00FFBC" />,
      color: '#00FFBC',
    },
    {
      value: 'invite-only' as const,
      label: 'Invite Only',
      description: 'Only invited users can see and join',
      icon: <Users size={16} color="#F59E0B" />,
      color: '#F59E0B',
    },
    {
      value: 'private' as const,
      label: 'Private',
      description: 'Only you can see this event',
      icon: <Lock size={16} color="#EF4444" />,
      color: '#EF4444',
    },
  ];

  return (
    <YStack flex={1} backgroundColor="#0F172A">
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        justifyContent="space-between"
        alignItems="center"
      >
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text fontSize={18} fontWeight="600" color="#FFFFFF">
          {isEditing ? 'Edit Event' : 'Create Event'}
        </Text>

        <Button
          onPress={handleSave}
          disabled={loading || !formData.title.trim()}
          backgroundColor={formData.title.trim() ? '#00FFBC' : '#374151'}
          borderRadius={8}
          paddingHorizontal={16}
          height={36}
        >
          <Save size={16} color={formData.title.trim() ? '#000000' : '#9CA3AF'} />
          <Text
            fontSize={14}
            fontWeight="600"
            color={formData.title.trim() ? '#000000' : '#9CA3AF'}
            marginLeft={8}
          >
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </Button>
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        <YStack gap={24}>
          {/* Enhanced Media Section - Like CreateRouteScreen */}
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Event Media
            </Text>
            
            {/* Media Controls */}
            <YStack gap={8}>
              <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                Add Photos & Videos
              </Text>
              <XStack gap={8} flexWrap="wrap">
                <TouchableOpacity
                  onPress={takePhoto}
                  style={{
                    backgroundColor: '#00FFBC',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Camera size={16} color="#000" />
                  <Text fontSize={12} fontWeight="600" color="#000">
                    Camera
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={uploadPhoto}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <ImageIcon size={16} color="#FFF" />
                  <Text fontSize={12} fontWeight="600" color="#FFF">
                    Photos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={recordVideo}
                  style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Circle size={16} color="#FFF" />
                  <Text fontSize={12} fontWeight="600" color="#FFF">
                    Record
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={uploadVideo}
                  style={{
                    backgroundColor: '#8B5CF6',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Video size={16} color="#FFF" />
                  <Text fontSize={12} fontWeight="600" color="#FFF">
                    Videos
                  </Text>
        </TouchableOpacity>
      </XStack>

              {/* YouTube Link Input */}
              <XStack gap={8} alignItems="center">
                <Input
                  value={youtubeLink}
                  onChangeText={setYoutubeLink}
                  placeholder="Add YouTube URL..."
                  backgroundColor="#1F2937"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  color="#FFFFFF"
                  placeholderTextColor="#9CA3AF"
                  flex={1}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={addYoutubeLink}
                  style={{
                    backgroundColor: '#FF0000',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Plus size={16} color="#FFF" />
                </TouchableOpacity>
              </XStack>
            </YStack>

            {/* Media Preview Carousel */}
            <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
              <MediaCarousel
                media={formData.media}
                onAddMedia={handleAddMedia}
                onRemoveMedia={handleRemoveMedia}
                height={200}
              />
            </View>

            {formData.media.length > 0 && (
              <Text fontSize={12} color="#9CA3AF">
                {formData.media.length} media item{formData.media.length === 1 ? '' : 's'} added
              </Text>
            )}
          </YStack>

          {/* Title */}
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Event Title *
            </Text>
            <Input
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              placeholder="Enter event title"
              backgroundColor="#1F2937"
              borderColor="rgba(255, 255, 255, 0.2)"
              color="#FFFFFF"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </YStack>

          {/* Description */}
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Description
            </Text>
            <TextArea
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Describe your event..."
              backgroundColor="#1F2937"
              borderColor="rgba(255, 255, 255, 0.2)"
              color="#FFFFFF"
              placeholderTextColor="#9CA3AF"
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </YStack>

          {/* Enhanced Location Section - Full Map Controls Like CreateRouteScreen */}
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Event Location
            </Text>

            {/* Drawing Mode Controls */}
          <YStack gap={8}>
              <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                Choose how to set your location
              </Text>
              <XStack gap={8} flexWrap="wrap">
                {drawingModeOptions.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    onPress={() => updateFormData('drawingMode', mode.value)}
                    style={{
                      backgroundColor: formData.drawingMode === mode.value ? '#00FFBC' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                      minWidth: 120,
                    }}
                  >
                    {React.cloneElement(mode.icon, {
                      color: formData.drawingMode === mode.value ? '#000' : '#FFF',
                    })}
                    <Text
                      fontSize={12}
                      fontWeight="600"
                      color={formData.drawingMode === mode.value ? '#000' : '#FFF'}
                    >
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </XStack>
              <Text fontSize={12} color="#9CA3AF">
                {formData.drawingMode === 'pin' && 'Drop a single location marker'}
                {formData.drawingMode === 'waypoint' && 'Add multiple waypoints for your event'}
                {formData.drawingMode === 'pen' && 'Draw a custom path by tapping multiple points'}
                {formData.drawingMode === 'search' && 'Search for locations by name'}
              </Text>
            </YStack>

            {/* Location Search */}
            <YStack gap={8}>
              <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                Search for Location
              </Text>
              <XStack gap={8} alignItems="center">
            <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Search for location or enter address..."
                  backgroundColor="#1F2937"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  color="#FFFFFF"
                  placeholderTextColor="#9CA3AF"
                  flex={1}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={handleLocateMe}
                  style={{
                    backgroundColor: '#00FFBC',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Navigation size={16} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleManualCoordinates}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Edit3 size={16} color="#FFF" />
                </TouchableOpacity>
              </XStack>

              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <YStack
                  backgroundColor="#1F2937"
                  borderRadius={8}
                  borderWidth={1}
                  borderColor="rgba(255, 255, 255, 0.2)"
                  maxHeight={200}
                >
                  <ScrollView>
                    {searchResults.map((result, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleLocationSelect(result)}
                        style={{
                          padding: 12,
                          borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                          {[result.street, result.city].filter(Boolean).join(', ')}
                        </Text>
                        <Text fontSize={12} color="#9CA3AF">
                          {[result.region, result.country].filter(Boolean).join(', ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </YStack>
              )}
            </YStack>

            {/* Map Preview - Always Visible Like CreateRouteScreen */}
          <YStack gap={8}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                  Map Preview
                </Text>
                <XStack gap={8}>
                  {formData.waypoints.length > 0 && (
                    <TouchableOpacity onPress={clearWaypoints}>
                      <XStack gap={4} alignItems="center">
                        <X size={14} color="#EF4444" />
                        <Text fontSize={12} color="#EF4444" fontWeight="600">
                          Clear All
                        </Text>
                      </XStack>
                    </TouchableOpacity>
                  )}
                </XStack>
              </XStack>

              {/* Interactive Map */}
              <View style={{ 
                height: 400, 
                borderRadius: 12, 
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: '#00FFBC'
              }}>
                <MapView
                  style={{ flex: 1 }}
                  region={mapRegion}
                  onPress={handleMapPress}
                  showsUserLocation={true}
                  userInterfaceStyle="dark"
                  moveOnMarkerPress={false}
                >
                  {/* Render waypoints as individual markers */}
                  {formData.waypoints.map((waypoint, index) => {
                    const isFirst = index === 0;
                    const isLast = index === formData.waypoints.length - 1 && formData.waypoints.length > 1;
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

                  {/* Render connecting lines for waypoints in waypoint mode */}
                  {formData.drawingMode === 'waypoint' && formData.waypoints.length > 1 && (
                    <Polyline
                      coordinates={formData.waypoints.map((wp) => ({
                        latitude: wp.latitude,
                        longitude: wp.longitude,
                      }))}
                      strokeWidth={3}
                      strokeColor="#00FFBC"
                      lineJoin="round"
                    />
                  )}

                  {/* Render pen drawing as smooth continuous line */}
                  {formData.drawingMode === 'pen' && penPath.length > 1 && (
                    <Polyline
                      coordinates={penPath}
                      strokeWidth={5}
                      strokeColor="#FF6B35"
                      lineJoin="round"
                      lineCap="round"
                      geodesic={false}
                    />
                  )}
                </MapView>
              </View>

              {/* Map Instructions */}
              <YStack gap={4} backgroundColor="rgba(0, 255, 188, 0.1)" padding={12} borderRadius={8}>
                <Text fontSize={12} fontWeight="600" color="#00FFBC">
                  {formData.drawingMode === 'pin' && 'Tap anywhere on map to set location'}
                  {formData.drawingMode === 'waypoint' && 'Tap multiple times to add waypoints'}
                  {formData.drawingMode === 'pen' && 'Tap multiple points to draw a custom path'}
                  {formData.drawingMode === 'search' && 'Use search above to find locations'}
                </Text>
                <Text fontSize={10} color="#9CA3AF">
                  {formData.waypoints.length} location{formData.waypoints.length === 1 ? '' : 's'} set
                </Text>
              </YStack>

              {/* Waypoint List */}
              {formData.waypoints.length > 0 && (
                <YStack gap={6}>
                  <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                    Event Locations ({formData.waypoints.length})
                  </Text>
                  {formData.waypoints.map((waypoint, index) => (
                    <XStack
                      key={index}
              backgroundColor="rgba(255, 255, 255, 0.05)"
              padding={12}
                      borderRadius={8}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <YStack flex={1}>
                        <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                          📍 {waypoint.title}
                        </Text>
                        <Text fontSize={12} color="#9CA3AF">
                          {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                        </Text>
                        {waypoint.description && (
                          <Text fontSize={10} color="#6B7280">
                            {waypoint.description}
                          </Text>
                        )}
          </YStack>
                      <TouchableOpacity
                        onPress={() => {
                          setFormData((prev) => ({
                            ...prev,
                            waypoints: prev.waypoints.filter((_, i) => i !== index),
                          }));
                        }}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          borderRadius: 6,
                          padding: 8,
                        }}
                      >
                        <X size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </XStack>
                  ))}
                </YStack>
              )}

              {formData.waypoints.length === 0 && (
                <YStack 
                  backgroundColor="rgba(107, 114, 128, 0.1)" 
                  padding={16} 
                  borderRadius={8} 
                  alignItems="center"
                >
                  <MapPin size={24} color="#6B7280" />
                  <Text fontSize={14} color="#6B7280" textAlign="center" marginTop={8}>
                    No location set yet
                  </Text>
                  <Text fontSize={12} color="#9CA3AF" textAlign="center" marginTop={4}>
                    Use search above or tap on the map to set your event location
                  </Text>
                </YStack>
              )}
            </YStack>
          </YStack>

          {/* Exercises Section */}
          <YStack gap={12}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={16} fontWeight="600" color="#FFFFFF">
                Practice Exercises
              </Text>
              <TouchableOpacity onPress={() => setShowExerciseSelector(true)}>
                <XStack gap={4} alignItems="center">
                  <Plus size={16} color="#00FFBC" />
                  <Text fontSize={14} color="#00FFBC">
                    Add Exercises
                  </Text>
                </XStack>
              </TouchableOpacity>
            </XStack>

            {formData.embeds.exercises.length > 0 && (
          <YStack gap={8}>
                {formData.embeds.exercises.map((exercise, index) => (
                  <XStack
                    key={exercise.id}
                    backgroundColor="#1F2937"
              padding={12}
                    borderRadius={8}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <XStack alignItems="center" gap={12} flex={1}>
                      <BookOpen size={20} color="#00FFBC" />
                      <YStack flex={1}>
                        <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                          {typeof exercise.title === 'string' ? exercise.title : exercise.title?.en || 'Exercise'}
              </Text>
                        {exercise.description && (
                          <Text fontSize={12} color="#9CA3AF" numberOfLines={1}>
                            {typeof exercise.description === 'string' ? exercise.description : exercise.description?.en || ''}
                          </Text>
                        )}
                      </YStack>
            </XStack>
                    <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                      <X size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </XStack>
                ))}
                <Text fontSize={12} color="#9CA3AF">
                  {formData.embeds.exercises.length} exercise{formData.embeds.exercises.length === 1 ? '' : 's'} selected
                </Text>
              </YStack>
            )}

            {formData.embeds.exercises.length === 0 && (
              <Text fontSize={14} color="#6B7280" fontStyle="italic">
                No exercises attached. Tap "Add Exercises" to include practice exercises for this event.
              </Text>
            )}
          </YStack>

          <Separator />

          {/* Routes Section */}
          <YStack gap={12}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={16} fontWeight="600" color="#FFFFFF">
                Recommended Routes
              </Text>
              <TouchableOpacity onPress={handleRouteSelection}>
                <XStack gap={4} alignItems="center">
                  <Plus size={16} color="#00FFBC" />
                  <Text fontSize={14} color="#00FFBC">
                    Add Routes
                  </Text>
                </XStack>
              </TouchableOpacity>
            </XStack>

            {formData.embeds.routes.length > 0 && (
              <YStack gap={12}>
                {formData.embeds.routes.map((route) => (
                  <View key={route.id} style={{ position: 'relative' }}>
                    <RouteCard route={route} />
                    <TouchableOpacity
                      onPress={() => removeRoute(route.id)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        borderRadius: 12,
                        padding: 4,
                        zIndex: 1,
                      }}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <Text fontSize={12} color="#9CA3AF">
                  {formData.embeds.routes.length} route{formData.embeds.routes.length === 1 ? '' : 's'} attached
                </Text>
              </YStack>
            )}

            {formData.embeds.routes.length === 0 && (
              <Text fontSize={14} color="#6B7280" fontStyle="italic">
                No routes attached. Tap "Add Routes" to recommend driving routes for this event.
              </Text>
            )}
          </YStack>

          <Separator />

          {/* Date */}
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Event Date
            </Text>
            <Input
              value={formData.eventDate}
              onChangeText={(value) => updateFormData('eventDate', value)}
              placeholder="YYYY-MM-DD"
              backgroundColor="#1F2937"
              borderColor="rgba(255, 255, 255, 0.2)"
              color="#FFFFFF"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </YStack>

          {/* Recurrence */}
          <YStack gap={8}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Repeat Event
            </Text>
            <RecurrencePicker
              value={formData.recurrenceRule}
              onChange={(rule) => updateFormData('recurrenceRule', rule)}
              eventDate={formData.eventDate}
            />
          </YStack>

          {/* Visibility */}
          <YStack gap={12}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              Visibility
            </Text>
            <YStack gap={8}>
            {visibilityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => updateFormData('visibility', option.value)}
                  style={{
                    backgroundColor:
                      formData.visibility === option.value ? 'rgba(0, 255, 188, 0.1)' : '#1F2937',
                    borderWidth: 1,
                    borderColor:
                      formData.visibility === option.value ? '#00FFBC' : 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <XStack gap={12} alignItems="center">
                  {option.icon}
                  <YStack flex={1}>
                      <Text fontSize={16} fontWeight="600" color="#FFFFFF">
                      {option.label}
                    </Text>
                      <Text fontSize={14} color="#9CA3AF">
                      {option.description}
                    </Text>
                  </YStack>
                  {formData.visibility === option.value && (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: '#00FFBC',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text fontSize={12} color="#000000">
                        ✓
                      </Text>
                      </View>
                  )}
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>
          </YStack>

          {/* Bottom Spacing */}
          <View style={{ height: 50 }} />
        </YStack>
      </ScrollView>

      {/* Exercise Selector Modal */}
      <ExerciseSelector
        visible={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        selectedExercises={formData.embeds.exercises}
        onExercisesChange={handleExercisesChange}
      />

      {/* Route Selector Modal */}
      <RouteSelector
        visible={showRouteSelector}
        onClose={() => setShowRouteSelector(false)}
        selectedRoutes={formData.embeds.routes}
        onRoutesChange={handleRoutesChange}
      />
    </YStack>
  );
};