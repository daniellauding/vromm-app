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
import { LockModal, useLockModal } from '../../components/LockModal';

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
  
  // Lock modal state
  const {
    showModal: showLockModal,
    modalContentType,
    featureName,
    showLockModal: showLockModalAction,
    hideLockModal,
  } = useLockModal();

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

    // Show lock modal instead of navigating
    showLockModalAction('lock_messages', 'Messages');
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

    // Show lock modal instead of navigating
    showLockModalAction('lock_events', 'Events');
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
      <Card backgroundColor="$backgroundStrong">
        <YStack gap="$3">
          {/* <Text fontSize="$5" fontWeight="600" color="$color">
            {t('home.communication') || 'Communication'}
          </Text> */}
          
          <XStack gap="$3" justifyContent="space-between" alignItems="stretch">
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
                flex={1}
                height="100%"
                minHeight={100}
                justifyContent="center"
              >
                {/* Badge in top right corner */}
                <YStack position="absolute" top={-10} right={-10} zIndex={2}>
                  {renderBadge(messageBadge)}
                </YStack>
                <YStack alignItems="center" gap="$2" flex={1} justifyContent="center">
                  <MessageCircle size={24} color="$color" />
                  <Text fontSize="$3" fontWeight="600" color="$color" textAlign="center">
                    {t('communication.messages') || 'Messages'}
                  </Text>
                  {messageBadge > 0 && (
                    <Text fontSize="$2" color="$color">
                      {messageBadge} {t('communication.newMessages') || 'new'}
                    </Text>
                  )}
                </YStack>
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
                flex={1}
                height="100%"
                justifyContent="center"
              >
                {/* Badge in top right corner */}
                <YStack position="absolute" top={-10} right={-10} zIndex={2}>
                  {renderBadge(eventBadge)}
                </YStack>
                <YStack alignItems="center" gap="$2" flex={1} justifyContent="center">
                  <Calendar size={24} color="$color" />
                  <Text fontSize="$3" fontWeight="600" color="$color" textAlign="center">
                    {t('communication.events') || 'Events'}
                  </Text>
                  {eventBadge > 0 && (
                    <Text fontSize="$2" color="$color">
                      {eventBadge} {t('communication.newEvents') || 'new'}
                    </Text>
                  )}
                </YStack>
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
                flex={1}
                height="100%"
                justifyContent="center"
              >
                {/* Badge in top right corner */}
                <YStack position="absolute" top={-10} right={-10} zIndex={2}>
                  {renderBadge(notificationBadge)}
                </YStack>
                <YStack alignItems="center" gap="$2" flex={1} justifyContent="center">
                  <Bell size={24} color="$color" />
                  <Text fontSize="$3" fontWeight="600" color="$color" textAlign="center">
                    {t('communication.notifications') || 'Notifications'}
                  </Text>
                  {notificationBadge > 0 && (
                    <Text fontSize="$2" color="$color">
                      {notificationBadge} {t('communication.newNotifications') || 'new'}
                    </Text>
                  )}
                </YStack>
              </Card>
            </TouchableOpacity>
          </XStack>
        </YStack>
      </Card>
      
      {/* Lock Modal */}
      <LockModal
        visible={showLockModal}
        onClose={hideLockModal}
        contentType={modalContentType}
        featureName={featureName}
      />
    </YStack>
  );
}
