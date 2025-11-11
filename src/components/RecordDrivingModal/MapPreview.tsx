import React from 'react';
import { View } from 'react-native';
import { Text } from 'tamagui';
import MapView, { Polyline, Marker } from '../MapView';
import { styles } from './styles';
import { useRecording } from '@/src/contexts/RecordingContext';
import { useUserLocation } from '../../screens/explore/hooks';
import { PIN_COLORS } from '@/src/styles/mapStyles';

export default function MapPreview() {
  const { recordingState } = useRecording();
  const userLocation = useUserLocation();
  const region = React.useMemo(() => {
    if (recordingState?.waypoints?.length > 0) {
      return {
        latitude: recordingState.waypoints[recordingState.waypoints.length - 1].latitude,
        longitude: recordingState.waypoints[recordingState.waypoints.length - 1].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    return {
      latitude: userLocation?.coords?.latitude ?? 0,
      longitude: userLocation?.coords?.longitude ?? 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [recordingState?.waypoints, userLocation?.coords]);

  const path = React.useMemo(() => {
    try {
      // Safety check for recordingState and waypoints
      if (!recordingState?.waypoints || recordingState.waypoints.length === 0) {
        return [];
      }

      // Filter out any invalid coordinates to prevent crashes
      return recordingState.waypoints
        .filter(
          (wp) =>
            wp &&
            typeof wp.latitude === 'number' &&
            typeof wp.longitude === 'number' &&
            !isNaN(wp.latitude) &&
            !isNaN(wp.longitude),
        )
        .map((wp) => ({
          latitude: wp.latitude,
          longitude: wp.longitude,
        }));
    } catch (error) {
      // Log error but don't crash
      console.error('Error formatting route path:', error);
      return [];
    }
  }, [recordingState?.waypoints]);

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        userInterfaceStyle="dark"
      >
        {/* Route Path */}
        {path.length > 1 && (
          <Polyline
            coordinates={path}
            strokeWidth={3}
            strokeColor={recordingState.isPaused ? PIN_COLORS.ROUTE_PAUSED : PIN_COLORS.ROUTE_PATH}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Start and End Markers */}
        {recordingState.waypoints.length > 0 && (
          <Marker
            coordinate={{
              latitude: recordingState.waypoints[0].latitude,
              longitude: recordingState.waypoints[0].longitude,
            }}
            title="Start"
            description="Recording started here"
            pinColor={PIN_COLORS.START_MARKER}
          />
        )}

        {recordingState.waypoints.length > 1 && (
          <Marker
            coordinate={{
              latitude: recordingState.waypoints[recordingState.waypoints.length - 1].latitude,
              longitude: recordingState.waypoints[recordingState.waypoints.length - 1].longitude,
            }}
            title="Current Position"
            description="Live recording position"
            pinColor={PIN_COLORS.END_MARKER}
          />
        )}
      </MapView>

      {/* Enhanced Recording Indicator */}
      {recordingState.isRecording && (
        <View style={styles.recordingIndicator}>
          <View
            style={[
              styles.recordingDot,
              recordingState.isPaused ? styles.pausedDot : styles.activeDot,
            ]}
          />
          <Text style={styles.recordingText}>
            {recordingState.isPaused ? 'PAUSED' : 'LIVE RECORDING'}
          </Text>
          <Text style={styles.recordingSubtext}>
            {recordingState.waypoints.length} points • {recordingState.distance.toFixed(2)}
            km
          </Text>
        </View>
      )}

      {/* Map Stats Overlay */}
      {!recordingState.isRecording && recordingState.waypoints.length > 0 && (
        <View style={styles.mapStatsOverlay}>
          <Text style={styles.mapStatsText}>
            Route Preview • {recordingState.waypoints.length} waypoints
          </Text>
        </View>
      )}
    </View>
  );
}
