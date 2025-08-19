import React, { useState, useRef } from 'react';
import { YStack, XStack, Text, Button, Card } from 'tamagui';
import {
  Image,
  ImageSourcePropType,
  Dimensions,
  View,
  StyleSheet,
  useColorScheme,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import type { Route } from '../hooks/useRoutes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map } from './Map';
import { FlatList } from 'react-native-gesture-handler';

type HeroCarouselProps = {
  title: string;
  items: Route[];
  onItemPress?: (item: Route) => void;
  getImageUrl: (item: Route) => string | null;
  height?: number;
  showTitle?: boolean;
  showMapPreview?: boolean;
};

const styles = StyleSheet.create({
  mapPreviewContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ffbc',
    borderColor: '#145251',
    borderWidth: 2,
  },
});

const getMapRegion = (item: Route) => {
  const waypointsData = item.waypoint_details || item.metadata?.waypoints || [];
  if (waypointsData.length > 0) {
    const latitudes = waypointsData.map((wp) => Number(wp.lat));
    const longitudes = waypointsData.map((wp) => Number(wp.lng));

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    const minDelta = 0.01;
    const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
    const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }
  return null;
};

const getWaypoints = (item: Route) => {
  const waypointsData = item.waypoint_details || item.metadata?.waypoints || [];
  return waypointsData.map((wp) => ({
    latitude: Number(wp.lat),
    longitude: Number(wp.lng),
    title: wp.title?.toString(),
    description: wp.description?.toString(),
  }));
};

function HeroCarouselItem({
  item,
  getImageUrl,
  showMapPreview,
  height,
  onItemPress,
}: {
  item: Route;
  getImageUrl: (item: Route) => string | null;
  showMapPreview: boolean;
  height: number;
  onItemPress?: (item: Route) => void;
}) {
  const navigation = useNavigation<NavigationProp>();
  const screenWidth = Dimensions.get('window').width;
  const imageUrl = getImageUrl(item);
  const region = showMapPreview ? getMapRegion(item) : null;
  const waypoints = showMapPreview ? getWaypoints(item) : [];
  const colorScheme = useColorScheme();

  const handleItemPress = React.useCallback(() => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      navigation.navigate('RouteDetail', { routeId: item.id });
    }
  }, [navigation, onItemPress, item]);

  console.log('🎨 [HeroCarouselItem] Waypoints:');

  return (
    <Card
      key={item.id}
      bordered={false}
      elevate
      backgroundColor="$backgroundStrong"
      width={screenWidth}
      height={height}
      onPress={handleItemPress}
      borderRadius={0}
    >
      <YStack f={1}>
        <View style={{ position: 'relative' }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl } as ImageSourcePropType}
              style={{
                width: screenWidth,
                height: height * 0.7,
              }}
              resizeMode="cover"
            />
          ) : (
            <YStack
              height={height * 0.7}
              backgroundColor="$gray5"
              alignItems="center"
              justifyContent="center"
            >
              <Feather name="image" size={48} color="$gray11" />
            </YStack>
          )}
          {showMapPreview && region && waypoints.length > 0 && (
            <View style={styles.mapPreviewContainer}>
              <Map
                waypoints={waypoints}
                region={region}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                style={{ width: '100%', height: '100%' }}
                customMarker={<View style={styles.customMarker} />}
              />
            </View>
          )}
        </View>
        <YStack padding="$4" gap="$2" flex={1}>
          <Text size="lg" weight="bold" numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          {item.creator && (
            <XStack space="$1" alignItems="center" marginTop="$1">
              <Feather name="user" size={14} color={colorScheme === 'dark' ? 'white' : 'black'} />
              <Text
                color="$gray11"
                size="xs"
                onPress={() => {
                  if (item.creator?.id) {
                    navigation.navigate('PublicProfile', { userId: item.creator.id });
                  } else if (item.creator_id) {
                    navigation.navigate('PublicProfile', { userId: item.creator_id });
                  }
                }}
                pressStyle={{ opacity: 0.7 }}
              >
                {item.creator?.full_name || 'Unknown'}
              </Text>
            </XStack>
          )}
          <Text size="md" color="$gray11">
            {item.difficulty?.toUpperCase()}
          </Text>
          {item.description && (
            <Text size="sm" color="$gray11" numberOfLines={2} ellipsizeMode="tail">
              {item.description}
            </Text>
          )}
        </YStack>
      </YStack>
    </Card>
  );
}

export function HeroCarousel({
  title,
  items,
  onItemPress,
  getImageUrl,
  height = Dimensions.get('window').height * 0.85, // Increased to 85vh
  showTitle = true,
  showMapPreview = false,
}: HeroCarouselProps) {
  const scrollViewRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const insets = useSafeAreaInsets();

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const contentOffset = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffset / screenWidth);
      setActiveIndex(index);
    },
    [screenWidth],
  );

  const scrollToIndex = React.useCallback((index: number) => {
    scrollViewRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <YStack gap="$2" width="100%">
      {showTitle && (
        <XStack justifyContent="space-between" alignItems="center" px="$4" pt={insets.top}>
          <Text size="xl" weight="bold">
            {title}
          </Text>
          <XStack gap="$2">
            {items.map((_, index) => (
              <Button
                key={index}
                size="xs"
                circular
                backgroundColor={activeIndex === index ? '$primary' : '$gray5'}
                onPress={() => scrollToIndex(index)}
              />
            ))}
          </XStack>
        </XStack>
      )}

      <FlatList
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ width: screenWidth }}
        contentContainerStyle={{ width: screenWidth * items.length }}
        data={items}
        renderItem={({ item }) => (
          <HeroCarouselItem
            key={item.id}
            item={item}
            getImageUrl={getImageUrl}
            showMapPreview={showMapPreview}
            height={height}
            onItemPress={onItemPress}
          />
        )}
      />

      {!showTitle && (
        <XStack justifyContent="center" alignItems="center" py="$2">
          {items.map((_, index) => (
            <Button
              key={index}
              size="xs"
              circular
              backgroundColor={activeIndex === index ? '$primary' : '$gray5'}
              onPress={() => scrollToIndex(index)}
              marginHorizontal="$1"
            />
          ))}
        </XStack>
      )}
    </YStack>
  );
}
