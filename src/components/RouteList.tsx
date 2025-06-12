import React, { forwardRef } from 'react';
import { RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Route } from '@/src/types/route';
import { RouteCard } from './RouteCard';
import { YStack } from 'tamagui';
import { ScrollView } from 'react-native-gesture-handler';

interface RouteListProps {
  routes: Route[];
  onRefresh?: () => Promise<void>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export const RouteList = forwardRef<ScrollView, RouteListProps>(function RouteList(
  { routes, onRefresh, onScroll },
  ref,
) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      ref={ref}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <YStack padding="$2" gap="$2">
        {routes.map((route, index) => (
          <RouteCard key={route.id || index} route={route} />
        ))}
      </YStack>
    </ScrollView>
  );
});
