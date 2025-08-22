import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, Avatar, Spinner } from 'tamagui';
import { ReportDialog } from '../components/report/ReportDialog';
import { Plus, Search, ArrowLeft, User, Trash2 } from '@tamagui/lucide-icons';
import { messageService, Conversation } from '../services/messageService';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getTabContentPadding } from '../utils/layout';

export const MessagesScreen: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [reportConversationId, setReportConversationId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();

    // Subscribe to real-time updates with improved handling
    const subscription = messageService.subscribeToConversations((conversation) => {
      console.log('📡 Real-time conversation update:', conversation.id);

      setConversations((prev) => {
        // Ensure we have a valid conversation
        if (!conversation || !conversation.id) {
          console.warn('Invalid conversation received:', conversation);
          return prev;
        }

        const index = prev.findIndex((c) => c.id === conversation.id);
        if (index >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            ...conversation,
            // Preserve participants if not included in update
            participants: conversation.participants || updated[index].participants,
          };
          return updated.sort(
            (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
          );
        } else {
          // Add new conversation - need to fetch full details
          loadConversations(); // Refresh full list to get complete data
          return prev;
        }
      });
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await messageService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    // @ts-ignore - navigation type issue
    navigation.navigate('Conversation', { conversationId: conversation.id });
  };

  const handleNewMessage = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('NewMessage');
  };

  const handleSearch = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('SearchMessages');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleViewProfile = (conversation: Conversation) => {
    const otherParticipant = conversation.participants?.find((p) => p.user_id !== user?.id);
    if (otherParticipant?.user_id) {
      (navigation as any).navigate('PublicProfile', { userId: otherParticipant.user_id });
    }
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await messageService.deleteConversation(conversation.id);
              // Refresh conversations list
              loadConversations();
              Alert.alert('Success', 'Conversation deleted successfully');
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ],
    );
  };

  const getConversationDisplayName = (conversation: Conversation) => {
    const otherParticipant = conversation.participants?.find((p) => p.user_id !== user?.id) as any;

    const prof = otherParticipant ? (otherParticipant.profiles || otherParticipant.profile) : null;

    if (prof?.full_name?.trim()) {
      return prof.full_name.trim();
    }

    if (prof?.email?.trim()) {
      return prof.email.trim();
    }

    if (otherParticipant?.user_id) {
      return `User ${otherParticipant.user_id.slice(-8)}`;
    }

    return 'Unknown User';
  };

  const handleLongPressConversation = (conversation: Conversation) => {
    const displayName = getConversationDisplayName(conversation);

    Alert.alert(displayName, 'Choose an action', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'View Profile',
        onPress: () => handleViewProfile(conversation),
      },
      {
        text: 'Report Conversation',
        style: 'destructive',
        onPress: () => setReportConversationId(conversation.id),
      },
      {
        text: 'Delete Conversation',
        style: 'destructive',
        onPress: () => handleDeleteConversation(conversation),
      },
    ]);
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    // Safely check if item exists
    if (!item || !item.id) {
      return null;
    }

    // Find the other participant (not the current user)
    const otherParticipant = item.participants?.find((p) => p.user_id !== user?.id) as any;
    const lastMessage = item.last_message;
    const displayName = getConversationDisplayName(item);
    const safeDisplayName = String(displayName || 'Unknown User');

    // Debug logging with safe values
    console.log('🔍 Conversation participant data:', {
      conversationId: String(item.id || ''),
      participantsCount: Number(item.participants?.length || 0),
      otherParticipant: otherParticipant
        ? {
            userId: String(otherParticipant.user_id || ''),
            profile: (otherParticipant.profiles || otherParticipant.profile) || null,
            displayName: safeDisplayName,
          }
        : null,
      currentUserId: String(user?.id || ''),
    });

    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleLongPressConversation(item)}
      >
        <XStack
          padding={16}
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.1)"
          alignItems="center"
          gap={12}
        >
          <TouchableOpacity onPress={() => handleViewProfile(item)}>
            <Avatar circular size={48}>
              <Avatar.Image
                source={{
                  uri:
                    otherParticipant?.profile?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(safeDisplayName)}&background=00FFBC&color=000`,
                }}
              />
              <Avatar.Fallback backgroundColor="$gray8">
                <User size={24} color="white" />
              </Avatar.Fallback>
            </Avatar>
          </TouchableOpacity>

          <YStack flex={1} gap={4}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={16} fontWeight="bold" color="$color" numberOfLines={1}>
                {safeDisplayName}
              </Text>
              {lastMessage?.created_at ? (
                <Text fontSize={12} color="$gray11">
                  {String(
                    formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true }),
                  )}
                </Text>
              ) : null}
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={14} color="$gray11" numberOfLines={1} flex={1}>
                {String(lastMessage?.content || '').trim() || 'No messages yet'}
              </Text>

              {item.unread_count && item.unread_count > 0 ? (
                <YStack
                  backgroundColor="#EF4444"
                  borderRadius={10}
                  minWidth={20}
                  height={20}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Text fontSize={10} fontWeight="bold" color="#FFFFFF">
                    {item.unread_count > 99 ? '99+' : String(item.unread_count)}
                  </Text>
                </YStack>
              ) : null}
            </XStack>
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading conversations...
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
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
            Messages
          </Text>
        </XStack>

        <XStack gap={16}>
          <TouchableOpacity onPress={handleSearch}>
            <Search size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNewMessage}>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </XStack>
      </XStack>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Text fontSize={18} color="$gray11" textAlign="center">
            No conversations yet
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            Start a conversation to begin messaging
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FFBC" />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: getTabContentPadding() }}
        />
      )}

      {reportConversationId && (
        <ReportDialog reportableId={reportConversationId} reportableType="conversation" onClose={() => setReportConversationId(null)} />
      )}
    </YStack>
  );
};
