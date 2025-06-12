import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

/**
 * Checks if background location permission is granted
 * @returns Promise<boolean> - Whether background location permission is granted
 */
export const checkBackgroundLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status === 'granted';
};

/**
 * Requests background location permission with proper explanation
 * @returns Promise<boolean> - Whether background location permission is granted
 */
export const requestBackgroundLocationPermission = async (): Promise<boolean> => {
  // First check foreground permission
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    Alert.alert(
      'Location Permission Required',
      'We need your location to record your route. Please enable location services for this app in your device settings.',
      [{ text: 'OK' }],
    );
    return false;
  }

  // Then request background permission
  const { status } = await Location.requestBackgroundPermissionsAsync();

  if (status !== 'granted') {
    // Show explanation based on platform
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Background Location Required',
        'For route recording to work when the app is in the background, please select "Allow While Using App" or "Always" in your iOS settings.',
        [{ text: 'OK' }],
      );
    } else {
      Alert.alert(
        'Background Location Required',
        'For route recording to work when the app is in the background, please enable background location in your device settings.',
        [{ text: 'OK' }],
      );
    }
    return false;
  }

  return true;
};

/**
 * Shows an explanation about why background location is needed
 */
export const showBackgroundLocationExplanation = () => {
  Alert.alert(
    'Background Location',
    'This app needs to access your location in the background to record your driving route even when the app is not active. Your location data is only used for route recording and is not shared with any third parties.',
    [{ text: 'OK' }],
  );
};
