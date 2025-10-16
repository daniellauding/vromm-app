import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { Check } from '@tamagui/lucide-icons';
import { useTheme } from 'tamagui';
import { sizes } from '../theme/sizes';

export type SelectButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Get height for each size to match FormField
const getSizeStyles = (size: SelectButtonSize = 'xl') => {
  switch (size) {
    case 'xs':
      return { height: sizes.button.xs }; // 32px
    case 'sm':
      return { height: sizes.button.sm }; // 40px
    case 'md':
      return { height: sizes.button.md }; // 48px
    case 'lg':
      return { height: sizes.button.lg }; // 56px
    case 'xl':
      return { height: sizes.button.xl }; // 64px
    default:
      return { height: sizes.button.xl }; // 64px default
  }
};

const styles = StyleSheet.create({
  selectButton: {
    paddingHorizontal: 16,
    borderRadius: 4,
    marginVertical: 4,
    borderWidth: 1,
    justifyContent: 'center',
  },
});

interface SelectButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  isSelected?: boolean;
  isActive?: boolean; // When sheet is open
  variant?: 'select' | 'radio';
  size?: SelectButtonSize;
  style?: object;
}

export function SelectButton({
  onPress,
  children,
  isSelected = false,
  isActive = false,
  variant = 'select',
  size = 'xl',
  style,
}: SelectButtonProps) {
  const theme = useTheme();
  const borderColor = theme.borderColor?.val || 'rgba(0, 0, 0, 0.1)';
  const focusBorderColor = '#34D399'; // tokens.color.emerald400 (exact FormField focus color)
  const focusBackgroundColor = theme.backgroundHover?.val || '#EBEBEB';

  const shouldShowFocus = variant === 'radio' ? isSelected : isActive;
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.selectButton,
        sizeStyles,
        {
          borderWidth: shouldShowFocus ? 2 : 1,
          borderColor: shouldShowFocus ? focusBorderColor : borderColor,
          backgroundColor: shouldShowFocus ? focusBackgroundColor : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

interface RadioButtonProps {
  onPress: () => void;
  title: string;
  description?: string;
  isSelected: boolean;
  size?: SelectButtonSize;
}

export function RadioButton({
  onPress,
  title,
  description,
  isSelected,
  size = 'xl',
}: RadioButtonProps) {
  const theme = useTheme();
  const textColor = theme.color?.val || '#11181C';
  const focusBorderColor = '#34D399'; // Same as border color

  return (
    <SelectButton onPress={onPress} isSelected={isSelected} variant="radio" size={size}>
      <XStack gap={8} alignItems="center" width="100%">
        <YStack flex={1}>
          <Text color={isSelected ? textColor : '$color'} size="sm" weight="semibold">
            {title}
          </Text>
          {description && (
            <Text size="sm" color="$gray11">
              {description}
            </Text>
          )}
        </YStack>
        {isSelected && <Check size={16} color={focusBorderColor} style={{ marginLeft: 'auto' }} />}
      </XStack>
    </SelectButton>
  );
}

interface DropdownButtonProps {
  onPress: () => void;
  value: string;
  placeholder?: string;
  isActive?: boolean; // When dropdown is open
  size?: SelectButtonSize;
}

export function DropdownButton({
  onPress,
  value,
  placeholder,
  isActive = false,
  size = 'xl',
}: DropdownButtonProps) {
  const theme = useTheme();
  const textColor = theme.color?.val || '#11181C';
  const focusBorderColor = '#34D399'; // Same as border color

  return (
    <SelectButton onPress={onPress} isActive={isActive} variant="select" size={size}>
      <XStack gap={8} alignItems="center" justifyContent="space-between" width="100%">
        <Text color={textColor} size="sm">
          {value || placeholder || 'Select...'}
        </Text>
        <Feather name="chevron-down" size={16} color={isActive ? focusBorderColor : textColor} />
      </XStack>
    </SelectButton>
  );
}
