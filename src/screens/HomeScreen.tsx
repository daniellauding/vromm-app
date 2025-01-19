import { useState, useCallback, useEffect } from 'react';
import { Button, Text, YStack } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { RouteList } from '../components/RouteList';
import { Database } from '../lib/database.types';

type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
};

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { fetchRoutes } = useRoutes();
  const [routes, setRoutes] = useState<Route[]>([]);

  const loadRoutes = useCallback(async () => {
    const data = await fetchRoutes();
    setRoutes(data as Route[]);
  }, [fetchRoutes]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack f={1}>
        <Button
          margin="$4"
          themeInverse
          onPress={() => navigation.navigate('CreateRoute')}
        >
          Create New Route
        </Button>
        
        <RouteList 
          routes={routes}
          onRefresh={loadRoutes}
        />
      </YStack>
    </SafeAreaView>
  );
} 