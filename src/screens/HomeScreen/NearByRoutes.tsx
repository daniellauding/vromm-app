import { RouteCard } from '@/src/components/RouteCard';
import { SectionHeader } from '@/src/components/SectionHeader';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route, RouteType } from '@/src/types/route';
import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useUserLocation } from '../explore/hooks';

export const NearByRoutes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [nearbyRoutes, setNearbyRoutes] = React.useState<Route[]>([]);
  const userLocation = useUserLocation();

  React.useEffect(() => {
    if (!user || !userLocation) return;
    const loadNearbyRoutes = async () => {
      if (!user) return;
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
    navigation.navigate('RouteList', {
      type: 'nearby',
      title: t('home.nearbyRoutes'),
      routes: nearbyRoutes,
    });
  }, [nearbyRoutes, navigation, t]);

  return (
    <YStack space="$4">
      <SectionHeader
        title={t('home.nearbyRoutes')}
        variant="chevron"
        onAction={onNavigateToRouteList}
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
  );
};
