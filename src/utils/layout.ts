import { Platform } from 'react-native';

// Shared layout constants for tab bar and safe-area aware padding
export const TAB_BAR_HEIGHT = 64;
export const BOTTOM_SAFE_INSET = Platform.OS === 'ios' ? 34 : 16;
export const TAB_BAR_TOTAL_HEIGHT = TAB_BAR_HEIGHT + BOTTOM_SAFE_INSET;

// Extra breathing room so lists and fixed buttons clear the tab bar comfortably
export const TAB_CONTENT_PADDING = TAB_BAR_TOTAL_HEIGHT + 48; // a bit more room to clear floating elements

export const getTabContentPadding = (): number => TAB_CONTENT_PADDING;


