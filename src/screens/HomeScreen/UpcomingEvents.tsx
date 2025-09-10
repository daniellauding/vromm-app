import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { FlatList, TouchableOpacity, Alert, ScrollView, Dimensions } from 'react-native';
import { Calendar, MapPin, Users, Clock, Check, X, ChevronRight, Plus } from '@tamagui/lucide-icons';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow, format, isToday, isTomorrow, parseISO } from 'date-fns';
import { NavigationProp } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { SectionHeader } from '../../components/SectionHeader';
import { EmptyState } from './EmptyState';
import { useTranslation } from '../../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { AppAnalytics } from '../../utils/analytics';
import { EventCard } from '../../components/EventCard';

const { width } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  visibility: 'public' | 'private' | 'invite-only';
  event_date?: string;
  created_by: string;
  created_at: string;
  media?: Array<{
    type: 'image' | 'video' | 'youtube';
    url: string;
    description?: string;
  }>;
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  attendees?: Array<{ count: number }>;
  invitationStatus?: 'invited' | 'accepted' | 'rejected';
  userAttendeeStatus?: 'invited' | 'accepted' | 'rejected';
}

interface UpcomingEventsProps {
  onEventPress?: (eventId: string) => void;
  onShowEventsSheet?: () => void;
}

