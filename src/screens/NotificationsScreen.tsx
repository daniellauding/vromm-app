import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { YStack, XStack, Text, Avatar, Spinner } from 'tamagui';
import { Bell, Check, User, MessageCircle, Star, Heart, MapPin, ArrowLeft } from '@tamagui/lucide-icons';
import { notificationService, Notification } from '../services/notificationService';
import { useNavigation } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to real-time updates
    const subscription = notificationService.subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev]);
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
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      }

      // Navigate based on notification type
      switch (notification.type) {
        case 'message':
          (navigation as any).navigate('Messages');
          break;
        case 'route_review':
        case 'route_uploaded':
        case 'route_saved':
        case 'route_driven':
          if (notification.data?.route_id || notification.metadata?.route_id) {
            const routeId = notification.data?.route_id || notification.metadata?.route_id;
            (navigation as any).navigate('RouteDetail', { routeId });
          }
          break;
        case 'follow':
        case 'user_follow':
          if (notification.actor_id) {
            (navigation as any).navigate('PublicProfile', { userId: notification.actor_id });
          }
          break;
        case 'like':
          // If it's a route like, navigate to the route
          if (notification.data?.route_id || notification.metadata?.route_id) {
            const routeId = notification.data?.route_id || notification.metadata?.route_id;
            (navigation as any).navigate('RouteDetail', { routeId });
          }
          break;
        default:
          console.log('Unhandled notification type:', notification.type);
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleBack = () => {
    navigation.goBack();
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
                uri: item.actor?.avatar_url || 
                      `https://ui-avatars.com/api/?name=${item.actor?.full_name || 'User'}&background=00FFBC&color=000` 
              }}
            />
            <Avatar.Fallback backgroundColor="$gray8" />
          </Avatar>
          
          <YStack flex={1} gap={4}>
            <XStack alignItems="center" gap={8}>
              {getNotificationIcon(item.type)}
              <Text
                fontSize={14}
                fontWeight="bold"
                color="$color"
                flex={1}
              >
                {item.message}
              </Text>
              {!item.is_read && (
                <YStack
                  width={8}
                  height={8}
                  borderRadius={4}
                  backgroundColor="#00FFBC"
                />
              )}
            </XStack>
            
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <Text
                fontSize={12}
                color="$gray11"
                lineHeight={16}
              >
                {JSON.stringify(item.metadata)}
              </Text>
            )}
            
            <Text
              fontSize={12}
              color="$gray11"
            >
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          </YStack>
        </XStack>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0F172A">
        <Spinner size="large" color="#00FFBC" />
        <Text color="$color" marginTop={16}>Loading notifications...</Text>
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
        
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <XStack alignItems="center" gap={4}>
              <Check size={16} color="#00FFBC" />
              <Text fontSize={14} color="#00FFBC">Mark all read</Text>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00FFBC"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </YStack>
  );
}; 