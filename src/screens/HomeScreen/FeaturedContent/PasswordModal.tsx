import React, { useState } from 'react';
import { TouchableOpacity, Modal as RNModal, TextInput, Alert, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../../contexts/TranslationContext';
import { useColorScheme } from 'react-native';
import { useUnlock } from '../../../contexts/UnlockContext';
import { useToast } from '../../../contexts/ToastContext';
import { FeaturedLearningPath } from './types';

export default function PasswordModal({
  visible,
  onClose,
  passwordPath,
  setSelectedPathId,
  setSelectedTitle,
  setShowExerciseSheet,
}: {
  visible: boolean;
  onClose: () => void;
  passwordPath: FeaturedLearningPath | null;
  setSelectedPathId: (pathId: string) => void;
  setSelectedTitle: (title: string) => void;
  setShowExerciseSheet: (show: boolean) => void;
}) {
  const colorScheme = useColorScheme();
  const { language: lang } = useTranslation();
  const { showToast } = useToast();

  const { addUnlockedPath } = useUnlock();

  const [pathPasswordInput, setPathPasswordInput] = useState('');

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 350 }}
        >
          <YStack
            backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
            borderRadius={24}
            padding={20}
            gap={16}
            borderWidth={1}
            borderColor={colorScheme === 'dark' ? '#333' : '#E5E5E5'}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap={8} flex={1}>
                <MaterialIcons name="lock" size={24} color="#FF9500" />
                <Text fontSize={20} fontWeight="bold" color="$color" flex={1}>
                  Locked Learning Path
                </Text>
              </XStack>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={colorScheme === 'dark' ? '#FFF' : '#666'} />
              </TouchableOpacity>
            </XStack>

            {passwordPath && (
              <>
                <YStack gap={12}>
                  <Text fontSize={24} fontWeight="bold" color="$color">
                    {passwordPath.title[lang] || passwordPath.title.en}
                  </Text>
                  <Text fontSize={16} color="$gray11">
                    This learning path is locked and requires a password to access.
                  </Text>
                </YStack>

                {passwordPath.lock_password && (
                  <YStack gap={12}>
                    <Text color="$gray11" fontSize={16}>
                      Enter password to unlock:
                    </Text>
                    <View
                      style={{
                        backgroundColor: 'rgba(255, 147, 0, 0.2)',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#FF9500',
                        padding: 8,
                      }}
                    >
                      <TextInput
                        value={pathPasswordInput}
                        onChangeText={setPathPasswordInput}
                        secureTextEntry
                        style={{
                          backgroundColor: '$backgroundHover',
                          color: '$color',
                          padding: 16,
                          borderRadius: 8,
                          fontSize: 18,
                        }}
                        placeholder="Enter password"
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                      />
                    </View>
                  </YStack>
                )}

                <XStack gap={12} justifyContent="center">
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#E5E5E5',
                      padding: 16,
                      borderRadius: 12,
                      flex: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Text color="$color">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!passwordPath?.lock_password) return;

                      if (pathPasswordInput === passwordPath.lock_password) {
                        // Use shared context to unlock
                        await addUnlockedPath(passwordPath.id);
                        setPathPasswordInput('');
                        onClose();

                        showToast({
                          title: 'Unlocked!',
                          message: 'Learning path has been unlocked',
                          type: 'success',
                        });

                        // Now open the exercise sheet
                        setSelectedPathId(passwordPath.id);
                        setSelectedTitle(passwordPath.title[lang] || passwordPath.title.en);
                        setShowExerciseSheet(true);
                      } else {
                        Alert.alert('Incorrect Password', 'The password you entered is incorrect.');
                      }
                    }}
                    style={{
                      backgroundColor: '#FF9500',
                      padding: 16,
                      borderRadius: 12,
                      flex: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Text color="#000" fontWeight="bold">
                      Unlock
                    </Text>
                  </TouchableOpacity>
                </XStack>
              </>
            )}
          </YStack>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}
