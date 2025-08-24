import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, YStack, XStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { RecordedRouteData } from './RecordDrivingSheet';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as Location from 'expo-location';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Import wizard steps
import { MapInteractionStep } from './wizard/MapInteractionStep';
import { BasicInfoStep } from './wizard/BasicInfoStep';
import { RouteMapEditor, Waypoint as RouteMapWaypoint } from './shared/RouteMapEditor';

// Enhanced Haversine formula for accurate distance calculation (from RecordDrivingSheet)
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

const BOTTOM_NAV_HEIGHT = 80;

// Auto-save constants (same as RecordDrivingSheet)
const AUTO_SAVE_KEY = '@wizard_session_backup';
const AUTO_SAVE_INTERVAL = 10000; // Save every 10 seconds
const RECOVERY_CHECK_KEY = '@wizard_recovery_check';

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

export interface WizardRouteData {
  waypoints: Array<{
    latitude: number;
    longitude: number;
    title: string;
    description: string;
    timestamp?: number;
  }>;
  drawingMode: 'pin' | 'waypoint' | 'pen' | 'record';
  penPath?: Array<{ latitude: number; longitude: number }>;
  routePath?: Array<{ latitude: number; longitude: number }>;
  name: string;
  description: string;
  media: Array<{
    id: string;
    type: 'image' | 'video' | 'youtube';
    uri: string;
    description?: string;
  }>;
  exercises: any[];
}

type WizardStep = 'map' | 'basic' | 'media' | 'exercises' | 'review';

interface RouteWizardSheetProps {
  onCreateRoute: (routeData: RecordedRouteData) => void;
  onMaximize?: (routeData: WizardRouteData) => void; // Callback to maximize with current data
}

