import React, { useMemo } from 'react';
import { View, Image, useColorScheme, Dimensions, TouchableOpacity } from 'react-native';
import { YStack, Text, Card, XStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { MapPin, Users, Clock, Calendar } from '@tamagui/lucide-icons';
import { Map } from './Map';
import Carousel from 'react-native-reanimated-carousel';
import { ImageWithFallback } from './ImageWithFallback';
import { Play } from '@tamagui/lucide-icons';
import { formatDistanceToNow } from 'date-fns';

interface EventMedia {
  type: 'image' | 'video' | 'youtube';
  url: string;
  description?: string;
}

interface EventLocation {
  waypoints?: Array<{
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
  }>;
  searchQuery?: string;
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  drawingMode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: string;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  visibility: 'public' | 'private' | 'invite-only';
  event_date?: string;
  created_by: string;
  created_at: string;
  media?: EventMedia[];
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  attendees?: Array<{ count: number }>;
}

interface EventCardProps {
  event: Event;
  onEventPress?: (eventId: string) => void;
}

export function EventCard({ event, onEventPress }: EventCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const width = Dimensions.get('window').width - 32;

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return '#00FFBC';
      case 'private':
        return '#F59E0B';
      case 'invite-only':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const parseLocationData = (): EventLocation | null => {
    if (!event.location) return null;

    try {
      return JSON.parse(event.location);
    } catch (e) {
      // If not JSON, treat as simple string
      return null;
    }
  };

  const getMapRegion = (locationData: EventLocation) => {
    if (locationData.waypoints && locationData.waypoints.length > 0) {
      const waypoints = locationData.waypoints;

      // Validate waypoints have valid coordinates
      const validWaypoints = waypoints.filter(
        (wp) =>
          typeof wp.latitude === 'number' &&
          typeof wp.longitude === 'number' &&
          !isNaN(wp.latitude) &&
          !isNaN(wp.longitude) &&
          wp.latitude >= -90 &&
          wp.latitude <= 90 &&
          wp.longitude >= -180 &&
          wp.longitude <= 180,
      );

      if (validWaypoints.length === 0) return null;

      const latitudes = validWaypoints.map((wp) => wp.latitude);
      const longitudes = validWaypoints.map((wp) => wp.longitude);

      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);

      const latPadding = Math.max((maxLat - minLat) * 0.1, 0.01);
      const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.01);

      const minDelta = 0.01;
      const latDelta = Math.max(maxLat - minLat + latPadding, minDelta);
      const lngDelta = Math.max(maxLng - minLng + lngPadding, minDelta);

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }

    if (locationData.coordinates) {
      const { latitude, longitude } = locationData.coordinates;

      // Validate coordinates
      if (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return {
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
      }
    }

    if (locationData.region) {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = locationData.region;

      // Validate region
      if (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        typeof latitudeDelta === 'number' &&
        typeof longitudeDelta === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        !isNaN(latitudeDelta) &&
        !isNaN(longitudeDelta) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitudeDelta > 0 &&
        longitudeDelta > 0
      ) {
        return locationData.region;
      }
    }

    return null;
  };

  const carouselItems = useMemo(() => {
    const items: Array<{
      type: 'map' | 'image' | 'video' | 'youtube';
      data: any;
    }> = [];

    // Add map if location data exists and is valid
    const locationData = parseLocationData();
    if (locationData) {
      const region = getMapRegion(locationData);
      if (region) {
        // Ensure we have valid waypoints
        let validWaypoints: Array<{
          latitude: number;
          longitude: number;
          title?: string;
          description?: string;
        }> = [];

        if (locationData.waypoints && locationData.waypoints.length > 0) {
          // Filter valid waypoints
          validWaypoints = locationData.waypoints.filter(
            (wp) =>
              typeof wp.latitude === 'number' &&
              typeof wp.longitude === 'number' &&
              !isNaN(wp.latitude) &&
              !isNaN(wp.longitude) &&
              wp.latitude >= -90 &&
              wp.latitude <= 90 &&
              wp.longitude >= -180 &&
              wp.longitude <= 180,
          );
        } else if (locationData.coordinates) {
          // Create waypoint from coordinates
          const { latitude, longitude } = locationData.coordinates;
          if (
            typeof latitude === 'number' &&
            typeof longitude === 'number' &&
            !isNaN(latitude) &&
            !isNaN(longitude) &&
            latitude >= -90 &&
            latitude <= 90 &&
            longitude >= -180 &&
            longitude <= 180
          ) {
            validWaypoints = [
              {
                latitude,
                longitude,
                title: 'Event Location',
                description: locationData.address || 'Event location',
              },
            ];
          }
        }

        // Only add map if we have valid waypoints
        if (validWaypoints.length > 0) {
          items.push({
            type: 'map',
            data: {
              region,
              waypoints: validWaypoints,
              drawingMode: locationData.drawingMode || 'pin',
            },
          });
        }
      }
    }

    // Add media attachments
    const mediaArray = Array.isArray(event.media) ? event.media : [];
    const media = mediaArray.map((m) => ({
      type: m.type,
      data: {
        url: m.url,
        description: m.description,
      },
    }));

    return [...items, ...media];
  }, [event.media, event.location]);

  const handleEventPress = () => {
    if (onEventPress) {
      onEventPress(event.id);
    } else {
      navigation.navigate('EventDetail', { eventId: event.id });
    }
  };

  return (
    <TouchableOpacity onPress={handleEventPress} activeOpacity={0.9}>
      <Card
        margin={8}
        padding={16}
        backgroundColor="rgba(255, 255, 255, 0.05)"
        borderRadius={16}
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.1)"
      >
        <YStack gap={12}>
          {/* Media Carousel */}
          {carouselItems.length > 0 && (
            <View style={{ height: 200, borderRadius: 12, overflow: 'hidden' }}>
              {carouselItems.length === 1 ? (
                <View style={{ flex: 1 }}>
                  {carouselItems[0].type === 'map' ? (
                    <Map
                      waypoints={carouselItems[0].data.waypoints}
                      region={carouselItems[0].data.region}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                      style={{ width: '100%', height: '100%' }}
                      drawingMode={carouselItems[0].data.drawingMode}
                    />
                  ) : carouselItems[0].type === 'video' ? (
                    <TouchableOpacity
                      style={{ width: '100%', height: '100%', position: 'relative' }}
                      onPress={() =>
                        console.log('🎥 Video play requested:', carouselItems[0].data.url)
                      }
                      activeOpacity={0.8}
                    >
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#000',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: 50,
                            width: 80,
                            height: 80,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Play size={32} color="#FFF" />
                        </View>
                        <Text style={{ color: '#FFF', marginTop: 8, fontSize: 12 }}>
                          Tap to play video
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <ImageWithFallback
                      source={{ uri: carouselItems[0].data.url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  )}
                </View>
              ) : (
                <Carousel
                  loop
                  width={width}
                  height={200}
                  data={carouselItems}
                  defaultIndex={0}
                  autoPlay={false}
                  enabled={true}
                  renderItem={({ item }) => (
                    <View style={{ flex: 1 }}>
                      {item.type === 'map' ? (
                        <Map
                          waypoints={item.data.waypoints}
                          region={item.data.region}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          pitchEnabled={false}
                          rotateEnabled={false}
                          style={{ width: '100%', height: '100%' }}
                          drawingMode={item.data.drawingMode}
                        />
                      ) : item.type === 'video' ? (
                        <TouchableOpacity
                          style={{ width: '100%', height: '100%', position: 'relative' }}
                          onPress={() => console.log('🎥 Video play requested:', item.data.url)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={{
                              width: '100%',
                              height: '100%',
                              backgroundColor: '#000',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                borderRadius: 50,
                                width: 80,
                                height: 80,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Play size={32} color="#FFF" />
                            </View>
                            <Text style={{ color: '#FFF', marginTop: 8, fontSize: 12 }}>
                              Tap to play video
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <ImageWithFallback
                          source={{ uri: item.data.url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {/* Event Header */}
          <YStack gap={8}>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <Text fontSize={18} fontWeight="600" color="#FFFFFF" flex={1} marginRight={8}>
                {event.title}
              </Text>
              <View
                style={{
                  backgroundColor: getVisibilityColor(event.visibility),
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text fontSize={10} fontWeight="600" color="#000">
                  {event.visibility.toUpperCase()}
                </Text>
              </View>
            </XStack>

            {event.description && (
              <Text fontSize={14} color="#CCCCCC" numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </YStack>

          {/* Event Details */}
          <YStack gap={8}>
            {/* Date & Time */}
            {event.event_date && (
              <XStack alignItems="center" gap={8}>
                <Calendar size={16} color="#00FFBC" />
                <Text fontSize={12} color="#CCCCCC">
                  {new Date(event.event_date).toLocaleDateString()} at{' '}
                  {new Date(event.event_date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </XStack>
            )}

            {/* Attendees Count */}
            {event.attendees && event.attendees.length > 0 && (
              <XStack alignItems="center" gap={8}>
                <Users size={16} color="#00FFBC" />
                <Text fontSize={12} color="#CCCCCC">
                  {event.attendees[0].count} attendee{event.attendees[0].count === 1 ? '' : 's'}
                </Text>
              </XStack>
            )}

            {/* Time Since Created */}
            <XStack alignItems="center" gap={8}>
              <Clock size={16} color="#9CA3AF" />
              <Text fontSize={12} color="#9CA3AF">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </Text>
            </XStack>
          </YStack>

          {/* Creator Info */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingTop={8}
            borderTopWidth={1}
            borderTopColor="rgba(255, 255, 255, 0.1)"
          >
            <XStack alignItems="center" gap={8}>
              <Text fontSize={12} color="$gray11">
                Created by {event.creator?.full_name || 'Unknown'}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </Card>
    </TouchableOpacity>
  );
}
