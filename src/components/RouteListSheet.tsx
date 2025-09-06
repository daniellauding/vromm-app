import React, { useRef, useEffect } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { RouteList } from './RouteList';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
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
}

export function RouteListSheet({
  visible,
  onClose,
  title,
  routes: initialRoutes = [],
  type,
  activeFilter,
}: RouteListSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Theme colors - matching OnboardingInteractive exactly
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Route state
  const [routes, setRoutes] = React.useState<Route[]>(initialRoutes);

  // Load routes based on type
  React.useEffect(() => {
    if (!visible || !user) return;

    const loadRoutes = async () => {
      try {
        if (type === 'driven') {
          const { data } = await supabase.from('driven_routes').select('*').eq('user_id', user.id);
          setRoutes((data as unknown as Route[]) || []);
        } else if (type === 'drafts') {
          const { data } = await supabase
            .from('routes')
            .select(`
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
            `)
            .eq('creator_id', user.id)
            .eq('is_draft', true)
            .eq('visibility', 'private')
            .order('created_at', { ascending: false });
          setRoutes((data as unknown as Route[]) || []);
        } else if (type === 'created') {
          const { data } = await supabase
            .from('routes')
            .select(`
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
            `)
            .eq('creator_id', user.id)
            .eq('is_draft', false)
            .order('created_at', { ascending: false });
          setRoutes((data as unknown as Route[]) || []);
        } else {
          // For saved, nearby, or other types, use the passed routes
          setRoutes(initialRoutes);
        }
      } catch (error) {
        console.error('Error loading routes for sheet:', error);
        setRoutes(initialRoutes);
      }
    };

    loadRoutes();
  }, [visible, type, user, initialRoutes]);

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
              {/* Header - matching OnboardingInteractive exactly */}
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {title}
              </Text>

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
                <RouteList routes={routes} onRoutePress={onClose} />
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}