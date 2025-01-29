import { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';

type LocationContextType = {
  locationPermission: boolean;
  currentLocation: Location.LocationObject | null;
  loading: boolean;
  error: string | null;
  requestLocationPermission: () => Promise<void>;
  getCurrentLocation: () => Promise<Location.LocationObject | null>;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (err) {
      console.error('Error checking location permission:', err);
      setError('Failed to check location permission');
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        // Get initial location if permission is granted
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setError('Failed to request location permission');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    if (!locationPermission) {
      setError('Location permission not granted');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      return location;
    } catch (err) {
      console.error('Error getting current location:', err);
      setError('Failed to get current location');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocationContext.Provider
      value={{
        locationPermission,
        currentLocation,
        loading,
        error,
        requestLocationPermission,
        getCurrentLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}; 