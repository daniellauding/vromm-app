import React from 'react';
import { Button, XStack, YStack, Text, View } from 'tamagui';
import { Feather } from '@expo/vector-icons';

interface RoundedIconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  layout?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
}

export function RoundedIconButton({
  icon,
  label,
  onPress,
  layout = 'horizontal',
  size = 'md',
  selected = false,
  disabled = false,
}: RoundedIconButtonProps) {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const containerSize = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  
  const iconElement = (
    <View
      width={containerSize}
      height={containerSize}
      borderRadius={containerSize / 2}
      backgroundColor={selected ? '#00E6C3' : 'rgba(0, 230, 195, 0.1)'}
      borderWidth={1}
      borderColor={selected ? '#00E6C3' : 'rgba(0, 230, 195, 0.3)'}
      alignItems="center"
      justifyContent="center"
    >
      <Feather
        name={icon}
        size={iconSize}
        color={selected ? '#000000' : '#00E6C3'}
      />
    </View>
  );

  const textElement = (
    <Text
      fontSize={size === 'sm' ? '$2' : size === 'lg' ? '$4' : '$3'}
      fontWeight="500"
      color={selected ? '#00E6C3' : '$color'}
      textAlign="center"
    >
      {label}
    </Text>
  );

  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      backgroundColor="transparent"
      borderWidth={0}
      padding="$2"
      opacity={disabled ? 0.5 : 1}
    >
      {layout === 'vertical' ? (
        <YStack alignItems="center" gap="$2">
          {iconElement}
          {textElement}
        </YStack>
      ) : (
        <XStack alignItems="center" gap="$3">
          {iconElement}
          {textElement}
        </XStack>
      )}
    </Button>
  );
}
