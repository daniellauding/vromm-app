/**
 * CENTRAL THEME CONTROL FILE
 *
 * This is the single file to control all theme colors for:
 * - System (follows device theme)
 * - Manual Light Mode
 * - Manual Dark Mode
 *
 * All components should use these theme tokens instead of hardcoded colors.
 */

import { createTheme } from 'tamagui';
import { lightColors, darkColors } from './tokens';

// System themes (follows device theme automatically)
export const systemLightTheme = createTheme({
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
  primary: lightColors.primary,
  primaryHover: lightColors.primaryHover,
  primaryPress: lightColors.primaryPress,
  secondary: lightColors.secondary,
  secondaryHover: lightColors.secondaryHover,
  secondaryPress: lightColors.secondaryPress,
  error: lightColors.error,
  success: lightColors.success,
  warning: lightColors.warning,
  gray8: lightColors.border,
  gray9: lightColors.textSecondary,
  gray10: lightColors.textMuted,
  gray11: lightColors.textMuted,
  gray12: lightColors.text,

  // Switch-specific tokens
  switchInactive: '#e5e7eb', // Light gray for inactive state
  switchActive: '#00FFBC', // Brand green for active state
  switchThumb: '#ffffff', // White thumb
});

export const systemDarkTheme = createTheme({
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
  primary: darkColors.primary,
  primaryHover: darkColors.primaryHover,
  primaryPress: darkColors.primaryPress,
  secondary: darkColors.secondary,
  secondaryHover: darkColors.secondaryHover,
  secondaryPress: darkColors.secondaryPress,
  error: darkColors.error,
  success: darkColors.success,
  warning: darkColors.warning,
  gray8: darkColors.border,
  gray9: darkColors.textSecondary,
  gray10: darkColors.textMuted,
  gray11: darkColors.textMuted,
  gray12: darkColors.text,

  // Switch-specific tokens
  switchInactive: '#4b5563', // Dark gray for inactive state
  switchActive: '#00FFBC', // Brand green for active state
  switchThumb: '#ffffff', // White thumb
});

// Manual themes (user's explicit choice, ignores system changes)
export const manualLightTheme = createTheme({
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
  primary: lightColors.primary,
  primaryHover: lightColors.primaryHover,
  primaryPress: lightColors.primaryPress,
  secondary: lightColors.secondary,
  secondaryHover: lightColors.secondaryHover,
  secondaryPress: lightColors.secondaryPress,
  error: lightColors.error,
  success: lightColors.success,
  warning: lightColors.warning,
  gray8: lightColors.border,
  gray9: lightColors.textSecondary,
  gray10: lightColors.textMuted,
  gray11: lightColors.textMuted,
  gray12: lightColors.text,

  // Switch-specific tokens
  switchInactive: '#e5e7eb', // Light gray for inactive state
  switchActive: '#00FFBC', // Brand green for active state
  switchThumb: '#ffffff', // White thumb
});

export const manualDarkTheme = createTheme({
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
  primary: darkColors.primary,
  primaryHover: darkColors.primaryHover,
  primaryPress: darkColors.primaryPress,
  secondary: darkColors.secondary,
  secondaryHover: darkColors.secondaryHover,
  secondaryPress: darkColors.secondaryPress,
  error: darkColors.error,
  success: darkColors.success,
  warning: darkColors.warning,
  gray8: darkColors.border,
  gray9: darkColors.textSecondary,
  gray10: darkColors.textMuted,
  gray11: darkColors.textMuted,
  gray12: darkColors.text,

  // Switch-specific tokens
  switchInactive: '#4b5563', // Dark gray for inactive state
  switchActive: '#00FFBC', // Brand green for active state
  switchThumb: '#ffffff', // White thumb
});

/**
 * Theme color reference for developers:
 *
 * BACKGROUND COLORS:
 * - $background: Main background color
 * - $backgroundHover: Hover state background
 * - $backgroundPress: Press state background
 * - $backgroundFocus: Focus state background
 *
 * TEXT COLORS:
 * - $color: Primary text color
 * - $colorHover: Hover state text color
 * - $gray8: Border color
 * - $gray9: Secondary text color
 * - $gray10: Muted text color
 * - $gray11: Very muted text color
 * - $gray12: Primary text color (same as $color)
 *
 * BORDER COLORS:
 * - $borderColor: Default border color
 * - $borderColorHover: Hover state border color
 *
 * ACCENT COLORS:
 * - $primary: Primary accent color (#21e5c3)
 * - $primaryHover: Primary hover color
 * - $primaryPress: Primary press color
 * - $secondary: Secondary accent color
 * - $secondaryHover: Secondary hover color
 * - $secondaryPress: Secondary press color
 *
 * STATUS COLORS:
 * - $error: Error color
 * - $success: Success color
 * - $warning: Warning color
 *
 * USAGE EXAMPLES:
 *
 * // In Tamagui components:
 * <YStack backgroundColor="$background" borderColor="$borderColor">
 *   <Text color="$color">Primary text</Text>
 *   <Text color="$gray11">Muted text</Text>
 * </YStack>
 *
 * // In React Native StyleSheet:
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.background?.val,
 *     borderColor: theme.borderColor?.val,
 *   },
 *   text: {
 *     color: theme.color?.val,
 *   },
 * });
 */
