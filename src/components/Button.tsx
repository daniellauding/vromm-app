import { styled, Stack, GetProps, Button as TamaguiButton } from 'tamagui'
import { forwardRef } from 'react'
import { Text } from 'tamagui'
import { sizes } from '../theme/sizes'
import { tokens } from '../tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'link'
export type ButtonSize = keyof typeof sizes.button

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

    variant: {
      primary: {
        backgroundColor: '#00FFBC', // Brand teal color
        borderWidth: 0,
        hoverStyle: {
          backgroundColor: '#33FFD0', // Lighter teal
        },
        pressStyle: {
          backgroundColor: '#00CC96', // Darker teal
        },
      },
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#e2e8f0', // Light gray border
        hoverStyle: {
          backgroundColor: '#f8fafc', // Very light gray background
        },
        pressStyle: {
          backgroundColor: '#f1f5f9', // Slightly darker gray
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
  },
})

const ButtonText = styled(Text, {
  textAlign: 'center',
  fontWeight: '600',

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
        color: 'black', // Changed to black for better contrast with teal
      },
      secondary: { 
        color: '$color',  // This will use the theme's text color
      },
      link: { 
        color: '#00FFBC', // Brand teal color for links
        textDecorationLine: 'underline',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
})

type ButtonProps = GetProps<typeof ButtonFrame> & {
  children: React.ReactNode
}

export const Button = forwardRef<React.ElementRef<typeof ButtonFrame>, ButtonProps>(
  ({ children, variant, size, disabled, ...props }, ref) => {
    return (
      <ButtonFrame
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled}
        {...props}
      >
        <ButtonText variant={variant} size={size}>
          {children}
        </ButtonText>
      </ButtonFrame>
    )
  }
)

Button.displayName = 'Button'

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
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
}) 