import React from 'react';
import { Platform, View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Text } from 'tamagui';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';

export type Waypoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  onPress?: () => void;
};

type MapProps = {
  waypoints: {
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    onPress?: () => void;
  }[];
  region?: Region;
  style?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  onPress?: () => void;
};

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w'; // Replace with your Mapbox token

function WebMap({ waypoints, region, style }: MapProps) {
  const mapCenter = `[${region?.longitude},${region?.latitude}]`;
  const zoom = 13;

  const markers = waypoints.map((wp, index) => 
    `new mapboxgl.Marker()
      .setLngLat([${wp.longitude},${wp.latitude}])
      .setPopup(new mapboxgl.Popup().setHTML('<h3>${wp.title || ''}</h3><p>${wp.description || ''}</p>'))
      .addTo(map)
      .getElement().addEventListener('click', function() {
        ${wp.onPress ? `window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerClick', index: ${index}}));` : ''}
      });`
  ).join(';');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Route Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
      <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: ${mapCenter},
          zoom: ${zoom}
        });

        map.on('load', () => {
          ${markers}

          // Fit bounds to show all waypoints
          if (${waypoints.length} > 0) {
            const bounds = [[${Math.min(...waypoints.map(wp => wp.longitude))}, ${Math.min(...waypoints.map(wp => wp.latitude))}], 
                          [${Math.max(...waypoints.map(wp => wp.longitude))}, ${Math.max(...waypoints.map(wp => wp.latitude))}]];
            map.fitBounds(bounds, { padding: 50 });
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && waypoints[data.index]?.onPress) {
        waypoints[data.index].onPress?.();
      }
    } catch (error) {
      console.error('Error handling webview message:', error);
    }
  };

  return (
    <WebView
      style={[styles.map, style]}
      source={{ html }}
      originWhitelist={['*']}
      onMessage={handleMessage}
    />
  );
}

function MapControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <View style={styles.controls}>
      <TouchableOpacity style={styles.controlButton} onPress={onZoomIn}>
        <Feather name="plus" size={24} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.controlButton} onPress={onZoomOut}>
        <Feather name="minus" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

function NativeMap({ waypoints, region, style, scrollEnabled = true, zoomEnabled = true, pitchEnabled = true, rotateEnabled = true }: MapProps) {
  const mapRef = React.useRef<MapView>(null);

  const handleZoomIn = () => {
    if (mapRef.current) {
      const newRegion = {
        ...region,
        latitudeDelta: region?.latitudeDelta ? region.latitudeDelta / 2 : 0,
        longitudeDelta: region?.longitudeDelta ? region.longitudeDelta / 2 : 0,
      };
      mapRef.current.animateToRegion(newRegion, 300);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const newRegion = {
        ...region,
        latitudeDelta: region?.latitudeDelta ? region.latitudeDelta * 2 : 0,
        longitudeDelta: region?.longitudeDelta ? region.longitudeDelta * 2 : 0,
      };
      mapRef.current.animateToRegion(newRegion, 300);
    }
  };

  React.useEffect(() => {
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 300);
    }
  }, [region]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={[{ width: '100%', height: '100%' }, style]}
        region={region}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        pitchEnabled={pitchEnabled}
        rotateEnabled={rotateEnabled}
      >
        {waypoints.map((waypoint, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: waypoint.latitude,
              longitude: waypoint.longitude,
            }}
            title={waypoint.title}
            description={waypoint.description}
          />
        ))}
      </MapView>
      {zoomEnabled && (
        <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      )}
    </View>
  );
}

export function Map({ 
  waypoints, 
  region, 
  style,
  scrollEnabled = true,
  zoomEnabled = true,
  pitchEnabled = true,
  rotateEnabled = true,
  onPress,
}: MapProps) {
  if (!region) return null;

  const mapRegion: Region = {
    latitude: region.latitude,
    longitude: region.longitude,
    latitudeDelta: region.latitudeDelta,
    longitudeDelta: region.longitudeDelta,
  };

  return (
    <MapView
      style={[{ width: '100%', height: '100%' }, style]}
      region={mapRegion}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      pitchEnabled={pitchEnabled}
      rotateEnabled={rotateEnabled}
      onPress={onPress}
    >
      {waypoints.map((waypoint, index) => (
        <Marker
          key={index}
          coordinate={{
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
          }}
          title={waypoint.title}
          description={waypoint.description}
          onPress={(e) => {
            e.stopPropagation();
            waypoint.onPress?.();
          }}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -50 }],
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButton: {
    padding: 8,
    borderRadius: 4,
  },
});
