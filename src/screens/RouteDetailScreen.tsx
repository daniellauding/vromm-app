import { useEffect, useState } from 'react';
import { YStack, Text, Button, XStack, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

type RouteDetailRouteProp = RouteProp<RootStackParamList, 'RouteDetail'>;
type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
  reviews: {
    count: number;
  }[];
};

export function RouteDetailScreen() {
  const route = useRoute<RouteDetailRouteProp>();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [routeData, setRouteData] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRouteDetail = async () => {
      try {
        const { data, error: routeError } = await supabase
          .from('routes')
          .select(`
            *,
            creator:creator_id(full_name),
            reviews:route_reviews(count)
          `)
          .eq('id', route.params.routeId)
          .single();

        if (routeError) throw routeError;
        setRouteData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load route');
      } finally {
        setLoading(false);
      }
    };

    fetchRouteDetail();
  }, [route.params.routeId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      </SafeAreaView>
    );
  }

  if (error || !routeData) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <YStack f={1} padding="$4" space="$4">
          <Text color="$red10">{error || 'Route not found'}</Text>
          <Button onPress={signOut}>Sign Out</Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack f={1} padding="$4" space="$4">
        <Text fontSize="$6" fontWeight="bold">{routeData.name}</Text>
        
        <XStack space="$2">
          <Text color="$gray11">Created by:</Text>
          <Text>{routeData.creator?.full_name}</Text>
        </XStack>

        <YStack space="$2">
          <Text fontSize="$5" fontWeight="bold">Details</Text>
          <XStack space="$4">
            <Text>Difficulty: {routeData.difficulty}</Text>
            <Text>Type: {routeData.spot_type}</Text>
          </XStack>
          <Text>Vehicle Types: {routeData.vehicle_types.join(', ')}</Text>
          <Text>Best Season: {routeData.best_season}</Text>
          <Text>Best Times: {routeData.best_times}</Text>
        </YStack>

        {routeData.description && (
          <YStack space="$2">
            <Text fontSize="$5" fontWeight="bold">Description</Text>
            <Text>{routeData.description}</Text>
          </YStack>
        )}

        {user?.id === routeData.creator_id && (
          <Button
            themeInverse
            onPress={() => {
              // Add edit functionality
            }}
          >
            Edit Route
          </Button>
        )}
      </YStack>
    </SafeAreaView>
  );
} 