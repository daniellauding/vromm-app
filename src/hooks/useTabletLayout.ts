import { useWindowDimensions, Platform } from 'react-native';
import { useMemo } from 'react';

export interface TabletLayoutInfo {
  isTablet: boolean;
  isIPad: boolean;
  screenWidth: number;
  screenHeight: number;
  isSplitView: boolean;
  gridColumns: number;
  contentWidth: number;
  horizontalPadding: number;
  cardGap: number;
}

/**
 * Hook to detect tablet/iPad and provide responsive layout values
 * 
 * Breakpoints:
 * - Mobile: < 768px (1 column)
 * - Tablet: 768-1023px (2 columns)
 * - Large Tablet/iPad Pro: >= 1024px (3 columns)
 */
export function useTabletLayout(): TabletLayoutInfo {
  const { width, height } = useWindowDimensions();
  
  return useMemo(() => {
    const isIPad = Platform.OS === 'ios' && Platform.isPad;
    const isLargeScreen = width >= 768;
    const isTablet = isIPad || isLargeScreen;
    const isSplitView = isTablet && width >= 1024;
    
    // Dynamic grid columns based on width
    let gridColumns = 1;
    if (width >= 1024) {
      gridColumns = 3; // iPad Pro landscape, large tablets
    } else if (width >= 768) {
      gridColumns = 2; // iPad portrait, medium tablets
    }
    
    return {
      isTablet,
      isIPad,
      screenWidth: width,
      screenHeight: height,
      isSplitView,
      gridColumns,
      contentWidth: isTablet ? Math.min(width * 0.95, 1400) : width,
      horizontalPadding: isTablet ? 24 : 16,
      cardGap: isTablet ? 16 : 12,
    };
  }, [width, height]);
}

