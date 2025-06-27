import { RecordedRouteData } from '../components/RecordDrivingSheet';

// Set up a global navigation handler for route recording with context support
export const setupRouteRecordingNavigation = (navigation: any, createRouteContext?: any) => {
  // Create a global function to handle navigation to CreateRouteScreen
  (global as any).navigateToCreateRoute = (routeData: RecordedRouteData) => {
    console.log('🚀 Global navigation handler called with route data');
    console.log('🚀 Recorded route data:', {
      waypointsCount: routeData.waypoints.length,
      name: routeData.name,
      hasContext: !!createRouteContext,
    });

    if (createRouteContext) {
      // Check if user was in CreateRoute before recording
      const recordingContext = createRouteContext.getAndClearRecordingContext();
      const hasPersistedState = !!createRouteContext.persistedState;
      
      console.log('🚀 Recording context check:', {
        recordingContext,
        hasPersistedState,
        shouldMerge: recordingContext !== null || hasPersistedState,
      });

      if (recordingContext !== null || hasPersistedState) {
        // User came from CreateRoute - merge recorded data with persisted state
        console.log('🚀 Merging recorded data with persisted state');
        
        const mergedState = createRouteContext.mergeRecordedData(routeData);
        if (mergedState) {
          // Update the persisted state with merged data
          createRouteContext.saveState(mergedState);
          
          // Mark as coming from recording for state restoration
          createRouteContext.markFromRecording();
          
          console.log('🚀 State merged and marked for restoration');
        }

        // Navigate back to CreateRoute - it will restore the merged state
        setTimeout(() => {
          navigation.navigate('CreateRoute', {});
        }, 100);
        
        return;
      }
    }

    // Fallback: Standard navigation with route data (no context integration)
    console.log('🚀 Using fallback navigation (no context)');
    setTimeout(() => {
      navigation.navigate('CreateRoute', {
        initialWaypoints: routeData.waypoints,
        initialName: routeData.name,
        initialDescription: routeData.description,
        initialSearchCoordinates: routeData.searchCoordinates,
        initialRoutePath: routeData.routePath,
        initialStartPoint: routeData.startPoint,
        initialEndPoint: routeData.endPoint,
      });
    }, 100); // Small delay to ensure modal is fully closed
  };

  return () => {
    // Cleanup function to remove the global navigation handler
    delete (global as any).navigateToCreateRoute;
  };
};

// Check if there's a pending route creation request
export const checkPendingRouteCreation = (navigation: any) => {
  if ((global as any).shouldOpenCreateRoute && (global as any).recordedRouteData) {
    console.log('Found pending route creation request');
    const routeData = (global as any).recordedRouteData;

    // Clear the global state
    (global as any).shouldOpenCreateRoute = false;
    (global as any).recordedRouteData = null;

    // Navigate to CreateRouteScreen
    setTimeout(() => {
      navigation.navigate('CreateRoute', {
        initialWaypoints: routeData.waypoints,
        initialName: routeData.name,
        initialDescription: routeData.description,
        initialSearchCoordinates: routeData.searchCoordinates,
        initialRoutePath: routeData.routePath,
        initialStartPoint: routeData.startPoint,
        initialEndPoint: routeData.endPoint,
      });
    }, 100);

    return true;
  }

  return false;
};
