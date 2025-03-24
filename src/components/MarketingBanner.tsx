import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { tokens } from '../tokens';
import { XStack, YStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { Text } from './Text';

interface MarketingBannerProps {
  onClose?: () => void;
}

export function MarketingBanner({ onClose }: MarketingBannerProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <YStack
      backgroundColor="$blue4"
      padding="$4"
      borderRadius="$4"
      marginBottom="$4"
      position="relative"
    >
      <Pressable style={styles.closeButton} onPress={handleClose}>
        <Feather name="x" size={18} color={tokens.color.gray700} />
      </Pressable>

      <YStack gap="$2">
        <Text weight="semibold" size="md" color="$blue11">
          {t('auth.signIn.helpImprove')}
        </Text>

        <Text size="sm" color="$blue11" opacity={0.8}>
          Vromm is a tool to help improve driving education. We're looking for feedback to make it
          better!
        </Text>

        <XStack gap="$2" marginTop="$2">
          <Button size="sm" backgroundColor="$blue5" paddingHorizontal="$3" borderColor="$blue7">
            <Text size="sm" color="$blue11">
              {t('auth.signIn.forLearners')}
            </Text>
          </Button>
          <Button size="sm" backgroundColor="$blue5" paddingHorizontal="$3" borderColor="$blue7">
            <Text size="sm" color="$blue11">
              {t('auth.signIn.forSchools')}
            </Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10
  }
});
