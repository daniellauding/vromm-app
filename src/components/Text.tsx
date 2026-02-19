import { styled, Text as TamaguiText, GetProps } from 'tamagui';
import { sizes } from '../theme/sizes';

export type TextSize = keyof typeof sizes.fontSize;
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextIntent = 'default' | 'muted' | 'success' | 'error' | 'warning';

export const Text = styled(TamaguiText, {
  name: 'Text',
  color: '$color',
  fontFamily: '$body',

  variants: {
    size: {
      xs: { fontSize: sizes.fontSize.xs },
      sm: { fontSize: sizes.fontSize.sm },
      md: { fontSize: sizes.fontSize.md },
      lg: { fontSize: sizes.fontSize.lg },
      xl: { fontSize: sizes.fontSize.xl },
      '2xl': { fontSize: sizes.fontSize['2xl'] },
      '3xl': { fontSize: sizes.fontSize['3xl'] },
      '4xl': { fontSize: sizes.fontSize['4xl'] },
      '5xl': { fontSize: sizes.fontSize['5xl'] },
      '6xl': { fontSize: sizes.fontSize['6xl'] },
    },

    weight: {
      normal: { fontWeight: '400' },
      medium: { fontWeight: '500' },
      semibold: { fontWeight: '600' },
      bold: { fontWeight: '700' },
    },

    intent: {
      default: { color: '$color' },
      muted: { color: '$colorHover' },
      success: { color: '$success' },
      error: { color: '$error' },
      warning: { color: '$warning' },
    },
  } as const,

  defaultVariants: {
    size: 'md',
    weight: 'normal',
    intent: 'default',
  },
});
