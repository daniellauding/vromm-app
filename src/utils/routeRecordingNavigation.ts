import { RecordedRouteData } from '../components/RecordDrivingSheet';

// Set up a global navigation handler for route recording
export const setupRouteRecordingNavigation = (navigation: any) => {
  // Create a global function to handle navigation to CreateRouteScreen
  (global as any).navigateToCreateRoute = (routeData: RecordedRouteData) => {
    console.log('Global navigation handler called with route data');

    // Navigate to CreateRouteScreen with the recorded route data
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
