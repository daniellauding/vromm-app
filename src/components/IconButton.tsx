import React from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
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
  badge?: string;
}

export function IconButton({
  icon,
  label,
  onPress,
  size = 'md',
  selected = false,
  disabled = false,
  backgroundColor,
  borderColor,
  flex,
  width,
  badge,
}: IconButtonProps) {
  const colorScheme = useColorScheme();
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 28 : 24;
  const containerSize = size === 'sm' ? 40 : size === 'lg' ? 56 : 48;

  // Dynamic colors based on theme and selection state
  const iconColor = selected ? '#00E6C3' : colorScheme === 'dark' ? '#CCCCCC' : '#666666';
  const iconBorderColor = selected ? '#00E6C3' : 'transparent';
  const textColor = selected
    ? colorScheme === 'dark'
      ? '#FFFFFF'
      : '#000000'
    : colorScheme === 'dark'
      ? '#CCCCCC'
      : '#000000';

  // Default background colors based on theme
  const defaultBackgroundColor =
    backgroundColor || (colorScheme === 'dark' ? '#2A2A2A' : '#F6F6F6');
  const defaultBorderColor = borderColor || (colorScheme === 'dark' ? '#404040' : '#F6F6F6');

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: flex,
        width: typeof width === 'string' ? undefined : width,
        opacity: disabled ? 0.5 : 1,
      }}
      activeOpacity={0.7}
    >
      <YStack
        alignItems="center"
        justifyContent="center"
        gap="$2"
        padding="$3"
        backgroundColor={defaultBackgroundColor}
        borderColor={defaultBorderColor}
        borderWidth={1}
        borderRadius="$3"
        minHeight={containerSize + 20} // Extra space for text
      >
        <View
          style={{
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: selected
              ? 'rgba(0, 230, 195, 0.1)'
              : colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: iconBorderColor,
            borderWidth: 1,
            position: 'relative',
          }}
        >
          <Feather name={icon} size={iconSize} color={iconColor} />
          {badge && (
            <View
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                backgroundColor: '#00E6C3',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF',
              }}
            >
              <Text fontSize={10} fontWeight="bold" color="#000000" textAlign="center">
                {badge}
              </Text>
            </View>
          )}
        </View>
        <Text fontSize={12} fontWeight="600" color={textColor} textAlign="center" numberOfLines={2}>
          {label}
        </Text>
      </YStack>
    </TouchableOpacity>
  );
}
