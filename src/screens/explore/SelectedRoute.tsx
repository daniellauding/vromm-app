import { RoutePreviewCard } from '@/src/components/RoutePreviewCard';
import { StyleSheet, View, useColorScheme, PanResponder, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@/src/types/navigation';
import { Route } from '@/src/types/route';
import { useCallback, useRef } from 'react';
import { useTheme } from 'tamagui';

const BOTTOM_NAV_HEIGHT = 80;

export function SelectedRoute({
  selectedRoute,
  setSelectedRoute,
  setSelectedPin,
  onRoutePress,
  nearbyRoutes = [],
  allRoutes = [],
  onRouteChange,
}: {
  selectedRoute: Route;
  setSelectedRoute: (route: Route | null) => void;
  setSelectedPin: (pin: Pin | null) => void;
  onRoutePress?: (routeId: string) => void;
  nearbyRoutes?: Route[];
  allRoutes?: Route[];
  onRouteChange?: (routeId: string) => void;
}) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const theme = useTheme();

  // Animation values for Tinder-like swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const { width: screenWidth } = Dimensions.get('window');

  const onPress = useCallback(() => {
    if (onRoutePress) {
      onRoutePress(selectedRoute.id);
    } else {
      navigation.navigate('RouteDetail', { routeId: selectedRoute.id });
      setSelectedRoute(null);
    }
    setSelectedPin(null);
  }, [navigation, selectedRoute, setSelectedRoute, setSelectedPin]);

  // Swipe navigation handlers with linear looping through all routes
  const handleSwipeToNext = useCallback(() => {
    if (!selectedRoute || !allRoutes.length || !onRouteChange) return;

    const currentIndex = allRoutes.findIndex((route) => route.id === selectedRoute.id);
    if (currentIndex !== -1) {
      // Linear progression: go to next route, loop to first if at end
      const nextIndex = (currentIndex + 1) % allRoutes.length;
      const nextRoute = allRoutes[nextIndex];
      onRouteChange(nextRoute.id);
    }
  }, [selectedRoute, allRoutes, onRouteChange]);

  const handleSwipeToPrevious = useCallback(() => {
    if (!selectedRoute || !allRoutes.length || !onRouteChange) return;

    const currentIndex = allRoutes.findIndex((route) => route.id === selectedRoute.id);
    if (currentIndex !== -1) {
      // Linear progression: go to previous route, loop to last if at beginning
      const previousIndex = currentIndex === 0 ? allRoutes.length - 1 : currentIndex - 1;
      const previousRoute = allRoutes[previousIndex];
      onRouteChange(previousRoute.id);
    }
  }, [selectedRoute, allRoutes, onRouteChange]);

  // PanResponder for swipe gestures with Tinder-like animation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderGrant: () => {
        // Reset any existing animations
        translateX.setOffset(0);
        translateY.setOffset(0);
        rotate.setOffset(0);
        translateX.setValue(0);
        translateY.setValue(0);
        rotate.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;

        // Update position
        translateX.setValue(dx);
        translateY.setValue(dy);

        // Calculate rotation based on horizontal movement (Tinder-like effect)
        const rotation = (dx / screenWidth) * 0.3; // Max rotation of ~17 degrees
        rotate.setValue(rotation);

        // Fade out slightly as it moves away from center
        const opacityValue = 1 - Math.abs(dx) / (screenWidth * 0.5);
        opacity.setValue(Math.max(0.3, opacityValue));
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy, vx } = gestureState;

        // Reset offsets
        translateX.flattenOffset();
        translateY.flattenOffset();
        rotate.flattenOffset();

        // Determine if swipe is strong enough to trigger navigation
        const swipeThreshold = screenWidth * 0.25; // 25% of screen width
        const velocityThreshold = 0.5;

        if (Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold) {
          // Animate card off screen
          const exitDirection = dx > 0 ? screenWidth : -screenWidth;

          Animated.parallel([
            Animated.timing(translateX, {
              toValue: exitDirection,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: dy * 2, // Add some vertical movement
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: dx > 0 ? 0.3 : -0.3, // Final rotation
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Reset animation values
            translateX.setValue(0);
            translateY.setValue(0);
            rotate.setValue(0);
            opacity.setValue(1);

            // Trigger route change
            if (dx > 0 || vx > 0) {
              // Swipe right - go to previous route
              handleSwipeToPrevious();
            } else {
              // Swipe left - go to next route
              handleSwipeToNext();
            }
          });
        } else {
          // Snap back to center
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  if (!selectedRoute) return null;

  const containerStyle = {
    position: 'absolute' as const,
    bottom: BOTTOM_NAV_HEIGHT,
    left: 0,
    right: 0,
    backgroundColor: 'transparent', // Make background transparent
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          transform: [
            { translateX: translateX },
            { translateY: translateY },
            {
              rotate: rotate.interpolate({
                inputRange: [-1, 1],
                outputRange: ['-17deg', '17deg'],
              }),
            },
          ],
          opacity: opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <RoutePreviewCard route={selectedRoute} showMap={false} onPress={onPress} />
    </Animated.View>
  );
}
