import React from 'react';
import { Theme } from 'tamagui';
import { useThemePreference } from '../hooks/useThemeOverride';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Theme-aware wrapper that respects user's theme preference
 * This component should be used inside TamaguiProvider to override the theme
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { effectiveTheme, userPreference } = useThemePreference();

  // Use system themes for 'system' preference, manual themes for explicit choices
  // When user has manual preference, ignore system changes completely
  const themeName =
    userPreference === 'system'
      ? effectiveTheme === 'dark'
        ? 'dark'
        : 'light' // Use default Tamagui themes
      : userPreference === 'dark'
        ? 'dark_manual'
        : 'light_manual'; // Use our custom themes based on user preference, not system

  return <Theme name={themeName}>{children}</Theme>;
}
