import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Text, YStack, Button, XStack } from 'tamagui';
import { DARK_THEME, styles } from './styles';
import * as Location from 'expo-location';
import { useRecording } from '@/src/contexts/RecordingContext';
import { Feather } from '@expo/vector-icons';
import { AppAnalytics } from '../../utils/analytics';
import { RecordedRouteData } from './types';
const MIN_SPEED_THRESHOLD = 0.5;
const formatSpeed = (speed: number): string => {
  if (speed < MIN_SPEED_THRESHOLD) {
    return '0.0';
  }
  return speed.toFixed(1);
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Always show at least MM:SS, add hours if recording goes over 1 hour
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};

export default function RecordingStats({
  setShowMap,
  onCreateRoute,
  onClose,
  hideModal,
}: {
  setShowMap: (showMap: boolean) => void;
  onCreateRoute?: (routeData: RecordedRouteData) => void;
  onClose: () => void;
  hideModal: () => void;
}) {
  const {
    recordingState,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveRecording,
    cancelRecording,
    updateRecordingState,
  } = useRecording();

  const handleStartRecording = React.useCallback(async () => {
    try {
      // Start recording immediately using global context (no delays)
      await startRecording();

      // Track recording start in Firebase Analytics (non-blocking)
      AppAnalytics.trackRouteRecordingStart().catch(() => {
        // Silently fail analytics
      });

      // Get user's current location to center map (non-blocking)
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((location) => {
          if (location) {
            // Show map and center on user location
            setShowMap(true);
          }
        })
        .catch((error) => {
          console.warn('Could not get current location for centering:', error);
        });
    } catch (error) {
      console.error('Error starting recording:', error);
      updateRecordingState({ debugMessage: 'Failed to start recording' });
    }
  }, [startRecording, updateRecordingState, setShowMap]);

  const handleSaveRecording = React.useCallback(() => {
    try {
      // Skip if no waypoints
      if (!recordingState?.waypoints || recordingState.waypoints.length === 0) {
        Alert.alert('No data', 'No movement was recorded. Please try again.');
        return;
      }

      // Use global context to save recording
      saveRecording(onCreateRoute);

      // Close the modal after successful callback
      try {
        hideModal();
      } catch (error) {
        console.error('💾 ❌ Error closing modal:', error);
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save the recording. Please try again.');
    }
  }, [recordingState.waypoints, saveRecording, onCreateRoute, hideModal]);

  const handleCancelRecording = React.useCallback(() => {
    try {
      // Cancel recording using global context
      cancelRecording();

      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error cancelling recording:', error);
      // Force close anyway
      onClose();
    }
  }, [cancelRecording, onClose]);

  return (
    <YStack padding={16} space={16}>
      {/* Enhanced Stats display */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
            DURATION
          </Text>
          <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
            {formatTime(recordingState.totalElapsedTime)}
          </Text>
          <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
            Driving: {formatTime(recordingState.drivingTime)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
            DISTANCE
          </Text>
          <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
            {recordingState.distance.toFixed(2)} km
          </Text>
          <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
            {recordingState.waypoints.length} waypoints
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
            SPEED
          </Text>
          <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
            {formatSpeed(recordingState.currentSpeed)} km/h
          </Text>
          <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
            Max: {formatSpeed(recordingState.maxSpeed)} km/h
          </Text>
          <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
            Avg: {formatSpeed(recordingState.averageSpeed)} km/h
          </Text>
        </View>
      </View>

      {/* Record/Summary view */}
      {!recordingState.showSummary ? (
        /* Record button */
        <View style={styles.recordButtonContainer}>
          {recordingState.isRecording ? (
            <XStack gap={16} justifyContent="center">
              {recordingState.isPaused ? (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: '#1A3D3D' }]}
                  onPress={resumeRecording}
                >
                  <Feather name="play" size={28} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: '#3D3D1A' }]}
                  onPress={pauseRecording}
                >
                  <Feather name="pause" size={28} color="white" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'red' }]}
                onPress={stopRecording}
              >
                <Feather name="square" size={28} color="white" />
              </TouchableOpacity>
            </XStack>
          ) : (
            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: '#1A3D3D' }]}
              onPress={handleStartRecording}
            >
              <Feather name="play" size={32} color="white" />
            </TouchableOpacity>
          )}
          <Text color={DARK_THEME.text} marginTop={8}>
            {recordingState.isRecording
              ? recordingState.isPaused
                ? 'Recording Paused'
                : 'Recording...'
              : 'Start Recording'}
          </Text>
        </View>
      ) : (
        /* Summary view */
        <YStack space={16}>
          <Text color={DARK_THEME.text} fontSize={18} fontWeight="600" textAlign="center">
            Recording Complete
          </Text>

          <Text color={DARK_THEME.text} textAlign="center">
            {recordingState.waypoints.length > 0
              ? `Your route has been recorded successfully with ${recordingState.waypoints.length} waypoints. You can now create a route, continue recording, or start over.`
              : 'No movement was recorded. You can try recording again.'}
          </Text>

          {recordingState.waypoints.length > 0 && (
            <Button
              backgroundColor="#1A3D3D"
              color="white"
              onPress={handleSaveRecording}
              size="$4"
              height={50}
              pressStyle={{ opacity: 0.8 }}
            >
              <XStack gap="$2" alignItems="center">
                <Feather name="check" size={24} color="white" />
                <Text color="white" fontWeight="600" fontSize={18}>
                  Create Route
                </Text>
              </XStack>
            </Button>
          )}

          <XStack gap={12} justifyContent="center">
            <Button
              backgroundColor="#3D3D1A"
              color="white"
              onPress={() => {
                updateRecordingState({ showSummary: false });
                startRecording();
              }}
              flex={1}
            >
              <XStack gap="$1" alignItems="center">
                <Feather name="play" size={18} color="white" />
                <Text color="white">Continue</Text>
              </XStack>
            </Button>

            <Button
              backgroundColor="#CC4400"
              color="white"
              onPress={() => {
                updateRecordingState({ showSummary: false });
                startRecording();
              }}
              flex={1}
            >
              <XStack gap="$1" alignItems="center">
                <Feather name="refresh-cw" size={18} color="white" />
                <Text color="white">Start Over</Text>
              </XStack>
            </Button>
          </XStack>

          <Button
            backgroundColor="rgba(255,255,255,0.1)"
            color="white"
            onPress={handleCancelRecording}
            marginBottom={8}
          >
            <Text color="white">Dismiss</Text>
          </Button>
        </YStack>
      )}
    </YStack>
  );
}
