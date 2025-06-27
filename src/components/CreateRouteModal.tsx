import React from 'react';
import { View, StyleSheet, Dimensions, Platform, BackHandler, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useModal } from '../contexts/ModalContext';
import { CreateRouteScreen } from '../screens/CreateRouteScreen';
import { RecordedRouteData } from './RecordDrivingSheet';
import { useEffect } from 'react';
import { ModalHeader } from './ModalHeader';

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1A1A',
    zIndex: 2000, // Higher than other modals
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
});

interface CreateRouteModalProps {
  routeData: RecordedRouteData;
  onRouteCreated?: (routeId: string) => void;
}

export function CreateRouteModal({ routeData, onRouteCreated }: CreateRouteModalProps) {
  const { hideModal } = useModal();

  // Validate route data on component mount
  useEffect(() => {
    console.log('CreateRouteModal: Route data received:', {
      waypointsCount: routeData?.waypoints?.length || 0,
      hasName: !!routeData?.name,
      hasDescription: !!routeData?.description,
      routePathCount: routeData?.routePath?.length || 0,
    });

    // Basic validation
    if (!routeData) {
      console.error('CreateRouteModal: No route data provided');
      Alert.alert('Error', 'No route data provided');
      hideModal();
      return;
    }

    if (!routeData.waypoints || routeData.waypoints.length === 0) {
      console.error('CreateRouteModal: No waypoints in route data');
      Alert.alert('Error', 'No waypoints found in route data');
      hideModal();
      return;
    }

    // Validate waypoint structure
    const invalidWaypoints = routeData.waypoints.filter(wp => 
      !wp || 
      typeof wp.latitude !== 'number' || 
      typeof wp.longitude !== 'number' ||
      isNaN(wp.latitude) || 
      isNaN(wp.longitude)
    );

    if (invalidWaypoints.length > 0) {
      console.error('CreateRouteModal: Invalid waypoints found:', invalidWaypoints.length);
      Alert.alert('Error', 'Invalid waypoint data detected');
      hideModal();
      return;
    }

    console.log('CreateRouteModal: Route data validation passed');
  }, [routeData, hideModal]);

  // Handle back button press to close modal
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => backHandler.remove();
  }, [hideModal]);

  // Function to handle modal close with confirmation if needed
  const handleClose = () => {
    // Check if there are unsaved changes
    // For simplicity, we're always confirming
    Alert.alert(
      'Close Route Creation?',
      'Any unsaved changes will be lost. Are you sure you want to close?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close',
          style: 'destructive',
          onPress: () => hideModal(),
        },
      ],
    );
  };

  // Handle successful route creation
  const handleRouteCreated = (routeId: string) => {
    hideModal();
    if (onRouteCreated) {
      onRouteCreated(routeId);
    }
  };

  // Add error boundary to prevent crashes from propagating
  const handleError = (error: Error) => {
    console.error('Error in CreateRouteModal:', error);
    Alert.alert('Error', 'Something went wrong. Please try again.', [
      {
        text: 'Close',
        onPress: hideModal,
      },
    ]);
  };

  // Don't render if no route data to prevent crashes
  if (!routeData || !routeData.waypoints || routeData.waypoints.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ModalHeader title="Create Route" onClose={handleClose} />
        <NavigationContainer independent={true}>
          <CreateRouteScreen
            route={{
              params: {
                initialWaypoints: routeData.waypoints,
                initialName: routeData.name,
                initialDescription: routeData.description,
                initialSearchCoordinates: routeData.searchCoordinates,
                initialRoutePath: routeData.routePath,
                initialStartPoint: routeData.startPoint,
                initialEndPoint: routeData.endPoint,
                onClose: handleClose,
                onRouteCreated: handleRouteCreated,
              },
            }}
            isModal={true}
            hideHeader={true}
          />
        </NavigationContainer>
      </View>
    </View>
  );
}
