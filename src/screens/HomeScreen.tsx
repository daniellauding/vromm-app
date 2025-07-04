import React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { YStack, XStack, Card, Separator, ScrollView, Select } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { RouteList } from '../components/RouteList';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import type { Route, MediaAttachment } from '../hooks/useRoutes';
import {
  Image,
  ImageSourcePropType,
  Platform,
  PermissionsAndroid,
  Animated,
  Pressable,
  Modal,
  View,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useScreenLogger } from '../hooks/useScreenLogger';
import { logNavigation, logError, logWarn, logInfo } from '../utils/logger';
import { OnboardingModal } from '../components/OnboardingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowOnboarding } from '../components/Onboarding';
import { useTranslation } from '../contexts/TranslationContext';
import { HeroCarousel } from '../components/HeroCarousel';
import { ProgressSection } from '../components/ProgressSection';
import * as Location from 'expo-location';
import type { FilterCategory } from '../types/navigation';
import { Easing } from 'react-native';
import { RouteType } from '../types/route';
import { RouteCard } from '../components/RouteCard';
import { SectionHeader } from '../components/SectionHeader';
import { UsersList } from '../components/UsersList';

type Todo = {
  id: string;
  title: string;
  is_completed: boolean;
  metadata: {
    routeId?: string;
    routeName?: string;
    subtasks?: { id: string; title: string; is_completed: boolean }[];
    attachments?: { url: string; type: string; description?: string }[];
  };
};

type TodoFromDB = {
  id: string;
  title: string;
  is_completed: boolean | null;
  metadata: Todo['metadata'];
  assigned_by: string | null;
  assigned_to: string | null;
  created_at: string;
  description: string | null;
  due_date: string | null;
  updated_at: string;
};

type SavedRouteFromDB = {
  id: string;
  route_id: string | null;
  user_id: string | null;
  saved_at: string | null;
  routes: Route | null;
};

type SavedRoute = Route & {
  saved_at: string;
};

type DrivenRouteFromDB = {
  id: string;
  route_id: string | null;
  user_id: string | null;
  driven_at: string | null;
  routes: Route | null;
};

type DrivenRoute = Route & {
  driven_at: string;
};

// Update the Route type to include creator id
type Route = {
  id: string;
  name: string;
  description?: string;
  difficulty?: string;
  spot_type?: string;
  creator_id?: string;
  creator?: {
    id: string;
    full_name: string;
  };
  // Rest of the route properties...
};

const isValidRoute = (route: any): route is Route => {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    Array.isArray(route.media_attachments)
  );
};

// Helper functions (outside component)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// Helper function to extract city from address
const extractCityFromAddress = (address: string): string => {
  // If the address contains a comma, take the part before the last comma
  if (address.includes(',')) {
    const parts = address.split(',');
    // Try to get the city part (usually the second to last part)
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
  }
  // If no comma or can't extract city, return the original string
  return address;
};

// Update the getCityFromWaypoints function
const getCityFromWaypoints = (route: Route): string => {
  if (!route.waypoint_details || route.waypoint_details.length === 0) {
    return 'Unknown';
  }
  const waypoint = route.waypoint_details[0];
  return extractCityFromAddress(waypoint.title || 'Unknown');
};

