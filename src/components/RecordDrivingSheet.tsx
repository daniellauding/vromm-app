import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert, AppState, AppStateStatus } from 'react-native';
import { Text, YStack, Button, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../contexts/TranslationContext';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { CreateRouteModal } from './CreateRouteModal';
import { Map } from './Map';

// Optional imports with fallbacks
let Device: any = {
  brand: 'Unknown',
  manufacturer: 'Unknown',
  modelName: 'Unknown',
  getDeviceNameAsync: async () => 'Unknown Device',
  deviceType: 'Unknown',
  osName: Platform.OS,
  osVersion: Platform.Version,
  totalMemory: 0,
};

let Accelerometer = {
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
};

let Gyroscope = {
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
};

let Magnetometer = {
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
};

let Pedometer = {
  setUpdateInterval: () => {},
  addListener: () => ({ remove: () => {} }),
};

let NetInfo = {
  fetch: async () => ({
    type: 'unknown',
    isConnected: true,
    details: null
  })
};

let Battery = {
  getBatteryLevelAsync: async () => 1.0,
  getBatteryStateAsync: async () => 'full',
  isLowPowerModeEnabledAsync: async () => false,
};

// Try to import the real modules if available
try {
  const DeviceModule = require('expo-device');
  if (DeviceModule) {
    Device = DeviceModule;
  }
} catch (error) {
  console.log('expo-device not available, using fallback');
}

try {
  const SensorsModule = require('expo-sensors');
  if (SensorsModule) {
    Accelerometer = SensorsModule.Accelerometer;
    Gyroscope = SensorsModule.Gyroscope;
    Magnetometer = SensorsModule.Magnetometer;
    Pedometer = SensorsModule.Pedometer;
  }
} catch (error) {
  console.log('expo-sensors not available, using fallbacks');
}

try {
  const NetInfoModule = require('@react-native-community/netinfo');
  if (NetInfoModule && NetInfoModule.default) {
    NetInfo = NetInfoModule.default;
  }
} catch (error) {
  console.log('@react-native-community/netinfo not available, using fallback');
}

try {
  const BatteryModule = require('expo-battery');
  if (BatteryModule) {
    Battery = BatteryModule;
  }
} catch (error) {
  console.log('expo-battery not available, using fallback');
}

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

const { height: screenHeight } = Dimensions.get('window');

// Define task for background location tracking
TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    console.error('LOCATION_TRACKING task error:', error);
    return;
  }
  if (data) {
    // @ts-ignore
    const { locations } = data;
    const location = locations[0];
    
    // Store this location in AsyncStorage or another persistent storage
    if (location) {
      try {
        // Send location to the global variable for access when app is in foreground
        if (global && (global as any).addBackgroundWaypoint) {
          (global as any).addBackgroundWaypoint({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            accuracy: location.coords.accuracy,
          });
        }
      } catch (err) {
        console.error('Error saving background location:', err);
      }
    }
  }
});

interface RecordDrivingSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onCreateRoute?: (routeData: RecordedRouteData) => void;
}

// Optimize sensitivity settings for better performance
const MIN_DISTANCE_FILTER = 3; // Increased from 0.5 to reduce updates
const MIN_TIME_FILTER = 1000; // Increased from 500 to reduce update frequency
const MIN_SPEED_THRESHOLD = 0.1; // Minimum speed to consider

// Update speed display to handle very low speeds better
const formatSpeed = (speed: number): string => {
  if (speed < MIN_SPEED_THRESHOLD) {
    return '0.0';
  }
  return speed.toFixed(1);
};

// Add a debug log array
let movementLogs: Array<{
  timestamp: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  distance: number | null;
  accepted: boolean;
}> = [];

