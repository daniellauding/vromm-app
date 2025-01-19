import { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { YStack, Text, Card, XStack, Button } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Database } from '../lib/database.types';
import { Feather } from '@expo/vector-icons';

type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
};

type RouteListProps = {
  routes: Route[];
  onRefresh?: () => Promise<void>;
};

export function RouteList({ routes, onRefresh }: RouteListProps) {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const renderRoute = ({ item: route }: { item: Route }) => (
    <Card
      marginVertical="$2"
      padding="$4"
      bordered
      pressStyle={{ scale: 0.98 }}
      onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
    >
      <YStack space="$2">
        <Text fontSize="$5" fontWeight="bold">{route.name}</Text>
        
        <XStack space="$2" alignItems="center">
          <Feather name="user" size={16} />
          <Text color="$gray11">{route.creator?.full_name || 'Unknown'}</Text>
        </XStack>
        
        <XStack space="$4">
          <XStack space="$1" alignItems="center">
            <Feather name="bar-chart" size={16} />
            <Text>{route.difficulty}</Text>
          </XStack>
          
          <XStack space="$1" alignItems="center">
            <Feather name="map-pin" size={16} />
            <Text>{route.spot_type}</Text>
          </XStack>
        </XStack>

        {route.description && (
          <Text numberOfLines={2} color="$gray11">
            {route.description}
          </Text>
        )}
      </YStack>
    </Card>
  );

  return (
    <FlatList
      data={routes}
      renderItem={renderRoute}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      ListEmptyComponent={() => (
        <YStack padding="$4" alignItems="center">
          <Text color="$gray11">No routes found</Text>
        </YStack>
      )}
    />
  );
} 