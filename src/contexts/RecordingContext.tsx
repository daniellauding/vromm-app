import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { EventEmitter } from 'events';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';
import { hideRecordingBanner } from '../utils/notifications';

// Types
export interface RecordedWaypoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  accuracy: number | null;
  distance?: number | null;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isMinimized: boolean;
  waypoints: RecordedWaypoint[];
  totalElapsedTime: number;
  drivingTime: number;
  distance: number;
  currentSpeed: number;
  maxSpeed: number;
  averageSpeed: number;
  recordingStartTime: Date | null;
  pausedTime: number;
  locationSubscription: Location.LocationSubscription | null;
  showSummary: boolean;
  debugMessage: string | null;
  showMap: boolean;
}

interface RecordingContextType {
  // State
  recordingState: RecordingState;
  isRecordingActive: boolean;

  // Actions
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  minimizeRecording: () => void;
  maximizeRecording: () => void;
  saveRecording: (onCreateRoute?: (routeData: any) => void) => void;
  cancelRecording: () => void;

  // State management
  updateRecordingState: (updates: Partial<RecordingState>) => void;
  clearRecordingState: () => void;

  // Recovery
  checkForRecovery: () => Promise<boolean>;
  recoverRecording: () => Promise<void>;
}

const defaultRecordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  isMinimized: false,
  waypoints: [],
  totalElapsedTime: 0,
  drivingTime: 0,
  distance: 0,
  currentSpeed: 0,
  maxSpeed: 0,
  averageSpeed: 0,
  recordingStartTime: null,
  pausedTime: 0,
  locationSubscription: null,
  showSummary: false,
  debugMessage: null,
  showMap: false,
};

const RECORDING_STORAGE_KEY = '@recording_session';
const RECOVERY_CHECK_KEY = '@recording_recovery_check';

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLngRad = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;
  const distanceKm = distanceMeters / 1000;

  return distanceMeters > 1 ? distanceKm : 0;
};

const calculateMaxSpeed = (waypoints: RecordedWaypoint[]) => {
  const speed = waypoints.reduce((acc, waypoint) => {
    return Math.max(acc, waypoint.speed ?? 0);
  }, 0);

  return speed;
};

const calculateWaypointSpeed = (from: RecordedWaypoint, to: RecordedWaypoint) => {
  if (to.speed) {
    return to.speed;
  }

  if (!to.distance) {
    return 0;
  }

  const timeDiff = (to.timestamp - from.timestamp) / 1000;
  if (timeDiff > 0 && to.distance > 0) {
    return to.distance / 1000 / (timeDiff / 3600);
  }

  return 0;
};

