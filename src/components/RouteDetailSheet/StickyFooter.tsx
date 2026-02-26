import React from 'react';
import { View, StyleSheet } from 'react-native';
import { XStack } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../Button';

interface StickyFooterProps {
  isSaved: boolean;
  isDriven: boolean;
  onSave: () => void;
  onMarkDriven: () => void;
  showGradient: boolean;
  colorScheme: 'light' | 'dark';
  bottomInset?: number;
}

export default function StickyFooter({
  isSaved,
  isDriven,
  onSave,
  onMarkDriven,
  showGradient,
  colorScheme,
  bottomInset = 0,
}: StickyFooterProps) {
  const bgColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

  return (
    <View style={{ backgroundColor: bgColor }}>
      {showGradient && (
        <LinearGradient
          colors={[
            'transparent',
            colorScheme === 'dark' ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
            bgColor,
          ]}
          style={styles.gradient}
          pointerEvents="none"
        />
      )}
      <XStack
        gap="$2"
        paddingHorizontal="$3"
        paddingTop="$2"
        paddingBottom={Math.max(bottomInset, 8)}
      >
        <Button
          variant="tertiary"
          size="md"
          onPress={onSave}
          flex={1}
        >
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={onMarkDriven}
          flex={1}
        >
          {isDriven ? 'Driven!' : 'Mark as Driven'}
        </Button>
      </XStack>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    height: 20,
    marginTop: -20,
  },
});
