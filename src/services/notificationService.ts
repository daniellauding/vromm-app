import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

export type Notification = Database['public']['Tables']['notifications']['Row'] & {
  actor?: Database['public']['Tables']['profiles']['Row'];
};

export type Follow = Database['public']['Tables']['user_follows']['Row'] & {
  follower?: Database['public']['Tables']['profiles']['Row'];
  following?: Database['public']['Tables']['profiles']['Row'];
};

class NotificationService {
  // Get all notifications for current user
  async getNotifications(limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .select(
        `
        *,
        actor:profiles!notifications_actor_id_fkey(*)
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
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
      | 'event_invite',
    message: string,
    targetId?: string,
    metadata?: any,
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

  // Subscribe to notification updates
  subscribeToNotifications(callback: (notification: Notification) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
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
}

export const notificationService = new NotificationService();
