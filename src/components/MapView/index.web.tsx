import React, { useEffect, useRef, useImperativeHandle } from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';
import mapboxgl from 'mapbox-gl';
import { PIN_COLORS } from '../../styles/mapStyles';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

// Load Mapbox CSS
let mapboxCssLoaded = false;
function ensureMapboxCSS() {
  if (mapboxCssLoaded) return;
  mapboxCssLoaded = true;
  if (!document.querySelector('link[href*="mapbox-gl"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.18.0/mapbox-gl.css';
    document.head.appendChild(link);
  }
}

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewProps = ViewProps & {
  region?: Region;
  initialRegion?: Region;
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
  children?: React.ReactNode;
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

// Marker component for web
export const Marker = ({ coordinate, title, pinColor, onPress, children }: MarkerProps) => {
  return null;
};

// Polyline component for web
export const Polyline = (props: PolylineProps) => null;
export const Polygon = (props: any) => null;
export const Circle = (props: any) => null;
export const Overlay = (props: any) => null;
export const Callout = ({ children }: any) => null;

function getZoomFromDelta(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.001)));
}

const MapView = React.forwardRef((props: MapViewProps, ref: any) => {
  const {
    region,
    initialRegion,
    showsUserLocation,
    zoomEnabled = true,
    scrollEnabled = true,
    onRegionChangeComplete,
    onPress,
    onMapReady,
    style,
    children,
    ...rest
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useImperativeHandle(ref, () => ({
    animateToRegion: (newRegion: Region, duration?: number) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [newRegion.longitude, newRegion.latitude],
          zoom: getZoomFromDelta(newRegion.latitudeDelta),
          duration: duration || 300,
        });
      }
    },
    getCamera: () => {
      if (!mapRef.current) return null;
      const center = mapRef.current.getCenter();
      return {
        center: { latitude: center.lat, longitude: center.lng },
        zoom: mapRef.current.getZoom(),
      };
    },
  }));

  useEffect(() => {
    ensureMapboxCSS();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const r = region || initialRegion || { latitude: 55.7047, longitude: 13.191, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    const zoom = getZoomFromDelta(r.latitudeDelta);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: [r.longitude, r.latitude],
      zoom,
      interactive: scrollEnabled || zoomEnabled,
      scrollZoom: scrollEnabled && zoomEnabled,
      dragPan: scrollEnabled,
      doubleClickZoom: zoomEnabled,
      touchZoomRotate: zoomEnabled,
    });

    if (zoomEnabled) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
    }

    if (showsUserLocation) {
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }));
    }

    if (onPress) {
      map.on('click', (e) => {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: e.lngLat.lat,
              longitude: e.lngLat.lng,
            },
          },
        });
      });
    }

    if (onRegionChangeComplete) {
      map.on('moveend', () => {
        const center = map.getCenter();
        const bounds = map.getBounds()!;
        onRegionChangeComplete({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: bounds.getNorth() - bounds.getSouth(),
          longitudeDelta: bounds.getEast() - bounds.getWest(),
        });
      });
    }

    mapRef.current = map;
    map.on('load', () => onMapReady?.());

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map view when region changes
  useEffect(() => {
    if (!mapRef.current || !region) return;
    const zoom = getZoomFromDelta(region.latitudeDelta);
    mapRef.current.flyTo({ center: [region.longitude, region.latitude], zoom, duration: 300 });
  }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

  // Process children to extract markers and polylines
  useEffect(() => {
    if (!mapRef.current || !children) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;

    // Remove existing route layers
    if (map.getLayer('child-polyline')) map.removeLayer('child-polyline');
    if (map.getSource('child-polyline-source')) map.removeSource('child-polyline-source');

    React.Children.forEach(children, (child: any) => {
      if (!child?.props) return;

      if (child.props.coordinate) {
        const { coordinate, title, pinColor, onPress: markerOnPress } = child.props;
        const color = pinColor || PIN_COLORS.PRIMARY;
        const el = document.createElement('div');
        el.style.cssText = `width:20px;height:20px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;`;
        const inner = document.createElement('div');
        inner.style.cssText = `width:6px;height:6px;border-radius:50%;background:#333;`;
        el.appendChild(inner);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([coordinate.longitude, coordinate.latitude])
          .addTo(map);
        if (title) {
          marker.setPopup(new mapboxgl.Popup({ offset: 12 }).setText(title));
        }
        if (markerOnPress) el.addEventListener('click', markerOnPress);
        markersRef.current.push(marker);
      }

      if (child.props.coordinates) {
        const { coordinates, strokeColor, strokeWidth } = child.props;
        const addPolyline = () => {
          if (map.getSource('child-polyline-source')) return;
          map.addSource('child-polyline-source', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates.map((c: any) => [c.longitude, c.latitude]),
              },
            },
          });
          map.addLayer({
            id: 'child-polyline',
            type: 'line',
            source: 'child-polyline-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': strokeColor || '#1A73E8',
              'line-width': strokeWidth || 3,
            },
          });
        };
        if (map.isStyleLoaded()) {
          addPolyline();
        } else {
          map.on('load', addPolyline);
        }
      }
    });
  }, [children]);

  return (
    <View style={[{ flex: 1 }, style]} {...rest}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 200, borderRadius: 8, overflow: 'hidden' }}
      />
    </View>
  );
});

export default MapView;
