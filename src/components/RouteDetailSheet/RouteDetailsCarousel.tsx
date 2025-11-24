import React, { useState } from 'react';
import { View, Dimensions } from 'react-native';

import { XStack } from 'tamagui';

import Carousel from 'react-native-reanimated-carousel';

import { getCarouselItems } from './utils';
import CarouselItem from './CarouselItem';

const { height, width } = Dimensions.get('window');
export interface RouteDetailsCarouselProps {
  routeData: any;
  showMap?: boolean;
  showImage?: boolean;
  showVideo?: boolean;
  height?: number;
  enableCarousel?: boolean;
}

export default function RouteDetailsCarousel({
  routeData,
  showMap = true,
  showImage = true,
  showVideo = true,
  height: customHeight,
  enableCarousel = true,
}: RouteDetailsCarouselProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const carouselItems = React.useMemo(() => {
    const allItems = getCarouselItems(routeData);
    // Filter based on showMap/showImage/showVideo props
    return allItems.filter((item: any) => {
      if (item.type === 'map') return showMap;
      if (item.type === 'image') return showImage;
      if (item.type === 'video' || item.type === 'youtube') return showVideo;
      return false;
    });
  }, [routeData, showMap, showImage, showVideo]);

  const carouselHeight = customHeight ?? height * 0.3;

  if (carouselItems.length === 0) return null;

  // Show single item if only one item OR carousel is disabled
  // Match card border radius (16px = $4 in Tamagui) - only top corners
  const cardBorderRadius = 16;
  if (carouselItems.length === 1 || !enableCarousel) {
    return (
      <View
        style={{
          height: carouselHeight,
          borderTopLeftRadius: cardBorderRadius,
          borderTopRightRadius: cardBorderRadius,
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        <CarouselItem item={carouselItems[0]} />
      </View>
    );
  }

  // Show carousel when multiple items and carousel is enabled
  return (
    <View
      style={{
        height: carouselHeight,
        borderTopLeftRadius: cardBorderRadius,
        borderTopRightRadius: cardBorderRadius,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      <Carousel
        loop
        width={width - 32}
        height={carouselHeight}
        data={carouselItems}
        renderItem={({ item }) => <CarouselItem item={item} />}
        onSnapToItem={setActiveMediaIndex}
      />
      {/* Pagination dots */}
      {carouselItems.length > 1 && (
        <XStack
          position="absolute"
          bottom={16}
          alignSelf="center"
          gap="$2"
          padding="$2"
          backgroundColor="transparent"
          borderRadius="$4"
        >
          {carouselItems.map((_, index) => (
            <View
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === activeMediaIndex ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </XStack>
      )}
    </View>
  );
}
