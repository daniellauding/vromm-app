import React, { useState, useRef } from 'react';
import { YStack, XStack, Text, Button, Card, ScrollView } from 'tamagui';
import { Image, ImageSourcePropType, Dimensions, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import type { Route } from '../hooks/useRoutes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type HeroCarouselProps = {
  title: string;
  items: Route[];
  onItemPress?: (item: Route) => void;
  getImageUrl: (item: Route) => string | null;
  height?: number;
  showTitle?: boolean;
};

export function HeroCarousel({
  title,
  items,
  onItemPress,
  getImageUrl,
  height = 300,
  showTitle = true,
}: HeroCarouselProps) {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const insets = useSafeAreaInsets();

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setActiveIndex(index);
  };

  const handleItemPress = (item: Route) => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      navigation.navigate('RouteDetail', { routeId: item.id });
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

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
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ width: screenWidth }}
        contentContainerStyle={{ width: screenWidth * items.length }}
      >
        {items.map((item) => {
          const imageUrl = getImageUrl(item);
          return (
            <Card
              key={item.id}
              bordered={false}
              elevate
              backgroundColor="$backgroundStrong"
              width={screenWidth}
              height={height}
              onPress={() => handleItemPress(item)}
              borderRadius={0}
            >
              <YStack f={1}>
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
                <YStack padding="$4" gap="$2" flex={1}>
                  <Text size="lg" weight="bold" numberOfLines={1} ellipsizeMode="tail">
                    {item.name}
                  </Text>
                  <Text size="md" color="$gray11">
                    {item.difficulty?.toUpperCase()}
                  </Text>
                  {item.description && (
                    <Text
                      size="sm"
                      color="$gray11"
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.description}
                    </Text>
                  )}
                </YStack>
              </YStack>
            </Card>
          );
        })}
      </ScrollView>
      
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