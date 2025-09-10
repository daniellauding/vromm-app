import React, { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Linking, View, Image } from 'react-native';
import { YStack, XStack, Text, Avatar, Input, Button, Spinner } from 'tamagui';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, MoreVertical, User, Trash2, MessageCircle, Camera, Video, Flag, X } from '@tamagui/lucide-icons';
import { messageService, Message, Conversation } from '../services/messageService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Modal as RNModal, ActivityIndicator, TextInput as RNTextInput, useColorScheme } from 'react-native';
import { TAB_BAR_TOTAL_HEIGHT } from '../utils/layout';
import Constants from 'expo-constants';
import { ReportDialog } from '../components/report/ReportDialog';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface RouteParams {
  conversationId: string;
}

interface ConversationScreenProps {
  route?: {
    params: {
      conversationId: string;
    };
  };
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({ route }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifLoading, setGifLoading] = useState(false);
  const [gifResults, setGifResults] = useState<Array<{ id: string; url: string; thumb: string }>>([]);
  const [gifError, setGifError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation();
  const routeFromHook = useRoute();
  
  // Use route prop if provided, otherwise use hook (for navigation compatibility)
  const finalRoute = route || routeFromHook;
  const { conversationId } = finalRoute.params as RouteParams;

  // Theme-aware colors (must be before any early returns)
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const inputBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const placeholderColor = colorScheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const dividerColor = colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

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
            const toMs = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);
            return prev
              .map((m) => (m.id === message.id ? { ...m, ...message } : m))
              .sort((a, b) => toMs(b.created_at as any) - toMs(a.created_at as any));
          } else {
            // Add new message at top (newest first)
            return [message, ...prev];
          }
        });

        // Mark as read when receiving messages from others
        if (message.sender_id !== user?.id) {
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
      const optimistic: any = {
        id: `tmp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        read_by: [],
        sender: (conversation as any)?.participants?.find((p: any) => p.user_id === currentUserId)?.profile,
      };
      setMessages((prev) => [optimistic, ...prev]);
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

  const uploadImageAndSend = async () => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const file = await fetch(uri).then((r) => r.blob());
      const fileName = `m_${conversationId}_${Date.now()}.jpg`;
      const { data: upload, error: upErr } = await supabase.storage.from('comment_attachments').upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const url = pub.publicUrl;
      const optimistic: any = {
        id: `tmp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: url,
        message_type: 'image',
        created_at: new Date().toISOString(),
        read_by: [],
      };
      setMessages((prev) => [optimistic, ...prev]);
      await messageService.sendMessage(conversationId, url, 'image', { source: 'storage', path: upload.path });
      setTimeout(() => {
        try {
          if ((messages?.length || 0) > 0) {
            flatListRef.current?.scrollToIndex({ index: 0, animated: true });
          }
        } catch {}
      }, 150);
    } catch (e) {
      console.error('📎 [DM] upload image error', e);
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setUploading(false);
    }
  };

  const takePhotoAndSend = async () => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const file = await fetch(uri).then((r) => r.blob());
      const fileName = `m_${conversationId}_${Date.now()}.jpg`;
      const { data: upload, error: upErr } = await supabase.storage.from('comment_attachments').upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const url = pub.publicUrl;
      const optimistic: any = {
        id: `tmp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: url,
        message_type: 'image',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [optimistic, ...prev]);
      await messageService.sendMessage(conversationId, url, 'image', { source: 'camera', path: upload.path });
    } catch (e) {
      console.error('📷 [DM] camera error', e);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const pickVideoAndSend = async () => {
    try {
      setUploading(true);
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const file = await fetch(uri).then((r) => r.blob());
      const fileName = `m_${conversationId}_${Date.now()}.mp4`;
      const { data: upload, error: upErr } = await supabase.storage.from('comment_attachments').upload(fileName, file, { upsert: true, contentType: 'video/mp4' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('comment_attachments').getPublicUrl(upload.path);
      const url = pub.publicUrl;
      const optimistic: any = {
        id: `tmp_${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: url,
        message_type: 'file',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [optimistic, ...prev]);
      await messageService.sendMessage(conversationId, url, 'file', { kind: 'video', path: upload.path });
    } catch (e) {
      console.error('🎥 [DM] pick video error', e);
      Alert.alert('Error', 'Failed to send video');
    } finally {
      setUploading(false);
    }
  };

  const searchGifs = async () => {
    try {
      setGifLoading(true);
      setGifError(null);
      const apiKey = (process as any)?.env?.EXPO_PUBLIC_GIPHY_KEY || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_KEY;
      if (!apiKey) {
        setGifError('Missing EXPO_PUBLIC_GIPHY_KEY');
        setGifResults([]);
        return;
      }
      const q = encodeURIComponent(gifQuery || 'reaction');
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${q}&limit=24&rating=g`;
      const res = await fetch(url);
      const json = await res.json();
      const items = (json.data || []).map((d: any) => ({ id: d.id, url: d.images.original.url, thumb: d.images.preview_gif?.url || d.images.fixed_width_small_still.url }));
      setGifResults(items);
    } catch (e) {
      setGifError('Failed to load GIFs');
    } finally {
      setGifLoading(false);
    }
  };

  const loadTrendingGifs = async () => {
    try {
      setGifLoading(true);
      setGifError(null);
      const apiKey = (process as any)?.env?.EXPO_PUBLIC_GIPHY_KEY || (Constants as any)?.expoConfig?.extra?.EXPO_PUBLIC_GIPHY_KEY;
      if (!apiKey) return;
      const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;
      const res = await fetch(url);
      const json = await res.json();
      const items = (json.data || []).map((d: any) => ({ id: d.id, url: d.images.original.url, thumb: d.images.preview_gif?.url || d.images.fixed_width_small_still.url }));
      setGifResults(items);
    } finally {
      setGifLoading(false);
    }
  };

  const extractFirstUrl = (text?: string | null): string | null => {
    if (!text) return null;
    const m = text.match(/https?:\/\/[^\s]+/);
    return m ? m[0] : null;
  };

  const isImageUrl = (url: string): boolean => /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);

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
          borderRadius={16}
          padding={12}
          gap={4}
        >
          {/* Only show sender name for first message in group */}
          {!isOwnMessage && item.sender && isFirstInGroup && (
            <Text fontSize={12} color="$gray11" fontWeight="bold">
              {item.sender.full_name}
            </Text>
          )}

          {(() => {
            const url = extractFirstUrl(item.content);
            const onlyUrl = !!url && item.content.trim() === url.trim();
            const isAttach = item.content.trim().startsWith('(attachment)');
            if (onlyUrl || isAttach) return null;
            return (
              <Text fontSize={14} color={isOwnMessage ? '#000000' : '#FFFFFF'} lineHeight={20}>
                {item.content}
              </Text>
            );
          })()}

          {(() => {
            const url = extractFirstUrl(item.content);
            if (!url) return null;
            if (isImageUrl(url)) {
              const previewUrl = url.includes('/storage/v1/object/public/') ? `${url}?download=1` : url;
              return (
                <View style={{ marginTop: 8 }}>
                  <ImageWithFallback source={{ uri: previewUrl }} style={{ width: 220, height: 160, borderRadius: 8 }} resizeMode="cover" />
                </View>
              );
            }
            return (
              <TouchableOpacity onPress={() => Linking.openURL(url)}>
                <Text fontSize={12} color={isOwnMessage ? 'rgba(0,0,0,0.8)' : '#60A5FA'} numberOfLines={2}>
                  {url}
                </Text>
              </TouchableOpacity>
            );
          })()}

          {/* Only show timestamp and read status on last message in group */}
          {isLastInGroup && (
            <XStack justifyContent="space-between" alignItems="center" gap={8}>
              <Text fontSize={10} color={isOwnMessage ? 'rgba(0, 0, 0, 0.6)' : '$gray11'}>
                {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : ''}
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

  const otherParticipant = conversation?.participants?.find(
    (p: any) => p.user_id !== currentUserId,
  );
  // Map profiles property to profile for consistency
  const participantWithProfile = otherParticipant
    ? {
        ...otherParticipant,
        profile: (otherParticipant as any).profiles || (otherParticipant as any).profile,
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
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading conversation...
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

        <TouchableOpacity onPress={handleAvatarPress} style={{ flex: 1 }}>
          <YStack>
            <Text fontSize={16} fontWeight="bold" color="$color">
              {participantDisplayName}
            </Text>
            <Text fontSize={12} color="$gray11">
              {conversation?.is_group ? 'Group' : 'Direct message'}
            </Text>
          </YStack>
        </TouchableOpacity>

        {/* Quick Report */}
        <TouchableOpacity onPress={() => setShowReport(true)}>
          <Flag size={20} color="#EF4444" />
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
                onPress={() => { setShowDropdown(false); setShowReport(true); }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 6 }}
              >
                <MessageCircle size={18} color="#EF4444" />
                <Text color="#EF4444" marginLeft={8}>
                  Report Conversation
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
          borderTopColor={dividerColor}
          gap={12}
          alignItems="center"
          style={{ paddingBottom: 8, marginBottom: 0 }}
        >
          {/* Actions: collapsed to Camera by default; expanded shows all */}
          {showAllActions ? (
            <>
              <TouchableOpacity onPress={uploadImageAndSend} disabled={uploading}>
                <Paperclip size={20} color={iconColor} />
              </TouchableOpacity>

              <TouchableOpacity onPress={uploadImageAndSend} disabled={uploading}>
                <ImageIcon size={20} color={iconColor} />
              </TouchableOpacity>

              <TouchableOpacity onPress={takePhotoAndSend} disabled={uploading}>
                <Camera size={20} color={iconColor} />
              </TouchableOpacity>

              <TouchableOpacity onPress={pickVideoAndSend} disabled={uploading}>
                <Video size={20} color={iconColor} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setGifOpen(true); if (gifResults.length === 0) loadTrendingGifs(); }} disabled={uploading}>
                <MessageCircle size={20} color="#00FFBC" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={takePhotoAndSend} disabled={uploading}>
              <Camera size={22} color={iconColor} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setShowAllActions((s) => !s)}>
            {showAllActions ? <X size={18} color={iconColor} /> : <MoreVertical size={18} color={iconColor} />}
          </TouchableOpacity>

          <Input
            flex={1}
            placeholder="Type a message..."
            placeholderTextColor={placeholderColor}
            value={newMessage}
            onChangeText={setNewMessage}
            backgroundColor={inputBg}
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

      {showReport && (
        <ReportDialog reportableId={conversationId} reportableType="conversation" onClose={() => setShowReport(false)} />
      )}

      {/* GIF Picker Modal */}
      <RNModal visible={gifOpen} animationType="slide" onRequestClose={() => setGifOpen(false)}>
        <YStack flex={1} backgroundColor="$background" padding={16} gap={12}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={18} fontWeight="bold" color="$color">Choose a GIF</Text>
            <TouchableOpacity onPress={() => setGifOpen(false)}>
              <Text color="#888">Close</Text>
            </TouchableOpacity>
          </XStack>
          <RNTextInput
            value={gifQuery}
            onChangeText={(t) => {
              setGifQuery(t);
              (searchGifs as any)._t && clearTimeout((searchGifs as any)._t);
              (searchGifs as any)._t = setTimeout(() => searchGifs(), 350);
            }}
            placeholder="Search GIFs"
            placeholderTextColor="#666"
            style={{ backgroundColor: '#222', color: 'white', padding: 12, borderRadius: 8 }}
            onSubmitEditing={searchGifs}
          />
          <XStack gap={8} justifyContent="flex-end">
            <TouchableOpacity onPress={loadTrendingGifs} style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text color="#fff">Trending</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={searchGifs} style={{ alignSelf: 'flex-end', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text color="#fff">Search</Text>
            </TouchableOpacity>
          </XStack>
          {gifLoading ? (
            <YStack flex={1} alignItems="center" justifyContent="center">
              <ActivityIndicator color="#00E6C3" />
            </YStack>
          ) : (
            <>
              {gifError && <Text color="#EF4444">{gifError}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {gifResults.map((g) => (
                  <TouchableOpacity key={g.id} onPress={async () => { const optimistic: any = { id: `tmp_${Date.now()}`, conversation_id: conversationId, sender_id: currentUserId, content: g.url, message_type: 'image', created_at: new Date().toISOString() }; setMessages((prev) => [optimistic, ...prev]); await messageService.sendMessage(conversationId, g.url, 'image', { source: 'giphy', id: g.id }); setGifOpen(false); setGifResults([]); setGifQuery(''); }} style={{ marginRight: 8, marginBottom: 8 }}>
                    <Image source={{ uri: g.thumb }} style={{ width: 104, height: 104, borderRadius: 8, backgroundColor: '#111' }} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </YStack>
      </RNModal>
    </YStack>
  );
};
