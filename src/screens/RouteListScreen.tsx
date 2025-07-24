import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { RouteList } from '../components/RouteList';
import { Button } from '../components/Button';
import type { Route } from '../hooks/useRoutes';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type FilterCategory = {
  id: string;
  label: string;
  value: string;
  type: 'difficulty' | 'spot_type' | 'category';
};

type RouteListScreenProps = {
  route: {
    params: {
      title: string;
      routes: Route[];
      type: 'saved' | 'driven' | 'difficulty' | 'spot_type' | 'category' | 'city';
      activeFilter?: FilterCategory;
    };
  };
};

export function RouteListScreen({ route }: RouteListScreenProps) {
  const { title, routes: paramRoutes = [], type, activeFilter } = route.params;
  const { user } = useAuth();
  const [routes, setRoutes] = React.useState<Route[]>(paramRoutes);

  React.useEffect(() => {
    if (!user && paramRoutes.length > 0) return;
    if (type === 'driven' && user) {
      const loadDrivenRoutes = async () => {
        const { data, error } = await supabase
          .from('driven_routes')
          .select('*')
          .eq('user_id', user.id);

        setRoutes(data as Route[]);
      };
      loadDrivenRoutes();
    }
  }, [paramRoutes, type, user]);

  return (
    <Screen>
      <YStack f={1} gap="$4">
        <Header title={title} showBack />

        {/* Active Filter Chip */}
        {activeFilter && (
          <XStack px="$4">
            <Button size="sm" variant="secondary">
              {activeFilter.label}
            </Button>
          </XStack>
        )}

        <RouteList routes={routes} />
      </YStack>
    </Screen>
  );
}
