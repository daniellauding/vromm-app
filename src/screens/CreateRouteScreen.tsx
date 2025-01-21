import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Image, Alert } from 'react-native';
import { YStack, Form, Input, Button, Text, TextArea, XStack, Select, Card, Separator } from 'tamagui';
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

type RouteData = Database['public']['Tables']['routes']['Row'] & {
  exercises?: Exercise[];
  media?: MediaItem[];
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

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newWaypoint: Waypoint = {
      latitude,
      longitude,
      title: `Waypoint ${waypoints.length + 1}`,
    };
    setWaypoints([...waypoints, newWaypoint]);
  };

  const removeLastWaypoint = () => {
    setWaypoints(waypoints.slice(0, -1));
  };

  const handleLocateMe = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setRegion(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
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
      let mediaUrls = [];
      if (media.length > 0) {
        try {
          mediaUrls = await Promise.all(
            media.map(async (item) => {
              // For YouTube videos, just pass through the URL
              if (item.type === 'youtube') {
                return {
                  type: 'video',
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
              
              const publicUrl = `${supabase.storageUrl}/object/public/route-attachments/${data?.path}`;
              
              return {
                type: item.type,
                url: publicUrl,
                description: item.description
              };
            })
          );
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
        media_attachments: mediaUrls
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
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create route. Please try again.'
      );
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <YStack padding="$4" space="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$8" fontWeight="bold" color="$gray12">
              {isEditing ? 'Edit Route' : 'Create New Route'}
            </Text>
            <XStack space="$2">
              {isEditing && (
                <Button
                  size="$3"
                  theme="red"
                  onPress={handleDelete}
                  icon={<Feather name="trash-2" size={18} color="white" />}
                >
                  Delete
                </Button>
              )}
              <Button
                size="$3"
                theme="alt2"
                onPress={() => navigation.goBack()}
                icon={<Feather name="x" size={18} color="black" />}
              >
                Cancel
              </Button>
            </XStack>
          </XStack>

          <Form onSubmit={handleCreate}>
            <YStack space="$5">
              {/* Basic Information Card */}
              <Card bordered elevate size="$4" padding="$4">
                <YStack space="$4">
                  <Text fontSize="$6" fontWeight="600" color="$gray11">Basic Information</Text>
                  <Input
                    size="$4"
                    borderRadius="$4"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    placeholder="Route Name"
                  />
                  
                  <TextArea
                    size="$4"
                    borderRadius="$4"
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder="Description"
                    numberOfLines={4}
                  />
                </YStack>
              </Card>

              {/* Map Card */}
              <Card bordered elevate size="$4" padding="$4">
                <YStack space="$4">
                  <Text fontSize="$6" fontWeight="600" color="$gray11">Route Location</Text>
                  <Text fontSize="$3" color="$gray10">Search for a location or tap on the map</Text>

                  <YStack space="$2">
                    <XStack space="$2">
                      <Input
                        ref={searchInputRef}
                        flex={1}
                        size="$4"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholder="Search location..."
                        borderRadius="$4"
                        autoComplete="street-address"
                        autoCapitalize="none"
                      />
                      <Button
                        size="$4"
                        theme="blue"
                        onPress={handleManualCoordinates}
                        icon={<Feather name="map-pin" size={18} color="white" />}
                      />
                    </XStack>

                    {showSearchResults && searchResults.length > 0 && (
                      <Card bordered size="$2" padding="$2">
                        <YStack space="$1">
                          {searchResults.map((result, index) => {
                            const coords = result.region?.split(',').map(Number);
                            if (!coords || coords.length !== 2) return null;
                            
                            return (
                              <Button
                                key={index}
                                size="$3"
                                theme="alt2"
                                justifyContent="flex-start"
                                onPress={() => handleLocationSelect(result)}
                              >
                                <Text numberOfLines={1}>
                                  {[result.street, result.city, result.country]
                                    .filter(Boolean)
                                    .join(', ')}
                                </Text>
                              </Button>
                            );
                          })}
                        </YStack>
                      </Card>
                    )}
                  </YStack>

                  <View style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}>
                    <Map
                      waypoints={waypoints}
                      region={region}
                      onPress={handleMapPress}
                      onRegionChangeComplete={setRegion}
                      showControls
                    />
                    <Button
                      position="absolute"
                      bottom={16}
                      left={16}
                      icon={<Feather name="crosshair" size={20} color="white" />}
                      onPress={handleLocateMe}
                      backgroundColor="$blue10"
                      borderRadius="$6"
                      opacity={0.9}
                      pressStyle={{ opacity: 0.7 }}
                    >
                      Locate Me
                    </Button>
                  </View>

                  <XStack space="$4">
                    <Button 
                      flex={1}
                      onPress={removeLastWaypoint} 
                      disabled={waypoints.length === 0}
                      theme="red"
                      icon={<Feather name="trash-2" size={18} color="white" />}
                      borderRadius="$6"
                    >
                      Remove Last Pin
                    </Button>
                  </XStack>
                </YStack>
              </Card>

              {/* Exercises Card */}
              <Card bordered elevate size="$4" padding="$4">
                <YStack space="$4">
                  <Text fontSize="$6" fontWeight="600" color="$gray11">Exercises</Text>
                  
                  <YStack space="$3">
                    <Input
                      size="$4"
                      value={newExercise.title || ''}
                      onChangeText={(text) => setNewExercise(prev => ({ ...prev, title: text }))}
                      placeholder="Exercise Title"
                    />
                    <TextArea
                      size="$4"
                      value={newExercise.description || ''}
                      onChangeText={(text) => setNewExercise(prev => ({ ...prev, description: text }))}
                      placeholder="Exercise Description"
                      numberOfLines={2}
                    />
                    <XStack space="$3">
                      <Input
                        flex={1}
                        size="$4"
                        value={newExercise.duration || ''}
                        onChangeText={(text) => setNewExercise(prev => ({ ...prev, duration: text }))}
                        placeholder="Duration (e.g., 30 sec)"
                      />
                      <Input
                        flex={1}
                        size="$4"
                        value={newExercise.repetitions || ''}
                        onChangeText={(text) => setNewExercise(prev => ({ ...prev, repetitions: text }))}
                        placeholder="Repetitions"
                      />
                    </XStack>
                    <Button
                      onPress={handleAddExercise}
                      disabled={!newExercise.title}
                      icon={<Feather name="plus" size={18} color="white" />}
                      backgroundColor="$blue10"
                    >
                      Add Exercise
                    </Button>
                  </YStack>

                  {exercises.length > 0 && (
                    <YStack space="$3" marginTop="$3">
                      <Text fontSize="$3" color="$gray10">Added Exercises</Text>
                      {exercises.map((exercise) => (
                        <Card key={exercise.id} bordered size="$2" padding="$3">
                          <XStack justifyContent="space-between" alignItems="center">
                            <YStack flex={1}>
                              <Text fontWeight="600">{exercise.title}</Text>
                              {exercise.description && (
                                <Text fontSize="$2" color="$gray11">{exercise.description}</Text>
                              )}
                              <XStack space="$2" marginTop="$1">
                                {exercise.duration && (
                                  <Text fontSize="$2" color="$blue10">Duration: {exercise.duration}</Text>
                                )}
                                {exercise.repetitions && (
                                  <Text fontSize="$2" color="$blue10">Reps: {exercise.repetitions}</Text>
                                )}
                              </XStack>
                            </YStack>
                            <Button
                              size="$2"
                              theme="red"
                              onPress={() => handleRemoveExercise(exercise.id)}
                              icon={<Feather name="trash-2" size={16} color="white" />}
                            />
                          </XStack>
                        </Card>
                      ))}
                    </YStack>
                  )}
                </YStack>
              </Card>

              {/* Media Card */}
              <Card bordered elevate size="$4" padding="$4">
                <YStack space="$4">
                  <Text fontSize="$6" fontWeight="600" color="$gray11">Media</Text>
                  <Text fontSize="$3" color="$gray10">Add images, videos, or YouTube links</Text>

                  <XStack space="$3">
                    <Button
                      flex={1}
                      onPress={pickImage}
                      icon={<Feather name="image" size={18} color="white" />}
                      backgroundColor="$blue10"
                    >
                      Add Media
                    </Button>
                    <Button
                      flex={1}
                      onPress={addYoutubeLink}
                      icon={<Feather name="youtube" size={18} color="white" />}
                      backgroundColor="$red10"
                    >
                      Add YouTube
                    </Button>
                  </XStack>

                  {media.length > 0 && (
                    <YStack space="$3">
                      {media.map((item) => (
                        <Card key={item.id} bordered size="$2" padding="$3">
                          <XStack space="$3" alignItems="center">
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
                            <YStack flex={1}>
                              <Text fontWeight="600">
                                {item.type === 'youtube' ? 'YouTube Video' : 
                                 item.type === 'video' ? 'Video' : 'Image'}
                              </Text>
                              {item.type === 'youtube' && (
                                <Text fontSize="$2" color="$gray11" numberOfLines={1} ellipsizeMode="middle">
                                  {item.uri}
                                </Text>
                              )}
                              <Input
                                size="$3"
                                value={item.description || ''}
                                onChangeText={(text) => {
                                  setMedia(media.map(m => 
                                    m.id === item.id ? { ...m, description: text } : m
                                  ));
                                }}
                                placeholder="Add description"
                              />
                            </YStack>
                            <Button
                              size="$2"
                              theme="red"
                              onPress={() => handleRemoveMedia(item.id)}
                              icon={<Feather name="trash-2" size={16} color="white" />}
                            />
                          </XStack>
                        </Card>
                      ))}
                    </YStack>
                  )}
                </YStack>
              </Card>

              {/* Route Details Card */}
              <Card bordered elevate size="$4" padding="$4">
                <YStack space="$4">
                  <Text fontSize="$6" fontWeight="600" color="$gray11">Route Details</Text>
                  
                  <YStack space="$3">
                    <Text fontSize="$3" color="$gray10">Difficulty Level</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {DIFFICULTY_LEVELS.map((level) => (
                        <Button
                          key={level}
                          size="$3"
                          theme={formData.difficulty === level ? "active" : "alt2"}
                          onPress={() => setFormData(prev => ({ ...prev, difficulty: level }))}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  <YStack space="$3">
                    <Text fontSize="$3" color="$gray10">Spot Type</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {SPOT_TYPES.map((type) => (
                        <Button
                          key={type}
                          size="$3"
                          theme={formData.spot_type === type ? "active" : "alt2"}
                          onPress={() => setFormData(prev => ({ ...prev, spot_type: type }))}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  <YStack space="$3">
                    <Text fontSize="$3" color="$gray10">Category</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {CATEGORIES.map((category) => (
                        <Button
                          key={category}
                          size="$3"
                          theme={formData.category === category ? "active" : "alt2"}
                          onPress={() => setFormData(prev => ({ ...prev, category: category }))}
                        >
                          {category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>

                  <YStack space="$3">
                    <Text fontSize="$3" color="$gray10">Visibility</Text>
                    <XStack flexWrap="wrap" gap="$2">
                      {VISIBILITY_OPTIONS.map((option) => (
                        <Button
                          key={option}
                          size="$3"
                          theme={formData.visibility === option ? "active" : "alt2"}
                          onPress={() => setFormData(prev => ({ ...prev, visibility: option }))}
                        >
                          {option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Button>
                      ))}
                    </XStack>
                  </YStack>
                </YStack>
              </Card>

              {error ? (
                <Text color="$red10" fontSize="$3">{error}</Text>
              ) : null}

              <Button 
                themeInverse
                onPress={handleCreate}
                disabled={loading || !formData.name.trim()}
                size="$5"
                borderRadius="$6"
                pressStyle={{ opacity: 0.8 }}
                icon={loading ? undefined : <Feather name="check" size={20} color="white" />}
              >
                {loading ? 'Creating...' : 'Create Route'}
              </Button>
            </YStack>
          </Form>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
} 