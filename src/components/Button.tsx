import { styled, Stack, GetProps, Button as TamaguiButton } from 'tamagui';
import { forwardRef } from 'react';
import { Text } from 'tamagui';
import { sizes } from '../theme/sizes';
import { tokens } from '../tokens';

// 🎨 Type for icon components (works with lucide-icons and other icon libraries)
type IconComponent = React.ComponentType<{ size?: number; color?: string }> | React.ReactElement;

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'link' | 'outlined' | 'icon';
export type ButtonSize = keyof typeof sizes.button;
export type ButtonRadius = keyof typeof sizes.radius;

const ButtonFrame = styled(Stack, {
  name: 'Button',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: sizes.radius.md,
  pressStyle: { opacity: 0.8 },
  animation: 'unset',

  variants: {
    size: {
      xs: {
        height: sizes.button.xs,
        paddingHorizontal: sizes.buttonPadding.xs,
      },
      sm: {
        height: sizes.button.sm,
        paddingHorizontal: sizes.buttonPadding.sm,
      },
      md: {
        height: sizes.button.md,
        paddingHorizontal: sizes.buttonPadding.md,
      },
      lg: {
        height: sizes.button.lg,
        paddingHorizontal: sizes.buttonPadding.lg,
      },
      xl: {
        height: sizes.button.xl,
        paddingHorizontal: sizes.buttonPadding.xl,
      },
    },

    // 🔲 Icon-specific size overrides (makes icons perfectly square)
    icon_xs: {
      width: sizes.button.xs,
      height: sizes.button.xs,
    },
    icon_sm: {
      width: sizes.button.sm,
      height: sizes.button.sm,
    },
    icon_md: {
      width: sizes.button.md,
      height: sizes.button.md,
    },
    icon_lg: {
      width: sizes.button.lg,
      height: sizes.button.lg,
    },
    icon_xl: {
      width: sizes.button.xl,
      height: sizes.button.xl,
    },

    radius: {
      xs: { borderRadius: sizes.radius.xs },
      sm: { borderRadius: sizes.radius.sm },
      md: { borderRadius: sizes.radius.md },
      lg: { borderRadius: sizes.radius.lg },
      xl: { borderRadius: sizes.radius.xl },
      full: { borderRadius: sizes.radius.full },
    },

    variant: {
      primary: {
        backgroundColor: '#00FFBC', // Brand teal color
        borderWidth: 0,
        radius: 'lg',
        hoverStyle: {
          backgroundColor: '#33FFD0', // Lighter teal
        },
        pressStyle: {
          backgroundColor: '#00CC96', // Darker teal
        },
      },
      secondary: {
        backgroundColor: '#145251',
        borderWidth: 0,
        radius: 'lg',
        borderColor: '#e2e8f0', // Light gray border
        hoverStyle: {
          backgroundColor: '#f8fafc', // Very light gray background
        },
        pressStyle: {
          backgroundColor: '#f1f5f9', // Slightly darker gray
        },
      },
      tertiary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#fff', // Brand teal color for border
        radius: 'lg',
        hoverStyle: {
          backgroundColor: 'rgba(0, 255, 188, 0.1)', // Very light teal background
        },
        pressStyle: {
          backgroundColor: 'rgba(0, 255, 188, 0.2)', // Slightly darker teal background
        },
      },
      link: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 0,
        height: 'auto',
        hoverStyle: {
          opacity: 0.7,
        },
      },
      select: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        height: 'auto',
        justifyContent: 'space-between',
        hoverStyle: {
          borderWidth: 2,
          borderColor: '#34D399',
          backgroundColor: '$backgroundFocus',
        },
        pressStyle: {
          borderWidth: 2,
          borderColor: '#34D399',
          backgroundColor: '$backgroundFocus',
        },
      },
      radio: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        height: 'auto',
        hoverStyle: {
          borderWidth: 2,
          borderColor: '#34D399',
          backgroundColor: '$backgroundFocus',
        },
        pressStyle: {
          borderWidth: 2,
          borderColor: '#34D399',
          backgroundColor: '$backgroundFocus',
        },
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#e2e8f0', // Light gray border
        radius: 'lg',
        hoverStyle: {
          borderColor: '#00FFBC', // Brand teal border on hover
          backgroundColor: 'rgba(0, 255, 188, 0.05)', // Very light teal background
        },
        pressStyle: {
          borderColor: '#00CC96', // Darker teal border
          backgroundColor: 'rgba(0, 255, 188, 0.1)', // Light teal background
        },
      },
      icon: {
        bg: 'rgba(0, 0, 0, 0.4)',
        color: 'rgba(255, 255, 255, 0.2)', // Brand teal color for links
        hoverStyle: {
          opacity: 0.8,
        },
        pressStyle: {
          opacity: 0.6,
        },
        radius: 'full',
        // 🔲 Add padding so icon has breathing room
        padding: 8,
      },
    },

    disabled: {
      true: {
        opacity: 0.5,
        pointerEvents: 'none',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    variant: 'primary',
    radius: 'md',
  },
});

