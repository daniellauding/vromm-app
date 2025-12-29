import React, { useRef, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Animated, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemePreference } from '../../hooks/useThemeOverride';
import { useAuth } from '@/src/context/AuthContext';
import { useTranslation } from '@/src/contexts/TranslationContext';

interface AvatarModalProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  visible,
  onClose,
  onViewProfile,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';
  const { signOut } = useAuth();
  const { t, language } = useTranslation();
  
  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // Theme colors
  const backgroundColor = isDark ? '#151515' : '#fff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const borderColor = isDark ? '#333' : '#E0E0E0';
  
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
        useNativeDriver: true,
      }).start();
    }
  }, [visible, backdropOpacity, sheetTranslateY]);
  
  const handleLogout = () => {
    onClose();
    signOut();
    onLogout();
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        intensity={10}
        tint={isDark ? 'dark' : 'light'}
        pointerEvents="none"
      />
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.3)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
          <Animated.View
            style={{
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor={backgroundColor}
              padding="$4"
              paddingBottom={insets.bottom || 24}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
            >
              {/* Menu Options */}
              <YStack gap="$2">
                {/* View Profile */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onViewProfile();
                  }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                  }}
                >
                  <XStack alignItems="center" gap="$3">
                    <Feather name="user" size={24} color={textColor} />
                    <YStack flex={1}>
                      <Text fontWeight="600" fontSize={18} color={textColor}>
                        {t('profile.viewProfile') || 'View Profile'}
                      </Text>
                      <Text fontSize={14} color={isDark ? '#999' : '#666'}>
                        {t('profile.viewProfileDescription') || 'View and edit your profile'}
                      </Text>
                    </YStack>
                  </XStack>
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity
                  onPress={handleLogout}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                  }}
                >
                  <XStack alignItems="center" gap="$3">
                    <Feather name="log-out" size={24} color="#FF6B6B" />
                    <YStack flex={1}>
                      <Text fontWeight="600" fontSize={18} color="#FF6B6B">
                        {t('auth.logout') || 'Logout'}
                      </Text>
                      <Text fontSize={14} color={isDark ? '#999' : '#666'}>
                        {t('auth.logoutDescription') || 'Sign out of your account'}
                      </Text>
                    </YStack>
                  </XStack>
                </TouchableOpacity>
              </YStack>
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};