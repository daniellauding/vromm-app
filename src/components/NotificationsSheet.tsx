import React, { useRef, useEffect, useState } from 'react';
import { Modal, Animated, Pressable, Easing, View, Dimensions } from 'react-native';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useColorScheme } from 'react-native';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AppAnalytics } from '../utils/analytics';

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

  // Sheet navigation state (for future expansion)
  const [currentView, setCurrentView] = useState<NotificationSheetView>('list');

  // Theme colors - matching other sheets
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');

  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

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
                <Text fontSize="$6" fontWeight="bold" color="$color">
                  Notifications
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={24} color={iconColor} />
                </TouchableOpacity>
              </XStack>

              {/* Notifications Content */}
              <YStack flex={1}>
                <NotificationsScreen />
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
