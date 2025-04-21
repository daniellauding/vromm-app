import React from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { RouteCard } from '../components/RouteCard';
import type { Route } from '../hooks/useRoutes';

type RouteListScreenProps = {
  route: {
    params: {
      title: string;
      routes: Route[];
      type: 'saved' | 'driven';
    };
  };
};

export function RouteListScreen({ route }: RouteListScreenProps) {
  const { title, routes, type } = route.params;

  return (
    <Screen>
      <YStack f={1} gap="$4">
        <Header title={title} showBack />
        
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