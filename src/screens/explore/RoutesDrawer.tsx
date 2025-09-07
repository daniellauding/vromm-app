import { RouteList } from '@/src/components/RouteList';
import { Route } from '@/src/types/route';
import { Feather } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from '@/src/contexts/TranslationContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text, XStack } from 'tamagui';
import { EmptyFilterState } from '@/src/components/EmptyFilterState';

const BOTTOM_NAV_HEIGHT = 80;
const DARK_THEME = {
  background: '#1A1A1A',
  bottomSheet: '#1F1F1F',
  text: 'white',
  secondaryText: '#AAAAAA',
  borderColor: '#333',
  handleColor: '#666',
  iconColor: 'white',
  cardBackground: '#2D3130',
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  previewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: 0,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 1000, // Very high elevation to appear above TabNavigator and FilterSheet
    zIndex: 1000, // Also add z-index for iOS
  },
  handleContainer: {
    paddingVertical: 8,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  routeListContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 60, // Below search bar
    left: 0,
    right: 0,
    backgroundColor: '$background',
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor',
    maxHeight: '80%',
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor',
  },
  distanceText: {
    fontSize: 14,
    color: '$gray11',
    marginLeft: 8,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  searchView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '$background',
    zIndex: 2,
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor',
    paddingBottom: 8,
  },
  searchResultsList: {
    maxHeight: '80%',
    backgroundColor: '$background',
  },
  searchBackButton: {
    padding: 8,
  },
});

import React from 'react';

export const RoutesDrawer = React.forwardRef<View, {
  selectedRoute: Route | null;
  filteredRoutes: Route[];
  loadRoutes: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  onExpandSearch?: () => void;
  onRoutePress?: (routeId: string) => void;
}>(({ selectedRoute, filteredRoutes, onClearFilters, hasActiveFilters = false, onExpandSearch, onRoutePress }, ref) => {
  const { t } = useTranslation();
  const scrollOffset = useRef(0);
  const { height: screenHeight } = Dimensions.get('window');
  const snapPoints = useMemo(
    () => ({
      expanded: screenHeight * 0.2, // Fully expanded
      mid: screenHeight * 0.4, // Show 60% of the screen
      collapsed: screenHeight - BOTTOM_NAV_HEIGHT - 80, // Show more of the handle + title above nav bar
    }),
    [screenHeight],
  );

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.collapsed);
  const translateY = useSharedValue(snapPoints.collapsed);
  const currentState = useSharedValue(snapPoints.collapsed);

  const snapTo = useCallback(
    (point: number) => {
      currentState.value = point;
      setCurrentSnapPoint(point);
    },
    [currentState],
  );
  // --- New Gesture API ---
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // No need for isDragging ref, just start gesture
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;
        const maxsnapToTop = snapPoints.expanded;
        const maxBottom = snapPoints.collapsed;
        const boundedPosition = Math.min(Math.max(newPosition, maxsnapToTop), maxBottom);
        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      const currentPosition = currentState.value + translationY;
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.expanded;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.collapsed;
      } else {
        const positions = [snapPoints.expanded, snapPoints.mid, snapPoints.collapsed];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.expanded),
        snapPoints.collapsed,
      );

      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      // lastGesture.current = boundedTarget;
      currentState.value = boundedTarget;
    });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      scrollOffset.current = contentOffset.y;

      // If user is scrolling and sheet is not expanded, expand it
      if (contentOffset.y > 0 && currentSnapPoint === snapPoints.collapsed) {
        snapTo(snapPoints.mid);
      }

      // If user scrolls to top and sheet is expanded, collapse it
      if (contentOffset.y === 0 && currentSnapPoint !== snapPoints.collapsed) {
        snapTo(snapPoints.collapsed);
      }
    },
    [currentSnapPoint, snapPoints, snapTo],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (selectedRoute) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        ref={ref}
        style={[
          styles.bottomSheet,
          {
            height: screenHeight,
            backgroundColor: DARK_THEME.bottomSheet,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: DARK_THEME.handleColor }]} />
          <XStack alignItems="center" gap="$2">
            <Feather name="map" size={16} color={DARK_THEME.iconColor} />
            <Text fontSize="$4" fontWeight="600" color={DARK_THEME.text}>
              {filteredRoutes.length}{' '}
              {filteredRoutes.length === 1 ? t('home.route') : t('home.routes')}
            </Text>
          </XStack>
        </View>
        <View style={styles.routeListContainer}>
          {filteredRoutes.length > 0 ? (
            <RouteList routes={filteredRoutes} onScroll={handleScroll} onRoutePress={onRoutePress} />
          ) : (
            <EmptyFilterState 
              hasActiveFilters={hasActiveFilters}
              onClearFilters={onClearFilters}
              onExpandSearch={onExpandSearch}
            />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

RoutesDrawer.displayName = 'RoutesDrawer';
