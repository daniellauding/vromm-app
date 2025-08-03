import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, Region, Polyline } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Text, Circle } from 'tamagui';
import Supercluster from 'supercluster';
import RouterDrawing from './RouterDrawing';

export type Waypoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  id?: string;
  onPress?: () => void;
};

export type RoutePathPoint = {
  latitude: number;
  longitude: number;
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

const toLocation = (
  coordinate:
    | Supercluster.PointFeature<Supercluster.AnyProps>['geometry']['coordinates']
    | Supercluster.ClusterFeature<Supercluster.AnyProps>['geometry']['coordinates'],
) => {
  return {
    latitude: coordinate?.[1],
    longitude: coordinate?.[0],
  };
};

const WaypointMarker = React.memo(
  ({
    cluster,
    onMarkerPress,
    customMarker,
    selectedPin,
    handleClusterPress,
    drawingMode,
    waypointIndex,
    totalWaypoints,
  }: {
    cluster:
      | Supercluster.PointFeature<Supercluster.AnyProps>
      | Supercluster.ClusterFeature<Supercluster.AnyProps>;
    expandedCluster: string | null;
    onMarkerPress: (waypointId: string) => void;
    customMarker: React.ReactNode;
    selectedPin: string | null;
    handleClusterPress: (
      cluster:
        | Supercluster.PointFeature<Supercluster.AnyProps>
        | Supercluster.ClusterFeature<Supercluster.AnyProps>,
    ) => void;
    drawingMode?: string;
    waypointIndex?: number;
    totalWaypoints?: number;
  }) => {
    if (cluster.properties.cluster === true) {
      // Show cluster marker
      return (
        <Marker
          coordinate={toLocation(cluster.geometry.coordinates)}
          onPress={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            handleClusterPress(cluster);
          }}
        >
          <ClusterMarker
            count={cluster.properties.point_count}
            onPress={(e?: { stopPropagation: () => void }) => {
              e?.stopPropagation();
              handleClusterPress(cluster);
            }}
          />
        </Marker>
      );
    }

    // Custom marker for different drawing modes
    const getMarkerColor = () => {
      if (drawingMode === 'pin') return '#3B82F6'; // Blue for pins
      if (drawingMode === 'waypoint') {
        if (waypointIndex === 0) return '#22C55E'; // Green for start
        if (waypointIndex === (totalWaypoints || 1) - 1 && (totalWaypoints || 0) > 1)
          return '#EF4444'; // Red for end
        return '#3B82F6'; // Blue for middle waypoints
      }
      if (drawingMode === 'pen') return '#FF6B35'; // Orange for pen points
      return selectedPin === cluster.properties.id ? 'red' : 'coral';
    };

    const getMarkerSize = () => {
      if (drawingMode === 'pin') return 16;
      if (drawingMode === 'waypoint') return 14;
      if (drawingMode === 'pen') return 8;
      return 10;
    };

    return (
      <Marker
        coordinate={toLocation(cluster.geometry.coordinates)}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={(e) => {
          e.stopPropagation();
          onMarkerPress?.(cluster.properties.id);
        }}
      >
        {customMarker || (
          <View
            style={{
              width: getMarkerSize(),
              height: getMarkerSize(),
              backgroundColor: getMarkerColor(),
              borderRadius: getMarkerSize() / 2,
              borderWidth: 2,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 3,
            }}
          />
        )}
      </Marker>
    );
  },
  (prevProps, nextProps) =>
    prevProps.cluster.id === nextProps.cluster.id &&
    prevProps.drawingMode === nextProps.drawingMode &&
    prevProps.waypointIndex === nextProps.waypointIndex,
);

