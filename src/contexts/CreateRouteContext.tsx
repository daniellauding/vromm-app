import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Database } from '../lib/database.types';
import { Exercise, MediaItem, Waypoint } from '../types/route';

type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type SpotType = Database['public']['Enums']['spot_type'];
type SpotVisibility = Database['public']['Enums']['spot_visibility'];
type Category = Database['public']['Enums']['spot_category'];

export interface CreateRouteFormData {
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  spot_type: SpotType;
  visibility: SpotVisibility;
  best_season: string;
  best_times: string;
  vehicle_types: string[];
  activity_level: string;
  spot_subtype: string;
  transmission_type: string;
  category: Category;
}

export interface CreateRouteState {
  // Form data
  formData: CreateRouteFormData;
  
  // Route data
  waypoints: Waypoint[];
  exercises: Exercise[];
  media: MediaItem[];
  
  // Drawing state
  drawingMode: 'pin' | 'waypoint' | 'pen' | 'record';
  snapToRoads: boolean;
  penPath: Array<{ latitude: number; longitude: number }>;
  routePath: Array<{ latitude: number; longitude: number }> | null;
  
  // Map state
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  
  // UI state
  activeSection: string;
  searchQuery: string;
  youtubeLink: string;
  
  // Recording context
  isFromRecording: boolean;
  originalRouteId?: string;
}

export interface RecordedRouteData {
  waypoints: Waypoint[];
  name: string;
  description: string;
  searchCoordinates: string;
  routePath: Array<{ latitude: number; longitude: number }>;
  startPoint?: { latitude: number; longitude: number };
  endPoint?: { latitude: number; longitude: number };
}

interface CreateRouteContextType {
  // State
  persistedState: CreateRouteState | null;
  
  // Actions
  saveState: (state: CreateRouteState) => void;
  restoreState: () => CreateRouteState | null;
  clearState: () => void;
  
  // Recording integration
  setRecordingContext: (routeId?: string) => void;
  getAndClearRecordingContext: () => string | null;
  mergeRecordedData: (recordedData: RecordedRouteData) => CreateRouteState | null;
  
  // Navigation tracking
  markFromRecording: () => void;
  isFromRecording: () => boolean;
  clearRecordingFlag: () => void;
}

const defaultFormData: CreateRouteFormData = {
  name: '',
  description: '',
  difficulty: 'beginner',
  spot_type: 'urban',
  visibility: 'public',
  best_season: 'all',
  best_times: 'anytime',
  vehicle_types: ['passenger_car'],
  activity_level: 'moderate',
  spot_subtype: 'standard',
  transmission_type: 'both',
  category: 'parking',
};

const defaultRegion = {
  latitude: 55.7047,
  longitude: 13.191,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const CreateRouteContext = createContext<CreateRouteContextType | undefined>(undefined);

export function CreateRouteProvider({ children }: { children: ReactNode }) {
  const [persistedState, setPersistedState] = useState<CreateRouteState | null>(null);
  const [recordingContext, setRecordingContext] = useState<string | null>(null);
  const [fromRecordingFlag, setFromRecordingFlag] = useState(false);

  const saveState = (state: CreateRouteState) => {
    console.log('🔄 Saving CreateRoute state:', {
      waypointsCount: state.waypoints.length,
      formName: state.formData.name,
      drawingMode: state.drawingMode,
      activeSection: state.activeSection,
    });
    setPersistedState(state);
  };

  const restoreState = (): CreateRouteState | null => {
    console.log('🔄 Restoring CreateRoute state:', {
      hasPersistedState: !!persistedState,
      waypointsCount: persistedState?.waypoints.length || 0,
    });
    return persistedState;
  };

  const clearState = () => {
    console.log('🔄 Clearing CreateRoute state');
    setPersistedState(null);
    setRecordingContext(null);
    setFromRecordingFlag(false);
  };

  const setRecordingContextHandler = (routeId?: string) => {
    console.log('🔄 Setting recording context:', { routeId });
    setRecordingContext(routeId || null);
  };

  const getAndClearRecordingContext = (): string | null => {
    const context = recordingContext;
    console.log('🔄 Getting and clearing recording context:', { context });
    setRecordingContext(null);
    return context;
  };

  const mergeRecordedData = (recordedData: RecordedRouteData): CreateRouteState | null => {
    console.log('🔄 Merging recorded data with persisted state:', {
      hasPersistedState: !!persistedState,
      recordedWaypointsCount: recordedData.waypoints.length,
      recordedName: recordedData.name,
    });

    if (!persistedState) {
      // No persisted state, create new state with recorded data
      return {
        formData: {
          ...defaultFormData,
          name: recordedData.name || '',
          description: recordedData.description || '',
        },
        waypoints: recordedData.waypoints,
        exercises: [],
        media: [],
        drawingMode: 'record',
        snapToRoads: false,
        penPath: [],
        routePath: recordedData.routePath,
        region: calculateRegionFromWaypoints(recordedData.waypoints) || defaultRegion,
        activeSection: 'basic',
        searchQuery: recordedData.searchCoordinates || '',
        youtubeLink: '',
        isFromRecording: true,
      };
    }

    // Merge recorded data with persisted state
    const mergedState: CreateRouteState = {
      ...persistedState,
      // Override with recorded route data
      waypoints: recordedData.waypoints,
      routePath: recordedData.routePath,
      drawingMode: 'record',
      region: calculateRegionFromWaypoints(recordedData.waypoints) || persistedState.region,
      searchQuery: recordedData.searchCoordinates || persistedState.searchQuery,
      isFromRecording: true,
      // Keep existing form data but update with recorded info if user hasn't entered anything
      formData: {
        ...persistedState.formData,
        name: persistedState.formData.name || recordedData.name || '',
        description: persistedState.formData.description || recordedData.description || '',
      },
    };

    console.log('🔄 Merged state created:', {
      waypointsCount: mergedState.waypoints.length,
      formName: mergedState.formData.name,
      drawingMode: mergedState.drawingMode,
    });

    return mergedState;
  };

  const markFromRecording = () => {
    console.log('🔄 Marking as from recording');
    setFromRecordingFlag(true);
  };

  const isFromRecording = (): boolean => {
    return fromRecordingFlag;
  };

  const clearRecordingFlag = () => {
    console.log('🔄 Clearing recording flag');
    setFromRecordingFlag(false);
  };

  const value: CreateRouteContextType = {
    persistedState,
    saveState,
    restoreState,
    clearState,
    setRecordingContext: setRecordingContextHandler,
    getAndClearRecordingContext,
    mergeRecordedData,
    markFromRecording,
    isFromRecording,
    clearRecordingFlag,
  };

  return <CreateRouteContext.Provider value={value}>{children}</CreateRouteContext.Provider>;
}

export function useCreateRoute() {
  const context = useContext(CreateRouteContext);
  if (context === undefined) {
    throw new Error('useCreateRoute must be used within a CreateRouteProvider');
  }
  return context;
}

// Helper function to calculate region from waypoints
function calculateRegionFromWaypoints(
  waypoints: Waypoint[]
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null {
  if (!waypoints || waypoints.length === 0) {
    return null;
  }

  if (waypoints.length === 1) {
    return {
      latitude: waypoints[0].latitude,
      longitude: waypoints[0].longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }

  const latitudes = waypoints.map((wp) => wp.latitude);
  const longitudes = waypoints.map((wp) => wp.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.2, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.2, 0.02),
  };
} 