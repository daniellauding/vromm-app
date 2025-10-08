import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Alert, AppState, Dimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Text, YStack, Button, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useRecording } from '../../contexts/RecordingContext';
import * as Location from 'expo-location';
import MapView, { Polyline, Marker } from '../MapView';
import { AppAnalytics } from '../../utils/analytics';
import { hideRecordingBanner, showActiveBanner, showPausedBanner } from '../../utils/notifications';
import { useUserLocation } from '../../screens/explore/hooks';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { DARK_THEME, styles } from './styles';
import MapPreview from './MapPreview';

const { height: screenHeight } = Dimensions.get('window');

// Update the RecordedRouteData interface to be exported
export interface RecordedRouteData {
  waypoints: Array<{
    latitude: number;
    longitude: number;
    title: string;
    description: string;
  }>;
  name: string;
  description: string;
  searchCoordinates: string;
  routePath: Array<{
    latitude: number;
    longitude: number;
  }>;
  startPoint?: {
    latitude: number;
    longitude: number;
  };
  endPoint?: {
    latitude: number;
    longitude: number;
  };
}

interface RecordDrivingSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute?: (routeData: RecordedRouteData) => void;
}

// Enhanced sensitivity settings for accurate recording
const MIN_SPEED_THRESHOLD = 0.5; // 0.5 km/h - minimum speed for waypoint creation

// Update speed display to handle very low speeds better
const formatSpeed = (speed: number): string => {
  if (speed < MIN_SPEED_THRESHOLD) {
    return '0.0';
  }
  return speed.toFixed(1);
};

