import React from 'react';
import { ScrollView, RefreshControl, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Route } from '../hooks/useRoutes';
import { RouteCard } from './RouteCard';
import { YStack } from 'tamagui';

interface RouteListProps {
  routes: Route[];
  onRefresh?: () => Promise<void>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function RouteList({ routes, onRefresh, onScroll }: RouteListProps) {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        ) : undefined
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
} 