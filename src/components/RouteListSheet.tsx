import React, { useRef, useEffect } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { RouteList } from './RouteList';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from 'react-native';
import type { Route } from '../hooks/useRoutes';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { height } = Dimensions.get('window');

interface RouteListSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  routes?: Route[];
  type?: 'saved' | 'created' | 'nearby' | 'driven' | 'drafts';
  activeFilter?: {
    id: string;
    label: string;
  };
  onBack?: () => void;
  onRoutePress?: (routeId: string) => void;
}

export function RouteListSheet({
  visible,
  onClose,
  title,
  routes: initialRoutes = [],
  type,
  activeFilter,
  onBack,
  onRoutePress,
}: RouteListSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colorScheme = useColorScheme();

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Route state
  const [routes, setRoutes] = React.useState<Route[]>(initialRoutes);

  // Load routes based on type
  React.useEffect(() => {
    if (!visible || !user) {
      console.log('📋 [RouteListSheet] Not loading routes - visible:', visible, 'user:', !!user);
      return;
    }

    console.log('📋 [RouteListSheet] Loading routes for type:', type, 'user:', user.id);

    const loadRoutes = async () => {
      try {
        if (type === 'driven') {
          console.log('📋 [RouteListSheet] Loading driven routes...');
          const { data, error } = await supabase
            .from('driven_routes')
            .select('*')
            .eq('user_id', user.id);
          console.log('📋 [RouteListSheet] Driven routes result:', {
            data,
            error,
            count: data?.length,
          });
          setRoutes((data as unknown as Route[]) || []);
        } else if (type === 'drafts') {
          console.log('📋 [RouteListSheet] Loading draft routes...');
          const { data, error } = await supabase
            .from('routes')
            .select(
              `
              id,
              name,
              description,
              difficulty,
              spot_type,
              created_at,
              waypoint_details,
              drawing_mode,
              creator_id,
              creator:creator_id(id, full_name)
            `,
            )
            .eq('creator_id', user.id)
            .eq('is_draft', true)
            .eq('visibility', 'private')
            .order('created_at', { ascending: false });
          console.log('📋 [RouteListSheet] Draft routes result:', {
            data,
            error,
            count: data?.length,
          });
          setRoutes((data as unknown as Route[]) || []);
        } else if (type === 'created') {
          console.log('📋 [RouteListSheet] Loading created routes...');
          const { data, error } = await supabase
            .from('routes')
            .select(
              `
              id,
              name,
              description,
              difficulty,
              spot_type,
              created_at,
              waypoint_details,
              drawing_mode,
              creator_id,
              creator:creator_id(id, full_name)
            `,
            )
            .eq('creator_id', user.id)
            .eq('is_draft', false)
            .order('created_at', { ascending: false });
          console.log('📋 [RouteListSheet] Created routes result:', {
            data,
            error,
            count: data?.length,
          });
          setRoutes((data as unknown as Route[]) || []);
        } else if (type === 'saved') {
          console.log('📋 [RouteListSheet] Loading saved routes...');
          const { data, error } = await supabase
            .from('saved_routes')
            .select(
              `
              route_id,
              saved_at,
              route:routes(
                id,
                name,
                description,
                difficulty,
                spot_type,
                created_at,
                creator_id,
                creator:creator_id(id, full_name)
              )
            `,
            )
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false });
          console.log('📋 [RouteListSheet] Saved routes result:', {
            data,
            error,
            count: data?.length,
          });
          // Transform saved routes data
          const transformedRoutes = data?.map((item) => item.route).filter(Boolean) || [];
          setRoutes(transformedRoutes as Route[]);
        } else {
          console.log(
            '📋 [RouteListSheet] Using initial routes for type:',
            type,
            'count:',
            initialRoutes.length,
          );
          // For nearby or other types, use the passed routes
          setRoutes(initialRoutes);
        }
      } catch (error) {
        console.error('📋 [RouteListSheet] Error loading routes for sheet:', error);
        setRoutes(initialRoutes);
      }
    };

    loadRoutes();
  }, [visible, type, user?.id]);

  // Animation effects - matching OnboardingInteractive pattern exactly
  useEffect(() => {
    if (visible) {
      // Fade in the backdrop
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Slide up the sheet
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out the backdrop
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Slide down the sheet
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              height={height * 0.85}
              maxHeight={height * 0.85}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                {onBack ? (
                  <TouchableOpacity onPress={onBack}>
                    <Feather
                      name="arrow-left"
                      size={24}
                      color={colorScheme === 'dark' ? '#FFF' : '#000'}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 24 }} />
                )}

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center" flex={1}>
                  {title}
                </Text>

                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#000'} />
                </TouchableOpacity>
              </XStack>

              {/* Active Filter Chip */}
              {activeFilter && (
                <XStack>
                  <Button size="sm" variant="secondary">
                    {activeFilter.label}
                  </Button>
                </XStack>
              )}

              {/* Routes List */}
              <YStack flex={1}>
                <RouteList
                  routes={routes}
                  onRoutePress={(routeId) => {
                    console.log('📋 [RouteListSheet] Route pressed in RouteList:', routeId);
                    if (onRoutePress) {
                      onRoutePress(routeId);
                    } else {
                      // Fallback: just close the sheet
                      onClose();
                    }
                  }}
                />
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
