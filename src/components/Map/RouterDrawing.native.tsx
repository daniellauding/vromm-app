import { Marker, Polyline } from '../MapView';
import { View } from 'react-native';

const RouterDrawing = ({
  routePath,
  penDrawingCoordinates,
  drawingMode,
  routePathColor = '#1A73E8',
  routePathWidth = 3,
  showStartEndMarkers = false,
}) => {
  if (!drawingMode) {
    return null;
  }

  return (
    <>
      {/* Display route path if provided */}
      {routePath && routePath.length > 1 && (
        <Polyline
          coordinates={routePath}
          strokeWidth={routePathWidth}
          strokeColor={routePathColor}
          lineJoin="round"
        />
      )}

      {/* Display pen drawing coordinates if provided */}
      {penDrawingCoordinates && penDrawingCoordinates.length > 1 && (
        <>
          {console.log(
            '🎨 [Map] Rendering pen drawing with',
            penDrawingCoordinates.length,
            'coordinates',
          )}
          <Polyline
            coordinates={penDrawingCoordinates}
            strokeWidth={8}
            strokeColor="#FF6B35"
            lineJoin="round"
            lineCap="round"
            geodesic={false}
          />
        </>
      )}

      {/* Show single pen drawing point as marker if only one point */}
      {penDrawingCoordinates && penDrawingCoordinates.length === 1 && (
        <>
          {console.log('🎨 [Map] Rendering single pen drawing point:', penDrawingCoordinates[0])}
          <Marker
            coordinate={penDrawingCoordinates[0]}
            title="Pen Drawing"
            description="Single drawn point"
            pinColor="orange"
          />
        </>
      )}

      {/* Display start and end markers for recorded routes */}
      {showStartEndMarkers && routePath && routePath.length > 1 && (
        <>
          {/* Start marker (green) */}
          <Marker coordinate={routePath[0]} anchor={{ x: 0.5, y: 1 }}>
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: '#22C55E',
                borderRadius: 10,
                borderWidth: 2,
                borderColor: 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            />
          </Marker>

          {/* End marker (red) */}
          <Marker coordinate={routePath[routePath.length - 1]} anchor={{ x: 0.5, y: 1 }}>
            <View
              style={{
                width: 20,
                height: 20,
                backgroundColor: '#EF4444',
                borderRadius: 10,
                borderWidth: 2,
                borderColor: 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            />
          </Marker>
        </>
      )}
    </>
  );
};

export default RouterDrawing;
