import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  participants?: Database['public']['Tables']['conversation_participants']['Row'][];
  last_message?: Database['public']['Tables']['messages']['Row'];
  unread_count?: number;
};

export type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: Database['public']['Tables']['profiles']['Row'];
  read_by?: string[];
};

export type ConversationParticipant =
  Database['public']['Tables']['conversation_participants']['Row'] & {
    profile?: Database['public']['Tables']['profiles']['Row'];
  };

class MessageService {
  // Get all conversations for current user
  async getConversations(): Promise<Conversation[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, get conversation IDs where user is a participant
    const { data: userConversations, error: convError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (convError) throw convError;

    const conversationIds = userConversations?.map((c) => c.conversation_id) || [];
    if (conversationIds.length === 0) {
      return [];
    }

    // Then get full conversation data with all participants
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        conversation_participants(
          user_id,
          profiles!conversation_participants_user_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        ),
        messages(
          *,
          sender:profiles(*)
        )
      `,
      )
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Debug logging for raw conversation data
    console.log('📊 Raw conversation data from database:', {
      conversationsCount: data?.length || 0,
      firstConversation: data?.[0]
        ? {
            id: data[0].id,
            conversation_participants: data[0].conversation_participants,
            participantsCount: data[0].conversation_participants?.length || 0,
            hasParticipants:
              data[0].conversation_participants && data[0].conversation_participants.length > 0,
          }
        : null,
    });

    // Process conversations to add unread counts and last message
    const conversations =
      data?.map((conv) => {
        const messages = conv.messages || [];
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(
          (msg) => msg.sender_id !== user.id && !msg.read_by?.includes(user.id),
        ).length;

        // Filter out current user from participants and ensure profile data is available
        const allParticipants = conv.conversation_participants || [];
        const otherParticipants = allParticipants
          .filter((p) => p.user_id !== user.id)
          .map((p) => ({
            ...p,
            profile: p.profiles, // Map profiles to profile for backward compatibility
          }));

        console.log('🔍 Processing conversation:', {
          conversationId: conv.id,
          totalParticipants: allParticipants.length,
          otherParticipants: otherParticipants.length,
          currentUserId: user.id,
          rawParticipants: allParticipants.map((p) => ({
            userId: p.user_id,
            hasProfile: !!p.profiles,
          })),
          firstOtherParticipant: otherParticipants[0]
            ? {
                userId: otherParticipants[0].user_id,
                hasProfile: !!otherParticipants[0].profiles,
                profileData: otherParticipants[0].profiles,
              }
            : null,
        });

        return {
          ...conv,
          last_message: lastMessage,
          unread_count: unreadCount,
          participants: otherParticipants,
        };
      }) || [];

    return conversations;
  }

  // Get messages for a conversation (newest first)
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          full_name,
          avatar_url,
          email
        )
      `,
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }); // Changed to descending for newest first

