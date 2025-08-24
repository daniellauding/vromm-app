import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
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

const BOTTOM_NAV_HEIGHT = 80;
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

  // Recording state (similar to RecordDrivingSheet)
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingDistance, setRecordingDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  
  // Recording refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

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

      // lastGesture.current = boundedTarget;
      currentState.value = boundedTarget;
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

            // Update speed
            if (location.coords.speed) {
              setCurrentSpeed(location.coords.speed * 3.6); // Convert m/s to km/h
            }

            // Add waypoint
            updateRouteData({
              waypoints: [...routeData.waypoints, newWaypoint],
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

    // Collapse back to normal size
    snapTo(snapPoints.collapsed);
  }, [locationSubscription, snapTo, snapPoints]);

  // Format time for recording display
  const formatRecordingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

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
          
          // Show recording interface if recording mode is active
          if (routeData.drawingMode === 'record' || isRecording) {
            return (
              <View style={{ flex: 1, padding: 16 }}>
                {/* Recording Status */}
                <View style={{ 
                  backgroundColor: isRecording ? (isPaused ? '#FF9500' : '#FF3B30') : '#2D3130',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16,
                  alignItems: 'center'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: isRecording ? (isPaused ? '#FF9500' : '#FF3B30') : '#666',
                      marginRight: 8
                    }} />
                    <Text color="white" fontSize="$4" fontWeight="600">
                      {isRecording ? (isPaused ? 'RECORDING PAUSED' : 'RECORDING ACTIVE') : 'READY TO RECORD'}
                    </Text>
                  </View>
                  
                  {isRecording && (
                    <Text color="white" fontSize="$6" fontWeight="bold">
                      {formatRecordingTime(recordingTime)}
                    </Text>
                  )}
                </View>

                {/* Recording Stats */}
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-around',
                  backgroundColor: '#2D3130',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16
                }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text color="#AAAAAA" fontSize="$2">WAYPOINTS</Text>
                    <Text color="white" fontSize="$4" fontWeight="600">{routeData.waypoints.length}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text color="#AAAAAA" fontSize="$2">DISTANCE</Text>
                    <Text color="white" fontSize="$4" fontWeight="600">{recordingDistance.toFixed(2)} km</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text color="#AAAAAA" fontSize="$2">SPEED</Text>
                    <Text color="white" fontSize="$4" fontWeight="600">{currentSpeed.toFixed(1)} km/h</Text>
                  </View>
                </View>

                {/* Recording Controls */}
                <View style={{ alignItems: 'center', gap: 16 }}>
                  {!isRecording ? (
                    <Button
                      onPress={startRecording}
                      size="lg"
                      backgroundColor="#FF3B30"
                      borderRadius="$12"
                      paddingHorizontal="$6"
                      paddingVertical="$4"
                    >
                      <XStack gap="$2" alignItems="center">
                        <Feather name="circle" size={24} color="white" />
                        <Text color="white" fontWeight="600" fontSize="$4">Start Recording</Text>
                      </XStack>
                    </Button>
                  ) : (
                    <XStack gap="$3">
                      <Button
                        onPress={isPaused ? resumeRecording : pauseRecording}
                        size="lg"
                        backgroundColor={isPaused ? "#1A3D3D" : "#FF9500"}
                        borderRadius="$12"
                      >
                        <Feather name={isPaused ? "play" : "pause"} size={24} color="white" />
                      </Button>
                      
                      <Button
                        onPress={stopRecording}
                        size="lg"
                        backgroundColor="#666"
                        borderRadius="$12"
                      >
                        <Feather name="square" size={24} color="white" />
                      </Button>
                    </XStack>
                  )}
                  
                  {/* Back to drawing modes */}
                  {!isRecording && (
                    <Button
                      onPress={() => updateRouteData({ drawingMode: 'pin' })}
                      variant="outlined"
                      size="md"
                      marginTop="$4"
                    >
                      <Text>← Back to Drawing</Text>
                    </Button>
                  )}
                </View>
              </View>
            );
          }
          
          // Show normal map interaction
          return (
            <View style={{ flex: 1 }}>
              <MapInteractionStep
                data={routeData}
                onUpdate={updateRouteData}
                onRecord={() => {
                  console.log('🎬 Switching to record mode');
                  updateRouteData({ drawingMode: 'record' });
                }}
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
