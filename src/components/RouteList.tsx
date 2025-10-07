import React, { forwardRef } from 'react';
import { RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Route } from '@/src/types/route';
import { RouteCard } from './RouteCard';
import { YStack } from 'tamagui';
import { getTabContentPadding } from '../utils/layout';

// Import the Route type that RouteCard expects
import { Database } from '../lib/database.types';

type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type MediaAttachment = {
  url: string;
  type: 'image' | 'video';
  description?: string;
};

// Use the Route type that RouteCard expects
type RouteCardRoute = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    id?: string;
    full_name: string;
  } | null;
  creator_id?: string;
  metadata: {
    waypoints?: WaypointData[];
  };
  waypoint_details: WaypointData[];
  media_attachments?: MediaAttachment[];
  reviews?: {
    id: string;
    rating: number;
    content: string;
    difficulty: string;
    visited_at: string;
    created_at: string;
    images: { url: string; description?: string }[];
    user: { id: string; full_name: string };
  }[];
};

interface RouteListProps {
  routes: Route[];
  onRefresh?: () => Promise<void>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onRoutePress?: (routeId: string) => void;
}

export const RouteList = forwardRef<FlatList<RouteCardRoute>, RouteListProps>(function RouteList(
  { routes, onRefresh, onScroll, onRoutePress },
  ref,
) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // Convert routes to the format expected by RouteCard
  const convertedRoutes: RouteCardRoute[] = React.useMemo(() => {
    return routes.map((route) => route as unknown as RouteCardRoute);
  }, [routes]);

  const renderItem = React.useCallback(
    ({ item }: { item: RouteCardRoute }) => (
      <YStack padding="$2">
        <RouteCard route={item} onPress={onRoutePress ? () => onRoutePress(item.id) : undefined} />
      </YStack>
    ),
    [onRoutePress],
  );

  const keyExtractor = React.useCallback(
    (item: RouteCardRoute) => item.id || Math.random().toString(),
    [],
  );

  return (
    <FlatList
      ref={ref}
      data={convertedRoutes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      removeClippedSubviews={true}
      maxToRenderPerBatch={3}
      windowSize={5}
      initialNumToRender={2}
      getItemLayout={(data, index) => ({
        length: 350, // Approximate height of RouteCard + padding
        offset: 350 * index,
        index,
      })}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: getTabContentPadding() }}
    />
  );
});
