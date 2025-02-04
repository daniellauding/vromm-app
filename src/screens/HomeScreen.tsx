import { useState, useCallback, useEffect, useRef } from 'react';
import { YStack, XStack, Card, Separator, ScrollView } from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { RouteList } from '../components/RouteList';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';
import type { Route } from '../hooks/useRoutes';
import { Image, useColorScheme, Alert, ActivityIndicator } from 'react-native';

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { fetchRoutes } = useRoutes();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadData();
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const routes = await fetchRoutes();
      if (mountedRef.current) {
        setRoutes(routes);
      }
    } catch (err) {
      console.error('Error loading routes:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load routes');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <Screen>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" />
        </YStack>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <YStack f={1} padding="$4" justifyContent="center" alignItems="center">
          <Text color="$red10">{error}</Text>
          <Button
            marginTop="$4"
            onPress={loadData}
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="refresh-ccw" size={18} color={colorScheme === 'dark' ? 'white' : 'black'} />
              <Text color={colorScheme === 'dark' ? 'white' : 'black'}>Try Again</Text>
            </XStack>
          </Button>
        </YStack>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Home" showBack={false} />
      <RouteList
        routes={routes}
        onRefresh={handleRefresh}
      />
    </Screen>
  );
} 