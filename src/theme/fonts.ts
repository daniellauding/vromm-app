import { createFont } from 'tamagui';

export const rubikFont = createFont({
  family: 'Rubik',
  size: {
    1: 12, // xs
    2: 14, // sm
    3: 16, // base
    4: 18, // lg
    5: 20, // xl
    6: 24, // 2xl
    7: 30, // 3xl
    8: 36, // 4xl
    9: 48, // 5xl
    10: 60, // 6xl
  },
  lineHeight: {
    1: 16, // xs
    2: 20, // sm
    3: 24, // base
    4: 28, // lg
    5: 32, // xl
    6: 36, // 2xl
    7: 40, // 3xl
    8: 48, // 4xl
    9: 60, // 5xl
    10: 72, // 6xl
  },
  weight: {
    4: '400', // normal
    5: '500', // medium
    6: '600', // semibold
    7: '700', // bold
    8: '800', // extrabold
    9: '900', // black
  },
  face: {
    400: { normal: 'Rubik-Regular', italic: 'Rubik-Italic' },
    500: { normal: 'Rubik-Medium', italic: 'Rubik-MediumItalic' },
    700: { normal: 'Rubik-Bold', italic: 'Rubik-BoldItalic' },
    800: { normal: 'Rubik-ExtraBold', italic: 'Rubik-ExtraBoldItalic' },
    900: { normal: 'Rubik-Black', italic: 'Rubik-BlackItalic' },
  },
});
