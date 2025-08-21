import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, Region, Polyline } from '../MapView';
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
  ({ waypoint, isStart, isEnd }: { waypoint: Waypoint; isStart: boolean; isEnd: boolean }) => {
    const color = isStart ? '#22C55E' : isEnd ? '#EF4444' : '#3B82F6';
    return (
      <Marker
        coordinate={{ latitude: waypoint.latitude, longitude: waypoint.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View
          style={{
            width: 14,
            height: 14,
            backgroundColor: color,
            borderRadius: 14 / 2,
            borderWidth: 2,
            borderColor: 'white',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 3,
          }}
        />
      </Marker>
    );
  },
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

export function StaticMap({
  waypoints,
  region,
  style,
}: {
  waypoints: Waypoint[];
  region: Region;
  style: StyleProp<ViewStyle>;
  customMarker?: React.ReactNode;
  routePath?: RoutePathPoint[];
  routePathColor?: string;
  routePathWidth?: number;
  showStartEndMarkers?: boolean;
}) {
  const styles = React.useMemo(() => {
    return [{ width: '100%', height: '100%' }];
  }, []);

  if (!region) return null;

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        userInterfaceStyle="dark"
        cacheEnabled={true}
      >
        {waypoints.map((waypoint, index) => {
          return (
            <WaypointMarker
              key={index}
              waypoint={waypoint}
              isStart={index === 0}
              isEnd={index === waypoints.length - 1}
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
