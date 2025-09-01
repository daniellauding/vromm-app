import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { Check } from '@tamagui/lucide-icons';
import { useThemeColor } from '../../hooks/useThemeColor';

const styles = StyleSheet.create({
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginVertical: 4,
    borderWidth: 1,
  },
});

interface SelectButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  isSelected?: boolean;
  isActive?: boolean; // When sheet is open
  variant?: 'select' | 'radio';
  style?: object;
}

export function SelectButton({ 
  onPress, 
  children, 
  isSelected = false, 
  isActive = false,
  variant = 'select',
  style,
}: SelectButtonProps) {
  const borderColor = useThemeColor(
    { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
    'background',
  );
  const focusBorderColor = '#34D399'; // tokens.color.emerald400 (exact FormField focus color)
  const focusBackgroundColor = useThemeColor(
    { light: '#EBEBEB', dark: '#282828' }, 
    'background'
  ); // FormField focus background (grayish color)

  const shouldShowFocus = variant === 'radio' ? isSelected : isActive;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.selectButton,
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
}

export function RadioButton({ onPress, title, description, isSelected }: RadioButtonProps) {
  const textColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const focusBorderColor = '#34D399'; // Same as border color

  return (
    <SelectButton onPress={onPress} isSelected={isSelected} variant="radio">
      <XStack gap={8} padding="$2" alignItems="center" width="100%">
        <YStack flex={1}>
          <Text color={isSelected ? textColor : '$color'} size="md" weight="600">
            {title}
          </Text>
          {description && (
            <Text size="sm" color="$gray11">
              {description}
            </Text>
          )}
        </YStack>
        {isSelected && (
          <Check size={16} color={focusBorderColor} style={{ marginLeft: 'auto' }} />
        )}
      </XStack>
    </SelectButton>
  );
}

interface DropdownButtonProps {
  onPress: () => void;
  value: string;
  placeholder?: string;
  isActive?: boolean; // When dropdown is open
}

export function DropdownButton({ onPress, value, placeholder, isActive = false }: DropdownButtonProps) {
  const textColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const focusBorderColor = '#34D399'; // Same as border color

  return (
    <SelectButton onPress={onPress} isActive={isActive} variant="select">
      <XStack gap={8} padding="$2" alignItems="center" justifyContent="space-between" width="100%">
        <Text color={textColor} size="md">
          {value || placeholder || 'Select...'}
        </Text>
        <Feather name="chevron-down" size={16} color={isActive ? focusBorderColor : textColor} />
      </XStack>
    </SelectButton>
  );
}
