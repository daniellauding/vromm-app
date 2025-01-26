import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Image, Alert, useColorScheme } from 'react-native';
import { YStack, Form, Input, TextArea, XStack, Card, Separator } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Database } from '../lib/database.types';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Map, Waypoint } from '../components/Map';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { Header } from '../components/Header';
import { FormField } from '../components/FormField';
import { Region } from 'react-native-maps';

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type SpotType = Database['public']['Enums']['spot_type'];
type SpotVisibility = Database['public']['Enums']['spot_visibility'];
type Category = Database['public']['Enums']['spot_category'];

const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
const SPOT_TYPES: SpotType[] = ['urban', 'rural', 'highway', 'residential'];
const VISIBILITY_OPTIONS: SpotVisibility[] = ['public', 'private', 'school_only'];
const CATEGORIES: Category[] = ['parking', 'roundabout', 'incline_start', 'straight_driving', 'reversing', 'highway_entry_exit'];

type Exercise = {
  id: string;
  title: string;
  description: string;
  duration?: string;
  repetitions?: string;
};

type MediaItem = {
  id: string;
  type: 'image' | 'video' | 'youtube';
  uri: string;
  description?: string;
  thumbnail?: string;
};

type MediaUrl = {
  type: 'video' | 'image';
  url: string;
  description?: string;
};

type RouteData = Database['public']['Tables']['routes']['Row'] & {
  exercises?: Exercise[];
  media?: MediaItem[];
};

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
    };
  };
};

