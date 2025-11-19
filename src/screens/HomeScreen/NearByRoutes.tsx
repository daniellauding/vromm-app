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

interface NearByRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

export const NearByRoutes = ({ onRoutePress }: NearByRoutesProps = {}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [nearbyRoutes, setNearbyRoutes] = React.useState<Route[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);
  const userLocation = useUserLocation();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

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
    <YStack space="$0">
      <SectionHeader
        title={t('home.nearbyRoutes')}
        variant="chevron"
        onAction={onNavigateToRouteList}
        actionLabel={t('common.seeAll')}
        showActionLabel={false}
        helpText={getTranslation(
          'home.nearbyRoutes.help',
          'Shows practice routes within 100km of your current location. Routes are sorted by distance from you.',
        )}
        showHelp={true}
      />

      {nearbyRoutes.length === 0 ? (
        <YStack px="$4">
          <EmptyState
            title={getTranslation('home.nearbyRoutes.noRoutes', 'No Nearby Routes')}
            message={getTranslation(
              'home.nearbyRoutes.noRoutesMessage',
              'No practice routes found within 100km of your location. Create the first route in your area or explore the map!'
            )}
            icon="map-pin"
            variant="warning"
            actionLabel={getTranslation('home.nearbyRoutes.createRouteHere', 'Create Route Here')}
            actionIcon="plus"
            onAction={() => navigation.navigate('CreateRoute')}
            secondaryLabel={getTranslation('home.nearbyRoutes.exploreMap', 'Explore Map')}
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
            // <XStack paddingHorizontal="$4" marginRight="$4">
            <XStack>
              <RouteCard
                route={item}
                onPress={onRoutePress ? () => onRoutePress(item.id) : undefined}
              />
            </XStack>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}
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
