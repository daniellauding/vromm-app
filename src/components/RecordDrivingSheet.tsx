import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, AppState, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Text, YStack, Button, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useRecording } from '../contexts/RecordingContext';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import MapView, { Polyline, Marker } from './MapView';
import { AppAnalytics } from '../utils/analytics';
import { hideRecordingBanner, showActiveBanner, showPausedBanner } from '../utils/notifications';
import { useUserLocation } from '../screens/explore/hooks';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced Haversine formula for accurate distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters

  // Convert degrees to radians
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLngRad = ((lng2 - lng1) * Math.PI) / 180;

  // Haversine formula
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;
  const distanceKm = distanceMeters / 1000;

  // Filter GPS noise - only count movements > 1 meter
  return distanceMeters > 1 ? distanceKm : 0;
};

// Dark theme constants
const DARK_THEME = {
  background: '#1A1A1A',
  bottomSheet: '#1F1F1F',
  text: 'white',
  secondaryText: '#AAAAAA',
  borderColor: '#333',
  handleColor: '#666',
  iconColor: 'white',
  cardBackground: '#2D3130',
};

// Background location task name
const LOCATION_TRACKING = 'location-tracking';

// Auto-save constants
const AUTO_SAVE_KEY = '@recording_session_backup';
const AUTO_SAVE_INTERVAL = 10000; // Save every 10 seconds
const RECOVERY_CHECK_KEY = '@recording_recovery_check';

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

// Location tracking type
type RecordedWaypoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  accuracy: number | null;
};
interface RecordDrivingSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute?: (routeData: RecordedRouteData) => void;
}

