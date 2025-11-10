import React from 'react';
import { View, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from 'tamagui';

import { Map } from './../Map';
import { Play } from '@tamagui/lucide-icons';
import { WebView } from 'react-native-webview';
import { ImageWithFallback } from './../ImageWithFallback';

import { PIN_COLORS } from '../../styles/mapStyles';

const { height, width } = Dimensions.get('window');

export default function CarouselItem({ item }: { item: any }): React.JSX.Element {
  const HERO_HEIGHT = height * 0.3; // Smaller height for sheet

  if (item.type === 'map') {
    return (
      <Map
        waypoints={item.waypoints}
        region={item.region}
        style={{ width: width - 32, height: HERO_HEIGHT }}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        routePath={item.routePath}
        pins={item.pins}
        routePathColor={PIN_COLORS.ROUTE_PATH}
        showStartEndMarkers={item.showStartEndMarkers}
        drawingMode={item.waypoints.length > 2 ? 'waypoint' : 'pen'}
      />
    );
  } else if (item.type === 'image') {
    return (
      <ImageWithFallback
        source={{ uri: item.url }}
        style={{ width: width - 32, height: HERO_HEIGHT }}
        resizeMode="cover"
      />
    );
  } else if (item.type === 'video') {
    return (
      <TouchableOpacity
        style={{ width: width - 32, height: HERO_HEIGHT, position: 'relative' }}
        onPress={() => console.log('🎥 Video play requested:', item.url)}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 50,
              width: 80,
              height: 80,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Play size={40} color="#FFF" />
          </View>
          <Text style={{ color: '#FFF', marginTop: 12, fontSize: 14, fontWeight: '600' }}>
            Tap to play video
          </Text>
        </View>
      </TouchableOpacity>
    );
  } else if (item.type === 'youtube') {
    return (
      <WebView
        source={{ uri: item.url }}
        style={{ width: width - 32, height: HERO_HEIGHT }}
        allowsInlineMediaPlaybook={true}
        mediaPlaybackRequiresUserAction={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    );
  }
  return <View style={{ width: width - 32, height: HERO_HEIGHT }} />;
}
