import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { XStack, YStack, Text, Card } from 'tamagui';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Checkbox } from './Checkbox';
import { useThemePreference } from '../hooks/useThemeOverride';

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
  active?: boolean;
  
  // Features
  repeatCount?: number;
  commentCount?: number;
  hasQuiz?: boolean;
  
  // Paywall
  paywallEnabled?: boolean;
  price?: number;
  currency?: string;
  
  // Progress
  completedRepeats?: number;
  
  // Actions
  onPress?: () => void;
  onCheckboxPress?: () => void;
  
  // Styling
  size?: ExerciseCardSize;
  variant?: ExerciseCardVariant;
  borderColor?: string;
  
  // Additional info
  lastAction?: {
    action: string;
    actorName?: string;
    createdAt: string;
  };
  
  // Customization
  testID?: string;
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
  active = false,
  repeatCount,
  commentCount,
  hasQuiz = false,
  paywallEnabled = false,
  price,
  currency = 'USD',
  completedRepeats = 0,
  onPress,
  onCheckboxPress,
  size = 'md',
  variant = 'default',
  borderColor,
  lastAction,
  testID,
}: ExerciseCardProps) {
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';
  const iconColor = isDark ? '#FFFFFF' : '#000000';
  const config = sizeConfig[size];
  
  // Dynamic border color - automatically highlight when checked
  const getBorderColor = () => {
    if (borderColor) return borderColor;
    if (checked) return '#00E6C3';
    if (active) return '#00E6C3';
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
  
  // Render progress bar for repeats (only show if repeat count > 1 and we have progress)
  const renderProgressBar = () => {
    if (!repeatCount || repeatCount <= 1) return null;
    const percent = repeatCount > 0 ? completedRepeats / repeatCount : 0;
    
    return (
      <XStack alignItems="center" gap={4} marginTop={4}>
        <View
          style={{
            width: 60,
            height: 4,
            backgroundColor: '#333',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(percent * 100)}%`,
              height: '100%',
              backgroundColor: '#00E6C3',
              borderRadius: 2,
            }}
          />
        </View>
        <Text fontSize={10} color="$gray11">
          {completedRepeats}/{repeatCount}
        </Text>
      </XStack>
    );
  };
  
  // Render badges (only show if they have values, no need for explicit props)
  const renderBadges = () => {
    if (variant === 'compact') return null;
    
    // Only render if we have badges to show
    const hasBadges = (repeatCount && repeatCount > 1) || hasQuiz || 
                      (commentCount && commentCount > 0) || locked || 
                      (paywallEnabled && price);
    
    if (!hasBadges) return null;
    
    return (
      <XStack gap={6} flexWrap="wrap">
        {repeatCount && repeatCount > 1 && (
          <XStack
            backgroundColor="#145251"
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={12}
            alignItems="center"
            gap={4}
          >
            <Feather name="repeat" size={14} color="white" />
            <Text fontSize={12} color="white" fontWeight="bold">
              {repeatCount}x
            </Text>
          </XStack>
        )}
        
        {hasQuiz && (
          <XStack
            backgroundColor="#00E6C3"
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={12}
            alignItems="center"
            gap={4}
          >
            <MaterialIcons name="quiz" size={14} color="#000" />
            <Text fontSize={12} color="#000" fontWeight="bold">
              Quiz
            </Text>
          </XStack>
        )}
        
        {commentCount && commentCount > 0 && (
          <XStack
            alignItems="center"
            gap={4}
            backgroundColor="#1f2937"
            paddingHorizontal={6}
            paddingVertical={2}
            borderRadius={10}
          >
            <Feather name="message-circle" size={12} color="#00E6C3" />
            <Text fontSize={10} color="#00E6C3">
              {commentCount}
            </Text>
          </XStack>
        )}
        
        {locked && (
          <XStack
            backgroundColor="#FF9500"
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={12}
            alignItems="center"
            gap={4}
          >
            <MaterialIcons name="lock" size={14} color="white" />
            <Text fontSize={12} color="white" fontWeight="bold">
              LOCKED
            </Text>
          </XStack>
        )}
        
        {paywallEnabled && price && (
          <XStack
            backgroundColor="#00E6C3"
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={12}
            alignItems="center"
            gap={4}
          >
            <Feather name="credit-card" size={14} color="black" />
            <Text fontSize={12} color="black" fontWeight="bold">
              {currency === 'USD' ? '$' : currency}{price}
            </Text>
          </XStack>
        )}
      </XStack>
    );
  };
  
  // Render right icon - smart detection based on context
  const renderRightIcon = () => {
    if (locked) {
      return <MaterialIcons name="lock" size={config.iconSize} color="#FF9500" />;
    }
    // Show chevron if there's an onPress action (navigable)
    if (onPress) {
      return (
        <Feather
          name="chevron-right"
          size={config.iconSize}
          color={isDark ? '#888' : '#666'}
        />
      );
    }
    // Show check circle if checked and not navigable
    if (checked) {
      return <Feather name="check-circle" size={config.iconSize} color="#00E6C3" />;
    }
    return null;
  };
  
  // Determine if we should show checkbox (smart detection)
  const shouldShowCheckbox = !!onCheckboxPress;
  
  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
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
          <YStack alignItems="center" justifyContent="center" gap={8}>
            <Checkbox
              checked={checked}
              disabled={disabled}
              size={config.checkboxSize}
              stopPropagation={true}
              onPress={handleCheckboxPress}
            />
            {repeatCount && repeatCount > 1 && (
              <Text fontSize={10} color="$gray11" textAlign="center">
                {completedRepeats}/{repeatCount}
              </Text>
            )}
          </YStack>
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
          
          {variant === 'detailed' && (
            <YStack gap={8} marginTop={12}>
              {renderBadges()}
              {renderProgressBar()}
              
              {lastAction && (
                <Text color="$gray11" fontSize={12}>
                  Last: {lastAction.action} by {lastAction.actorName || 'Unknown'} at{' '}
                  {new Date(lastAction.createdAt).toLocaleString()}
                </Text>
              )}
            </YStack>
          )}
        </Card>
        
        {!shouldShowCheckbox && onPress && (
          <Feather
            name="chevron-right"
            size={config.iconSize}
            color={isDark ? '#888' : '#666'}
          />
        )}
      </XStack>
    </TouchableOpacity>
  );
}