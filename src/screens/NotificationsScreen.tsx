import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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
  Archive,
  ArchiveRestore,
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
  const [showArchived, setShowArchived] = useState(false);
  const navigation = useNavigation();

  // Helper function to safely get data from notification
  const getNotificationData = (notification: Notification): Record<string, unknown> => {
    return (notification as any).data || (notification.metadata as Record<string, unknown>) || {};
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time updates with sound
    console.log('🔔 Setting up notification subscription...');
    const subscription = notificationService.subscribeToNotifications(async (notification) => {
      console.log('📨 New notification received:', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        actor_id: notification.actor_id,
        data: notification.data || notification.metadata
      });
      
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

  // Reload notifications when showArchived changes
  useEffect(() => {
    loadNotifications();
  }, [showArchived]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔔 Loading notifications...', showArchived ? '(including archived)' : '(active only)');
      const data = await notificationService.getNotifications(50, 0, showArchived);
      console.log('📬 Loaded notifications:', {
        count: data?.length || 0,
        showArchived,
        notifications: data?.map(n => ({
          id: n.id,
          type: n.type,
          message: n.message,
          is_read: n.is_read,
          actor_id: n.actor_id,
          created_at: n.created_at
        }))
      });

      // Clean up old accepted invitation notifications (older than 24 hours)
      if (!showArchived && data) {
        const now = new Date();
        const invitationNotifications = data.filter(n => 
          (n.type === 'supervisor_invitation' || n.type === 'student_invitation') &&
          n.message?.includes('accepted')
        );

        const toDelete = [];
        for (const notification of invitationNotifications) {
          const createdAt = new Date(notification.created_at);
          const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          
          if (hoursOld > 24) {
            toDelete.push(notification.id);
          }
        }

        if (toDelete.length > 0) {
          console.log('🧹 Cleaning up', toDelete.length, 'old accepted invitation notifications');
          try {
            await supabase
              .from('notifications')
              .delete()
              .in('id', toDelete);
            
            // Filter out deleted notifications from the display
            const filteredData = data.filter(n => !toDelete.includes(n.id));
            setNotifications(filteredData);
          } catch (cleanupError) {
            console.warn('⚠️ Could not clean up old notifications:', cleanupError);
            setNotifications(data);
          }
        } else {
          setNotifications(data);
        }
      } else {
        setNotifications(data);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
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
        data: (notification as any).data || notification.metadata,
        metadata: notification.metadata,
        actorId: notification.actor_id,
        hasNavigator: !!navigation,
      });

      // Navigate based on notification type
      switch (notification.type as string) {
        case 'new_message':
          console.log('📍 Navigating to Messages');
          (navigation as any).navigate('Messages');
          break;

        case 'route_saved':
        case 'route_driven':
        case 'route_reviewed': {
          // Try multiple locations for route id
          const notificationData = getNotificationData(notification);
          const routeId =
            notificationData.route_id ||
            (notification.metadata as any)?.route_id ||
            notification.target_id;

          if (routeId) {
            console.log('📍 Navigating to RouteDetail:', routeId);
            (navigation as any).navigate('RouteDetail', { routeId });
            break;
          }

          // Fallback: attempt lookup by route_name if provided (best-effort)
          const routeName = (notification.metadata as any)?.route_name || notificationData.route_name;
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

        case 'new_follower': {
          const notificationData = getNotificationData(notification);
          const userId =
            notification.actor_id ||
            notificationData.follower_id ||
            notificationData.from_user_id;
          if (userId) {
            console.log('📍 Navigating to PublicProfile:', userId);
            (navigation as any).navigate('PublicProfile', { userId });
          }
          break;
        }

        case 'supervisor_invitation':
        case 'student_invitation': {
          const notificationData = getNotificationData(notification);
          const inviterUserId = notificationData.from_user_id || notification.actor_id;
          if (inviterUserId) {
            console.log('📍 Navigating to PublicProfile for invitation:', inviterUserId);
            (navigation as any).navigate('PublicProfile', { userId: inviterUserId });
          }
          break;
        }

        case 'conversation_created': {
          const notificationData = getNotificationData(notification);
          if (notificationData.conversation_id) {
            console.log('📍 Navigating to Conversation:', notificationData.conversation_id);
            (navigation as any).navigate('Conversation', {
              conversationId: notificationData.conversation_id,
            });
          } else {
            console.log('📍 Navigating to Messages (no conversation ID)');
            (navigation as any).navigate('Messages');
          }
          break;
        }

        case 'exercise_completed':
        case 'learning_path_completed':
        case 'quiz_completed':
          console.log('📍 Navigating to ProgressTab');
          (navigation as any).navigate('MainTabs', { screen: 'ProgressTab' });
          break;

        case 'event_invitation':
        case 'event_invite': {
          const notificationData = getNotificationData(notification);
          if (notificationData.event_id || (notification.metadata as any)?.event_id) {
            const eventId = notificationData.event_id || (notification.metadata as any)?.event_id;
            console.log('📍 Navigating to EventDetail for invitation:', eventId);
            (navigation as any).navigate('EventDetail', { eventId });
          }
          break;
        }

        case 'event_reminder':
        case 'event_updated': {
          const notificationData = getNotificationData(notification);
          if (notificationData.event_id || (notification.metadata as any)?.event_id) {
            const eventId = notificationData.event_id || (notification.metadata as any)?.event_id;
            console.log('📍 Navigating to EventDetail:', eventId);
            (navigation as any).navigate('EventDetail', { eventId });
          }
          break;
        }

        case 'route_liked': {
          // If it's a route like, navigate to the route
          const notificationData = getNotificationData(notification);
          if (notificationData.route_id || (notification.metadata as any)?.route_id) {
            const routeId = notificationData.route_id || (notification.metadata as any)?.route_id;
            console.log('📍 Navigating to RouteDetail for like:', routeId);
            (navigation as any).navigate('RouteDetail', { routeId });
          }
          break;
        }

        case 'new_message': {
          // Check if this is actually an invitation acceptance notification
          const notificationData = getNotificationData(notification);
          if (notificationData.notification_subtype === 'invitation_accepted') {
            // Navigate to profile to see the new relationship
            console.log('📍 Navigating to Profile for accepted invitation');
            (navigation as any).navigate('MainTabs', { screen: 'ProfileTab' });
          } else {
            // Regular message notification
            console.log('📍 Navigating to Messages');
            (navigation as any).navigate('Messages');
          }
          break;
        }

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
      console.log('🎯 ACCEPT INVITATION - Starting:', notification);
      const notificationData = getNotificationData(notification);
      console.log('🎯 Notification data:', notificationData);
      
      const invitationId = notificationData.invitation_id || (notification.metadata as any)?.invitation_id;
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      
      console.log('🎯 Invitation ID:', invitationId);
      console.log('🎯 Current User ID:', currentUserId);
      
      if (invitationId && currentUserId) {
        console.log('🎯 Calling acceptInvitationById...');
        const ok = await acceptInvitationById(invitationId, currentUserId);
        console.log('🎯 Accept result:', ok);
        
        if (ok) {
          // Mark notification as read and remove from list
          await notificationService.markAsRead(notification.id);
          
          // Also delete the notification to prevent it from reappearing
          try {
            await supabase
              .from('notifications')
              .delete()
              .eq('id', notification.id);
          } catch (deleteError) {
            console.warn('Could not delete notification:', deleteError);
          }
          
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          console.log('✅ Relationship invitation accepted');
        } else {
          console.error('❌ Accept invitation returned false');
        }
        return;
      } else if (!invitationId && currentUserId && notificationData.from_user_id) {
        // Fallback: Try to find invitation by from_user_id and current user email
        console.log('🔍 Missing invitation_id, trying to find invitation by from_user_id...');
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', currentUserId)
            .single();
            
          if (userProfile?.email) {
            const { data: foundInvitation } = await supabase
              .from('pending_invitations')
              .select('id')
              .eq('email', userProfile.email.toLowerCase())
              .eq('invited_by', notificationData.from_user_id)
              .eq('status', 'pending')
              .single();
              
            if (foundInvitation?.id) {
              console.log('✅ Found invitation by email/inviter:', foundInvitation.id);
              const ok = await acceptInvitationById(foundInvitation.id, currentUserId);
              
              if (ok) {
                await notificationService.markAsRead(notification.id);
                try {
                  await supabase
                    .from('notifications')
                    .delete()
                    .eq('id', notification.id);
                } catch (deleteError) {
                  console.warn('Could not delete notification:', deleteError);
                }
                setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                console.log('✅ Relationship invitation accepted via fallback');
                return;
              }
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback invitation lookup failed:', fallbackError);
        }
        
        console.error('❌ Missing invitation ID or user ID:', {
          currentUserId,
          invitationId,
        });
        Alert.alert('Error', 'Cannot accept invitation - missing required information. Please try refreshing the app.');
      } else {
        console.error('❌ Missing invitation ID or user ID:', { invitationId, currentUserId });
        Alert.alert('Error', 'Cannot accept invitation - missing required information');
      }

      // Fallback: event invitation acceptance
      const eventId = notificationData.event_id || (notification.metadata as any)?.event_id;
      if (eventId && currentUserId) {
        const { error } = await supabase
          .from('event_attendees')
          .update({ status: 'accepted' })
          .eq('event_id', eventId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        
        await notificationService.markAsRead(notification.id);
        
        // Also delete the notification to prevent it from reappearing
        try {
          await supabase
            .from('notifications')
            .delete()
            .eq('id', notification.id);
        } catch (deleteError) {
          console.warn('Could not delete event notification:', deleteError);
        }
        
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        console.log('✅ Event invitation accepted');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleRejectInvitation = async (notification: Notification) => {
    try {
      console.log('🚫 NotificationsScreen - Rejecting invitation notification:', notification.id);
      const notificationData = getNotificationData(notification);
      const invitationId = notificationData.invitation_id || (notification.metadata as any)?.invitation_id;
      
      if (invitationId) {
        console.log('🚫 Found invitation ID:', invitationId, 'rejecting...');
        const ok = await rejectInvitation(invitationId);
        
        if (ok) {
          console.log('✅ Invitation rejected successfully, cleaning up notification');
          await notificationService.markAsRead(notification.id);
          
          // Delete the notification to prevent it from reappearing
          try {
            await supabase
              .from('notifications')
              .delete()
              .eq('id', notification.id);
            console.log('🗑️ Notification deleted from NotificationsScreen');
          } catch (deleteError) {
            console.warn('Could not delete notification:', deleteError);
          }
          
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          console.log('❌ Relationship invitation rejected and removed from UI');
        } else {
          console.error('❌ Failed to reject invitation');
          Alert.alert('Error', 'Failed to reject invitation');
        }
        return;
      }

      const eventId = notificationData.event_id || (notification.metadata as any)?.event_id;
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (eventId && currentUserId) {
        const { error } = await supabase
          .from('event_attendees')
          .update({ status: 'rejected' })
          .eq('event_id', eventId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        
        await notificationService.markAsRead(notification.id);
        
        // Also delete the notification to prevent it from reappearing
        try {
          await supabase
            .from('notifications')
            .delete()
            .eq('id', notification.id);
        } catch (deleteError) {
          console.warn('Could not delete event notification:', deleteError);
        }
        
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        console.log('❌ Event invitation rejected');
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    }
  };

  const handleArchiveNotification = async (notification: Notification) => {
    try {
      await notificationService.archiveNotification(notification.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      console.log('📁 Notification archived');
    } catch (error) {
      console.error('Error archiving notification:', error);
      Alert.alert('Error', 'Failed to archive notification');
    }
  };

  const getNotificationIcon = (type: string, metadata?: any) => {
    // Check for invitation acceptance notifications
    if (type === 'new_message' && metadata?.notification_subtype === 'invitation_accepted') {
      return <Check size={20} color="#10B981" />;
    }
    
    switch (type) {
      case 'follow':
        return <User size={20} color="#00FFBC" />;
      case 'message':
      case 'new_message':
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
      case 'invitation_accepted':
        return <Check size={20} color="#10B981" />;
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
              {getNotificationIcon(item.type, item.metadata)}
              <Text fontSize={14} fontWeight="bold" color="$color" flex={1}>
                {item.message}
              </Text>
              
              <XStack alignItems="center" gap={8}>
                {!showArchived && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleArchiveNotification(item);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Archive size={16} color="#666" />
                  </TouchableOpacity>
                )}
                {!item.is_read && (
                  <YStack width={8} height={8} borderRadius={4} backgroundColor="#00FFBC" />
                )}
              </XStack>
            </XStack>

            {/* Show custom message if it's an invitation with custom message */}
            {(item.type === 'supervisor_invitation' || item.type === 'student_invitation') && 
             item.metadata?.customMessage && (
              <YStack 
                backgroundColor="rgba(0, 123, 255, 0.15)" 
                padding={12} 
                borderRadius={8} 
                marginTop={8}
                borderLeftWidth={4}
                borderLeftColor="#007BFF"
              >
                <XStack alignItems="center" gap={6} marginBottom={4}>
                  <Text fontSize={14} color="#007BFF" fontWeight="700">💬 Personal Message</Text>
                </XStack>
                <Text fontSize={14} color="$color" fontStyle="italic" lineHeight={18}>
                  "{item.metadata.customMessage}"
                </Text>
              </YStack>
            )}
            
            {/* Show other metadata for debugging (but hide for invitations with custom messages) */}
            {item.metadata && Object.keys(item.metadata).length > 0 && 
             !(item.type === 'supervisor_invitation' || item.type === 'student_invitation') && (
              <Text fontSize={12} color="$gray11" lineHeight={16}>
                {JSON.stringify(item.metadata)}
              </Text>
            )}

            <Text fontSize={12} color="$gray11">
              {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : 'Unknown time'}
            </Text>

            {/* Relationship or Event Invitation Action Buttons */}
            {(item.type === 'event_invitation' ||
              item.type === 'event_invite' ||
              item.type === 'supervisor_invitation' ||
              item.type === 'student_invitation') && (
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
          
          <TouchableOpacity 
            onPress={() => setShowArchived(!showArchived)}
            style={{ marginLeft: 8 }}
          >
            <XStack alignItems="center" gap={4}>
              {showArchived ? (
                <ArchiveRestore size={16} color="#00FFBC" />
              ) : (
                <Archive size={16} color="#666" />
              )}
              <Text fontSize={12} color={showArchived ? "#00FFBC" : "#666"}>
                {showArchived ? 'Active' : 'Archived'}
              </Text>
            </XStack>
          </TouchableOpacity>
        </XStack>

        <XStack alignItems="center" gap={8}>
          {notifications.some((n) => !n.is_read) && !showArchived && (
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
      </XStack>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          {showArchived ? (
            <Archive size={48} color="rgba(255, 255, 255, 0.3)" />
          ) : (
            <Bell size={48} color="rgba(255, 255, 255, 0.3)" />
          )}
          <Text fontSize={18} color="$gray11" textAlign="center" marginTop={16}>
            {showArchived ? 'No archived notifications' : 'No notifications yet'}
          </Text>
          <Text fontSize={14} color="$gray11" textAlign="center" marginTop={8}>
            {showArchived 
              ? 'Archived notifications will appear here when you archive them'
              : 'You\'ll see notifications here when you receive them'
            }
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
