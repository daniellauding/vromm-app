import React, { createContext, useContext, useEffect, useState } from 'react';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import { pushNotificationService } from '../services/pushNotificationService';
import { supabase } from '../lib/supabase';

interface MessagingContextType {
  unreadMessageCount: number;
  unreadNotificationCount: number;
  refreshCounts: () => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

interface MessagingProviderProps {
  children: React.ReactNode;
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const refreshCounts = async () => {
    try {
      const [messageCount, notificationCount] = await Promise.all([
        messageService.getUnreadCount(),
        notificationService.getUnreadCount(),
      ]);

      setUnreadMessageCount(messageCount);
      setUnreadNotificationCount(notificationCount);

      // Update app badge count
      await pushNotificationService.updateBadgeCount();
    } catch (error) {
      console.error('Error refreshing counts:', error);
    }
  };

  useEffect(() => {
    const initializeMessaging = async () => {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Register for push notifications
      await pushNotificationService.registerForPushNotifications();

      // Load initial counts
      await refreshCounts();

      // Set up real-time subscriptions
      const messageSubscription = messageService.subscribeToConversations(() => {
        refreshCounts();
      });

      const notificationSubscription = notificationService.subscribeToNotifications(() => {
        refreshCounts();
      });

      // Set up notification listeners
      const cleanup = pushNotificationService.setupNotificationListeners(
        (notification) => {
          console.log('Notification received:', notification);
          refreshCounts();
        },
        (response) => {
          console.log('Notification response:', response);
          // Use the enhanced notification response handler
          pushNotificationService.handleNotificationResponse(response);
          refreshCounts();
        },
      );

      return () => {
        messageSubscription.unsubscribe();
        notificationSubscription.unsubscribe();
        cleanup();
      };
    };

    initializeMessaging();
  }, []);

  const value: MessagingContextType = {
    unreadMessageCount,
    unreadNotificationCount,
    refreshCounts,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};
