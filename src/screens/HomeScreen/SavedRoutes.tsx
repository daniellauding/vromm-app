import React from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import { FlatList, Dimensions, TouchableOpacity, Image, useColorScheme, View } from 'react-native';

import { HeroCarousel } from '../../components/HeroCarousel';
import { NavigationProp } from '@/src/types/navigation';
import { useNavigation } from '@react-navigation/native';
import { navigateDomain } from '@/src/utils/navigation';
import { SectionHeader } from '../../components/SectionHeader';
import { RouteListSheet } from '../../components/RouteListSheet';
import { EmptyState } from './EmptyState';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useAuth } from '@/src/context/AuthContext';
import { useStudentSwitch } from '@/src/context/StudentSwitchContext';
import { supabase } from '../../lib/supabase';
import { Route, SavedRoute, SavedRouteFromDB } from '@/src/types/route';

// Import getting started images
const GETTING_STARTED_IMAGES = {
  firstRoute: require('../../../assets/images/getting_started/getting_started_02.png'),
};

const isValidRoute = (route: any): route is Route => {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.name === 'string' &&
    Array.isArray(route.media_attachments)
  );
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

interface SavedRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

export const SavedRoutes = ({ onRoutePress }: SavedRoutesProps = {}) => {
  const { t, language } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { getEffectiveUserId, isViewingAsStudent, activeStudentName } = useStudentSwitch();
  const [savedRoutes, setSavedRoutes] = React.useState<SavedRoute[]>([]);
  const [showRouteListSheet, setShowRouteListSheet] = React.useState(false);

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // Use effective user ID (student if viewing as student, otherwise current user)
  const effectiveUserId = getEffectiveUserId();

  const loadSavedRoutes = React.useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_routes')
        .select('*, routes(*, creator:creator_id(id, full_name))')
        .eq('user_id', effectiveUserId)
        .order('saved_at', { ascending: false });

      if (savedError) throw savedError;

      const transformedRoutes = (savedData as SavedRouteFromDB[])
        .filter((item) => item.saved_at && item.routes && isValidRoute(item.routes))
        .map((item) => {
          // We know routes is not null from the filter
          const route = item.routes!;
          return {
            ...route,
            saved_at: item.saved_at as string,
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
        }) as SavedRoute[];

      console.log('💾 [SavedRoutes] Loaded saved routes:', transformedRoutes.length);
      setSavedRoutes(transformedRoutes);
    } catch (err) {
      console.error('❌ [SavedRoutes] Error loading saved routes:', err);
    }
  }, [effectiveUserId]);

  React.useEffect(() => {
    if (!effectiveUserId) return;
    loadSavedRoutes();

    const savedSubscription = supabase
      .channel(`saved_routes_changes_${effectiveUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'saved_routes',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          // Reload saved routes when any change occurs
          loadSavedRoutes();
        },
      )
      .subscribe();

    return () => {
      savedSubscription.unsubscribe();
    };
  }, [loadSavedRoutes, effectiveUserId]);

  if (savedRoutes.length === 0) {
    return (
      <YStack px="$4" mt="$4">
        <Card
          backgroundColor="$backgroundStrong"
          borderRadius="$4"
          overflow="hidden"
          borderWidth={1}
          borderColor="$borderColor"
        >
          {/* Image from Getting Started - Full width at top */}
          <Image
            source={GETTING_STARTED_IMAGES.firstRoute}
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
                {language === 'sv' ? 'Inga sparade rutter' : 'No Saved Routes'}
              </Text>
              <Text fontSize="$4" color="$gray11" textAlign="center">
                {isViewingAsStudent
                  ? `${activeStudentName || (language === 'sv' ? 'Denna elev' : 'This student')} ${language === 'sv' ? 'har inte sparat några rutter än' : "hasn't saved any routes yet"}`
                  : language === 'sv'
                    ? 'Spara rutter från kartan eller community för att komma åt dem snabbt här'
                    : 'Save routes from the map or community to access them quickly here'}
              </Text>
            </YStack>

            {/* Single Action Button */}
            {!isViewingAsStudent && (
              <TouchableOpacity
                onPress={() => navigation.navigate('MapTab')}
                style={{
                  backgroundColor: '#00E6C3',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 8,
                }}
              >
                <Text fontSize="$4" fontWeight="600" color="#000">
                  {getTranslation(
                    'home.savedRoutes.exploreRoutes',
                    language === 'sv' ? 'Utforska rutter' : 'Explore Routes'
                  )}
                </Text>
              </TouchableOpacity>
            )}
          </YStack>
        </Card>
      </YStack>
    );
  }

  return (
    <>
      <YStack gap="$6">
        <SectionHeader
          title={
            isViewingAsStudent
              ? `${activeStudentName || 'Student'}'s Saved Routes`
              : t('home.savedRoutes')
          }
          variant="chevron"
          onAction={() => {
            const titleText = isViewingAsStudent
              ? `${activeStudentName || 'Student'}'s Saved Routes`
              : t('home.savedRoutes');
            console.log('[SHEET][HomeSection] SavedRoutes → RouteListSheet with title:', titleText);
            setShowRouteListSheet(true);
          }}
          actionLabel={t('common.seeAll')}
        />
        <XStack paddingHorizontal="$4">
          <SavedRoutesGrid
            routes={savedRoutes}
            getImageUrl={getRouteImage}
            onRoutePress={onRoutePress ? (route) => onRoutePress(route.id) : undefined}
          />
        </XStack>
      </YStack>

      {/* Route List Sheet */}
      <RouteListSheet
        visible={showRouteListSheet}
        onClose={() => setShowRouteListSheet(false)}
        title={
          isViewingAsStudent
            ? `${activeStudentName || 'Student'}'s Saved Routes`
            : t('home.savedRoutes')
        }
        routes={savedRoutes}
        type="saved"
      />
    </>
  );
};

