import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface RouteCreationBannerProps {
  onPress: () => void;
  onDismiss: () => void;
}

export function RouteCreationBanner({ onPress, onDismiss }: RouteCreationBannerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [hasCreatedRoutes, setHasCreatedRoutes] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user has created routes
  useEffect(() => {
    const checkCreatedRoutes = async () => {
      if (!user) return;
      try {
        const { count, error } = await supabase
          .from('routes')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', user.id);

        if (!error && typeof count === 'number') {
          setHasCreatedRoutes(count > 0);
        } else {
          setHasCreatedRoutes(false);
        }
      } catch (_err) {
        setHasCreatedRoutes(false);
      }
    };

    checkCreatedRoutes();
  }, [user]);

  // Set up real-time subscription for route creation
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('user-routes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'routes',
          filter: `creator_id=eq.${user.id}`,
        },
        () => {
          setHasCreatedRoutes(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  // Don't show banner if user has created routes or if dismissed
  if (hasCreatedRoutes || isDismissed) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 180, // Above the routes drawer
        left: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(0, 230, 195, 0.95)', // Light green background like in the image
          borderRadius: 12,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
          borderWidth: 1,
          borderColor: 'rgba(0, 230, 195, 0.3)',
        }}
      >
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
          <YStack flex={1} gap="$2">
            <Text fontSize={16} fontWeight="bold" color="#000" style={{ fontStyle: 'italic' }}>
              {t('banner.createRoute.title') || 'Upload your own route'}
            </Text>
            <Text fontSize={14} color="rgba(0, 0, 0, 0.8)" lineHeight={18}>
              {t('banner.createRoute.description') ||
                'Create and share your favorite driving routes'}
            </Text>
            <Button
              variant="primary"
              size="sm"
              onPress={onPress}
              backgroundColor="rgba(0, 0, 0, 0.1)"
              marginTop="$2"
              pressStyle={{ opacity: 0.8 }}
            >
              <Text color="#000" fontWeight="600" fontSize={14}>
                {t('banner.createRoute.button') || 'Create Route'}
              </Text>
            </Button>
          </YStack>

          <TouchableOpacity
            onPress={handleDismiss}
            style={{
              padding: 4,
              borderRadius: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={16} color="rgba(0, 0, 0, 0.7)" />
          </TouchableOpacity>
        </XStack>
      </View>
    </View>
  );
}
