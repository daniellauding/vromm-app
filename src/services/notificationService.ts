import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

export type Notification = Database['public']['Tables']['notifications']['Row'] & {
  actor?: Database['public']['Tables']['profiles']['Row'];
  data?: Record<string, unknown>; // Add data field for compatibility
};

export type Follow = Database['public']['Tables']['user_follows']['Row'] & {
  follower?: Database['public']['Tables']['profiles']['Row'];
  following?: Database['public']['Tables']['profiles']['Row'];
};

class NotificationService {
  // Get all notifications for current user
  async getNotifications(
    limit: number = 50,
    offset: number = 0,
    includeArchived: boolean = false,
  ): Promise<Notification[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not authenticated for notifications');
      throw new Error('User not authenticated');
    }

    console.log('📬 Fetching notifications for user:', user.id);

    let query = supabase
      .from('notifications')
      .select(
        `
        *,
        actor:profiles!notifications_actor_id_fkey(*)
      `,
      )
      .eq('user_id', user.id);

    // Filter by archived status if column exists
    if (!includeArchived) {
      // Try to filter out archived notifications, but gracefully handle if column doesn't exist
      query = query.or('archived.is.null,archived.eq.false');
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('📊 Notifications query result:', {
      count: data?.length || 0,
      error,
      firstFew: data?.slice(0, 3).map((n) => ({ id: n.id, type: n.type, message: n.message })),
    });

    if (error) throw error;
    return data || [];
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    console.log('🔖 markAsRead called for notification:', notificationId);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    console.log('🔖 markAsRead completed for:', notificationId);
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  }

  // Archive notification (hide without deleting)
  async archiveNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ archived: true })
      .eq('id', notificationId);

    if (error) {
      // If archived column doesn't exist, we'll gracefully handle this
      if (error.message.includes('column "archived" of relation "notifications" does not exist')) {
        console.warn('Archived column does not exist yet, skipping archive operation');
        return;
      }
      throw error;
    }
  }

  // Get archived notifications
  async getArchivedNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    return this.getNotifications(limit, offset, true);
  }

  // Get unread notification count - Alternative implementation without database function
  async getUnreadCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread notifications count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Follow a user
  async followUser(userIdToFollow: string): Promise<Follow> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: user.id,
        following_id: userIdToFollow,
      })
      .select(
        `
        *,
        follower:profiles!user_follows_follower_id_fkey(*),
        following:profiles!user_follows_following_id_fkey(*)
      `,
      )
      .single();

    if (error) throw error;
    return data;
  }

  // Unfollow a user
  async unfollowUser(userIdToUnfollow: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userIdToUnfollow);

    if (error) throw error;
  }

  // Get followers
  async getFollowers(userId?: string): Promise<Follow[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const targetUserId = userId || user.id;

    const { data, error } = await supabase
      .from('user_follows')
      .select(
        `
        *,
        follower:profiles!user_follows_follower_id_fkey(*)
      `,
      )
      .eq('following_id', targetUserId);

    if (error) throw error;
    return data || [];
  }

  // Get following
  async getFollowing(userId?: string): Promise<Follow[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const targetUserId = userId || user.id;

    const { data, error } = await supabase
      .from('user_follows')
      .select(
        `
        *,
        following:profiles!user_follows_following_id_fkey(*)
      `,
      )
      .eq('follower_id', targetUserId);

    if (error) throw error;
    return data || [];
  }

  // Check if following a user
  async isFollowing(userIdToCheck: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userIdToCheck)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  // Create notification (for internal use)
  async createNotification(
    userId: string,
    type:
      | 'follow'
      | 'route_review'
      | 'message'
      | 'mention'
      | 'like'
      | 'comment'
      | 'system'
      | 'student_invitation'
      | 'supervisor_invitation'
      | 'school_invitation'
      | 'teacher_invitation'
      | 'admin_invitation'
      | 'event_invitation'
      | 'event_updated'
      | 'event_invite'
      | 'collection_invitation',
    message: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
    actorId?: string,
  ): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        target_id: targetId,
        message,
        metadata: metadata || {},
      })
      .select(
        `
        *,
        actor:profiles!notifications_actor_id_fkey(*)
      `,
      )
      .single();

    if (error) throw error;
    return notification;
  }

  // Convenience helper for event invitations
  async createEventInvitationNotification(
    invitedUserId: string,
    eventId: string,
    eventTitle: string,
    inviterUserId?: string,
  ): Promise<void> {
    await this.createNotification(
      invitedUserId,
      'event_invitation',
      `You've been invited to "${eventTitle}"`,
      undefined,
      { event_id: eventId, event_title: eventTitle, inviter_id: inviterUserId },
    );
  }

  // Convenience helper for collection invitations
  async createCollectionInvitationNotification(
    invitedUserId: string,
    collectionId: string,
    collectionName: string,
    inviterUserId?: string,
  ): Promise<void> {
    await this.createNotification(
      invitedUserId,
      'collection_invitation',
      `You've been invited to join the collection "${collectionName}"`,
      collectionId,
      { collection_id: collectionId, collection_name: collectionName, inviter_id: inviterUserId },
      inviterUserId,
    );
  }

  // Subscribe to notification updates
  subscribeToNotifications(callback: (notification: Notification) => void) {
    console.log('🔔 Setting up notification subscription channel...');

    // Create unique channel name to avoid conflicts
    const channelName = `notifications_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('📡 Real-time notification received:', payload);
          callback(payload.new as Notification);
        },
      )
      .subscribe();
  }

  // Subscribe to follow updates
  subscribeToFollows(callback: (follow: Follow) => void) {
    return supabase
      .channel('follows')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
        },
        (payload) => {
          callback(payload.new as Follow);
        },
      )
      .subscribe();
  }

  // Archive all notifications for current user
  async archiveAllNotifications(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('📁 Archiving all notifications for user:', user.id);

    const { error } = await supabase
      .from('notifications')
      .update({ archived: true })
      .eq('user_id', user.id)
      .eq('archived', false);

    if (error) {
      console.error('❌ Error archiving all notifications:', error);
      throw error;
    }

    console.log('✅ All notifications archived successfully');
  }
}

export const notificationService = new NotificationService();
