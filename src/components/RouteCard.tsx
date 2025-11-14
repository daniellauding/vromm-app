import React from 'react';
import { View, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, Text, Card, XStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { Feather } from '@expo/vector-icons';
import { Database } from '../lib/database.types';
import { parseRecordingStats, isRecordedRoute } from '../utils/routeUtils';
import { AppAnalytics } from '../utils/analytics';
import RouteDetailsCarousel from './RouteDetailSheet/RouteDetailsCarousel';
import CarouselItem from './RouteDetailSheet/CarouselItem';
import { getCarouselItems } from './RouteDetailSheet/utils';
import { useTranslation } from '../contexts/TranslationContext';
import { useThemePreference } from '../hooks/useThemeOverride';

type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

type MediaAttachment = {
  url: string;
  type: 'image' | 'video';
  description?: string;
};

type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    id?: string;
    full_name: string;
  } | null;
  creator_id?: string;
  metadata: {
    waypoints?: WaypointData[];
  };
  waypoint_details: WaypointData[];
  media_attachments?: MediaAttachment[];
  reviews?: {
    id: string;
    rating: number;
    content: string;
    difficulty: string;
    visited_at: string;
    created_at: string;
    images: { url: string; description?: string }[];
    user: { id: string; full_name: string };
  }[];
};

type RouteCardSize = 'large' | 'medium' | 'small' | 'xs';

interface RouteCardProps {
  route: Route;
  onPress?: () => void;
  // Size variants
  size?: RouteCardSize;
  // Visibility props - all default to true to maintain current behavior
  showMap?: boolean;
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showAuthor?: boolean;
  showRouteMeta?: boolean;
}

