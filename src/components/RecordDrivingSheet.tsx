import React, { useState, useEffect, useRef } from 'react';
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

// Improve speed sensitivity for walking or slow movement
const MIN_DISTANCE_FILTER = 2; // meters, reduced from 5 to better capture walking movements
const MIN_TIME_FILTER = 1000; // milliseconds, reduced from 2000 to update more frequently
const MIN_SPEED_THRESHOLD = 0.05; // km/h, lowered to detect very slow movement

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

// Simplified component with recording functionality
export const RecordDrivingSheet = (props: RecordDrivingSheetProps) => {
  const { isVisible, onClose, onCreateRoute } = props;
  const { t } = useTranslation();
  const { hideModal } = useModal();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [waypoints, setWaypoints] = useState<RecordedWaypoint[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [deviceData, setDeviceData] = useState(defaultDeviceData);
  const [showSummary, setShowSummary] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const waypointThrottleRef = useRef<number>(0);
  const motionSubscriptionsRef = useRef<any>({});
  
  // Add new state for debug info
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // Add map state
  const [initialRegion, setInitialRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Clear logs when starting a new recording
  useEffect(() => {
    if (!isRecording) {
      movementLogs = [];
    }
  }, [isRecording]);
  
  // Set up background waypoint collection
  useEffect(() => {
    // Create a global function to collect background waypoints
    (global as any).addBackgroundWaypoint = (waypoint: RecordedWaypoint) => {
      if (isRecording && !isPaused) {
        setWaypoints(prev => {
          // Only add waypoint if we have moved a significant distance
          if (prev.length > 0) {
            const lastWaypoint = prev[prev.length - 1];
            const dist = calculateDistance(
              lastWaypoint.latitude,
              lastWaypoint.longitude,
              waypoint.latitude,
              waypoint.longitude
            ) * 1000; // convert to meters
            
            // Skip if too close to last point
            if (dist < MIN_DISTANCE_FILTER) {
              return prev;
            }
          }
          
          // Add the new waypoint
          const updatedWaypoints = [...prev, waypoint];
          
          // Update distance
          if (prev.length > 0) {
            const lastWaypoint = prev[prev.length - 1];
            const segmentDistance = calculateDistance(
              lastWaypoint.latitude,
              lastWaypoint.longitude,
              waypoint.latitude,
              waypoint.longitude
            );
            setDistance(prevDistance => prevDistance + segmentDistance);
          }
          
          // Update speed
          if (waypoint.speed !== null) {
            setCurrentSpeed(waypoint.speed * 3.6); // Convert m/s to km/h
          }
          
          return updatedWaypoints;
        });
      }
    };
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      delete (global as any).addBackgroundWaypoint;
    };
  }, [isRecording, isPaused]);
  
  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (isRecording && !isPaused && appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App is going to background while recording
      console.log('App going to background while recording');
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App is coming to foreground
      console.log('App coming to foreground');
    }
    
    appState.current = nextAppState;
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopBackgroundLocationTask();
    };
  }, [locationSubscription]);
  
  // Helper for starting background location task
  const startBackgroundLocationTask = async () => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status === 'granted') {
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: MIN_TIME_FILTER,
        distanceInterval: MIN_DISTANCE_FILTER,
        foregroundService: {
          notificationTitle: "Recording Route",
          notificationBody: "Your route is being recorded in the background",
        },
        // Make sure we get speed and accuracy
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
      });
      console.log('Started background location tracking');
    } else {
      console.log('Background location permission denied');
    }
  };
  
  // Helper for stopping background location task
  const stopBackgroundLocationTask = async () => {
    if (await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      console.log('Stopped background location tracking');
    }
  };
  
  if (!isVisible) return null;
  
  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Add this to the top of startRecording function to gather device data
  const gatherDeviceData = async () => {
    try {
      // Attempt to gather device info if available
      let deviceInfo = {
        brand: Platform.OS,
        manufacturer: 'Unknown',
        modelName: 'Unknown',
        deviceName: 'Unknown Device',
        deviceType: 'Unknown',
        osName: Platform.OS,
        osVersion: String(Platform.Version),
        totalMemory: 0,
      };
      
      // Attempt to gather battery info if available
      let batteryInfo = {
        level: 1,
        state: 'unknown',
        isLowPowerMode: false
      };
      
      // Attempt to gather network info if available
      let networkInfo = {
        type: 'unknown',
        isConnected: true,
        details: null
      };
      
      try {
        const DeviceModule = require('expo-device');
        if (DeviceModule) {
          deviceInfo = {
            brand: DeviceModule.brand || Platform.OS,
            manufacturer: DeviceModule.manufacturer || 'Unknown',
            modelName: DeviceModule.modelName || 'Unknown',
            deviceName: await DeviceModule.getDeviceNameAsync() || 'Unknown Device',
            deviceType: DeviceModule.deviceType || 'Unknown',
            osName: DeviceModule.osName || Platform.OS,
            osVersion: DeviceModule.osVersion || String(Platform.Version),
            totalMemory: DeviceModule.totalMemory || 0,
          };
        }
      } catch (e) {
        console.log('expo-device not available for device info');
      }
      
      try {
        const BatteryModule = require('expo-battery');
        if (BatteryModule) {
          const batteryLevel = await BatteryModule.getBatteryLevelAsync();
          const batteryState = await BatteryModule.getBatteryStateAsync();
          const isLowPowerMode = await BatteryModule.isLowPowerModeEnabledAsync();
          
          batteryInfo = {
            level: batteryLevel,
            state: batteryState,
            isLowPowerMode
          };
        }
      } catch (e) {
        console.log('expo-battery not available for battery info');
      }
      
      try {
        const NetInfoModule = require('@react-native-community/netinfo');
        if (NetInfoModule?.fetch) {
          const netInfo = await NetInfoModule.fetch();
          
          networkInfo = {
            type: netInfo.type,
            isConnected: netInfo.isConnected,
            details: netInfo.details
          };
        }
      } catch (e) {
        console.log('@react-native-community/netinfo not available');
      }
      
      // Update device data state
      setDeviceData({
        deviceInfo,
        battery: batteryInfo,
        network: networkInfo,
        motion: deviceData.motion
      });
      
      console.log('Device data gathered:', {
        device: deviceInfo,
        battery: batteryInfo,
        network: networkInfo
      });
    } catch (error) {
      console.error('Error gathering device data:', error);
    }
  };

  // Start recording location
  const startRecording = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      // Reset state
      setWaypoints([]);
      setElapsedTime(0);
      setDistance(0);
      setAverageSpeed(0);
      setCurrentSpeed(0);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // Start timer
      timerRef.current = setInterval(() => {
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
      }, 1000) as unknown as NodeJS.Timeout;

      // Set recording state
      setIsRecording(true);
      setIsPaused(false);

      // Start location tracking
      await startLocationTracking();

      // Call gatherDeviceData in startRecording
      gatherDeviceData();

      // Add this to startRecording to set up motion sensors
      setupMotionSensors();
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (isRecording && !isPaused) {
      setIsPaused(true);
      pausedTimeRef.current = Date.now() - (startTimeRef.current || 0) - (pausedTimeRef.current || 0);
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (isRecording && isPaused) {
      setIsPaused(false);
    }
  };

  // Stop recording location
  const stopRecording = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop background location tracking
    stopBackgroundLocationTask();
    
    setIsRecording(false);
    setIsPaused(false);
    
    // Always show summary regardless of waypoint count
    setShowSummary(true);

    // Clean up motion sensors in stopRecording
    cleanupMotionSensors();
  };

  // Format time display (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Navigate to route creation with recorded data
  const saveRecording = () => {
    console.log('RecordDrivingSheet: saveRecording called');
    
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

    console.log('RecordDrivingSheet: Created route data object', {
      waypointsCount: waypoints.length,
      distance: routeData.distance,
      duration: elapsedTime
    });

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

    console.log('RecordDrivingSheet: Prepared recordedRouteData for CreateRouteScreen', {
      waypointsCount: waypointsForRouteCreation.length,
      name: routeName,
      description: routeDescription.substring(0, 50) + '...'
    });

    // Save the recordedRouteData for the callback to use
    const savedData = {...recordedRouteData};
    
            // First close the modal
            hideModal();
            console.log('RecordDrivingSheet: Modal closed');
            
    // Call the callback with a timeout to ensure modal is closed first
            if (onCreateRoute) {
      console.log('RecordDrivingSheet: Scheduling onCreateRoute call with timeout');
              setTimeout(() => {
        console.log('RecordDrivingSheet: Calling onCreateRoute after timeout');
        onCreateRoute(savedData);
      }, 100);
            } else {
              console.log('RecordDrivingSheet: ERROR! onCreateRoute callback is NOT defined!');
            }
  };
  
  // Cancel recording session
  const cancelRecording = () => {
    if (isRecording) {
              if (locationSubscription) {
                locationSubscription.remove();
                setLocationSubscription(null);
              }
              
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
      
      // Stop background location tracking
      stopBackgroundLocationTask();
              
              setIsRecording(false);
      setIsPaused(false);
              setShowSummary(false);
              setWaypoints([]);
              setElapsedTime(0);
              setDistance(0);
              setAverageSpeed(0);
      setCurrentSpeed(0);
    } else {
      onClose();
    }
  };
  
  // Handler for clicking outside the sheet
  const handleOutsidePress = () => {
    if (isRecording) {
      // If recording, don't close on outside press
      return;
    } else {
      onClose();
    }
  };
  
  // Continue recording after summary screen
  const continueRecording = () => {
    // Hide summary and restart recording
    setShowSummary(false);
    setIsRecording(true);
    setIsPaused(false);
    
    // Resume timer
              if (timerRef.current) {
                clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
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
    }, 1000) as unknown as NodeJS.Timeout;
    
    // Restart location tracking
    startLocationTracking();
  };
  
  // Helper function to start location tracking
  const startLocationTracking = async () => {
    try {
      // First check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable location services to record your route.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Verify permission is granted
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permission Required",
          "Location permission is needed to record your route.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Set up error handling for watch position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: MIN_TIME_FILTER,
          distanceInterval: MIN_DISTANCE_FILTER/2,
        },
        (location) => {
          try {
            const now = Date.now();
            
            // Validate location data before processing
            if (!location || !location.coords) {
              console.warn('Received invalid location data');
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
            
            if (waypoints.length > 0) {
              const lastWaypoint = waypoints[waypoints.length - 1];
              distanceFromLast = calculateDistance(
                lastWaypoint.latitude,
                lastWaypoint.longitude,
                newWaypoint.latitude,
                newWaypoint.longitude
              ) * 1000; // Convert to meters
              
              // Skip if too close to last point (but still log it)
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
            
            // Log this movement for debugging - limit frequency to reduce memory pressure
            if (showDebug) {
              const log = {
                timestamp: now,
                latitude: newWaypoint.latitude,
                longitude: newWaypoint.longitude,
                speed: location.coords.speed !== null ? location.coords.speed * 3.6 : null,
                distance: distanceFromLast,
                accepted: shouldAddWaypoint && !isPaused
              };
              
              movementLogs.push(log);
              
              // Keep the logs array to a reasonable size
              if (movementLogs.length > 50) { // Reduced from 100 to 50
                movementLogs = movementLogs.slice(-50);
              }
              
              // Only update debug logs every 3 seconds to reduce UI updates
              if (now % 3000 < 100) {
                const logString = `${new Date(now).toLocaleTimeString()}: ${distanceFromLast.toFixed(2)}m ${currentSpeedKmh.toFixed(2)}km/h ${shouldAddWaypoint ? 'SAVED' : 'skipped'}`;
                setDebugLogs(prev => {
                  const newLogs = [...prev, logString];
                  return newLogs.slice(-7); // Reduced from 10 to 7 logs
                });
              }
            }
            
            waypointThrottleRef.current = now;
            
            if (!isPaused && shouldAddWaypoint) {
              setWaypoints(prevWaypoints => {
                // Safety check for immutability
                if (!prevWaypoints) return [newWaypoint];
                
                const updatedWaypoints = [...prevWaypoints, newWaypoint];
                
                // Calculate total distance
                if (prevWaypoints.length > 0) {
                  const lastWaypoint = prevWaypoints[prevWaypoints.length - 1];
                  const segmentDistance = calculateDistance(
                    lastWaypoint.latitude,
                    lastWaypoint.longitude,
                    newWaypoint.latitude,
                    newWaypoint.longitude
                  );
                  setDistance(prevDistance => prevDistance + segmentDistance);
                }

                return updatedWaypoints;
              });
            }
          } catch (error) {
            console.error('Error processing location update:', error);
            // Continue tracking despite errors in a single update
          }
        }
      );

      setLocationSubscription(subscription);
      
      // Try to restart background tracking
      try {
        await startBackgroundLocationTask();
      } catch (err) {
        console.warn('Failed to restart background tracking:', err);
        // Continue without background tracking if it fails
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert(
        "Error Starting Recording",
        "There was a problem starting the location tracking. Please try again.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Setup motion sensors function with optional imports
  const setupMotionSensors = () => {
    try {
      const SensorsModule = require('expo-sensors');
      if (SensorsModule) {
        // Accelerometer
        if (SensorsModule.Accelerometer) {
          SensorsModule.Accelerometer.setUpdateInterval(1000);
          const accelerometerSubscription = SensorsModule.Accelerometer.addListener((data: { x: number, y: number, z: number }) => {
            setDeviceData(prev => ({
              ...prev,
              motion: {
                ...prev.motion,
                accelerometer: data
              }
            }));
          });
          
          // Gyroscope
          let gyroscopeSubscription = { remove: () => {} };
          if (SensorsModule.Gyroscope) {
            SensorsModule.Gyroscope.setUpdateInterval(1000);
            gyroscopeSubscription = SensorsModule.Gyroscope.addListener((data: { x: number, y: number, z: number }) => {
              setDeviceData(prev => ({
                ...prev,
                motion: {
                  ...prev.motion,
                  gyroscope: data
                }
              }));
            });
          }
          
          // Magnetometer
          let magnetometerSubscription = { remove: () => {} };
          if (SensorsModule.Magnetometer) {
            SensorsModule.Magnetometer.setUpdateInterval(1000);
            magnetometerSubscription = SensorsModule.Magnetometer.addListener((data: { x: number, y: number, z: number }) => {
              setDeviceData(prev => ({
                ...prev,
                motion: {
                  ...prev.motion,
                  magnetometer: data
                }
              }));
            });
          }
          
          // Store subscriptions for cleanup
          motionSubscriptionsRef.current = {
            accelerometer: accelerometerSubscription,
            gyroscope: gyroscopeSubscription,
            magnetometer: magnetometerSubscription
          };
        }
      }
    } catch (e) {
      console.log('expo-sensors not available');
      // Set empty cleanup functions
      motionSubscriptionsRef.current = {
        accelerometer: { remove: () => {} },
        gyroscope: { remove: () => {} },
        magnetometer: { remove: () => {} }
      };
    }
  };

  // Clean up motion sensors with safe checks
  const cleanupMotionSensors = () => {
    const subs = motionSubscriptionsRef.current;
    if (subs) {
      if (subs.accelerometer && subs.accelerometer.remove) subs.accelerometer.remove();
      if (subs.gyroscope && subs.gyroscope.remove) subs.gyroscope.remove();
      if (subs.magnetometer && subs.magnetometer.remove) subs.magnetometer.remove();
    }
  };
  
  // Format waypoints for map display with safety checks
  const getRoutePath = () => {
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
      console.error('Error formatting route path:', error);
      return [];
    }
  };

  // Get current location for initial map position with better error handling
  useEffect(() => {
    let isMounted = true;
    
    if (isVisible && !initialRegion) {
      const getCurrentLocation = async () => {
        try {
          // Check if location services are enabled first
          const serviceEnabled = await Location.hasServicesEnabledAsync();
          if (!serviceEnabled) {
            console.warn('Location services are not enabled');
            return;
          }
          
          // Request permissions with proper handling
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Location permission not granted');
            return;
          }
          
          // Use a timeout to prevent hanging
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          
          // Set a timeout of 10 seconds
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Location request timed out')), 10000);
          });
          
          // Use Promise.race to handle timeout
          const location = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
          
          if (isMounted && location && location.coords) {
            setInitialRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01
            });
            
            setMapReady(true);
            setMapError(null);
          }
        } catch (error) {
          console.error('Error getting current location:', error);
          
          if (isMounted) {
            // Set a default region to prevent crashes
            setInitialRegion({
              latitude: 37.7749, // Default to San Francisco as fallback
              longitude: -122.4194,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1
            });
            
            setMapError(error instanceof Error ? error.message : 'Location error');
            setMapReady(true); // Still mark as ready so UI can render
          }
        }
      };
      
      getCurrentLocation();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isVisible]);
  
  // Center map on current position when recording with safety checks
  useEffect(() => {
    if (waypoints.length > 0 && mapReady) {
      try {
        const lastWaypoint = waypoints[waypoints.length - 1];
        
        // Verify coordinates are valid before updating
        if (lastWaypoint && 
            typeof lastWaypoint.latitude === 'number' && 
            typeof lastWaypoint.longitude === 'number' &&
            !isNaN(lastWaypoint.latitude) && 
            !isNaN(lastWaypoint.longitude)) {
          
          setInitialRegion(prev => {
            // Keep previous deltas if they exist
            const latDelta = prev?.latitudeDelta || 0.005;
            const lngDelta = prev?.longitudeDelta || 0.005;
            
            return {
              latitude: lastWaypoint.latitude,
              longitude: lastWaypoint.longitude,
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta
            };
          });
        }
      } catch (error) {
        console.error('Error updating map region:', error);
        // Don't update region on error to avoid crashes
      }
    }
  }, [waypoints, mapReady]);
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleOutsidePress}
      />
      <View style={[styles.sheet, { backgroundColor: DARK_THEME.background }]}>
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
          <Text fontWeight="600" fontSize={24} color={DARK_THEME.text}>
            {t('map.recordDriving') || 'Record Driving'}
          </Text>
          <TouchableOpacity onPress={cancelRecording} disabled={false}>
            <Feather name="x" size={24} color={DARK_THEME.text} />
          </TouchableOpacity>
        </View>
        
        {/* Live Map with Error Handling */}
        <View style={styles.mapContainer}>
          {mapError ? (
            <View style={[styles.mapErrorContainer, { backgroundColor: DARK_THEME.cardBackground }]}>
              <Feather name="map-off" size={24} color="#FF9500" />
              <Text color={DARK_THEME.text} textAlign="center" marginTop={8}>
                Map unavailable. Recording will still work.
              </Text>
            </View>
          ) : initialRegion ? (
            <Map 
              waypoints={[]}
              region={initialRegion}
              style={styles.map}
              routePath={getRoutePath()}
              routePathColor={isPaused ? "#FF9500" : "#00E6C3"}
              routePathWidth={4}
            />
          ) : (
            <View style={[styles.mapErrorContainer, { backgroundColor: DARK_THEME.cardBackground }]}>
              <Feather name="loader" size={24} color={DARK_THEME.text} />
              <Text color={DARK_THEME.text} textAlign="center" marginTop={8}>
                Loading map...
              </Text>
            </View>
          )}
          
          {waypoints.length > 0 && !mapError && initialRegion && (
            <View style={styles.mapOverlay}>
              <TouchableOpacity 
                style={styles.centerButton}
                onPress={() => {
                  try {
                    if (waypoints.length > 0) {
                      const lastWaypoint = waypoints[waypoints.length - 1];
                      setInitialRegion({
                        latitude: lastWaypoint.latitude,
                        longitude: lastWaypoint.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005
                      });
                    }
                  } catch (error) {
                    console.error('Error centering map:', error);
                  }
                }}
              >
                <Feather name="crosshair" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
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
                onPress={continueRecording}
                marginBottom={8}
                >
                <XStack gap="$2" alignItems="center">
                  <Feather name="play" size={18} color="white" />
                  <Text color="white">Continue Recording</Text>
              </XStack>
              </Button>
              
              <Button
                backgroundColor={DARK_THEME.borderColor}
                color="white"
                onPress={cancelRecording}
                variant="outlined"
              >
                <Text color={DARK_THEME.secondaryText}>Dismiss</Text>
              </Button>
            </YStack>
          )}
          
          {/* Waypoints Display - for debugging */}
          {waypoints.length > 0 && (
            <YStack>
              <Text color={DARK_THEME.text} fontWeight="600" marginBottom={4}>
                Recorded Waypoints: {waypoints.length}
              </Text>
              <View style={[styles.waypointContainer, { backgroundColor: DARK_THEME.cardBackground }]}>
                {waypoints.slice(-5).map((wp, idx) => (
                  <Text key={idx} style={styles.waypointText} color={DARK_THEME.text}>
                    {`${idx + Math.max(0, waypoints.length - 5)}: ${wp.latitude.toFixed(6)}, ${wp.longitude.toFixed(6)}${wp.speed !== null ? ` • ${(wp.speed * 3.6).toFixed(1)} km/h` : ''}`}
                  </Text>
                ))}
              </View>
            </YStack>
          )}
          
          {/* Device Data Debug Section */}
          {isRecording && (
            <YStack>
              <Text color={DARK_THEME.text} fontWeight="600" marginBottom={4}>
                Device Data:
              </Text>
              <View style={[styles.waypointContainer, { backgroundColor: DARK_THEME.cardBackground }]}>
                <Text style={styles.waypointText} color={DARK_THEME.text}>
                  Device: {deviceData.deviceInfo?.modelName || 'Unknown'}
                </Text>
                <Text style={styles.waypointText} color={DARK_THEME.text}>
                  Battery: {deviceData.battery?.level ? Math.round(deviceData.battery.level * 100) + '%' : 'Unknown'}
                </Text>
                <Text style={styles.waypointText} color={DARK_THEME.text}>
                  Network: {deviceData.network?.type || 'Unknown'}
                </Text>
                {deviceData.motion.accelerometer && (
                  <Text style={styles.waypointText} color={DARK_THEME.text}>
                    Accelerometer: x={deviceData.motion.accelerometer.x.toFixed(2)}, 
                    y={deviceData.motion.accelerometer.y.toFixed(2)}, 
                    z={deviceData.motion.accelerometer.z.toFixed(2)}
                  </Text>
                )}
                {deviceData.motion.gyroscope && (
                  <Text style={styles.waypointText} color={DARK_THEME.text}>
                    Gyroscope: x={deviceData.motion.gyroscope.x.toFixed(2)}, 
                    y={deviceData.motion.gyroscope.y.toFixed(2)}, 
                    z={deviceData.motion.gyroscope.z.toFixed(2)}
                  </Text>
                )}
              </View>
            </YStack>
          )}
          
          {/* Movement Debug Logs */}
          {showDebug && (
            <YStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={DARK_THEME.text} fontWeight="600" marginBottom={4}>
                  Movement Debug ({waypoints.length} waypoints):
                </Text>
                <TouchableOpacity onPress={() => setShowDebug(!showDebug)}>
                  <Text color={DARK_THEME.text} opacity={0.7}>Hide</Text>
                </TouchableOpacity>
              </XStack>
              <View style={[styles.waypointContainer, { backgroundColor: DARK_THEME.cardBackground, maxHeight: 200 }]}>
                {debugLogs.length > 0 ? (
                  debugLogs.map((log, idx) => (
                    <Text key={idx} style={styles.waypointText} color={DARK_THEME.text}>
                      {log}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.waypointText} color={DARK_THEME.text}>
                    Waiting for movement data...
                  </Text>
                )}
              </View>
            </YStack>
          )}
        </YStack>
      </View>
    </View>
  );
};

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
  // New map styles
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
  mapErrorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 