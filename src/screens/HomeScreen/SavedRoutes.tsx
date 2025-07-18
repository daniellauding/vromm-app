import React from 'react';
import { YStack } from 'tamagui';

import { HeroCarousel } from '../../components/HeroCarousel';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyState } from './EmptyState';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Route, SavedRoute, SavedRouteFromDB } from '@/src/types/route';

const isValidRoute = (route: any): route is Route => {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    Array.isArray(route.media_attachments)
  );
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

export const SavedRoutes = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [savedRoutes, setSavedRoutes] = React.useState<SavedRoute[]>([]);

  const loadSavedRoutes = React.useCallback(async () => {
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
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    loadSavedRoutes();

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

    return () => {
      savedSubscription.unsubscribe();
    };
  }, [loadSavedRoutes, user]);

  if (savedRoutes.length === 0) {
    return (
      <YStack px="$4" mt="$4">
        <EmptyState title="No Saved Routes" message="Save routes to access them quickly" />
      </YStack>
    );
  }

  return (
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
  );
};