export function RouteWizardSheet({ onCreateRoute, onMaximize }: RouteWizardSheetProps) {
  console.log('🧙‍♂️ RouteWizardSheet: Component mounting...');
  
  try {
    const { t } = useTranslation();
    console.log('🧙‍♂️ RouteWizardSheet: Translation context loaded');
    
    const { hideModal } = useModal();
    console.log('🧙‍♂️ RouteWizardSheet: Modal context loaded');
    
    const { showRouteCreatedToast } = useToast();
    console.log('🧙‍♂️ RouteWizardSheet: Toast context loaded');
    
    const { user } = useAuth();
    console.log('🧙‍♂️ RouteWizardSheet: Auth context loaded, user:', user?.id ? 'exists' : 'null');
    
      // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('map');
  const [routeData, setRouteData] = useState<WizardRouteData>({
    waypoints: [],
    drawingMode: 'pin',
    name: '',
    description: '',
    media: [],
    exercises: [],
  });

  // Recording state (EXACT same as RecordDrivingSheet)
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingDistance, setRecordingDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  
  // Recording refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  
  // Auto-save refs and state
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAutoSaveRef = useRef<number>(0);
  const appState = useRef(AppState.currentState);
  const [hasRecoveryData, setHasRecoveryData] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  // Map state for RouteMapEditor
  const [mapRegion, setMapRegion] = useState({
    latitude: 55.7047, // Malmö default
    longitude: 13.191,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [isDrawing, setIsDrawing] = useState(false);

  // Ultra-simplified to just 2 essential steps
  const steps: WizardStep[] = ['map', 'basic'];
  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Bottom sheet animation - exact RoutesDrawer approach
  const { height: screenHeight } = Dimensions.get('window');
  const snapPoints = useMemo(
    () => ({
      expanded: screenHeight * 0.1, // Fully expanded (like RoutesDrawer 20%)
      mid: screenHeight * 0.4, // Show 60% of the screen (like RoutesDrawer)
      collapsed: screenHeight - BOTTOM_NAV_HEIGHT - 120, // Show more of the handle + title above nav bar
    }),
    [screenHeight],
  );

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.collapsed);
  const translateY = useSharedValue(snapPoints.collapsed);
  const currentState = useSharedValue(snapPoints.collapsed);

  const snapTo = useCallback(
    (point: number) => {
      console.log('🧙‍♂️ snapTo called with point:', point);
      
      // Update shared values
      currentState.value = point;
      setCurrentSnapPoint(point);
      
      // Animate to new position
      translateY.value = withSpring(point, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      
      console.log('🧙‍♂️ snapTo completed successfully');
    },
    [currentState, translateY],
  );

  // Pan gesture for sheet dragging - exact RoutesDrawer implementation
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // No need for isDragging ref, just start gesture
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;
        const maxsnapToTop = snapPoints.expanded;
        const maxBottom = snapPoints.collapsed;
        const boundedPosition = Math.min(Math.max(newPosition, maxsnapToTop), maxBottom);
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const currentPosition = currentState.value + translationY;
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.expanded;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.collapsed;
      } else {
        const positions = [snapPoints.expanded, snapPoints.mid, snapPoints.collapsed];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.expanded),
        snapPoints.collapsed,
      );

      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Validation
  const canProceed = useCallback(() => {
    let result = false;
    switch (currentStep) {
      case 'map':
        result = routeData.waypoints.length > 0;
        console.log('🧙‍♂️ canProceed (map):', result, 'waypoints:', routeData.waypoints.length);
        break;
      case 'basic':
        result = routeData.name.trim().length > 0;
        console.log('🧙‍♂️ canProceed (basic):', result, 'name:', routeData.name);
        break;
      case 'media':
      case 'exercises':
        result = true; // Optional steps
        console.log('🧙‍♂️ canProceed (optional):', result);
        break;
      case 'review':
        result = true;
        console.log('🧙‍♂️ canProceed (review):', result);
        break;
      default:
        result = false;
        console.log('🧙‍♂️ canProceed (unknown):', result);
        break;
    }
    return result;
  }, [currentStep, routeData]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    console.log('🧙‍♂️ handleNext called, currentStepIndex:', currentStepIndex);
    console.log('🧙‍♂️ canProceed():', canProceed());
    console.log('🧙‍♂️ routeData.waypoints:', routeData.waypoints.length);
    
    if (!canProceed()) {
      console.log('🧙‍♂️ Cannot proceed - validation failed');
      return;
    }
    
    const nextStep = steps[currentStepIndex + 1];
    console.log('🧙‍♂️ Moving to next step:', nextStep);
    setCurrentStep(nextStep);
    
    // Expand sheet for the name step
    if (nextStep === 'basic') {
      console.log('🧙‍♂️ Expanding sheet for basic step');
      snapTo(snapPoints.mid);
    }
  }, [currentStepIndex, snapTo, snapPoints, canProceed, routeData.waypoints]);

  const [showDraftModal, setShowDraftModal] = useState(false);

  // Check if user has entered any meaningful data
  const hasUserData = useCallback(() => {
    return (
      routeData.waypoints.length > 0 ||
      routeData.name.trim().length > 0 ||
      routeData.description.trim().length > 0 ||
      (routeData.routePath?.length || 0) > 0
    );
  }, [routeData]);

  const handleBack = useCallback(() => {
    console.log('🧙‍♂️ handleBack called, isFirstStep:', isFirstStep);
    if (isFirstStep) {
      console.log('🧙‍♂️ First step - checking for user data before closing');
      if (hasUserData()) {
        console.log('🧙‍♂️ User has data, showing draft confirmation');
        setShowDraftModal(true);
      } else {
        console.log('🧙‍♂️ No user data, closing wizard');
        hideModal();
      }
    } else {
      const prevStep = steps[currentStepIndex - 1];
      console.log('🧙‍♂️ Moving to previous step:', prevStep);
      setCurrentStep(prevStep);
      
      // Adjust sheet height for map step
      if (prevStep === 'map') {
        snapTo(snapPoints.collapsed);
      }
    }
  }, [currentStepIndex, isFirstStep, hideModal, snapTo, snapPoints, hasUserData]);

  // Data update handler
  const updateRouteData = useCallback((updates: Partial<WizardRouteData>) => {
    setRouteData(prev => ({ ...prev, ...updates }));
  }, []);

  // Recording functions (simplified from RecordDrivingSheet)
  const startRecording = useCallback(async () => {
    try {
      console.log('🎬 Starting recording in wizard');
      
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required for recording');
        return;
      }

      // Reset recording state
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setRecordingDistance(0);
      setCurrentSpeed(0);
      isPausedRef.current = false;
      recordingStartTimeRef.current = Date.now();

      // Expand to full height for recording
      snapTo(snapPoints.expanded);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          setRecordingTime(prev => prev + 1);
        }
      }, 1000);

      // Start location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (location: Location.LocationObject) => {
          if (!isPausedRef.current) {
            const newWaypoint = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              title: `Recorded Point ${routeData.waypoints.length + 1}`,
              description: `Recorded at ${new Date().toLocaleTimeString()}`,
            };

            // Calculate distance from last waypoint if we have one
            let distanceFromLast = 0;
            if (routeData.waypoints.length > 0) {
              const lastWaypoint = routeData.waypoints[routeData.waypoints.length - 1];
              distanceFromLast = calculateDistance(
                lastWaypoint.latitude,
                lastWaypoint.longitude,
                newWaypoint.latitude,
                newWaypoint.longitude
              );
              
              // Update total distance
              setRecordingDistance(prev => prev + distanceFromLast);
            }

            // Enhanced speed calculation with GPS fallback
            const gpsSpeed = location.coords.speed !== null && location.coords.speed >= 0
              ? location.coords.speed * 3.6 // Convert m/s to km/h
              : null;

            // Use GPS speed if available, otherwise calculate from distance/time
            let finalSpeed = 0;
            if (gpsSpeed !== null && gpsSpeed < 200) {
              finalSpeed = gpsSpeed;
            } else if (routeData.waypoints.length > 0 && distanceFromLast > 0) {
              const lastWaypoint = routeData.waypoints[routeData.waypoints.length - 1];
              const timeDiff = (Date.now() - (lastWaypoint.timestamp || Date.now())) / 1000; // seconds
              if (timeDiff > 0) {
                finalSpeed = (distanceFromLast * 1000) / 1000 / (timeDiff / 3600); // km/h
              }
            }

            // Update speed tracking
            setCurrentSpeed(Math.max(0, finalSpeed));
            setMaxSpeed(prev => Math.max(prev, finalSpeed));
            
            // Update average speed (only if we have distance and time)
            if (recordingTime > 0 && recordingDistance > 0) {
              const timeHours = recordingTime / 3600;
              setAverageSpeed(recordingDistance / timeHours);
            }

            // Add waypoint with timestamp
            updateRouteData({
              waypoints: [...routeData.waypoints, { 
                ...newWaypoint, 
                timestamp: Date.now() 
              }],
              drawingMode: 'record'
            });
          }
        }
      );

      setLocationSubscription(subscription);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  }, [snapTo, snapPoints, routeData.waypoints, updateRouteData]);

  const pauseRecording = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
  }, []);

  const resumeRecording = useCallback(() => {
    setIsPaused(false);
    isPausedRef.current = false;
  }, []);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording in wizard');
    
    // Clean up
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }

    setIsRecording(false);
    setIsPaused(false);
    isPausedRef.current = false;

    // Switch back to pin mode and show map
    updateRouteData({ drawingMode: 'pin' });
    setShowMap(true);

    // Collapse back to normal size
    snapTo(snapPoints.collapsed);
  }, [locationSubscription, snapTo, snapPoints, updateRouteData]);

  // Format time for recording display
  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Auto-save current wizard session (adapted from RecordDrivingSheet)
  const autoSaveWizardSession = useCallback(async () => {
    try {
      if (!hasUserData()) {
        console.log('🧙‍♂️ No data to auto-save');
        return;
      }

      const now = Date.now();
      // Don't save too frequently
      if (now - lastAutoSaveRef.current < AUTO_SAVE_INTERVAL) {
        return;
      }

      const sessionData = {
        routeData,
        currentStep,
        isRecording,
        isPaused,
        recordingTime,
        recordingDistance,
        currentSpeed,
        maxSpeed,
        averageSpeed,
        mapRegion,
        lastSaveTime: now,
        sessionId: `wizard_${Date.now()}`,
      };

      await AsyncStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(sessionData));
      await AsyncStorage.setItem(RECOVERY_CHECK_KEY, 'true');
      lastAutoSaveRef.current = now;

      console.log('🧙‍♂️ Auto-saved wizard session:', {
        waypoints: routeData.waypoints.length,
        name: routeData.name,
        step: currentStep,
        isRecording,
      });
    } catch (error) {
      console.error('🧙‍♂️ Auto-save failed:', error);
    }
  }, [routeData, currentStep, isRecording, isPaused, recordingTime, recordingDistance, currentSpeed, maxSpeed, averageSpeed, mapRegion, hasUserData]);

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
        
        if (hoursSinceLastSave < 24 && parsed.routeData && 
            (parsed.routeData.waypoints?.length > 0 || parsed.routeData.name?.trim() || parsed.routeData.description?.trim())) {
          console.log('🧙‍♂️ Found wizard recovery data:', {
            waypoints: parsed.routeData.waypoints?.length || 0,
            name: parsed.routeData.name,
            step: parsed.currentStep,
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
      console.error('🧙‍♂️ Recovery check failed:', error);
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
      
      // Restore wizard data
      if (parsed.routeData) {
        setRouteData(parsed.routeData);
      }
      
      if (parsed.currentStep) {
        setCurrentStep(parsed.currentStep);
      }
      
      // Restore recording state if applicable
      if (parsed.isRecording) {
        setIsRecording(parsed.isRecording);
        setIsPaused(parsed.isPaused || false);
        setRecordingTime(parsed.recordingTime || 0);
        setRecordingDistance(parsed.recordingDistance || 0);
        setCurrentSpeed(parsed.currentSpeed || 0);
        setMaxSpeed(parsed.maxSpeed || 0);
        setAverageSpeed(parsed.averageSpeed || 0);
      }
      
      // Restore map state
      if (parsed.mapRegion) {
        setMapRegion(parsed.mapRegion);
      }
      
      // Show map if we have waypoints
      if (parsed.routeData?.waypoints?.length > 0) {
        setShowMap(true);
      }
      
      console.log('✅ Restored wizard session:', {
        waypoints: parsed.routeData?.waypoints?.length || 0,
        name: parsed.routeData?.name,
        step: parsed.currentStep,
      });

      Alert.alert(
        'Session Recovered',
        `Found a previous wizard session with data. Your progress has been restored.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('🧙‍♂️ Recovery restore failed:', error);
      Alert.alert('Recovery Failed', 'Could not restore the previous session.');
    } finally {
      setShowRecoveryPrompt(false);
      await clearRecoveryData();
    }
  }, []);

  // Clear recovery data
  const clearRecoveryData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTO_SAVE_KEY);
      await AsyncStorage.removeItem(RECOVERY_CHECK_KEY);
      setHasRecoveryData(false);
      setShowRecoveryPrompt(false);
    } catch (error) {
      console.error('🧙‍♂️ Failed to clear recovery data:', error);
    }
  }, []);

  // Emergency save as draft when app goes to background or crashes
  const saveAsDraftEmergency = useCallback(async () => {
    try {
      if (!hasUserData()) {
        console.log('🧙‍♂️ No data for emergency save');
        return;
      }

      console.log('🚨 Emergency wizard draft save triggered');
      
      // Save current wizard data as draft (call the existing saveDraft function)
      const waypointDetails = routeData.waypoints.map((wp, index) => ({
        lat: wp.latitude,
        lng: wp.longitude,
        title: wp.title || `Waypoint ${index + 1}`,
        description: wp.description || '',
      }));

      if (!user?.id) {
        console.log('🧙‍♂️ No user for emergency save');
        return;
      }

      const routePayload = {
        name: routeData.name.trim() || 'Emergency Draft Route',
        description: routeData.description || 'Auto-saved draft after app crash/close',
        difficulty: 'beginner' as const,
        spot_type: 'urban' as const,
        visibility: 'private' as const,
        is_draft: true,
        best_season: 'all',
        best_times: 'anytime',
        vehicle_types: ['passenger_car'],
        activity_level: 'moderate',
        spot_subtype: 'standard',
        transmission_type: 'both',
        category: 'parking' as const,
        creator_id: user.id,
        waypoint_details: waypointDetails,
        waypoints: (routeData.routePath?.length || 0) > 0 
          ? { coordinates: routeData.routePath }
          : { coordinates: waypointDetails.map(wp => ({ latitude: wp.lat, longitude: wp.lng })) },
        media_attachments: [],
        suggested_exercises: routeData.exercises?.length > 0 ? JSON.stringify(routeData.exercises) : '',
        drawing_mode: routeData.drawingMode === 'pen' ? 'pen' : 'waypoint',
      };

      const { data: newRoute, error } = await supabase
        .from('routes')
        .insert(routePayload)
        .select()
        .single();

      if (error) throw error;
      
      console.log('🚨 Emergency wizard draft saved successfully:', newRoute.id);

    } catch (error) {
      console.error('🚨 Emergency wizard draft save failed:', error);
    }
  }, [hasUserData, routeData, user]);

  // Maximize to full CreateRouteScreen
  const handleMaximize = useCallback(() => {
    console.log('🔍 Maximizing wizard to full CreateRouteScreen');
    
    hideModal();
    
    // Use callback to parent (TabNavigator) which has navigation access
    if (onMaximize) {
      onMaximize(routeData);
    }
  }, [hideModal, onMaximize, routeData]);

  // Save route handler
  const handleSaveRoute = useCallback(async (isDraft: boolean) => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to save routes');
      return;
    }

    if (!routeData.name.trim()) {
      Alert.alert('Error', 'Please enter a route name');
      return;
    }

    if (routeData.waypoints.length === 0) {
      Alert.alert('Error', 'Please add at least one waypoint');
      return;
    }

    try {
      const waypointDetails = routeData.waypoints.map((wp, index) => ({
        lat: wp.latitude,
        lng: wp.longitude,
        title: wp.title || `Waypoint ${index + 1}`,
        description: wp.description || '',
      }));

      const mediaAttachments = routeData.media.map(item => ({
        type: item.type as 'image' | 'video' | 'youtube',
        url: item.uri,
        description: item.description || '',
      }));

      const routePayload = {
        name: routeData.name,
        description: routeData.description || '',
        difficulty: 'beginner' as const,
        spot_type: 'urban' as const,
        visibility: isDraft ? 'private' as const : 'public' as const,
        is_draft: isDraft, // Add draft flag for easier filtering
        best_season: 'all',
        best_times: 'anytime',
        vehicle_types: ['passenger_car'],
        activity_level: 'moderate',
        spot_subtype: 'standard',
        transmission_type: 'both',
        category: 'parking' as const,
        creator_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: !isDraft,
        waypoint_details: waypointDetails,
        metadata: {
          waypoints: waypointDetails,
          pins: [],
          options: {
            reverse: false,
            closeLoop: false,
            doubleBack: false,
          },
          actualDrawingMode: routeData.drawingMode,
          ...(routeData.penPath && routeData.penPath.length > 0 && {
            coordinates: routeData.penPath,
          }),
        },
        suggested_exercises: routeData.exercises.length > 0 ? JSON.stringify(routeData.exercises) : '',
        media_attachments: mediaAttachments,
        drawing_mode: routeData.drawingMode === 'pen' ? 'pen' : 'waypoint',
      };

      const { data: newRoute, error } = await supabase
        .from('routes')
        .insert(routePayload)
        .select()
        .single();

      if (error) throw error;

      hideModal();

      // Show simple success toast (navigation handled by parent)
      showRouteCreatedToast(newRoute.id, newRoute.name, false);

    } catch (error) {
      console.error('Error saving route:', error);
      Alert.alert('Error', 'Failed to save route. Please try again.');
    }
  }, [user, routeData, hideModal, showRouteCreatedToast]);

  // Auto-save as draft (simplified version for auto-save)
  const saveDraft = useCallback(async () => {
    if (!user?.id || !hasUserData()) {
      console.log('🧙‍♂️ No user or no data to save as draft');
      return;
    }

    try {
      console.log('🧙‍♂️ Auto-saving draft...');
      
      const waypointDetails = routeData.waypoints.map((wp, index) => ({
        lat: wp.latitude,
        lng: wp.longitude,
        title: wp.title || `Waypoint ${index + 1}`,
        description: wp.description || '',
      }));

      const routePayload = {
        name: routeData.name.trim() || 'Draft Route',
        description: routeData.description || 'Auto-saved draft',
        difficulty: 'beginner' as const,
        spot_type: 'urban' as const,
        visibility: 'private' as const,
        is_draft: true,
        best_season: 'all',
        best_times: 'anytime',
        vehicle_types: ['passenger_car'],
        activity_level: 'moderate',
        spot_subtype: 'standard',
        transmission_type: 'both',
        category: 'parking' as const,
        creator_id: user.id,
        waypoint_details: waypointDetails,
        waypoints: (routeData.routePath?.length || 0) > 0 
          ? { coordinates: routeData.routePath }
          : { coordinates: waypointDetails.map(wp => ({ latitude: wp.lat, longitude: wp.lng })) },
        media_attachments: [],
        suggested_exercises: routeData.exercises?.length > 0 ? JSON.stringify(routeData.exercises) : '',
        drawing_mode: routeData.drawingMode === 'pen' ? 'pen' : 'waypoint',
      };

      const { data: newRoute, error } = await supabase
        .from('routes')
        .insert(routePayload)
        .select()
        .single();

      if (error) throw error;

      console.log('🧙‍♂️ Draft saved successfully:', newRoute.id);
      showRouteCreatedToast(newRoute.id, newRoute.name, false, true); // true for isDraft
      
      // Close the wizard
      hideModal();

    } catch (error) {
      console.error('🧙‍♂️ Error saving draft:', error);
      // Don't show error alert for auto-save, just log it
    }
  }, [user, routeData, hasUserData, showRouteCreatedToast, hideModal]);

  // Handle draft modal actions
  const handleSaveDraft = useCallback(async () => {
    setShowDraftModal(false);
    await saveDraft();
    // saveDraft already calls hideModal()
  }, [saveDraft]);

  const handleDiscardDraft = useCallback(() => {
    console.log('🧙‍♂️ Discarding draft and closing wizard');
    setShowDraftModal(false);
    hideModal();
  }, [hideModal]);

  // Step titles
  const getStepTitle = (step: WizardStep) => {
    switch (step) {
      case 'map': return 'Choose Location';
      case 'basic': return 'Name & Save';
      default: return '';
    }
  };

  // Render current step content
  const renderCurrentStep = () => {
    console.log('🧙‍♂️ RouteWizardSheet: Rendering step:', currentStep);
    
    try {
      switch (currentStep) {
        case 'map':
          console.log('🧙‍♂️ RouteWizardSheet: Rendering MapInteractionStep');
          
          // Show recording interface if recording mode is active - EXACT RecordDrivingSheet UI
          if (routeData.drawingMode === 'record' || isRecording) {
            return (
              <View style={{ flex: 1 }}>
                {/* Map Toggle Button - Show during recording or if we have waypoints to preview */}
                {(isRecording || routeData.waypoints.length > 0) && (
                  <XStack justifyContent="center" marginBottom={8} paddingHorizontal={16}>
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

                {/* Enhanced Map Preview with Live Updates - EXACT from RecordDrivingSheet */}
                {showMap && (
                  <View style={{
                    width: '100%',
                    height: 250,
                    position: 'relative',
                    borderBottomWidth: 1,
                    borderBottomColor: '#333',
                  }}>
                    <RouteMapEditor
                      waypoints={routeData.waypoints.map(wp => ({
                        latitude: wp.latitude,
                        longitude: wp.longitude,
                        title: wp.title,
                        description: wp.description,
                      }))}
                      onWaypointsChange={() => {}} // Read-only during recording
                      drawingMode="record"
                      onDrawingModeChange={() => {}}
                      penPath={[]}
                      onPenPathChange={() => {}}
                      routePath={routeData.routePath}
                      region={routeData.waypoints.length > 0 ? {
                        latitude: routeData.waypoints[routeData.waypoints.length - 1].latitude,
                        longitude: routeData.waypoints[routeData.waypoints.length - 1].longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      } : mapRegion}
                      onRegionChange={setMapRegion}
                      onRecord={() => {}}
                      isDrawing={false}
                      onDrawingChange={() => {}}
                      colorScheme="dark"
                    />

                    {/* Enhanced Recording Indicator - EXACT from RecordDrivingSheet */}
                    {isRecording && (
                      <View style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: 6,
                        borderRadius: 4,
                      }}>
                        <View style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: isPaused ? '#FF9500' : '#FF3B30',
                        }} />
                        <Text style={{
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 'bold',
                          marginLeft: 4,
                        }}>
                          {isPaused ? 'PAUSED' : 'LIVE RECORDING'}
                        </Text>
                        <Text style={{
                          color: 'white',
                          fontSize: 10,
                          opacity: 0.8,
                          marginTop: 2,
                        }}>
                          {routeData.waypoints.length} points • {recordingDistance.toFixed(2)}km
                        </Text>
                      </View>
                    )}

                    {/* Map Stats Overlay - EXACT from RecordDrivingSheet */}
                    {!isRecording && routeData.waypoints.length > 0 && (
                      <View style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        right: 10,
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        padding: 8,
                        borderRadius: 6,
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: 12,
                          fontWeight: '500',
                        }}>
                          Route Preview • {routeData.waypoints.length} waypoints
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Recording Status Display (always shown when recording) - EXACT from RecordDrivingSheet */}
                {isRecording && !showMap && (
                  <View style={{
                    marginHorizontal: 16,
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: DARK_THEME.cardBackground,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: isPaused ? '#FF9500' : '#FF3B30',
                      }} />
                      <Text color={DARK_THEME.text} fontSize={16} fontWeight="bold" marginLeft={8}>
                        {isPaused ? 'RECORDING PAUSED' : 'RECORDING ACTIVE'}
                      </Text>
                    </View>
                    <Text color={DARK_THEME.text} marginTop={4}>
                      Recording {routeData.waypoints.length} waypoints • {recordingDistance.toFixed(2)} km
                    </Text>
                  </View>
                )}

                <YStack padding={16} space={16}>
                  {/* Enhanced Stats display - EXACT from RecordDrivingSheet */}
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                  }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
                        DURATION
                      </Text>
                      <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
                        {formatRecordingTime(recordingTime)}
                      </Text>
                      <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                        Recording time
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
                        DISTANCE
                      </Text>
                      <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
                        {recordingDistance.toFixed(2)} km
                      </Text>
                      <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                        {routeData.waypoints.length} waypoints
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>
                        SPEED
                      </Text>
                      <Text color={DARK_THEME.text} fontSize={20} fontWeight="600">
                        {currentSpeed.toFixed(1)} km/h
                      </Text>
                      <Text color={DARK_THEME.text} fontSize={12} opacity={0.5}>
                        Current speed
                      </Text>
                    </View>
                  </View>

                  {/* Recording Controls - EXACT from RecordDrivingSheet */}
                  <View style={{
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}>
                    {isRecording ? (
                      <XStack gap={16} justifyContent="center">
                        {isPaused ? (
                          <TouchableOpacity
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 30,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: '#1A3D3D'
                            }}
                            onPress={resumeRecording}
                          >
                            <Feather name="play" size={28} color="white" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 30,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: '#3D3D1A'
                            }}
                            onPress={pauseRecording}
                          >
                            <Feather name="pause" size={28} color="white" />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'red'
                          }}
                          onPress={stopRecording}
                        >
                          <Feather name="square" size={28} color="white" />
                        </TouchableOpacity>
                      </XStack>
                    ) : (
                      <TouchableOpacity
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: '#1A3D3D'
                        }}
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
                  
                  {/* Back to drawing modes */}
                  {!isRecording && (
                    <Button
                      onPress={() => updateRouteData({ drawingMode: 'pin' })}
                      variant="outlined"
                      size="md"
                      backgroundColor="$gray5"
                      borderColor="$gray8"
                      marginTop="$2"
                    >
                      <XStack gap="$1" alignItems="center">
                        <Feather name="arrow-left" size={16} color="$gray11" />
                        <Text color="$gray11">← Back to Drawing</Text>
                      </XStack>
                    </Button>
                  )}
                </YStack>
              </View>
            );
          }
          
          // Show normal map interaction
          return (
            <View style={{ flex: 1, padding: 16 }}>
              <RouteMapEditor
                waypoints={routeData.waypoints.map(wp => ({
                  latitude: wp.latitude,
                  longitude: wp.longitude,
                  title: wp.title,
                  description: wp.description,
                }))}
                onWaypointsChange={(newWaypoints) => {
                  updateRouteData({
                    waypoints: newWaypoints.map(wp => ({
                      latitude: wp.latitude,
                      longitude: wp.longitude,
                      title: wp.title,
                      description: wp.description,
                    }))
                  });
                }}
                drawingMode={routeData.drawingMode}
                onDrawingModeChange={(mode) => {
                  if (mode === 'record') {
                    console.log('🎬 Switching to record mode');
                    updateRouteData({ drawingMode: 'record' });
                  } else {
                    updateRouteData({ drawingMode: mode });
                  }
                }}
                penPath={routeData.penPath || []}
                onPenPathChange={(path) => {
                  updateRouteData({ penPath: path });
                }}
                routePath={routeData.routePath}
                region={mapRegion}
                onRegionChange={setMapRegion}
                onRecord={() => {
                  console.log('🎬 Switching to record mode');
                  updateRouteData({ drawingMode: 'record' });
                }}
                isDrawing={isDrawing}
                onDrawingChange={setIsDrawing}
                colorScheme="dark"
              />
              
              {/* Navigation buttons below map */}
              <View style={{ 
                padding: 16, 
                backgroundColor: DARK_THEME.background,
                borderTopWidth: 1,
                borderTopColor: '#333'
              }}>
                <XStack gap="$3" alignItems="center" justifyContent="space-between">
                  <Text color={DARK_THEME.secondaryText} fontSize="$3" fontWeight="500">
                    Step {currentStepIndex + 1} of {steps.length}
                  </Text>
                  
                  {/* Next button for map step */}
                  <Button
                    onPress={() => {
                      console.log('🧙‍♂️ Next button pressed!');
                      handleNext();
                    }}
                    disabled={!canProceed()}
                    size="md"
                    backgroundColor={canProceed() ? "#69e3c4" : "$gray8"}
                    pressStyle={{ opacity: 0.8 }}
                    opacity={1}
                  >
                    <XStack gap="$2" alignItems="center">
                      <Text color="white" fontWeight="600" fontSize="$3">Next</Text>
                      <Feather name="arrow-right" size={16} color="white" />
                    </XStack>
                  </Button>
                </XStack>
              </View>
            </View>
          );
        case 'basic':
          console.log('🧙‍♂️ RouteWizardSheet: Rendering BasicInfoStep');
          return (
            <View style={{ flex: 1 }}>
              <BasicInfoStep
                data={routeData}
                onUpdate={updateRouteData}
                onSave={handleSaveRoute}
                onCancel={() => hideModal()}
                onMaximize={handleMaximize}
              />
              
              {/* Navigation buttons below basic info */}
              <View style={{ 
                padding: 16, 
                backgroundColor: DARK_THEME.background,
                borderTopWidth: 1,
                borderTopColor: '#333'
              }}>
                <XStack gap="$3" alignItems="center" justifyContent="space-between">
                  <Text color={DARK_THEME.secondaryText} fontSize="$3" fontWeight="500">
                    Step {currentStepIndex + 1} of {steps.length}
                  </Text>
                  
                  <XStack gap="$2">
                    {/* Back button for basic info step */}
                    <Button
                      onPress={() => {
                        console.log('🧙‍♂️ Back button pressed!');
                        handleBack();
                      }}
                      variant="outlined"
                      size="md"
                      backgroundColor="$gray5"
                      borderColor="$gray8"
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <XStack gap="$1" alignItems="center">
                        <Feather name="arrow-left" size={16} color="$gray11" />
                        <Text color="$gray11" fontSize="$3" fontWeight="500">Back</Text>
                      </XStack>
                    </Button>
                    
                    {/* Save Draft button */}
                    <Button
                      onPress={() => handleSaveRoute(true)}
                      variant="outlined"
                      size="md"
                      backgroundColor="$orange8"
                      borderColor="$orange9"
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <XStack gap="$1" alignItems="center">
                        <Feather name="save" size={16} color="white" />
                        <Text color="white" fontSize="$3" fontWeight="500">Save Draft</Text>
                      </XStack>
                    </Button>
                    
                    {/* Publish button */}
                    <Button
                      onPress={() => handleSaveRoute(false)}
                      disabled={!canProceed()}
                      size="md"
                      backgroundColor={canProceed() ? "#69e3c4" : "$gray8"}
                      pressStyle={{ opacity: 0.8 }}
                    >
                      <XStack gap="$1" alignItems="center">
                        <Feather name="upload" size={16} color="white" />
                        <Text color="white" fontSize="$3" fontWeight="500">Publish</Text>
                      </XStack>
                    </Button>
                  </XStack>
                </XStack>
              </View>
            </View>
          );
        default:
          console.log('🧙‍♂️ RouteWizardSheet: Unknown step, returning null');
          return null;
      }
    } catch (error) {
      console.error('🧙‍♂️ RouteWizardSheet: Error rendering step:', error);
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text color="red">Error loading step: {currentStep}</Text>
          <Text color="red" fontSize="$2">{error?.toString()}</Text>
        </View>
      );
    }
  };

  // Check for recovery data on mount
  useEffect(() => {
    checkForRecoveryData();
  }, [checkForRecoveryData]);

  // Set up auto-save timer when wizard has data
  useEffect(() => {
    if (hasUserData()) {
      // Start auto-save timer
      autoSaveTimerRef.current = setInterval(() => {
        autoSaveWizardSession();
      }, AUTO_SAVE_INTERVAL);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
      };
    } else {
      // Clear auto-save timer when no data
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
  }, [hasUserData, autoSaveWizardSession]);

  // Handle app state changes for emergency saves
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 Wizard app state changed:', appState.current, '->', nextAppState);
      
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - emergency save
        console.log('📱 App going to background, triggering wizard emergency save');
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
      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      
      // Emergency save if wizard has data
      if (hasUserData()) {
        console.log('🚨 Wizard component unmounting with data - emergency save');
        saveAsDraftEmergency();
      }
      
      // Clear recovery data if we're unmounting cleanly
      clearRecoveryData();
    };
  }, [hasUserData, saveAsDraftEmergency, clearRecoveryData]);

  console.log('🧙‍♂️ About to render RouteWizardSheet');
  
  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1 }}>
        <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: screenHeight,
            backgroundColor: DARK_THEME.bottomSheet,
          },
          animatedStyle,
        ]}
      >
        {/* Handle and header */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
          <XStack alignItems="center" justifyContent="space-between" width="100%" paddingHorizontal="$2">
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Feather name={isFirstStep ? "x" : "arrow-left"} size={20} color={DARK_THEME.iconColor} />
            </TouchableOpacity>
            
            <YStack alignItems="center" flex={1}>
              <Text fontSize="$5" fontWeight="600" color={DARK_THEME.text}>
                {getStepTitle(currentStep)}
              </Text>
              <XStack gap="$1" marginTop="$1" alignItems="center">
                {steps.map((step, index) => (
                  <View
                    key={step}
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor: index <= currentStepIndex ? '#69e3c4' : 'rgba(255,255,255,0.3)',
                      }
                    ]}
                  />
                ))}
                
                {/* Next button next to progress dots */}
                {currentStep === 'map' && canProceed() && (
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🧙‍♂️ Header Next button pressed!');
                      handleNext();
                    }}
                    style={{
                      marginLeft: 12,
                      backgroundColor: '#69e3c4',
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Text color="white" fontSize="$2" fontWeight="600">Next</Text>
                    <Feather name="arrow-right" size={12} color="white" />
                  </TouchableOpacity>
                )}
              </XStack>
            </YStack>

            <TouchableOpacity onPress={handleMaximize} style={styles.maximizeButton}>
              <Feather name="maximize-2" size={16} color={DARK_THEME.secondaryText} />
            </TouchableOpacity>
          </XStack>
        </View>

        {/* Step content */}
        <View style={styles.content}>
          {renderCurrentStep()}
        </View>
        
        {/* Debug info */}
        {__DEV__ && (
          <View style={{ 
            position: 'absolute', 
            top: 80, 
            right: 10, 
            backgroundColor: 'rgba(0,0,0,0.9)', 
            padding: 8, 
            borderRadius: 4,
            minWidth: 120
          }}>
            <Text color="white" fontSize="$1">
              Step: {currentStep} ({currentStepIndex + 1}/{steps.length})
            </Text>
            <Text color="white" fontSize="$1">
              Can proceed: {canProceed() ? '✅' : '❌'}
            </Text>
            <Text color="white" fontSize="$1">
              Waypoints: {routeData.waypoints.length}
            </Text>
            <Text color="white" fontSize="$1">
              Next visible: {currentStep === 'map' && canProceed() ? '✅' : '❌'}
            </Text>
            {routeData.waypoints.length > 0 && (
              <Text color="#69e3c4" fontSize="$1">
                First: {routeData.waypoints[0]?.title?.substring(0, 15)}...
              </Text>
            )}
          </View>
        )}
      </Animated.View>

              {/* Recovery Prompt */}
        {showRecoveryPrompt && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001
          }}>
            <View style={{
              backgroundColor: DARK_THEME.background,
              borderRadius: 16,
              padding: 24,
              margin: 20,
              maxWidth: 320,
              width: '100%',
              borderWidth: 1,
              borderColor: '#FF9500',
            }}>
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <Feather name="alert-circle" size={20} color="#FF9500" />
                <Text fontSize="$6" fontWeight="600" color={DARK_THEME.text}>
                  Session Recovery
                </Text>
              </XStack>
              
              <Text fontSize="$4" color={DARK_THEME.secondaryText} marginBottom="$4">
                Found an incomplete wizard session. Would you like to restore your progress?
              </Text>
              
              <XStack gap="$3" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onPress={clearRecoveryData}
                  backgroundColor="$gray5"
                  flex={1}
                >
                  <Text color="$gray11">Discard</Text>
                </Button>
                <Button
                  backgroundColor="#FF9500"
                  onPress={restoreFromRecovery}
                  flex={1}
                >
                  <Text color="white" fontWeight="600">Restore</Text>
                </Button>
              </XStack>
            </View>
          </View>
        )}

        {/* Draft Confirmation Modal */}
        {showDraftModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <View style={{
            backgroundColor: DARK_THEME.background,
            borderRadius: 16,
            padding: 24,
            margin: 20,
            maxWidth: 320,
            width: '100%'
          }}>
            <Text fontSize="$6" fontWeight="600" color={DARK_THEME.text} marginBottom="$3">
              Save as Draft?
            </Text>
            <Text fontSize="$4" color={DARK_THEME.secondaryText} marginBottom="$4">
              You have unsaved changes. Would you like to save this route as a draft so you can continue editing it later?
            </Text>
            
            <XStack gap="$3" justifyContent="flex-end">
              <Button
                variant="outlined"
                onPress={handleDiscardDraft}
                flex={1}
              >
                <Text>Discard</Text>
              </Button>
              <Button
                backgroundColor="#69e3c4"
                onPress={handleSaveDraft}
                flex={1}
              >
                <Text color="white" fontWeight="600">Save Draft</Text>
              </Button>
            </XStack>
          </View>
        </View>
      )}
      </View>
    </GestureDetector>
  );
  
  } catch (error) {
    console.error('🧙‍♂️ RouteWizardSheet: Component crashed:', error);
    return (
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 200, 
        backgroundColor: '#1F1F1F',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Text color="red" fontSize="$4" fontWeight="bold">Component Error</Text>
        <Text color="white" fontSize="$2" textAlign="center" marginTop="$2">
          {error?.toString() || 'Unknown error occurred'}
        </Text>
        <TouchableOpacity 
          onPress={() => {
            try {
              const { hideModal } = useModal();
              hideModal();
            } catch (e) {
              console.error('Error closing modal:', e);
            }
          }}
          style={{
            marginTop: 16,
            backgroundColor: '#69e3c4',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8
          }}
        >
          <Text color="white">Close</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 32,
  },
  maximizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  footer: {
    // Removed absolute positioning - now inline with content
  },
});
