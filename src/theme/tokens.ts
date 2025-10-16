import { createTokens } from 'tamagui';

// Define our color palette
const colors = {
  // Base colors
  white: '#ffffff',
  black: '#000000',

  splashVideoOverlay: '#397770',

  // Your brand colors - replace with your own hex values
  brandPrimary: '#00FFBC', // Your main brand color
  brandPrimaryLight: '#00FFBC', // Lighter version for hover states
  brandPrimaryDark: '#00FFBC', // Darker version for press states

  brandSecondary: '#FF6B00', // Secondary brand color
  brandSecondaryLight: '#FF8533',
  brandSecondaryDark: '#CC5500',

  // Blues
  blue10: '#2563eb',
  blue9: '#3b82f6',
  blue8: '#60a5fa',

  // Grays
  gray12: '#0f172a',
  gray11: '#64748b',
  gray6: '#e2e8f0',
  gray5: '#f1f5f9',
  gray2: '#f8fafc',
  gray1: '#f9fafb',

  // Gray scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Primary colors
  indigo400: '#818CF8',
  indigo500: '#27febe',
  indigo600: '#1BC4A8',
  indigo700: '#16A085',

  // Secondary colors
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',

  // Status colors
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
};

export const tokens = createTokens({
  color: {
    ...colors,
    background: colors.white,
    text: colors.gray12,
    error: colors.red500,
  },

  space: {
    true: 16, // Default spacing
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },

  size: {
    true: 16, // Default size
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    14: 56,
    15: 60,
  },

  radius: {
    true: 8, // Default radius
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },

  zIndex: {
    true: 0,
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },

  fontSize: {
    true: 16,
    0: 12, // xs
    1: 14, // sm
    2: 16, // base
    3: 18, // lg
    4: 20, // xl
    5: 24, // 2xl
    6: 30, // 3xl
    7: 36, // 4xl
    8: 48, // 5xl
    9: 60, // 6xl
    xs: 12, // Add explicit xs token
    sm: 14, // Add explicit sm token
    md: 16, // Add explicit md token
    lg: 18, // Add explicit lg token
    xl: 20, // Add explicit xl token
    '2xl': 24, // Add explicit 2xl token
    '3xl': 30, // Add explicit 3xl token
    '4xl': 36, // Add explicit 4xl token
    '5xl': 48, // Add explicit 5xl token
    '6xl': 60, // Add explicit 6xl token
  },

  lineHeight: {
    true: 1.5,
    0: 1, // none
    1: 1.25, // tight
    2: 1.375, // snug
    3: 1.5, // normal
    4: 1.625, // relaxed
    5: 2, // loose
  },
});

// Export theme colors for light mode
export const lightColors = {
  primary: '#27febe',
  primaryHover: '#1BC4A8',
  primaryPress: '#16A085',
  secondary: colors.emerald400,
  secondaryHover: colors.emerald500,
  secondaryPress: colors.emerald600,
  background: colors.white,
  backgroundHover: colors.gray100,
  backgroundPress: colors.gray200,
  backgroundFocus: colors.gray100,
  text: colors.gray900,
  textMuted: colors.gray600,
  textSecondary: colors.gray700,
  inputBackground: colors.white,
  inputBorder: colors.gray300,
  inputText: colors.gray900,
  border: colors.gray300,
  borderHover: colors.gray400,
  error: colors.red500,
  success: colors.emerald500,
  warning: colors.amber500,
  shadowColor: colors.gray300,
};

// Export theme colors for dark mode
export const darkColors = {
  primary: '#27febe',
  primaryHover: '#1BC4A8',
  primaryPress: '#16A085',
  secondary: colors.emerald400,
  secondaryHover: colors.emerald500,
  secondaryPress: colors.emerald600,
  background: '#151515',
  backgroundHover: '#242424',
  backgroundPress: '#2A2A2A',
  backgroundFocus: '#242424',
  text: colors.gray50,
  textMuted: colors.gray400,
  textSecondary: colors.gray300,
  inputBackground: colors.gray800,
  inputBorder: colors.gray700,
  inputText: colors.gray50,
  border: colors.gray700,
  borderHover: colors.gray600,
  error: colors.red400,
  success: colors.emerald400,
  warning: colors.amber400,
  shadowColor: colors.gray700,
};
