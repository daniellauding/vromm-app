import React, { forwardRef } from 'react';
import { Input, Text, YStack, XStack, Label, styled, View } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { tokens } from '../tokens';
import { darkColors } from '../theme/tokens';
import { sizes } from '../theme/sizes';

const StyledInput = styled(Input, {
  name: 'StyledInput',
  borderWidth: 1,
  borderColor: '$borderColor',
  bg: '$background',
  br: tokens.radius[2],
  px: tokens.space[4], // Increased from space[3] (12px) to space[4] (16px) for better alignment
  fontSize: tokens.fontSize[2], // Keep original font size (14px)
  color: '$color',
  placeholderTextColor: darkColors.textMuted,
  autoCapitalize: 'none',

  // Focus state
  hoverStyle: {
    borderColor: '$borderColorHover',
  },
  focusStyle: {
    borderColor: tokens.color.emerald400,
    borderWidth: 2,
    bg: '$backgroundFocus',
  },

  variants: {
    size: {
      xs: {
        h: sizes.button.xs, // 32px
      },
      sm: {
        h: sizes.button.sm, // 40px
      },
      md: {
        h: sizes.button.md, // 48px
      },
      lg: {
        h: sizes.button.lg, // 56px
      },
      xl: {
        h: sizes.button.xl, // 64px - maintains original default height
      },
    },
    rounded: {
      full: {
        br: 999, // Fully rounded (pill shape)
      },
      rounded: {
        br: tokens.radius[4], // More rounded
      },
      default: {
        br: tokens.radius[2], // Default rounded
      },
    },
  } as const,

  defaultVariants: {
    size: 'xl', // Default to xl size (64px height) - maintains original default height
    rounded: 'default',
  },
});

const StyledLabel = styled(Label, {
  name: 'StyledLabel',
  color: '$color',
  fontSize: tokens.fontSize[2],
  mb: tokens.space[1],
});

export type FormFieldSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  variant?: 'default' | 'search';
  size?: FormFieldSize;
  rounded?: 'default' | 'rounded' | 'full';
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
};

export const FormField = forwardRef<React.ElementRef<typeof Input>, FormFieldProps>(
  (
    {
      label,
      error,
      rightElement,
      leftElement,
      leftIcon,
      rightIcon,
      variant = 'default',
      size = 'xl',
      rounded = 'default',
      onLeftIconPress,
      onRightIconPress,
      ...inputProps
    },
    ref,
  ) => {
    // Determine icon color based on theme - use string type
    const iconColor =
      typeof inputProps.placeholderTextColor === 'string'
        ? inputProps.placeholderTextColor
        : '#999';

    // For search variant, default to search icon if no leftIcon provided
    const effectiveLeftIcon =
      variant === 'search' && !leftIcon && !leftElement ? 'search' : leftIcon;

    // Scale icon size based on input size
    const getIconSize = () => {
      switch (size) {
        case 'xs':
          return 14;
        case 'sm':
          return 16;
        case 'md':
          return 18;
        case 'lg':
          return 20;
        case 'xl':
          return 22;
        default:
          return 18;
      }
    };

    const iconSize = getIconSize();

    return (
      <YStack gap={0} w="100%">
        {label && <StyledLabel marginBottom={tokens.space[3]}>{label}</StyledLabel>}
        <XStack w="100%" alignItems="center" position="relative">
          {/* Left Icon or Element */}
          {(effectiveLeftIcon || leftElement) && (
            <View
              position="absolute"
              left={tokens.space[4]}
              zIndex={1}
              pointerEvents={onLeftIconPress ? 'auto' : 'none'}
              onPress={onLeftIconPress}
              pressStyle={onLeftIconPress ? { opacity: 0.6 } : undefined}
            >
              {leftElement ||
                (effectiveLeftIcon && (
                  <Feather name={effectiveLeftIcon} size={iconSize} color={iconColor} />
                ))}
            </View>
          )}

          {/* Input Field */}
          <StyledInput
            ref={ref}
            {...inputProps}
            size={size}
            rounded={rounded}
            flex={1}
            paddingLeft={effectiveLeftIcon || leftElement ? tokens.space[9] : tokens.space[4]}
            paddingRight={rightIcon || rightElement ? tokens.space[9] : tokens.space[4]}
          />

          {/* Right Icon or Element */}
          {(rightIcon || rightElement) && (
            <View
              position="absolute"
              right={tokens.space[4]}
              zIndex={1}
              pointerEvents={onRightIconPress || rightElement ? 'auto' : 'none'}
              onPress={onRightIconPress}
              pressStyle={onRightIconPress ? { opacity: 0.6 } : undefined}
            >
              {rightElement ||
                (rightIcon && <Feather name={rightIcon} size={iconSize} color={iconColor} />)}
            </View>
          )}
        </XStack>
        {error ? (
          <Text color="$error" fontSize={tokens.fontSize[1]} mt={tokens.space[2]}>
            {error}
          </Text>
        ) : null}
      </YStack>
    );
  },
);
