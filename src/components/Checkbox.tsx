import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';

export type CheckboxSize = 'xs' | 'sm' | 'md' | 'lg';

export type CheckboxProps = {
  checked?: boolean;
  disabled?: boolean;
  onPress?: (e?: any) => void;
  size?: CheckboxSize;
  testID?: string;
  stopPropagation?: boolean;
  variant?: 'default' | 'rounded';
};

const sizeMap = {
  xs: { size: 20, borderRadius: 4, iconSize: 12, borderWidth: 2 },
  sm: { size: 24, borderRadius: 6, iconSize: 16, borderWidth: 2 },
  md: { size: 28, borderRadius: 6, iconSize: 20, borderWidth: 2 },
  lg: { size: 32, borderRadius: 8, iconSize: 24, borderWidth: 2 },
} as const;

export function Checkbox({
  checked = false,
  disabled = false,
  onPress,
  size = 'md',
  testID,
  stopPropagation = false,
  variant = 'default',
}: CheckboxProps) {
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';
  
  const config = sizeMap[size];
  const borderRadius = variant === 'rounded' ? config.size / 2 : config.borderRadius;
  
  // Theme-aware colors - improved consistency with Chip component
  const colors = {
    checkedBackground: '#00E6C3',
    checkedBorder: '#00E6C3',
    uncheckedBackground: 'transparent',
    uncheckedBorder: isDark ? '#666' : '#888',
    checkIcon: '#000',
    disabledBorder: isDark ? '#444' : '#CCC',
    disabledBackground: isDark ? '#333' : '#F5F5F5',
    hoverBackground: isDark ? '#2A2A2A' : '#F8F8F8',
  };

  const handlePress = (e: any) => {
    if (disabled) return;
    
    if (stopPropagation && e?.stopPropagation) {
      e.stopPropagation();
    }
    
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      style={{
        width: config.size,
        height: config.size,
        borderRadius,
        borderWidth: config.borderWidth,
        borderColor: disabled
          ? colors.disabledBorder
          : checked
          ? colors.checkedBorder
          : colors.uncheckedBorder,
        backgroundColor: disabled
          ? colors.disabledBackground
          : checked
          ? colors.checkedBackground
          : colors.uncheckedBackground,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {checked && (
        <Feather
          name="check"
          size={config.iconSize}
          color={colors.checkIcon}
        />
      )}
    </TouchableOpacity>
  );
}