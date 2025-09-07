import React from 'react';
import { YStack, XStack } from 'tamagui';
import { FlatList } from 'react-native';

import { HeroCarousel } from '../../components/HeroCarousel';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { navigateDomain } from '@/src/utils/navigation';
import { SectionHeader } from '../../components/SectionHeader';
import { RouteListSheet } from '../../components/RouteListSheet';
import { EmptyState } from './EmptyState';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
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

interface SavedRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

export const SavedRoutes = ({ onRoutePress }: SavedRoutesProps = {}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const [savedRoutes, setSavedRoutes] = React.useState<SavedRoute[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);

  // Use effective user ID (student if viewing as student, otherwise current user)
  const effectiveUserId = getEffectiveUserId();

  const loadSavedRoutes = React.useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_routes')
        .select('*, routes(*, creator:creator_id(id, full_name))')
        .eq('user_id', effectiveUserId)
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

      console.log('💾 [SavedRoutes] Loaded saved routes:', transformedRoutes.length);
      setSavedRoutes(transformedRoutes);
    } catch (err) {
      console.error('❌ [SavedRoutes] Error loading saved routes:', err);
    }
  }, [effectiveUserId]);

  React.useEffect(() => {
    if (!effectiveUserId) return;
    loadSavedRoutes();

    const savedSubscription = supabase
      .channel(`saved_routes_changes_${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'saved_routes',
          filter: `user_id=eq.${effectiveUserId}`,
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
  }, [loadSavedRoutes, effectiveUserId]);

  if (savedRoutes.length === 0) {
    return (
      <YStack px="$4" mt="$4">
        <EmptyState
          title="No Saved Routes"
          message={
            isViewingAsStudent
              ? `${activeStudentName || 'This student'} hasn't saved any routes yet`
              : 'Save routes from the map or community to access them quickly here'
          }
          icon="bookmark"
          variant="info"
          actionLabel={isViewingAsStudent ? undefined : "Explore Routes"}
          actionIcon="map"
          onAction={isViewingAsStudent ? undefined : () => navigation.navigate('MapTab')}
          secondaryLabel={isViewingAsStudent ? undefined : "View Community"}
          secondaryIcon="users"
          onSecondaryAction={isViewingAsStudent ? undefined : () => navigation.navigate('CommunityFeedScreen')}
        />
      </YStack>
    );
  }

  return (
    <>
      <YStack gap="$6">
        <SectionHeader
          title={
            isViewingAsStudent
              ? `${activeStudentName || 'Student'}'s Saved Routes`
              : t('home.savedRoutes')
          }
          variant="chevron"
          onAction={() => {
            const titleText = isViewingAsStudent
              ? `${activeStudentName || 'Student'}'s Saved Routes`
              : t('home.savedRoutes');
            console.log('[SHEET][HomeSection] SavedRoutes → RouteListSheet with title:', titleText);
            setShowRouteListSheet(true);
          }}
          actionLabel={t('common.seeAll')}
        />
        <XStack paddingHorizontal="$4">
          <HeroCarousel
            title={t('home.savedRoutes')}
            items={savedRoutes}
            getImageUrl={getRouteImage}
            showTitle={false}
            showMapPreview={true}
            onItemPress={onRoutePress ? (route) => onRoutePress(route.id) : undefined}
          />
        </XStack>
      </YStack>

      {/* Route List Sheet */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => setShowRouteListSheet(false)}
        title={
          isViewingAsStudent
            ? `${activeStudentName || 'Student'}'s Saved Routes`
            : t('home.savedRoutes')
        }
        routes={savedRoutes}
        type="saved"
      />
    </>
  );
};
