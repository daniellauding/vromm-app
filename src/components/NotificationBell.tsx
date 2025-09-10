import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { Text } from 'tamagui';
import { Bell } from '@tamagui/lucide-icons';
import { notificationService } from '../services/notificationService';
import { relLog } from '../utils/relationshipDebug';
import { useNavigation } from '@react-navigation/native';
import { AppAnalytics } from '../utils/analytics';

interface NotificationBellProps {
  size?: number;
  color?: string;
  onPress?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  size = 24,
  color,
  onPress,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  
  // Dynamic color based on theme if not provided
  const iconColor = color || (colorScheme === 'dark' ? '#FFFFFF' : '#000000');

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to real-time updates with immediate refresh
    const subscription = notificationService.subscribeToNotifications((notification) => {
      console.log('📡 NotificationBell: New notification detected:', notification.type, notification.message);
      // Immediate refresh for real-time feel
      loadUnreadCount();
      relLog.notificationNew(notification.type, notification.id);
      
      // Also trigger global invitation check if it's an invitation
      if (notification.type === 'supervisor_invitation' || notification.type === 'student_invitation') {
        console.log('📧 NotificationBell: Invitation notification received, triggering global check');
        // In React Native, we'll use a different approach - the global subscription in App.tsx will handle this
      }
    });

    // Set up periodic refresh as backup (reduced frequency since we have real-time)
    const refreshInterval = setInterval(() => {
      loadUnreadCount();
    }, 15000); // Refresh every 15 seconds as backup for better responsiveness

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
      clearInterval(refreshInterval);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      relLog.badgeUpdate(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handlePress = () => {
    AppAnalytics.trackButtonPress('notifications_bell', 'Header', {
      unread_count: unreadCount,
    }).catch(() => {});

    if (onPress) {
      onPress();
    } else {
      // @ts-ignore - navigation type issue
      navigation.navigate('Notifications');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ position: 'relative' }}>
      <Bell size={size} color={iconColor} />

      {unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            backgroundColor: '#EF4444',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#0F172A',
          }}
        >
          <Text fontSize={10} fontWeight="bold" color="#FFFFFF" textAlign="center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