function getClusterExpansionRegion(supercluster: Supercluster, clusterId: number) {
  // Retrieve all leaves (points) of the cluster
  const leaves = supercluster.getLeaves(clusterId, Infinity);

  // Extract coordinates from leaves
  const coordinates = leaves.map((leaf) => leaf.geometry.coordinates);

  // Calculate bounding box
  const lats = coordinates.map((coord) => coord[1]);
  const lngs = coordinates.map((coord) => coord[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Calculate center
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;

  // Calculate deltas with padding
  const latDelta = (maxLat - minLat) * 1.2 || 0.02;
  const lngDelta = (maxLng - minLng) * 1.2 || 0.02;

  return {
    latitude,
    longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
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
  customMarker,
  ref,
  routePath,
  routePathColor = '#1A73E8',
  routePathWidth = 3,
  showStartEndMarkers = false,
  drawingMode,
  penDrawingCoordinates = [],
}: {
  waypoints: Waypoint[];
  region: Region;
  style: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  onPress?: (event: any) => void;
  selectedPin?: string | null;
  onMarkerPress?: (waypointId: string) => boolean | void;
  customMarker?: React.ReactNode;
  ref?: React.Ref<MapView>;
  routePath?: RoutePathPoint[];
  routePathColor?: string;
  routePathWidth?: number;
  showStartEndMarkers?: boolean;
  drawingMode?: string;
  penDrawingCoordinates?: Array<{ latitude: number; longitude: number }>;
}) {
  const mapRef = React.useRef<MapView>(null);
  const currentRegion = React.useRef<Region | null>(null);
  const [clusters, setClusters] = useState<
    (
      | Supercluster.PointFeature<Supercluster.AnyProps>
      | Supercluster.ClusterFeature<Supercluster.AnyProps>
    )[]
  >([]);
  const supercluster = useRef<Supercluster | null>(
    new Supercluster({ minZoom: 0, maxZoom: 15, radius: 30 })
  );
  
  // Forward the ref
  React.useImperativeHandle(ref, () => mapRef.current!, []);

  // Calculate clusters (but skip clustering in drawing modes)
  const calculateClusters = useCallback(
    async ({ region }: { region: Region | null }) => {
      if (!region || !waypoints.length) return [];

      // Skip clustering in drawing modes - show individual waypoints
      if (drawingMode === 'pin' || drawingMode === 'waypoint' || drawingMode === 'pen') {
        const individualPoints = waypoints.map((point, index) => ({
          type: 'Feature' as const,
          properties: {
            id: point.id || `waypoint-${index}`,
            title: point.title,
            cluster: false,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [point.longitude, point.latitude],
          },
        }));
        setClusters(individualPoints);
        return;
      }

      const bbox: GeoJSON.BBox = [
        region.longitude - region.longitudeDelta / 2, // west
        region.latitude - region.latitudeDelta / 2, // south
        region.longitude + region.longitudeDelta / 2, // east
        region.latitude + region.latitudeDelta / 2, // north
      ];

      function getZoomLevel(region: Region) {
        const { latitudeDelta } = region;
        const zoomLevel = Math.log2(360 / latitudeDelta);
        return zoomLevel;
      }

      const clusters = supercluster.current?.getClusters(bbox, getZoomLevel(region)) ?? [];

      setClusters(clusters ?? []);
    },
    [waypoints, drawingMode],
  );

  useEffect(() => {
    console.log('🗺️ Map: waypoints changed', {
      count: waypoints.length,
      drawingMode,
      hasWaypoints: waypoints.length > 0,
      waypointIds: waypoints.map((wp) => wp.id || 'no-id').slice(0, 5), // Only first 5 IDs
      timestamp: Date.now(),
    });

    if (waypoints.length > 0) {
      const geoPoints = waypoints.map((point: Waypoint) => ({
        type: 'Feature' as const,
        properties: {
          id: point.id || `waypoint-${waypoints.indexOf(point)}`,
          title: point.title || 'Waypoint',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude],
        },
      }));

      console.log('🗺️ Map: created geoPoints', geoPoints.length, 'features');
      supercluster.current?.load(geoPoints);
      calculateClusters({ region: currentRegion.current });
    } else {
      // Clear clusters when no waypoints
      console.log('🗺️ Map: clearing clusters (no waypoints)');
      setClusters([]);
    }
  }, [waypoints, calculateClusters, drawingMode]);

  // Handle region changes
  const handleRegionChange = useCallback(
    (newRegion: Region) => {
      currentRegion.current = newRegion;
      try {
        calculateClusters({ region: newRegion });
      } catch (error) {
        console.error('Error in handleRegionChange:', error);
      }
    },
    [calculateClusters],
  );

  const handleClusterPress = useCallback(
    (
      cluster:
        | Supercluster.PointFeature<Supercluster.AnyProps>
        | Supercluster.ClusterFeature<Supercluster.AnyProps>,
    ) => {
      if (mapRef.current && supercluster.current) {
        const region = getClusterExpansionRegion(
          supercluster.current,
          cluster.properties.cluster_id,
        );

        mapRef.current.animateToRegion(region, 500);
      }
    },
    [],
  );

  if (!region) return null;

  console.log('🗺️ Map: region', region);
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
        showsUserLocation={true}
        onPress={onPress}
        onRegionChangeComplete={handleRegionChange}
        userInterfaceStyle="dark"
      >
        <RouterDrawing
          routePath={routePath}
          penDrawingCoordinates={penDrawingCoordinates}
          drawingMode={drawingMode}
          routePathColor={routePathColor}
          routePathWidth={routePathWidth}
          showStartEndMarkers={showStartEndMarkers}
        />
        {clusters.map((cluster, index) => {
          // Find waypoint index for proper coloring
          const waypointIndex = waypoints.findIndex(
            (wp) =>
              wp.id === cluster.properties.id ||
              `waypoint-${waypoints.indexOf(wp)}` === cluster.properties.id,
          );

          console.log('🗺️ Map: cluster', cluster);

          return (
            <WaypointMarker
              key={cluster.properties.cluster_id ?? cluster.properties.id ?? cluster.id ?? index}
              cluster={cluster}
              expandedCluster={null}
              onMarkerPress={onMarkerPress || (() => {})}
              customMarker={customMarker}
              selectedPin={selectedPin || null}
              handleClusterPress={handleClusterPress}
              drawingMode={drawingMode}
              waypointIndex={waypointIndex >= 0 ? waypointIndex : index}
              totalWaypoints={waypoints.length}
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