// Add device data state with fallback values since packages might be missing
const defaultDeviceData = {
  deviceInfo: {
    brand: 'Unknown',
    manufacturer: 'Unknown',
    modelName: 'Unknown',
    deviceName: 'Unknown',
    deviceType: 'Unknown',
    osName: Platform.OS,
    osVersion: Platform.Version,
    totalMemory: 0
  },
  battery: {
    level: 1,
    state: 'unknown',
    isLowPowerMode: false
  },
  network: {
    type: 'unknown',
    isConnected: true,
    details: null
  },
  motion: {
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    magnetometer: { x: 0, y: 0, z: 0 },
    pedometer: null
  }
};

// Performance-optimized component
export const RecordDrivingSheet = React.memo((props: RecordDrivingSheetProps) => {
  const { isVisible, onClose, onCreateRoute } = props;
  const { t } = useTranslation();
  const { hideModal } = useModal();

  // Core recording state - only the essential pieces
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [waypoints, setWaypoints] = useState<RecordedWaypoint[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  
  // Only keep minimal debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  
  // Simplified map state
  const [showMap, setShowMap] = useState(false); // Keep map hidden by default
  const [initialRegion, setInitialRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  
  // Use refs for data that doesn't need to trigger renders
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const waypointThrottleRef = useRef<number>(0);
  const motionSubscriptionsRef = useRef<any>({});
  const wayPointsRef = useRef<RecordedWaypoint[]>([]); // Store waypoints in ref for calculations
  const lastErrorRef = useRef<string | null>(null);
  const deviceDataRef = useRef(defaultDeviceData);
  
  // Format waypoints for map display with safety checks - memoized for performance
  const getRoutePath = useCallback(() => {
    try {
      // Safety check for empty waypoints
      if (!waypoints || waypoints.length === 0) {
        return [];
      }
      
      // Filter out any invalid coordinates to prevent crashes
      return waypoints
        .filter(wp => (
          wp && 
          typeof wp.latitude === 'number' && 
          typeof wp.longitude === 'number' &&
          !isNaN(wp.latitude) && 
          !isNaN(wp.longitude)
        ))
        .map(wp => ({
          latitude: wp.latitude,
          longitude: wp.longitude
        }));
    } catch (error) {
      // Log error but don't crash
      console.error('Error formatting route path:', error);
      lastErrorRef.current = 'Path format error';
      return [];
            }
  }, [waypoints]);
          
  // Simplified waypoint markers - only 2 markers maximum
  const getWaypointMarkers = useCallback(() => {
    if (!waypoints || waypoints.length === 0) return [];
    
    try {
      const markers = [];
      
      // Add start marker if valid
      const startPoint = waypoints[0];
      if (startPoint && !isNaN(startPoint.latitude) && !isNaN(startPoint.longitude)) {
        markers.push({
          latitude: startPoint.latitude,
          longitude: startPoint.longitude,
          title: "Start",
          description: "Start point"
        });
          }
          
      // Add current position marker if different from start and valid
      if (waypoints.length > 1) {
        const current = waypoints[waypoints.length - 1];
        if (current && !isNaN(current.latitude) && !isNaN(current.longitude)) {
          markers.push({
            latitude: current.latitude,
            longitude: current.longitude,
            title: "Current",
            description: "Current position"
          });
        }
      }
      
      return markers;
    } catch (error) {
      console.error('Error creating markers:', error);
      return [];
    }
  }, [waypoints]);
  
  // Add these missing functions back as empty placeholders
  const startBackgroundLocationTask = async () => {
    // Empty implementation to prevent crashes
    console.log("Background location tracking not available in this version");
    return false;
  };
  
  const stopBackgroundLocationTask = async () => {
    // Empty implementation to prevent crashes
    console.log("Stop background tracking not available in this version");
    return false;
  };
  
  const cleanupMotionSensors = () => {
    // Empty implementation to prevent crashes
    console.log("Motion sensor cleanup not available in this version");
  };

  // Start recording location - optimized for performance
  const startLocationTracking = useCallback(async () => {
    try {
      // First check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
      if (!serviceEnabled) {
        setDebugMessage('Location services disabled');
        return;
      }
      
      // Verify permission is granted
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'error' }));
      if (status !== 'granted') {
        setDebugMessage('Location permission denied');
        return;
      }
      
      // Set up watch position with error handling
      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Lower accuracy for better performance
        timeInterval: MIN_TIME_FILTER,
        distanceInterval: MIN_DISTANCE_FILTER,
          },
          (location) => {
            try {
              const now = Date.now();
              
              // Validate location data before processing
              if (!location || !location.coords) {
                return;
              }
              
              // Calculate metrics even if we don't save the waypoint
              const newWaypoint: RecordedWaypoint = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                timestamp: location.timestamp,
                speed: location.coords.speed,
                accuracy: location.coords.accuracy,
              };
  
              // Calculate distance from last waypoint if we have one
              let distanceFromLast = 0;
              let shouldAddWaypoint = true;
              
              if (wayPointsRef.current.length > 0) {
                const lastWaypoint = wayPointsRef.current[wayPointsRef.current.length - 1];
                distanceFromLast = calculateDistance(
                  lastWaypoint.latitude,
                  lastWaypoint.longitude,
                  newWaypoint.latitude,
                  newWaypoint.longitude
                ) * 1000; // Convert to meters
                
                // Only add waypoint if it's a significant movement
                if (distanceFromLast < MIN_DISTANCE_FILTER) {
                  shouldAddWaypoint = false;
                }
              }
              
              // Update current speed display - handle null speeds better
              let currentSpeedKmh = 0;
              if (location.coords.speed !== null) {
                currentSpeedKmh = Math.max(0, location.coords.speed * 3.6); // Convert m/s to km/h and ensure non-negative
                setCurrentSpeed(currentSpeedKmh);
              }
              
              // Throttle waypoint updates to reduce memory pressure
              if (now - waypointThrottleRef.current < MIN_TIME_FILTER && waypointThrottleRef.current !== 0) {
                return;
              }
              
              waypointThrottleRef.current = now;
              
              // Only log occasionally to reduce console spam
              if (now % 10000 < 100) { // Log every 10 seconds
                console.log(`Recording: ${wayPointsRef.current.length} points, ${distance.toFixed(2)}km`);
        }
              
              // Add waypoint if recording and not paused and significant movement
              if (!isPaused && shouldAddWaypoint) {
                // Update waypoints in both state and ref
                wayPointsRef.current = [...wayPointsRef.current, newWaypoint];
                setWaypoints(wayPointsRef.current);
                
                // Calculate total distance
                if (wayPointsRef.current.length > 1) {
                  const lastWaypoint = wayPointsRef.current[wayPointsRef.current.length - 2];
                  const segmentDistance = calculateDistance(
                    lastWaypoint.latitude,
                    lastWaypoint.longitude,
                    newWaypoint.latitude,
                    newWaypoint.longitude
                  );
                  setDistance(prevDistance => prevDistance + segmentDistance);
      }
      
                // Update debug message occasionally
                if (now % 5000 < 100) {
                  setDebugMessage(`Last update: ${new Date().toLocaleTimeString()}`);
                }
              }
    } catch (error) {
              console.error('Error processing location update:', error);
              lastErrorRef.current = 'Location update error';
              // Continue tracking despite errors
            }
          }
        );

        setLocationSubscription(subscription);
        
        // Try to restart background tracking
        try {
          await startBackgroundLocationTask();
        } catch (err) {
          console.warn('Failed to restart background tracking:', err);
        }
      } catch (err) {
        console.error('Error setting up watch position:', err);
        setDebugMessage('Error starting location tracking');
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setDebugMessage('Failed to start tracking');
    }
  }, [isPaused]);

  // Start recording - optimized
  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setWaypoints([]);
      wayPointsRef.current = [];
      setElapsedTime(0);
      setDistance(0);
      setAverageSpeed(0);
      setCurrentSpeed(0);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setDebugMessage(null);
      lastErrorRef.current = null;

      // Start timer with defensive error handling
      try {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
      timerRef.current = setInterval(() => {
          try {
        if (startTimeRef.current && !isPaused) {
          const totalPausedTime = pausedTimeRef.current || 0;
          const elapsed = Math.floor((Date.now() - startTimeRef.current - totalPausedTime) / 1000);
          setElapsedTime(elapsed);
          
          // Recalculate average speed based on total time and distance
          if (elapsed > 0) {
            const timeHours = elapsed / 3600; // Convert seconds to hours
            if (timeHours > 0) {
              setAverageSpeed(distance / timeHours); // km/h
            }
          }
            }
          } catch (error) {
            console.error('Timer error:', error);
        }
      }, 1000) as unknown as NodeJS.Timeout;
      } catch (err) {
        console.error('Error setting up timer:', err);
      }

      // Set recording state
      setIsRecording(true);
      setIsPaused(false);

      // Start location tracking
      await startLocationTracking();
    } catch (error) {
      console.error('Error starting recording:', error);
      setDebugMessage('Failed to start recording');
    }
  }, [isPaused, distance, startLocationTracking]);

  // Pause recording - memoized
  const pauseRecording = useCallback(() => {
    if (isRecording && !isPaused) {
      setIsPaused(true);
      pausedTimeRef.current = Date.now() - (startTimeRef.current || 0) - (pausedTimeRef.current || 0);
    }
  }, [isRecording, isPaused]);

  // Resume recording - memoized
  const resumeRecording = useCallback(() => {
    if (isRecording && isPaused) {
      setIsPaused(false);
    }
  }, [isRecording, isPaused]);

  // Stop recording with better cleanup
  const stopRecording = useCallback(() => {
    try {
      // Clean up location subscription
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    
      // Clean up timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop background location tracking
      try {
    stopBackgroundLocationTask();
      } catch (err) {
        console.warn('Error stopping background task:', err);
      }
    
      // Update state
    setIsRecording(false);
    setIsPaused(false);
    setShowSummary(true);

      // Clean up motion sensors
      try {
    cleanupMotionSensors();
      } catch (err) {
        console.warn('Error cleaning up sensors:', err);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Try to ensure we still show summary even if errors
      setIsRecording(false);
      setShowSummary(true);
    }
  }, [locationSubscription, stopBackgroundLocationTask, cleanupMotionSensors]);

  // Format time display - memoized
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Navigate to route creation with recorded data - memoized
  const saveRecording = useCallback(() => {
    try {
    console.log('RecordDrivingSheet: saveRecording called');
      
      // Skip if no waypoints
      if (waypoints.length === 0) {
        Alert.alert("No data", "No movement was recorded. Please try again.");
        return;
      }
    
    // Create route data object
    const routeData = {
      waypoints: waypoints.map(wp => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
        timestamp: wp.timestamp,
      })),
      distance: distance.toFixed(2),
      duration: elapsedTime,
      avgSpeed: averageSpeed.toFixed(1),
    };

    // Prepare waypoints data for CreateRouteScreen
    const waypointsForRouteCreation = waypoints.map((wp, index) => ({
      latitude: wp.latitude,
      longitude: wp.longitude,
      title: `Waypoint ${index + 1}`,
      description: `Recorded at ${new Date(wp.timestamp).toLocaleTimeString()}`
    }));
    
    const routeName = `Recorded Route ${new Date().toLocaleDateString()}`;
    const routeDescription = `Recorded drive - Distance: ${routeData.distance} km, Duration: ${formatTime(routeData.duration)}, Speed: ${averageSpeed.toFixed(1)} km/h`;
    
    // Get coordinates for first waypoint for search input
    const firstWaypoint = waypoints[0];
    const lastWaypoint = waypoints[waypoints.length - 1];
    let searchCoordinates = "";
    
    if (firstWaypoint) {
      searchCoordinates = `${firstWaypoint.latitude.toFixed(6)}, ${firstWaypoint.longitude.toFixed(6)}`;
    }
    
    // Create route path for map display
    const routePath = waypoints.map(wp => ({
      latitude: wp.latitude,
      longitude: wp.longitude
    }));
    
    const recordedRouteData: RecordedRouteData = {
      waypoints: waypointsForRouteCreation,
      name: routeName,
      description: routeDescription,
      searchCoordinates: searchCoordinates,
      routePath: routePath,
      startPoint: firstWaypoint ? { 
        latitude: firstWaypoint.latitude, 
        longitude: firstWaypoint.longitude 
      } : undefined,
      endPoint: lastWaypoint ? { 
        latitude: lastWaypoint.latitude, 
        longitude: lastWaypoint.longitude 
      } : undefined
    };

    // Save the recordedRouteData for the callback to use
    const savedData = {...recordedRouteData};
    
            // First close the modal
            hideModal();
            
    // Call the callback with a timeout to ensure modal is closed first
            if (onCreateRoute) {
              setTimeout(() => {
        onCreateRoute(savedData);
      }, 100);
            } else {
        console.error('RecordDrivingSheet: onCreateRoute callback is not defined!');
            }
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert("Error", "Failed to save the recording. Please try again.");
    }
  }, [waypoints, distance, elapsedTime, averageSpeed, formatTime, hideModal, onCreateRoute]);
  
  // Cancel recording session - memoized
  const cancelRecording = useCallback(() => {
    try {
    if (isRecording) {
        // Clean up location subscription
              if (locationSubscription) {
                locationSubscription.remove();
                setLocationSubscription(null);
              }
              
        // Clean up timer
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
      
      // Stop background location tracking
        try {
      stopBackgroundLocationTask();
        } catch (err) {
          console.warn('Error stopping background task:', err);
        }
              
        // Reset state
              setIsRecording(false);
      setIsPaused(false);
              setShowSummary(false);
              setWaypoints([]);
        wayPointsRef.current = [];
              setElapsedTime(0);
              setDistance(0);
              setAverageSpeed(0);
      setCurrentSpeed(0);
        setDebugMessage(null);
    } else {
      onClose();
    }
    } catch (error) {
      console.error('Error cancelling recording:', error);
      // Force close anyway
      onClose();
    }
  }, [isRecording, locationSubscription, onClose]);
      
  // Optimize render to be more performant
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={isRecording ? undefined : onClose}
      />
      <View style={[styles.sheet, { backgroundColor: DARK_THEME.background }]}>
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
          <Text fontWeight="600" fontSize={24} color={DARK_THEME.text}>
            {t('map.recordDriving') || 'Record Route'}
          </Text>
          <TouchableOpacity onPress={cancelRecording} disabled={false}>
            <Feather name="x" size={24} color={DARK_THEME.text} />
          </TouchableOpacity>
        </View>
        
        {/* Map Toggle Button - Only show if recording */}
        {isRecording && (
          <XStack justifyContent="center" marginBottom={8}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: showMap ? '#00E6C3' : '#FF9500',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}
              onPress={() => setShowMap(!showMap)}
            >
              <Feather name={showMap ? "eye" : "eye-off"} size={16} color="white" />
              <Text color="white" marginLeft={4} fontWeight="500">
                {showMap ? "Hide Map" : "Show Map"}
              </Text>
            </TouchableOpacity>
          </XStack>
        )}
        
        {/* Map (only shown if explicitly enabled) */}
        {showMap && isRecording && (
          <View style={styles.mapContainer}>
            <Map 
              waypoints={getWaypointMarkers()}
              region={initialRegion || {
                latitude: 37.7749,
                longitude: -122.4194,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1
              }}
              style={styles.map}
              routePath={getRoutePath()}
              routePathColor={isPaused ? "#FF9500" : "#00E6C3"}
              routePathWidth={4}
            />
            
            {/* Recording indicator */}
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, isPaused ? styles.pausedDot : styles.activeDot]} />
              <Text color="white" fontSize={12} marginLeft={4}>
                {isPaused ? "PAUSED" : "RECORDING"}
              </Text>
            </View>
          </View>
        )}
        
        {/* Recording Status Display (always shown when recording) */}
        {isRecording && !showMap && (
          <View style={[styles.recordingStatusContainer, { backgroundColor: DARK_THEME.cardBackground }]}>
            <View style={styles.recordingStatusInner}>
              <View style={[styles.recordingDot, isPaused ? styles.pausedDot : styles.activeDot]} />
              <Text color={DARK_THEME.text} fontSize={16} fontWeight="bold" marginLeft={8}>
                {isPaused ? "RECORDING PAUSED" : "RECORDING ACTIVE"}
              </Text>
            </View>
            <Text color={DARK_THEME.text} marginTop={4}>
              Recording {waypoints.length} waypoints • {distance.toFixed(2)} km
            </Text>
            {debugMessage && (
              <Text color="#FF9500" fontSize={12} marginTop={4}>
                {debugMessage}
              </Text>
            )}
          </View>
        )}
        
        <YStack padding={16} space={16}>
          {/* Stats display */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>TIME</Text>
              <Text color={DARK_THEME.text} fontSize={24} fontWeight="600">{formatTime(elapsedTime)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>DISTANCE</Text>
              <Text color={DARK_THEME.text} fontSize={24} fontWeight="600">{distance.toFixed(2)} km</Text>
            </View>
            <View style={styles.statItem}>
              <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>SPEED</Text>
              <XStack>
                <Text color={DARK_THEME.text} fontSize={24} fontWeight="600">{formatSpeed(averageSpeed)}</Text>
                <Text color={DARK_THEME.text} fontSize={16} opacity={0.7} marginTop={4}> km/h</Text>
              </XStack>
              <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>Current: {formatSpeed(currentSpeed)} km/h</Text>
            </View>
          </View>
          
          {/* Record/Summary view */}
          {!showSummary ? (
            /* Record button */
            <View style={styles.recordButtonContainer}>
              {isRecording ? (
                <XStack gap={16} justifyContent="center">
                  {isPaused ? (
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
                style={[
                  styles.recordButton,
                    { backgroundColor: '#1A3D3D' },
                ]}
                  onPress={startRecording}
              >
                  <Feather name="play" size={32} color="white" />
              </TouchableOpacity>
              )}
              <Text color={DARK_THEME.text} marginTop={8}>
                {isRecording 
                  ? (isPaused ? 'Recording Paused' : 'Recording...') 
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
                Your route has been recorded successfully. You can now create a new route with these waypoints.
              </Text>
              
                <Button
                backgroundColor="#1A3D3D"
                  color="white"
                onPress={saveRecording}
                size="$4"
                height={50}
                pressStyle={{ opacity: 0.8 }}
                >
                <XStack gap="$2" alignItems="center">
                  <Feather name="check" size={24} color="white" />
                  <Text color="white" fontWeight="600" fontSize={18}>Create Route</Text>
                </XStack>
                </Button>
                
                <Button
                backgroundColor="#3D3D1A"
                  color="white"
                onPress={cancelRecording}
                marginBottom={8}
                >
                <Text color="white">Dismiss</Text>
              </Button>
            </YStack>
          )}
            </YStack>
      </View>
    </View>
  );
});

// Modal version for use with modal system
export const RecordDrivingModal = () => {
  const { hideModal, showModal } = useModal();
  
  // Handle route creation by showing the CreateRouteModal
  const onCreateRoute = (routeData: RecordedRouteData) => {
    console.log('RecordDrivingModal: onCreateRoute called with data', {
      waypointsCount: routeData.waypoints.length,
      name: routeData.name,
      description: routeData.description
    });
    
    // First close the current modal
    hideModal();
    
    // Show the CreateRouteModal with a small delay to ensure the current modal is closed
    setTimeout(() => {
      console.log('RecordDrivingModal: Showing CreateRouteModal');
      showModal(<CreateRouteModal routeData={routeData} />);
    }, 300) as unknown as NodeJS.Timeout;
  };
  
  return (
    <RecordDrivingSheet 
      isVisible={true} 
      onClose={hideModal} 
      onCreateRoute={onCreateRoute}
    />
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
}); 