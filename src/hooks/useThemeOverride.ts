import { useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Simple hook that manages user theme preference and integrates with Tamagui
 * 
 * This hook provides:
 * - User preference management (system/light/dark)
 * - System theme detection
 * - Integration with Tamagui's theme system
 * 
 * Usage:
 * const { userPreference, setThemePreference, effectiveTheme } = useThemePreference();
 */
export function useThemePreference() {
  const systemColorScheme = useColorScheme();
  const { profile, updateProfile } = useAuth();
  
  // Get user's theme preference from profile
  const userPreference = (profile?.theme_preference as ThemePreference) || 'system';
  
  // Determine the effective theme that should be applied
  // For manual preferences, always use the user's choice regardless of system changes
  const effectiveTheme = userPreference === 'system' ? systemColorScheme : userPreference;
  
  // Function to update user's theme preference
  const setThemePreference = async (preference: ThemePreference) => {
    try {
      await updateProfile({ theme_preference: preference });
    } catch (error) {
      console.error('Failed to update theme preference:', error);
      throw error;
    }
  };

  return {
    userPreference,
    effectiveTheme,
    setThemePreference,
    isSystem: userPreference === 'system',
    isLight: userPreference === 'light',
    isDark: userPreference === 'dark',
  };
}

/**
 * Legacy helper for backward compatibility
 * @deprecated Use useThemePreference() instead
 */
export function useThemeOverride() {
  const { userPreference, effectiveTheme, setThemePreference } = useThemePreference();
  
  return {
    themeMode: effectiveTheme,
    userThemePreference: userPreference,
    setThemeMode: setThemePreference,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
    isSystem: userPreference === 'system',
  };
}
