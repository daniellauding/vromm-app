import React, { useRef, useEffect } from 'react';
import {
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { YStack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Easing } from 'react-native';

const { height } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxHeight?: number;
  contentContainerStyle?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  maxHeight = height * 0.9,
  contentContainerStyle,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({ light: '#fff', dark: '#1C1C1C' }, 'background');
  
  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Fade in backdrop
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Slide up sheet
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out backdrop
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Slide down sheet
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight,
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
              style={contentContainerStyle}
            >
              {title && (
                <Text size="xl" weight="bold" color="$color" textAlign="center">
                  {title}
                </Text>
              )}
              
              <ScrollView 
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={{ maxHeight: maxHeight - 100 }}
              >
                {children}
              </ScrollView>
              
              {showCloseButton && (
                <Button variant="tertiary" size="md" onPress={onClose}>
                  Close
                </Button>
              )}
            </YStack>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}