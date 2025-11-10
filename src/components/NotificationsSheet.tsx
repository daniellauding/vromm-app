import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Modal, Animated, Pressable, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, Spinner, useTheme } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from 'react-native';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { notificationService } from '../services/notificationService';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/TranslationContext';
import { Button } from './Button';

const { height } = Dimensions.get('window');

interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsSheet({ visible, onClose }: NotificationsSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { showToast } = useToast();
  const theme = useTheme();
  const { language, t } = useTranslation();

  // Helper function to get translation with fallback when t() returns the key itself
  const getTranslation = (key: string, fallback: string): string => {
    const translated = t(key);
    // If translation is missing, t() returns the key itself - use fallback instead
    return translated && translated !== key ? translated : fallback;
  };

  // State
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gesture handling for drag-to-dismiss and snap points
  const translateY = useSharedValue(height);
  const isDragging = useRef(false);

  // Snap points for resizing (top Y coordinates like RoutesDrawer)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
      small: height * 0.6, // Top at 60% of screen (show 40% - small)
      mini: height * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: height, // Completely off-screen
    };
    return points;
  }, []);

  const currentState = useSharedValue(snapPoints.large);

  // Bulk action handlers
  const handleMarkAllAsRead = async () => {
    try {
      setIsProcessing(true);
      await notificationService.markAllAsRead();
      showToast({
        title: getTranslation('common.success', language === 'sv' ? 'Lyckades' : 'Success'),
        message: getTranslation(
          'notifications.allCleared',
          language === 'sv' ? 'Alla notiser rensade' : 'All notifications cleared'
        ),
        type: 'success',
      });
      setShowBulkActions(false);
      // Force refresh by updating the refresh key
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast({
        title: 'Error',
        message: 'Failed to clear notifications',
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

  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed, translateY]);

  // Pan gesture for drag-to-resize
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;

        // Constrain to snap points range
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.mini + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentState.value + translationY;

      // Dismiss if dragged down past mini with reasonable velocity
      if (currentPosition > snapPoints.mini + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.mini;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.mini];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.mini);

      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentState.value = boundedTarget;
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Reset gesture translateY when opening and set to large snap point
      translateY.value = withSpring(snapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.large;

      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, snapPoints.large, currentState, translateY]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'transparent',
        }}
      >
        <View style={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <GestureDetector gesture={panGesture}>
            <ReanimatedAnimated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: height,
                  backgroundColor: backgroundColor,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                },
                animatedGestureStyle,
              ]}
            >
              <YStack padding="$4" paddingBottom={insets.bottom || 20} gap="$4" flex={1}>
                {/* Drag Handle */}
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: theme.gray8?.val || '#CCC',
                    }}
                  />
                </View>
                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$6" fontWeight="bold" color="$color">
                    {showArchived
                      ? getTranslation(
                          'notifications.archived',
                          language === 'sv' ? 'Arkiverade notiser' : 'Archived Notifications'
                        )
                      : getTranslation(
                          'notifications.title',
                          language === 'sv' ? 'Notiser' : 'Notifications'
                        )}
                  </Text>

                  <XStack alignItems="center" gap="$2">
                    {/* View Toggle: Active/Archived */}
                    <TouchableOpacity
                      onPress={() => setShowArchived(!showArchived)}
                      style={{
                        padding: 8,
                        // backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                        borderRadius: 6,
                      }}
                    >
                      <Feather
                        name={showArchived ? 'inbox' : 'archive'}
                        size={18}
                        color={iconColor}
                      />
                    </TouchableOpacity>

                    {/* Actions Menu - only show for active notifications */}
                    {!showArchived && (
                      <TouchableOpacity
                        onPress={() => setShowBulkActions(!showBulkActions)}
                        style={{
                          padding: 8,
                          // backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                          borderRadius: 6,
                        }}
                        disabled={isProcessing}
                      >
                        <Feather
                          name="more-vertical"
                          size={18}
                          color={isProcessing ? '#666' : iconColor}
                        />
                      </TouchableOpacity>
                    )}

                    {/* Close */}
                    {/* <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                    <Feather name="x" size={24} color={iconColor} />
                  </TouchableOpacity> */}
                  </XStack>
                </XStack>

                {/* Actions Dropdown */}
                {showBulkActions && (
                  <YStack
                    // backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                    borderRadius="$3"
                    padding="$2"
                    gap="$2"
                    borderWidth={1}
                    // borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleMarkAllAsRead}
                      disabled={isProcessing}
                    >
                      <Text>Clear All</Text>
                    </Button>

                    <Button
                      variant="outlined"
                      size="sm"
                      onPress={handleArchiveAll}
                      disabled={isProcessing}
                    >
                      <Text>Archive All</Text>
                    </Button>

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
            </ReanimatedAnimated.View>
          </GestureDetector>
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
              {getTranslation(
                'notifications.archiveAllConfirm',
                language === 'sv' ? 'Arkivera alla notiser?' : 'Archive All Notifications?'
              )}
            </Text>

            <Text fontSize="$3" color="$gray11" textAlign="center" lineHeight={20}>
              {getTranslation(
                'notifications.archiveAllDescription',
                language === 'sv'
                  ? 'Detta kommer att arkivera alla dina notiser. Du kan visa arkiverade notiser senare.'
                  : 'This will archive all your notifications. You can view archived notifications later.'
              )}
            </Text>

            <XStack gap="$3" justifyContent="center">
              <Button
                variant="outlined"
                onPress={handleArchiveCancel}
                disabled={isProcessing}
                flex={1}
                size="md"
              >
                <Text color="$color">Cancel</Text>
              </Button>

              <Button
                backgroundColor="#EF4444"
                onPress={handleArchiveConfirm}
                disabled={isProcessing}
                flex={1}
                size="md"
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
