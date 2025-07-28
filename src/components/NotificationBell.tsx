import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from 'tamagui';
import { Bell } from '@tamagui/lucide-icons';
import { notificationService } from '../services/notificationService';
import { useNavigation } from '@react-navigation/native';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  size = 24, 
  color = '#FFFFFF' 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();

  useEffect(() => {
    loadUnreadCount();
    
    // Subscribe to real-time updates with enhanced handling
    const subscription = notificationService.subscribeToNotifications(() => {
      console.log('📡 NotificationBell: New notification detected, refreshing count');
      loadUnreadCount();
    });

    // Set up periodic refresh for real-time feel
    const refreshInterval = setInterval(() => {
      loadUnreadCount();
    }, 15000); // Refresh every 15 seconds

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
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handlePress = () => {
    // @ts-ignore - navigation type issue
    navigation.navigate('Notifications');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ position: 'relative' }}>
      <Bell size={size} color={color} />
      
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
          <Text
            fontSize={10}
            fontWeight="bold"
            color="#FFFFFF"
            textAlign="center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}; 