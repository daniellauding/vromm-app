import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, YStack, XStack, Button, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, Region } from '../MapView';
import { FormField } from '../FormField';
import { WizardRouteData } from '../RouteWizardSheet';

interface MapInteractionStepProps {
  data: WizardRouteData;
  onUpdate: (updates: Partial<WizardRouteData>) => void;
  onRecord: () => void;
}

export function MapInteractionStep({ data, onUpdate, onRecord }: MapInteractionStepProps) {
  const { t } = useTranslation();

  // Local state for map interaction
  const [region, setRegion] = useState<Region>({
    latitude: 55.7047,
    longitude: 13.191,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location.LocationGeocodedAddress[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoneWaypoints, setUndoneWaypoints] = useState<any[]>([]);

  // Refs for drawing
  const mapRef = useRef<any>(null);

  // Drawing mode options
  const drawingModes = [
    { key: 'pin', label: 'Pin', icon: 'map-pin', description: 'Drop a single location marker' },
    {
      key: 'waypoint',
      label: 'Waypoints',
      icon: 'navigation',
      description: 'Create multiple connected points',
    },
    { key: 'pen', label: 'Draw', icon: 'edit-3', description: 'Freehand drawing on map' },
    { key: 'record', label: 'Record', icon: 'circle', description: 'GPS-based live recording' },
  ];

  // Map press handler
  const handleMapPress = useCallback(
    (event: any) => {
      if (!event.nativeEvent?.coordinate) return;

      const { latitude, longitude } = event.nativeEvent.coordinate;

      switch (data.drawingMode) {
        case 'pin':
          // Replace existing pin
          onUpdate({
            waypoints: [
              {
                latitude,
                longitude,
                title: `Pin (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                description: 'Pin location',
              },
            ],
          });
          break;

        case 'waypoint': {
          // Add new waypoint
          const newWaypoint = {
            latitude,
            longitude,
            title: `Waypoint ${data.waypoints.length + 1}`,
            description: 'Route waypoint',
          };
          onUpdate({
            waypoints: [...data.waypoints, newWaypoint],
          });
          setUndoneWaypoints([]);
          break;
        }
        case 'pen':
          if (!isDrawing) {
            setIsDrawing(true);
            onUpdate({
              penPath: [{ latitude, longitude }],
            });
          } else {
            onUpdate({
              penPath: [...(data.penPath || []), { latitude, longitude }],
            });
          }
          break;
      }
    },
    [data.drawingMode, data.waypoints, data.penPath, isDrawing, onUpdate],
  );

  // Drawing mode change handler
  const handleDrawingModeChange = useCallback(
    (mode: 'pin' | 'waypoint' | 'pen' | 'record') => {
      if (mode === 'record') {
        onRecord();
        return;
      }

      onUpdate({ drawingMode: mode });

      // Reset drawing state when changing modes
      setIsDrawing(false);
      if (mode !== 'pen') {
        onUpdate({ penPath: [] });
      }
    },
    [onUpdate, onRecord],
  );

  // Finish pen drawing
  const finishPenDrawing = useCallback(() => {
    if (!data.penPath?.length) return;

    const newWaypoints = data.penPath.map((point, index) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      title:
        index === 0
          ? 'Drawing Start'
          : index === data.penPath!.length - 1
            ? 'Drawing End'
            : `Point ${index + 1}`,
      description: 'Drawing waypoint',
    }));

    onUpdate({
      waypoints: [...data.waypoints, ...newWaypoints],
    });
    setIsDrawing(false);
  }, [data.penPath, data.waypoints, onUpdate]);

  // Clear all waypoints
  const clearAllWaypoints = useCallback(() => {
    onUpdate({
      waypoints: [],
      penPath: [],
    });
    setIsDrawing(false);
    setUndoneWaypoints([]);
  }, [onUpdate]);

  // Undo last waypoint
  const handleUndo = useCallback(() => {
    if (data.waypoints.length > 0) {
      const lastWaypoint = data.waypoints[data.waypoints.length - 1];
      setUndoneWaypoints([lastWaypoint, ...undoneWaypoints]);
      onUpdate({
        waypoints: data.waypoints.slice(0, -1),
      });
    }
  }, [data.waypoints, undoneWaypoints, onUpdate]);

  // Location search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const addresses = await Promise.all(
          results.map(async (result) => {
            const address = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });
            return {
              ...address[0],
              coords: {
                latitude: result.latitude,
                longitude: result.longitude,
              },
            };
          }),
        );

        setSearchResults(addresses.filter(Boolean));
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, []);

  // Location select
  const handleLocationSelect = useCallback(
    (result: any) => {
      if (result.coords) {
        const { latitude, longitude } = result.coords;

        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        const title = [result.street, result.city, result.country].filter(Boolean).join(', ');

        if (data.drawingMode === 'pin') {
          onUpdate({
            waypoints: [
              {
                latitude,
                longitude,
                title,
                description: 'Searched location',
              },
            ],
          });
        }

        setSearchQuery(title);
        setShowSearchResults(false);
      }
    },
    [data.drawingMode, onUpdate],
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Ultra-Compact Drawing Mode Selection */}
      <YStack padding="$2" gap="$2">
        <XStack gap="$1" flexWrap="wrap">
          {drawingModes.map((mode) => (
            <Button
              key={mode.key}
              variant={data.drawingMode === mode.key ? 'secondary' : 'tertiary'}
              onPress={() => handleDrawingModeChange(mode.key as any)}
              size="sm"
              flex={1}
              backgroundColor={data.drawingMode === mode.key ? '$blue10' : '$backgroundHover'}
              paddingVertical="$1"
            >
              <XStack gap="$1" alignItems="center">
                <Feather
                  name={mode.icon as any}
                  size={12}
                  color={data.drawingMode === mode.key ? 'white' : '$color'}
                />
                <Text fontSize="$1" color={data.drawingMode === mode.key ? 'white' : '$color'}>
                  {mode.label}
                </Text>
              </XStack>
            </Button>
          ))}
        </XStack>
      </YStack>

      {/* Ultra-Compact Search */}
      <YStack paddingHorizontal="$2" gap="$1">
        <XStack gap="$1">
          <FormField
            flex={1}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search location..."
            autoCapitalize="none"
          />
          <Button
            onPress={async () => {
              try {
                const location = await Location.getCurrentPositionAsync({});
                setRegion({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              } catch (error) {
                Alert.alert('Error', 'Could not get your location');
              }
            }}
            variant="primary"
            backgroundColor="$blue10"
            size="sm"
            paddingHorizontal="$2"
          >
            <Feather name="navigation" size={14} color="white" />
          </Button>
        </XStack>

        {showSearchResults && searchResults.length > 0 && (
          <Card elevate>
            <YStack padding="$2" gap="$1">
              {searchResults.map((result, index) => (
                <Button
                  key={index}
                  onPress={() => handleLocationSelect(result)}
                  variant="secondary"
                  size="md"
                  justifyContent="flex-start"
                >
                  <Text numberOfLines={1} color="$color">
                    {[result.street, result.city, result.country].filter(Boolean).join(', ')}
                  </Text>
                </Button>
              ))}
            </YStack>
          </Card>
        )}
      </YStack>

      {/* Compact Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          showsUserLocation={true}
          userInterfaceStyle="dark"
        >
          {/* Waypoint markers */}
          {data.drawingMode !== 'pen' &&
            data.waypoints.map((waypoint, index) => {
              const isFirst = index === 0;
              const isLast = index === data.waypoints.length - 1 && data.waypoints.length > 1;
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

          {/* Pen drawing */}
          {data.drawingMode === 'pen' && data.penPath && data.penPath.length > 1 && (
            <Polyline
              coordinates={data.penPath}
              strokeWidth={6}
              strokeColor="#FF6B35"
              lineJoin="round"
              lineCap="round"
            />
          )}

          {/* Waypoint connections */}
          {data.drawingMode === 'waypoint' && data.waypoints.length > 1 && (
            <Polyline
              coordinates={data.waypoints}
              strokeWidth={3}
              strokeColor="#1A73E8"
              lineJoin="round"
            />
          )}

          {/* Route path (for recorded routes) */}
          {data.routePath && data.routePath.length > 1 && (
            <Polyline
              coordinates={data.routePath}
              strokeWidth={5}
              strokeColor="#22C55E"
              lineJoin="round"
              lineCap="round"
            />
          )}
        </MapView>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <XStack gap="$2">
            <Button
              onPress={handleUndo}
              disabled={data.waypoints.length === 0}
              variant="secondary"
              backgroundColor="rgba(0,0,0,0.7)"
              size="sm"
            >
              <Feather name="corner-up-left" size={16} color="white" />
            </Button>

            <Button
              onPress={clearAllWaypoints}
              disabled={data.waypoints.length === 0 && (!data.penPath || data.penPath.length === 0)}
              variant="secondary"
              backgroundColor="rgba(255,0,0,0.7)"
              size="sm"
            >
              <Feather name="trash-2" size={16} color="white" />
            </Button>
          </XStack>
        </View>

        {/* Pen drawing finish button */}
        {data.drawingMode === 'pen' && isDrawing && data.penPath && data.penPath.length > 0 && (
          <Button
            position="absolute"
            bottom={16}
            right={16}
            onPress={finishPenDrawing}
            variant="secondary"
            backgroundColor="$green10"
            size="md"
          >
            <XStack gap="$2" alignItems="center">
              <Feather name="check" size={20} color="white" />
              <Text color="white">Finish</Text>
            </XStack>
          </Button>
        )}
      </View>

      {/* Compact Status */}
      <YStack padding="$2">
        <Text size="xs" color="$gray11" textAlign="center">
          {data.waypoints.length} waypoint{data.waypoints.length !== 1 ? 's' : ''} •{' '}
          {data.drawingMode} mode
        </Text>
        {data.drawingMode === 'waypoint' && data.waypoints.length === 1 && (
          <Text size="xs" color="$orange10" textAlign="center">
            Add 1+ more waypoint
          </Text>
        )}
        {data.drawingMode === 'pen' &&
          data.penPath &&
          data.penPath.length > 0 &&
          !data.waypoints.length && (
            <Text size="xs" color="$orange10" textAlign="center">
              Tap "Finish" to complete drawing
            </Text>
          )}
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 280, // Increased height for better map visibility
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
