import React from 'react';
import { View, Image, Dimensions, Platform } from 'react-native';
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

// Preset variants for common use cases
type RouteCardPreset =
  | 'default' // Medium, all content
  | 'compact' // Small, title + meta only, map/image
  | 'minimal' // XS, title + meta only, no media
  | 'map-only' // Small, map only with title
  | 'image-only' // Small, image only with title
  | 'video-only' // Small, video only with title (if route has video)
  | 'text-only' // Title + description + author + route meta only (no media)
  | 'title-only' // Just title, no media, no meta
  | 'author-only' // Just author info
  | 'meta-only' // Just route meta (difficulty, spot type, rating)
  | 'grid' // Small, optimized for grid (3-4 visible), 4:3 aspect
  | 'banner' // Wide banner format (16:9 aspect ratio)
  | 'tall' // Tall portrait format (3:4 aspect ratio)
  | 'square' // Square format (1:1 aspect ratio)
  | 'hero' // Netflix-style: tall, title/text above media, no meta
  | 'miniature'; // XS, map only, minimal info

interface RouteCardProps {
  route: Route;
  onPress?: () => void;
  // Size variants
  size?: RouteCardSize;
  // Preset variants (overrides individual props)
  preset?: RouteCardPreset;
  // Visibility props - all default to true to maintain current behavior
  showMap?: boolean;
  showImage?: boolean;
  showVideo?: boolean; // Show/hide videos (default: true, respects showImage for carousel)
  showTitle?: boolean;
  showDescription?: boolean;
  showAuthor?: boolean;
  showRouteMeta?: boolean;
  // Carousel/Slider control - default true (enables swipe/loop when multiple items)
  enableCarousel?: boolean;
  // Truncation control - default true (shows ellipsis when text doesn't fit)
  truncateTitle?: boolean; // If false, allows title to wrap to multiple lines
  truncateDescription?: boolean; // If false, allows description to wrap to multiple lines
  truncateAuthor?: boolean; // If false, allows author name to wrap
  truncateMeta?: boolean; // If false, allows meta text to wrap
}

