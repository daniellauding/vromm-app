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
import { getTabContentPadding } from '../utils/layout';

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
    } else if (type === 'drafts' && user) {
      const loadDraftRoutes = async () => {
        const { data } = await supabase
          .from('routes')
          .select(`
            id,
            name,
            description,
            difficulty,
            spot_type,
            created_at,
            waypoint_details,
            drawing_mode,
            creator_id,
            creator:creator_id(id, full_name)
          `)
          .eq('creator_id', user.id)
          .eq('is_draft', true)
          .eq('visibility', 'private')
          .order('created_at', { ascending: false });

        setRoutes((data as unknown as Route[]) || []);
      };
      loadDraftRoutes();
    }
  }, [paramRoutes, type, user]);

  return (
    // Disable Screen's ScrollView to avoid nesting with RouteList's FlatList
    <Screen scroll={false}>
      <YStack f={1} gap="$4">
        <Header title={title} showBack onBackPress={() => {
          // Ensure back goes to HomeScreen root
          try {
            // @ts-ignore
            const nav: any = (global as any).reactNavigation || null;
          } catch {}
        }} />

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
