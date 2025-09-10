import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, YStack, Button, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../contexts/TranslationContext';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { CreateRouteModal } from './CreateRouteModal';
import MapView, { Polyline, Marker } from './MapView';
import { AppAnalytics } from '../utils/analytics';

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
    details: null,
  }),
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

// Add a debug log array
const movementLogs: Array<{
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
    totalMemory: 0,
  },
  battery: {
    level: 1,
    state: 'unknown',
    isLowPowerMode: false,
  },
  network: {
    type: 'unknown',
    isConnected: true,
    details: null,
  },
  motion: {
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    magnetometer: { x: 0, y: 0, z: 0 },
    pedometer: null,
  },
};

// Performance-optimized component
export const RecordDrivingSheet = React.memo((props: RecordDrivingSheetProps) => {
  const { isVisible, onClose, onCreateRoute } = props;
  const { t } = useTranslation();
  const { hideModal, setModalPointerEvents } = useModal();

  // Enhanced recording state with better time tracking
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [waypoints, setWaypoints] = useState<RecordedWaypoint[]>([]);

  // Time tracking - separate total time from driving time
  const [totalElapsedTime, setTotalElapsedTime] = useState(0); // Total duration including pauses
  const [drivingTime, setDrivingTime] = useState(0); // Active driving time (excluding pauses)
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState(0); // Total time spent paused
  const [lastPauseTime, setLastPauseTime] = useState<Date | null>(null);

  // Enhanced speed and distance tracking
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);

  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);
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
  const isPausedRef = useRef<boolean>(false); // Track pause state in ref to avoid closure issues
  const lastPauseTimeRef = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);
  const waypointThrottleRef = useRef<number>(0);
  const motionSubscriptionsRef = useRef<any>({});
  const wayPointsRef = useRef<RecordedWaypoint[]>([]); // Store waypoints in ref for calculations
  const lastErrorRef = useRef<string | null>(null);
  const lastStateUpdateRef = useRef<number>(0); // Throttle state updates
  const deviceDataRef = useRef(defaultDeviceData);
  
  // Auto-save refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<number>(0);
  const [hasRecoveryData, setHasRecoveryData] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  // Format waypoints for map display with safety checks - memoized for performance
  const getRoutePath = useCallback(() => {
    try {
      // Safety check for empty waypoints
      if (!waypoints || waypoints.length === 0) {
        return [];
      }

      // Filter out any invalid coordinates to prevent crashes
      return waypoints
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
      lastErrorRef.current = 'Path format error';
      return [];
    }
  }, [waypoints]);

  // Add these missing functions back as empty placeholders
  const startBackgroundLocationTask = async () => {
    // Empty implementation to prevent crashes
    console.log('Background location tracking not available in this version');
    return false;
  };

  const stopBackgroundLocationTask = async () => {
    // Empty implementation to prevent crashes
    console.log('Stop background tracking not available in this version');
    return false;
  };

  const cleanupMotionSensors = () => {
    // Empty implementation to prevent crashes
    console.log('Motion sensor cleanup not available in this version');
  };

  // Format time display with HH:MM:SS format - memoized
  const formatTime = useCallback(
    (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      // Debug log for timer formatting (only log occasionally to avoid spam)
      if (seconds % 10 === 0 && seconds > 0) {
        console.log('⏰ formatTime called:', {
          inputSeconds: seconds,
          hours,
          mins,
          secs,
          isRecording,
          isPaused,
        });
      }

      // Always show at least MM:SS, add hours if recording goes over 1 hour
      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    },
    [isRecording, isPaused],
  );

  // Auto-save current recording session
  const autoSaveSession = useCallback(async () => {
    try {
      if (!isRecording || wayPointsRef.current.length === 0) {
        return;
      }

      const now = Date.now();
      // Don't save too frequently
      if (now - lastAutoSaveRef.current < AUTO_SAVE_INTERVAL) {
        return;
      }

      const sessionData = {
        waypoints: wayPointsRef.current,
        isRecording,
        isPaused,
        totalElapsedTime,
        drivingTime,
        distance,
        currentSpeed,
        maxSpeed,
        averageSpeed,
        recordingStartTime: recordingStartTime?.toISOString(),
        pausedTime,
        lastSaveTime: now,
        sessionId: `recording_${startTimeRef.current}`,
      };

      await AsyncStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(sessionData));
      await AsyncStorage.setItem(RECOVERY_CHECK_KEY, 'true');
      lastAutoSaveRef.current = now;

      console.log('🔄 Auto-saved recording session:', {
        waypoints: wayPointsRef.current.length,
        distance: distance.toFixed(2),
        time: formatTime(totalElapsedTime),
      });
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }, [isRecording, isPaused, totalElapsedTime, drivingTime, distance, currentSpeed, maxSpeed, averageSpeed, recordingStartTime, pausedTime, formatTime]);

  // Check for recovery data on component mount
  const checkForRecoveryData = useCallback(async () => {
    try {
      const recoveryCheck = await AsyncStorage.getItem(RECOVERY_CHECK_KEY);
      const sessionData = await AsyncStorage.getItem(AUTO_SAVE_KEY);
      
      if (recoveryCheck === 'true' && sessionData) {
        const parsed = JSON.parse(sessionData);
        
        // Check if the session is recent (within last 24 hours)
        const lastSaveTime = parsed.lastSaveTime || 0;
        const hoursSinceLastSave = (Date.now() - lastSaveTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastSave < 24 && parsed.waypoints && parsed.waypoints.length > 0) {
          console.log('🔄 Found recovery data:', {
            waypoints: parsed.waypoints.length,
            distance: parsed.distance,
            hoursSinceLastSave: hoursSinceLastSave.toFixed(1),
          });
          
          setHasRecoveryData(true);
          setShowRecoveryPrompt(true);
          return parsed;
        }
      }
      
      // Clean up old recovery data
      await clearRecoveryData();
    } catch (error) {
      console.error('❌ Recovery check failed:', error);
      await clearRecoveryData();
    }
    return null;
  }, []);

  // Restore from recovery data
  const restoreFromRecovery = useCallback(async () => {
    try {
      const sessionData = await AsyncStorage.getItem(AUTO_SAVE_KEY);
      if (!sessionData) return;

      const parsed = JSON.parse(sessionData);
      
      // Restore waypoints
      wayPointsRef.current = parsed.waypoints || [];
      setWaypoints([...wayPointsRef.current]);
      
      // Restore stats
      setDistance(parsed.distance || 0);
      setCurrentSpeed(parsed.currentSpeed || 0);
      setMaxSpeed(parsed.maxSpeed || 0);
      setAverageSpeed(parsed.averageSpeed || 0);
      setTotalElapsedTime(parsed.totalElapsedTime || 0);
      setDrivingTime(parsed.drivingTime || 0);
      
      // Restore recording state
      if (parsed.recordingStartTime) {
        setRecordingStartTime(new Date(parsed.recordingStartTime));
      }
      
      setPausedTime(parsed.pausedTime || 0);
      setShowMap(true); // Show map to display recovered route
      setShowSummary(true); // Go directly to summary
      
      console.log('✅ Restored recording session:', {
        waypoints: wayPointsRef.current.length,
        distance: parsed.distance,
        totalTime: formatTime(parsed.totalElapsedTime || 0),
      });

      Alert.alert(
        'Recording Recovered',
        `Found a previous recording session with ${wayPointsRef.current.length} waypoints and ${(parsed.distance || 0).toFixed(2)} km. You can now create a route from this data.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Recovery restore failed:', error);
      Alert.alert('Recovery Failed', 'Could not restore the previous recording session.');
    } finally {
      setShowRecoveryPrompt(false);
      await clearRecoveryData();
    }
  }, [formatTime]);

  // Clear recovery data
  const clearRecoveryData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTO_SAVE_KEY);
      await AsyncStorage.removeItem(RECOVERY_CHECK_KEY);
      setHasRecoveryData(false);
      setShowRecoveryPrompt(false);
    } catch (error) {
      console.error('❌ Failed to clear recovery data:', error);
    }
  }, []);

  // Save as draft when app goes to background or crashes
  const saveAsDraftEmergency = useCallback(async () => {
    try {
      if (!isRecording || wayPointsRef.current.length === 0) {
        return;
      }

      console.log('🚨 Emergency draft save triggered');
      
      // Create emergency draft data
      const validWaypoints = wayPointsRef.current.filter((wp) => 
        wp && 
        typeof wp.latitude === 'number' && 
        typeof wp.longitude === 'number' &&
        !isNaN(wp.latitude) && 
        !isNaN(wp.longitude)
      );

      if (validWaypoints.length === 0) {
        console.log('🚨 No valid waypoints for emergency save');
        return;
      }

      const waypointsForRoute = validWaypoints.map((wp, index) => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
        title: `Emergency Waypoint ${index + 1}`,
        description: `Auto-saved at ${new Date(wp.timestamp).toLocaleTimeString()}`,
      }));

      const routeName = `Emergency Draft - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      const routeDescription = `Auto-saved recording - Distance: ${distance.toFixed(2)} km, Duration: ${formatTime(totalElapsedTime)}, Waypoints: ${validWaypoints.length}`;

      const firstWaypoint = validWaypoints[0];
      const searchCoordinates = `${firstWaypoint.latitude.toFixed(6)}, ${firstWaypoint.longitude.toFixed(6)}`;

      const routePath = validWaypoints.map((wp) => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
      }));

      const emergencyDraftData: RecordedRouteData = {
        waypoints: waypointsForRoute,
        name: routeName,
        description: routeDescription,
        searchCoordinates,
        routePath,
        startPoint: {
          latitude: firstWaypoint.latitude,
          longitude: firstWaypoint.longitude,
        },
        endPoint: validWaypoints.length > 1 ? {
          latitude: validWaypoints[validWaypoints.length - 1].latitude,
          longitude: validWaypoints[validWaypoints.length - 1].longitude,
        } : undefined,
      };

      // Store emergency draft data
      await AsyncStorage.setItem('@emergency_draft', JSON.stringify(emergencyDraftData));
      
      console.log('🚨 Emergency draft saved successfully:', {
        waypoints: waypointsForRoute.length,
        distance: distance.toFixed(2),
        name: routeName,
      });

    } catch (error) {
      console.error('🚨 Emergency draft save failed:', error);
    }
  }, [isRecording, distance, totalElapsedTime, formatTime]);

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
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({
        status: 'error',
      }));
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
                distanceFromLast =
                  calculateDistance(
                    lastWaypoint.latitude,
                    lastWaypoint.longitude,
                    newWaypoint.latitude,
                    newWaypoint.longitude,
                  ) * 1000; // Convert to meters

                // Only add waypoint if it's a significant movement
                if (distanceFromLast < MIN_DISTANCE_FILTER) {
                  shouldAddWaypoint = false;
                }
              }

              // Enhanced speed calculation with GPS fallback
              const gpsSpeed =
                location.coords.speed !== null && location.coords.speed >= 0
                  ? location.coords.speed * 3.6 // Convert m/s to km/h
                  : null;

              // Calculated speed from distance/time if we have previous waypoint
              let calculatedSpeed = 0;
              if (wayPointsRef.current.length > 0) {
                const lastWaypoint = wayPointsRef.current[wayPointsRef.current.length - 1];
                const timeDiff = (newWaypoint.timestamp - lastWaypoint.timestamp) / 1000; // seconds
                if (timeDiff > 0 && distanceFromLast > 0) {
                  calculatedSpeed = distanceFromLast / 1000 / (timeDiff / 3600); // km/h
                }
              }

              // Use most reliable speed source
              const finalSpeed = gpsSpeed !== null && gpsSpeed < 200 ? gpsSpeed : calculatedSpeed;

              // Update speed tracking
              setCurrentSpeed(Math.max(0, finalSpeed));
              setMaxSpeed((prev) => Math.max(prev, finalSpeed));

              // Enhanced waypoint filtering - DISABLED FOR TESTING
              const minimumWaypointDistance = 0; // 0 meters - TESTING MODE
              const minimumSpeed = 0; // 0 km/h - TESTING MODE
              shouldAddWaypoint =
                shouldAddWaypoint &&
                (distanceFromLast >= minimumWaypointDistance || finalSpeed >= minimumSpeed);

              console.log('🚗 WAYPOINT FILTER DEBUG:', {
                distanceFromLast,
                finalSpeed,
                minimumWaypointDistance,
                minimumSpeed,
                shouldAddWaypoint,
                isPaused,
                totalWaypoints: wayPointsRef.current.length,
              });

              // Throttle waypoint updates to reduce memory pressure
              if (
                now - waypointThrottleRef.current < MIN_TIME_FILTER &&
                waypointThrottleRef.current !== 0
              ) {
                return;
              }

              waypointThrottleRef.current = now;

              // Only log occasionally to reduce console spam
              if (now % 10000 < 100) {
                // Log every 10 seconds
                console.log(
                  `Recording: ${wayPointsRef.current.length} points, ${distance.toFixed(2)}km`,
                );
              }

              // Add waypoint if recording and not paused and significant movement
              if (!isPaused && shouldAddWaypoint) {
                // Update waypoints ref immediately for calculations
                wayPointsRef.current = [...wayPointsRef.current, newWaypoint];

                // Throttle state updates to reduce re-renders (update every 5 waypoints or 2 seconds)
                const shouldUpdateState =
                  wayPointsRef.current.length % 5 === 0 || now - lastStateUpdateRef.current > 2000;

                if (shouldUpdateState) {
                  setWaypoints([...wayPointsRef.current]);
                  lastStateUpdateRef.current = now;
                }

                // Calculate total distance
                if (wayPointsRef.current.length > 1) {
                  const lastWaypoint = wayPointsRef.current[wayPointsRef.current.length - 2];
                  const segmentDistance = calculateDistance(
                    lastWaypoint.latitude,
                    lastWaypoint.longitude,
                    newWaypoint.latitude,
                    newWaypoint.longitude,
                  );
                  setDistance((prevDistance) => prevDistance + segmentDistance);
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
          },
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

  // Start recording - optimized with user location centering
  const startRecording = useCallback(async () => {
    try {
      console.log('🎬 STARTING RECORDING - Full Debug');
      console.log('🎬 Initial State:', {
        isRecording,
        isPaused,
        waypoints: waypoints.length,
        totalElapsedTime,
        drivingTime,
        distance,
      });

      // Track recording start in Firebase Analytics
      await AppAnalytics.trackRouteRecordingStart().catch(() => {
        // Silently fail analytics
      });

      // Reset all state and refs for clean start
      setWaypoints([]);
      wayPointsRef.current = [];
      lastStateUpdateRef.current = 0;
      setTotalElapsedTime(0);
      setDrivingTime(0);
      setDistance(0);
      setCurrentSpeed(0);
      setMaxSpeed(0);
      setAverageSpeed(0);
      const startTime = new Date();
      setRecordingStartTime(startTime);
      setPausedTime(0);
      setLastPauseTime(null);
      setDebugMessage(null);
      lastErrorRef.current = null;

      // Reset all timer refs
      isPausedRef.current = false;
      lastPauseTimeRef.current = null;
      pausedTimeRef.current = 0;

      console.log('🎬 State Reset Complete:', {
        recordingStartTime: startTime.toISOString(),
        timestamp: Date.now(),
      });

      // Get user's current location to center map
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (location) {
          // Show map and center on user location
          setShowMap(true);
        }
      } catch (error) {
        console.warn('Could not get current location for centering:', error);
      }

      // Start timer with refs to avoid closure issues
      try {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // Reset refs for clean start
        startTimeRef.current = startTime.getTime();
        pausedTimeRef.current = 0;
        isPausedRef.current = false;
        lastPauseTimeRef.current = null;

        console.log('🎬 Starting fixed timer with refs...');
        timerRef.current = setInterval(() => {
          try {
            const now = Date.now();
            const startTimeMs = startTimeRef.current!;
            const currentPausedTime = pausedTimeRef.current;
            const isCurrentlyPaused = isPausedRef.current;

            // Always update total elapsed time (includes pauses)
            const totalElapsed = Math.floor((now - startTimeMs) / 1000);
            setTotalElapsedTime(totalElapsed);

            // Update driving time (excludes pauses)
            const activeDriving = Math.floor((now - startTimeMs - currentPausedTime) / 1000);
            setDrivingTime(Math.max(0, activeDriving)); // Ensure non-negative

            // Only recalculate average speed when actually driving
            if (!isCurrentlyPaused && activeDriving > 0 && distance > 0) {
              const timeHours = activeDriving / 3600;
              setAverageSpeed(distance / timeHours);
            }

            // Debug log every 5 seconds to verify timer is working
            if (totalElapsed % 5 === 0 && totalElapsed > 0) {
              console.log('⏱️ TIMER TICK (FIXED):', {
                totalElapsed,
                totalFormatted: formatTime(totalElapsed),
                activeDriving,
                drivingFormatted: formatTime(activeDriving),
                isCurrentlyPaused,
                currentPausedTime,
                distance: distance.toFixed(2),
                startTime: new Date(startTimeMs).toISOString(),
              });
            }
          } catch (error) {
            console.error('❌ Timer error:', error);
          }
        }, 1000) as unknown as NodeJS.Timeout;

        console.log('🎬 Fixed timer started - using refs to avoid closure issues');
      } catch (err) {
        console.error('Error setting up timer:', err);
      }

      // Set recording state (refs already set above)
      console.log('🎬 Setting recording state: isRecording=true, isPaused=false');
      setIsRecording(true);
      setIsPaused(false);

      console.log('🎬 Final ref state check:', {
        isPausedRef: isPausedRef.current,
        pausedTimeRef: pausedTimeRef.current,
        startTimeRef: startTimeRef.current,
      });

      console.log('🎬 Starting location tracking...');
      // Start location tracking
      await startLocationTracking();
      console.log('🎬 ✅ Recording fully started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setDebugMessage('Failed to start recording');
    }
  }, [isPaused, distance, startLocationTracking]);

  // Pause recording - fixed with refs
  const pauseRecording = useCallback(() => {
    console.log('⏸️ PAUSE RECORDING CALLED:', {
      isRecording,
      isPaused,
      isPausedRef: isPausedRef.current,
    });

    if (isRecording && !isPaused && !isPausedRef.current) {
      const pauseTime = Date.now();

      // Update both state and ref
      setIsPaused(true);
      isPausedRef.current = true;
      lastPauseTimeRef.current = pauseTime;
      setLastPauseTime(new Date(pauseTime));

      console.log('⏸️ Recording PAUSED:', {
        pauseTime: new Date(pauseTime).toISOString(),
        currentTotalTime: totalElapsedTime,
        currentDrivingTime: drivingTime,
      });
    }
  }, [isRecording, isPaused, totalElapsedTime, drivingTime]);

  // Resume recording - fixed with refs
  const resumeRecording = useCallback(() => {
    console.log('▶️ RESUME RECORDING CALLED:', {
      isRecording,
      isPaused,
      isPausedRef: isPausedRef.current,
      lastPauseTimeRef: lastPauseTimeRef.current,
    });

    if (isRecording && isPaused && isPausedRef.current && lastPauseTimeRef.current) {
      const resumeTime = Date.now();
      const pauseDuration = resumeTime - lastPauseTimeRef.current;

      // Update refs first
      isPausedRef.current = false;
      pausedTimeRef.current = pausedTimeRef.current + pauseDuration;
      lastPauseTimeRef.current = null;

      // Update state
      setIsPaused(false);
      setPausedTime((prev) => prev + pauseDuration);
      setLastPauseTime(null);

      console.log('▶️ Recording RESUMED:', {
        pauseDuration: Math.floor(pauseDuration / 1000) + 's',
        totalPausedTime: Math.floor(pausedTimeRef.current / 1000) + 's',
        resumeTime: new Date(resumeTime).toISOString(),
      });
    }
  }, [isRecording, isPaused]);

  // Stop recording with better cleanup
  const stopRecording = useCallback(() => {
    try {
      console.log('🛑 STOP RECORDING CALLED');

      // Track recording end in Firebase Analytics
      AppAnalytics.trackRouteRecordingEnd(
        'temp_route_' + Date.now(), // Temporary ID since route isn't created yet
        drivingTime, // Duration in seconds
        distance // Distance in kilometers
      ).catch(() => {
        // Silently fail analytics
      });

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

      // Reset refs
      isPausedRef.current = false;
      lastPauseTimeRef.current = null;

      // Stop background location tracking
      try {
        stopBackgroundLocationTask();
      } catch (err) {
        console.warn('Error stopping background task:', err);
      }

      // Update state and sync final waypoints
      setIsRecording(false);
      setIsPaused(false);
      setShowSummary(true);

      // Ensure final waypoint state is synchronized
      if (wayPointsRef.current.length > 0) {
        setWaypoints([...wayPointsRef.current]);
      }

      // Clean up motion sensors
      try {
        cleanupMotionSensors();
      } catch (err) {
        console.warn('Error cleaning up sensors:', err);
      }

      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Clear recovery data since recording completed successfully
      clearRecoveryData();

      console.log('🛑 Recording STOPPED - Final stats:', {
        totalTime: formatTime(totalElapsedTime),
        drivingTime: formatTime(drivingTime),
        distance: distance.toFixed(2) + 'km',
        waypoints: wayPointsRef.current.length,
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Try to ensure we still show summary even if errors
      setIsRecording(false);
      setShowSummary(true);
    }
  }, [
    locationSubscription,
    stopBackgroundLocationTask,
    cleanupMotionSensors,
    totalElapsedTime,
    drivingTime,
    distance,
  ]);

  // Navigate to route creation with recorded data - memoized
  const saveRecording = useCallback(() => {
    try {
      console.log('💾 ==================== SAVE RECORDING START ====================');
      console.log('💾 saveRecording called');
      console.log('💾 Recording Stats:', {
        totalWaypoints: waypoints.length,
        waypointsRef: wayPointsRef.current.length,
        distance: distance.toFixed(2),
        drivingTime,
        totalElapsedTime,
        averageSpeed: averageSpeed.toFixed(1),
        maxSpeed: maxSpeed.toFixed(1),
      });

      // Skip if no waypoints
      if (waypoints.length === 0) {
        Alert.alert('No data', 'No movement was recorded. Please try again.');
        return;
      }

      // Validate and filter waypoints to prevent crashes
      const validWaypoints = waypoints.filter((wp) => {
        // Check if waypoint has valid coordinates
        if (!wp || typeof wp.latitude !== 'number' || typeof wp.longitude !== 'number') {
          console.warn('Invalid waypoint found:', wp);
          return false;
        }

        // Check for NaN or invalid coordinates
        if (isNaN(wp.latitude) || isNaN(wp.longitude)) {
          console.warn('NaN coordinates found:', wp);
          return false;
        }

        // Check for reasonable coordinate ranges
        if (wp.latitude < -90 || wp.latitude > 90 || wp.longitude < -180 || wp.longitude > 180) {
          console.warn('Out of range coordinates found:', wp);
          return false;
        }

        return true;
      });

      console.log('Valid waypoints count:', validWaypoints.length);

      if (validWaypoints.length === 0) {
        Alert.alert('Invalid data', 'No valid waypoints found. Please try recording again.');
        return;
      }

      // Limit waypoints to prevent memory issues (max 100 waypoints)
      const limitedWaypoints = validWaypoints.slice(0, 100);
      if (limitedWaypoints.length < validWaypoints.length) {
        console.warn(
          `Limited waypoints from ${validWaypoints.length} to ${limitedWaypoints.length} for performance`,
        );
      }

      // Create route data object using validated waypoints
      const routeData = {
        waypoints: limitedWaypoints.map((wp) => ({
          latitude: wp.latitude,
          longitude: wp.longitude,
          timestamp: wp.timestamp,
        })),
        distance: distance.toFixed(2),
        duration: drivingTime,
        totalDuration: totalElapsedTime,
        avgSpeed: averageSpeed.toFixed(1),
        maxSpeed: maxSpeed.toFixed(1),
      };

      // Prepare waypoints data for CreateRouteScreen using validated waypoints
      const waypointsForRouteCreation = limitedWaypoints.map((wp, index) => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
        title: `Waypoint ${index + 1}`,
        description: `Recorded at ${new Date(wp.timestamp).toLocaleTimeString()}`,
      }));

      const routeName = `Recorded Route ${new Date().toLocaleDateString()}`;
      const routeDescription = `Recorded drive - Distance: ${routeData.distance} km, Duration: ${formatTime(routeData.totalDuration)}, Driving Time: ${formatTime(routeData.duration)}, Max Speed: ${routeData.maxSpeed} km/h, Avg Speed: ${routeData.avgSpeed} km/h`;

      // Get coordinates for first waypoint for search input using validated waypoints
      const firstWaypoint = limitedWaypoints[0];
      const lastWaypoint = limitedWaypoints[limitedWaypoints.length - 1];
      let searchCoordinates = '';

      if (firstWaypoint) {
        searchCoordinates = `${firstWaypoint.latitude.toFixed(6)}, ${firstWaypoint.longitude.toFixed(6)}`;
      }

      // Create route path for map display using validated waypoints
      const routePath = limitedWaypoints.map((wp) => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
      }));

      const recordedRouteData: RecordedRouteData = {
        waypoints: waypointsForRouteCreation,
        name: routeName,
        description: routeDescription,
        searchCoordinates: searchCoordinates,
        routePath: routePath,
        startPoint: firstWaypoint
          ? {
              latitude: firstWaypoint.latitude,
              longitude: firstWaypoint.longitude,
            }
          : undefined,
        endPoint: lastWaypoint
          ? {
              latitude: lastWaypoint.latitude,
              longitude: lastWaypoint.longitude,
            }
          : undefined,
      };

      // Save the recordedRouteData for the callback to use
      const savedData = { ...recordedRouteData };

      console.log('💾 ==================== FINAL ROUTE DATA ====================');
      console.log('💾 Complete Route Object:', JSON.stringify(savedData, null, 2));
      console.log('💾 Route Data Summary:', {
        waypointsCount: savedData.waypoints.length,
        routePathCount: savedData.routePath.length,
        hasStartPoint: !!savedData.startPoint,
        hasEndPoint: !!savedData.endPoint,
        name: savedData.name,
        description: savedData.description.substring(0, 100) + '...',
        searchCoordinates: savedData.searchCoordinates,
        firstWaypoint: savedData.waypoints[0],
        lastWaypoint: savedData.waypoints[savedData.waypoints.length - 1],
      });

      // Call the callback immediately to pass data to CreateRouteScreen
      console.log('💾 ==================== CALLBACK PROCESS ====================');
      console.log('💾 onCreateRoute callback exists:', !!onCreateRoute);

      if (onCreateRoute) {
        try {
          console.log('💾 CALLING onCreateRoute with data...');
          console.log('💾 Data being sent:', {
            dataType: typeof savedData,
            hasWaypoints: !!savedData.waypoints,
            waypointCount: savedData.waypoints?.length,
            hasName: !!savedData.name,
            hasDescription: !!savedData.description,
          });

          onCreateRoute(savedData);
          console.log('💾 ✅ onCreateRoute callback completed successfully');

          // Close the modal after successful callback
          try {
            console.log('💾 Closing modal...');
            hideModal();
            console.log('💾 ✅ Modal closed successfully');
          } catch (error) {
            console.error('💾 ❌ Error closing modal:', error);
          }
        } catch (error) {
          console.error('💾 ❌ Error in onCreateRoute callback:', error);
          console.error('💾 Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack',
          });
          Alert.alert('Error', 'Failed to open route creation. Please try again.');
        }
      } else {
        console.error('💾 ❌ RecordDrivingSheet: onCreateRoute callback is not defined!');
        // Close modal anyway if no callback
        try {
          hideModal();
        } catch (error) {
          console.error('💾 ❌ Error closing modal:', error);
        }
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save the recording. Please try again.');
    }
  }, [
    waypoints,
    distance,
    drivingTime,
    totalElapsedTime,
    averageSpeed,
    maxSpeed,
    formatTime,
    hideModal,
    onCreateRoute,
  ]);

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
        setTotalElapsedTime(0);
        setDrivingTime(0);
        setDistance(0);
        setCurrentSpeed(0);
        setMaxSpeed(0);
        setAverageSpeed(0);
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

  // Minimize/Maximize handlers
  const handleMinimize = () => {
    setIsMinimized(true);
    // Allow touches to pass through when minimized
    setModalPointerEvents('box-none');
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    // Block touches when maximized (normal modal behavior)
    setModalPointerEvents('auto');
  };

  // Render floating widget as direct positioned element when minimized
  const renderFloatingWidget = () => {
    if (!isMinimized || !isRecording) return null;

    return (
      <View style={styles.floatingWidgetContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[
            styles.floatingWidgetExpanded,
            { backgroundColor: isPaused ? 'rgba(255, 149, 0, 0.95)' : 'rgba(255, 59, 48, 0.95)' },
          ]}
          onPress={() => {
            console.log('🎬 MAXIMIZE BUTTON PRESSED');
            handleMaximize();
          }}
          activeOpacity={0.8}
        >
          {/* Header row with REC/PAUSED and time */}
          <View style={styles.floatingHeader}>
            <View style={styles.floatingHeaderLeft}>
              <View style={[styles.recordingDot, isPaused ? styles.pausedDot : styles.activeDot]} />
              <Text style={styles.floatingStatusText}>{isPaused ? 'PAUSED' : 'REC'}</Text>
              <Text style={styles.floatingTimeText}>{formatTime(totalElapsedTime)}</Text>
            </View>

            {/* Controls in header */}
            <View style={styles.floatingControls} pointerEvents="auto">
              <TouchableOpacity
                style={[styles.floatingControlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={isPaused ? resumeRecording : pauseRecording}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name={isPaused ? 'play' : 'pause'} size={14} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.floatingControlButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={() => {
                  console.log('🎬 STOP BUTTON PRESSED IN MINIMIZED MODE - Maximizing first');
                  handleMaximize();
                  setTimeout(() => stopRecording(), 100);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="square" size={14} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.floatingStats}>
            <Text style={styles.floatingStatsText}>
              📍 {distance.toFixed(2)} km • 🚗 {formatSpeed(currentSpeed)} km/h
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Check for recovery data on mount
  useEffect(() => {
    checkForRecoveryData();
  }, [checkForRecoveryData]);

  // Set up auto-save timer when recording starts
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Start auto-save timer
      autoSaveTimerRef.current = setInterval(() => {
        autoSaveSession();
      }, AUTO_SAVE_INTERVAL);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
      };
    } else {
      // Clear auto-save timer when not recording
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
  }, [isRecording, isPaused, autoSaveSession]);

  // Handle app state changes for emergency saves
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appState.current, '->', nextAppState);
      
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - emergency save
        console.log('📱 App going to background, triggering emergency save');
        saveAsDraftEmergency();
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [saveAsDraftEmergency]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear timers
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Emergency save if recording
      if (isRecording && wayPointsRef.current.length > 0) {
        console.log('🚨 Component unmounting during recording - emergency save');
        saveAsDraftEmergency();
      }
    };
  }, [isRecording, saveAsDraftEmergency]);

  // Optimize render to be more performant
  return (
    <>
      {/* Main sheet - always render but hide when minimized */}
      {!isMinimized && (
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
              <XStack gap={8} alignItems="center">
                {/* Always show minimize button when recording - Debug added */}
                {isRecording && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🎬 MINIMIZE BUTTON PRESSED');
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
                <TouchableOpacity onPress={cancelRecording} disabled={false}>
                  <Feather name="x" size={24} color={DARK_THEME.text} />
                </TouchableOpacity>
              </XStack>
            </View>

            {/* Map Toggle Button - Show during recording or if we have waypoints to preview */}
            {(isRecording || waypoints.length > 0) && (
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

            {/* Recovery Prompt */}
            {showRecoveryPrompt && (
              <View style={styles.recoveryPrompt}>
                <YStack gap="$3" padding="$4" backgroundColor={DARK_THEME.cardBackground} borderRadius={12}>
                  <XStack alignItems="center" gap="$2">
                    <Feather name="alert-circle" size={20} color="#FF9500" />
                    <Text color={DARK_THEME.text} fontSize={16} fontWeight="600">
                      Recording Recovery
                    </Text>
                  </XStack>
                  
                  <Text color={DARK_THEME.secondaryText} fontSize={14}>
                    Found an incomplete recording session. Would you like to restore it?
                  </Text>
                  
                  <XStack gap="$3" justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onPress={clearRecoveryData}
                      backgroundColor="$gray5"
                    >
                      <Text color="$gray11">Discard</Text>
                    </Button>
                    <Button
                      variant="outlined"
                      onPress={restoreFromRecovery}
                      backgroundColor="#FF9500"
                    >
                      <Text color="white" fontWeight="600">Restore</Text>
                    </Button>
                  </XStack>
                </YStack>
              </View>
            )}

            {/* Enhanced Map Preview with Live Updates */}
            {showMap && (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={
                    waypoints.length > 0
                      ? {
                          latitude: waypoints[waypoints.length - 1].latitude,
                          longitude: waypoints[waypoints.length - 1].longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }
                      : {
                          latitude: 37.7749,
                          longitude: -122.4194,
                          latitudeDelta: 0.1,
                          longitudeDelta: 0.1,
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
                      strokeColor={isPaused ? '#FF9500' : '#69e3c4'}
                      lineJoin="round"
                      lineCap="round"
                    />
                  )}

                  {/* Start and End Markers */}
                  {waypoints.length > 0 && (
                    <Marker
                      coordinate={{
                        latitude: waypoints[0].latitude,
                        longitude: waypoints[0].longitude,
                      }}
                      title="Start"
                      description="Recording started here"
                      pinColor="green"
                    />
                  )}

                  {waypoints.length > 1 && (
                    <Marker
                      coordinate={{
                        latitude: waypoints[waypoints.length - 1].latitude,
                        longitude: waypoints[waypoints.length - 1].longitude,
                      }}
                      title="Current Position"
                      description="Live recording position"
                      pinColor="red"
                    />
                  )}
                </MapView>

                {/* Enhanced Recording Indicator */}
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View
                      style={[styles.recordingDot, isPaused ? styles.pausedDot : styles.activeDot]}
                    />
                    <Text style={styles.recordingText}>
                      {isPaused ? 'PAUSED' : 'LIVE RECORDING'}
                    </Text>
                    <Text style={styles.recordingSubtext}>
                      {waypoints.length} points • {distance.toFixed(2)}km
                    </Text>
                  </View>
                )}

                {/* Map Stats Overlay */}
                {!isRecording && waypoints.length > 0 && (
                  <View style={styles.mapStatsOverlay}>
                    <Text style={styles.mapStatsText}>
                      Route Preview • {waypoints.length} waypoints
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Recording Status Display (always shown when recording) */}
            {isRecording && !showMap && (
              <View
                style={[
                  styles.recordingStatusContainer,
                  { backgroundColor: DARK_THEME.cardBackground },
                ]}
              >
                <View style={styles.recordingStatusInner}>
                  <View
                    style={[styles.recordingDot, isPaused ? styles.pausedDot : styles.activeDot]}
                  />
                  <Text color={DARK_THEME.text} fontSize={16} fontWeight="bold" marginLeft={8}>
                    {isPaused ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
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
              {/* Enhanced Stats display */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
                    DURATION
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
                    {formatTime(totalElapsedTime)}
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                    Driving: {formatTime(drivingTime)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
                    DISTANCE
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
                    {distance.toFixed(2)} km
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                    {waypoints.length} waypoints
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
                    SPEED
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
                    {formatSpeed(currentSpeed)} km/h
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                    Max: {formatSpeed(maxSpeed)} km/h
                  </Text>
                  <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                    Avg: {formatSpeed(averageSpeed)} km/h
                  </Text>
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
                      style={[styles.recordButton, { backgroundColor: '#1A3D3D' }]}
                      onPress={startRecording}
                    >
                      <Feather name="play" size={32} color="white" />
                    </TouchableOpacity>
                  )}
                  <Text color={DARK_THEME.text} marginTop={8}>
                    {isRecording
                      ? isPaused
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
                    {waypoints.length > 0
                      ? `Your route has been recorded successfully with ${waypoints.length} waypoints. You can now create a route, continue recording, or start over.`
                      : 'No movement was recorded. You can try recording again.'}
                  </Text>

                  {waypoints.length > 0 && (
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
                        console.log('🔄 CONTINUE RECORDING');
                        setShowSummary(false);
                        setIsRecording(true);
                        setIsPaused(false);
                        startLocationTracking();
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
                        console.log('🔄 RESTART RECORDING');
                        setShowSummary(false);
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
      )}

      {/* Floating widget overlay - always render when minimized */}
      {renderFloatingWidget()}
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
      console.log('RecordDrivingModal: onCreateRoute called with data', {
        waypointsCount: routeData?.waypoints?.length || 0,
        name: routeData?.name,
        description: routeData?.description,
      });

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
        console.log('RecordDrivingModal: Calling parent onCreateRoute');
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
