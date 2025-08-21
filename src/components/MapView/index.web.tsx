import React from 'react';
import { View, ViewProps } from 'react-native';
import { Text } from 'tamagui';

// Web stub for MapView
const MapView = React.forwardRef((props: any, ref: any) => {
  return (
    <View 
      ref={ref}
      style={[
        {
          flex: 1,
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
        },
        props.style
      ]}
    >
      <Text color="$gray10">Map not available on web</Text>
    </View>
  );
});

// Web stubs for map components
export const Marker = ({ children }: any) => null;
export const Polyline = (props: any) => null;
export const Polygon = (props: any) => null;
export const Circle = (props: any) => null;
export const Overlay = (props: any) => null;
export const Callout = ({ children }: any) => null;

export default MapView;

// Type exports for compatibility
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewProps = ViewProps & {
  region?: Region;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsPointsOfInterest?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  showsBuildings?: boolean;
  showsTraffic?: boolean;
  showsIndoors?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  scrollEnabled?: boolean;
  pitchEnabled?: boolean;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: any) => void;
  onMapReady?: () => void;
  userInterfaceStyle?: 'light' | 'dark';
  cacheEnabled?: boolean;
};

export type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  onPress?: () => void;
  anchor?: { x: number; y: number };
  pinColor?: string;
  children?: React.ReactNode;
};

export type PolylineProps = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeWidth?: number;
  strokeColor?: string;
  lineJoin?: 'round' | 'bevel' | 'miter';
  lineCap?: 'round' | 'butt' | 'square';
  geodesic?: boolean;
};