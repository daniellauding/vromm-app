import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { RouteList } from '../components/RouteList';
import { Button } from '../components/Button';
import type { Route } from '../hooks/useRoutes';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

// Align with RootStackParamList types
export type RouteListScreenProps = NativeStackScreenProps<RootStackParamList, 'RouteList'>;

export function RouteListScreen({ route }: RouteListScreenProps) {
  const { title, routes: paramRoutes = [], type, activeFilter } = route.params;
  const { user } = useAuth();
  const [routes, setRoutes] = React.useState<Route[]>(paramRoutes);

  React.useEffect(() => {
    if (!user && paramRoutes.length > 0) return;
    if (type === 'driven' && user) {
      const loadDrivenRoutes = async () => {
        const { data } = await supabase
          .from('driven_routes')
          .select('*')
          .eq('user_id', user.id);

        setRoutes((data as unknown as Route[]) || []);
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
