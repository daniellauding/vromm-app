import React from 'react';
import { Alert } from 'react-native';

import { useModal } from '../../contexts/ModalContext';
import { RecordDrivingSheet } from './RecordDrivingSheet';

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
