import React, { useMemo, useCallback, useState } from 'react';
import { Platform, View, TouchableOpacity, StyleProp, ViewStyle, Dimensions } from 'react-native';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Text, Circle, XStack, YStack } from 'tamagui';

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
        <Text color="white" fontWeight="bold">
          {count}
        </Text>
      </Circle>
    </TouchableOpacity>
  );
}

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w'; // Replace with your Mapbox token

const WaypointMarker = ({
  cluster,
  expandedCluster,
  onMarkerPress,
  customMarker,
  selectedPin,
  handleClusterPress,
}: {
  cluster: Cluster;
  expandedCluster: string | null;
  onMarkerPress: (waypoint: Waypoint) => void;
  customMarker: React.ReactNode;
  selectedPin: string | null;
  handleClusterPress: (cluster: Cluster) => void;
}) => {
  // Show individual pins for single markers, expanded clusters, or when zoomed in
  if (cluster.points.length === 1 || expandedCluster === 'all' || cluster.id === expandedCluster) {
    return (
      <Marker
        coordinate={cluster.coordinate}
        anchor={{ x: 0, y: 0 }}
        onPress={(e) => {
          e.stopPropagation();
          onMarkerPress?.(cluster.points[0]);
        }}
      >
        {customMarker || (
          <View
            style={{
              width: 10,
              height: 10,
              backgroundColor: selectedPin === cluster.points[0].id ? 'red' : 'coral',
              borderRadius: 5,
            }}
          />
        )}
      </Marker>
    );
  }

  // Show cluster marker
  return (
    <Marker
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
};

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
  customMarker,
  ref,
}) {
  const mapRef = React.useRef<MapView>(null);
  const BASE_CLUSTER_DISTANCE = 10;
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(0);
  const lastRegionChange = React.useRef<number>(0);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  // Forward the ref
  React.useImperativeHandle(ref, () => mapRef.current!, []);

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

  // Calculate clusters
  const calculateClusters = useCallback(
    ({ region, expandedCluster }: { region: Region; expandedCluster: string | null }) => {
      if (!region || !waypoints.length) return [];

      // Otherwise, proceed with clustering
      let validWaypoints = waypoints.filter(
        (wp) =>
          wp.latitude &&
          wp.longitude &&
          !isNaN(wp.latitude) &&
          !isNaN(wp.longitude) &&
          wp.latitude !== 0 &&
          wp.longitude !== 0,
      );

      // Filter waypoints outside the view bounding box
      const minLat = region.latitude - region.latitudeDelta / 2;
      const maxLat = region.latitude + region.latitudeDelta / 2;
      const minLng = region.longitude - region.longitudeDelta / 2;
      const maxLng = region.longitude + region.longitudeDelta / 2;

      const inViewWaypoints = validWaypoints.filter(
        (wp) =>
          wp.latitude >= minLat &&
          wp.latitude <= maxLat &&
          wp.longitude >= minLng &&
          wp.longitude <= maxLng,
      );

      validWaypoints = inViewWaypoints;

      if (validWaypoints.length === 0) return [];

      console.log('validWaypoints', validWaypoints.length);

      // Calculate clustering based on zoom level
      const zoomLevel = calculateZoomLevel(region);
      const clusterDistance = BASE_CLUSTER_DISTANCE * Math.max(1, (20 - zoomLevel) / 10);

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
        const nearbyPoints: Waypoint[] = [];

        // Find all points within clustering distance
        for (let i = points.length - 1; i >= 0; i--) {
          const otherPoint = points[i];
          const latDiff = Math.abs(point.latitude - otherPoint.latitude);
          const lngDiff = Math.abs(point.longitude - otherPoint.longitude);

          const pixelDist = Math.sqrt(
            Math.pow(latDiff * pixelsPerLat, 2) + Math.pow(lngDiff * pixelsPerLng, 2),
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

          nearbyPoints.forEach((nearbyPoint) => {
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
      setClusters(clusters);
    },
    [waypoints, calculateZoomLevel, debugLog],
  );

  // Handle region changes
  const handleRegionChange = useCallback(
    (newRegion: Region) => {
      try {
        calculateClusters({ region: newRegion, expandedCluster: null });
      } catch (error) {
        console.error('Error in handleRegionChange:', error);
      }
    },
    [currentZoomLevel, calculateClusters, debugLog],
  );

  const handleClusterPress = useCallback((cluster: Cluster) => {
    if (mapRef.current) {
      const lats = cluster.points.map((p) => p.latitude);
      const lngs = cluster.points.map((p) => p.longitude);
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

  if (!region) return null;

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
          return (
            <WaypointMarker
              key={cluster.id}
              cluster={cluster}
              expandedCluster={expandedCluster}
              onMarkerPress={onMarkerPress}
              customMarker={customMarker}
              selectedPin={selectedPin}
              handleClusterPress={handleClusterPress}
            />
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
