import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
interface UserLocationData {
  name: string;
  latitude: number;
  longitude: number;
  source: 'onboarding' | 'profile' | 'gps' | 'manual';
  timestamp: string;
}

type LocationContextType = {
  locationPermission: boolean;
  currentLocation: Location.LocationObject | null;
  userLocation: UserLocationData | null;
  loading: boolean;
  error: string | null;
  requestLocationPermission: () => Promise<void>;
  getCurrentLocation: () => Promise<Location.LocationObject | null>;
  setUserLocation: (location: UserLocationData) => Promise<void>;
  loadUserLocationFromProfile: () => Promise<void>;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const USER_LOCATION_STORAGE_KEY = 'vromm_user_location_data';

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [userLocation, setUserLocationState] = useState<UserLocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSafeCurrentLocation =
    React.useCallback(async (): Promise<Location.LocationObject | null> => {
      try {
        const provider = await Location.getProviderStatusAsync();
        if (!provider.locationServicesEnabled) {
          // Location services are off (common on simulator) – don't spam errors
          return null;
        }

        // Try last known position first (faster, less battery)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) return lastKnown;

        return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch (e) {
        // Suppress common simulator location errors
        if (__DEV__) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          if (
            !errorMessage.includes('kCLErrorDomain error 0') &&
            !errorMessage.includes('Cannot obtain current location')
          ) {
            console.warn('Location: fallback failed, proceeding without location');
          }
        }
        return null;
      }
    }, []);

  const checkLocationPermission = React.useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (err) {
      if (__DEV__) {
        console.warn('Error checking location permission');
      }
      setError('Failed to check location permission');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocationPermission = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      if (status === 'granted') {
        // Get initial location if permission is granted
        const location = await getSafeCurrentLocation();
        if (location) setCurrentLocation(location);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('Error requesting location permission');
      }
      setError('Failed to request location permission');
    } finally {
      setLoading(false);
    }
  }, [getSafeCurrentLocation]);

  const getCurrentLocation = React.useCallback(async () => {
    if (!locationPermission) {
      setError('Location permission not granted');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const location = await getSafeCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
      return location;
    } catch (err) {
      // Suppress location errors in development/simulator
      if (__DEV__) {
        // Only log if it's not a common simulator issue
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          !errorMessage.includes('kCLErrorDomain error 0') &&
          !errorMessage.includes('Cannot obtain current location')
        ) {
          console.warn('Error getting current location:', errorMessage);
        }
      }
      setError('Unable to get current location');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getSafeCurrentLocation, locationPermission]);

  // Set user location data and persist it
  const setUserLocation = React.useCallback(async (location: UserLocationData) => {
    setUserLocationState(location);

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(location));
      console.log('✅ Saved user location to storage:', location);
    } catch (error) {
      console.error('Error saving user location to storage:', error);
    }
  }, []);

  // Load user location from profile or storage
  const loadUserLocationFromProfile = React.useCallback(async () => {
    try {
      // First try to load from AsyncStorage
      const saved = await AsyncStorage.getItem(USER_LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed: UserLocationData = JSON.parse(saved);
        setUserLocationState(parsed);
        console.log('✅ Loaded user location from storage:', parsed);
      }
    } catch (error) {
      console.error('Error loading user location:', error);
    }
  }, []);

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  // Load user location on mount
  useEffect(() => {
    loadUserLocationFromProfile();
  }, [loadUserLocationFromProfile]);

  const contextValue: LocationContextType = React.useMemo(
    () => ({
      locationPermission,
      currentLocation,
      userLocation,
      loading,
      error,
      requestLocationPermission,
      getCurrentLocation,
      setUserLocation,
      loadUserLocationFromProfile,
    }),
    [
      locationPermission,
      currentLocation,
      userLocation,
      loading,
      error,
      requestLocationPermission,
      getCurrentLocation,
      setUserLocation,
      loadUserLocationFromProfile,
    ],
  );

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>;
}

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
