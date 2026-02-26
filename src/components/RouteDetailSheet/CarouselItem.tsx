import React, { useRef } from 'react';
import { Buffer } from 'buffer';
import { View, TouchableOpacity } from 'react-native';
import { Text } from 'tamagui';
import { supabase } from '../../lib/supabase';

import { Map } from './../Map';
import { Play } from '@tamagui/lucide-icons';
import { WebView } from 'react-native-webview';
import { ImageWithFallback } from './../ImageWithFallback';

import { PIN_COLORS } from '../../styles/mapStyles';
import MapView from 'react-native-maps';

export default function CarouselItem({
  routeId,
  item,
  saveMap,
  style,
}: {
  routeId: string;
  item: any;
  saveMap?: boolean;
  style: any;
}): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const itemWidth = style?.width ?? 300;
  const itemHeight = style?.height ?? itemWidth * 0.75;

  const saveMapSnapshot = React.useCallback(async () => {
    if (!saveMap) {
      return;
    }

    const snapshot = await mapRef.current.takeSnapshot({
      format: 'jpg', // image formats: 'png', 'jpg' (default: 'png')
      quality: 0.8, // image quality: 0..1 (only relevant for jpg, default: 1)
      result: 'base64', // result types: 'file', 'base64' (default: 'file')
    });

    const buffer = Buffer.from(snapshot, 'base64');

    await supabase.storage
      .from('route_previews')
      .upload(`${routeId}.png`, buffer, { upsert: true, contentType: 'image/png' });

    const result = await supabase.storage.from('route_previews').getPublicUrl(`${routeId}.png`);

    await supabase
      .from('routes')
      .update({ preview_image: result?.data?.publicUrl })
      .eq('id', routeId);
  }, [routeId, saveMap]);

  if (item.type === 'map') {
    if (item.preview_image) {
      return (
        <ImageWithFallback
          source={{ uri: item.preview_image }}
          style={{ width: itemWidth, height: itemHeight }}
          resizeMode="cover"
        />
      );
    }
    return (
      <View style={{ width: itemWidth, height: itemHeight }}>
        <Map
          ref={mapRef}
          waypoints={item.waypoints}
          region={item.region}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={false}
          routePath={item.routePath}
          pins={item.pins}
          routePathColor={PIN_COLORS.ROUTE_PATH}
          showStartEndMarkers={item.showStartEndMarkers}
          drawingMode={item.waypoints.length > 2 ? 'waypoint' : 'pin'}
          onMapLoaded={saveMapSnapshot}
        />
      </View>
    );
  } else if (item.type === 'image') {
    return (
      <ImageWithFallback
        source={{ uri: item.url }}
        style={{ width: itemWidth, height: itemHeight }}
        resizeMode="cover"
      />
    );
  } else if (item.type === 'video') {
    return (
      <TouchableOpacity
        style={{ width: itemWidth, height: itemHeight, position: 'relative' }}
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
        style={{ width: itemWidth, height: itemHeight }}
        allowsInlineMediaPlaybook={true}
        mediaPlaybackRequiresUserAction={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    );
  }
  return <View style={{ width: itemWidth, height: itemHeight }} />;
}
