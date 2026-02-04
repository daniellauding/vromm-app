import React from 'react';
import { TouchableOpacity } from 'react-native';
import { XStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Checkbox } from './Checkbox';
import { useThemePreference } from '../hooks/useThemeOverride';
import { useTourTarget } from './TourOverlay';

export type ExerciseCardSize = 'xs' | 'sm' | 'md' | 'lg';
export type ExerciseCardVariant = 'default' | 'compact' | 'detailed';

interface ExerciseCardProps {
  // Core props
  title: string;
  description?: string;
  displayIndex?: number;

  // State props
  checked?: boolean;
  disabled?: boolean;
  locked?: boolean;

  // Features
  showChevron?: boolean;  // Control chevron visibility

  // Actions
  onPress?: () => void;
  onCheckboxPress?: () => void;

  // Styling
  size?: ExerciseCardSize;
  variant?: ExerciseCardVariant;
  borderColor?: string;

  // Customization
  testID?: string;
  /** Tour target ID for highlighting during tours */
  tourTargetId?: string;
}

const sizeConfig = {
  xs: {
    padding: 8,
    titleSize: 14,
    descSize: 12,
    iconSize: 16,
    checkboxSize: 'xs' as const,
    borderRadius: 6,
  },
  sm: {
    padding: 12,
    titleSize: 16,
    descSize: 13,
    iconSize: 18,
    checkboxSize: 'sm' as const,
    borderRadius: 8,
  },
  md: {
    padding: 16,
    titleSize: 18,
    descSize: 14,
    iconSize: 20,
    checkboxSize: 'md' as const,
    borderRadius: 8,
  },
  lg: {
    padding: 20,
    titleSize: 20,
    descSize: 16,
    iconSize: 24,
    checkboxSize: 'lg' as const,
    borderRadius: 12,
  },
};

export function ExerciseCard({
  title,
  description,
  displayIndex,
  checked = false,
  disabled = false,
  locked = false,
  showChevron = true,  // Default to showing chevron
  onPress,
  onCheckboxPress,
  size = 'md',
  variant = 'default',
  borderColor,
  testID,
  tourTargetId,
}: ExerciseCardProps) {
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';
  const config = sizeConfig[size];
  // Register tour target for highlighting during tours
  const tourRef = tourTargetId ? useTourTarget(tourTargetId) : null;
  
  // Dynamic border color - simple and clean
  const getBorderColor = () => {
    if (borderColor) return borderColor;
    if (locked) return '#FF9500';
    return isDark ? '#333' : '#E5E5E5';
  };
  
  // Background color
  const getBackgroundColor = () => {
    if (variant === 'compact') return 'transparent';
    return isDark ? '#1A1A1A' : '#FFFFFF';
  };
  
  const handleCardPress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };
  
  const handleCheckboxPress = (e: any) => {
    e?.stopPropagation?.();
    if (!disabled && onCheckboxPress) {
      onCheckboxPress();
    }
  };
  
  // Removed progress bar - keeping it simple
  
  // Removed badges - keeping it simple
  
  // Show chevron if prop is true
  const renderRightIcon = () => {
    if (locked) {
      return <MaterialIcons name="lock" size={config.iconSize} color="#FF9500" />;
    }
    // Show chevron only if showChevron prop is true
    if (showChevron) {
      return (
        <Feather
          name="chevron-right"
          size={config.iconSize}
          color={isDark ? '#888' : '#666'}
        />
      );
    }
    return null;
  };
  
  // Determine if we should show checkbox (smart detection)
  const shouldShowCheckbox = !!onCheckboxPress;
  
  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        ref={tourRef}
        testID={testID}
        onPress={handleCardPress}
        disabled={disabled}
        style={{
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <XStack
          paddingVertical={config.padding}
          paddingHorizontal={config.padding}
          alignItems="center"
          gap={12}
        >
          {shouldShowCheckbox && (
            <Checkbox
              checked={checked}
              disabled={disabled}
              size={config.checkboxSize}
              stopPropagation={true}
              onPress={handleCheckboxPress}
            />
          )}
          <Text
            fontSize={config.titleSize}
            fontWeight="900"
            fontStyle="italic"
            color="$color"
            numberOfLines={1}
            flex={1}
          >
            {displayIndex && `${displayIndex}. `}{title}
          </Text>
          {renderRightIcon()}
        </XStack>
      </TouchableOpacity>
    );
  }
  
  // Default and detailed variants
  return (
    <TouchableOpacity
      ref={tourRef}
      testID={testID}
      onPress={handleCardPress}
      disabled={disabled}
      style={{
        paddingVertical: config.padding,
        paddingHorizontal: config.padding,
        borderRadius: config.borderRadius,
        borderWidth: 1,
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <XStack alignItems="flex-start" gap={8}>
        {shouldShowCheckbox && (
          <Checkbox
            checked={checked}
            disabled={disabled}
            size={config.checkboxSize}
            stopPropagation={true}
            onPress={handleCheckboxPress}
          />
        )}
        
        <Card
          paddingTop={0}
          paddingBottom={0}
          paddingLeft={variant === 'detailed' ? 16 : 0}
          paddingRight={variant === 'detailed' ? 16 : 0}
          backgroundColor="transparent"
          flex={1}
        >
          <XStack justifyContent="space-between" alignItems="center" gap={4}>
            <XStack alignItems="center" gap={8} flex={1}>
              <Text
                fontSize={config.titleSize}
                fontWeight="900"
                fontStyle="italic"
                color="$color"
                numberOfLines={1}
              >
                {displayIndex && `${displayIndex}. `}{title}
              </Text>
            </XStack>
            {renderRightIcon()}
          </XStack>
          
          {description && (
            <Text color="$gray11" marginTop={12} fontSize={config.descSize}>
              {description}
            </Text>
          )}
          
        </Card>
        
      </XStack>
    </TouchableOpacity>
  );
}