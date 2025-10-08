import { View } from 'react-native';
import { Text } from 'tamagui';
import MapView, { Polyline, Marker } from '../MapView';
import { styles } from './styles';
import { RecordingState } from '@/src/contexts/RecordingContext';
import { Region } from '@/src/types/maps';

export default function MapPreview({
  recordingState,
  region,
  getRoutePath,
}: {
  recordingState: RecordingState;
  region: Region;
  getRoutePath: () => { latitude: number; longitude: number }[];
}) {
  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        userInterfaceStyle="dark"
      >
        {/* Route Path */}
        {getRoutePath().length > 1 && (
          <Polyline
            coordinates={getRoutePath()}
            strokeWidth={3}
            strokeColor={recordingState.isPaused ? '#FF9500' : '#69e3c4'}
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
            pinColor="green"
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
            pinColor="red"
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
