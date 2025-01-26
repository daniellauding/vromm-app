import { useState, useCallback, useEffect } from 'react';
import { YStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { RouteList } from '../components/RouteList';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import type { Route } from '../hooks/useRoutes';

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { fetchRoutes } = useRoutes();
  const [routes, setRoutes] = useState<Route[]>([]);

  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutes();
    setRoutes(data);
  }, [fetchRoutes]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  return (
    <Screen scroll={false}>
      <YStack f={1} gap={24}>
        <Header title="Routes" showBack={false} />
        
        <YStack f={1} gap={24}>
          <Button
            onPress={() => navigation.navigate('CreateRoute')}
            variant="primary"
            size="lg"
            backgroundColor="$blue10"
          >
            <Text color="$color">Create New Route</Text>
          </Button>
          
          <RouteList 
            routes={routes}
            onRefresh={loadRoutes}
          />
        </YStack>
      </YStack>
    </Screen>
  );
} 