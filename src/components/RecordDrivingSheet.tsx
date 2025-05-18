import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { Text, YStack, Button, XStack } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../contexts/TranslationContext';
import * as Location from 'expo-location';

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

interface RecordedRouteData {
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

// Location tracking type
type RecordedWaypoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  accuracy: number | null;
};

const { height: screenHeight } = Dimensions.get('window');

// Simplified component with recording functionality
export const RecordDrivingSheet = (props: RecordDrivingSheetProps) => {
  const { isVisible, onClose, onCreateRoute } = props;
  const { t } = useTranslation();
  const { hideModal } = useModal();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [waypoints, setWaypoints] = useState<RecordedWaypoint[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [locationSubscription]);
  
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

  // Start recording location
  const startRecording = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission is required for recording');
        return;
      }

      // Reset state
      setWaypoints([]);
      setElapsedTime(0);
      setDistance(0);
      setAverageSpeed(0);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);

      // Start location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newWaypoint: RecordedWaypoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            accuracy: location.coords.accuracy,
          };

          setWaypoints(prevWaypoints => {
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

            // Calculate average speed
            if (startTimeRef.current && updatedWaypoints.length > 1) {
              const totalTimeHours = (Date.now() - startTimeRef.current) / 3600000;
              if (totalTimeHours > 0) {
                setAverageSpeed(distance / totalTimeHours); // km/h
              }
            }

            return updatedWaypoints;
          });
        }
      );

      setLocationSubscription(subscription);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start recording');
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
    
    setIsRecording(false);
    
    // Always show summary, skip validation for minimum waypoints
    setShowSummary(true);
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
    // Skip validation for minimum waypoints
    
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
    const routeDescription = `Recorded drive - Distance: ${routeData.distance} km, Duration: ${formatTime(routeData.duration)}`;
    
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

    // Show alert with options to dismiss or continue to route creation
    Alert.alert(
      'Route Recorded',
      `Recorded ${routeData.waypoints.length} waypoints\nDistance: ${routeData.distance} km\nTime: ${formatTime(routeData.duration)}`,
      [
        {
          text: 'Dismiss',
          onPress: () => {
            console.log('RecordDrivingSheet: User dismissed recording');
            onClose();
          },
          style: 'cancel'
        },
        {
          text: 'Create Route',
          onPress: () => {
            console.log('RecordDrivingSheet: User chose to create route');
            // First close the modal
            hideModal();
            console.log('RecordDrivingSheet: Modal closed');
            
            // Call the callback if it exists
            if (onCreateRoute) {
              console.log('RecordDrivingSheet: onCreateRoute callback exists, scheduling call');
              // Use setTimeout to ensure modal is fully closed before navigation
              setTimeout(() => {
                console.log('RecordDrivingSheet: Calling onCreateRoute in setTimeout');
                onCreateRoute(recordedRouteData);
              }, 300);
            } else {
              console.log('RecordDrivingSheet: ERROR! onCreateRoute callback is NOT defined!');
            }
          }
        }
      ]
    );
    console.log('RecordDrivingSheet: Alert shown to user');
  };
  
  // Cancel recording session
  const cancelRecording = () => {
    if (isRecording) {
      Alert.alert(
        'Cancel Recording',
        'Are you sure you want to cancel the current recording? All data will be lost.',
        [
          {
            text: 'No',
            style: 'cancel'
          },
          {
            text: 'Yes',
            onPress: () => {
              if (locationSubscription) {
                locationSubscription.remove();
                setLocationSubscription(null);
              }
              
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              
              setIsRecording(false);
              setShowSummary(false);
              setWaypoints([]);
              setElapsedTime(0);
              setDistance(0);
              setAverageSpeed(0);
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };
  
  // Handler for clicking outside the sheet
  const handleOutsidePress = () => {
    if (isRecording) {
      Alert.alert(
        'Cancel Recording',
        'Are you sure you want to exit? Your recording will be lost.',
        [
          {
            text: 'No',
            style: 'cancel'
          },
          {
            text: 'Yes',
            onPress: () => {
              if (locationSubscription) {
                locationSubscription.remove();
                setLocationSubscription(null);
              }
              
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };
  
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
              <Text color={DARK_THEME.text} fontSize={14} opacity={0.7}>AVG SPEED</Text>
              <Text color={DARK_THEME.text} fontSize={24} fontWeight="600">{averageSpeed.toFixed(1)} km/h</Text>
            </View>
          </View>
          
          {/* Record/Summary view */}
          {!showSummary ? (
            /* Record button */
            <View style={styles.recordButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  { backgroundColor: isRecording ? 'red' : '#1A3D3D' },
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <Feather name="square" size={32} color="white" />
                ) : (
                  <Feather name="play" size={32} color="white" />
                )}
              </TouchableOpacity>
              <Text color={DARK_THEME.text} marginTop={8}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
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
              
              <XStack space={8} justifyContent="center">
                <Button
                  backgroundColor={DARK_THEME.borderColor}
                  color="white"
                  onPress={cancelRecording}
                >
                  <Text color="white">Dismiss</Text>
                </Button>
                
                <Button
                  backgroundColor="#1A3D3D"
                  color="white"
                  onPress={saveRecording}
                >
                  <Text color="white">Create Route</Text>
                </Button>
              </XStack>
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
        </YStack>
      </View>
    </View>
  );
};

// Modal version for use with modal system
export const RecordDrivingModal = () => {
  const { hideModal } = useModal();
  
  // Get navigation from global state (set by MapScreen)
  const onCreateRoute = (routeData: RecordedRouteData) => {
    // Store data in global state for MapScreen to access
    console.log('RecordDrivingModal: onCreateRoute called with data', {
      waypointsCount: routeData.waypoints.length,
      name: routeData.name,
      description: routeData.description
    });
    
    if (global) {
      console.log('RecordDrivingModal: Setting global.recordedRouteData');
      (global as any).recordedRouteData = routeData;
      
      // Set a flag that MapScreen can check
      console.log('RecordDrivingModal: Setting global.shouldOpenCreateRoute = true');
      (global as any).shouldOpenCreateRoute = true;
    } else {
      console.log('RecordDrivingModal: global object is not available!');
    }
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
}); 