import React, { useRef, useState, useCallback } from 'react';
import { View, PanResponder, Alert, Platform } from 'react-native';
import { Text, XStack, YStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

export interface Waypoint {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
}

export interface RouteMapEditorProps {
  waypoints: Waypoint[];
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  drawingMode: 'pin' | 'waypoint' | 'pen' | 'record';
  onDrawingModeChange: (mode: 'pin' | 'waypoint' | 'pen' | 'record') => void;
  penPath: Array<{ latitude: number; longitude: number }>;
  onPenPathChange: (path: Array<{ latitude: number; longitude: number }>) => void;
  routePath?: Array<{ latitude: number; longitude: number }>;
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChange: (region: any) => void;
  onRecord?: () => void;
  isDrawing?: boolean;
  onDrawingChange?: (isDrawing: boolean) => void;
  initialWaypoints?: Waypoint[];
  colorScheme?: 'light' | 'dark';
}

export function RouteMapEditor({
  waypoints,
  onWaypointsChange,
  drawingMode,
  onDrawingModeChange,
  penPath,
  onPenPathChange,
  routePath,
  region,
  onRegionChange,
  onRecord,
  isDrawing = false,
  onDrawingChange,
  initialWaypoints,
  colorScheme = 'dark',
}: RouteMapEditorProps) {
  const mapRef = useRef<MapView>(null);

  const containerRef = useRef<View>(null);
  const lastDrawPointRef = useRef<{
    latitude: number;
    longitude: number;
    timestamp?: number;
  } | null>(null);
  const drawingRef = useRef(false);
  const [undoneWaypoints, setUndoneWaypoints] = useState<Waypoint[]>([]);

  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  const handlePinMode = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const [result] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        const title = result?.street
          ? `${result.street}${result.streetNumber ? ` ${result.streetNumber}` : ''}`
          : 'Custom Location';

        const description =
          [result?.city, result?.region, result?.country].filter(Boolean).join(', ') ||
          'Added via map pin';

        const newWaypoint = {
          latitude,
          longitude,
          title,
          description,
        };

        onWaypointsChange([newWaypoint]);
        setUndoneWaypoints([]);
      } catch (error) {
        console.error('Error with pin mode:', error);
        const newWaypoint = {
          latitude,
          longitude,
          title: 'Custom Location',
          description: 'Added via map pin',
        };
        onWaypointsChange([newWaypoint]);
        setUndoneWaypoints([]);
      }
    },
    [onWaypointsChange],
  );

  const handleWaypointMode = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const waypointNumber = waypoints.length + 1;
        // Create waypoint immediately to prevent UI lag
        const newWaypoint = {
          latitude,
          longitude,
          title: `Waypoint ${waypointNumber}`,
          description: `Route waypoint ${waypointNumber}`,
        };

        // Add waypoint immediately
        const updatedWaypoints = [...waypoints, newWaypoint];
        onWaypointsChange(updatedWaypoints);
        setUndoneWaypoints([]);

        // Try to get address in background with delay to prevent rate limiting
        setTimeout(async () => {
          try {
            const [result] = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });

            if (result?.street) {
              const addressTitle = `${result.street}${result.streetNumber ? ` ${result.streetNumber}` : ''}`;
              const addressDescription =
                [result?.city, result?.region, result?.country].filter(Boolean).join(', ') ||
                `Waypoint ${waypointNumber} description`;

              // Update the specific waypoint with real address
              const waypointsWithAddress = updatedWaypoints.map((wp, index) =>
                index === updatedWaypoints.length - 1
                  ? { ...wp, title: addressTitle, description: addressDescription }
                  : wp,
              );
              onWaypointsChange(waypointsWithAddress);
            }
          } catch (err) {
            // Silent fail for address lookup
          }
        }, 500);
      } catch (error) {
        console.error('🗺️ ❌ Error adding waypoint:', error);
        const waypointNumber = waypoints.length + 1;
        const newWaypoint = {
          latitude,
          longitude,
          title: `Waypoint ${waypointNumber}`,
          description: `Waypoint ${waypointNumber} description`,
        };
        onWaypointsChange([...waypoints, newWaypoint]);
        setUndoneWaypoints([]);
      }
    },
    [onWaypointsChange, waypoints],
  );

  const startContinuousDrawing = useCallback(
    (latitude: number, longitude: number) => {
      const newPoint = { latitude, longitude };

      // Clear any existing pen path and start fresh
      onPenPathChange([newPoint]);
      lastDrawPointRef.current = { ...newPoint, timestamp: Date.now() };
      drawingRef.current = true;
      onDrawingChange?.(true);
    },
    [onPenPathChange, onDrawingChange],
  );

  const handlePenMode = useCallback(
    (latitude: number, longitude: number) => {
      if (!isDrawing) {
        startContinuousDrawing(latitude, longitude);
      }
    },
    [isDrawing, startContinuousDrawing],
  );

  // Handle map press events
  const handleMapPress = useCallback(
    (e: any) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;

      switch (drawingMode) {
        case 'pin':
          handlePinMode(latitude, longitude);
          break;
        case 'waypoint':
          handleWaypointMode(latitude, longitude);
          break;
        case 'pen':
          handlePenMode(latitude, longitude);
          break;
        case 'record':
          // Record mode doesn't use map press
          break;
      }
    },
    [drawingMode, handlePinMode, handleWaypointMode, handlePenMode],
  );

  const addContinuousDrawingPoint = useCallback(
    (latitude: number, longitude: number) => {
      if (!drawingRef.current) return;

      const newPoint = { latitude, longitude };

      // Check distance from last point to avoid too many close points
      if (lastDrawPointRef.current) {
        const distance = Math.sqrt(
          Math.pow(latitude - lastDrawPointRef.current.latitude, 2) +
            Math.pow(longitude - lastDrawPointRef.current.longitude, 2),
        );

        // Only add point if it's far enough from the last one
        if (distance < 0.0001) return; // Approximately 10 meters
      }

      onPenPathChange([...penPath, newPoint]);
      lastDrawPointRef.current = { ...newPoint, timestamp: Date.now() };
    },
    [onPenPathChange, penPath, lastDrawPointRef],
  );

  const finishPenDrawing = useCallback(() => {
    if (penPath.length === 0) return;

    drawingRef.current = false;
    onDrawingChange?.(false);

    // Convert pen path to waypoints for easier handling
    const newWaypoints = penPath.map((point, index) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      title: `Drawing Point ${index + 1}`,
      description: `Point ${index + 1} from pen drawing`,
    }));

    onWaypointsChange(newWaypoints);
    setUndoneWaypoints([]);
  }, [onWaypointsChange, penPath, onDrawingChange]);

  // Pan responder for pen drawing with improved coordinate handling (matching CreateRouteScreen)
  const drawingPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only capture in pen mode with single touch
      const shouldCapture = drawingMode === 'pen' && evt.nativeEvent.touches.length === 1;
      return shouldCapture;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Capture pen drawing movement
      if (drawingMode === 'pen' && evt.nativeEvent.touches.length === 1) {
        // Only capture if user has moved enough (avoid accidental captures)
        const hasMovedEnough = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        return hasMovedEnough;
      }
      return false;
    },
    onPanResponderTerminationRequest: () => {
      // Don't allow termination during active pen drawing
      const shouldTerminate = !(drawingMode === 'pen' && drawingRef.current);
      return shouldTerminate;
    },
    onShouldBlockNativeResponder: () => {
      // Block native responder in pen mode to prevent map interference
      const shouldBlock = drawingMode === 'pen';
      return shouldBlock;
    },
    onPanResponderGrant: (evt) => {
      if (drawingMode === 'pen' && evt.nativeEvent.touches.length === 1) {
        const { locationX, locationY } = evt.nativeEvent;

        // Set drawing state immediately to block map interactions
        drawingRef.current = true;
        onDrawingChange?.(true);

        // Try coordinate conversion, fallback to approximate method
        if (mapRef.current && mapRef.current.coordinateForPoint) {
          mapRef.current
            .coordinateForPoint({ x: locationX, y: locationY })
            .then((coordinate: { latitude: number; longitude: number }) => {
              startContinuousDrawing(coordinate.latitude, coordinate.longitude);
            })
            .catch(() => {
              // Fallback: Start at region center
              startContinuousDrawing(region.latitude, region.longitude);
            });
        } else {
          // If coordinate conversion not available, start at region center
          startContinuousDrawing(region.latitude, region.longitude);
        }
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      if (drawingMode === 'pen' && drawingRef.current && evt.nativeEvent.touches.length === 1) {
        const { locationX, locationY } = evt.nativeEvent;

        // Throttle updates to prevent lag (reduced to 30ms for smoother drawing)
        const now = Date.now();
        if (now - (lastDrawPointRef.current?.timestamp || 0) < 30) {
          return;
        }

        if (mapRef.current && mapRef.current.coordinateForPoint) {
          mapRef.current
            .coordinateForPoint({ x: locationX, y: locationY })
            .then((coordinate: { latitude: number; longitude: number }) => {
              addContinuousDrawingPoint(coordinate.latitude, coordinate.longitude);
              lastDrawPointRef.current = { ...coordinate, timestamp: now };
            })
            .catch(() => {
              // If coordinate conversion fails, approximate based on gesture
              const lastPoint = lastDrawPointRef.current;
              if (lastPoint) {
                // Simple approximation based on gesture movement
                const deltaLat = gestureState.dy * 0.0001; // Rough conversion
                const deltaLng = gestureState.dx * 0.0001;
                const newCoordinate = {
                  latitude: lastPoint.latitude + deltaLat,
                  longitude: lastPoint.longitude + deltaLng,
                };

                addContinuousDrawingPoint(newCoordinate.latitude, newCoordinate.longitude);
                lastDrawPointRef.current = { ...newCoordinate, timestamp: now };
              }
            });
        }
      }
    },
    onPanResponderRelease: () => {
      if (drawingMode === 'pen') {
        drawingRef.current = false;
        // Note: Keep isDrawing true so user can continue drawing if they want
        // Map interactions will be restored since drawingRef.current is now false
      }
    },
  });

  const handleLocateMe = useCallback(async () => {
    try {
      // Check current permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();

      if (currentStatus.status === 'granted') {
        // Permission already granted, get location
        const location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        onRegionChange(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        return;
      }

      // Request permission - this shows the native dialog
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        // Permission granted, get location
        const location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        onRegionChange(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
      } else {
        // Permission denied, show helpful message
        Alert.alert(
          '📍 Location Permission Required',
          'To use "Locate Me", please enable location access for this app in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: handleLocateMe },
          ],
        );
      }
    } catch (error) {
      console.error('🗺️ [RouteMapEditor] Error getting location:', error);
    }
  }, [onRegionChange, mapRef]);

  const handleUndo = useCallback(() => {
    if (waypoints.length > 0) {
      const lastWaypoint = waypoints[waypoints.length - 1];
      setUndoneWaypoints([...undoneWaypoints, lastWaypoint]);
      onWaypointsChange(waypoints.slice(0, -1));
    }
  }, [onWaypointsChange, waypoints, undoneWaypoints]);

  const handleRedo = useCallback(() => {
    if (undoneWaypoints.length > 0) {
      const waypointToRestore = undoneWaypoints[undoneWaypoints.length - 1];
      setUndoneWaypoints(undoneWaypoints.slice(0, -1));
      onWaypointsChange([...waypoints, waypointToRestore]);
    }
  }, [onWaypointsChange, waypoints, undoneWaypoints]);

  const clearAllWaypoints = useCallback(() => {
    setUndoneWaypoints([]);
    onWaypointsChange([]);
    onPenPathChange([]);
    drawingRef.current = false;
    onDrawingChange?.(false);
    lastDrawPointRef.current = null;
  }, [onWaypointsChange, onPenPathChange, onDrawingChange]);

  return (
    <YStack gap="$4">
      {/* Drawing Mode Controls */}
      <YStack gap="$4">
        {/* <Text fontSize="$6" fontWeight="600">Drawing Mode</Text>
        <Text size="sm" color="$gray11">
          Choose how to create your route
        </Text> */}

        <XStack gap="$2" flexWrap="wrap">
          <Button
            variant={drawingMode === 'pin' ? 'secondary' : 'tertiary'}
            onPress={() => onDrawingModeChange('pin')}
            size="md"
            flex={1}
            backgroundColor={drawingMode === 'pin' ? '$blue10' : '$backgroundHover'}
          >
            <XStack gap="$2" alignItems="center">
              <Feather
                name="map-pin"
                size={16}
                color={drawingMode === 'pin' ? 'white' : iconColor}
              />
              <Text color={drawingMode === 'pin' ? 'white' : '$color'}>Pin</Text>
            </XStack>
          </Button>

          <Button
            variant={drawingMode === 'waypoint' ? 'secondary' : 'tertiary'}
            onPress={() => onDrawingModeChange('waypoint')}
            size="md"
            flex={1}
            backgroundColor={drawingMode === 'waypoint' ? '$blue10' : '$backgroundHover'}
          >
            <XStack gap="$2" alignItems="center">
              <Feather
                name="navigation"
                size={16}
                color={drawingMode === 'waypoint' ? 'white' : iconColor}
              />
              <Text color={drawingMode === 'waypoint' ? 'white' : '$color'}>Waypoints</Text>
            </XStack>
          </Button>

          <Button
            variant={drawingMode === 'pen' ? 'secondary' : 'tertiary'}
            onPress={() => onDrawingModeChange('pen')}
            size="md"
            flex={1}
            backgroundColor={drawingMode === 'pen' ? '$blue10' : '$backgroundHover'}
          >
            <XStack gap="$2" alignItems="center">
              <Feather
                name="edit-3"
                size={16}
                color={drawingMode === 'pen' ? 'white' : iconColor}
              />
              <Text color={drawingMode === 'pen' ? 'white' : '$color'}>Draw</Text>
            </XStack>
          </Button>

          <Button
            variant={drawingMode === 'record' ? 'secondary' : 'tertiary'}
            onPress={() => {
              onDrawingModeChange('record');
              onRecord?.();
            }}
            size="md"
            flex={1}
            backgroundColor={drawingMode === 'record' ? '$blue10' : '$backgroundHover'}
          >
            <XStack gap="$2" alignItems="center">
              <Feather
                name="circle"
                size={16}
                color={drawingMode === 'record' ? 'white' : iconColor}
              />
              <Text color={drawingMode === 'record' ? 'white' : '$color'}>Record</Text>
            </XStack>
          </Button>
        </XStack>

        {/* Mode descriptions */}
        <Text size="sm" color="$gray10">
          {drawingMode === 'pin' && 'Drop a single location marker'}
          {drawingMode === 'waypoint' &&
            'Create discrete waypoints connected by lines (minimum 2 required)'}
          {drawingMode === 'pen' && 'Freehand drawing: click and drag to draw continuous lines'}
          {drawingMode === 'record' && initialWaypoints?.length
            ? 'Recorded route loaded • Click Record Again to start new recording'
            : 'GPS-based live route recording with real-time stats'}
        </Text>

        {/* Record Again Button when in record mode with existing route */}
        {drawingMode === 'record' && initialWaypoints?.length && (
          <Button
            onPress={onRecord}
            variant="secondary"
            backgroundColor="$green10"
            size="lg"
            marginTop="$2"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="circle" size={20} color="white" />
              <Text color="white" weight="bold">
                Record Again
              </Text>
            </XStack>
          </Button>
        )}
      </YStack>

      {/* Map View */}
      <View
        ref={containerRef}
        style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}
        {...(drawingMode === 'pen' ? drawingPanResponder.panHandlers : {})}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          region={region}
          onPress={handleMapPress}
          scrollEnabled={!(drawingMode === 'pen' && (isDrawing || drawingRef.current))}
          zoomEnabled={!(drawingMode === 'pen' && (isDrawing || drawingRef.current))}
          pitchEnabled={!(drawingMode === 'pen' && (isDrawing || drawingRef.current))}
          rotateEnabled={!(drawingMode === 'pen' && (isDrawing || drawingRef.current))}
          moveOnMarkerPress={false}
          showsUserLocation={true}
          userInterfaceStyle="dark"
          zoomTapEnabled={!(drawingMode === 'pen' && (isDrawing || drawingRef.current))}
          scrollDuringRotateOrZoomEnabled={
            !(drawingMode === 'pen' && (isDrawing || drawingRef.current))
          }
          onTouchStart={() => {
            if (drawingMode === 'pen') {
              console.log('🎨 Map touch start in pen mode - should be blocked');
            }
          }}
          onTouchEnd={() => {
            if (drawingMode === 'pen') {
              console.log('🎨 Map touch end in pen mode');
            }
          }}
        >
          {/* Render waypoints as individual markers (not in pen drawing mode) */}
          {drawingMode !== 'pen' &&
            waypoints.map((waypoint, index) => {
              const isFirst = index === 0;
              const isLast = index === waypoints.length - 1 && waypoints.length > 1;
              const markerColor = isFirst ? 'green' : isLast ? 'red' : 'blue';

              return (
                <Marker
                  key={`waypoint-${index}`}
                  coordinate={{
                    latitude: waypoint.latitude,
                    longitude: waypoint.longitude,
                  }}
                  title={waypoint.title}
                  description={waypoint.description}
                  pinColor={markerColor}
                />
              );
            })}

          {/* Render pen drawing as smooth continuous line */}
          {drawingMode === 'pen' && penPath.length > 0 && (
            <>
              {/* Show single point as a marker if only one point */}
              {penPath.length === 1 && (
                <Marker
                  coordinate={penPath[0]}
                  title="Drawing Start"
                  description="Drag to continue drawing"
                  pinColor="orange"
                />
              )}

              {/* Show continuous line for multiple points */}
              {penPath.length > 1 && (
                <Polyline
                  coordinates={penPath}
                  strokeWidth={8}
                  strokeColor="#FF6B35"
                  lineJoin="round"
                  lineCap="round"
                  geodesic={false}
                />
              )}
            </>
          )}

          {/* Render connecting lines for waypoints when there are 2+ waypoints (except in pen mode) */}
          {drawingMode !== 'pen' && waypoints.length > 1 && (
            <Polyline
              coordinates={waypoints.map((wp) => ({
                latitude: wp.latitude,
                longitude: wp.longitude,
              }))}
              strokeWidth={4}
              strokeColor="#1A73E8"
              lineJoin="round"
              lineCap="round"
              geodesic={true}
            />
          )}

          {/* Render route path if provided */}
          {routePath && routePath.length > 1 && (
            <Polyline
              coordinates={routePath}
              strokeWidth={drawingMode === 'record' ? 5 : 3}
              strokeColor={drawingMode === 'record' ? '#22C55E' : '#1A73E8'}
              lineJoin="round"
              lineCap="round"
            />
          )}
        </MapView>

        {/* Map Controls - Top Right */}
        <XStack position="absolute" top={16} right={16} gap="$2">
          <Button
            onPress={handleUndo}
            disabled={waypoints.length === 0}
            variant="secondary"
            backgroundColor="rgba(0,0,0,0.7)"
            size="sm"
          >
            <Feather name="corner-up-left" size={16} color="white" />
          </Button>

          <Button
            onPress={handleRedo}
            disabled={undoneWaypoints.length === 0}
            variant="secondary"
            backgroundColor="rgba(0,0,0,0.7)"
            size="sm"
          >
            <Feather name="corner-up-right" size={16} color="white" />
          </Button>
        </XStack>

        {/* Zoom Controls - Top Left */}
        <YStack position="absolute" top={16} left={16} gap="$2">
          <Button
            onPress={() => {
              const newRegion = {
                ...region,
                latitudeDelta: region.latitudeDelta * 0.5,
                longitudeDelta: region.longitudeDelta * 0.5,
              };
              onRegionChange(newRegion);
            }}
            variant="secondary"
            backgroundColor="rgba(0,0,0,0.7)"
            size="sm"
          >
            <Feather name="plus" size={16} color="white" />
          </Button>

          <Button
            onPress={() => {
              const newRegion = {
                ...region,
                latitudeDelta: region.latitudeDelta * 2,
                longitudeDelta: region.longitudeDelta * 2,
              };
              onRegionChange(newRegion);
            }}
            variant="secondary"
            backgroundColor="rgba(0,0,0,0.7)"
            size="sm"
          >
            <Feather name="minus" size={16} color="white" />
          </Button>
        </YStack>

        <Button
          position="absolute"
          bottom={16}
          left={16}
          onPress={handleLocateMe}
          variant="primary"
          backgroundColor="$blue10"
          size="md"
          opacity={0.9}
          pressStyle={{ opacity: 0.7 }}
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="crosshair" size={20} color="white" />
            <Text color="white">Locate Me</Text>
          </XStack>
        </Button>

        {/* Drawing Mode Indicator */}
        <View
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            ...(Platform.OS === 'web'
              ? { transform: 'translateX(-50px)' as any }
              : { transform: [{ translateX: -50 }] }),
            backgroundColor: drawingMode === 'pen' ? 'rgba(255,107,53,0.9)' : 'rgba(0,0,0,0.8)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Feather
            name={
              drawingMode === 'pin'
                ? 'map-pin'
                : drawingMode === 'waypoint'
                  ? 'navigation'
                  : drawingMode === 'pen'
                    ? 'edit-3'
                    : 'circle'
            }
            size={14}
            color="white"
          />
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
            {drawingMode === 'pin' && 'Tap to drop pin'}
            {drawingMode === 'waypoint' && 'Tap to add waypoints'}
            {drawingMode === 'pen' &&
              (isDrawing
                ? `Drawing (${penPath.length} points) • Pinch to zoom • Drag to continue`
                : waypoints.length > 0
                  ? `Finished (${penPath.length} coordinates) • Ready to save`
                  : 'Drag to draw • Two fingers to zoom/pan')}
            {drawingMode === 'record' &&
              (initialWaypoints?.length
                ? `Recorded route (${waypoints.length} waypoints) • Tap Record Again below`
                : 'Use Record button below')}
          </Text>
        </View>

        {/* Pen Drawing Controls */}
        {drawingMode === 'pen' && isDrawing && (
          <Button
            position="absolute"
            bottom={16}
            right={16}
            onPress={finishPenDrawing}
            variant="secondary"
            backgroundColor="$green10"
            size="md"
            opacity={0.9}
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="check" size={20} color="white" />
              <Text color="white">Finish</Text>
            </XStack>
          </Button>
        )}
      </View>

      {/* Waypoint Management Controls */}
      <XStack gap="$2" flexWrap="wrap">
        <Button
          onPress={handleUndo}
          disabled={waypoints.length === 0}
          variant="secondary"
          backgroundColor="$orange10"
          size="lg"
          flex={1}
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="corner-up-left" size={18} color="white" />
            <Text color="white">Undo</Text>
          </XStack>
        </Button>

        <Button
          onPress={clearAllWaypoints}
          disabled={waypoints.length === 0 && penPath.length === 0}
          variant="secondary"
          backgroundColor="$red10"
          size="lg"
          flex={1}
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="trash-2" size={18} color="white" />
            <Text color="white">Clear All</Text>
          </XStack>
        </Button>
      </XStack>

      {/* Current waypoint count and mode info */}
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$2">
        <Text size="sm" color="$gray11">
          {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''} • {drawingMode} mode
        </Text>
        {drawingMode === 'waypoint' && waypoints.length === 1 && (
          <Text size="sm" color="$orange10">
            Need 1 more waypoint minimum
          </Text>
        )}
        {drawingMode === 'pen' && (
          <Text
            size="sm"
            color={isDrawing ? '$orange10' : waypoints.length > 0 ? '$green10' : '$blue10'}
          >
            {isDrawing
              ? `Drawing (${penPath.length} points) • Drag to continue, pinch to zoom`
              : waypoints.length > 0
                ? `Finished (${penPath.length} coordinates → ${waypoints.length} waypoints)`
                : `Drawing mode (${penPath.length} points drawn) • Drag to draw, two fingers to zoom`}
          </Text>
        )}
        {drawingMode === 'record' && initialWaypoints?.length && (
          <Text size="sm" color="$green10">
            Recorded route loaded • {routePath?.length || 0} GPS points • Click Record Again to
            start new recording
          </Text>
        )}
      </XStack>
    </YStack>
  );
}
