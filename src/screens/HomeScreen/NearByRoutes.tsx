import { RouteCard } from '@/src/components/RouteCard';
import { SectionHeader } from '@/src/components/SectionHeader';
import { RouteListSheet } from '@/src/components/RouteListSheet';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route, RouteType } from '@/src/types/route';
import React from 'react';
import { YStack, XStack } from 'tamagui';
import { FlatList } from 'react-native';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from './EmptyState';

import { supabase } from '../../lib/supabase';
import { useUserLocation } from '../explore/hooks';

export const NearByRoutes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [nearbyRoutes, setNearbyRoutes] = React.useState<Route[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);
  const userLocation = useUserLocation();

  // User location tracking without null logging
  React.useEffect(() => {
    if (!user || !userLocation) return;
    const loadNearbyRoutes = async () => {
      if (!user) return;
      console.log('find_nearby_routes', {
        lat_input: userLocation?.coords.latitude,
        lng_input: userLocation?.coords.longitude,
        max_km: 100.0,
      });
      const { data, error } = await supabase.rpc('find_nearby_routes', {
        lat_input: userLocation?.coords.latitude,
        lng_input: userLocation?.coords.longitude,
        max_km: 100.0,
      });

      if (error) {
        console.error(error);
      } else {
        setNearbyRoutes(data as Route[]);
      }
    };
    loadNearbyRoutes();
  }, [user, userLocation]);

  const onNavigateToRouteList = React.useCallback(() => {
    console.log('[SHEET][HomeSection] NearByRoutes → RouteListSheet');
    setShowRouteListSheet(true);
  }, []);

  // If no user location, don't show this section
  if (!userLocation) {
    return <></>;
  }

  return (
    <YStack space="$4">
      <SectionHeader
        title={t('home.nearbyRoutes')}
        variant="chevron"
        onAction={onNavigateToRouteList}
        actionLabel={t('common.seeAll')}
      />
      
      {nearbyRoutes.length === 0 ? (
        <YStack px="$4">
          <EmptyState
            title="No Nearby Routes"
            message={`No practice routes found within 100km of your location. Create the first route in your area or explore the map!`}
            icon="map-pin"
            variant="warning"
            actionLabel="Create Route Here"
            actionIcon="plus"
            onAction={() => navigation.navigate('CreateRoute')}
            secondaryLabel="Explore Map"
            secondaryIcon="map"
            onSecondaryAction={() => navigation.navigate('MapTab')}
          />
        </YStack>
      ) : (
        <FlatList
          horizontal
          data={nearbyRoutes.slice(0, 3)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <XStack paddingHorizontal="$4" marginRight="$4">
              <RouteCard route={item} />
            </XStack>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}

      {/* Route List Sheet */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => setShowRouteListSheet(false)}
        title={t('home.nearbyRoutes')}
        routes={nearbyRoutes}
        type="nearby"
      />
    </YStack>
  );
};
