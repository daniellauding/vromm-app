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
  Check,
  X,
  Mail,
} from '@tamagui/lucide-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { NavigationProp } from '../types/navigation';
import { db, supabase } from '../lib/supabase';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../context/AuthContext';

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
}

export const EventsScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [invitations, setInvitations] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'invitations'>('all');
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  useEffect(() => {
    loadEvents();
    loadInvitations();
  }, []);

  // Auto-refresh when screen comes into focus (e.g., returning from editing)
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
      loadInvitations();
    }, [])
  );

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

  const loadInvitations = async () => {
    try {
      if (!user?.id) return;

      // Get events where user is invited with pending status
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
        .eq('user_id', user.id)
        .eq('status', 'pending');

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    await loadInvitations();
    setRefreshing(false);
  };

  const handleAcceptInvitation = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'accepted' })
        .eq('event_id', eventId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Remove from invitations and refresh
      setInvitations(prev => prev.filter(inv => inv.id !== eventId));
      loadEvents(); // Refresh events list
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleRejectInvitation = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'rejected' })
        .eq('event_id', eventId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Remove from invitations
      setInvitations(prev => prev.filter(inv => inv.id !== eventId));
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    }
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent', {});
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderEvent = ({ item }: { item: Event }) => {
    return <EventCard event={item} />;
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

      {/* Tabs */}
      <XStack padding={16} gap={8}>
        <TouchableOpacity
          onPress={() => setActiveTab('all')}
          style={{
            backgroundColor: activeTab === 'all' ? '#00FFBC' : 'rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
          }}
        >
          <Calendar size={16} color={activeTab === 'all' ? '#000' : '#FFF'} />
          <Text
            fontSize={14}
            fontWeight="600"
            color={activeTab === 'all' ? '#000' : '#FFF'}
          >
            All Events ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('invitations')}
          style={{
            backgroundColor: activeTab === 'invitations' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flex: 1,
          }}
        >
          <Mail size={16} color={activeTab === 'invitations' ? '#000' : '#FFF'} />
          <Text
            fontSize={14}
            fontWeight="600"
            color={activeTab === 'invitations' ? '#000' : '#FFF'}
          >
            Invitations ({invitations.length})
          </Text>
        </TouchableOpacity>
      </XStack>

      {/* Events List */}
      {activeTab === 'all' && events.length === 0 ? (
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
      ) : activeTab === 'invitations' && invitations.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Mail size={48} color="rgba(255, 255, 255, 0.3)" />
          <Text fontSize={18} color="$gray11" textAlign="center" marginTop={16}>
            No invitations
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            You'll see event invitations here when you receive them
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={activeTab === 'all' ? events : invitations}
          renderItem={({ item }: { item: Event }) => (
            activeTab === 'invitations' ? (
              // Invitation with accept/reject buttons
              <YStack
                margin={8}
                padding={16}
                backgroundColor="rgba(245, 158, 11, 0.1)"
                borderRadius={12}
                borderWidth={1}
                borderColor="#F59E0B"
                gap={12}
              >
                <EventCard event={item} />
                
                {/* Invitation Actions */}
                <XStack gap={12} paddingTop={8} borderTopWidth={1} borderTopColor="rgba(255, 255, 255, 0.1)">
                  <TouchableOpacity
                    onPress={() => handleAcceptInvitation(item.id)}
                    style={{
                      backgroundColor: '#00FFBC',
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <Check size={16} color="#000" />
                    <Text fontSize={14} fontWeight="600" color="#000">
                      Accept Invitation
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRejectInvitation(item.id)}
                    style={{
                      backgroundColor: '#EF4444',
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <X size={16} color="#FFF" />
                    <Text fontSize={14} fontWeight="600" color="#FFF">
                      Decline
                    </Text>
                  </TouchableOpacity>
                </XStack>
              </YStack>
            ) : (
              // Regular event card
              <EventCard event={item} />
            )
          )}
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