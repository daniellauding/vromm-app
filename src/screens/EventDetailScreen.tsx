import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import {
  ArrowLeft,
  MapPin,
  Users,
  Clock,
  Edit3,
  Check,
  X,
  UserPlus,
} from '@tamagui/lucide-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { NavigationProp } from '../types/navigation';
import { db, supabase } from '../lib/supabase';

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
  attendees?: Array<{
    id: string;
    user_id: string;
    status: 'invited' | 'accepted' | 'rejected';
    invited_at: string;
    responded_at?: string;
    user?: {
      id: string;
      full_name?: string;
      avatar_url?: string;
    };
  }>;
}

export const EventDetailScreen: React.FC = () => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<'invited' | 'accepted' | 'rejected' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { eventId } = route.params as { eventId: string };

  useEffect(() => {
    loadEvent();
    getCurrentUser();
  }, [eventId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadEvent = async () => {
    try {
      setLoading(true);
      const event = await db.events.getById(eventId);
      setEvent(event);
      
      // Check if current user is in attendees list
      const { data: { user } } = await supabase.auth.getUser();
      if (user && event.attendees) {
        const currentUserAttendance = event.attendees.find(a => a.user_id === user.id);
        setUserStatus(currentUserAttendance?.status || null);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEdit = () => {
    navigation.navigate('CreateEvent', { eventId });
  };

  const handleJoin = async () => {
    try {
      if (!currentUserId) return;
      
      if (userStatus === null) {
        // Add user to event
        await db.events.addAttendee(eventId, currentUserId);
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'accepted');
      } else {
        // Update existing attendance status
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'accepted');
      }
      
      setUserStatus('accepted');
      loadEvent(); // Refresh the event data
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const handleLeave = async () => {
    try {
      if (!currentUserId) return;
      
      if (userStatus === 'invited') {
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'rejected');
        setUserStatus('rejected');
      } else {
        await db.events.updateAttendeeStatus(eventId, currentUserId, 'rejected');
        setUserStatus(null);
      }
      
      loadEvent(); // Refresh the event data
    } catch (error) {
      console.error('Error leaving event:', error);
    }
  };

  const handleInviteUsers = () => {
    // TODO: Navigate to user selection screen
    console.log('Invite users to event:', eventId);
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

  const getStatusCounts = () => {
    if (!event?.attendees) return { accepted: 0, invited: 0, rejected: 0 };
    
    return event.attendees.reduce(
      (acc, attendee) => {
        acc[attendee.status]++;
        return acc;
      },
      { accepted: 0, invited: 0, rejected: 0 }
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading event...
        </Text>
      </YStack>
    );
  }

  if (!event) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
        <Text fontSize={18} color="$color">
          Event not found
        </Text>
      </YStack>
    );
  }

  const statusCounts = getStatusCounts();
  const canEdit = currentUserId && event.created_by === currentUserId;

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
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text fontSize={20} fontWeight="bold" color="$color" flex={1} textAlign="center">
          Event Details
        </Text>

        {canEdit && (
          <TouchableOpacity onPress={handleEdit}>
            <Edit3 size={20} color="#00FFBC" />
          </TouchableOpacity>
        )}
      </XStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack padding={16} gap={24}>
          {/* Event Info */}
          <YStack gap={16}>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <Text fontSize={24} fontWeight="bold" color="$color" flex={1}>
                {event.title}
              </Text>
              <YStack
                paddingHorizontal={12}
                paddingVertical={6}
                backgroundColor={getVisibilityColor(event.visibility)}
                borderRadius={8}
              >
                <Text fontSize={12} fontWeight="600" color="#000">
                  {event.visibility}
                </Text>
              </YStack>
            </XStack>

            {event.description && (
              <Text fontSize={16} color="$gray11" lineHeight={22}>
                {event.description}
              </Text>
            )}
          </YStack>

          {/* Event Details */}
          <YStack gap={16}>
            {event.location && (
              <XStack alignItems="flex-start" gap={12}>
                <MapPin size={20} color="#00FFBC" />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$color">
                    Location
                  </Text>
                  <Text fontSize={14} color="$gray11">
                    {event.location}
                  </Text>
                </YStack>
              </XStack>
            )}

            {event.event_date && (
              <XStack alignItems="flex-start" gap={12}>
                <Clock size={20} color="#00FFBC" />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$color">
                    When
                  </Text>
                  <Text fontSize={14} color="$gray11">
                    {formatDistanceToNow(new Date(event.event_date), { addSuffix: true })}
                  </Text>
                </YStack>
              </XStack>
            )}

            <XStack alignItems="flex-start" gap={12}>
              <Users size={20} color="#00FFBC" />
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="600" color="$color">
                  Attendees
                </Text>
                <Text fontSize={14} color="$gray11">
                  {statusCounts.accepted} accepted • {statusCounts.invited} invited
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Action Buttons */}
          <YStack gap={12}>
            {userStatus === null && event.visibility === 'public' && (
              <Button
                size="lg"
                backgroundColor="#00FFBC"
                color="#000"
                fontWeight="600"
                onPress={handleJoin}
                icon={<Check size={20} color="#000" />}
              >
                Join Event
              </Button>
            )}

            {userStatus === 'accepted' && (
              <Button
                size="lg"
                backgroundColor="rgba(239, 68, 68, 0.2)"
                borderColor="#EF4444"
                borderWidth={1}
                color="#EF4444"
                fontWeight="600"
                onPress={handleLeave}
                icon={<X size={20} color="#EF4444" />}
              >
                Leave Event
              </Button>
            )}

            {userStatus === 'invited' && (
              <XStack gap={12}>
                <Button
                  flex={1}
                  size="lg"
                  backgroundColor="#00FFBC"
                  color="#000"
                  fontWeight="600"
                  onPress={handleJoin}
                  icon={<Check size={20} color="#000" />}
                >
                  Accept
                </Button>
                <Button
                  flex={1}
                  size="lg"
                  backgroundColor="rgba(239, 68, 68, 0.2)"
                  borderColor="#EF4444"
                  borderWidth={1}
                  color="#EF4444"
                  fontWeight="600"
                  onPress={handleLeave}
                  icon={<X size={20} color="#EF4444" />}
                >
                  Decline
                </Button>
              </XStack>
            )}

            {canEdit && (
              <Button
                size="lg"
                backgroundColor="rgba(255, 255, 255, 0.1)"
                borderColor="rgba(255, 255, 255, 0.2)"
                borderWidth={1}
                color="$color"
                fontWeight="600"
                onPress={handleInviteUsers}
                icon={<UserPlus size={20} color="$color" />}
              >
                Invite Users
              </Button>
            )}
          </YStack>

          {/* Attendees List */}
          {event.attendees && event.attendees.length > 0 && (
            <YStack gap={16}>
              <Text fontSize={18} fontWeight="bold" color="$color">
                Attendees ({event.attendees.length})
              </Text>
              
              {event.attendees.map((attendee) => (
                <XStack
                  key={attendee.id}
                  alignItems="center"
                  gap={12}
                  padding={12}
                  backgroundColor="rgba(255, 255, 255, 0.05)"
                  borderRadius={8}
                >
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="600" color="$color">
                      {attendee.user?.full_name || 'Unknown User'}
                    </Text>
                  </YStack>
                  
                  <YStack
                    paddingHorizontal={8}
                    paddingVertical={4}
                    backgroundColor={
                      attendee.status === 'accepted' 
                        ? '#00FFBC' 
                        : attendee.status === 'rejected'
                        ? '#EF4444'
                        : '#F59E0B'
                    }
                    borderRadius={6}
                  >
                    <Text fontSize={11} fontWeight="600" color="#000">
                      {attendee.status}
                    </Text>
                  </YStack>
                </XStack>
              ))}
            </YStack>
          )}

          {/* Creator Info */}
          <YStack 
            padding={16} 
            backgroundColor="rgba(255, 255, 255, 0.05)" 
            borderRadius={12}
            gap={8}
          >
            <Text fontSize={14} fontWeight="600" color="$color">
              Event Creator
            </Text>
            <Text fontSize={14} color="$gray11">
              {event.creator?.full_name || 'Unknown'}
            </Text>
            <Text fontSize={12} color="$gray11">
              Created {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
};