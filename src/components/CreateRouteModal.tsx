import React from 'react';
import { View, StyleSheet, Dimensions, Platform, BackHandler, Alert } from 'react-native';
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
}

export function CreateRouteModal({ routeData }: CreateRouteModalProps) {
  const { hideModal } = useModal();

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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ModalHeader title="Create Route" onClose={handleClose} />
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
              onClose: handleClose, // Pass the handleClose function to CreateRouteScreen
            },
          }}
          isModal={true} // Add this flag to indicate it's running in modal mode
          hideHeader={true} // Hide the default header
        />
      </View>
    </View>
  );
}
