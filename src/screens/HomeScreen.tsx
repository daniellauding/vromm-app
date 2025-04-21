import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { YStack, XStack, Card, Separator, ScrollView } from 'tamagui';
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
import { Image, ImageSourcePropType } from 'react-native';
import { OnboardingModal } from '../components/OnboardingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowOnboarding } from '../components/Onboarding';
import { useTranslation } from '../contexts/TranslationContext';
import { HeroCarousel } from '../components/HeroCarousel';

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

const isValidRoute = (route: any): route is Route => {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    Array.isArray(route.media_attachments)
  );
};

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { fetchRoutes } = useRoutes();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [drivenRoutes, setDrivenRoutes] = useState<DrivenRoute[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

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
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to ensure is_completed is always boolean
      const transformedTodos: Todo[] = (data as TodoFromDB[]).map(todo => ({
        id: todo.id,
        title: todo.title,
        is_completed: Boolean(todo.is_completed),
        metadata: todo.metadata
      }));

      setTodos(transformedTodos);
    } catch (err) {
      console.error('Error loading todos:', err);
    }
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
    const data = await fetchRoutes();
    setRoutes(data);
  }, [fetchRoutes]);

  const loadSavedRoutes = async () => {
    if (!user) return;
    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_routes')
        .select('*, routes(*)')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (savedError) throw savedError;

      const transformedRoutes = (savedData as SavedRouteFromDB[])
        .filter(item => item.saved_at && item.routes && isValidRoute(item.routes))
        .map(item => {
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
            updated_at: route.updated_at
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
        .select('*, routes(*)')
        .eq('user_id', user.id)
        .not('driven_at', 'is', null)
        .order('driven_at', { ascending: false });

      if (drivenError) throw drivenError;

      const transformedRoutes = (drivenData as DrivenRouteFromDB[])
        .filter(item => item.driven_at && item.routes && isValidRoute(item.routes))
        .map(item => {
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
            updated_at: route.updated_at
          };
        }) as DrivenRoute[];

      setDrivenRoutes(transformedRoutes);
    } catch (err) {
      console.error('Error loading driven routes:', err);
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
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Reload driven routes when any change occurs
          loadDrivenRoutes();
        }
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
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Reload saved routes when any change occurs
          loadSavedRoutes();
        }
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

  // Remove loadSavedRoutes and loadDrivenRoutes from this useEffect since they're now handled by the subscription
  useEffect(() => {
    loadRoutes();
    loadTodos();
  }, [loadRoutes]);

  // Update the refresh function to not include loadSavedRoutes and loadDrivenRoutes since they're real-time now
  const handleRefresh = async () => {
    await Promise.all([loadRoutes(), loadTodos()]);
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

  const renderHorizontalRouteList = (routes: Route[], imageGetter: (route: Route) => string | null) => {
    if (routes.length === 0) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
        <XStack gap="$3" paddingVertical="$2">
          {routes.map(route => {
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
                        borderTopRightRadius: 12
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

  const renderEmptyState = (title: string, message: string) => (
    <Card bordered elevate backgroundColor="$backgroundStrong" padding="$4">
      <YStack alignItems="center" gap="$2">
        <Feather name="info" size={24} color="$gray11" />
        <Text size="lg" weight="bold">{title}</Text>
        <Text size="sm" color="$gray11" textAlign="center">{message}</Text>
      </YStack>
    </Card>
  );

  const renderQuickFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2" paddingHorizontal="$4" paddingVertical="$2">
        {['Parkering', 'Landsväg', 'Backstart', '< 15 min'].map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant="secondary"
            opacity={0.5} // Disabled state
          >
            {filter}
          </Button>
        ))}
      </XStack>
    </ScrollView>
  );

  return (
    <Screen edges={[]} padding={false} hideStatusBar>
      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        forceShow={isFirstLogin}
      />

      <ScrollView>
        <YStack f={1}>
          {/* Saved Routes Hero Carousel - Full Width */}
          {savedRoutes.length > 0 ? (
            <YStack gap="$2">
              <XStack px="$4" justifyContent="space-between" alignItems="center">
                <Text size="xl" weight="bold">
                  {t('home.savedRoutes')}
                </Text>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    navigation.navigate('RouteList', {
                      title: t('home.savedRoutes'),
                      routes: savedRoutes,
                      type: 'saved'
                    });
                  }}
                >
                  <XStack gap="$2" alignItems="center">
                    <Text>{t('common.seeAll')}</Text>
                    <Feather name="chevron-right" size={20} />
                  </XStack>
                </Button>
              </XStack>
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

          <YStack gap="$4" px="$4" mt="$4">
            {/* Quick Filters */}
            <YStack gap="$2">
              <Text size="xl" weight="bold">Quick Filters</Text>
              {renderQuickFilters()}
            </YStack>

            {/* Progress Section */}
            <YStack gap="$2">
              <Text size="xl" weight="bold">Ditt nästa körsteg</Text>
              <Card bordered elevate backgroundColor="$backgroundStrong" padding="$4">
                <YStack gap="$2">
                  <Text size="lg" weight="bold">Steg 5 – Stadstrafik</Text>
                  <Text size="md" color="$gray11">⭐ Progress: 3 av 5 övningar markerade</Text>
                  <Button
                    size="sm"
                    variant="secondary"
                    opacity={0.5} // Disabled state
                  >
                    Visa övningar
                  </Button>
                </YStack>
              </Card>
            </YStack>

            {/* Nearby Routes */}
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text size="xl" weight="bold">
                  Nearby Suggested Routes
                </Text>
                <Button size="sm" variant="secondary" opacity={0.5}>
                  <XStack gap="$2" alignItems="center">
                    <Text>See All</Text>
                    <Feather name="chevron-right" size={20} />
                  </XStack>
                </Button>
              </XStack>
              {routes.length > 0 ? (
                renderHorizontalRouteList(routes, getRouteImage)
              ) : (
                renderEmptyState('No Nearby Routes', 'No routes available in your area yet')
              )}
            </YStack>

            {/* Driven Routes */}
            <YStack gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text size="xl" weight="bold">
                  {t('home.drivenRoutes')}
                </Text>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    navigation.navigate('RouteList', {
                      title: t('home.drivenRoutes'),
                      routes: drivenRoutes,
                      type: 'driven'
                    });
                  }}
                >
                  <XStack gap="$2" alignItems="center">
                    <Text>{t('common.seeAll')}</Text>
                    <Feather name="chevron-right" size={20} />
                  </XStack>
                </Button>
              </XStack>
              {drivenRoutes.length > 0 ? (
                renderHorizontalRouteList(drivenRoutes, getRouteImage)
              ) : (
                renderEmptyState('No Driven Routes', 'Complete routes to see them here')
              )}
            </YStack>

            {/* Create Route Button */}
            <Button
              onPress={() => navigation.navigate('CreateRoute', {})}
              variant="primary"
              size="lg"
            >
              {t('home.createNewRoute')}
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
