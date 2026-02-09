import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Animated,
  Pressable,
  Easing,
  View,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { RouteList } from './RouteList';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useThemePreference } from '../hooks/useThemeOverride';
import type { Route } from '../hooks/useRoutes';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { RouteDetailSheet } from './RouteDetailSheet';
import { useTranslation } from '../contexts/TranslationContext';

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
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const { language } = useTranslation();
  const theme = useTheme();

  // Theme colors - matching ProgressScreen exactly
  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

  // Animation refs - matching OnboardingInteractive pattern
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Route state
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  
  // Route detail sheet state
  const [showRouteDetailSheet, setShowRouteDetailSheet] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter routes based on search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) {
      return routes;
    }

    const query = searchQuery.toLowerCase().trim();
    return routes.filter((route) => {
      const nameMatch = route.name?.toLowerCase().includes(query);
      const descriptionMatch = route.description?.toLowerCase().includes(query);
      const cityMatch = (route as any).city?.toLowerCase().includes(query);
      const waypointMatch = route.waypoint_details?.some(
        (wp: any) =>
          wp.title?.toLowerCase().includes(query) ||
          wp.description?.toLowerCase().includes(query),
      );
      const creatorMatch = (route as any).creator?.full_name?.toLowerCase().includes(query);
      const difficultyMatch = route.difficulty?.toLowerCase().includes(query);
      const spotTypeMatch = route.spot_type?.toLowerCase().includes(query);
      const categoryMatch = route.category?.toLowerCase().includes(query);

      return (
        nameMatch ||
        descriptionMatch ||
        cityMatch ||
        waypointMatch ||
        creatorMatch ||
        difficultyMatch ||
        spotTypeMatch ||
        categoryMatch
      );
    });
  }, [routes, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    Keyboard.dismiss();
  };

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
            .select('*, routes(*)')
            .eq('user_id', user.id)
            .order('driven_at', { ascending: false });
          console.log('📋 [RouteListSheet] Driven routes result:', {
            data,
            error,
            count: data?.length,
          });
          // Extract the routes from the join
          const routes = data?.map((item: any) => item.routes).filter(Boolean) || [];
          setRoutes(routes as Route[]);
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
              preview_image,
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
              preview_image,
              creator:creator_id(id, full_name)
            `,
            )
            .eq('creator_id', user.id)
            .eq('is_draft', false)
            .order('created_at', { ascending: false });
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
                preview_image,
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

              {/* Search Input */}
              <View style={{ position: 'relative', width: '100%', paddingHorizontal: 0 }}>
                <TextInput
                  style={[
                    {
                      height: 40,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingRight: searchQuery.length > 0 ? 40 : 16,
                      fontSize: 14,
                      borderWidth: 1,
                    },
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
                      color: theme.color?.val || '#000000',
                      borderColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                    },
                  ]}
                  placeholder={language === 'sv' ? 'Sök rutter, städer...' : 'Search routes, cities...'}
                  placeholderTextColor={theme.gray10?.val || '#999'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 10,
                    }}
                    onPress={handleClearSearch}
                  >
                    <Feather name="x-circle" size={18} color={theme.gray10?.val || '#999'} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Routes List */}
              <YStack flex={1}>
                {filteredRoutes.length === 0 ? (
                  <YStack flex={1} justifyContent="center" alignItems="center" padding="$6" gap="$4">
                    <Feather name="inbox" size={48} color={colorScheme === 'dark' ? '#666' : '#CCC'} />
                    <YStack alignItems="center" gap="$2">
                      <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                        {type === 'created' && 'No Routes Created'}
                        {type === 'saved' && 'No Saved Routes'}
                        {type === 'driven' && 'No Driven Routes'}
                        {type === 'drafts' && 'No Draft Routes'}
                        {!type && 'No Routes'}
                      </Text>
                      <Text fontSize="$4" color="$gray11" textAlign="center">
                        {type === 'created' && 'Create your first route to get started'}
                        {type === 'saved' && 'Save routes from the map to access them here'}
                        {type === 'driven' && 'Mark routes as driven to track your progress'}
                        {type === 'drafts' && 'Draft routes will appear here'}
                        {!type && 'Routes will appear here when available'}
                      </Text>
                    </YStack>
                  </YStack>
                ) : (
                <RouteList
                    routes={filteredRoutes}
                  onRoutePress={(routeId) => {
                      console.log('📋 [RouteListSheet] Route pressed, opening RouteDetailSheet:', routeId);
                      setSelectedRouteId(routeId);
                      setShowRouteDetailSheet(true);
                  }}
                />
                )}
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
      
      {/* Route Detail Sheet - Shown on top of Route List Sheet */}
      {selectedRouteId && (
        <RouteDetailSheet
          visible={showRouteDetailSheet}
          routeId={selectedRouteId}
          onClose={() => {
            console.log('📋 [RouteListSheet] RouteDetailSheet closed, returning to RouteListSheet');
            setShowRouteDetailSheet(false);
            setSelectedRouteId(null);
            // RouteListSheet stays open
          }}
        />
      )}
    </Modal>
  );
}
