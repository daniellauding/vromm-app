import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, Region, Polyline } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Text, Circle } from 'tamagui';
import Supercluster from 'supercluster';

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

    return (
      <Marker
        coordinate={toLocation(cluster.geometry.coordinates)}
        anchor={{ x: 0, y: 0 }}
        onPress={(e) => {
          e.stopPropagation();
          onMarkerPress?.(cluster.properties.id);
        }}
      >
        {customMarker || (
          <View
            style={{
              width: 10,
              height: 10,
              backgroundColor: selectedPin === cluster.properties.id ? 'red' : 'coral',
              borderRadius: 5,
            }}
          />
        )}
      </Marker>
    );
  },
  (prevProps, nextProps) => prevProps.cluster.id === nextProps.cluster.id,
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
}: {
  waypoints: Waypoint[];
  region: Region;
  style: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  onPress?: () => void;
  selectedPin?: string | null;
  onMarkerPress?: (waypointId: string) => boolean | void;
  customMarker?: React.ReactNode;
  ref?: React.Ref<MapView>;
  routePath?: RoutePathPoint[];
  routePathColor?: string;
  routePathWidth?: number;
}) {
  const mapRef = React.useRef<MapView>(null);
  const lastRegionChange = React.useRef<number>(0);
  const [clusters, setClusters] = useState<
    (
      | Supercluster.PointFeature<Supercluster.AnyProps>
      | Supercluster.ClusterFeature<Supercluster.AnyProps>
    )[]
  >([]);
  const supercluster = useRef<Supercluster | null>(
    new Supercluster({ minZoom: 0, maxZoom: 15, radius: 30 }),
  );
  // Forward the ref
  React.useImperativeHandle(ref, () => mapRef.current!, []);

  useEffect(() => {
    if (waypoints.length > 0) {
      const geoPoints = waypoints.map((point: Waypoint) => ({
        type: 'Feature',
        properties: {
          id: point.id,
          title: point.title,
        },
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
      }));
      supercluster.current?.load(geoPoints);
    }
  }, [waypoints]);

  // Calculate clusters
  const calculateClusters = useCallback(
    async ({ region }: { region: Region }) => {
      if (!region || !waypoints.length) return [];

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
    [waypoints],
  );

  // Handle region changes
  const handleRegionChange = useCallback(
    (newRegion: Region) => {
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
        {/* Display route path if provided */}
        {routePath && routePath.length > 1 && (
          <Polyline
            coordinates={routePath}
            strokeWidth={routePathWidth}
            strokeColor={routePathColor}
            lineJoin="round"
          />
        )}
        
        {clusters.map((cluster) => {
          return (
            <WaypointMarker
              key={cluster.properties.cluster_id ?? cluster.properties.id ?? cluster.id}
              cluster={cluster}
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