export function RouteCard({
  route,
  onPress,
  size,
  preset,
  showMap = true,
  showImage = true,
  showVideo = true,
  showTitle = true,
  showDescription = true,
  showAuthor = true,
  showRouteMeta = true,
  enableCarousel = true,
  truncateTitle = true,
  truncateDescription = true,
  truncateAuthor = true,
  truncateMeta = true,
}: RouteCardProps) {
  // Apply preset if provided (sets defaults, but individual props can override)
  const resolvedProps = React.useMemo(() => {
    // Start with defaults or preset values
    let presetConfig: {
      size: RouteCardSize;
      showMap: boolean;
      showImage: boolean;
      showVideo: boolean;
      showTitle: boolean;
      showDescription: boolean;
      showAuthor: boolean;
      showRouteMeta: boolean;
      enableCarousel: boolean;
    } = {
      size: (size || 'medium') as RouteCardSize,
      showMap,
      showImage,
      showVideo,
      showTitle,
      showDescription,
      showAuthor,
      showRouteMeta,
      enableCarousel,
    };

    // Apply preset defaults if preset is provided (individual props can override)
    if (preset && preset !== 'default') {
      switch (preset) {
        case 'compact':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : true,
            showVideo: showVideo !== undefined ? showVideo : true,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'minimal':
          presetConfig = {
            size: size || 'xs',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : false,
          };
          break;
        case 'map-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'image-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : true,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'video-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : true,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'text-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : true,
            showAuthor: showAuthor !== undefined ? showAuthor : true,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : false,
          };
          break;
        case 'title-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : false,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : false,
          };
          break;
        case 'author-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : false,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : true,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : false,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : false,
          };
          break;
        case 'meta-only':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : false,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : false,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : false,
          };
          break;
        case 'grid':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : true,
            showVideo: showVideo !== undefined ? showVideo : true,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'banner':
          presetConfig = {
            size: size || 'medium',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : true,
            showVideo: showVideo !== undefined ? showVideo : true,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'tall':
          presetConfig = {
            size: size || 'medium',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : true,
            showVideo: showVideo !== undefined ? showVideo : true,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'square':
          presetConfig = {
            size: size || 'small',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : true,
            showVideo: showVideo !== undefined ? showVideo : true,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : true,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
        case 'miniature':
          presetConfig = {
            size: size || 'xs',
            showMap: showMap !== undefined ? showMap : true,
            showImage: showImage !== undefined ? showImage : false,
            showVideo: showVideo !== undefined ? showVideo : false,
            showTitle: showTitle !== undefined ? showTitle : true,
            showDescription: showDescription !== undefined ? showDescription : false,
            showAuthor: showAuthor !== undefined ? showAuthor : false,
            showRouteMeta: showRouteMeta !== undefined ? showRouteMeta : false,
            enableCarousel: enableCarousel !== undefined ? enableCarousel : true,
          };
          break;
      }
    }

    return presetConfig;
  }, [
    preset,
    size,
    showMap,
    showImage,
    showVideo,
    showTitle,
    showDescription,
    showAuthor,
    showRouteMeta,
    enableCarousel,
  ]);

  const {
    size: resolvedSize,
    showMap: resolvedShowMap,
    showImage: resolvedShowImage,
    showVideo: resolvedShowVideo,
    showTitle: resolvedShowTitle,
    showDescription: resolvedShowDescription,
    showAuthor: resolvedShowAuthor,
    showRouteMeta: resolvedShowRouteMeta,
    enableCarousel: resolvedEnableCarousel,
  } = resolvedProps;
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

  // Calculate aspect ratio based on preset
  const getAspectRatio = React.useMemo(() => {
    if (!preset) return null;

    switch (preset) {
      case 'banner':
        return 16 / 9; // Wide banner
      case 'tall':
        return 3 / 4; // Portrait/tall
      case 'square':
        return 1; // Square
      case 'grid':
        return 4 / 3; // 4:3 for grid
      case 'hero':
        return 2 / 3; // Netflix-style tall (3:2 or taller)
      default:
        return null; // Use default sizing
    }
  }, [preset]);

  // Size-based styling with aspect ratio support
  const sizeConfig = React.useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Calculate card width for grid layouts
    const getCardWidth = () => {
      if (preset === 'grid') {
        return (screenWidth - 32 - 24) / 3.5; // For 3-4 cards visible
      }
      if (resolvedSize === 'small') {
        return screenWidth - 32; // Full width minus padding
      }
      return screenWidth - 32;
    };

    const cardWidth = getCardWidth();
    let carouselHeight: number;

    // Apply aspect ratio if preset specifies one
    if (getAspectRatio) {
      carouselHeight = cardWidth / getAspectRatio;
    } else {
      // Default height calculations
      switch (resolvedSize) {
        case 'large':
          carouselHeight = screenHeight * 0.35;
          break;
        case 'small': {
          carouselHeight = cardWidth * 0.75; // Default 4:3 for small
          break;
        }
        case 'xs':
          carouselHeight = screenWidth * 0.5; // Square-ish
          break;
        case 'medium':
        default:
          carouselHeight = screenHeight * 0.3;
          break;
      }
    }

    switch (resolvedSize) {
      case 'large':
        return {
          padding: '$5' as const,
          carouselHeight,
          titleFontSize: '$6' as const,
          iconSize: 18,
          textFontSize: '$4' as const,
          metaIconSize: 18,
          space: '$4' as const,
          metaSpace: '$4' as const,
        };
      case 'small': {
        return {
          padding: '$2.5' as const,
          carouselHeight,
          titleFontSize: '$3' as const,
          iconSize: 12,
          textFontSize: '$2' as const,
          metaIconSize: 12,
          space: '$1.5' as const,
          metaSpace: '$1.5' as const,
        };
      }
      case 'xs':
        return {
          padding: '$2' as const,
          carouselHeight,
          titleFontSize: '$2' as const,
          iconSize: 10,
          textFontSize: '$1' as const,
          metaIconSize: 10,
          space: '$1' as const,
          metaSpace: '$1' as const,
        };
      case 'medium':
      default:
        return {
          padding: '$4' as const,
          carouselHeight,
          titleFontSize: '$5' as const,
          iconSize: 16,
          textFontSize: '$4' as const,
          metaIconSize: 16,
          space: '$3' as const,
          metaSpace: '$4' as const,
        };
    }
  }, [resolvedSize, preset, getAspectRatio]);

  // Check if we should show carousel (RouteDetailsCarousel will handle filtering internally)
  const shouldShowCarousel = React.useMemo(() => {
    if (!resolvedShowMap && !resolvedShowImage && !resolvedShowVideo) return false;
    // Check if route has content to show
    const hasWaypoints = route?.waypoint_details?.length > 0;
    const hasMedia = route?.media_attachments?.length > 0;
    const hasVideo =
      hasMedia &&
      route?.media_attachments?.some(
        (m: { type?: string }) => m.type === 'video' || m.type === 'youtube',
      );
    return (
      (resolvedShowMap && hasWaypoints) ||
      (resolvedShowImage && hasMedia) ||
      (resolvedShowVideo && hasVideo)
    );
  }, [route, resolvedShowMap, resolvedShowImage, resolvedShowVideo]);

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { opacity: opacity.value };
    }
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

    // Get filtered items
    const allItems = getCarouselItems(route);
    const filteredItems = allItems.filter((item: { type: string }) => {
      if (item.type === 'map') return resolvedShowMap;
      if (item.type === 'image') return resolvedShowImage;
      // For videos and youtube, respect showImage prop
      return resolvedShowImage;
    });

    if (filteredItems.length === 0) return null;

    // For medium, large, and hero, use RouteDetailsCarousel (supports carousel)
    if (resolvedSize === 'medium' || resolvedSize === 'large' || preset === 'hero') {
      return (
        <RouteDetailsCarousel
          routeData={route}
          showMap={resolvedShowMap}
          showImage={resolvedShowImage}
          showVideo={resolvedShowVideo}
          height={sizeConfig.carouselHeight}
          enableCarousel={resolvedEnableCarousel}
        />
      );
    }

    // For small and xs, show carousel if enabled and multiple items, otherwise first item
    const shouldShowCarouselForSmall = resolvedEnableCarousel && filteredItems.length > 1;

    if (shouldShowCarouselForSmall) {
      // Use carousel for small sizes when enabled and multiple items
      return (
        <RouteDetailsCarousel
          routeData={route}
          showMap={resolvedShowMap}
          showImage={resolvedShowImage}
          showVideo={resolvedShowVideo}
          height={sizeConfig.carouselHeight}
          enableCarousel={resolvedEnableCarousel}
        />
      );
    }

    // Single item view for small/xs when carousel disabled or only one item
    // Match card border radius (16px = $4 in Tamagui) - only top corners

    const cardBorderRadius = 16;
    return (
      <View
        style={{
          height: sizeConfig.carouselHeight,
          borderTopLeftRadius: cardBorderRadius,
          borderTopRightRadius: cardBorderRadius,
          overflow: 'hidden',
          marginBottom: resolvedSize === 'xs' ? 6 : 10,
        }}
      >
        <CarouselItem
          item={filteredItems[0]}
          routeId={route.id}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  };

  // Hero variant: title/text above media
  const isHeroVariant = preset === 'hero';

  return (
    <Animated.View style={animatedStyle}>
      <Card padding={sizeConfig.padding} onPress={handlePress} borderRadius="$4" overflow="hidden">
        <YStack space={sizeConfig.space}>
          {/* Hero variant: Title and description above media */}
          {isHeroVariant && (
            <YStack space={sizeConfig.space}>
              {/* Title */}
              {resolvedShowTitle && (
                <Text
                  fontSize={sizeConfig.titleFontSize}
                  fontWeight="bold"
                  numberOfLines={truncateTitle ? 2 : undefined}
                  ellipsizeMode={truncateTitle ? 'tail' : undefined}
                >
                  {route.name}
                </Text>
              )}
              {/* Description */}
              {resolvedShowDescription && route.description && !isRecordedRoute(route) && (
                <Text
                  numberOfLines={truncateDescription ? 3 : undefined}
                  fontSize={sizeConfig.textFontSize}
                  color="$gray11"
                  ellipsizeMode={truncateDescription ? 'tail' : undefined}
                >
                  {route.description}
                </Text>
              )}
              {/* Author */}
              {resolvedShowAuthor && (
                <XStack space="$2" alignItems="center" flexShrink={1}>
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
                  <Text
                    fontSize={sizeConfig.textFontSize}
                    color="$gray11"
                    numberOfLines={truncateAuthor ? 1 : undefined}
                    ellipsizeMode={truncateAuthor ? 'tail' : undefined}
                    flex={truncateAuthor ? 1 : undefined}
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
            </YStack>
          )}

          {/* Carousel/Map/Image */}
          {renderCarousel()}

          <YStack space={sizeConfig.space}>
            {/* Title - only show if not hero variant */}
            {resolvedShowTitle && !isHeroVariant && (
              <Text
                fontSize={sizeConfig.titleFontSize}
                fontWeight="bold"
                numberOfLines={
                  truncateTitle
                    ? resolvedSize === 'xs'
                      ? 1
                      : resolvedSize === 'small'
                        ? 2
                        : resolvedSize === 'medium'
                          ? 2
                          : 3
                    : undefined
                }
                ellipsizeMode={truncateTitle ? 'tail' : undefined}
              >
                {route.name}
              </Text>
            )}

            {/* Author - only show if not hero variant */}
            {resolvedShowAuthor && !isHeroVariant && (
              <XStack space="$2" alignItems="center" flexShrink={1}>
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
                <Text
                  fontSize={sizeConfig.textFontSize}
                  color="$gray11"
                  numberOfLines={truncateAuthor ? 1 : undefined}
                  ellipsizeMode={truncateAuthor ? 'tail' : undefined}
                  flex={truncateAuthor ? 1 : undefined}
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
            {resolvedShowRouteMeta && (
              <>
                <XStack space={sizeConfig.metaSpace} flexWrap="wrap">
                  <XStack space="$1" alignItems="center" flexShrink={1}>
                    <Feather name="bar-chart" size={sizeConfig.metaIconSize} color={iconColor} />
                    <Text
                      fontSize={sizeConfig.textFontSize}
                      numberOfLines={truncateMeta ? 1 : undefined}
                      ellipsizeMode={truncateMeta ? 'tail' : undefined}
                    >
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

                  <XStack space="$1" alignItems="center" flexShrink={1}>
                    <Feather name="map-pin" size={sizeConfig.metaIconSize} color={iconColor} />
                    <Text
                      fontSize={sizeConfig.textFontSize}
                      numberOfLines={truncateMeta ? 1 : undefined}
                      ellipsizeMode={truncateMeta ? 'tail' : undefined}
                      flexShrink={1}
                    >
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

                <XStack space="$2" alignItems="center" flexShrink={1}>
                  <XStack space="$1" alignItems="center">
                    <Feather name="star" size={sizeConfig.metaIconSize} color={iconColor} />
                    <Text
                      fontSize={sizeConfig.textFontSize}
                      fontWeight="bold"
                      color="$yellow10"
                      numberOfLines={truncateMeta ? 1 : undefined}
                    >
                      {route.reviews?.[0]?.rating?.toFixed(1) || '0.0'}
                    </Text>
                  </XStack>
                  <Text
                    fontSize={sizeConfig.textFontSize}
                    color="$gray11"
                    numberOfLines={truncateMeta ? 1 : undefined}
                    ellipsizeMode={truncateMeta ? 'tail' : undefined}
                    flexShrink={1}
                  >
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

            {/* Description - only show if not hero variant */}
            {resolvedShowDescription &&
              route.description &&
              !isRecordedRoute(route) &&
              !isHeroVariant && (
                <Text
                  numberOfLines={
                    truncateDescription
                      ? resolvedSize === 'xs'
                        ? 1
                        : resolvedSize === 'small'
                          ? 2
                          : resolvedSize === 'medium'
                            ? 3
                            : 4
                      : undefined
                  }
                  fontSize={sizeConfig.textFontSize}
                  color="$gray11"
                  ellipsizeMode={truncateDescription ? 'tail' : undefined}
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