// Grid component for saved routes
interface SavedRoutesGridProps {
  routes: SavedRoute[];
  getImageUrl: (route: Route) => string | null;
  onRoutePress?: (routeId: string) => void;
}

const SavedRoutesGrid = ({ routes, getImageUrl, onRoutePress }: SavedRoutesGridProps) => {
  const colorScheme = useColorScheme();
  const { width: screenWidth } = Dimensions.get('window');

  // Calculate item dimensions for 3x3 grid
  const itemWidth = (screenWidth - 32 - 16) / 3; // 32 for padding, 16 for gaps
  const itemHeight = itemWidth * 1.2; // Slightly taller for text

  const renderGridItem = ({ item }: { item: SavedRoute }) => {
    const imageUrl = getImageUrl(item);

    return (
      <TouchableOpacity
        onPress={() => onRoutePress?.(item.id)}
        style={{
          width: itemWidth,
          height: itemHeight,
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        <Card
          backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'}
          bordered
          padding="$2"
          height="100%"
          borderRadius="$3"
        >
          <YStack gap="$2" height="100%">
            {/* Image */}
            <View
              style={{
                width: '100%',
                height: itemWidth * 0.6,
                borderRadius: 8,
                overflow: 'hidden',
                backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
              }}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
                  }}
                >
                  <Text color="$gray10" fontSize="$2">
                    No Image
                  </Text>
                </View>
              )}
            </View>

            {/* Route Info */}
            <YStack gap="$1" flex={1}>
              <Text fontSize="$3" fontWeight="600" color="$color" numberOfLines={2} lineHeight={16}>
                {item.name}
              </Text>
              <Text fontSize="$2" color="$gray11" numberOfLines={1}>
                {item.difficulty || item.category || 'Route'}
              </Text>
            </YStack>
          </YStack>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={routes}
      renderItem={renderGridItem}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingRight: 16, // Extra padding to show partial item
      }}
      snapToInterval={itemWidth + 8} // Snap to each item
      decelerationRate="fast"
    />
  );
};
