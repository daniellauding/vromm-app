import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { RouteCard } from '../components/RouteCard';
import { Button } from '../components/Button';
import type { Route } from '../hooks/useRoutes';

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
  const { title, routes, type, activeFilter } = route.params;

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
        
        <ScrollView>
          <YStack px="$4" pb="$4" gap="$4">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </YStack>
        </ScrollView>
      </YStack>
    </Screen>
  );
} 