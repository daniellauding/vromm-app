import React, { useEffect, useRef } from 'react';
import { View, StyleProp, ViewStyle, useColorScheme } from 'react-native';
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

function getZoomFromDelta(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.001)));
}

export function StaticMap({
  waypoints,
  region,
  style,
  routePath,
  routePathColor = PIN_COLORS.ROUTE_PATH,
  routePathWidth = 3,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    ensureMapboxCSS();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const zoom = getZoomFromDelta(region.latitudeDelta);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: [region.longitude, region.latitude],
      zoom,
      interactive: false,
      attributionControl: false,
    });

    // Add waypoints
    waypoints.forEach((wp) => {
      const el = document.createElement('div');
      el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${PIN_COLORS.PRIMARY};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
      new mapboxgl.Marker({ element: el })
        .setLngLat([wp.longitude, wp.latitude])
        .addTo(map);
    });

    // Add route path after style loads
    if (routePath && routePath.length >= 2) {
      map.on('load', () => {
        map.addSource('static-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routePath.map((p) => [p.longitude, p.latitude]),
            },
          },
        });
        map.addLayer({
          id: 'static-route-line',
          type: 'line',
          source: 'static-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': routePathColor,
            'line-width': routePathWidth,
            'line-opacity': 0.8,
          },
        });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <View style={[{ flex: 1, minHeight: 120, borderRadius: 8, overflow: 'hidden' }, style]}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 120, borderRadius: 8 }}
      />
    </View>
  );
}
