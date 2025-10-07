import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { YStack, XStack, Text, Button, Input } from 'tamagui';
import { ArrowLeft, Search, Send, Users, Check } from '@tamagui/lucide-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationProp } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface User {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  last_seen?: string;
}

interface InviteUsersScreenProps {
  route: {
    params: {
      eventId: string;
      eventTitle: string;
      onInvitesSent?: (invitedUserIds: string[]) => void;
    };
  };
}

export const InviteUsersScreen: React.FC<InviteUsersScreenProps> = ({ route }) => {
  const { eventId, eventTitle, onInvitesSent } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { showEventInviteToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [existingAttendees, setExistingAttendees] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
    loadExistingAttendees();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles excluding the current user
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .neq('id', user?.id)
        .order('full_name', { ascending: true });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendees = async () => {
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', eventId);

      if (error) throw error;

      const attendeeIds = new Set(data?.map((attendee) => attendee.user_id) || []);
      setExistingAttendees(attendeeIds);
    } catch (error) {
      console.error('Error loading existing attendees:', error);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query),
    );
    setFilteredUsers(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadExistingAttendees()]);
    setRefreshing(false);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const selectAll = () => {
    const availableUserIds = filteredUsers
      .filter((u) => !existingAttendees.has(u.id))
      .map((u) => u.id);
    setSelectedUserIds(new Set(availableUserIds));
  };

  const deselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const sendInvitations = async () => {
    if (selectedUserIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one user to invite');
      return;
    }

    try {
      setSending(true);

      // Create event_attendees records for selected users
      const invitations = Array.from(selectedUserIds).map((userId) => ({
        event_id: eventId,
        user_id: userId,
        status: 'invited' as const,
        invited_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('event_attendees').insert(invitations);

      if (error) throw error;

      // Create invitation notifications for each invited user and send push
      for (const userId of selectedUserIds) {
        try {
          // Use central service helper to create notification (triggers realtime)
          const { notificationService } = await import('../services/notificationService');
          await notificationService.createEventInvitationNotification(
            userId,
            eventId,
            eventTitle,
            user?.id,
          );

          // Best-effort push
          try {
            const { pushNotificationService } = await import('../services/pushNotificationService');
            await pushNotificationService.sendPushNotification(
              userId,
              'Event Invitation 🎟️',
              `You have been invited to ${eventTitle}`,
              { event_id: eventId, action_url: 'vromm://notifications' },
            );
          } catch (e) {
            console.log('Push send failed (event invite):', e);
          }
        } catch (error) {
          console.error('Error sending invitation notification:', error);
        }
      }

      // TODO: Send push notifications here
      // await sendPushNotifications(selectedUserIds, eventTitle);

      // Show toast notification
      showEventInviteToast(eventId, eventTitle, selectedUserIds.size);

      if (onInvitesSent) {
        onInvitesSent(Array.from(selectedUserIds));
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error sending invitations:', error);
      Alert.alert('Error', 'Failed to send invitations. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderUserItem = ({ item: u }: { item: User }) => {
    const isSelected = selectedUserIds.has(u.id);
    const isExistingAttendee = existingAttendees.has(u.id);
    const isDisabled = isExistingAttendee;

    return (
      <TouchableOpacity
        onPress={() => !isDisabled && toggleUserSelection(u.id)}
        disabled={isDisabled}
        style={{
          backgroundColor: isSelected ? 'rgba(0, 255, 188, 0.1)' : '#1F2937',
          borderWidth: 1,
          borderColor: isSelected
            ? '#00FFBC'
            : isDisabled
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(255, 255, 255, 0.2)',
          borderRadius: 12,
          padding: 16,
          marginVertical: 4,
          opacity: isDisabled ? 0.5 : 1,
        }}
      >
        <XStack alignItems="center" gap={12}>
          {/* Avatar/Initial */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDisabled ? '#374151' : '#4B5563',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fontSize={18} fontWeight="600" color="#FFFFFF">
              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>

          {/* User Info */}
          <YStack flex={1} gap={2}>
            <Text fontSize={16} fontWeight="600" color="#FFFFFF">
              {u.full_name || 'Unknown User'}
            </Text>
            {u.email && (
              <Text fontSize={14} color="#9CA3AF">
                {u.email}
              </Text>
            )}
            {u.role && (
              <Text fontSize={12} color="#6B7280" textTransform="capitalize">
                {u.role}
              </Text>
            )}
          </YStack>

          {/* Status Indicator */}
          <View style={{ alignItems: 'center', minWidth: 80 }}>
            {isExistingAttendee ? (
              <View
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text fontSize={12} color="#FFFFFF" fontWeight="600">
                  INVITED
                </Text>
              </View>
            ) : isSelected ? (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#00FFBC',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} color="#000000" />
              </View>
            ) : (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#4B5563',
                }}
              />
            )}
          </View>
        </XStack>
      </TouchableOpacity>
    );
  };

  const availableUsers = filteredUsers.filter((u) => !existingAttendees.has(u.id));
  const selectedCount = selectedUserIds.size;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <XStack
        padding={16}
        borderBottomWidth={1}
        borderBottomColor="rgba(255, 255, 255, 0.1)"
        justifyContent="space-between"
        alignItems="center"
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <YStack alignItems="center">
          <Text fontSize={18} fontWeight="600" color="#FFFFFF">
            Invite Users
          </Text>
          <Text fontSize={14} color="#9CA3AF">
            {eventTitle}
          </Text>
        </YStack>

        <Button
          onPress={sendInvitations}
          disabled={sending || selectedCount === 0}
          backgroundColor={selectedCount > 0 ? '#00FFBC' : '#374151'}
          borderRadius={8}
          paddingHorizontal={12}
          height={36}
        >
          <Send size={16} color={selectedCount > 0 ? '#000000' : '#9CA3AF'} />
          <Text
            fontSize={14}
            fontWeight="600"
            color={selectedCount > 0 ? '#000000' : '#9CA3AF'}
            marginLeft={4}
          >
            {sending ? 'Sending...' : 'Send'}
          </Text>
        </Button>
      </XStack>

      <YStack flex={1} padding={16} gap={16}>
        {/* Search Bar */}
        <XStack gap={8} alignItems="center">
          <YStack flex={1}>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users by name, email, or role..."
              backgroundColor="#1F2937"
              borderColor="rgba(255, 255, 255, 0.2)"
              color="#FFFFFF"
              placeholderTextColor="#9CA3AF"
            />
          </YStack>
          <Search size={20} color="#9CA3AF" />
        </XStack>

        {/* Selection Controls */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap={12} alignItems="center">
            <Users size={16} color="#9CA3AF" />
            <Text fontSize={14} color="#9CA3AF">
              {availableUsers.length} available • {selectedCount} selected
            </Text>
          </XStack>

          <XStack gap={8}>
            <TouchableOpacity onPress={selectAll} disabled={availableUsers.length === 0}>
              <Text fontSize={14} color="#00FFBC">
                Select All
              </Text>
            </TouchableOpacity>
            <Text fontSize={14} color="#4B5563">
              •
            </Text>
            <TouchableOpacity onPress={deselectAll} disabled={selectedCount === 0}>
              <Text fontSize={14} color="#EF4444">
                Clear
              </Text>
            </TouchableOpacity>
          </XStack>
        </XStack>

        {/* Users List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#00FFBC" />
            <Text fontSize={16} color="#9CA3AF" marginTop={16}>
              Loading users...
            </Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Users size={48} color="#4B5563" />
            <Text fontSize={18} fontWeight="600" color="#9CA3AF" marginTop={16}>
              No users found
            </Text>
            <Text fontSize={14} color="#6B7280" marginTop={8}>
              {searchQuery ? 'Try adjusting your search' : 'No users available to invite'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </YStack>
    </SafeAreaView>
  );
};
