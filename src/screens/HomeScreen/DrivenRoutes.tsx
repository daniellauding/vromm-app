import { RouteCard } from '@/src/components/RouteCard';
import { SectionHeader } from '@/src/components/SectionHeader';
import { RouteListSheet } from '@/src/components/RouteListSheet';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { Route, RouteType } from '@/src/types/route';
import React from 'react';
import { YStack, XStack, Card } from 'tamagui';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { navigateDomain } from '@/src/utils/navigation';
import { supabase } from '../../lib/supabase';
import { Image, ImageSourcePropType, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/src/components';
import { EmptyState } from './EmptyState';
import { useModal } from '@/src/contexts/ModalContext';
import { CreateRouteSheet } from '@/src/components/CreateRouteSheet';

// Import getting started images
const GETTING_STARTED_IMAGES = {
  startLearning: require('../../../assets/images/getting_started/getting_started_03.png'),
};

type DrivenRouteFromDB = {
  id: string;
  route_id: string | null;
  user_id: string | null;
  driven_at: string | null;
  routes: Route | null;
};

type DrivenRoute = Route & {
  driven_at: string;
};

const getRouteImage: (route: Route) => string | null = (route) => {
  if (!route.media_attachments || !Array.isArray(route.media_attachments)) {
    return null;
  }

  for (const attachment of route.media_attachments) {
    if (
      attachment &&
      typeof attachment === 'object' &&
      'type' in attachment &&
      attachment.type === 'image' &&
      'url' in attachment &&
      typeof attachment.url === 'string'
    ) {
      return attachment.url;
    }
  }

  return null;
};

const isValidRoute = (route: any): route is Route => {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    Array.isArray(route.media_attachments)
  );
};

interface DrivenRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

