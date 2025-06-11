import React from 'react';
import { View, StyleSheet } from 'react-native';
import { XStack, Text, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';

interface ModalHeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClose: () => void;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
  },
});

export function ModalHeader({ title, leftElement, rightElement, onClose }: ModalHeaderProps) {
  const iconColor = 'white';

  return (
    <XStack
      height={56}
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
      backgroundColor="$background"
      borderBottomColor="$borderColor"
      borderBottomWidth={1}
    >
      <XStack width={80} alignItems="center">
        {leftElement || (
          <Button
            marginLeft={-12}
            alignSelf="flex-start"
            onPress={onClose}
            icon={<Feather name="x" size={24} color={iconColor} />}
            unstyled
          />
        )}
      </XStack>

      <Text
        numberOfLines={1}
        fontWeight="600"
        fontSize={18}
        color="$color"
        flex={1}
        textAlign="center"
      >
        {title}
      </Text>

      <XStack width={80} justifyContent="flex-end">
        {rightElement || <View style={{ width: 32 }} />}
      </XStack>
    </XStack>
  );
}
