import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Card } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { MessageCircle, Bell, Calendar, ChevronRight } from '@tamagui/lucide-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { AppAnalytics } from '../../utils/analytics';
import { messageService } from '../../services/messageService';
import { notificationService } from '../../services/notificationService';
import { supabase } from '../../lib/supabase';

interface CommunicationToolsProps {
  onMessagePress?: () => void;
  onNotificationPress?: () => void;
  onEventPress?: () => void;
}

export function CommunicationTools({ 
  onMessagePress, 
  onNotificationPress, 
  onEventPress 
}: CommunicationToolsProps) {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  
  const [messageBadge, setMessageBadge] = useState(0);
  const [notificationBadge, setNotificationBadge] = useState(0);
  const [eventBadge, setEventBadge] = useState(0);

  useEffect(() => {
    loadBadgeCounts();
    
    // Set up periodic refresh
    const interval = setInterval(loadBadgeCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const loadBadgeCounts = async () => {
    try {
      // Load message count
      const messageCount = await messageService.getUnreadCount();
      setMessageBadge(messageCount);

      // Load notification count
      const notificationCount = await notificationService.getUnreadCount();
      setNotificationBadge(notificationCount);

      // Load event invitation count
      if (user?.id) {
        const { data, error } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'invited');

        if (!error) {
          setEventBadge(data?.length || 0);
        }
      }
    } catch (error) {
      console.error('Error loading badge counts:', error);
    }
  };

  const handleMessagePress = () => {
    AppAnalytics.trackButtonPress('communication_messages', 'CommunicationTools', {
      badge_count: messageBadge,
    }).catch(() => {});

    if (onMessagePress) {
      onMessagePress();
    } else {
      navigation.navigate('Messages');
    }
  };

  const handleNotificationPress = () => {
    AppAnalytics.trackButtonPress('communication_notifications', 'CommunicationTools', {
      badge_count: notificationBadge,
    }).catch(() => {});

    if (onNotificationPress) {
      onNotificationPress();
    } else {
      navigation.navigate('Notifications');
    }
  };

  const handleEventPress = () => {
    AppAnalytics.trackButtonPress('communication_events', 'CommunicationTools', {
      badge_count: eventBadge,
    }).catch(() => {});

    if (onEventPress) {
      onEventPress();
    } else {
      navigation.navigate('Events');
    }
  };

  const renderBadge = (count: number) => {
    if (count === 0) return null;
    
    return (
      <YStack
        backgroundColor="#EF4444"
        borderRadius={10}
        minWidth={20}
        height={20}
        justifyContent="center"
        alignItems="center"
        position="absolute"
        top={-6}
        right={-6}
        borderWidth={2}
        borderColor={colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF'}
      >
        <Text fontSize={10} fontWeight="bold" color="#FFFFFF" textAlign="center">
          {count > 99 ? '99+' : count}
        </Text>
      </YStack>
    );
  };

  return (
    <YStack paddingHorizontal="$4" marginBottom="$4">
      <Card backgroundColor="$backgroundStrong" bordered padding="$4">
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            {t('home.communication') || 'Communication'}
          </Text>
          
          <XStack gap="$3" justifyContent="space-between">
            {/* Messages */}
            <TouchableOpacity
              onPress={handleMessagePress}
              style={{ flex: 1 }}
            >
              <Card 
                backgroundColor={colorScheme === 'dark' ? '$gray2' : '$gray1'} 
                padding="$3" 
                alignItems="center"
                position="relative"
              >
                <YStack alignItems="center" gap="$2">
                  <MessageCircle size={24} color="$color" />
                  <Text fontSize="$3" fontWeight="600" color="$color" textAlign="center">
                    Messages
                  </Text>
                  {messageBadge > 0 && (
                    <Text fontSize="$2" color="$color">
                      {messageBadge} new
                    </Text>
                  )}
                </YStack>
                {renderBadge(messageBadge)}
              </Card>
            </TouchableOpacity>

            {/* Events */}
            <TouchableOpacity
              onPress={handleEventPress}
              style={{ flex: 1 }}
            >
              <Card 
                backgroundColor={colorScheme === 'dark' ? '$gray2' : '$gray1'} 
                padding="$3" 
                alignItems="center"
                position="relative"
              >
                <YStack alignItems="center" gap="$2">
                  <Calendar size={24} color="$color" />
                  <Text fontSize="$3" fontWeight="600" color="$color" textAlign="center">
                    Events
                  </Text>
                  {eventBadge > 0 && (
                    <Text fontSize="$2" color="$color">
                      {eventBadge} invite{eventBadge === 1 ? '' : 's'}
                    </Text>
                  )}
                </YStack>
                {renderBadge(eventBadge)}
              </Card>
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={{ flex: 1 }}
            >
              <Card 
                backgroundColor={colorScheme === 'dark' ? '$gray2' : '$gray1'} 
                padding="$3" 
                alignItems="center"
                position="relative"
              >
                <YStack alignItems="center" gap="$2">
                  <Bell size={24} color="$color" />
                  <Text fontSize="$3" fontWeight="600" color="$color" textAlign="center">
                    Notifications
                  </Text>
                  {notificationBadge > 0 && (
                    <Text fontSize="$2" color="$color">
                      {notificationBadge} new
                    </Text>
                  )}
                </YStack>
                {renderBadge(notificationBadge)}
              </Card>
            </TouchableOpacity>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}
