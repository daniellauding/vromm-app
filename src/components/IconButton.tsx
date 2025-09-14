import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  flex?: number;
  width?: string | number;
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 'md',
  selected = false,
  disabled = false,
  backgroundColor = '#F6F6F6',
  borderColor = '#F6F6F6',
  flex,
  width,
}: IconButtonProps) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 28 : 24;
  const containerSize = size === 'sm' ? 40 : size === 'lg' ? 56 : 48;
  
  const iconColor = selected ? '#00E6C3' : '#666666';
  const iconBorderColor = selected ? '#00E6C3' : 'transparent';
  const textColor = selected ? '#000' : '#000';
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: flex,
        width: width,
        opacity: disabled ? 0.5 : 1,
      }}
      activeOpacity={0.7}
    >
      <YStack
        alignItems="center"
        justifyContent="center"
        gap="$2"
        padding="$3"
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        borderWidth={1}
        borderRadius="$3"
        minHeight={containerSize + 20} // Extra space for text
      >
        <View
          style={{
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: selected ? 'rgba(0, 230, 195, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: iconBorderColor,
            borderWidth: 1,
          }}
        >
          <Feather name={icon} size={iconSize} color={iconColor} />
        </View>
        <Text 
          fontSize="$2.5" 
          fontWeight="600" 
          color={textColor} 
          textAlign="center"
          numberOfLines={2}
        >
          {label}
        </Text>
      </YStack>
    </TouchableOpacity>
  );
}