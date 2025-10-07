import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions, Alert } from 'react-native';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from 'react-native';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AppAnalytics } from '../utils/analytics';
import { notificationService } from '../services/notificationService';
import { useToast } from '../contexts/ToastContext';

const { height } = Dimensions.get('window');

interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
}

type NotificationSheetView = 'list';

export function NotificationsSheet({ visible, onClose }: NotificationsSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { showToast } = useToast();

  // Sheet navigation state (for future expansion)
  const [currentView, setCurrentView] = useState<NotificationSheetView>('list');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // Bulk action handlers
  const handleMarkAllAsRead = async () => {
    try {
      setIsProcessing(true);
      await notificationService.markAllAsRead();
      showToast({
        title: 'Success',
        message: 'All notifications marked as read',
        type: 'success',
      });
      setShowBulkActions(false);
      // Force refresh by updating the refresh key
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast({
        title: 'Error',
        message: 'Failed to mark all notifications as read',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const handleArchiveAll = () => {
    setShowArchiveConfirm(true);
    setShowBulkActions(false);
  };

  const handleArchiveConfirm = async () => {
    try {
      setIsProcessing(true);
      await notificationService.archiveAllNotifications();
      showToast({
        title: 'Success',
        message: 'All notifications archived',
        type: 'success',
      });
      setShowArchiveConfirm(false);
      // Force refresh by updating the refresh key
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error archiving all notifications:', error);
      showToast({
        title: 'Error',
        message: 'Failed to archive all notifications',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchiveCancel = () => {
    setShowArchiveConfirm(false);
  };

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 20}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              height={height * 0.9}
              maxHeight={height * 0.9}
            >
              {/* Header */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack alignItems="center" gap="$3" flex={1}>
                  <Text fontSize="$6" fontWeight="bold" color="$color" flex={1}>
                    {showArchived ? 'Archived Notifications' : 'Notifications'}
                  </Text>
                </XStack>

                <XStack alignItems="center" gap="$3">
                  {/* Archive Toggle */}
                  <TouchableOpacity
                    onPress={() => setShowArchived(!showArchived)}
                    style={{
                      padding: 8,
                      backgroundColor: showArchived
                        ? colorScheme === 'dark'
                          ? '#00FFBC'
                          : '#00CC99'
                        : colorScheme === 'dark'
                          ? '#2A2A2A'
                          : '#F5F5F5',
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Feather
                      name={showArchived ? 'archive-restore' : 'archive'}
                      size={16}
                      color={showArchived ? '#000' : iconColor}
                    />
                    <Text fontSize="$2" color={showArchived ? '#000' : iconColor} fontWeight="500">
                      {showArchived ? 'Active' : 'Archived'}
                    </Text>
                  </TouchableOpacity>

                  {/* Bulk Actions Dropdown - only show for active notifications */}
                  {!showArchived && (
                    <TouchableOpacity
                      onPress={() => setShowBulkActions(!showBulkActions)}
                      style={{
                        padding: 8,
                        backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                        borderRadius: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      disabled={isProcessing}
                    >
                      <Feather
                        name="more-horizontal"
                        size={16}
                        color={isProcessing ? '#666' : iconColor}
                      />
                      <Text
                        fontSize="$2"
                        color={isProcessing ? '#666' : iconColor}
                        fontWeight="500"
                      >
                        Actions
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity onPress={onClose}>
                    <Feather name="x" size={24} color={iconColor} />
                  </TouchableOpacity>
                </XStack>
              </XStack>

              {/* Bulk Actions Dropdown */}
              {showBulkActions && (
                <YStack
                  backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                  borderRadius="$3"
                  padding="$3"
                  gap="$2"
                  borderWidth={1}
                  borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                >
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    disabled={isProcessing}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      backgroundColor: 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      opacity: isProcessing ? 0.5 : 1,
                    }}
                  >
                    <Feather name="check" size={16} color="#00FFBC" />
                    <Text fontSize="$3" color="$color" fontWeight="500">
                      Mark All as Read
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleArchiveAll}
                    disabled={isProcessing}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      backgroundColor: 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      opacity: isProcessing ? 0.5 : 1,
                    }}
                  >
                    <Feather name="archive" size={16} color="#EF4444" />
                    <Text fontSize="$3" color="$color" fontWeight="500">
                      Archive All
                    </Text>
                  </TouchableOpacity>

                  {isProcessing && (
                    <XStack alignItems="center" gap="$2" padding="$2">
                      <Spinner size="small" color="#00FFBC" />
                      <Text fontSize="$2" color="$gray11">
                        Processing...
                      </Text>
                    </XStack>
                  )}
                </YStack>
              )}

              {/* Notifications Content */}
              <YStack flex={1}>
                <NotificationsScreen
                  key={`notifications-${refreshKey}-${showArchived}`}
                  showArchived={showArchived}
                  isModal={true}
                />
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Custom Archive Confirmation Modal */}
      <Modal
        visible={showArchiveConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={handleArchiveCancel}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <YStack
            backgroundColor={backgroundColor}
            borderRadius="$4"
            padding="$4"
            gap="$4"
            minWidth={280}
            maxWidth={400}
          >
            <Text fontSize="$5" fontWeight="bold" color="$color" textAlign="center">
              Archive All Notifications?
            </Text>

            <Text fontSize="$3" color="$gray11" textAlign="center" lineHeight={20}>
              This will archive all your notifications. You can view archived notifications later.
            </Text>

            <XStack gap="$3" justifyContent="center">
              <Button
                variant="outlined"
                onPress={handleArchiveCancel}
                disabled={isProcessing}
                flex={1}
                size="$3"
              >
                <Text color="$color">Cancel</Text>
              </Button>

              <Button
                backgroundColor="#EF4444"
                color="white"
                onPress={handleArchiveConfirm}
                disabled={isProcessing}
                flex={1}
                size="$3"
              >
                {isProcessing ? (
                  <XStack alignItems="center" gap="$2">
                    <Spinner size="small" color="white" />
                    <Text color="white">Archiving...</Text>
                  </XStack>
                ) : (
                  <Text color="white" fontWeight="600">
                    Archive All
                  </Text>
                )}
              </Button>
            </XStack>
          </YStack>
        </View>
      </Modal>
    </Modal>
  );
}
