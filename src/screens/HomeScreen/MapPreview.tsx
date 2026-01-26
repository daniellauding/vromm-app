import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from '../../components/MapView';
import { lightMapStyle, darkMapStyle, PIN_COLORS } from '../../styles/mapStyles';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { useTranslation } from '../../contexts/TranslationContext';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';

const MAP_HEIGHT = 140;

interface RouteMarker {
  id: string;
  latitude: number;
  longitude: number;
}

/**
 * A lightweight map preview that shows nearby routes with a fade effect.
 * Uses the user's saved location (from settings/onboarding) or GPS location.
 * Tapping navigates to the full Map screen.
 */
export const MapPreview = React.memo(function MapPreview() {
  const navigation = useNavigation<NavigationProp>();
  const { userLocation, currentLocation } = useLocation();
  const { effectiveTheme } = useThemePreference();
  const { language } = useTranslation();
  const { user } = useAuth();
  const colorScheme = effectiveTheme || 'light';

  const [markers, setMarkers] = React.useState<RouteMarker[]>([]);

  // Get effective location: prefer saved userLocation, fallback to GPS, then default
  const effectiveLocation = React.useMemo(() => {
    // Priority 1: Saved location from settings/onboarding
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
    }
    // Priority 2: GPS location
    if (currentLocation?.coords) {
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    }
    // Priority 3: Default fallback (Lund, Sweden - same as MapScreen)
    return {
      latitude: 55.7047,
      longitude: 13.191,
    };
  }, [userLocation, currentLocation]);

  // Fetch nearby routes for markers
  React.useEffect(() => {
    if (!user) return;

    const fetchNearbyRoutes = async () => {
      try {
        const { data, error } = await supabase.rpc('find_nearby_routes', {
          lat_input: effectiveLocation.latitude,
          lng_input: effectiveLocation.longitude,
          max_km: 100.0,
        });

        if (error) {
          console.warn('[MapPreview] Error fetching routes:', error);
          return;
        }

        // Extract first waypoint from each route (limit to 15 for performance)
        const routeMarkers: RouteMarker[] = (data || []).slice(0, 15).map((route: any) => {
          const waypoints = route.waypoint_details || route.metadata?.waypoints || [];
          const firstWp = waypoints[0];
          if (!firstWp) return null;

          const lat = Number(firstWp.lat || firstWp.latitude);
          const lng = Number(firstWp.lng || firstWp.longitude);

          if (isNaN(lat) || isNaN(lng)) return null;

          return {
            id: route.id,
            latitude: lat,
            longitude: lng,
          };
        }).filter((m: RouteMarker | null): m is RouteMarker => m !== null);

        setMarkers(routeMarkers);
      } catch (err) {
        console.warn('[MapPreview] Failed to fetch routes:', err);
      }
    };

    fetchNearbyRoutes();
  }, [effectiveLocation, user]);

  const region = {
    latitude: effectiveLocation.latitude,
    longitude: effectiveLocation.longitude,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  const handlePress = React.useCallback(() => {
    navigation.navigate('MainTabs', {
      screen: 'MapTab',
      params: { screen: 'MapScreen' },
    });
  }, [navigation]);

  const routeCount = markers.length;
  const countText = routeCount > 0
    ? (language === 'sv' ? `${routeCount} rutter nära dig` : `${routeCount} routes nearby`)
    : (language === 'sv' ? 'Utforska kartan' : 'Explore map');

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.container}>
      {/* Map layer - interactions disabled */}
      <View style={styles.mapContainer} pointerEvents="none">
        <MapView
          style={styles.map}
          region={region}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          showsPointsOfInterest={false}
          customMapStyle={colorScheme === 'dark' ? darkMapStyle : lightMapStyle}
          userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
          liteMode={Platform.OS === 'android'}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerOuter}>
                <View style={styles.markerInner} />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Gradient fade overlay */}
      <LinearGradient
        colors={[
          'transparent',
          colorScheme === 'dark' ? 'rgba(26, 26, 26, 0.6)' : 'rgba(255, 255, 255, 0.6)',
          colorScheme === 'dark' ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      {/* Label overlay */}
      <View style={styles.labelContainer}>
        <View
          style={[
            styles.labelPill,
            {
              backgroundColor:
                colorScheme === 'dark' ? 'rgba(56, 253, 191, 0.15)' : 'rgba(56, 253, 191, 0.2)',
            },
          ]}
        >
          <Feather name="map-pin" size={14} color="#38fdbf" />
          <Text fontSize={13} fontWeight="600" color="#38fdbf" marginLeft={6}>
            {countText}
          </Text>
          <Feather name="chevron-right" size={14} color="#38fdbf" style={{ marginLeft: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MAP_HEIGHT * 0.7,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markerOuter: {
    width: 20,
    height: 20,
    backgroundColor: PIN_COLORS.PRIMARY,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  markerInner: {
    width: 6,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
  },
});
