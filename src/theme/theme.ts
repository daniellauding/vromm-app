import { createTheme } from 'tamagui';
import { tokens, lightColors, darkColors } from './tokens';

// Create themes using our tokens
export const lightTheme = createTheme({
  background: lightColors.background,
  backgroundHover: lightColors.backgroundHover,
  backgroundPress: lightColors.backgroundPress,
  backgroundFocus: lightColors.backgroundFocus,
  color: lightColors.text,
  colorHover: lightColors.textMuted,
  borderColor: lightColors.border,
  borderColorHover: lightColors.borderHover,
  shadowColor: lightColors.shadowColor,
  shadowColorHover: lightColors.borderHover,

  // Component-specific colors
  primary: lightColors.primary,
  primaryHover: lightColors.primaryHover,
  primaryPress: lightColors.primaryPress,
  secondary: lightColors.secondary,
  secondaryHover: lightColors.secondaryHover,
  secondaryPress: lightColors.secondaryPress,
  error: lightColors.error,
  success: lightColors.success,
  warning: lightColors.warning,

  // Additional theme properties needed by components
  gray8: lightColors.border,
  gray9: lightColors.textSecondary,
  gray10: lightColors.textMuted,
  gray11: lightColors.textMuted,
  gray12: lightColors.text,
});

export const darkTheme = createTheme({
  background: darkColors.background,
  backgroundHover: darkColors.backgroundHover,
  backgroundPress: darkColors.backgroundPress,
  backgroundFocus: darkColors.backgroundFocus,
  color: darkColors.text,
  colorHover: darkColors.textMuted,
  borderColor: darkColors.border,
  borderColorHover: darkColors.borderHover,
  shadowColor: darkColors.shadowColor,
  shadowColorHover: darkColors.borderHover,

  // Component-specific colors
  primary: darkColors.primary,
  primaryHover: darkColors.primaryHover,
  primaryPress: darkColors.primaryPress,
  secondary: darkColors.secondary,
  secondaryHover: darkColors.secondaryHover,
  secondaryPress: darkColors.secondaryPress,
  error: darkColors.error,
  success: darkColors.success,
  warning: darkColors.warning,

  // Additional theme properties needed by components
  gray8: darkColors.border,
  gray9: darkColors.textSecondary,
  gray10: darkColors.textMuted,
  gray11: darkColors.textMuted,
  gray12: darkColors.text,
});