export function CreateRouteScreen({ route }: Props) {
  const routeId = route?.params?.routeId;
  const isEditing = !!routeId;
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const searchInputRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location.LocationGeocodedAddress[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [region, setRegion] = useState({
    latitude: 55.7047,
    longitude: 13.191,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({});
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion(prev => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      }
    })();
  }, []);

  useEffect(() => {
    if (isEditing && routeId) {
      loadRouteData(routeId);
    }
  }, [isEditing, routeId]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
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

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newWaypoint: Waypoint = {
      latitude,
      longitude,
      title: `Waypoint ${waypoints.length + 1}`,
    };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const handleMapPressWrapper = () => {
    // This function is required by the Map component's type,
    // but we'll handle the actual press event in the native map component
  };

  const handleLocateMe = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setRegion(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Update search input with location name
      const locationString = [
        address.street,
        address.city,
        address.region,
        address.country
      ].filter(Boolean).join(', ');

      setSearchQuery(locationString);
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  const handleAddExercise = () => {
    if (!newExercise.title) return;
    
    setExercises([...exercises, {
      id: Date.now().toString(),
      title: newExercise.title,
      description: newExercise.description || '',
      duration: newExercise.duration,
      repetitions: newExercise.repetitions,
    }]);
    setNewExercise({});
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newMedia: MediaItem = {
        id: Date.now().toString(),
        type: result.assets[0].type === 'video' ? 'video' : 'image',
        uri: result.assets[0].uri,
      };
      setMedia([...media, newMedia]);
    }
  };

  const addYoutubeLink = () => {
    const youtubeUrl = prompt('Enter YouTube video URL:');
    if (!youtubeUrl) return;

    // Extract video ID from various YouTube URL formats
    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    
    const newMedia: MediaItem = {
      id: Date.now().toString(),
      type: 'youtube',
      uri: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail,
    };
    setMedia([...media, newMedia]);
  };

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /^[a-zA-Z0-9_-]{11}$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const handleRemoveMedia = (id: string) => {
    setMedia(media.filter(m => m.id !== id));
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

    try {
      setLoading(true);
      setError(null);

      const waypointDetails = waypoints.map((wp, index) => ({
        lat: wp.latitude,
        lng: wp.longitude,
        title: wp.title || `Waypoint ${index + 1}`,
        description: wp.description
      }));

      // Upload media files to storage if they exist
      const mediaUrls: MediaUrl[] = [];
      if (media.length > 0) {
        try {
          const uploadedMedia = await Promise.all(
            media.map(async (item) => {
              // For YouTube videos, just pass through the URL
              if (item.type === 'youtube') {
                return {
                  type: 'video' as const,
                  url: item.uri,
                  description: item.description
                };
              }

              // For local files, upload to storage
              const filename = item.uri.split('/').pop();
              const ext = filename?.split('.').pop();
              const path = `route-attachments/new/${Math.random()}.${ext}`;
              
              const response = await fetch(item.uri);
              const blob = await response.blob();
              
              const { error: uploadError, data } = await supabase.storage
                .from('route-attachments')
                .upload(path, blob);

              if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
              }
              
              // Get the public URL using getPublicUrl instead of accessing storageUrl directly
              const { data: { publicUrl } } = supabase.storage
                .from('route-attachments')
                .getPublicUrl(data?.path || '');
              
              return {
                type: item.type,
                url: publicUrl,
                description: item.description
              };
            })
          );
          mediaUrls.push(...uploadedMedia);
        } catch (uploadErr) {
          console.error('Media upload error:', uploadErr);
          Alert.alert('Upload Error', 'Failed to upload media files. Try again or create route without media.');
          setLoading(false);
          return;
        }
      }

      const routeData = {
        name: formData.name,
        description: formData.description,
        difficulty: formData.difficulty,
        spot_type: formData.spot_type,
        visibility: formData.visibility,
        best_season: formData.best_season,
        best_times: formData.best_times,
        vehicle_types: formData.vehicle_types,
        activity_level: formData.activity_level,
        spot_subtype: formData.spot_subtype,
        transmission_type: formData.transmission_type,
        category: formData.category,
        creator_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: formData.visibility === 'public',
        waypoint_details: waypointDetails,
        metadata: {
          waypoints: waypointDetails,
          pins: [],
          options: {
            reverse: false,
            closeLoop: false,
            doubleBack: false
          },
          coordinates: []
        },
        suggested_exercises: exercises.length > 0 ? JSON.stringify(exercises) : '',
        media_attachments: mediaUrls,
        drawing_mode: 'waypoints'
      };

      const { error: routeError } = await supabase
        .from('routes')
        .insert(routeData);

      if (routeError) {
        console.error('Route creation error:', routeError);
        throw routeError;
      }
      
      navigation.goBack();
    } catch (err) {
      console.error('Create route error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create route. Please try again.');
    } finally {
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
        setWaypoints(route.waypoint_details.map((wp: any) => ({
          latitude: wp.lat,
          longitude: wp.lng,
          title: wp.title,
          description: wp.description,
        })));
      }

      if (route.exercises) {
        setExercises(route.exercises);
      }

      if (route.media) {
        setMedia(route.media.map((m: any) => ({
          id: m.id || Date.now().toString(),
          type: m.type,
          uri: m.url,
          description: m.description,
          thumbnail: m.type === 'youtube' && m.url ? 
            `https://img.youtube.com/vi/${extractYoutubeVideoId(m.url)}/hqdefault.jpg` : 
            undefined,
        })));
      }
    } catch (err) {
      console.error('Error loading route:', err);
      setError('Failed to load route data');
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !routeId) return;

    Alert.alert(
      'Delete Route',
      'Are you sure you want to delete this route? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('routes')
                .delete()
                .eq('id', routeId);

              if (error) throw error;
              navigation.goBack();
            } catch (err) {
              setError('Failed to delete route');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
            query // Original query as fallback
          ];

          for (const term of searchTerms) {
            results = await Location.geocodeAsync(term);
            if (results.length > 0) break;
          }
        }

        if (results.length > 0) {
          const addresses = await Promise.all(
            results.map(async result => {
              const address = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });
              return {
                ...address[0],
                coords: {
                  latitude: result.latitude,
                  longitude: result.longitude,
                }
              };
            })
          );

          // Filter out duplicates and null values
          const uniqueAddresses = addresses.filter((addr, index, self) => 
            addr && addr.coords &&
            index === self.findIndex(a => 
              a.coords?.latitude === addr.coords?.latitude && 
              a.coords?.longitude === addr.coords?.longitude
            )
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

  const handleLocationSelect = (result: (Location.LocationGeocodedAddress & { coords?: { latitude: number; longitude: number } })) => {
    if (result.coords) {
      setRegion({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Add a waypoint at the selected location
      const newWaypoint = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        title: [result.street, result.city, result.country].filter(Boolean).join(', '),
        description: 'Selected location'
      };
      setWaypoints([...waypoints, newWaypoint]);

      // Update search UI
      setSearchQuery([result.street, result.city, result.country].filter(Boolean).join(', '));
      setShowSearchResults(false);
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
            const [lat, lng] = text?.split(',').map(n => parseFloat(n.trim())) || [];
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
              }).then(([address]) => {
                if (address) {
                  // Update search input with location name
                  const locationString = [
                    address.street,
                    address.city,
                    address.region,
                    address.country
                  ].filter(Boolean).join(', ');

                  setSearchQuery(locationString);
                } else {
                  // If no address found, show coordinates
                  setSearchQuery(`${lat}, ${lng}`);
                }
              }).catch(err => {
                console.error('Error getting address:', err);
                // If reverse geocoding fails, show coordinates
                setSearchQuery(`${lat}, ${lng}`);
              });
            } else {
              Alert.alert('Invalid coordinates', 'Please enter valid latitude and longitude values');
            }
          }
        }
      ],
      'plain-text',
      searchQuery
    );
  };

  // Update region state when map region changes
  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
  };

  return (
    <Screen scroll>
      <YStack f={1} gap={24} paddingBottom={120}>
        <YStack>
          <Header title={isEditing ? 'Edit Route' : 'Create New Route'} />
          <XStack gap="$2" justifyContent="flex-end" mt="$2">
            {isEditing && (
              <Button
                onPress={handleDelete}
                variant="secondary"
                size="md"
                backgroundColor="$red10"
              >
                <XStack gap="$2" alignItems="center">
                  <Feather name="trash-2" size={18} color="white" />
                  <Text color="white">Delete</Text>
                </XStack>
              </Button>
            )}
            <Button
              onPress={() => navigation.goBack()}
              variant="secondary"
              size="md"
            >
              <XStack gap="$2" alignItems="center">
                <Feather name="x" size={18} color={iconColor} />
                <Text color="$color">Cancel</Text>
              </XStack>
            </Button>
          </XStack>
        </YStack>

        <Form onSubmit={handleCreate}>
          <YStack gap={24}>
            {/* Basic Information Card */}
            <YStack gap={24}>
              <YStack>
                <Text size="lg" weight="medium" mb="$2" color="$color">Basic Information</Text>
                <FormField
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Route Name"
                  accessibilityLabel="Route name input"
                  autoCapitalize="words"
                />
                
                <TextArea
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Description"
                  numberOfLines={4}
                  accessibilityLabel="Route description input"
                  size="md"
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                  marginTop="$2"
                />
              </YStack>

              {/* Map Card */}
              <YStack gap={16}>
                <Text size="lg" weight="medium" color="$color">Route Location</Text>
                <Text size="sm" color="$gray11">Search for a location or tap on the map</Text>

                <YStack gap="$2">
                  <XStack gap="$2">
                    <FormField
                      ref={searchInputRef}
                      flex={1}
                      value={searchQuery}
                      onChangeText={handleSearch}
                      placeholder="Search location..."
                      autoComplete="street-address"
                      autoCapitalize="none"
                      accessibilityLabel="Location search input"
                      rightElement={
                        <Button
                          onPress={handleManualCoordinates}
                          variant="secondary"
                          padding="$2"
                          backgroundColor="transparent"
                          borderWidth={0}
                        >
                          <Feather name="map-pin" size={18} color={colorScheme === 'dark' ? 'white' : 'black'} />
                        </Button>
                      }
                    />
                  </XStack>

                  {showSearchResults && searchResults.length > 0 && (
                    <Card elevate>
                      <YStack padding="$2" gap="$1">
                        {searchResults.map((result, index) => (
                          <Button
                            key={index}
                            onPress={() => handleLocationSelect(result)}
                            variant="secondary"
                            size="md"
                            justifyContent="flex-start"
                          >
                            <Text numberOfLines={1} color="$color">
                              {[result.street, result.city, result.country]
                                .filter(Boolean)
                                .join(', ')}
                            </Text>
                          </Button>
                        ))}
                      </YStack>
                    </Card>
                  )}
                </YStack>

                <View style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}>
                  <Map
                    waypoints={waypoints}
                    region={region}
                    onPress={handleMapPressWrapper}
                    style={{ flex: 1 }}
                  />
                  <Button
                    position="absolute"
                    bottom={16}
                    left={16}
                    onPress={handleLocateMe}
                    variant="primary"
                    backgroundColor="$blue10"
                    size="md"
                    opacity={0.9}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    <XStack gap="$2" alignItems="center">
                      <Feather name="crosshair" size={20} color="white" />
                      <Text color="white">Locate Me</Text>
                    </XStack>
                  </Button>
                </View>

                <Button 
                  onPress={() => setWaypoints(waypoints.slice(0, -1))}
                  disabled={waypoints.length === 0}
                  variant="secondary"
                  backgroundColor="$red10"
                  size="lg"
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="trash-2" size={18} color="white" />
                    <Text color="white">Remove Last Pin</Text>
                  </XStack>
                </Button>
              </YStack>

              {/* Exercises Card */}
              <YStack gap={16}>
                <Text size="lg" weight="medium" color="$color">Exercises</Text>
                
                <YStack gap="$3">
                  <FormField
                    value={newExercise.title || ''}
                    onChangeText={(text) => setNewExercise(prev => ({ ...prev, title: text }))}
                    placeholder="Exercise Title"
                    accessibilityLabel="Exercise title input"
                  />
                  <TextArea
                    value={newExercise.description || ''}
                    onChangeText={(text) => setNewExercise(prev => ({ ...prev, description: text }))}
                    placeholder="Exercise Description"
                    numberOfLines={2}
                    accessibilityLabel="Exercise description input"
                    size="$4"
                    backgroundColor="$backgroundHover"
                    borderColor="$borderColor"
                  />
                  <XStack gap="$3">
                    <FormField
                      flex={1}
                      value={newExercise.duration || ''}
                      onChangeText={(text) => setNewExercise(prev => ({ ...prev, duration: text }))}
                      placeholder="Duration (e.g., 30 sec)"
                      accessibilityLabel="Exercise duration input"
                    />
                    <FormField
                      flex={1}
                      value={newExercise.repetitions || ''}
                      onChangeText={(text) => setNewExercise(prev => ({ ...prev, repetitions: text }))}
                      placeholder="Repetitions"
                      accessibilityLabel="Exercise repetitions input"
                    />
                  </XStack>
                  <Button
                    onPress={handleAddExercise}
                    disabled={!newExercise.title}
                    variant="primary"
                    backgroundColor="$blue10"
                    size="lg"
                  >
                    Add Exercise
                  </Button>
                </YStack>

                {exercises.length > 0 && (
                  <YStack gap="$3">
                    {exercises.map((exercise) => (
                      <Card key={exercise.id} bordered backgroundColor="$backgroundHover">
                        <XStack padding="$3" justifyContent="space-between" alignItems="center">
                          <YStack gap="$1" flex={1}>
                            <Text weight="medium" color="$color">{exercise.title}</Text>
                            {exercise.description && (
                              <Text size="sm" color="$gray11">{exercise.description}</Text>
                            )}
                            <XStack gap="$2">
                              {exercise.duration && (
                                <Text size="sm" color="$gray11">Duration: {exercise.duration}</Text>
                              )}
                              {exercise.repetitions && (
                                <Text size="sm" color="$gray11">Reps: {exercise.repetitions}</Text>
                              )}
                            </XStack>
                          </YStack>
                          <Button
                            onPress={() => handleRemoveExercise(exercise.id)}
                            variant="secondary"
                            backgroundColor="$red10"
                            size="sm"
                          >
                            <XStack gap="$2" alignItems="center">
                              <Feather name="trash-2" size={16} color="white" />
                            </XStack>
                          </Button>
                        </XStack>
                      </Card>
                    ))}
                  </YStack>
                )}
              </YStack>

              {/* Media Card */}
              <YStack gap={16}>
                <Text size="lg" weight="medium" color="$color">Media</Text>
                <Text size="sm" color="$gray11">Add images, videos, or YouTube links</Text>

                <XStack gap="$3">
                  <Button
                    flex={1}
                    onPress={pickImage}
                    variant="primary"
                    backgroundColor="$blue10"
                    size="lg"
                  >
                    <XStack gap="$2" alignItems="center">
                      <Feather name="image" size={18} color="white" />
                      <Text color="white">Add Media</Text>
                    </XStack>
                  </Button>
                  <Button
                    flex={1}
                    onPress={addYoutubeLink}
                    variant="primary"
                    backgroundColor="$red10"
                    size="lg"
                  >
                    <XStack gap="$2" alignItems="center">
                      <Feather name="youtube" size={18} color="white" />
                      <Text color="white">Add YouTube</Text>
                    </XStack>
                  </Button>
                </XStack>

                {media.length > 0 && (
                  <YStack gap="$3">
                    {media.map((item) => (
                      <Card key={item.id} bordered backgroundColor="$backgroundHover">
                        <XStack padding="$3" gap="$3" alignItems="center">
                          {item.type === 'youtube' ? (
                            <Image
                              source={{ uri: item.thumbnail }}
                              style={{ width: 120, height: 68, borderRadius: 8 }}
                            />
                          ) : (
                            <Image
                              source={{ uri: item.uri }}
                              style={{ width: 80, height: 80, borderRadius: 8 }}
                            />
                          )}
                          <YStack flex={1} gap="$1">
                            <Text weight="medium" color="$color">
                              {item.type === 'youtube' ? 'YouTube Video' : 'Media'}
                            </Text>
                            {item.description && (
                              <Text size="sm" color="$gray11" numberOfLines={2}>
                                {item.description}
                              </Text>
                            )}
                          </YStack>
                          <Button
                            onPress={() => setMedia(media.filter(m => m.id !== item.id))}
                            variant="secondary"
                            backgroundColor="$red10"
                            size="sm"
                          >
                            <XStack gap="$2" alignItems="center">
                              <Feather name="trash-2" size={16} color="white" />
                            </XStack>
                          </Button>
                        </XStack>
                      </Card>
                    ))}
                  </YStack>
                )}
              </YStack>

              {/* Route Details Card */}
              <YStack gap={16}>
                <Text size="lg" weight="medium" color="$color">Route Details</Text>
                
                <YStack gap={16}>
                  <YStack gap="$2">
                    <Text size="sm" color="$gray11">Difficulty Level</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <Button
                          key={level}
                          onPress={() => setFormData(prev => ({ ...prev, difficulty: level }))}
                          variant={formData.difficulty === level ? "primary" : "secondary"}
                          backgroundColor={formData.difficulty === level ? "$blue10" : undefined}
                          size="lg"
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  <YStack gap="$2">
                    <Text size="sm" color="$gray11">Spot Type</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {SPOT_TYPES.map((type) => (
                        <Button
                          key={type}
                          onPress={() => setFormData(prev => ({ ...prev, spot_type: type }))}
                          variant={formData.spot_type === type ? "primary" : "secondary"}
                          backgroundColor={formData.spot_type === type ? "$blue10" : undefined}
                          size="lg"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  <YStack gap="$2">
                    <Text size="sm" color="$gray11">Category</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {CATEGORIES.map((category) => (
                        <Button
                          key={category}
                          onPress={() => setFormData(prev => ({ ...prev, category: category }))}
                          variant={formData.category === category ? "primary" : "secondary"}
                          backgroundColor={formData.category === category ? "$blue10" : undefined}
                          size="lg"
                        >
                          {category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  <YStack gap="$2">
                    <Text size="sm" color="$gray11">Visibility</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {VISIBILITY_OPTIONS.map((option) => (
                        <Button
                          key={option}
                          onPress={() => setFormData(prev => ({ ...prev, visibility: option }))}
                          variant={formData.visibility === option ? "primary" : "secondary"}
                          backgroundColor={formData.visibility === option ? "$blue10" : undefined}
                          size="lg"
                        >
                          {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>
                </YStack>
              </YStack>

              {error && (
                <Text size="sm" intent="error" textAlign="center">
                  {error}
                </Text>
              )}

              <Button 
                onPress={handleCreate}
                disabled={loading || !formData.name.trim()}
                variant="primary"
                backgroundColor="$blue10"
                size="lg"
              >
                <XStack gap="$2" alignItems="center">
                  {!loading && <Feather name="check" size={20} color="white" />}
                  <Text color="white">
                    {loading ? 'Creating...' : isEditing ? 'Save Changes' : 'Create Route'}
                  </Text>
                </XStack>
              </Button>
            </YStack>
          </YStack>
        </Form>
      </YStack>
    </Screen>
  );
} 