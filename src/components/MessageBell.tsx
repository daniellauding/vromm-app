import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import { Text, YStack } from 'tamagui';
import { MessageCircle } from '@tamagui/lucide-icons';
import { messageService } from '../services/messageService';
import { useNavigation } from '@react-navigation/native';
import { AppAnalytics } from '../utils/analytics';

interface MessageBellProps {
  size?: number;
  color?: string;
  onPress?: () => void;
}

export const MessageBell: React.FC<MessageBellProps> = ({ size = 24, color, onPress }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  
  // Dynamic color based on theme if not provided
  const iconColor = color || (colorScheme === 'dark' ? '#FFFFFF' : '#000000');

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to real-time updates with enhanced handling
    const subscription = messageService.subscribeToConversations(() => {
      console.log('📡 MessageBell: Conversation update detected, refreshing count');
      loadUnreadCount();
    });

    // Set up periodic refresh for real-time feel
    const refreshInterval = setInterval(() => {
      loadUnreadCount();
    }, 10000); // Refresh every 10 seconds

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
      clearInterval(refreshInterval);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handlePress = () => {
    AppAnalytics.trackButtonPress('messages_bell', 'Header', {
      unread_count: unreadCount,
    }).catch(() => {});

    if (onPress) {
      onPress();
    } else {
      // @ts-ignore - navigation type issue
      navigation.navigate('Messages');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ position: 'relative' }}>
      <MessageCircle size={size} color={iconColor} />

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