// Performance-optimized component
export const RecordDrivingSheet = React.memo((props: RecordDrivingSheetProps) => {
  const { isVisible, onClose, onCreateRoute } = props;
  const { t } = useTranslation();
  const { hideModal, setModalPointerEvents } = useModal();
  const {
    recordingState,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    minimizeRecording,
    saveRecording,
    cancelRecording,
    updateRecordingState,
  } = useRecording();

  // Local state for UI only
  const [showMap, setShowMap] = useState(false);
  const userLocation = useUserLocation();

  // Drag functionality for minimizing when recording is active
  const translateY = useSharedValue(0);
  const isDragging = useRef(false);

  // Snap points for drag-to-minimize
  const snapPoints = useMemo(() => {
    return {
      expanded: 0, // Fully visible
      minimized: screenHeight * 0.7, // Minimized (show only top 30%)
      dismissed: screenHeight, // Completely hidden
    };
  }, []);

  // Pan gesture for drag-to-minimize (when recording) or drag-to-close (when not recording)
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      console.log('🎯 RecordDrivingSheet: Pan gesture began');
      isDragging.current = true;
    })
    .onUpdate((event) => {
      const { translationY } = event;
      const newPosition = Math.max(0, translationY);
      translateY.value = newPosition;
      console.log('🎯 RecordDrivingSheet: Pan gesture update', { translationY, newPosition });
    })
    .onEnd((event) => {
      isDragging.current = false;
      const { translationY, velocityY } = event;
      console.log('🎯 RecordDrivingSheet: Pan gesture ended', {
        translationY,
        velocityY,
        isRecording: recordingState?.isRecording,
      });

      if (recordingState?.isRecording) {
        // When recording: drag down to minimize
        if (translationY > screenHeight * 0.3 || velocityY > 500) {
          // Drag down to minimize
          console.log('🎯 RecordDrivingSheet: Dragging to minimize');
          translateY.value = withSpring(snapPoints.minimized, { damping: 15, stiffness: 150 });
          runOnJS(minimizeRecording)();
        } else {
          // Snap back to expanded
          console.log('🎯 RecordDrivingSheet: Snapping back to expanded');
          translateY.value = withSpring(snapPoints.expanded, { damping: 15, stiffness: 150 });
        }
      } else {
        // When not recording: drag down to close
        if (translationY > screenHeight * 0.2 || velocityY > 300) {
          // Drag down to close
          console.log('🎯 RecordDrivingSheet: Dragging to close');
          translateY.value = withSpring(snapPoints.dismissed, { damping: 15, stiffness: 150 });
          runOnJS(onClose)();
        } else {
          // Snap back to expanded
          console.log('🎯 RecordDrivingSheet: Snapping back to expanded');
          translateY.value = withSpring(snapPoints.expanded, { damping: 15, stiffness: 150 });
        }
      }
    })
    .shouldCancelWhenOutside(false);

  // Backdrop tap is now handled by TouchableOpacity for better reliability

  // Animated style for the sheet
  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Format waypoints for map display with safety checks - memoized for performance
  const getRoutePath = useCallback(() => {
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

  // Format time display with HH:MM:SS format - memoized
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // Always show at least MM:SS, add hours if recording goes over 1 hour
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, []);

  // Start recording - now uses global context
  const handleStartRecording = useCallback(async () => {
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
  }, [startRecording, updateRecordingState]);

  // Timer is now handled by the global recording context

  // Pause/resume recording now use global context
  const handlePauseRecording = useCallback(() => {
    pauseRecording();
  }, [pauseRecording]);

  const handleResumeRecording = useCallback(() => {
    resumeRecording();
  }, [resumeRecording]);

  // Stop recording now uses global context
  const handleStopRecording = useCallback(() => {
    try {
      // Track recording end in Firebase Analytics
      hideRecordingBanner();

      // Stop recording using global context
      stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, [stopRecording]);

  // Save recording now uses global context
  const handleSaveRecording = useCallback(() => {
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

  // Cancel recording now uses global context
  const handleCancelRecording = useCallback(() => {
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

  // Minimize/Maximize handlers now use global context
  const handleMinimize = useCallback(() => {
    console.log('🎯 RecordDrivingSheet: Minimizing recording');
    minimizeRecording();
    // Allow touches to pass through when minimized
    setModalPointerEvents('box-none');
  }, [minimizeRecording, setModalPointerEvents]);

  // Handle modal pointer events when minimized/maximized state changes
  useEffect(() => {
    if (recordingState?.isMinimized) {
      // Allow touches to pass through when minimized
      setModalPointerEvents('box-none');
    } else {
      // Block touches when maximized (normal modal behavior)
      setModalPointerEvents('auto');
    }
  }, [recordingState?.isMinimized, setModalPointerEvents]);

  useEffect(() => {
    if (!recordingState?.isRecording) return;
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        showActiveBanner();
      } else {
        hideRecordingBanner();
      }
    };

    const subscriptionStopRecording = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (response.actionIdentifier === 'vromm_stop') {
          // 🚀 stop your recording logic here
          hideRecordingBanner();
          stopRecording();
        } else if (response.actionIdentifier === 'vromm_resume') {
          // 🚀 resume your recording logic here
          showActiveBanner();
          resumeRecording();
        } else if (response.actionIdentifier === 'vromm_pause') {
          // 🚀 pause your recording logic here
          showPausedBanner();
          pauseRecording();
        }
      },
    );

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
      subscriptionStopRecording?.remove();
    };
  }, [recordingState?.isRecording, stopRecording, pauseRecording, resumeRecording]);

  // Auto-save and app state handling is now done by the global recording context

  // Safety check - don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Safety check - don't render if recordingState is not available
  if (!recordingState) {
    return null;
  }

  if (recordingState.isMinimized) {
    return null;
  }

  // When minimized, the sheet should still render but the widget will be shown instead
  // The widget visibility is handled by GlobalRecordingWidget component

  // Optimize render to be more performant
  return (
    <View style={styles.container}>
      {/* Backdrop - always show when sheet is visible */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => {
          if (recordingState?.isRecording) {
            handleMinimize();
          } else {
            onClose();
          }
        }}
      />
      <GestureDetector gesture={panGesture}>
        <ReanimatedAnimated.View
          style={[
            styles.sheet,
            { backgroundColor: DARK_THEME.background },
            animatedSheetStyle,
            recordingState.isMinimized && styles.minimizedSheet,
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
            <Text fontWeight="600" fontSize={24} color={DARK_THEME.text}>
              {t('map.recordDriving') || 'Record Route'}
            </Text>
            <XStack gap={8} alignItems="center">
              {/* Always show minimize button when recording - Debug added */}
              {recordingState.isRecording && (
                <TouchableOpacity
                  onPress={() => {
                    handleMinimize();
                  }}
                  style={{
                    padding: 4, // Add padding for easier tapping
                    backgroundColor: 'rgba(255,255,255,0.1)', // Add background for visibility
                    borderRadius: 4,
                  }}
                >
                  <Feather name="minus" size={24} color={DARK_THEME.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleCancelRecording} disabled={false}>
                <Feather name="x" size={24} color={DARK_THEME.text} />
              </TouchableOpacity>
            </XStack>
          </View>

          {/* Map Toggle Button - Show during recording or if we have waypoints to preview */}
          {(recordingState?.isRecording ||
            (recordingState?.waypoints && recordingState.waypoints.length > 0)) && (
            <XStack justifyContent="center" marginBottom={8}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: showMap ? '#69e3c4' : 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: showMap ? '#69e3c4' : 'rgba(255,255,255,0.3)',
                }}
                onPress={() => setShowMap(!showMap)}
              >
                <Feather name={showMap ? 'eye-off' : 'map'} size={16} color="white" />
                <Text color="white" marginLeft={4} fontWeight="500">
                  {showMap ? 'Hide Preview' : 'Show Route Preview'}
                </Text>
              </TouchableOpacity>
            </XStack>
          )}

          {/* Enhanced Map Preview with Live Updates */}
          {showMap && (
            <MapPreview
              recordingState={recordingState}
              getRoutePath={getRoutePath}
              region={
                recordingState.waypoints.length > 0
                  ? {
                      latitude:
                        recordingState.waypoints[recordingState.waypoints.length - 1].latitude,
                      longitude:
                        recordingState.waypoints[recordingState.waypoints.length - 1].longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }
                  : {
                      latitude: userLocation?.coords?.latitude ?? 0,
                      longitude: userLocation?.coords?.longitude ?? 0,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }
              }
            />
          )}

          {/* Recording Status Display (always shown when recording) */}
          {recordingState.isRecording && !showMap && (
            <View
              style={[
                styles.recordingStatusContainer,
                { backgroundColor: DARK_THEME.cardBackground },
              ]}
            >
              <View style={styles.recordingStatusInner}>
                <View
                  style={[
                    styles.recordingDot,
                    recordingState.isPaused ? styles.pausedDot : styles.activeDot,
                  ]}
                />
                <Text color={DARK_THEME.text} fontSize={16} fontWeight="bold" marginLeft={8}>
                  {recordingState.isPaused ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
                </Text>
              </View>
              <Text color={DARK_THEME.text} marginTop={4}>
                Recording {recordingState.waypoints.length} waypoints •{' '}
                {recordingState.distance.toFixed(2)} km
              </Text>
              {recordingState.debugMessage && (
                <Text color="#FF9500" fontSize={12} marginTop={4}>
                  {recordingState.debugMessage}
                </Text>
              )}
            </View>
          )}

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
                        onPress={handleResumeRecording}
                      >
                        <Feather name="play" size={28} color="white" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: '#3D3D1A' }]}
                        onPress={handlePauseRecording}
                      >
                        <Feather name="pause" size={28} color="white" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: 'red' }]}
                      onPress={handleStopRecording}
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
        </ReanimatedAnimated.View>
      </GestureDetector>
    </View>
  );
});
