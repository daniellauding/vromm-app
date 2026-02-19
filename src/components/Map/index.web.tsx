import React, { useEffect, useRef } from 'react';
import { View, StyleProp, ViewStyle, useColorScheme } from 'react-native';
import mapboxgl from 'mapbox-gl';
import { PIN_COLORS } from '../../styles/mapStyles';

mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

// Map style presets matching vromm-routes
const MAP_STYLES = {
  standard: { light: 'mapbox://styles/mapbox/streets-v12', dark: 'mapbox://styles/mapbox/dark-v11' },
  satellite: { light: 'mapbox://styles/mapbox/satellite-streets-v12', dark: 'mapbox://styles/mapbox/satellite-streets-v12' },
  earth: { light: 'mapbox://styles/mapbox/satellite-v9', dark: 'mapbox://styles/mapbox/satellite-v9' },
  '3d': { light: 'mapbox://styles/mapbox/light-v11', dark: 'mapbox://styles/mapbox/dark-v11' },
  automotive: { light: 'mapbox://styles/mapbox/navigation-day-v1', dark: 'mapbox://styles/mapbox/navigation-night-v1' },
  firstperson: { light: 'mapbox://styles/mapbox/satellite-streets-v12', dark: 'mapbox://styles/mapbox/satellite-streets-v12' },
};

type StyleConfig = { pitch: number; bearing: number; projection?: string; terrain?: boolean; buildings?: boolean; zoom?: number };

const STYLE_CONFIGS: Record<string, StyleConfig> = {
  standard: { pitch: 0, bearing: 0 },
  satellite: { pitch: 0, bearing: 0 },
  earth: { pitch: 0, bearing: 0, projection: 'globe', zoom: 2 },
  '3d': { pitch: 60, bearing: -17, buildings: true },
  automotive: { pitch: 45, bearing: 0 },
  firstperson: { pitch: 85, bearing: 0, terrain: true, buildings: true, zoom: 16 },
};

export type MapStyleKey = keyof typeof MAP_STYLES;

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
  isFiltered?: boolean;
  markerColor?: string;
  markerType?: 'route' | 'school' | 'instructor';
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