const ButtonText = styled(Text, {
  textAlign: 'center',
  fontWeight: '800',
  fontStyle: 'italic',
  textTransform: 'uppercase',

  variants: {
    size: {
      xs: { fontSize: sizes.fontSize.xs },
      sm: { fontSize: sizes.fontSize.sm },
      md: { fontSize: sizes.fontSize.md },
      lg: { fontSize: sizes.fontSize.lg },
      xl: { fontSize: sizes.fontSize.xl },
    },
    variant: {
      primary: {
        color: '#145251', // Changed to black for better contrast with teal
      },
      secondary: {
        color: 'white', // Always white for secondary buttons
      },
      tertiary: {
        color: '#00FFBC', // Brand teal color for text
      },
      link: {
        color: '#00FFBC', // Brand teal color for links
        textDecorationLine: 'none',
        fontStyle: 'normal',
        textTransform: 'none',
      },
      select: {
        color: '$color',
        fontStyle: 'normal',
        textTransform: 'none',
        fontWeight: '400',
      },
      radio: {
        color: '$color',
        fontStyle: 'normal',
        textTransform: 'none',
        fontWeight: '600',
      },
      outlined: {
        color: '$color', // Use theme color
        fontStyle: 'normal',
        textTransform: 'none',
        fontWeight: '600',
      },
      icon: {
        color: '#00FFBC', // Brand teal color for icons
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
});

type ButtonProps = GetProps<typeof ButtonFrame> & {
  children?: React.ReactNode;
  icon?: IconComponent; // 🎨 Optional icon prop (works with lucide-icons)
  iconSize?: number; // 🎨 Optional icon size (default: 20)
  iconColor?: string; // 🎨 Optional icon color (uses variant color if not set)
};

export const Button = forwardRef<React.ElementRef<typeof ButtonFrame>, ButtonProps>(
  (
    {
      children,
      variant,
      size = 'md',
      radius,
      disabled,
      icon: Icon,
      iconSize = 20,
      iconColor,
      ...props
    },
    ref,
  ) => {
    // 🔲 Apply icon-specific size for icon variant to make it square
    const effectiveSize = variant === 'icon' ? (`icon_${size}` as ButtonSize) : size;

    // 🎨 Determine icon color based on variant if not explicitly set
    const getIconColor = () => {
      if (iconColor) return iconColor;

      switch (variant) {
        case 'primary':
          return '#145251'; // Dark color for teal background
        case 'secondary':
          return 'white';
        case 'tertiary':
        case 'link':
          return '#00FFBC'; // Teal color
        case 'icon':
          return 'white'; // White for icon buttons
        default:
          return '#00FFBC'; // Default teal
      }
    };

    return (
      <ButtonFrame
        ref={ref}
        variant={variant}
        size={effectiveSize}
        radius={radius}
        disabled={disabled}
        {...props}
      >
        {/* 🎨 Render icon if provided */}
        {Icon &&
          (typeof Icon === 'function' ? <Icon size={iconSize} color={getIconColor()} /> : Icon)}

        {/* 🎨 Render text if children provided */}
        {children && (
          <ButtonText variant={variant} size={size}>
            {children}
          </ButtonText>
        )}
      </ButtonFrame>
    );
  },
);

Button.displayName = 'Button';

export const NewButton = styled(TamaguiButton, {
  name: 'Button',
  h: tokens.size[10],
  px: tokens.space[4],
  br: tokens.radius[2],
  fontSize: tokens.fontSize[2],

  variants: {
    variant: {
      primary: {
        bg: '#00FFBC', // Brand teal color
        color: 'black', // Black text for better contrast
        hoverStyle: {
          bg: '#33FFD0', // Lighter teal
        },
        pressStyle: {
          bg: '#00CC96', // Darker teal
        },
      },
      secondary: {
        bg: tokens.color.white,
        color: tokens.color.gray900,
        borderWidth: 1,
        borderColor: tokens.color.gray300,
        hoverStyle: {
          bg: tokens.color.gray50,
        },
        pressStyle: {
          bg: tokens.color.gray100,
        },
      },
      tertiary: {
        bg: 'transparent',
        color: '#00FFBC', // Brand teal color for text
        borderWidth: 1,
        borderColor: '#00FFBC', // Brand teal color for border
        hoverStyle: {
          bg: 'rgba(0, 255, 188, 0.1)', // Very light teal background
        },
        pressStyle: {
          bg: 'rgba(0, 255, 188, 0.2)', // Slightly darker teal background
        },
      },
      link: {
        bg: 'transparent',
        color: '#00FFBC', // Brand teal color for links
        h: 'auto',
        p: 0,
        textDecorationLine: 'underline',
        hoverStyle: {
          opacity: 0.8,
        },
        pressStyle: {
          opacity: 0.6,
        },
      },
      icon: {
        bg: 'rgba(255, 255, 255, 0.1)',
        color: '#00FFBC', // Brand teal color for links
        hoverStyle: {
          opacity: 0.8,
        },
        pressStyle: {
          opacity: 0.6,
        },
      },
    },
    size: {
      sm: {
        h: tokens.size[8],
        px: tokens.space[3],
        fontSize: tokens.fontSize[1],
      },
      md: {
        h: tokens.size[10],
        px: tokens.space[4],
        fontSize: tokens.fontSize[2],
      },
      lg: {
        h: tokens.size[10],
        px: tokens.space[5],
        fontSize: tokens.fontSize[3],
      },
    },
    radius: {
      xs: { borderRadius: 4 },
      sm: { borderRadius: 6 },
      md: { borderRadius: 8 },
      lg: { borderRadius: 12 },
      xl: { borderRadius: 16 },
      full: { borderRadius: 9999 },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
    radius: 'md',
  },
});