export const DrivenRoutes = ({ onRoutePress }: DrivenRoutesProps = {}) => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const [drivenRoutes, setDrivenRoutes] = React.useState<Route[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);
  const colorScheme = useColorScheme();
  const { showModal, hideModal } = useModal();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Use effective user ID (student if viewing as student, otherwise current user)
  const effectiveUserId = getEffectiveUserId();

  const loadDrivenRoutes = React.useCallback(async () => {
    if (!effectiveUserId) return;

    const startTime = Date.now();
    console.log('⚡ [DrivenRoutes] Loading driven routes for user:', effectiveUserId);
      console.log('🚗 [DrivenRoutes] Is viewing as student:', isViewingAsStudent);

      try {
        const { data: drivenData, error: drivenError } = await supabase
          .from('driven_routes')
          .select('*, routes(*, creator:creator_id(id, full_name))')
          .eq('user_id', effectiveUserId)
          .not('driven_at', 'is', null)
          .order('driven_at', { ascending: false });

        if (drivenError) throw drivenError;

        const transformedRoutes = (drivenData as DrivenRouteFromDB[])
          .filter((item) => item.driven_at && item.routes && isValidRoute(item.routes))
          .map((item) => {
            // We know routes is not null from the filter
            const route = item.routes!;
            return {
              ...route,
              driven_at: item.driven_at as string,
              id: route.id,
              name: route.name,
              media_attachments: route.media_attachments || [],
              difficulty: route.difficulty || null,
              spot_type: route.spot_type || null,
              category: route.category || null,
              description: route.description || null,
              waypoint_details: route.waypoint_details || [],
              creator_id: route.creator_id,
              created_at: route.created_at,
              updated_at: route.updated_at,
            };
          }) as DrivenRoute[];

        setDrivenRoutes(transformedRoutes);
      console.log('⚡ [DrivenRoutes] Driven routes loaded in:', Date.now() - startTime, 'ms');
      } catch (err) {
        console.error('Error loading driven routes:', err);
      }
  }, [effectiveUserId, isViewingAsStudent]);

  React.useEffect(() => {
    if (!effectiveUserId) return;
    
    loadDrivenRoutes();

    // Set up real-time subscription for driven routes changes
    console.log('📡 [DrivenRoutes] Setting up real-time subscription for user:', effectiveUserId);
    const drivenSubscription = supabase
      .channel(`driven_routes_changes_${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'driven_routes',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          console.log('📡 [DrivenRoutes] Driven route change detected:', payload.eventType);
          // Reload routes when any change occurs
          loadDrivenRoutes();
        },
      )
      .subscribe();

    return () => {
      console.log('📡 [DrivenRoutes] Cleaning up subscription');
      drivenSubscription.unsubscribe();
    };
  }, [effectiveUserId, loadDrivenRoutes]);

  const onNavigateToRouteList = React.useCallback(() => {
    console.log('[SHEET][HomeSection] DrivenRoutes → RouteListSheet');
    setShowRouteListSheet(true);
  }, []);

  return (
    <YStack gap="$0">
      <SectionHeader
        title={
          isViewingAsStudent
            ? `${activeStudentName || 'Student'}'s Driven Routes`
            : t('home.drivenRoutes')
        }
        variant="chevron"
        onAction={onNavigateToRouteList}
        actionLabel={t('common.seeAll')}
        showActionLabel={false}
      />
      {drivenRoutes.length > 0 ? (
        <FlatList
          horizontal
          data={drivenRoutes}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 0 }}
          renderItem={({ item: route }) => (
            <XStack marginRight="$3">
              <RouteCard
                route={route as any}
                // preset="compact"
                onPress={() => {
                  if (onRoutePress) {
                    onRoutePress(route.id);
                  } else {
                    navigation.navigate('RouteDetail', { routeId: route.id });
                  }
                }}
              />
            </XStack>
          )}
        />
      ) : (
        <YStack px="$4">
          <Card
            backgroundColor="$backgroundStrong"
            borderRadius="$4"
            overflow="hidden"
            borderWidth={1}
            borderColor="$borderColor"
          >
            {/* Image from Getting Started - Full width at top */}
            <Image
              source={GETTING_STARTED_IMAGES.startLearning}
              style={{
                width: '100%',
                height: 140,
                resizeMode: 'cover',
              }}
            />

            {/* Content below image */}
            <YStack alignItems="center" gap="$4" padding="$6">
              {/* Title and Message */}
              <YStack alignItems="center" gap="$2">
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {language === 'sv' ? 'Inga körda rutter' : 'No Driven Routes'}
                </Text>
                <Text fontSize="$4" color="$gray11" textAlign="center">
                  {isViewingAsStudent
                    ? `${activeStudentName || (language === 'sv' ? 'Denna elev' : 'This student')} ${language === 'sv' ? 'har inte kört några övningsrutter än' : "hasn't driven any practice routes yet"}`
                    : language === 'sv'
                      ? 'Börja köra övningsrutter för att spåra dina framsteg och se dem här'
                      : 'Start driving practice routes to track your progress and see them here'}
                </Text>
              </YStack>

              {/* Action Buttons */}
              {!isViewingAsStudent && (
                <YStack gap="$2" width="100%">
                  <TouchableOpacity
                    onPress={() => (navigation as any).navigate('MapTab')}
                    style={{
                      backgroundColor: '#00E6C3',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text fontSize="$4" fontWeight="600" color="#000">
                      {getTranslation(
                        'home.drivenRoutes.findRoutes',
                        language === 'sv' ? 'Hitta rutter' : 'Find Routes',
                      )}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      showModal(
                        <CreateRouteSheet
                          visible={true}
                          onClose={() => hideModal()}
                          onRouteCreated={(routeId) => {
                            console.log('✅ Route created with ID:', routeId);
                            hideModal();
                          }}
                        />
                      );
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor:
                        colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Text fontSize="$4" fontWeight="600" color="$color">
                      {getTranslation(
                        'home.drivenRoutes.createRoute',
                        language === 'sv' ? 'Skapa rutt' : 'Create Route',
                      )}
                    </Text>
                  </TouchableOpacity>
                </YStack>
              )}
            </YStack>
          </Card>
        </YStack>
      )}

      {/* Route List Sheet */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => setShowRouteListSheet(false)}
        title={
          isViewingAsStudent
            ? `${activeStudentName || 'Student'}'s Driven Routes`
            : t('home.drivenRoutes')
        }
        routes={drivenRoutes}
        type="driven"
      />
    </YStack>
  );
};
