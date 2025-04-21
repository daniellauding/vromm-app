import React, { useMemo, useCallback, useState } from 'react';
import { Platform, View, TouchableOpacity, StyleProp, ViewStyle, Dimensions } from 'react-native';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Text, Circle, XStack, YStack } from 'tamagui';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';

export type Waypoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  id?: string;
  onPress?: () => void;
};

type MapProps = {
  waypoints: Waypoint[];
  region?: Region;
  style?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  onPress?: () => void;
  selectedPin?: string | null;
  onMarkerPress?: (waypoint: Waypoint) => void;
  customMarker?: React.ReactNode;
};

type Cluster = {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  points: Waypoint[];
};

type ClusterMarkerProps = {
  count: number;
  onPress?: (e?: { stopPropagation: () => void }) => void;
};

function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Circle 
        size={40} 
        backgroundColor="$blue10"
        pressStyle={{ scale: 0.97 }}
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontWeight="bold">{count}</Text>
      </Circle>
    </TouchableOpacity>
  );
}

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

export function Map({ 
  waypoints, 
  region, 
  style,
  scrollEnabled = true,
  zoomEnabled = true,
  pitchEnabled = true,
  rotateEnabled = true,
  onPress,
  selectedPin,
  onMarkerPress,
  customMarker
}: MapProps) {
  if (!region) return null;

  const mapRef = React.useRef<MapView>(null);
  const BASE_CLUSTER_DISTANCE = 25;
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(0);
  const lastRegionChange = React.useRef<number>(0);

  // Debug logging function - only log if more than 500ms has passed
  const debugLog = useCallback((message: string, data?: any) => {
    const now = Date.now();
    if (now - lastRegionChange.current > 500) {
      console.log(`[Map] ${message}`, data || '');
      lastRegionChange.current = now;
    }
  }, []);

  // Calculate zoom level from region
  const calculateZoomLevel = useCallback((region: Region) => {
    const { longitudeDelta } = region;
    return Math.round(Math.log(360 / longitudeDelta) / Math.LN2);
  }, []);

  // Handle region changes
  const handleRegionChange = useCallback((newRegion: Region) => {
    try {
      const newZoomLevel = calculateZoomLevel(newRegion);
      
      // Only process if zoom level has changed significantly
      if (Math.abs(newZoomLevel - currentZoomLevel) >= 0.5) {
        debugLog('Significant zoom change:', {
          oldZoom: currentZoomLevel,
          newZoom: newZoomLevel,
          delta: Math.abs(newZoomLevel - currentZoomLevel)
        });
        
        setCurrentZoomLevel(newZoomLevel);
        
        // Auto expand/collapse based on zoom
        if (newZoomLevel >= 10) { // Lower threshold for earlier expansion
          debugLog('Expanding clusters at zoom level:', newZoomLevel);
          setExpandedCluster('all');
        } else {
          debugLog('Collapsing clusters at zoom level:', newZoomLevel);
          setExpandedCluster(null);
        }
      }
    } catch (error) {
      console.error('Error in handleRegionChange:', error);
    }
  }, [currentZoomLevel, calculateZoomLevel, debugLog]);

  // Calculate clusters
  const clusters = useMemo(() => {
    if (!region || !waypoints.length) return [];

    // If we're zoomed in enough, don't cluster at all
    if (expandedCluster === 'all') {
      debugLog('Zoom level high enough, showing all points individually');
      return waypoints.map(point => ({
        id: `marker-${point.id || Math.random()}`,
        coordinate: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
        points: [point],
      }));
    }

    // Otherwise, proceed with clustering
    const validWaypoints = waypoints.filter(wp => 
      wp.latitude && wp.longitude && 
      !isNaN(wp.latitude) && !isNaN(wp.longitude) &&
      wp.latitude !== 0 && wp.longitude !== 0
    );

    if (validWaypoints.length === 0) return [];

    // Calculate clustering based on zoom level
    const zoomLevel = calculateZoomLevel(region);
    const clusterDistance = BASE_CLUSTER_DISTANCE * Math.max(1, (20 - zoomLevel) / 10);

    debugLog('Clustering state:', {
      zoomLevel,
      clusterDistance,
      waypoints: validWaypoints.length
    });

    const { width } = Dimensions.get('window');
    const latDelta = region.latitudeDelta;
    const lngDelta = region.longitudeDelta;
    const pixelsPerLat = width / latDelta;
    const pixelsPerLng = width / lngDelta;

    const clusters: Cluster[] = [];
    const points = [...validWaypoints];
    let clusterIdCounter = 0;

    while (points.length > 0) {
      const point = points.pop()!;
      let nearbyPoints: Waypoint[] = [];

      // Find all points within clustering distance
      for (let i = points.length - 1; i >= 0; i--) {
        const otherPoint = points[i];
        const latDiff = Math.abs(point.latitude - otherPoint.latitude);
        const lngDiff = Math.abs(point.longitude - otherPoint.longitude);
        
        const pixelDist = Math.sqrt(
          Math.pow(latDiff * pixelsPerLat, 2) + 
          Math.pow(lngDiff * pixelsPerLng, 2)
        );

        if (pixelDist < clusterDistance) {
          nearbyPoints.push(otherPoint);
          points.splice(i, 1);
        }
      }

      const clusterId = `cluster-${clusterIdCounter++}`;
      
      // Only create a cluster if we have more than 2 points total
      if (nearbyPoints.length >= 2) {
        const allPoints = [point, ...nearbyPoints];
        const centerLat = allPoints.reduce((sum, p) => sum + p.latitude, 0) / allPoints.length;
        const centerLng = allPoints.reduce((sum, p) => sum + p.longitude, 0) / allPoints.length;

        clusters.push({
          id: clusterId,
          coordinate: {
            latitude: centerLat,
            longitude: centerLng,
          },
          points: allPoints,
        });
      } else {
        // If not enough nearby points, add as standalone markers
        clusters.push({
          id: `marker-${point.id || clusterId}`,
          coordinate: {
            latitude: point.latitude,
            longitude: point.longitude,
          },
          points: [point],
        });
        
        nearbyPoints.forEach(nearbyPoint => {
          clusters.push({
            id: `marker-${nearbyPoint.id || clusterIdCounter++}`,
            coordinate: {
              latitude: nearbyPoint.latitude,
              longitude: nearbyPoint.longitude,
            },
            points: [nearbyPoint],
          });
        });
      }
    }

    debugLog('Created clusters:', clusters.length);
    return clusters;
  }, [region, waypoints, calculateZoomLevel, debugLog, expandedCluster]);

  const handleClusterPress = useCallback((cluster: Cluster) => {
    if (mapRef.current) {
      const lats = cluster.points.map(p => p.latitude);
      const lngs = cluster.points.map(p => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Calculate a smaller delta to ensure pins are spread out
      const latDelta = Math.max((maxLat - minLat) * 1.2, 0.005);
      const lngDelta = Math.max((maxLng - minLng) * 1.2, 0.005);
      
      const newRegion: Region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
      
      setExpandedCluster(cluster.id);
      mapRef.current.animateToRegion(newRegion, 300);
    }
  }, []);

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
        onPress={onPress}
        onRegionChangeComplete={handleRegionChange}
      >
        {clusters.map((cluster) => {
          // Show individual pins for single markers, expanded clusters, or when zoomed in
          if (cluster.points.length === 1 || expandedCluster === 'all' || cluster.id === expandedCluster) {
            return cluster.points.map((point, index) => (
              <Marker
                key={`${cluster.id}-point-${index}`}
                coordinate={{
                  latitude: point.latitude,
                  longitude: point.longitude,
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  onMarkerPress?.(point);
                }}
              >
                {customMarker || <View style={{ width: 10, height: 10, backgroundColor: selectedPin === point.id ? "red" : "coral", borderRadius: 5 }} />}
              </Marker>
            ));
          }

          // Show cluster marker
          return (
            <Marker
              key={cluster.id}
              coordinate={cluster.coordinate}
              onPress={(e: { stopPropagation: () => void }) => {
                e.stopPropagation();
                handleClusterPress(cluster);
              }}
            >
              <ClusterMarker 
                count={cluster.points.length}
                onPress={(e?: { stopPropagation: () => void }) => {
                  e?.stopPropagation();
                  handleClusterPress(cluster);
                }}
              />
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