export function RouteCard({
  route,
  onPress,
  size = 'medium',
  showMap = true,
  showImage = true,
  showTitle = true,
  showDescription = true,
  showAuthor = true,
  showRouteMeta = true,
}: RouteCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const { t, language } = useTranslation();

  // Helper function to get translation with fallback
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  // Size-based styling
  const sizeConfig = React.useMemo(() => {
    switch (size) {
      case 'large':
        return {
          padding: '$5' as const,
          carouselHeight: Dimensions.get('window').height * 0.35,
          titleFontSize: '$6' as const,
          iconSize: 18,
          textFontSize: '$4' as const,
          metaIconSize: 18,
          space: '$4' as const,
          metaSpace: '$4' as const,
        };
      case 'small':
        return {
          padding: '$3' as const,
          carouselHeight: Dimensions.get('window').height * 0.2,
          titleFontSize: '$4' as const,
          iconSize: 14,
          textFontSize: '$3' as const,
          metaIconSize: 14,
          space: '$2' as const,
          metaSpace: '$2' as const,
        };
      case 'xs':
        return {
          padding: '$2' as const,
          carouselHeight: Dimensions.get('window').height * 0.15,
          titleFontSize: '$3' as const,
          iconSize: 12,
          textFontSize: '$2' as const,
          metaIconSize: 12,
          space: '$1.5' as const,
          metaSpace: '$1.5' as const,
        };
      case 'medium':
      default:
        return {
          padding: '$4' as const,
          carouselHeight: Dimensions.get('window').height * 0.3,
          titleFontSize: '$5' as const,
          iconSize: 16,
          textFontSize: '$4' as const,
          metaIconSize: 16,
          space: '$3' as const,
          metaSpace: '$4' as const,
        };
    }
  }, [size]);

  // Check if we should show carousel (RouteDetailsCarousel will handle filtering internally)
  const shouldShowCarousel = React.useMemo(() => {
    if (!showMap && !showImage) return false;
    // Check if route has content to show
    const hasWaypoints = route?.waypoint_details?.length > 0;
    const hasMedia = route?.media_attachments?.length > 0;
    return (showMap && hasWaypoints) || (showImage && hasMedia);
  }, [route, showMap, showImage]);

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Navigation function to be called from runOnJS
  const navigateToRoute = React.useCallback(() => {
    // Track route card interaction
    AppAnalytics.trackButtonPress('route_card', 'RouteCard', {
      route_id: route.id,
      route_title: route.name,
      route_type: route.spot_type,
      has_onpress_callback: !!onPress,
    }).catch(() => {
      // Silently fail analytics
    });

    if (onPress) {
      // When onPress is provided, ONLY call the callback (for sheets)
      onPress();
    } else {
      // Default behavior: Open route detail under Map tab so Map tab remains active
      // @ts-expect-error - Navigation types don't match exactly but this works at runtime
      navigation.navigate('MainTabs', {
        screen: 'MapTab',
        params: { screen: 'RouteDetail', params: { routeId: route.id } },
      });
    }
  }, [route.id, route.name, route.spot_type, onPress, navigation]);

  // Enhanced press handler with animations
  const handlePress = React.useCallback(() => {
    // Zoom and fade animation sequence
    scale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 300 }),
      withSpring(1.05, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );

    opacity.value = withSequence(
      withSpring(0.8, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 }, () => {
        // Navigate after animation completes
        runOnJS(navigateToRoute)();
      }),
    );
  }, [scale, opacity, navigateToRoute]);

  // Render carousel conditionally
  const renderCarousel = () => {
    if (!shouldShowCarousel) return null;

    // For medium and large, use the full carousel
    if (size === 'medium' || size === 'large') {
      return (
        <RouteDetailsCarousel
          routeData={route}
          showMap={showMap}
          showImage={showImage}
          height={sizeConfig.carouselHeight}
        />
      );
    }

    // For small and xs, show just the first item (simplified)
    // We need to get the first filtered item
    const allItems = getCarouselItems(route);
    const filteredItems = allItems.filter((item: { type: string }) => {
      if (item.type === 'map') return showMap;
      if (item.type === 'image') return showImage;
      return showImage;
    });

    if (filteredItems.length === 0) return null;

    return (
      <View
        style={{
          height: sizeConfig.carouselHeight,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: size === 'xs' ? 8 : 12,
        }}
      >
        <CarouselItem item={filteredItems[0]} />
      </View>
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <Card padding={sizeConfig.padding} onPress={handlePress}>
        <YStack space={sizeConfig.space}>
          {/* Carousel/Map/Image */}
          {renderCarousel()}

          <YStack space={sizeConfig.space}>
            {/* Title */}
            {showTitle && (
              <Text fontSize={sizeConfig.titleFontSize} fontWeight="bold">
                {route.name}
              </Text>
            )}

            {/* Author */}
            {showAuthor && (
              <XStack space="$2" alignItems="center">
                {(route.creator as unknown as { avatar_url?: string })?.avatar_url ? (
                  <Image
                    source={{
                      uri: (route.creator as unknown as { avatar_url?: string }).avatar_url!,
                    }}
                    style={{
                      width: sizeConfig.iconSize,
                      height: sizeConfig.iconSize,
                      borderRadius: sizeConfig.iconSize / 2,
                    }}
                  />
                ) : (
                  <Feather name="user" size={sizeConfig.iconSize} color={iconColor} />
                )}
                <Text fontSize={sizeConfig.textFontSize} color="$gray11"
                  onPress={() => {
                    console.log('RouteCard: Navigating to profile, creator:', route.creator);
                    if (route.creator?.id) {
                      console.log('RouteCard: Using creator.id:', route.creator.id);
                      navigation.navigate('PublicProfile', { userId: route.creator.id });
                    } else if (route.creator_id) {
                      console.log('RouteCard: Using creator_id:', route.creator_id);
                      navigation.navigate('PublicProfile', { userId: route.creator_id });
                    } else {
                      console.log('RouteCard: No creator ID available');
                    }
                  }}
                  pressStyle={{ opacity: 0.7 }}
                >
                  {route.creator?.full_name ||
                    getTranslation('common.unknown', language === 'sv' ? 'Okänd' : 'Unknown')}
                </Text>
              </XStack>
            )}

            {/* Route Meta (Difficulty, Spot Type, Rating) */}
            {showRouteMeta && (
              <>
                <XStack space={sizeConfig.metaSpace} flexWrap="wrap">
                  <XStack space="$1" alignItems="center">
                    <Feather name="bar-chart" size={sizeConfig.metaIconSize} color={iconColor} />
                    <Text fontSize={sizeConfig.textFontSize}>
                      {route.difficulty === 'beginner'
                        ? getTranslation(
                            'filters.difficulty.beginner',
                            language === 'sv' ? 'Nybörjare' : 'Beginner',
                          )
                        : route.difficulty === 'intermediate'
                          ? getTranslation(
                              'filters.difficulty.intermediate',
                              language === 'sv' ? 'Medel' : 'Intermediate',
                            )
                          : route.difficulty === 'advanced'
                            ? getTranslation(
                                'filters.difficulty.advanced',
                                language === 'sv' ? 'Avancerad' : 'Advanced',
                              )
                            : route.difficulty}
                    </Text>
                  </XStack>

                  <XStack space="$1" alignItems="center">
                    <Feather name="map-pin" size={sizeConfig.metaIconSize} color={iconColor} />
                    <Text fontSize={sizeConfig.textFontSize}>
                      {route.spot_type === 'urban'
                        ? getTranslation(
                            'filters.spotType.urban',
                            language === 'sv' ? 'Urban' : 'Urban',
                          )
                        : route.spot_type === 'highway'
                          ? getTranslation(
                              'filters.spotType.highway',
                              language === 'sv' ? 'Motorväg' : 'Highway',
                            )
                          : route.spot_type === 'rural'
                            ? getTranslation(
                                'filters.spotType.rural',
                                language === 'sv' ? 'Landsbygd' : 'Rural',
                              )
                            : route.spot_type === 'residential'
                              ? getTranslation(
                                  'filters.spotType.parking',
                                  language === 'sv' ? 'Parkering' : 'Parking',
                                )
                              : route.spot_type}
                    </Text>
                  </XStack>
                </XStack>

                <XStack space="$2" alignItems="center">
                  <XStack space="$1" alignItems="center">
                    <Feather name="star" size={sizeConfig.metaIconSize} color={iconColor} />
                    <Text fontSize={sizeConfig.textFontSize} fontWeight="bold" color="$yellow10">
                      {route.reviews?.[0]?.rating?.toFixed(1) || '0.0'}
                    </Text>
                  </XStack>
                  <Text fontSize={sizeConfig.textFontSize} color="$gray11">
                    {route.reviews?.length || 0}{' '}
                    {route.reviews?.length === 1
                      ? getTranslation('route.review', language === 'sv' ? 'recension' : 'review')
                      : getTranslation(
                          'route.reviews',
                          language === 'sv' ? 'recensioner' : 'reviews',
                        )}
                  </Text>
                </XStack>
              </>
            )}

            {/* Recording Stats - Only show for recorded routes */}
            {isRecordedRoute(route) &&
              (() => {
                const recordingStats = parseRecordingStats(route.description || '');
                if (!recordingStats) return null;

                return (
                  <XStack gap="$3" alignItems="center" marginTop="$2">
                    <Feather name="activity" size={sizeConfig.metaIconSize - 2} color="$green10" />
                    <Text fontSize={sizeConfig.textFontSize} color="$green10" fontWeight="600">
                      📍 {recordingStats.distance} • ⏱️ {recordingStats.duration} • 🚗{' '}
                      {recordingStats.maxSpeed}
                    </Text>
                  </XStack>
                );
              })()}

            {/* Description */}
            {showDescription && route.description && !isRecordedRoute(route) && (
              <Text
                numberOfLines={size === 'xs' ? 1 : size === 'small' ? 2 : 2}
                fontSize={sizeConfig.textFontSize}
                color="$gray11"
              >
                {route.description}
              </Text>
            )}
          </YStack>
        </YStack>
      </Card>
    </Animated.View>
  );
}
