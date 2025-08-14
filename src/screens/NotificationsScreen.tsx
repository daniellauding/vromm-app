import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Avatar, Spinner } from 'tamagui';
import {
  Bell,
  Check,
  User,
  MessageCircle,
  Star,
  Heart,
  MapPin,
  ArrowLeft,
  Calendar,
  Users,
  X,
} from '@tamagui/lucide-icons';
import { notificationService, Notification } from '../services/notificationService';
import { getIncomingInvitations, acceptInvitationById, rejectInvitation } from '../services/invitationService';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time updates with sound
    const subscription = notificationService.subscribeToNotifications(async (notification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Play sound for new notifications
      try {
        const { pushNotificationService } = await import('../services/pushNotificationService');
        await pushNotificationService.playNotificationSound('notification');
      } catch (error) {
        console.log('Could not play notification sound:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
        );
      }

      console.log('🔔 Handling notification press:', {
        type: notification.type,
        data: notification.data,
        metadata: notification.metadata,
        actorId: notification.actor_id,
        hasNavigator: !!navigation,
      });

      // Navigate based on notification type
      switch (notification.type) {
        case 'message':
        case 'message_received':
          console.log('📍 Navigating to Messages');
          (navigation as any).navigate('Messages');
          break;

        case 'route_review':
        case 'route_uploaded':
        case 'route_saved':
        case 'route_driven':
        case 'route_completed':
        case 'route_reviewed':
        case 'route_liked': {
          // Try multiple locations for route id
          const routeId =
            notification.data?.route_id ||
            notification.metadata?.route_id ||
            (notification as any).target_id;

          if (routeId) {
            console.log('📍 Navigating to RouteDetail:', routeId);
            (navigation as any).navigate('RouteDetail', { routeId });
            break;
          }

          // Fallback: attempt lookup by route_name if provided (best-effort)
          const routeName = notification.metadata?.route_name || notification.data?.route_name;
          if (routeName) {
            try {
              const { data } = await supabase
                .from('routes')
                .select('id')
                .ilike('name', routeName)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (data?.id) {
                console.log('📍 Navigating to RouteDetail (resolved by name):', data.id);
                (navigation as any).navigate('RouteDetail', { routeId: data.id });
              }
            } catch (e) {
              console.log('No route found by name for notification');
            }
          }
          break;
        }

        case 'follow':
        case 'user_follow':
        case 'new_follower':
          const userId =
            notification.actor_id ||
            notification.data?.follower_id ||
            notification.data?.from_user_id;
          if (userId) {
            console.log('📍 Navigating to PublicProfile:', userId);
            (navigation as any).navigate('PublicProfile', { userId });
          }
          break;

        case 'supervisor_invitation':
        case 'student_invitation':
        case 'school_invitation':
        case 'teacher_invitation':
        case 'admin_invitation':
          const inviterUserId = notification.data?.from_user_id || notification.actor_id;
          if (inviterUserId) {
            console.log('📍 Navigating to PublicProfile for invitation:', inviterUserId);
            (navigation as any).navigate('PublicProfile', { userId: inviterUserId });
          }
          break;

        case 'conversation_created':
          if (notification.data?.conversation_id) {
            console.log('📍 Navigating to Conversation:', notification.data.conversation_id);
            (navigation as any).navigate('Conversation', {
              conversationId: notification.data.conversation_id,
            });
          } else {
            console.log('📍 Navigating to Messages (no conversation ID)');
            (navigation as any).navigate('Messages');
          }
          break;

        case 'exercise_completed':
        case 'learning_path_completed':
        case 'quiz_completed':
          console.log('📍 Navigating to ProgressTab');
          (navigation as any).navigate('MainTabs', { screen: 'ProgressTab' });
          break;

        case 'event_invitation':
        case 'event_invite':
          if (notification.data?.event_id || notification.metadata?.event_id) {
            const eventId = notification.data?.event_id || notification.metadata?.event_id;
            console.log('📍 Navigating to EventDetail for invitation:', eventId);
            (navigation as any).navigate('EventDetail', { eventId });
          }
          break;

        case 'event_reminder':
        case 'event_updated':
          if (notification.data?.event_id || notification.metadata?.event_id) {
            const eventId = notification.data?.event_id || notification.metadata?.event_id;
            console.log('📍 Navigating to EventDetail:', eventId);
            (navigation as any).navigate('EventDetail', { eventId });
          }
          break;

        case 'like':
          // If it's a route like, navigate to the route
          if (notification.data?.route_id || notification.metadata?.route_id) {
            const routeId = notification.data?.route_id || notification.metadata?.route_id;
            console.log('📍 Navigating to RouteDetail for like:', routeId);
            (navigation as any).navigate('RouteDetail', { routeId });
          }
          break;

        default:
          console.log('❓ Unhandled notification type:', notification.type);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling notification press:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    try {
      const invitationId = notification.data?.invitation_id || notification.metadata?.invitation_id;
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (invitationId && currentUserId) {
        const ok = await acceptInvitationById(invitationId, currentUserId);
        if (ok) {
          await notificationService.markAsRead(notification.id);
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
          console.log('✅ Relationship invitation accepted');
        }
        return;
      }

      // Fallback: event invitation acceptance
      const eventId = notification.data?.event_id || notification.metadata?.event_id;
      if (eventId && currentUserId) {
        const { error } = await supabase
          .from('event_attendees')
          .update({ status: 'accepted' })
          .eq('event_id', eventId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        await notificationService.markAsRead(notification.id);
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        console.log('✅ Event invitation accepted');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    try {
      const invitationId = notification.data?.invitation_id || notification.metadata?.invitation_id;
      if (invitationId) {
        const ok = await rejectInvitation(invitationId);
        if (ok) {
          await notificationService.markAsRead(notification.id);
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
          console.log('❌ Relationship invitation rejected');
        }
        return;
      }

      const eventId = notification.data?.event_id || notification.metadata?.event_id;
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (eventId && currentUserId) {
        const { error } = await supabase
          .from('event_attendees')
          .update({ status: 'rejected' })
          .eq('event_id', eventId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        await notificationService.markAsRead(notification.id);
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        console.log('❌ Event invitation rejected');
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <User size={20} color="#00FFBC" />;
      case 'message':
        return <MessageCircle size={20} color="#00FFBC" />;
      case 'route_review':
        return <Star size={20} color="#00FFBC" />;
      case 'like':
        return <Heart size={20} color="#00FFBC" />;
      case 'route_saved':
      case 'route_driven':
        return <MapPin size={20} color="#00FFBC" />;
      case 'event_invitation':
      case 'event_invite':
        return <Users size={20} color="#F59E0B" />;
      case 'event_reminder':
      case 'event_updated':
        return <Calendar size={20} color="#8B5CF6" />;
      default:
        return <Bell size={20} color="#00FFBC" />;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity onPress={() => handleNotificationPress(item)}>
        <XStack
          padding={16}
          borderBottomWidth={1}
          borderBottomColor="rgba(255, 255, 255, 0.1)"
          alignItems="flex-start"
          gap={12}
          backgroundColor={item.is_read ? 'transparent' : 'rgba(0, 255, 188, 0.05)'}
        >
          <Avatar circular size={40}>
            <Avatar.Image
              source={{
                uri:
                  item.actor?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${item.actor?.full_name || 'User'}&background=00FFBC&color=000`,
              }}
            />
            <Avatar.Fallback backgroundColor="$gray8" />
          </Avatar>

          <YStack flex={1} gap={4}>
            <XStack alignItems="center" gap={8}>
              {getNotificationIcon(item.type)}
              <Text fontSize={14} fontWeight="bold" color="$color" flex={1}>
                {item.message}
              </Text>
              {!item.is_read && (
                <YStack width={8} height={8} borderRadius={4} backgroundColor="#00FFBC" />
              )}
            </XStack>

            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <Text fontSize={12} color="$gray11" lineHeight={16}>
                {JSON.stringify(item.metadata)}
              </Text>
            )}

            <Text fontSize={12} color="$gray11">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>

            {/* Relationship or Event Invitation Action Buttons */}
            {(item.type === 'event_invitation' || item.type === 'event_invite' || item.type === 'supervisor_invitation' || item.type === 'student_invitation') && (
              <XStack gap={8} marginTop={8}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAcceptInvitation(item);
                  }}
                  style={{
                    backgroundColor: '#00FFBC',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Check size={14} color="#000" />
                  <Text fontSize={12} fontWeight="600" color="#000">
                    Accept
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRejectInvitation(item);
                  }}
                  style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <X size={14} color="#FFF" />
                  <Text fontSize={12} fontWeight="600" color="#FFF">
                    Decline
                  </Text>
                </TouchableOpacity>
              </XStack>
            )}
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>
          Loading notifications...
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
            Notifications
          </Text>
        </XStack>

        {notifications.some((n) => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <XStack alignItems="center" gap={4}>
              <Check size={16} color="#00FFBC" />
              <Text fontSize={14} color="#00FFBC">
                Mark all read
              </Text>
            </XStack>
          </TouchableOpacity>
        )}
      </XStack>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Bell size={48} color="rgba(255, 255, 255, 0.3)" />
          <Text fontSize={18} color="$gray11" textAlign="center" marginTop={16}>
            No notifications yet
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            You'll see notifications here when you receive them
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00FFBC" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </YStack>
  );
};
