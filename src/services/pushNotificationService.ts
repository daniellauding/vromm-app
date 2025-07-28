import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Configure notification behavior with dynamic sound settings
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const soundEnabled = await PushNotificationService.isSoundEnabled();
    return {
      shouldShowAlert: true,
      shouldPlaySound: soundEnabled,
      shouldSetBadge: true,
    };
  },
});

class PushNotificationService {
  private expoPushToken: string | null = null;
  private navigationRef: any = null;

  // Register for push notifications
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your Expo project ID
      });
      
      this.expoPushToken = token.data;
      console.log('Expo push token:', token.data);
      
      // Store token in Supabase
      await this.storePushToken(token.data);
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Store push token in Supabase
  private async storePushToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const deviceType = Platform.OS as 'ios' | 'android' | 'web';

    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('user_push_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token', token)
      .single();

    if (!existingToken) {
      // Insert new token
      const { error } = await supabase
        .from('user_push_tokens')
        .insert({
          user_id: user.id,
          token,
          device_type: deviceType,
          is_active: true
        });

      if (error) {
        console.error('Error storing push token:', error);
      }
    } else {
      // Update existing token
      const { error } = await supabase
        .from('user_push_tokens')
        .update({
          is_active: true,
          device_type: deviceType
        })
        .eq('user_id', user.id)
        .eq('token', token);

      if (error) {
        console.error('Error updating push token:', error);
      }
    }
  }

  // Remove push token
  async removePushToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_push_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('token', token);

    if (error) {
      console.error('Error removing push token:', error);
    }
  }

  // Get all active push tokens for a user
  async getUserPushTokens(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error getting user push tokens:', error);
      return [];
    }

    return data?.map(token => token.token) || [];
  }

  // Send push notification to specific user
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    const tokens = await this.getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      console.log('No active push tokens for user:', userId);
      return;
    }

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send push notification to multiple users
  async sendPushNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    for (const userId of userIds) {
      await this.sendPushNotification(userId, title, body, data);
    }
  }

  // Set up notification listeners
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    // Listen for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Listen for user tapping on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );

    // Return cleanup function
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  // Schedule local notification
  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: trigger || null,
    });

    return identifier;
  }

  // Cancel scheduled notification
  async cancelScheduledNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('📱 Badge count set to:', count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Update badge count based on unread notifications and messages
  async updateBadgeCount(): Promise<void> {
    try {
      const { messageService } = await import('./messageService');
      const { notificationService } = await import('./notificationService');
      
      const [unreadMessages, unreadNotifications] = await Promise.all([
        messageService.getUnreadCount(),
        notificationService.getUnreadCount()
      ]);
      
      const totalUnread = unreadMessages + unreadNotifications;
      await this.setBadgeCount(totalUnread);
      console.log('📱 Updated badge:', { unreadMessages, unreadNotifications, totalUnread });
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  // Sound Settings Management
  static async isSoundEnabled(): Promise<boolean> {
    try {
      const soundEnabled = await AsyncStorage.getItem('notification_sound_enabled');
      return soundEnabled !== 'false'; // Default to enabled
    } catch (error) {
      console.error('Error checking sound settings:', error);
      return true; // Default to enabled on error
    }
  }

  static async setSoundEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_sound_enabled', enabled.toString());
      console.log('🔊 Sound settings updated:', enabled);
    } catch (error) {
      console.error('Error updating sound settings:', error);
    }
  }

  // Play notification sound manually (for in-app notifications)
  async playNotificationSound(soundType: 'message' | 'notification' = 'notification'): Promise<void> {
    try {
      const soundEnabled = await PushNotificationService.isSoundEnabled();
      if (!soundEnabled) return;

      // Configure audio mode for notifications
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        playThroughEarpieceAndroid: false,
      });

      // Use different sounds for different types
      const soundUri = soundType === 'message' 
        ? 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' // Message sound
        : 'https://www.soundjay.com/misc/sounds/bell-ringing-04.wav'; // Notification sound

      // Load and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { 
          shouldPlay: true,
          volume: 0.7,
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );

      // Clean up after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });

      console.log('🔊 Played notification sound:', soundType);
    } catch (error) {
      console.error('Error playing notification sound:', error);
      // Fallback to system notification sound
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '',
            body: '',
            sound: true,
          },
          trigger: null,
        });
      } catch (fallbackError) {
        console.error('Fallback sound also failed:', fallbackError);
      }
    }
  }

  // Play system notification sound as fallback
  async playSystemSound(): Promise<void> {
    try {
      const soundEnabled = await PushNotificationService.isSoundEnabled();
      if (!soundEnabled) return;

      // Use system notification sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔊',
          body: 'Sound test',
          sound: 'default',
        },
        trigger: null,
      });
      
      console.log('🔊 Played system notification sound');
    } catch (error) {
      console.error('Error playing system sound:', error);
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Set navigation reference for deep linking
  setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  // Handle notification response with navigation
  handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    const actionUrl = data?.action_url;
    
    if (actionUrl && this.navigationRef?.current) {
      this.navigateFromNotification(actionUrl, data);
    }
  }

  // Navigate based on notification data
  private navigateFromNotification(actionUrl: string, data: any) {
    try {
      if (actionUrl.startsWith('vromm://')) {
        const url = actionUrl.replace('vromm://', '');
        const [screen, ...params] = url.split('/');
        
        switch (screen) {
          case 'profile':
            this.navigationRef.current?.navigate('PublicProfile', { 
              userId: data.user_id || data.from_user_id 
            });
            break;
          case 'route':
            this.navigationRef.current?.navigate('RouteDetail', { 
              routeId: data.route_id 
            });
            break;
          case 'messages':
            if (data.conversation_id) {
              this.navigationRef.current?.navigate('Conversation', { 
                conversationId: data.conversation_id 
              });
            } else {
              this.navigationRef.current?.navigate('Messages');
            }
            break;
          case 'notifications':
            this.navigationRef.current?.navigate('Notifications');
            break;
          case 'progress':
            this.navigationRef.current?.navigate('MainTabs', { 
              screen: 'ProgressTab',
              params: { selectedPathId: data.learning_path_id }
            });
            break;
          default:
            console.warn('Unknown notification screen:', screen);
        }
      }
    } catch (error) {
      console.error('Error handling notification navigation:', error);
    }
  }

  // Enhanced notification sender with database storage
  async sendEnhancedNotification(payload: {
    targetUserId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
    priority?: 'low' | 'normal' | 'high';
  }) {
    try {
      // Store notification in database using the SQL function
      const { data: notificationId, error: dbError } = await supabase
        .rpc('send_push_notification', {
          p_user_id: payload.targetUserId,
          p_type: payload.type,
          p_title: payload.title,
          p_message: payload.message,
          p_data: payload.data || null,
          p_action_url: payload.actionUrl || null,
          p_priority: payload.priority || 'normal'
        });

      if (dbError) {
        console.error('Error storing notification:', dbError);
        return;
      }

      // Send actual push notification
      await this.sendPushNotification(
        payload.targetUserId,
        payload.title,
        payload.message,
        {
          ...payload.data,
          action_url: payload.actionUrl,
          notification_id: notificationId,
          type: payload.type
        }
      );

      // Mark as sent in database
      await supabase
        .from('notifications')
        .update({ 
          push_sent: true, 
          push_sent_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      console.log('Enhanced notification sent successfully');
    } catch (error) {
      console.error('Error sending enhanced notification:', error);
    }
  }

  // =================== SPECIFIC NOTIFICATION METHODS ===================

  // Send follow notification
  async sendFollowNotification(followerId: string, targetUserId: string, followerName: string) {
    await this.sendEnhancedNotification({
      targetUserId,
      type: 'new_follower',
      title: 'New Follower! 👥',
      message: `${followerName} started following you`,
      data: {
        follower_id: followerId,
        follower_name: followerName,
      },
      actionUrl: `vromm://profile/${followerId}`,
      priority: 'normal'
    });
  }

  // Send new route notification to followers
  async sendNewRouteNotification(routeId: string, creatorId: string, creatorName: string, routeTitle: string, followerIds: string[]) {
    for (const followerId of followerIds) {
      await this.sendEnhancedNotification({
        targetUserId: followerId,
        type: 'new_route_from_followed_user',
        title: 'New Route! 🛣️',
        message: `${creatorName} created: ${routeTitle}`,
        data: {
          route_id: routeId,
          creator_id: creatorId,
          creator_name: creatorName,
          route_title: routeTitle,
        },
        actionUrl: `vromm://route/${routeId}`,
        priority: 'normal'
      });
    }
  }

  // Send invitation notification (unified for both directions)
  async sendInvitationNotification(fromUserId: string, targetUserId: string, fromUserName: string, fromUserRole: string, invitationType: 'supervisor' | 'student') {
    const isStudentInvite = invitationType === 'student';
    
    await this.sendEnhancedNotification({
      targetUserId,
      type: isStudentInvite ? 'student_invitation' : 'supervisor_invitation',
      title: isStudentInvite ? 'Supervision Invitation! 👨‍🏫' : 'Supervisor Request! 🎓',
      message: isStudentInvite 
        ? `${fromUserName} (${fromUserRole}) wants to supervise you`
        : `${fromUserName} wants you to be their supervisor`,
      data: {
        from_user_id: fromUserId,
        from_user_name: fromUserName,
        from_user_role: fromUserRole,
        invitation_type: invitationType,
      },
      actionUrl: 'vromm://notifications',
      priority: 'high'
    });
  }

  // Send route completed notification
  async sendRouteCompletedNotification(routeId: string, routeTitle: string, completedByUserId: string, completedByName: string, routeCreatorId: string) {
    await this.sendEnhancedNotification({
      targetUserId: routeCreatorId,
      type: 'route_completed',
      title: 'Route Completed! ✅',
      message: `${completedByName} completed your route: ${routeTitle}`,
      data: {
        route_id: routeId,
        route_title: routeTitle,
        completed_by_user_id: completedByUserId,
        completed_by_name: completedByName,
      },
      actionUrl: `vromm://route/${routeId}`,
      priority: 'normal'
    });
  }

  // Send route review notification
  async sendRouteReviewNotification(routeId: string, routeTitle: string, reviewerUserId: string, reviewerName: string, rating: number, routeCreatorId: string) {
    const stars = '⭐'.repeat(Math.floor(rating));
    await this.sendEnhancedNotification({
      targetUserId: routeCreatorId,
      type: 'route_reviewed',
      title: 'New Review! ⭐',
      message: `${reviewerName} gave "${routeTitle}" ${stars} (${rating}/5)`,
      data: {
        route_id: routeId,
        route_title: routeTitle,
        reviewer_user_id: reviewerUserId,
        reviewer_name: reviewerName,
        rating,
      },
      actionUrl: `vromm://route/${routeId}`,
      priority: 'normal'
    });
  }

  // Send exercise completed notification to supervisors
  async sendExerciseCompletedNotification(exerciseId: string, exerciseTitle: string, studentId: string, studentName: string, supervisorIds: string[]) {
    for (const supervisorId of supervisorIds) {
      await this.sendEnhancedNotification({
        targetUserId: supervisorId,
        type: 'exercise_completed',
        title: 'Student Progress! 📚',
        message: `${studentName} completed: ${exerciseTitle}`,
        data: {
          exercise_id: exerciseId,
          exercise_title: exerciseTitle,
          student_id: studentId,
          student_name: studentName,
        },
        actionUrl: `vromm://progress`,
        priority: 'normal'
      });
    }
  }

  // Send message notification
  async sendMessageNotification(conversationId: string, fromUserId: string, fromUserName: string, messagePreview: string, targetUserId: string) {
    await this.sendEnhancedNotification({
      targetUserId,
      type: 'message_received',
      title: `Message from ${fromUserName} 💬`,
      message: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      data: {
        conversation_id: conversationId,
        from_user_id: fromUserId,
        from_user_name: fromUserName,
      },
      actionUrl: `vromm://messages/${conversationId}`,
      priority: 'high'
    });
  }

  // Send learning path completed notification
  async sendLearningPathCompletedNotification(pathId: string, pathTitle: string, studentId: string, studentName: string, supervisorIds: string[]) {
    for (const supervisorId of supervisorIds) {
      await this.sendEnhancedNotification({
        targetUserId: supervisorId,
        type: 'learning_path_completed',
        title: 'Learning Path Completed! 🎉',
        message: `${studentName} completed the learning path: ${pathTitle}`,
        data: {
          learning_path_id: pathId,
          path_title: pathTitle,
          student_id: studentId,
          student_name: studentName,
        },
        actionUrl: `vromm://progress/${pathId}`,
        priority: 'high'
      });
    }
  }

  // Send quiz completed notification
  async sendQuizCompletedNotification(exerciseId: string, exerciseTitle: string, score: number, passed: boolean, studentId: string, studentName: string, supervisorIds: string[]) {
    for (const supervisorId of supervisorIds) {
      await this.sendEnhancedNotification({
        targetUserId: supervisorId,
        type: 'quiz_completed',
        title: `Quiz ${passed ? 'Passed' : 'Failed'} ${passed ? '✅' : '❌'}`,
        message: `${studentName} scored ${score}% on "${exerciseTitle}"`,
        data: {
          exercise_id: exerciseId,
          exercise_title: exerciseTitle,
          score,
          passed,
          student_id: studentId,
          student_name: studentName,
        },
        actionUrl: `vromm://progress`,
        priority: 'normal'
      });
    }
  }

  // Send route liked notification
  async sendRouteLikedNotification(routeId: string, routeTitle: string, likedByUserId: string, likedByName: string, routeCreatorId: string) {
    await this.sendEnhancedNotification({
      targetUserId: routeCreatorId,
      type: 'route_liked',
      title: 'Route Liked! 👍',
      message: `${likedByName} liked your route: ${routeTitle}`,
      data: {
        route_id: routeId,
        route_title: routeTitle,
        liked_by_user_id: likedByUserId,
        liked_by_name: likedByName,
      },
      actionUrl: `vromm://route/${routeId}`,
      priority: 'low'
    });
  }

  // =================== TESTING METHODS ===================

  // Send test notification for debugging
  async sendTestNotification(userId: string, testType: string = 'general') {
    const testNotifications = {
      general: {
        title: 'Test Notification! 🧪',
        message: 'This is a test notification to verify the system works',
        actionUrl: 'vromm://notifications'
      },
      route: {
        title: 'Test Route Notification! 🛣️',
        message: 'Someone created a test route for you to check out',
        actionUrl: 'vromm://route/test-route-id'
      },
      message: {
        title: 'Test Message Notification! 💬',
        message: 'You have a test message waiting for you',
        actionUrl: 'vromm://messages/test-conversation-id'
      },
      follow: {
        title: 'Test Follow Notification! 👥',
        message: 'Test User started following you',
        actionUrl: 'vromm://profile/test-user-id'
      }
    };

    const notification = testNotifications[testType as keyof typeof testNotifications] || testNotifications.general;

    await this.sendEnhancedNotification({
      targetUserId: userId,
      type: `test_${testType}`,
      title: notification.title,
      message: notification.message,
      data: {
        test: true,
        test_type: testType,
        timestamp: new Date().toISOString()
      },
      actionUrl: notification.actionUrl,
      priority: 'normal'
    });
  }
}

export const pushNotificationService = new PushNotificationService(); 