// Enhanced sensitivity settings for accurate recording
const MIN_DISTANCE_FILTER = 5; // 5 meters - filters GPS noise effectively
const MIN_TIME_FILTER = 1000; // 1 second - balanced update frequency
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
  const { onClose, onCreateRoute } = props;
  const { t } = useTranslation();
  const { hideModal, setModalPointerEvents } = useModal();
  const { 
    recordingState, 
    startRecording, 
    pauseRecording, 
    resumeRecording, 
    stopRecording, 
    minimizeRecording, 
    maximizeRecording, 
    saveRecording, 
    cancelRecording,
    updateRecordingState 
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
      expanded: 0,           // Fully visible
      minimized: screenHeight * 0.7,  // Minimized (show only top 30%)
      dismissed: screenHeight,         // Completely hidden
    };
  }, [screenHeight]);

  // Pan gesture for drag-to-minimize (when recording) or drag-to-close (when not recording)
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      const { translationY } = event;
      const newPosition = Math.max(0, translationY);
      translateY.value = newPosition;
    })
    .onEnd((event) => {
      isDragging.current = false;
      const { translationY, velocityY } = event;
      
      if (recordingState.isRecording) {
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
          translateY.value = withSpring(snapPoints.dismissed, { damping: 15, stiffness: 150 });
          runOnJS(onClose)();
        } else {
          // Snap back to expanded
          translateY.value = withSpring(snapPoints.expanded, { damping: 15, stiffness: 150 });
        }
      }
    });

  // Animated style for the sheet
  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Format waypoints for map display with safety checks - memoized for performance
  const getRoutePath = useCallback(() => {
    try {
      // Safety check for empty waypoints
      if (!recordingState.waypoints || recordingState.waypoints.length === 0) {
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
  }, [recordingState.waypoints]);

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

  // Auto-save is now handled by the global recording context

  // Location tracking is now handled by the global recording context

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
      }).then((location) => {
        if (location) {
          // Show map and center on user location
          setShowMap(true);
        }
      }).catch((error) => {
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
      if (recordingState.waypoints.length === 0) {
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
  }, [recordingState.waypoints.length, saveRecording, onCreateRoute, hideModal]);

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

  const handleMaximize = useCallback(() => {
    maximizeRecording();
    // Block touches when maximized (normal modal behavior)
    setModalPointerEvents('auto');
  }, [maximizeRecording, setModalPointerEvents]);

  // Floating widget is now handled by GlobalRecordingWidget component

  // Auto-save and app state handling is now done by the global recording context

  // Optimize render to be more performant
  return (
    <>
      {/* Main sheet - show when not minimized OR when there's recording data to show */}
      {(!recordingState.isMinimized || recordingState.waypoints.length > 0 || recordingState.showSummary) && (
        <View style={[styles.container, recordingState.isMinimized && styles.minimizedContainer]}>
          {/* Only show backdrop when not minimized */}
          {!recordingState.isMinimized && (
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={recordingState.isRecording ? handleMinimize : onClose}
            />
          )}
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View 
              style={[
                styles.sheet, 
                { backgroundColor: DARK_THEME.background }, 
                animatedSheetStyle,
                recordingState.isMinimized && styles.minimizedSheet
              ]}
            >
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
              <Text fontWeight="600" fontSize={24} color={DARK_THEME.text}>
                {t('map.recordDriving') || 'Record Route'}
              </Text>
              <Text>RecordDrivingSheet</Text>
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
            {(recordingState.isRecording || recordingState.waypoints.length > 0) && (
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
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={
                    recordingState.waypoints.length > 0
                      ? {
                          latitude: recordingState.waypoints[recordingState.waypoints.length - 1].latitude,
                          longitude: recordingState.waypoints[recordingState.waypoints.length - 1].longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }
                      : {
                          latitude: userLocation?.coords.latitude,
                          longitude: userLocation?.coords.longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }
                  }
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
                      style={[styles.recordingDot, recordingState.isPaused ? styles.pausedDot : styles.activeDot]}
                    />
                    <Text style={styles.recordingText}>
                      {recordingState.isPaused ? 'PAUSED' : 'LIVE RECORDING'}
                    </Text>
                    <Text style={styles.recordingSubtext}>
                      {recordingState.waypoints.length} points • {recordingState.distance.toFixed(2)}km
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
                    style={[styles.recordingDot, recordingState.isPaused ? styles.pausedDot : styles.activeDot]}
                  />
                  <Text color={DARK_THEME.text} fontSize={16} fontWeight="bold" marginLeft={8}>
                    {recordingState.isPaused ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
                  </Text>
                </View>
                <Text color={DARK_THEME.text} marginTop={4}>
                  Recording {recordingState.waypoints.length} waypoints • {recordingState.distance.toFixed(2)} km
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
      )}

      {/* Floating widget is now handled by GlobalRecordingWidget component */}
    </>
  );
});

// Modal version for use with modal system that handles navigation properly
interface RecordDrivingModalProps {
  onCreateRoute?: (routeData: RecordedRouteData) => void;
}

export const RecordDrivingModal = ({ onCreateRoute }: RecordDrivingModalProps = {}) => {
  const { hideModal } = useModal();

  // Handle route creation by passing data to parent navigation handler
  const handleCreateRoute = (routeData: RecordedRouteData) => {
    try {
      // Validate route data before proceeding
      if (!routeData) {
        console.error('RecordDrivingModal: No route data provided');
        Alert.alert('Error', 'No route data received');
        return;
      }

      if (!routeData.waypoints || routeData.waypoints.length === 0) {
        console.error('RecordDrivingModal: No waypoints in route data');
        Alert.alert('Error', 'No waypoints found');
        return;
      }

      // Call the parent's navigation handler instead of showing another modal
      if (onCreateRoute) {
        onCreateRoute(routeData);
      } else {
        console.warn('RecordDrivingModal: No onCreateRoute callback provided');
      }
    } catch (error) {
      console.error('RecordDrivingModal: Error in onCreateRoute:', error);
      Alert.alert('Error', 'Failed to process route data');
    }
  };

  return (
    <RecordDrivingSheet isVisible={true} onClose={hideModal} onCreateRoute={handleCreateRoute} />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  minimizedContainer: {
    pointerEvents: 'box-none', // Allow touches to pass through when minimized
  },
  minimizedSheet: {
    pointerEvents: 'auto', // Keep sheet interactive when minimized
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '90%',
  },
  handleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    left: '45%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  recordButtonContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waypointContainer: {
    marginTop: 8,
    maxHeight: 150,
    borderRadius: 8,
    padding: 12,
  },
  waypointText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  mapContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.borderColor,
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  centerButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapErrorOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 4,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeDot: {
    backgroundColor: '#FF3B30',
  },
  pausedDot: {
    backgroundColor: '#FF9500',
  },
  recordingStatusContainer: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recordingStatusInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  recordingSubtext: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  mapStatsOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 6,
  },
  mapStatsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  floatingWidgetContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    alignItems: 'flex-end',
  },
  floatingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  floatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  floatingControlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  // New enhanced floating widget styles
  floatingWidgetExpanded: {
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  floatingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  floatingStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  floatingTimeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingControls: {
    flexDirection: 'row',
    gap: 8,
  },
  floatingStats: {
    marginTop: 4,
  },
  floatingStatsText: {
    color: 'white',
    fontSize: 11,
    opacity: 0.9,
    textAlign: 'center',
  },
  recoveryPrompt: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
