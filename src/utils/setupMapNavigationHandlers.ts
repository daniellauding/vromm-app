import { RecordedRouteData } from '../components/RecordDrivingSheet';

/**
 * Sets up global navigation handlers that can be used by components outside the navigation context
 * This should be called from a screen component that has access to navigation
 *
 * @param navigation The navigation object from useNavigation()
 * @returns A cleanup function to remove the handlers
 */
export const setupMapNavigationHandlers = (navigation: any): (() => void) => {
  console.log('Setting up global navigation handlers');

  // Handler for navigating to CreateRouteScreen
  (global as any).navigateToCreateRoute = (routeData: RecordedRouteData) => {
    console.log('Global navigateToCreateRoute handler called');

    setTimeout(() => {
      try {
        navigation.navigate('CreateRoute', {
          initialWaypoints: routeData.waypoints,
          initialName: routeData.name,
          initialDescription: routeData.description,
          initialSearchCoordinates: routeData.searchCoordinates,
          initialRoutePath: routeData.routePath,
          initialStartPoint: routeData.startPoint,
          initialEndPoint: routeData.endPoint,
        });
        console.log('Navigation to CreateRoute triggered');
      } catch (err) {
        console.error('Error in global navigation handler:', err);
      }
    }, 300);
  };

  // Return a cleanup function
  return () => {
    console.log('Cleaning up global navigation handlers');
    delete (global as any).navigateToCreateRoute;
  };
};

/**
 * Checks if there is a pending route creation request and handles it
 * This should be called from the MapScreen's useEffect
 *
 * @param navigation The navigation object from useNavigation()
 * @returns true if a pending request was handled, false otherwise
 */
export const checkPendingRouteCreation = (navigation: any): boolean => {
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
