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
  ref?: React.Ref<any>;
  routePath?: RoutePathPoint[];
  routePathColor?: string;
  routePathWidth?: number;
  showStartEndMarkers?: boolean;
  drawingMode?: string;
  penDrawingCoordinates?: Array<{ latitude: number; longitude: number }>;
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
      <Text color="$gray10" fontSize="$4">
        Map view is not available on web.
      </Text>
      <Text color="$gray9" fontSize="$2" marginTop="$2">
        Please use the mobile app for map features.
      </Text>
    </View>
  );
}