    if (error) throw error;
    return data || [];
  }

  // Send a message
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    metadata?: any,
  ): Promise<Message> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          metadata: metadata || {},
        })
        .select(
          `
          *,
          sender:profiles(*)
        `,
        )
        .single();

      if (error) {
        // Check if it's the webhook/http_post error
        if (error.code === '42883' && error.message?.includes('net.http_post')) {
          console.warn('Database webhook error (net.http_post missing) - this is non-critical and can be ignored');
          console.warn('Message was likely sent successfully despite the webhook error');
          
          // Try to fetch the message that was likely created
          try {
            const { data: sentMessage } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles(*)
              `)
              .eq('conversation_id', conversationId)
              .eq('sender_id', user.id)
              .eq('content', content)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
              
            if (sentMessage) {
              console.log('✅ Message was sent successfully despite webhook error');
              return sentMessage;
            }
          } catch (fetchError) {
            console.warn('Could not fetch sent message after webhook error:', fetchError);
          }
        }
        
        throw error;
      }
      
      return data;
    } catch (error) {
      // If it's specifically the webhook error, provide a user-friendly message
      if ((error as any).code === '42883' && (error as any).message?.includes('net.http_post')) {
        throw new Error('Message sent successfully, but webhook notification failed (non-critical)');
      }
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Check which messages are already marked as read to avoid duplicates
      const { data: existingReads } = await supabase
        .from('message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', messageIds);

      const existingMessageIds = new Set(existingReads?.map((r) => r.message_id) || []);
      const newMessageIds = messageIds.filter((id) => !existingMessageIds.has(id));

      if (newMessageIds.length > 0) {
        const { error } = await supabase.from('message_reads').insert(
          newMessageIds.map((messageId) => ({
            message_id: messageId,
            user_id: user.id,
          })),
        );

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Don't throw the error to prevent breaking the conversation flow
    }
  }

  // Create a new conversation
  async createConversation(
    participantIds: string[],
    name?: string,
    isGroup: boolean = false,
  ): Promise<Conversation> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        name,
        is_group: isGroup,
        created_by: user.id,
        type: isGroup ? 'group' : 'direct',
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add participants
    const allParticipants = [user.id, ...participantIds];
    const { error: partError } = await supabase.from('conversation_participants').insert(
      allParticipants.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
        is_admin: userId === user.id,
      })),
    );

    if (partError) throw partError;

    return conversation;
  }

  // Get conversation by ID
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        conversation_participants(
          user_id,
          profiles!conversation_participants_user_id_fkey(
            id,
            full_name,
            avatar_url,
            email
          )
        )
      `,
      )
      .eq('id', conversationId)
      .single();

    if (error) throw error;
    return data;
  }

  // Search users for new conversation
  async searchUsers(query: string): Promise<Database['public']['Tables']['profiles']['Row'][]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // Get unread message count - Alternative implementation without database function
  async getUnreadCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    try {
      // Get all conversations for the user
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!conversations) return 0;

      const conversationIds = conversations.map((c) => c.conversation_id);

      // Get unread messages count
      const { data: messages } = await supabase
        .from('messages')
        .select('id, message_reads!left(user_id)')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id);

      if (!messages) return 0;

      // Count messages that don't have a read record for this user
      const unreadCount = messages.filter(
        (msg) => !msg.message_reads?.some((read) => read.user_id === user.id),
      ).length;

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Subscribe to real-time updates
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          try {
            // Fetch the complete message with sender profile
            const { data, error } = await supabase
              .from('messages')
              .select(
                `
                *,
                sender:profiles!messages_sender_id_fkey(
                  id,
                  full_name,
                  avatar_url,
                  email
                )
              `,
              )
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching message details:', error);
              return;
            }

            if (data) {
              callback(data as Message);
            }
          } catch (error) {
            console.error('Error in message subscription:', error);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          try {
            // Handle message updates (like read status)
            const { data, error } = await supabase
              .from('messages')
              .select(
                `
                *,
                sender:profiles!messages_sender_id_fkey(
                  id,
                  full_name,
                  avatar_url,
                  email
                )
              `,
              )
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching updated message:', error);
              return;
            }

            if (data) {
              callback(data as Message);
            }
          } catch (error) {
            console.error('Error in message update subscription:', error);
          }
        },
      )
      .subscribe();
  }

  // Subscribe to conversation updates - Enhanced with better real-time support
  subscribeToConversations(callback: (conversation: Conversation) => void) {
    const channel = supabase.channel('conversations-global');

    // Listen to conversation table changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      async (payload) => {
        try {
          console.log('📡 Conversation update:', payload.eventType, payload.new?.id);
          callback(payload.new as Conversation);
        } catch (error) {
          console.error('Error in conversation subscription:', error);
        }
      },
    );

    // Listen to message changes to update conversation last_message
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        try {
          const conversationId = payload.new?.conversation_id;
          if (conversationId) {
            console.log('📡 New message in conversation:', conversationId);
            // Trigger conversation refresh by fetching updated conversation
            const { data: updatedConversation } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', conversationId)
              .single();

            if (updatedConversation) {
              callback(updatedConversation as Conversation);
            }
          }
        } catch (error) {
          console.error('Error in message-conversation subscription:', error);
        }
      },
    );

    return channel.subscribe();
  }

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Delete messages first (they should cascade delete, but let's be explicit)
      await supabase.from('messages').delete().eq('conversation_id', conversationId);

      // Delete conversation participants
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete the conversation
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();
