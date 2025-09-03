import { createTamagui } from 'tamagui';
import { tokens } from './tokens';
import { lightTheme, darkTheme } from './theme';
import { shorthands } from '@tamagui/shorthands';
import { createMedia } from '@tamagui/react-native-media-driver';
import { rubikFont } from './fonts';

const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' },
  pointerCoarse: { pointer: 'coarse' },
});
// Theme tokens loaded
// Define component themes
export const componentThemes = {
  Button: {
    true: {
      backgroundColor: tokens.color.primary,
      color: '#fff',
      borderRadius: tokens.radius[8],
      height: tokens.size[40],
      paddingHorizontal: tokens.space[16],
      pressStyle: {
        backgroundColor: tokens.color.primaryPress,
        transform: [{ scale: 0.98 }],
      },
      hoverStyle: {
        backgroundColor: tokens.color.primaryHover,
      },
      animation: 'quick',
      fontSize: tokens.fontSize[2],
      fontWeight: '600',
    },
    secondary: {
      backgroundColor: tokens.color.secondary,
      pressStyle: {
        backgroundColor: tokens.color.secondaryPress,
      },
      hoverStyle: {
        backgroundColor: tokens.color.secondaryHover,
      },
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: tokens.color.border,
      color: tokens.color.primary,
      pressStyle: {
        backgroundColor: tokens.color.backgroundPress,
      },
      hoverStyle: {
        backgroundColor: tokens.color.backgroundHover,
        borderColor: tokens.color.primary,
      },
    },
    size: {
      small: {
        height: tokens.size[32],
        paddingHorizontal: tokens.space[12],
        fontSize: tokens.fontSize[1],
        borderRadius: tokens.radius[6],
      },
      medium: {
        height: tokens.size[40],
        paddingHorizontal: tokens.space[16],
        fontSize: tokens.fontSize[2],
        borderRadius: tokens.radius[8],
      },
      large: {
        height: tokens.size[48],
        paddingHorizontal: tokens.space[20],
        fontSize: tokens.fontSize[3],
        borderRadius: tokens.radius[10],
      },
    },
  },

  Input: {
    true: {
      backgroundColor: tokens.color.background,
      borderWidth: 1,
      borderColor: tokens.color.border,
      borderRadius: tokens.radius[8],
      height: tokens.size[40],
      paddingHorizontal: tokens.space[12],
      fontSize: tokens.fontSize[2],
      color: tokens.color.text,
      focusStyle: {
        borderColor: tokens.color.primary,
        backgroundColor: tokens.color.backgroundFocus,
        borderWidth: 2,
      },
      hoverStyle: {
        borderColor: tokens.color.borderHover,
        backgroundColor: tokens.color.backgroundHover,
      },
      animation: 'quick',
    },
    size: {
      small: {
        height: tokens.size[32],
        paddingHorizontal: tokens.space[8],
        fontSize: tokens.fontSize[1],
        borderRadius: tokens.radius[6],
      },
      medium: {
        height: tokens.size[40],
        paddingHorizontal: tokens.space[12],
        fontSize: tokens.fontSize[2],
        borderRadius: tokens.radius[8],
      },
      large: {
        height: tokens.size[48],
        paddingHorizontal: tokens.space[16],
        fontSize: tokens.fontSize[3],
        borderRadius: tokens.radius[10],
      },
    },
  },

  Card: {
    true: {
      backgroundColor: tokens.color.background,
      borderRadius: tokens.radius[12],
      borderColor: tokens.color.border,
      borderWidth: 1,
      padding: tokens.space[16],
      pressStyle: {
        backgroundColor: tokens.color.backgroundPress,
        transform: [{ scale: 0.99 }],
      },
      hoverStyle: {
        backgroundColor: tokens.color.backgroundHover,
        borderColor: tokens.color.borderHover,
      },
      animation: 'quick',
    },
    elevated: {
      shadowColor: tokens.color.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
  },

  Text: {
    true: {
      color: tokens.color.text,
      fontSize: tokens.fontSize[2],
      lineHeight: tokens.lineHeight[2],
    },
    heading: {
      color: tokens.color.text,
      fontWeight: '600',
      size: {
        h1: {
          fontSize: tokens.fontSize[8],
          lineHeight: tokens.lineHeight[4],
          fontWeight: '700',
          letterSpacing: -1,
        },
        h2: {
          fontSize: tokens.fontSize[6],
          lineHeight: tokens.lineHeight[3],
          fontWeight: '600',
          letterSpacing: -0.5,
        },
        h3: {
          fontSize: tokens.fontSize[4],
          lineHeight: tokens.lineHeight[2],
          fontWeight: '600',
        },
      },
    },
    size: {
      xs: {
        fontSize: tokens.fontSize[0],
        lineHeight: tokens.lineHeight[0],
      },
      sm: {
        fontSize: tokens.fontSize[1],
        lineHeight: tokens.lineHeight[1],
      },
      md: {
        fontSize: tokens.fontSize[2],
        lineHeight: tokens.lineHeight[2],
      },
      lg: {
        fontSize: tokens.fontSize[3],
        lineHeight: tokens.lineHeight[3],
      },
      xl: {
        fontSize: tokens.fontSize[4],
        lineHeight: tokens.lineHeight[4],
      },
    },
  },
};

// Create the Tamagui configuration
export const config = createTamagui({
  defaultTheme: 'light',
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: rubikFont,
    body: rubikFont,
  },
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  tokens,
  media,
  ...componentThemes,
});
