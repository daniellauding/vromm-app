// Web shim for react-native-maps
import React from 'react';
import { View, Text } from 'react-native';

const MapView = React.forwardRef((props, ref) => {
  const { style, children } = props;
  return React.createElement(View, {
    ref,
    style: [{ backgroundColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center' }, style],
  }, children || React.createElement(Text, { style: { color: '#999' } }, 'Map (web)'));
});
MapView.displayName = 'MapView';
MapView.Animated = MapView;

const Marker = (props) => null;
const Polyline = (props) => null;
const Polygon = (props) => null;
const Circle = (props) => null;
const Overlay = (props) => null;
const Callout = (props) => props.children || null;
const Heatmap = (props) => null;
const UrlTile = (props) => null;
const WMSTile = (props) => null;
const Geojson = (props) => null;

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

export {
  Marker,
  Polyline,
  Polygon,
  Circle,
  Overlay,
  Callout,
  Heatmap,
  UrlTile,
  WMSTile,
  Geojson,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};
export default MapView;
