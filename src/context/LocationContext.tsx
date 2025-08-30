import { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

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

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const getSafeCurrentLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      const provider = await Location.getProviderStatusAsync();
      if (!provider.locationServicesEnabled) {
        // Location services are off (common on simulator) – don't spam errors
        return null;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) return lastKnown;

      return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    } catch (e) {
      if (__DEV__) {
        // Reduce noise in production builds
        // eslint-disable-next-line no-console
        console.warn('Location: fallback failed, proceeding without location');
      }
      return null;
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('Error checking location permission');
      }
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
        const location = await getSafeCurrentLocation();
        if (location) setCurrentLocation(location);
      }
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('Error requesting location permission');
      }
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
      const location = await getSafeCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
      return location;
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('Error getting current location');
      }
      setError('Unable to get current location');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Set user location data and persist it
  const setUserLocation = async (location: UserLocationData) => {
    setUserLocationState(location);
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(USER_LOCATION_STORAGE_KEY, JSON.stringify(location));
      console.log('✅ Saved user location to storage:', location);
    } catch (error) {
      console.error('Error saving user location to storage:', error);
    }
  };

  // Load user location from profile or storage
  const loadUserLocationFromProfile = async () => {
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
  };

  // Load user location on mount
  useEffect(() => {
    loadUserLocationFromProfile();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        locationPermission,
        currentLocation,
        userLocation,
        loading,
        error,
        requestLocationPermission,
        getCurrentLocation,
        setUserLocation,
        loadUserLocationFromProfile,
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