export function HomeScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { fetchRoutes } = useRoutes();
  const { t } = useTranslation();
  
  // Add comprehensive logging
  const { logAction, logAsyncAction, logRenderIssue, logMemoryWarning } = useScreenLogger({
    screenName: 'HomeScreen',
    trackPerformance: true,
    trackMemory: true,
  });

  // State declarations
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [drivenRoutes, setDrivenRoutes] = useState<DrivenRoute[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [nearbyRoutes, setNearbyRoutes] = useState<Route[]>([]);
  const [routesByCity, setRoutesByCity] = useState<{ [key: string]: Route[] }>({});
  const [allFilters, setAllFilters] = useState<FilterCategory[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isCityMenuVisible, setIsCityMenuVisible] = useState(false);
  const [createdRoutes, setCreatedRoutes] = useState<Route[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const cityBackdropOpacity = useRef(new Animated.Value(0)).current;
  const citySheetTranslateY = useRef(new Animated.Value(300)).current;

  // Add progressSectionKey state
  const [progressSectionKey, setProgressSectionKey] = useState(Date.now());

  // Reset progress section key when screen comes into focus (less frequently)
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen: Screen focused, refreshing ProgressSection');
      setProgressSectionKey(Date.now());
      
      // Only refresh data if it's been more than 5 minutes since last load
      const checkAndRefresh = async () => {
        try {
          const now = Date.now();
          const lastRefresh = await AsyncStorage.getItem('lastHomeRefresh');
          if (!lastRefresh || now - parseInt(lastRefresh) > 300000) { // 5 minutes
            loadRoutes();
            loadTodos();
            loadCreatedRoutes();
            await AsyncStorage.setItem('lastHomeRefresh', now.toString());
          }
        } catch (error) {
          console.warn('Error checking refresh time:', error);
        }
      };
      
      checkAndRefresh();
    }, []),
  );

  // Location and route organization effects
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
        }
      } catch (err) {
        console.warn('Error getting location:', err);
      }
    };

    requestLocationPermission();
  }, []);

  // Route organization and filtering
  useEffect(() => {
    if (routes.length > 0) {
      // Organize routes by city
      const cityMap: { [key: string]: Route[] } = {};
      routes.forEach((route) => {
        const city = getCityFromWaypoints(route);
        if (!cityMap[city]) {
          cityMap[city] = [];
        }
        cityMap[city].push(route);
      });
      setRoutesByCity(cityMap);

      // Extract filters
      const filterMap = new Map<string, FilterCategory>();

      routes.forEach((route) => {
        // Difficulty
        if (route.difficulty) {
          filterMap.set(`difficulty-${route.difficulty}`, {
            id: `difficulty-${route.difficulty}`,
            label: route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1),
            value: route.difficulty,
            type: 'difficulty',
          });
        }

        // Spot Type
        if (route.spot_type) {
          filterMap.set(`spot-${route.spot_type}`, {
            id: `spot-${route.spot_type}`,
            label:
              route.spot_type.replace(/_/g, ' ').charAt(0).toUpperCase() + route.spot_type.slice(1),
            value: route.spot_type,
            type: 'spot_type',
          });
        }

        // Category
        if (route.category) {
          filterMap.set(`category-${route.category}`, {
            id: `category-${route.category}`,
            label:
              route.category.replace(/_/g, ' ').charAt(0).toUpperCase() + route.category.slice(1),
            value: route.category,
            type: 'category',
          });
        }

        // Transmission Type
        if (route.transmission_type) {
          filterMap.set(`transmission-${route.transmission_type}`, {
            id: `transmission-${route.transmission_type}`,
            label:
              route.transmission_type.replace(/_/g, ' ').charAt(0).toUpperCase() +
              route.transmission_type.slice(1),
            value: route.transmission_type,
            type: 'transmission_type',
          });
        }

        // Activity Level
        if (route.activity_level) {
          filterMap.set(`activity-${route.activity_level}`, {
            id: `activity-${route.activity_level}`,
            label:
              route.activity_level.replace(/_/g, ' ').charAt(0).toUpperCase() +
              route.activity_level.slice(1),
            value: route.activity_level,
            type: 'activity_level',
          });
        }

        // Best Season
        if (route.best_season) {
          filterMap.set(`season-${route.best_season}`, {
            id: `season-${route.best_season}`,
            label:
              route.best_season.replace(/-/g, ' ').charAt(0).toUpperCase() +
              route.best_season.slice(1),
            value: route.best_season,
            type: 'best_season',
          });
        }

        // Vehicle Types
        if (route.vehicle_types && Array.isArray(route.vehicle_types)) {
          route.vehicle_types.forEach((type) => {
            filterMap.set(`vehicle-${type}`, {
              id: `vehicle-${type}`,
              label: type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1),
              value: type,
              type: 'vehicle_types',
            });
          });
        }
      });

      setAllFilters(Array.from(filterMap.values()));

      // Update nearby routes if we have location
      if (userLocation) {
        const routesWithDistance = routes.map((route) => {
          if (!route.waypoint_details?.[0]) return { route, distance: Infinity };

          const distance = calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            route.waypoint_details[0].lat,
            route.waypoint_details[0].lng,
          );

          return { route, distance };
        });

        const closest = routesWithDistance
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3)
          .map((item) => item.route);

        setNearbyRoutes(closest);
      }
    }
  }, [routes, userLocation]);

  // City selection effect
  useEffect(() => {
    if (!selectedCity && routesByCity && userLocation) {
      const cities = Object.keys(routesByCity);
      let closestCity = null;
      let shortestDistance = Infinity;

      cities.forEach((city) => {
        const cityRoutes = routesByCity[city];
        if (cityRoutes && cityRoutes.length > 0) {
          const route = cityRoutes[0];
          if (route.waypoint_details && route.waypoint_details.length > 0) {
            const waypoint = route.waypoint_details[0];
            const distance = calculateDistance(
              userLocation.coords.latitude,
              userLocation.coords.longitude,
              waypoint.lat,
              waypoint.lng,
            );
            if (distance < shortestDistance) {
              shortestDistance = distance;
              closestCity = city;
            }
          }
        }
      });

      if (closestCity) {
        setSelectedCity(closestCity);
      } else if (cities.length > 0) {
        setSelectedCity(cities[0]);
      }
    }
  }, [routesByCity, userLocation, selectedCity]);

  // Modal handlers
  const showCityModal = () => {
    setIsCityMenuVisible(true);
    Animated.timing(cityBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(citySheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const hideCityModal = () => {
    Animated.timing(cityBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(citySheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsCityMenuVisible(false);
    });
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    hideCityModal();
  };

  const handleSeeAllPress = (type: RouteType) => {
    navigation.navigate('RouteList', {
      type,
      title: type === 'created' ? t('home.createdRoutes') : t('home.nearbyRoutes'),
      routes: type === 'created' ? createdRoutes : nearbyRoutes,
    });
  };

  // Check if this is the first login and should show onboarding
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const key = 'vromm_first_login';
        const firstLoginValue = await AsyncStorage.getItem(key);

        if (firstLoginValue === null) {
          // First time login detected
          setIsFirstLogin(true);
          setShowOnboarding(true);
          await AsyncStorage.setItem(key, 'false');
        } else {
          // Ensure we respect the user's choice to not see onboarding again
          // Only check regular onboarding flag for first-time users or when there's a version change
          const shouldShow = await shouldShowOnboarding('vromm_onboarding');

          // Don't show onboarding if user has already seen it (unless there's a version update)
          setShowOnboarding(shouldShow);
        }
      } catch (error) {
        console.error('Error checking first login status:', error);
      }
    };

    if (user) {
      checkFirstLogin();
    }
  }, [user]);

  const loadTodos = async () => {
    if (!user) return;
    
    return logAsyncAction('loadTodos', async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to ensure is_completed is always boolean
      const transformedTodos: Todo[] = (data as TodoFromDB[]).map((todo) => ({
        id: todo.id,
        title: todo.title,
        is_completed: Boolean(todo.is_completed),
        metadata: todo.metadata,
      }));

      setTodos(transformedTodos);
      logInfo(`Loaded ${transformedTodos.length} todos`, null, 'HomeScreen');
    }, { userId: user?.id });
  };

  const handleToggleTodo = async (todoId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: !currentStatus })
        .eq('id', todoId);

      if (error) throw error;
      await loadTodos();
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  };

  const loadRoutes = useCallback(async () => {
    return logAsyncAction('loadRoutes', async () => {
      const data = await fetchRoutes();
      setRoutes(data);
      logInfo(`Loaded ${data.length} routes`, null, 'HomeScreen');
    });
  }, []); // Remove dependencies to prevent infinite loops

  const loadSavedRoutes = async () => {
    if (!user) return;
    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_routes')
        .select('*, routes(*, creator:creator_id(id, full_name))')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (savedError) throw savedError;

      const transformedRoutes = (savedData as SavedRouteFromDB[])
        .filter((item) => item.saved_at && item.routes && isValidRoute(item.routes))
        .map((item) => {
          // We know routes is not null from the filter
          const route = item.routes!;
          return {
            ...route,
            saved_at: item.saved_at as string,
            id: route.id,
            name: route.name,
            media_attachments: route.media_attachments || [],
            difficulty: route.difficulty || null,
            spot_type: route.spot_type || null,
            category: route.category || null,
            description: route.description || null,
            waypoint_details: route.waypoint_details || [],
            creator_id: route.creator_id,
            created_at: route.created_at,
            updated_at: route.updated_at,
          };
        }) as SavedRoute[];

      setSavedRoutes(transformedRoutes);
    } catch (err) {
      console.error('Error loading saved routes:', err);
    }
  };

  const loadDrivenRoutes = async () => {
    if (!user) return;
    try {
      const { data: drivenData, error: drivenError } = await supabase
        .from('driven_routes')
        .select('*, routes(*, creator:creator_id(id, full_name))')
        .eq('user_id', user.id)
        .not('driven_at', 'is', null)
        .order('driven_at', { ascending: false });

      if (drivenError) throw drivenError;

      const transformedRoutes = (drivenData as DrivenRouteFromDB[])
        .filter((item) => item.driven_at && item.routes && isValidRoute(item.routes))
        .map((item) => {
          // We know routes is not null from the filter
          const route = item.routes!;
          return {
            ...route,
            driven_at: item.driven_at as string,
            id: route.id,
            name: route.name,
            media_attachments: route.media_attachments || [],
            difficulty: route.difficulty || null,
            spot_type: route.spot_type || null,
            category: route.category || null,
            description: route.description || null,
            waypoint_details: route.waypoint_details || [],
            creator_id: route.creator_id,
            created_at: route.created_at,
            updated_at: route.updated_at,
          };
        }) as DrivenRoute[];

      setDrivenRoutes(transformedRoutes);
    } catch (err) {
      console.error('Error loading driven routes:', err);
    }
  };

  // Load created routes
  const loadCreatedRoutes = async () => {
    if (!user) return;
    try {
      const { data: createdData, error: createdError } = await supabase
        .from('routes')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;

      setCreatedRoutes(createdData as Route[]);
    } catch (err) {
      console.error('Error loading created routes:', err);
    }
  };

  // Add real-time subscription for driven routes
  useEffect(() => {
    if (!user) return;

    // Subscribe to changes in driven_routes table
    const drivenSubscription = supabase
      .channel('driven_routes_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'driven_routes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Reload driven routes when any change occurs
          loadDrivenRoutes();
        },
      )
      .subscribe();

    // Subscribe to changes in saved_routes table
    const savedSubscription = supabase
      .channel('saved_routes_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'saved_routes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Reload saved routes when any change occurs
          loadSavedRoutes();
        },
      )
      .subscribe();

    // Initial load
    loadDrivenRoutes();
    loadSavedRoutes();

    // Cleanup subscriptions on unmount
    return () => {
      drivenSubscription.unsubscribe();
      savedSubscription.unsubscribe();
    };
  }, [user]);

  // Load data only once when component mounts
  useEffect(() => {
    loadRoutes();
    loadTodos();
    loadCreatedRoutes();
  }, []); // Remove loadRoutes dependency to prevent infinite loops

  // Update handleRefresh to include loadCreatedRoutes
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadRoutes(), loadTodos(), loadCreatedRoutes()]);
      // Also refresh progress section
      setProgressSectionKey(Date.now());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRouteImage: (route: Route) => string | null = (route) => {
    if (!route.media_attachments || !Array.isArray(route.media_attachments)) {
      return null;
    }

    for (const attachment of route.media_attachments) {
      if (
        attachment &&
        typeof attachment === 'object' &&
        'type' in attachment &&
        attachment.type === 'image' &&
        'url' in attachment &&
        typeof attachment.url === 'string'
      ) {
        return attachment.url;
      }
    }

    return null;
  };

  const renderHorizontalRouteList = (
    routes: Route[],
    imageGetter: (route: Route) => string | null,
  ) => {
    if (routes.length === 0) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
        <XStack gap="$3" paddingVertical="$2">
          {routes.map((route) => {
            const imageUrl = imageGetter(route);
            return (
              <Card
                key={route.id}
                bordered
                elevate
                backgroundColor="$backgroundStrong"
                width={200}
                height={240}
                onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
              >
                <YStack f={1}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl } as ImageSourcePropType}
                      style={{
                        width: '100%',
                        height: 120,
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <YStack
                      height={120}
                      backgroundColor="$gray5"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Feather name="image" size={32} color="$gray11" />
                    </YStack>
                  )}
                  <YStack padding="$3" gap="$1" flex={1}>
                    <Text size="md" weight="bold" numberOfLines={1} ellipsizeMode="tail">
                      {route.name}
                    </Text>
                    <XStack space="$1" alignItems="center" marginTop="$1">
                      <Feather
                        name="user"
                        size={14}
                        color={colorScheme === 'dark' ? 'white' : 'black'}
                      />
                      <Text
                        color="$gray11"
                        size="xs"
                        onPress={() => {
                          if (route.creator?.id) {
                            navigation.navigate('PublicProfile', { userId: route.creator.id });
                          }
                        }}
                        pressStyle={{ opacity: 0.7 }}
                      >
                        {route.creator?.full_name || 'Unknown'}
                      </Text>
                    </XStack>
                    <Text size="sm" color="$gray11">
                      {route.difficulty?.toUpperCase()}
                    </Text>
                    {route.description && (
                      <Text size="sm" color="$gray11" numberOfLines={2} ellipsizeMode="tail">
                        {route.description}
                      </Text>
                    )}
                  </YStack>
                </YStack>
              </Card>
            );
          })}
        </XStack>
      </ScrollView>
    );
  };

  const renderFullWidthRouteList = (
    routes: Route[],
    imageGetter: (route: Route) => string | null,
  ) => {
    if (routes.length === 0) return null;

    return (
      <YStack gap="$3" paddingHorizontal="$4">
        {routes.map((route) => {
          const imageUrl = imageGetter(route);
          return (
            <Card
              key={route.id}
              bordered
              elevate
              backgroundColor="$backgroundStrong"
              width="100%"
              height={280}
              onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
            >
              <YStack f={1}>
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl } as ImageSourcePropType}
                    style={{
                      width: '100%',
                      height: 180,
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <YStack
                    height={180}
                    backgroundColor="$gray5"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Feather name="image" size={32} color="$gray11" />
                  </YStack>
                )}
                <YStack padding="$3" gap="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text size="lg" weight="bold" numberOfLines={1} ellipsizeMode="tail">
                        {route.name}
                      </Text>
                      <XStack space="$1" alignItems="center" marginTop="$1">
                        <Feather
                          name="user"
                          size={14}
                          color={colorScheme === 'dark' ? 'white' : 'black'}
                        />
                        <Text
                          color="$gray11"
                          size="xs"
                          onPress={() => {
                            if (route.creator?.id) {
                              navigation.navigate('PublicProfile', { userId: route.creator.id });
                            }
                          }}
                          pressStyle={{ opacity: 0.7 }}
                        >
                          {route.creator?.full_name || 'Unknown'}
                        </Text>
                      </XStack>
                      <Text size="sm" color="$gray11">
                        {route.difficulty?.toUpperCase()}
                      </Text>
                    </YStack>
                    {userLocation && (
                      <Text size="sm" color="$gray11">
                        {/* TODO: Calculate actual distance */}
                        2.5 km away
                      </Text>
                    )}
                  </XStack>
                  {route.description && (
                    <Text size="sm" color="$gray11" numberOfLines={2} ellipsizeMode="tail">
                      {route.description}
                    </Text>
                  )}
                </YStack>
              </YStack>
            </Card>
          );
        })}
      </YStack>
    );
  };

  const renderEmptyState = (title: string, message: string) => (
    <Card bordered elevate backgroundColor="$backgroundStrong" padding="$4">
      <YStack alignItems="center" gap="$2">
        <Feather name="info" size={24} color="$gray11" />
        <Text size="lg" weight="bold">
          {title}
        </Text>
        <Text size="sm" color="$gray11" textAlign="center">
          {message}
        </Text>
      </YStack>
    </Card>
  );

  // Organize routes by city
  const organizeRoutesByCity = useCallback((routes: Route[]) => {
    const cityMap: { [key: string]: Route[] } = {};
    routes.forEach((route) => {
      const city = getCityFromWaypoints(route);
      if (!cityMap[city]) {
        cityMap[city] = [];
      }
      cityMap[city].push(route);
    });
    setRoutesByCity(cityMap);
  }, []);

  // Extract all possible filters from routes
  const extractAllFilters = useCallback((routes: Route[]) => {
    const filterMap = new Map<string, FilterCategory>();

    routes.forEach((route) => {
      // Difficulty
      if (route.difficulty) {
        filterMap.set(`difficulty-${route.difficulty}`, {
          id: `difficulty-${route.difficulty}`,
          label: route.difficulty.charAt(0).toUpperCase() + route.difficulty.slice(1),
          value: route.difficulty,
          type: 'difficulty',
        });
      }

      // Spot Type
      if (route.spot_type) {
        filterMap.set(`spot-${route.spot_type}`, {
          id: `spot-${route.spot_type}`,
          label:
            route.spot_type.replace(/_/g, ' ').charAt(0).toUpperCase() + route.spot_type.slice(1),
          value: route.spot_type,
          type: 'spot_type',
        });
      }

      // Category
      if (route.category) {
        filterMap.set(`category-${route.category}`, {
          id: `category-${route.category}`,
          label:
            route.category.replace(/_/g, ' ').charAt(0).toUpperCase() + route.category.slice(1),
          value: route.category,
          type: 'category',
        });
      }

      // Transmission Type
      if (route.transmission_type) {
        filterMap.set(`transmission-${route.transmission_type}`, {
          id: `transmission-${route.transmission_type}`,
          label:
            route.transmission_type.replace(/_/g, ' ').charAt(0).toUpperCase() +
            route.transmission_type.slice(1),
          value: route.transmission_type,
          type: 'transmission_type',
        });
      }

      // Activity Level
      if (route.activity_level) {
        filterMap.set(`activity-${route.activity_level}`, {
          id: `activity-${route.activity_level}`,
          label:
            route.activity_level.replace(/_/g, ' ').charAt(0).toUpperCase() +
            route.activity_level.slice(1),
          value: route.activity_level,
          type: 'activity_level',
        });
      }

      // Best Season
      if (route.best_season) {
        filterMap.set(`season-${route.best_season}`, {
          id: `season-${route.best_season}`,
          label:
            route.best_season.replace(/-/g, ' ').charAt(0).toUpperCase() +
            route.best_season.slice(1),
          value: route.best_season,
          type: 'best_season',
        });
      }

      // Vehicle Types
      if (route.vehicle_types && Array.isArray(route.vehicle_types)) {
        route.vehicle_types.forEach((type) => {
          filterMap.set(`vehicle-${type}`, {
            id: `vehicle-${type}`,
            label: type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.slice(1),
            value: type,
            type: 'vehicle_types',
          });
        });
      }
    });

    setAllFilters(Array.from(filterMap.values()));
  }, []);

  const handleFilterPress = (filter: FilterCategory) => {
    navigation.navigate('RouteList', {
      title: `${filter.label} Routes`,
      routes: routes.filter((route) => {
        switch (filter.type) {
          case 'difficulty':
            return route.difficulty === filter.value;
          case 'spot_type':
            return route.spot_type === filter.value;
          case 'category':
            return route.category === filter.value;
          case 'transmission_type':
            return route.transmission_type === filter.value;
          case 'activity_level':
            return route.activity_level === filter.value;
          case 'best_season':
            return route.best_season === filter.value;
          case 'vehicle_types':
            return route.vehicle_types?.includes(filter.value);
          default:
            return false;
        }
      }),
      type: filter.type,
      activeFilter: filter,
    });
  };

  // Restore quick filters functionality
  const renderQuickFilters = () => (
    <YStack gap="$2">
      <SectionHeader title="Quick Filters" />
      <XStack flexWrap="wrap" gap="$2" paddingHorizontal="$4">
        {allFilters.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant="secondary"
            onPress={() => handleFilterPress(filter)}
            marginBottom="$2"
          >
            <Text numberOfLines={1}>{filter.label}</Text>
          </Button>
        ))}
      </XStack>
    </YStack>
  );

  // Render routes for selected city
  const renderCityRoutes = () => {
    if (!selectedCity) return null;
    const cityRoutes = routesByCity[selectedCity] || [];

    return (
      <YStack gap="$4">
        <SectionHeader
          title={selectedCity || 'Select a city'}
          variant="dropdown"
          onAction={showCityModal}
          actionLabel={selectedCity || 'Select'}
        />
        <YStack gap="$3" px="$4">
          {cityRoutes.length > 0
            ? cityRoutes.slice(0, 3).map((route) => (
                <Card
                  key={route.id}
                  bordered
                  elevate
                  backgroundColor="$backgroundStrong"
                  width="100%"
                  height={280}
                  onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
                >
                  <YStack f={1}>
                    {getRouteImage(route) ? (
                      <Image
                        source={{ uri: getRouteImage(route) } as ImageSourcePropType}
                        style={{
                          width: '100%',
                          height: 180,
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <YStack
                        height={180}
                        backgroundColor="$gray5"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Feather name="image" size={32} color="$gray11" />
                      </YStack>
                    )}
                    <YStack padding="$3" gap="$2">
                      <XStack justifyContent="space-between" alignItems="center">
                        <YStack>
                          <Text size="lg" weight="bold" numberOfLines={1} ellipsizeMode="tail">
                            {route.name}
                          </Text>
                          <XStack space="$1" alignItems="center" marginTop="$1">
                            <Feather
                              name="user"
                              size={14}
                              color={colorScheme === 'dark' ? 'white' : 'black'}
                            />
                            <Text
                              color="$gray11"
                              size="xs"
                              onPress={() => {
                                if (route.creator?.id) {
                                  navigation.navigate('PublicProfile', {
                                    userId: route.creator.id,
                                  });
                                }
                              }}
                              pressStyle={{ opacity: 0.7 }}
                            >
                              {route.creator?.full_name || 'Unknown'}
                            </Text>
                          </XStack>
                          <Text size="sm" color="$gray11">
                            {route.difficulty?.toUpperCase()}
                          </Text>
                        </YStack>
                        {userLocation && route.waypoint_details?.[0] && (
                          <Text size="sm" color="$gray11">
                            {calculateDistance(
                              userLocation.coords.latitude,
                              userLocation.coords.longitude,
                              route.waypoint_details[0].lat,
                              route.waypoint_details[0].lng,
                            ).toFixed(1)}{' '}
                            km away
                          </Text>
                        )}
                      </XStack>
                      {route.description && (
                        <Text size="sm" color="$gray11" numberOfLines={2} ellipsizeMode="tail">
                          {route.description}
                        </Text>
                      )}
                    </YStack>
                  </YStack>
                </Card>
              ))
            : renderEmptyState('No Routes', 'No routes available in this city yet')}
        </YStack>
      </YStack>
    );
  };

  // Fetch completed exercises
  useEffect(() => {
    if (!user) return;

    const fetchCompletedExercises = async () => {
      try {
        const { data, error } = await supabase
          .from('learning_path_exercise_completions')
          .select('exercise_id')
          .eq('user_id', user.id);

        if (!error && data) {
          setCompletedIds(data.map((c: any) => c.exercise_id));
        } else {
          setCompletedIds([]);
        }
      } catch (err) {
        console.error('Error fetching completed exercises:', err);
        setCompletedIds([]);
      }
    };

    fetchCompletedExercises();

    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('exercise-completions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'learning_path_exercise_completions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCompletedExercises();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Add this helper function before the return statement in the HomeScreen component
  const isAllOnboardingCompleted = () => {
    // Check if all onboarding cards are completed
    const hasLicensePlan = typedProfile?.license_plan_completed;
    const hasCreatedRoute = createdRoutes.length > 0;
    const hasCompletedExercise = completedIds?.length > 0;
    const hasSavedRoute = savedRoutes.length > 0;
    const hasRoleSelected = isRoleConfirmed();

    return (
      hasLicensePlan && hasCreatedRoute && hasCompletedExercise && hasSavedRoute && hasRoleSelected
    );
  };

  // Check if user has confirmed their role
  const isRoleConfirmed = () => {
    return typedProfile?.role_confirmed === true;
  };

  // Type assertion helper for profile to handle new fields
  const typedProfile = profile as typeof profile & {
    license_plan_completed?: boolean;
    license_plan_data?: {
      target_date?: string;
      has_theory?: boolean;
      has_practice?: boolean;
      previous_experience?: string;
      specific_goals?: string;
    };
    role_confirmed?: boolean;
  };

  // Add this near the top of the HomeScreen component, right after other hooks
  const colorScheme = useColorScheme();

  return (
    <Screen edges={[]} padding={false} hideStatusBar>
      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        forceShow={isFirstLogin}
      />

      <ScrollView 
        contentContainerStyle={{ paddingTop: 72 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00E6C3"
            colors={["#00E6C3"]}
            backgroundColor="rgba(0, 0, 0, 0.1)"
            progressBackgroundColor="#1a1a1a"
          />
        }
      >
        <YStack f={1}>
          {/* Header with Welcome and Users Button */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal="$4"
            marginBottom="$2"
          >
            <Text fontSize="$6" fontWeight="800" fontStyle="italic" color="$color">
              {/* Only show name if it's explicitly set and not an email or default value */}
              {profile?.full_name &&
              !profile.full_name.includes('@') &&
              profile.full_name !== 'Unknown' &&
              !profile.full_name.startsWith('user_')
                ? t('home.welcomeWithName').replace('{name}', profile.full_name)
                : t('home.welcome')}
            </Text>

            <Button
              size="sm"
              variant="secondary"
              onPress={() => navigation.navigate('UsersScreen')}
              icon={
                <Feather
                  name="users"
                  size={18}
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                />
              }
            >
              Users
            </Button>
          </XStack>

          {/* Getting Started Section - Only show if not all items are completed */}
          {!isAllOnboardingCompleted() && (
            <YStack space="$4" marginBottom="$6">
              <SectionHeader
                title="Komma igång"
                variant="chevron"
                onAction={() => {}}
                actionLabel=""
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack space="$4" paddingHorizontal="$4">
                  {/* 1. Din körkortsplan */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('LicensePlanScreen')}
                    activeOpacity={0.8}
                    delayPressIn={50}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <YStack
                      width={180}
                      height={180}
                      backgroundColor={typedProfile?.license_plan_completed ? '$green5' : '$blue5'}
                      borderRadius={16}
                      padding="$4"
                      justifyContent="space-between"
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Feather
                          name="clipboard"
                          size={24}
                          color={typedProfile?.license_plan_completed ? '#00E6C3' : '#4B6BFF'}
                        />
                        {typedProfile?.license_plan_completed ? (
                          <View
                            style={{
                              backgroundColor: '#00E6C3',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#000" fontWeight="bold">
                              100%
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              backgroundColor: '#4B6BFF',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#fff" fontWeight="bold">
                              0%
                            </Text>
                          </View>
                        )}
                      </XStack>

                      <YStack>
                        <Text fontSize={18} fontWeight="bold" color="$color">
                          Din körkortsplan
                        </Text>
                        <Text fontSize={14} color="$gray11" marginTop="$1">
                          Berätta om dig och dina mål
                        </Text>
                      </YStack>
                    </YStack>
                  </TouchableOpacity>

                  {/* 2. Lägg till din första rutt */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('CreateRoute', {})}
                    activeOpacity={0.8}
                    delayPressIn={50}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <YStack
                      width={180}
                      height={180}
                      backgroundColor={createdRoutes.length > 0 ? '$green5' : '$backgroundStrong'}
                      borderRadius={16}
                      padding="$4"
                      justifyContent="space-between"
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Feather
                          name="map-pin"
                          size={24}
                          color={createdRoutes.length > 0 ? '#00E6C3' : '#FF9500'}
                        />
                        {createdRoutes.length > 0 && (
                          <View
                            style={{
                              backgroundColor: '#00E6C3',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#000" fontWeight="bold">
                              KLART
                            </Text>
                          </View>
                        )}
                      </XStack>

                      <YStack>
                        <Text fontSize={18} fontWeight="bold" color="$color">
                          Lägg till din första rutt
                        </Text>
                        <Text fontSize={14} color="$gray11" marginTop="$1">
                          Skapa en körrutt du använder ofta
                        </Text>
                      </YStack>
                    </YStack>
                  </TouchableOpacity>

                  {/* 3. Progress start step 1 */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProgressTab', { showDetail: false })}
                    activeOpacity={0.8}
                    delayPressIn={50}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <YStack
                      width={180}
                      height={180}
                      backgroundColor={completedIds?.length > 0 ? '$green5' : '$backgroundStrong'}
                      borderRadius={16}
                      padding="$4"
                      justifyContent="space-between"
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Feather
                          name="play-circle"
                          size={24}
                          color={completedIds?.length > 0 ? '#00E6C3' : '#4B6BFF'}
                        />
                        {completedIds?.length > 0 && (
                          <View
                            style={{
                              backgroundColor: '#00E6C3',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#000" fontWeight="bold">
                              KLART
                            </Text>
                          </View>
                        )}
                      </XStack>

                      <YStack>
                        <Text fontSize={18} fontWeight="bold" color="$color">
                          Börja på steg 1 av 16
                        </Text>
                        <Text fontSize={14} color="$gray11" marginTop="$1">
                          Starta din körkortsresa
                        </Text>
                      </YStack>
                    </YStack>
                  </TouchableOpacity>

                  {/* 4. Save a public route */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('MapTab')}
                    activeOpacity={0.8}
                    delayPressIn={50}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <YStack
                      width={180}
                      height={180}
                      backgroundColor={savedRoutes.length > 0 ? '$green5' : '$backgroundStrong'}
                      borderRadius={16}
                      padding="$4"
                      justifyContent="space-between"
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Feather
                          name="bookmark"
                          size={24}
                          color={savedRoutes.length > 0 ? '#00E6C3' : '#FF9500'}
                        />
                        {savedRoutes.length > 0 && (
                          <View
                            style={{
                              backgroundColor: '#00E6C3',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#000" fontWeight="bold">
                              KLART
                            </Text>
                          </View>
                        )}
                      </XStack>

                      <YStack>
                        <Text fontSize={18} fontWeight="bold" color="$color">
                          Spara en körrutt
                        </Text>
                        <Text fontSize={14} color="$gray11" marginTop="$1">
                          Hitta och spara en rutt från kartan
                        </Text>
                      </YStack>
                    </YStack>
                  </TouchableOpacity>

                  {/* 5. Select your role */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('RoleSelectionScreen')}
                    activeOpacity={0.8}
                    delayPressIn={50}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <YStack
                      width={180}
                      height={180}
                      backgroundColor={isRoleConfirmed() ? '$green5' : '$backgroundStrong'}
                      borderRadius={16}
                      padding="$4"
                      justifyContent="space-between"
                    >
                      <XStack justifyContent="space-between" alignItems="center">
                        <Feather
                          name="user"
                          size={24}
                          color={isRoleConfirmed() ? '#00E6C3' : '#4B6BFF'}
                        />
                        {isRoleConfirmed() ? (
                          <View
                            style={{
                              backgroundColor: '#00E6C3',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#000" fontWeight="bold">
                              100%
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              backgroundColor: '#4B6BFF',
                              borderRadius: 12,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                            }}
                          >
                            <Text fontSize={10} color="#fff" fontWeight="bold">
                              0%
                            </Text>
                          </View>
                        )}
                      </XStack>

                      <YStack>
                        <Text fontSize={18} fontWeight="bold" color="$color">
                          Välj din roll
                        </Text>
                        <Text fontSize={14} color="$gray11" marginTop="$1">
                          Student, lärare eller trafikskola?
                        </Text>
                      </YStack>
                    </YStack>
                  </TouchableOpacity>
                </XStack>
              </ScrollView>
            </YStack>
          )}

          {/* Progress Section */}
          <ProgressSection key={progressSectionKey} />

          {/* Saved Routes Hero Carousel - Full Width */}
          {savedRoutes.length > 0 ? (
            <YStack gap="$6">
              <SectionHeader
                title={t('home.savedRoutes')}
                variant="chevron"
                onAction={() => {
                  navigation.navigate('RouteList', {
                    title: t('home.savedRoutes'),
                    routes: savedRoutes,
                    type: 'saved',
                  });
                }}
                actionLabel={t('common.seeAll')}
              />
              <HeroCarousel
                title={t('home.savedRoutes')}
                items={savedRoutes}
                getImageUrl={getRouteImage}
                showTitle={false}
                showMapPreview={true}
              />
            </YStack>
          ) : (
            <YStack px="$4" mt="$4">
              {renderEmptyState('No Saved Routes', 'Save routes to access them quickly')}
            </YStack>
          )}

          {/* Quick Filters Section */}
          {allFilters.length > 0 && renderQuickFilters()}

          {/* Create Route Button */}
          <Button
            onPress={() => navigation.navigate('CreateRoute', {})}
            variant="primary"
            size="lg"
          >
            {t('home.createNewRoute')}
          </Button>

          {/* City Routes - Now with dropdown and full-width cards */}
          <YStack gap="$4">
            {renderCityRoutes()}

            {/* Created Routes Section */}
            <YStack space="$4">
              <SectionHeader
                title={t('home.createdRoutes')}
                variant="chevron"
                onAction={() => handleSeeAllPress('created')}
                actionLabel={t('common.seeAll')}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack space="$4" paddingHorizontal="$4">
                  {createdRoutes.slice(0, 3).map((route) => (
                    <RouteCard key={route.id} route={route} />
                  ))}
                </XStack>
              </ScrollView>
            </YStack>

            {/* Nearby Routes Section */}
            <YStack space="$4">
              <SectionHeader
                title={t('home.nearbyRoutes')}
                variant="chevron"
                onAction={() => handleSeeAllPress('nearby')}
                actionLabel={t('common.seeAll')}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack space="$4" paddingHorizontal="$4">
                  {nearbyRoutes.slice(0, 3).map((route) => (
                    <RouteCard key={route.id} route={route} />
                  ))}
                </XStack>
              </ScrollView>
            </YStack>

            {/* Driven Routes - Using horizontal scroll */}
            <YStack gap="$2">
              <SectionHeader
                title={t('home.drivenRoutes')}
                variant="chevron"
                onAction={() => {
                  navigation.navigate('RouteList', {
                    title: t('home.drivenRoutes'),
                    routes: drivenRoutes,
                    type: 'driven',
                  });
                }}
                actionLabel={t('common.seeAll')}
              />
              {drivenRoutes.length > 0
                ? renderHorizontalRouteList(drivenRoutes, getRouteImage)
                : renderEmptyState('No Driven Routes', 'Complete routes to see them here')}
            </YStack>
          </YStack>

          {/* Users Section */}
          <YStack gap="$4" marginTop="$6" marginBottom="$6">
            <SectionHeader
              title="Users"
              variant="chevron"
              onAction={() => navigation.navigate('UsersScreen')}
              actionLabel={t('common.seeAll')}
            />

            <UsersList />
          </YStack>
        </YStack>

        {/* City Selection Modal */}
        <Modal
          visible={isCityMenuVisible}
          transparent
          animationType="none"
          onRequestClose={hideCityModal}
        >
          <View style={{ flex: 1 }}>
            <Animated.View
              style={[
                {
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                },
                {
                  opacity: cityBackdropOpacity,
                },
              ]}
            >
              <Pressable style={{ flex: 1 }} onPress={hideCityModal} />
            </Animated.View>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: '#000',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                {
                  transform: [{ translateY: citySheetTranslateY }],
                },
              ]}
            >
              <YStack
                backgroundColor="$background"
                padding="$4"
                borderTopLeftRadius="$4"
                borderTopRightRadius="$4"
                gap="$4"
              >
                {/* Sheet Handle */}
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    alignSelf: 'center',
                    marginBottom: 12,
                  }}
                />

                <Text size="xl" weight="bold" color="white" textAlign="center">
                  Select City
                </Text>

                <ScrollView style={{ maxHeight: '70%' }}>
                  <YStack gap="$2">
                    {Object.keys(routesByCity).map((city) => (
                      <TouchableOpacity key={city} onPress={() => handleCitySelect(city)}>
                        <XStack
                          backgroundColor={
                            selectedCity === city ? 'rgba(255, 255, 255, 0.1)' : undefined
                          }
                          padding="$2"
                          borderRadius="$2"
                          alignItems="center"
                          gap="$2"
                        >
                          <Text color="white" size="lg">
                            {city}
                          </Text>
                          {selectedCity === city && (
                            <Feather
                              name="check"
                              size={16}
                              color="white"
                              style={{ marginLeft: 'auto' }}
                            />
                          )}
                        </XStack>
                      </TouchableOpacity>
                    ))}
                  </YStack>
                </ScrollView>
              </YStack>
            </Animated.View>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
