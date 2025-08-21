import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'tamagui';

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

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

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
  return (
    <View 
      style={[
        {
          flex: 1,
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 8,
        },
        style
      ]}
    >
      <Text color="$gray10" fontSize="$3">
        Map preview unavailable on web
      </Text>
    </View>
  );
}