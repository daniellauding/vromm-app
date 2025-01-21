export const sizes = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 48,
  },

  // Icon sizes
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },

  // Button heights
  button: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 56,
    xl: 64,
  },

  // Button paddings
  buttonPadding: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },

  // Spacing
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  },

  // Border radius
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const

export type FontSize = keyof typeof sizes.fontSize
export type IconSize = keyof typeof sizes.icon
export type ButtonSize = keyof typeof sizes.button
export type SpaceSize = keyof typeof sizes.space
export type RadiusSize = keyof typeof sizes.radius 