export function UpcomingEvents({ onEventPress, onShowEventsSheet }: UpcomingEventsProps) {
  const { user } = useAuth();
  const { getEffectiveUserId } = useStudentSwitch();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [invitations, setInvitations] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  
  const effectiveUserId = getEffectiveUserId();

  useEffect(() => {
    loadUpcomingEvents();
    loadInvitations();
  }, [effectiveUserId]);

  const loadUpcomingEvents = async () => {
    try {
      setLoading(true);
      
      // Get upcoming public events and events user is attending
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          location,
          visibility,
          event_date,
          created_by,
          created_at,
          media,
          creator:profiles!events_created_by_fkey(
            id,
            full_name,
            avatar_url
          ),
          attendees:event_attendees!inner(
            status
          )
        `)
        .or(`visibility.eq.public,created_by.eq.${effectiveUserId}`)
        .gte('event_date', today.toISOString())
        .order('event_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      // Also get user's accepted events
      if (effectiveUserId) {
        const { data: acceptedEvents, error: acceptedError } = await supabase
          .from('event_attendees')
          .select(`
            event_id,
            status,
            events!inner(
              id,
              title,
              description,
              location,
              visibility,
              event_date,
              created_by,
              created_at,
              media,
              creator:profiles!events_created_by_fkey(
                id,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('user_id', effectiveUserId)
          .eq('status', 'accepted')
          .gte('events.event_date', today.toISOString());

        if (acceptedError) throw acceptedError;

        const acceptedEventsList = acceptedEvents?.map(item => ({
          ...item.events,
          userAttendeeStatus: item.status,
        })) || [];

        // Combine and deduplicate events
        const allEvents = [...(data || []), ...acceptedEventsList];
        const uniqueEvents = Array.from(
          new Map(allEvents.map(event => [event.id, event])).values()
        ) as Event[];

        // Sort by event date
        uniqueEvents.sort((a, b) => 
          new Date(a.event_date || '').getTime() - new Date(b.event_date || '').getTime()
        );

        setUpcomingEvents(uniqueEvents.slice(0, 3)); // Show max 3 on home screen
      } else {
        setUpcomingEvents((data as Event[]) || []);
      }
    } catch (error) {
      console.error('Error loading upcoming events:', error);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      if (!effectiveUserId) return;

      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          event_id,
          status,
          events!inner(
            id,
            title,
            description,
            location,
            visibility,
            event_date,
            created_by,
            created_at,
            media,
            creator:profiles!events_created_by_fkey(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', effectiveUserId)
        .eq('status', 'invited');

      if (error) throw error;

      const invitationEvents = data?.map(invitation => ({
        ...invitation.events,
        invitationStatus: invitation.status
      })) || [];

      setInvitations(invitationEvents);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleAcceptInvitation = async (eventId: string) => {
    try {
      AppAnalytics.trackButtonPress('accept_invitation', 'UpcomingEvents', {
        event_id: eventId,
      }).catch(() => {});

      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'accepted' })
        .eq('event_id', eventId)
        .eq('user_id', effectiveUserId);

      if (error) throw error;

      // Remove from invitations and refresh events
      setInvitations(prev => prev.filter(inv => inv.id !== eventId));
      loadUpcomingEvents();

      AppAnalytics.trackFeatureUsage('events', 'invitation_accepted', {
        event_id: eventId,
      }).catch(() => {});
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (eventId: string) => {
    try {
      AppAnalytics.trackButtonPress('reject_invitation', 'UpcomingEvents', {
        event_id: eventId,
      }).catch(() => {});

      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'rejected' })
        .eq('event_id', eventId)
        .eq('user_id', effectiveUserId);

      if (error) throw error;

      setInvitations(prev => prev.filter(inv => inv.id !== eventId));

      AppAnalytics.trackFeatureUsage('events', 'invitation_rejected', {
        event_id: eventId,
      }).catch(() => {});
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'Failed to reject invitation');
    }
  };

  const handleEventPress = (eventId: string) => {
    AppAnalytics.trackButtonPress('event_card', 'UpcomingEvents', {
      event_id: eventId,
    }).catch(() => {});

    // Always prefer sheet if available, otherwise navigate
    if (onShowEventsSheet) {
      onShowEventsSheet();
    } else if (onEventPress) {
      onEventPress(eventId);
    } else {
      navigation.navigate('EventDetail', { eventId });
    }
  };

  const handleSeeAllEvents = () => {
    AppAnalytics.trackButtonPress('see_all_events', 'UpcomingEvents').catch(() => {});
    if (onShowEventsSheet) {
      onShowEventsSheet();
    } else {
      navigation.navigate('Events');
    }
  };

  const formatEventDate = (eventDate?: string) => {
    if (!eventDate) return 'Date TBA';
    
    const date = new Date(eventDate);
    const now = new Date();
    
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const renderInvitationCard = (event: Event) => (
    <Card
      key={event.id}
      backgroundColor="rgba(245, 158, 11, 0.1)"
      bordered
      borderColor="#F59E0B"
      padding="$4"
      width={width * 0.85}
      marginRight="$3"
    >
      <YStack gap="$3">
        <YStack gap="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$4" fontWeight="700" color="$color" flex={1} numberOfLines={1}>
              🎉 {event.title}
            </Text>
            <Card backgroundColor="#F59E0B" paddingHorizontal="$2" paddingVertical="$1">
              <Text fontSize="$1" color="white" fontWeight="600">
                INVITE
              </Text>
            </Card>
          </XStack>
          
          <XStack alignItems="center" gap="$2">
            <Calendar size={16} color="$color" />
            <Text fontSize="$3" color="$color" fontWeight="600">
              {formatEventDate(event.event_date)}
            </Text>
          </XStack>

          {event.location && (
            <XStack alignItems="center" gap="$2">
              <MapPin size={14} color="$gray11" />
              <Text fontSize="$3" color="$gray11" numberOfLines={1} flex={1}>
                {typeof event.location === 'string' ? event.location : 'Event location'}
              </Text>
            </XStack>
          )}
        </YStack>

        <XStack gap="$2">
          <Button
            onPress={() => handleAcceptInvitation(event.id)}
            backgroundColor="$green10"
            size="sm"
            flex={1}
            icon={<Check size={16} color="white" />}
          >
            <Text color="white" fontSize="$2" fontWeight="600">
              Accept
            </Text>
          </Button>
          
          <Button
            onPress={() => handleRejectInvitation(event.id)}
            backgroundColor="$red10"
            size="sm"
            flex={1}
            icon={<X size={16} color="white" />}
          >
            <Text color="white" fontSize="$2" fontWeight="600">
              Decline
            </Text>
          </Button>
        </XStack>
      </YStack>
    </Card>
  );

  const renderEventCard = (event: Event) => {
    const eventDate = event.event_date ? parseISO(event.event_date) : null;
    const isUpcoming = eventDate ? eventDate > new Date() : true;
    
    return (
      <TouchableOpacity
        key={event.id}
        onPress={() => handleEventPress(event.id)}
        style={{ marginRight: 12 }}
      >
        <Card 
          backgroundColor="$backgroundStrong" 
          bordered 
          padding="$4"
          width={width * 0.75}
        >
          <YStack gap="$3">
            <YStack gap="$2">
              <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={2}>
                {event.title}
              </Text>
              
              <XStack alignItems="center" gap="$2">
                <Calendar size={16} color="$color" />
                <Text fontSize="$3" color="$color" fontWeight="600">
                  {formatEventDate(event.event_date)}
                </Text>
              </XStack>

              {event.location && (
                <XStack alignItems="center" gap="$2">
                  <MapPin size={14} color="$gray11" />
                  <Text fontSize="$3" color="$gray11" numberOfLines={1} flex={1}>
                    {typeof event.location === 'string' ? event.location : 'Event location'}
                  </Text>
                </XStack>
              )}

              <XStack alignItems="center" gap="$2">
                <Users size={14} color="$gray11" />
                <Text fontSize="$3" color="$gray11">
                  {event.visibility === 'public' ? 'Public' : 
                   event.visibility === 'invite-only' ? 'Invite Only' : 'Private'}
                </Text>
              </XStack>
            </YStack>

            {event.description && (
              <Text fontSize="$3" color="$gray11" numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </YStack>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return null; // Don't show loading state for HomeScreen section
  }

  // Don't show section if no events and no invitations
  if (upcomingEvents.length === 0 && invitations.length === 0) {
    return null;
  }

  return (
    <YStack marginBottom="$4">
      <YStack paddingHorizontal="$4" marginBottom="$3">
        <SectionHeader
          title="Events"
          subtitle={
            invitations.length > 0
              ? `${invitations.length} invitation${invitations.length === 1 ? '' : 's'} pending`
              : `${upcomingEvents.length} upcoming`
          }
          variant="chevron"
          onAction={handleSeeAllEvents}
          actionLabel={t('common.seeAll') || 'See All'}
          icon={<Calendar size={20} color={iconColor} />}
        />
      </YStack>

      {/* Horizontal Scrolling Events */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingRight: 24,
        }}
        style={{ flexGrow: 0 }}
      >
        {/* Pending Invitations First */}
        {invitations.slice(0, 3).map(renderInvitationCard)}

        {/* Upcoming Events */}
        {upcomingEvents.slice(0, 4).map(renderEventCard)}

        {/* Create Event Card */}
        <TouchableOpacity
          onPress={() => {
            AppAnalytics.trackButtonPress('create_event_quick', 'UpcomingEvents').catch(() => {});
            if (onShowEventsSheet) {
              onShowEventsSheet();
            } else {
              navigation.navigate('CreateEvent', {});
            }
          }}
        >
          <Card 
            backgroundColor="$backgroundStrong" 
            bordered 
            padding="$4"
            width={width * 0.6}
            borderStyle="dashed"
          >
            <YStack alignItems="center" justifyContent="center" gap="$3" minHeight={120}>
              <Plus size={32} color="$color" />
              <YStack alignItems="center" gap="$1">
                <Text fontSize="$4" fontWeight="600" color="$color" textAlign="center">
                  Create Event
                </Text>
                <Text fontSize="$2" color="$gray11" textAlign="center">
                  Plan something amazing
                </Text>
              </YStack>
            </YStack>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </YStack>
  );
}
