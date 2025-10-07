import React from 'react';
import { Modal, Pressable, useColorScheme } from 'react-native';
import { YStack, XStack, Heading } from 'tamagui';
import { Button } from './Button';
import { Text } from './Text';
import { useTranslation } from '../contexts/TranslationContext';
import { X } from '@tamagui/lucide-icons';

interface FacebookWarningModalProps {
  visible: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function FacebookWarningModal({ visible, onContinue, onCancel }: FacebookWarningModalProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        onPress={onCancel}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            backgroundColor={backgroundColor}
            borderRadius="$4"
            padding="$6"
            width="100%"
            maxWidth={400}
            borderWidth={1}
            borderColor={borderColor}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.25}
            shadowRadius={12}
            elevation={8}
          >
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Heading size="$5" color={textColor}>
                {t('auth.facebookWarning.title')}
              </Heading>
              <Button
                variant="ghost"
                size="sm"
                onPress={onCancel}
                padding="$2"
                accessibilityLabel="Close"
              >
                <X size={16} color={textColor} />
              </Button>
            </XStack>

            {/* Content */}
            <YStack gap="$3" marginBottom="$6">
              <Text size="md" color={textColor}>
                {t('auth.facebookWarning.message')}
              </Text>

              <Text size="md" color={textColor} fontWeight="600">
                {t('auth.facebookWarning.important')}
              </Text>

              <Text size="md" color={textColor}>
                {t('auth.facebookWarning.instruction')}
              </Text>
            </YStack>

            {/* Actions */}
            <XStack gap="$3" justifyContent="flex-end">
              <Button variant="secondary" size="md" onPress={onCancel} flex={1}>
                {t('auth.facebookWarning.cancel')}
              </Button>
              <Button variant="primary" size="md" onPress={onContinue} flex={1}>
                {t('auth.facebookWarning.continue')}
              </Button>
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