// Location tracking task
const LOCATION_TRACKING = 'location-tracking';
const eventEmitter = new EventEmitter();
TaskManager.defineTask(LOCATION_TRACKING, async (event) => {
  console.log('location task', event);
  eventEmitter.emit('location', event);
});

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [recordingState, setRecordingState] = useState<RecordingState>(defaultRecordingState);
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  // Refs for data that doesn't need to trigger renders
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const lastPauseTimeRef = useRef<number | null>(null);
  const waypointThrottleRef = useRef<number>(0);
  const wayPointsRef = useRef<RecordedWaypoint[]>([]);
  const lastErrorRef = useRef<string | null>(null);
  const lastStateUpdateRef = useRef<number>(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<number>(0);

  // Auto-save constants
  const AUTO_SAVE_INTERVAL = 10000; // 10 seconds
  const MIN_DISTANCE_FILTER = 5; // 5 meters
  const MIN_TIME_FILTER = 1000; // 1 second

  // Auto-save current recording session
  const autoSaveSession = useCallback(async () => {
    try {
      if (!recordingState.isRecording || wayPointsRef.current.length === 0) {
        return;
      }

      const now = Date.now();
      if (now - lastAutoSaveRef.current < AUTO_SAVE_INTERVAL) {
        return;
      }

      const sessionData = {
        ...recordingState,
        waypoints: wayPointsRef.current,
        lastSaveTime: now,
        sessionId: `recording_${startTimeRef.current}`,
      };

      await AsyncStorage.setItem(RECORDING_STORAGE_KEY, JSON.stringify(sessionData));
      await AsyncStorage.setItem(RECOVERY_CHECK_KEY, 'true');
      lastAutoSaveRef.current = now;
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }, [recordingState]);

  // Update recording state
  const updateRecordingState = useCallback((updates: Partial<RecordingState>) => {
    setRecordingState((prev) => ({ ...prev, ...updates }));
  }, []);

  const startLocationTracking = useCallback(async () => {
    try {
      const serviceEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
      if (!serviceEnabled) {
        updateRecordingState({ debugMessage: 'Location services disabled' });
        return;
      }

      let status = await Location.getForegroundPermissionsAsync();

      if (!status.granted) {
        const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({
          status: 'error',
        }));

        if (status !== 'granted') {
          updateRecordingState({ debugMessage: 'Location permission denied' });
          return;
        }
      }

      status = await Location.getBackgroundPermissionsAsync();

      if (!status.granted) {
        const { status } = await Location.requestBackgroundPermissionsAsync().catch(() => ({
          status: 'error',
        }));

        if (status !== 'granted') {
          updateRecordingState({ debugMessage: 'Location permission denied' });
          return;
        }
      }

      const locationListener = eventEmitter.addListener(
        'location',
        ({ data: { locations }, error }) => {
          console.log('locations', locations);
          if (error) return;
          if (locations.length === 0) return;

          const location = locations[0];
          if (!location || !location.coords) return;

          try {
            const now = Date.now();
            const newWaypoint: RecordedWaypoint = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
            };

            if (wayPointsRef.current.length > 0) {
              newWaypoint.distance = calculateDistance(
                wayPointsRef.current[wayPointsRef.current.length - 1].latitude,
                wayPointsRef.current[wayPointsRef.current.length - 1].longitude,
                newWaypoint.latitude,
                newWaypoint.longitude,
              );

              newWaypoint.speed = calculateWaypointSpeed(
                wayPointsRef.current[wayPointsRef.current.length - 1],
                newWaypoint,
              );
            }

            const shouldAddWaypoint =
              wayPointsRef.current.length > 0
                ? (newWaypoint?.distance ?? 0 > MIN_DISTANCE_FILTER)
                : true;

            updateRecordingState({
              currentSpeed: Math.max(0, newWaypoint.speed ?? 0),
              maxSpeed: calculateMaxSpeed(wayPointsRef.current),
            });

            if (
              now - waypointThrottleRef.current < MIN_TIME_FILTER &&
              waypointThrottleRef.current !== 0
            ) {
              return;
            }

            waypointThrottleRef.current = now;

            if (!isPausedRef.current && shouldAddWaypoint) {
              wayPointsRef.current = [...wayPointsRef.current, newWaypoint];

              const shouldUpdateState =
                wayPointsRef.current.length % 5 === 0 || now - lastStateUpdateRef.current > 2000;

              if (shouldUpdateState) {
                updateRecordingState({ waypoints: [...wayPointsRef.current] });
                lastStateUpdateRef.current = now;
              }

              if (wayPointsRef.current.length > 1) {
                const distance = wayPointsRef.current.reduce((acc, waypoint) => {
                  return acc + (waypoint.distance ?? 0);
                }, 0);

                updateRecordingState({ distance: distance });
              }
            }
          } catch (error) {
            console.error('Error processing location update:', error);
            lastErrorRef.current = 'Location update error';
          }
        },
      );

      await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        deferredUpdatesInterval: 1000,
        foregroundService: {
          notificationTitle: 'Vromm',
          notificationBody: 'Recording your drive',
          notificationColor: '#1C1C1C',
        },
      });

      const subscription: Location.LocationSubscription = {
        remove: async () => {
          await Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
          await locationListener.remove();
        },
      };

      updateRecordingState({
        locationSubscription: subscription,
      });
    } catch (error) {
      console.error('Error starting location tracking:', error);
      updateRecordingState({ debugMessage: 'Failed to start tracking' });
    }
  }, [updateRecordingState]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Reset all state and refs for clean start
      setRecordingState(defaultRecordingState);
      wayPointsRef.current = [];
      lastStateUpdateRef.current = 0;
      startTimeRef.current = Date.now();
      isPausedRef.current = false;
      lastPauseTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastErrorRef.current = null;

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      updateRecordingState({
        isRecording: true,
        isPaused: false,
        isMinimized: false,
        recordingStartTime: new Date(),
        totalElapsedTime: 0,
        drivingTime: 0,
        distance: 0,
        currentSpeed: 0,
        maxSpeed: 0,
        averageSpeed: 0,
        pausedTime: 0,
        debugMessage: null,
      });

      setIsRecordingActive(true);
      await startLocationTracking();
    } catch (error) {
      console.error('Error starting recording:', error);
      updateRecordingState({ debugMessage: 'Failed to start recording' });
    }
  }, [startLocationTracking, updateRecordingState]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    const pauseTime = Date.now();
    isPausedRef.current = true;
    lastPauseTimeRef.current = pauseTime;
    updateRecordingState({ isPaused: true });
  }, [updateRecordingState]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    hideRecordingBanner();

    if (isPausedRef.current && lastPauseTimeRef.current) {
      const resumeTime = Date.now();
      const pauseDuration = resumeTime - lastPauseTimeRef.current;

      isPausedRef.current = false;
      pausedTimeRef.current = pausedTimeRef.current + pauseDuration;
      lastPauseTimeRef.current = null;

      updateRecordingState({
        isPaused: false,
        pausedTime: recordingState.pausedTime + pauseDuration,
      });
    }
  }, [recordingState.pausedTime, updateRecordingState]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (recordingState.locationSubscription) {
        recordingState.locationSubscription.remove();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      isPausedRef.current = false;
      lastPauseTimeRef.current = null;

      updateRecordingState({
        isRecording: false,
        isPaused: false,
        showSummary: true,
        waypoints: [...wayPointsRef.current],
      });

      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      updateRecordingState({ isRecording: false, showSummary: true });
    }
  }, [recordingState.locationSubscription, updateRecordingState]);

  // Minimize recording
  const minimizeRecording = useCallback(() => {
    updateRecordingState({ isMinimized: true });
  }, [updateRecordingState]);

  // Maximize recording
  const maximizeRecording = useCallback(() => {
    updateRecordingState({ isMinimized: false });
  }, [updateRecordingState]);

  // Clear recording state
  const clearRecordingState = useCallback(() => {
    setRecordingState(defaultRecordingState);
    setIsRecordingActive(false);
    wayPointsRef.current = [];
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    isPausedRef.current = false;
    lastPauseTimeRef.current = null;
    waypointThrottleRef.current = 0;
    lastErrorRef.current = null;
    lastStateUpdateRef.current = 0;

    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Clear storage
    AsyncStorage.multiRemove([RECORDING_STORAGE_KEY, RECOVERY_CHECK_KEY]).catch(() => {});
  }, []);

  // Save recording
  const saveRecording = useCallback(
    (onCreateRoute?: (routeData: any) => void) => {
      try {
        if (wayPointsRef.current.length === 0) {
          console.warn('No waypoints to save');
          return;
        }

        const validWaypoints = wayPointsRef.current.filter((wp) => {
          return (
            wp &&
            typeof wp.latitude === 'number' &&
            typeof wp.longitude === 'number' &&
            !isNaN(wp.latitude) &&
            !isNaN(wp.longitude) &&
            wp.latitude >= -90 &&
            wp.latitude <= 90 &&
            wp.longitude >= -180 &&
            wp.longitude <= 180
          );
        });

        if (validWaypoints.length === 0) {
          console.warn('No valid waypoints found');
          return;
        }

        const limitedWaypoints = validWaypoints.slice(0, 100);
        const routeData = {
          waypoints: limitedWaypoints.map((wp, index) => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
            title: `Waypoint ${index + 1}`,
            description: `Recorded at ${new Date(wp.timestamp).toLocaleTimeString()}`,
          })),
          name: `Recorded Route ${new Date().toLocaleDateString()}`,
          description: `Recorded drive - Distance: ${recordingState.distance.toFixed(2)} km, Duration: ${Math.floor(recordingState.totalElapsedTime / 60)}:${(recordingState.totalElapsedTime % 60).toString().padStart(2, '0')}`,
          searchCoordinates:
            limitedWaypoints.length > 0
              ? `${limitedWaypoints[0].latitude.toFixed(6)}, ${limitedWaypoints[0].longitude.toFixed(6)}`
              : '',
          routePath: limitedWaypoints.map((wp) => ({
            latitude: wp.latitude,
            longitude: wp.longitude,
          })),
          startPoint:
            limitedWaypoints.length > 0
              ? {
                  latitude: limitedWaypoints[0].latitude,
                  longitude: limitedWaypoints[0].longitude,
                }
              : undefined,
          endPoint:
            limitedWaypoints.length > 1
              ? {
                  latitude: limitedWaypoints[limitedWaypoints.length - 1].latitude,
                  longitude: limitedWaypoints[limitedWaypoints.length - 1].longitude,
                }
              : undefined,
        };

        if (onCreateRoute) {
          onCreateRoute(routeData);
        }

        clearRecordingState();
      } catch (error) {
        console.error('Error saving recording:', error);
      }
    },
    [recordingState.distance, recordingState.totalElapsedTime, clearRecordingState],
  );

  // Cancel recording
  const cancelRecording = useCallback(() => {
    try {
      if (recordingState.locationSubscription) {
        recordingState.locationSubscription.remove();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      clearRecordingState();
    } catch (error) {
      console.error('Error cancelling recording:', error);
      clearRecordingState();
    }
  }, [recordingState.locationSubscription, clearRecordingState]);

  // Check for recovery
  const checkForRecovery = useCallback(async (): Promise<boolean> => {
    try {
      const [sessionData, recoveryCheck] = await AsyncStorage.multiGet([
        RECORDING_STORAGE_KEY,
        RECOVERY_CHECK_KEY,
      ]);

      const hasSession = sessionData[1] !== null;
      const hasRecoveryFlag = recoveryCheck[1] === 'true';

      return hasSession && hasRecoveryFlag;
    } catch (error) {
      console.error('Error checking for recovery:', error);
      return false;
    }
  }, []);

  // Recover recording
  const recoverRecording = useCallback(async () => {
    try {
      const sessionData = await AsyncStorage.getItem(RECORDING_STORAGE_KEY);
      if (!sessionData) return;

      const recoveredState = JSON.parse(sessionData);

      // Restore state
      setRecordingState({
        ...recoveredState,
        recordingStartTime: recoveredState.recordingStartTime
          ? new Date(recoveredState.recordingStartTime)
          : null,
        locationSubscription: null, // Will be recreated if needed
      });

      wayPointsRef.current = recoveredState.waypoints || [];
      setIsRecordingActive(true);

      console.log('✅ Recording session recovered');
    } catch (error) {
      console.error('Error recovering recording:', error);
    }
  }, []);

  // Timer effect for recording
  useEffect(() => {
    if (!recordingState.isRecording) return;

    const timer = setInterval(() => {
      try {
        const now = Date.now();
        const startTimeMs = startTimeRef.current!;
        const currentPausedTime = pausedTimeRef.current;
        const isCurrentlyPaused = isPausedRef.current;

        const totalElapsed = Math.floor((now - startTimeMs) / 1000);
        const activeDriving = Math.floor((now - startTimeMs - currentPausedTime) / 1000);

        updateRecordingState({
          totalElapsedTime: totalElapsed,
          drivingTime: Math.max(0, activeDriving),
        });

        if (!isCurrentlyPaused && activeDriving > 0 && recordingState.distance > 0) {
          const timeHours = activeDriving / 3600;
          updateRecordingState({ averageSpeed: recordingState.distance / timeHours });
        }
      } catch (error) {
        console.error('❌ Timer error:', error);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [recordingState.isRecording, recordingState.distance, updateRecordingState]);

  // Auto-save effect
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused) {
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
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
  }, [recordingState.isRecording, recordingState.isPaused, autoSaveSession]);

  // App state change effect
  useEffect(() => {
    if (!recordingState.isRecording) return;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        // App going to background - ensure auto-save
        autoSaveSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [recordingState.isRecording, autoSaveSession]);

  const value: RecordingContextType = React.useMemo(
    () => ({
      recordingState,
      isRecordingActive,
      startRecording,
      pauseRecording,
      resumeRecording,
      stopRecording,
      minimizeRecording,
      maximizeRecording,
      saveRecording,
      cancelRecording,
      updateRecordingState,
      clearRecordingState,
      checkForRecovery,
      recoverRecording,
    }),
    [
      recordingState,
      isRecordingActive,
      startRecording,
      pauseRecording,
      resumeRecording,
      stopRecording,
      minimizeRecording,
      maximizeRecording,
      saveRecording,
      cancelRecording,
      updateRecordingState,
      clearRecordingState,
      checkForRecovery,
      recoverRecording,
    ],
  );

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
