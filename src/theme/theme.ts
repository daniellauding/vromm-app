import { createTheme } from 'tamagui';
import { tokens, darkColors } from './tokens';

// Create themes using our tokens
export const lightTheme = createTheme({
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
  primary: tokens.color.primary,
  primaryHover: tokens.color.primaryHover,
  primaryPress: tokens.color.primaryPress,
  secondary: tokens.color.secondary,
  secondaryHover: tokens.color.secondaryHover,
  secondaryPress: tokens.color.secondaryPress,
  error: tokens.color.error,
  success: tokens.color.success,
  warning: tokens.color.warning,
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
});