export function Map({
  waypoints,
  region,
  style,
  scrollEnabled = true,
  zoomEnabled = true,
  onPress,
  selectedPin,
  onMarkerPress,
  routePath,
  routePathColor = PIN_COLORS.ROUTE_PATH,
  routePathWidth = 3,
  showStartEndMarkers = false,
  mapStyle = 'standard',
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
  mapStyle?: MapStyleKey;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const hasFitBounds = useRef(false);
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    ensureMapboxCSS();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const zoom = getZoomFromDelta(region.latitudeDelta);
    const styleUrl = MAP_STYLES[mapStyle][isDark ? 'dark' : 'light'];

    const config = STYLE_CONFIGS[mapStyle];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [region.longitude, region.latitude],
      zoom: config.zoom || zoom,
      interactive: scrollEnabled || zoomEnabled,
      scrollZoom: scrollEnabled && zoomEnabled,
      dragPan: scrollEnabled,
      doubleClickZoom: zoomEnabled,
      touchZoomRotate: zoomEnabled,
      pitch: config.pitch,
      bearing: config.bearing,
      projection: (config.projection as any) || 'mercator',
    });

    // Add atmosphere for globe projection
    if (config.projection === 'globe') {
      map.on('style.load', () => {
        map.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        });
      });
    }

    // Add 3D terrain for first person view
    if (config.terrain) {
      map.on('style.load', () => {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      });
    }

    // Add 3D buildings
    if (config.buildings) {
      map.on('style.load', () => {
        const layers = map.getStyle().layers || [];
        let labelLayerId: string | undefined;
        for (const layer of layers) {
          if (layer.type === 'symbol' && (layer as any).layout?.['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': isDark ? '#1a1a2e' : '#aaa',
              'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
              'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
              'fill-extrusion-opacity': 0.6,
            },
          },
          labelLayerId,
        );
      });
    }

    if (zoomEnabled) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-left');
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

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch map style when dark mode or map style changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const config = STYLE_CONFIGS[mapStyle];
    const styleUrl = MAP_STYLES[mapStyle][isDark ? 'dark' : 'light'];
    map.setStyle(styleUrl);

    map.once('style.load', () => {
      // Set projection
      map.setProjection((config.projection as any) || 'mercator');

      // Globe atmosphere
      if (config.projection === 'globe') {
        map.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        });
      } else {
        map.setFog(null as any);
      }

      // 3D terrain
      if (config.terrain) {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      } else {
        map.setTerrain(null as any);
      }

      // 3D buildings
      if (config.buildings) {
        const layers = map.getStyle().layers || [];
        // Find the first symbol layer to insert buildings beneath labels
        let labelLayerId: string | undefined;
        for (const layer of layers) {
          if (layer.type === 'symbol' && (layer as any).layout?.['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }
        if (!map.getLayer('3d-buildings')) {
          map.addLayer(
            {
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 12,
              paint: {
                'fill-extrusion-color': isDark ? '#1a1a2e' : '#aaa',
                'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, ['get', 'height']],
                'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, ['get', 'min_height']],
                'fill-extrusion-opacity': 0.6,
              },
            },
            labelLayerId,
          );
        }
      } else {
        if (map.getLayer('3d-buildings')) {
          map.removeLayer('3d-buildings');
        }
      }

      // Animate to new pitch/bearing/zoom
      map.easeTo({
        pitch: config.pitch,
        bearing: config.bearing,
        ...(config.zoom ? { zoom: config.zoom } : {}),
        duration: 1000,
      });
    });
  }, [isDark, mapStyle]);

  // Update region (only when no waypoints have triggered fitBounds yet)
  useEffect(() => {
    if (!mapRef.current || !region) return;
    if (hasFitBounds.current) return;
    const zoom = getZoomFromDelta(region.latitudeDelta);
    mapRef.current.flyTo({ center: [region.longitude, region.latitude], zoom, duration: 500 });
  }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

  // Update markers and fit bounds to show all waypoints
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add waypoint markers with proper colors matching native
    waypoints.forEach((wp) => {
      const isSelected = selectedPin === wp.id;

      let markerBg = PIN_COLORS.SECONDARY;
      if (isSelected) {
        markerBg = PIN_COLORS.PRIMARY;
      } else if (wp.markerColor) {
        markerBg = wp.markerColor;
      } else if (wp.isFiltered !== undefined) {
        markerBg = wp.isFiltered ? PIN_COLORS.PRIMARY : PIN_COLORS.SECONDARY;
      }

      const size = isSelected ? 32 : 24;
      const innerSize = isSelected ? 10 : 8;
      const el = document.createElement('div');
      el.style.cssText = `
        width:${size}px;height:${size}px;border-radius:50%;
        background:${markerBg};
        border:${isSelected ? '3px' : '2px'} solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;
      `;
      const inner = document.createElement('div');
      inner.style.cssText = `width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:#333;`;
      el.appendChild(inner);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([wp.longitude, wp.latitude])
        .addTo(mapRef.current!);

      if (wp.title) {
        marker.setPopup(new mapboxgl.Popup({ offset: 16 }).setText(wp.title));
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onMarkerPress && wp.id) {
          onMarkerPress(wp.id);
        }
        wp.onPress?.();
      });

      markersRef.current.push(marker);
    });

    // Add start/end markers for route
    if (showStartEndMarkers && routePath && routePath.length >= 2) {
      const addSmallMarker = (lat: number, lng: number, color: string) => {
        const el = document.createElement('div');
        el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);`;
        const m = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current!);
        markersRef.current.push(m);
      };
      addSmallMarker(routePath[0].latitude, routePath[0].longitude, PIN_COLORS.START_MARKER);
      addSmallMarker(routePath[routePath.length - 1].latitude, routePath[routePath.length - 1].longitude, PIN_COLORS.END_MARKER);
    }

    // Fit bounds to show all waypoints when they first load
    if (waypoints.length > 0 && !hasFitBounds.current) {
      hasFitBounds.current = true;
      const bounds = new mapboxgl.LngLatBounds();
      waypoints.forEach((wp) => bounds.extend([wp.longitude, wp.latitude]));
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 500 });
    }
  }, [waypoints, selectedPin, showStartEndMarkers, routePath]);

  // Update route path
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoute = () => {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route-source')) map.removeSource('route-source');

      if (routePath && routePath.length >= 2) {
        map.addSource('route-source', {
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
          id: 'route-line',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': routePathColor,
            'line-width': routePathWidth,
            'line-opacity': 0.8,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.on('load', updateRoute);
    }
  }, [routePath, routePathColor, routePathWidth]);

  return (
    <View style={[{ flex: 1, minHeight: 200, borderRadius: 8, overflow: 'hidden' }, style]}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: 200, borderRadius: 8 }}
      />
    </View>
  );
}
