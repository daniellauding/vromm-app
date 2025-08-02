import React, { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, Avatar, Input, Button, Spinner } from 'tamagui';
import {
  ArrowLeft,
  Send,
  Image,
  Paperclip,
  MoreVertical,
  User,
  Trash2,
} from '@tamagui/lucide-icons';
import { messageService, Message, Conversation } from '../services/messageService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

interface RouteParams {
  conversationId: string;
}

export const ConversationScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId } = route.params as RouteParams;

  useEffect(() => {
    const initializeConversation = async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      loadConversation();
      loadMessages();

      // Subscribe to real-time message updates with enhanced handling
      const subscription = messageService.subscribeToMessages(conversationId, async (message) => {
        console.log('📡 ConversationScreen: New message received:', message.id);

        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            // Update existing message (e.g., read status changed)
            return prev
              .map((m) => (m.id === message.id ? { ...m, ...message } : m))
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          } else {
            // Add new message at top (newest first)
            return [message, ...prev];
          }
        });

        // Play sound for new messages from other users
        if (message.sender_id !== user?.id) {
          try {
            await pushNotificationService.playNotificationSound('message');
          } catch (error) {
            console.log('Could not play message sound:', error);
          }

          messageService.markMessagesAsRead([message.id]);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const data = await messageService.getConversation(conversationId);
      setConversation(data);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await messageService.getMessages(conversationId);
      setMessages(data); // Already sorted newest first from service

      // Mark messages as read
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const unreadMessages = data.filter(
        (msg) => msg.sender_id !== user?.id && !msg.read_by?.includes(user?.id || ''),
      );

      if (unreadMessages.length > 0) {
        await messageService.markMessagesAsRead(unreadMessages.map((msg) => msg.id));
      }

      // Scroll to top after loading (newest messages)
      setTimeout(() => {
        if (data.length > 0) {
          flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        }
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await messageService.sendMessage(conversationId, newMessage.trim());
      setNewMessage('');

      // Scroll to top to show the new message
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleViewProfile = () => {
    if (participantWithProfile?.user_id) {
      setShowDropdown(false);
      (navigation as any).navigate('PublicProfile', { userId: participantWithProfile.user_id });
    }
  };

  const handleDeleteConversation = () => {
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
              setShowDropdown(false);
              await messageService.deleteConversation(conversationId);
              navigation.goBack();
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

  const handleAvatarPress = () => {
    if (participantWithProfile?.user_id) {
      (navigation as any).navigate('PublicProfile', { userId: participantWithProfile.user_id });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    const isRead = item.read_by?.includes(currentUserId || '');

    // Group consecutive messages from the same user (newest first order)
    const prevMessage = index > 0 ? messages[index - 1] : null; // previous message (newer)
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null; // next message (older)

    const isFirstInGroup = !prevMessage || prevMessage.sender_id !== item.sender_id; // First = newest in group
    const isLastInGroup = !nextMessage || nextMessage.sender_id !== item.sender_id; // Last = oldest in group

    // Different bubble styling for grouped messages
    const getBorderRadius = () => {
      const baseRadius = 16;
      const smallRadius = 4;

      if (isOwnMessage) {
        if (isFirstInGroup && isLastInGroup) return baseRadius; // Single message
        if (isFirstInGroup)
          return `${baseRadius}px ${baseRadius}px ${smallRadius}px ${baseRadius}px`; // First in group
        if (isLastInGroup)
          return `${baseRadius}px ${baseRadius}px ${baseRadius}px ${smallRadius}px`; // Last in group
        return `${baseRadius}px ${baseRadius}px ${smallRadius}px ${smallRadius}px`; // Middle of group
      } else {
        if (isFirstInGroup && isLastInGroup) return baseRadius; // Single message
        if (isFirstInGroup)
          return `${baseRadius}px ${baseRadius}px ${baseRadius}px ${smallRadius}px`; // First in group
        if (isLastInGroup)
          return `${smallRadius}px ${baseRadius}px ${baseRadius}px ${baseRadius}px`; // Last in group
        return `${smallRadius}px ${baseRadius}px ${baseRadius}px ${smallRadius}px`; // Middle of group
      }
    };

    return (
      <XStack
        paddingHorizontal={16}
        paddingVertical={isLastInGroup ? 4 : 1} // Less spacing for grouped messages
        justifyContent={isOwnMessage ? 'flex-end' : 'flex-start'}
      >
        <YStack
          maxWidth="70%"
          backgroundColor={isOwnMessage ? '#00FFBC' : 'rgba(255, 255, 255, 0.1)'}
          borderRadius={getBorderRadius()}
          padding={12}
          gap={4}
        >
          {/* Only show sender name for first message in group */}
          {!isOwnMessage && item.sender && isFirstInGroup && (
            <Text fontSize={12} color="$gray11" fontWeight="bold">
              {item.sender.full_name}
            </Text>
          )}

          <Text fontSize={14} color={isOwnMessage ? '#000000' : '#FFFFFF'} lineHeight={20}>
            {item.content}
          </Text>

          {/* Only show timestamp and read status on last message in group */}
          {isLastInGroup && (
            <XStack justifyContent="space-between" alignItems="center" gap={8}>
              <Text fontSize={10} color={isOwnMessage ? 'rgba(0, 0, 0, 0.6)' : '$gray11'}>
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </Text>

              {isOwnMessage && (
                <Text fontSize={12} color={isOwnMessage ? 'rgba(0, 0, 0, 0.6)' : '$gray11'}>
                  {isRead ? '✓✓' : '✓'}
                </Text>
              )}
            </XStack>
          )}
        </YStack>
      </XStack>
    );
  };

  const otherParticipant = conversation?.conversation_participants?.find(
    (p) => p.user_id !== currentUserId,
  );
  // Map profiles property to profile for consistency
  const participantWithProfile = otherParticipant
    ? {
        ...otherParticipant,
        profile: otherParticipant.profiles || otherParticipant.profile,
      }
    : null;

  // Get display name with better fallbacks
  const getParticipantDisplayName = () => {
    if (participantWithProfile?.profile?.full_name) {
      return participantWithProfile.profile.full_name;
    }

    // Try to get email if available
    if (participantWithProfile?.profile?.email) {
      return participantWithProfile.profile.email;
    }

    // Fallback to user ID snippet
    if (participantWithProfile?.user_id) {
      return `User ${participantWithProfile.user_id.slice(-8)}`;
    }

    return 'Unknown User';
  };

  const participantDisplayName = getParticipantDisplayName();

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading conversation...
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
        alignItems="center"
        gap={12}
        position="relative"
      >
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAvatarPress}>
          <Avatar circular size={40}>
            <Avatar.Image
              source={{
                uri:
                  participantWithProfile?.profile?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(participantDisplayName)}&background=00FFBC&color=000`,
              }}
            />
            <Avatar.Fallback backgroundColor="$gray8" />
          </Avatar>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAvatarPress} flex={1}>
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color">
              {participantDisplayName}
            </Text>
            <Text fontSize={12} color="$gray11">
              {conversation?.is_group ? 'Group' : 'Direct message'}
            </Text>
          </YStack>
        </TouchableOpacity>

        {/* Dropdown Menu */}
        <YStack position="relative">
          <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
            <MoreVertical size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {showDropdown && (
            <YStack
              position="absolute"
              top={30}
              right={0}
              backgroundColor="#2A2A2A"
              borderRadius={8}
              padding={8}
              minWidth={150}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.3}
              shadowRadius={4}
              zIndex={1000}
            >
              <TouchableOpacity
                onPress={handleViewProfile}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                <User size={18} color="#FFFFFF" />
                <Text color="$color" marginLeft={8}>
                  View Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteConversation}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 6,
                }}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text color="#EF4444" marginLeft={8}>
                  Delete Conversation
                </Text>
              </TouchableOpacity>
            </YStack>
          )}
        </YStack>
      </XStack>

      {/* Messages */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowDropdown(false)}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item, index }) => renderMessage({ item, index })}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => {
            // Auto-scroll to top when new messages arrive
            if (messages.length > 0) {
              flatListRef.current?.scrollToIndex({ index: 0, animated: true });
            }
          }}
          scrollEnabled={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
      </TouchableOpacity>

      {/* Message Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <XStack
          padding={16}
          borderTopWidth={1}
          borderTopColor="rgba(255, 255, 255, 0.1)"
          gap={12}
          alignItems="flex-end"
        >
          <TouchableOpacity>
            <Paperclip size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity>
            <Image size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Input
            flex={1}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={newMessage}
            onChangeText={setNewMessage}
            backgroundColor="rgba(255, 255, 255, 0.1)"
            borderColor="transparent"
            color="$color"
            borderRadius={20}
            paddingHorizontal={16}
            paddingVertical={8}
            multiline
            maxHeight={100}
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            style={{
              opacity: !newMessage.trim() || sending ? 0.5 : 1,
            }}
          >
            <Send size={20} color="#00FFBC" />
          </TouchableOpacity>
        </XStack>
      </KeyboardAvoidingView>
    </YStack>
  );
};
