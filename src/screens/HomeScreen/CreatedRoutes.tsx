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

export const CreatedRoutes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [createdRoutes, setCreatedRoutes] = React.useState<Route[]>([]);

  React.useEffect(() => {
    if (!user) return;
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
    loadCreatedRoutes();
  }, [user]);

  const onNavigateToRouteList = React.useCallback(() => {
    navigation.navigate('RouteList', {
      type: 'created',
      title: t('home.createdRoutes'),
      routes: createdRoutes,
    });
  }, [createdRoutes, navigation, t]);

  return (
    <YStack space="$4">
      <SectionHeader
        title={t('home.createdRoutes')}
        variant="chevron"
        onAction={onNavigateToRouteList}
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
  );
};
