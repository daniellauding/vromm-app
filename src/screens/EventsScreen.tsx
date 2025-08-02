import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import {
  Calendar,
  Plus,
  ArrowLeft,
  MapPin,
  Users,
  Clock,
} from '@tamagui/lucide-icons';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { NavigationProp } from '../types/navigation';
import { db } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  visibility: 'public' | 'private' | 'invite-only';
  event_date?: string;
  created_by: string;
  created_at: string;
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  attendees?: Array<{ count: number }>;
}

export const EventsScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const events = await db.events.getAll();
      setEvents(events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetail', { eventId: event.id });
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent', {});
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return '#00FFBC';
      case 'private':
        return '#EF4444';
      case 'invite-only':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const renderEvent = ({ item }: { item: Event }) => {
    return (
      <TouchableOpacity onPress={() => handleEventPress(item)}>
        <YStack
          margin={8}
          padding={16}
          backgroundColor="rgba(255, 255, 255, 0.05)"
          borderRadius={12}
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.1)"
          gap={12}
        >
          {/* Event Header */}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap={4}>
              <Text fontSize={18} fontWeight="bold" color="$color">
                {item.title}
              </Text>
              <Text fontSize={14} color="$gray11" numberOfLines={2}>
                {item.description}
              </Text>
            </YStack>
            <YStack
              paddingHorizontal={8}
              paddingVertical={4}
              backgroundColor={getVisibilityColor(item.visibility)}
              borderRadius={8}
            >
              <Text fontSize={12} fontWeight="600" color="#000">
                {item.visibility}
              </Text>
            </YStack>
          </XStack>

          {/* Event Details */}
          <YStack gap={8}>
            {item.location && (
              <XStack alignItems="center" gap={8}>
                <MapPin size={16} color="$gray11" />
                <Text fontSize={14} color="$gray11">
                  {item.location}
                </Text>
              </XStack>
            )}

            {item.event_date && (
              <XStack alignItems="center" gap={8}>
                <Clock size={16} color="$gray11" />
                <Text fontSize={14} color="$gray11">
                  {formatDistanceToNow(new Date(item.event_date), { addSuffix: true })}
                </Text>
              </XStack>
            )}

            <XStack alignItems="center" gap={8}>
              <Users size={16} color="$gray11" />
              <Text fontSize={14} color="$gray11">
                {item.attendees?.[0]?.count || 0} attending
              </Text>
            </XStack>
          </YStack>

          {/* Creator Info */}
          <XStack alignItems="center" gap={8} paddingTop={8} borderTopWidth={1} borderTopColor="rgba(255, 255, 255, 0.1)">
            <Text fontSize={12} color="$gray11">
              Created by {item.creator?.full_name || 'Unknown'}
            </Text>
            <Text fontSize={12} color="$gray11">
              • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          </XStack>
        </YStack>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading events...
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#0F172A">
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        justifyContent="space-between"
        alignItems="center"
      >
        <XStack alignItems="center" gap={12} flex={1}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text fontSize={24} fontWeight="bold" color="$color">
            Events
          </Text>
        </XStack>

        <TouchableOpacity onPress={handleCreateEvent}>
          <XStack alignItems="center" gap={8} padding={8}>
            <Plus size={20} color="#00FFBC" />
            <Text fontSize={14} color="#00FFBC" fontWeight="600">
              Create
            </Text>
          </XStack>
        </TouchableOpacity>
      </XStack>

      {/* Events List */}
      {events.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Calendar size={48} color="rgba(255, 255, 255, 0.3)" />
          <Text fontSize={18} color="$gray11" textAlign="center" marginTop={16}>
            No events yet
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            Create your first event to get started
          </Text>
          <TouchableOpacity onPress={handleCreateEvent}>
            <XStack
              alignItems="center"
              gap={8}
              marginTop={16}
              paddingHorizontal={16}
              paddingVertical={12}
              backgroundColor="#00FFBC"
              borderRadius={8}
            >
              <Plus size={16} color="#000" />
              <Text fontSize={14} color="#000" fontWeight="600">
                Create Event
              </Text>
            </XStack>
          </TouchableOpacity>
        </YStack>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FFBC" />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </YStack>
  );
};