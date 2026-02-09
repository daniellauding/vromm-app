import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import MapView, { Marker, Region } from '../MapView';
import { StyleSheet } from 'react-native';
import { RoutePathPoint } from './types';

export type Waypoint = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  id?: string;
  onPress?: () => void;
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

export const StaticMap = React.memo(function StaticMap({
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
  if (!region) return null;

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={style}
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
});

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
