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
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { useThemePreference } from '@/src/hooks/useThemeOverride';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text, XStack, useTheme, YStack } from 'tamagui';

const BOTTOM_NAV_HEIGHT = 80;
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

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
    paddingBottom: BOTTOM_NAV_HEIGHT + BOTTOM_INSET, // Add padding to prevent content going under bottom nav
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
  searchInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  clearButton: {
    position: 'absolute',
    right: 28,
    top: 16,
    padding: 4,
  },
});

import React from 'react';

export const RoutesDrawer = React.forwardRef<
  View,
  {
    selectedRoute: Route | null;
    filteredRoutes: Route[];
    loadRoutes: () => void;
    onClearFilters?: () => void;
    hasActiveFilters?: boolean;
    onExpandSearch?: () => void;
    onRoutePress?: (routeId: string) => void;
    isTabletSidebar?: boolean;
  }
>(
  (
    {
      selectedRoute,
      filteredRoutes,
      onClearFilters,
      hasActiveFilters = false,
      onExpandSearch: _onExpandSearch,
      onRoutePress,
      isTabletSidebar = false,
    },
    ref,
  ) => {
    const { t, language } = useTranslation();
    const scrollOffset = useRef(0);
    const { effectiveTheme } = useThemePreference();
    const colorScheme = effectiveTheme || 'light';
    const theme = useTheme();
    const { height: screenHeight } = Dimensions.get('window');
    const [searchQuery, setSearchQuery] = useState('');
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
      .activeOffsetY([-10, 10])
      .failOffsetX([-20, 20])
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

    // Filter routes based on search query - expanded to include more metadata
    const searchFilteredRoutes = useMemo(() => {
      if (!searchQuery.trim()) {
        return filteredRoutes;
      }

      const query = searchQuery.toLowerCase().trim();
      return filteredRoutes.filter((route) => {
        // Search by route name
        const nameMatch = route.name?.toLowerCase().includes(query);

        // Search by city (from waypoint details)
        const cityMatch = (route as Route & { city?: string }).city?.toLowerCase().includes(query);

        // Search by waypoint titles/descriptions
        const waypointMatch = route.waypoint_details?.some(
          (wp: { title?: string; description?: string }) =>
            wp.title?.toLowerCase().includes(query) ||
            wp.description?.toLowerCase().includes(query),
        );

        // Search by description
        const descriptionMatch = route.description?.toLowerCase().includes(query);

        // Search by creator name
        const creatorMatch = route.creator?.full_name?.toLowerCase().includes(query);

        // Search by difficulty (beginner, intermediate, advanced)
        const difficultyMatch = route.difficulty?.toLowerCase().includes(query);

        // Search by spot type (urban, highway, rural, parking)
        const spotTypeMatch = route.spot_type?.toLowerCase().includes(query);

        // Search by category (parking, incline_start, etc.)
        const categoryMatch = route.category?.toLowerCase().includes(query);

        // Search by transmission type (automatic, manual, both)
        const transmissionMatch = route.transmission_type?.toLowerCase().includes(query);

        // Search by activity level (moderate, high)
        const activityMatch = route.activity_level?.toLowerCase().includes(query);

        // Search by season (all, year-round, avoid-winter)
        const seasonMatch = route.best_season?.toLowerCase().includes(query);

        // Search by drawing mode (recorded, waypoint, pen)
        const drawingModeMatch = route.drawing_mode?.toLowerCase().includes(query);

        return (
          nameMatch ||
          cityMatch ||
          waypointMatch ||
          descriptionMatch ||
          creatorMatch ||
          difficultyMatch ||
          spotTypeMatch ||
          categoryMatch ||
          transmissionMatch ||
          activityMatch ||
          seasonMatch ||
          drawingModeMatch
        );
      });
    }, [filteredRoutes, searchQuery]);

    const handleClearSearch = useCallback(() => {
      setSearchQuery('');
      Keyboard.dismiss();
    }, []);

    if (selectedRoute) {
      return null;
    }

    // Tablet Sidebar Mode (Static)
    if (isTabletSidebar) {
      return (
        <View
          ref={ref}
          style={{
            flex: 1,
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF',
          }}
        >
          <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <XStack alignItems="center" gap="$2">
              <Feather
                name="map"
                size={16}
                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
              />
              <Text
                fontSize="$4"
                fontWeight="600"
                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
              >
                {searchFilteredRoutes.length}{' '}
                {searchFilteredRoutes.length === 1 ? t('home.route') : t('home.routes')}
              </Text>
            </XStack>
          </View>

          {/* Search Input */}
          <View style={[styles.searchInputContainer, { paddingHorizontal: 12 }]}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F2F2F7',
                  color: colorScheme === 'dark' ? '#ECEDEE' : '#000000',
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                },
              ]}
              placeholder={language === 'sv' ? 'Sök rutter...' : 'Search routes...'}
              placeholderTextColor={theme.gray10?.val || '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={[styles.clearButton, { right: 20 }]}
                onPress={handleClearSearch}
              >
                <Feather name="x-circle" size={18} color={theme.gray10?.val || '#999'} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flex: 1 }}>
            {searchFilteredRoutes.length > 0 ? (
              <RouteList
                routes={searchFilteredRoutes}
                onScroll={handleScroll}
                onRoutePress={onRoutePress}
              />
            ) : (
              <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
                <Feather
                  name="search"
                  size={48}
                  color={theme.gray10?.val || '#999'}
                  style={{ marginBottom: 16 }}
                />
                <Text
                  fontSize="$4"
                  fontWeight="600"
                  color={theme.color?.val || '#000000'}
                  textAlign="center"
                >
                  {language === 'sv' ? 'Inga rutter' : 'No routes'}
                </Text>
                <Text
                  fontSize="$2"
                  color={theme.gray11?.val || '#666'}
                  textAlign="center"
                  marginTop="$2"
                >
                  {searchQuery.trim()
                    ? language === 'sv'
                      ? `Inga rutter matchar "${searchQuery}"`
                      : `No routes match "${searchQuery}"`
                    : hasActiveFilters
                      ? language === 'sv'
                        ? 'Försök justera dina filter'
                        : 'Try adjusting your filters'
                      : language === 'sv'
                        ? 'Inga rutter tillgängliga'
                        : 'No routes available'}
                </Text>
              </YStack>
            )}
          </View>
        </View>
      );
    }

    // Mobile Bottom Sheet Mode (Animated)
    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View
          ref={ref}
          style={[
            styles.bottomSheet,
            {
              height: screenHeight,
              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF',
            },
            animatedStyle,
          ]}
        >
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: colorScheme === 'dark' ? '#666' : '#E5E5E5' },
              ]}
            />
            <XStack alignItems="center" gap="$2">
              <Feather
                name="map"
                size={16}
                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
              />
              <Text
                fontSize="$4"
                fontWeight="600"
                color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
              >
                {searchFilteredRoutes.length}{' '}
                {searchFilteredRoutes.length === 1 ? t('home.route') : t('home.routes')}
              </Text>
            </XStack>
          </View>

          {/* Search Input */}
          <View style={styles.searchInputContainer}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F2F2F7',
                  color: colorScheme === 'dark' ? '#ECEDEE' : '#000000',
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? '#333333' : '#E5E5E5',
                },
              ]}
              placeholder={language === 'sv' ? 'Sök rutter, städer...' : 'Search routes, cities...'}
              placeholderTextColor={theme.gray10?.val || '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                <Feather name="x-circle" size={18} color={theme.gray10?.val || '#999'} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.routeListContainer}>
            {searchFilteredRoutes.length > 0 ? (
              <RouteList
                routes={searchFilteredRoutes}
                onScroll={handleScroll}
                onRoutePress={onRoutePress}
              />
            ) : (
              <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
                <Feather
                  name="search"
                  size={48}
                  color={theme.gray10?.val || '#999'}
                  style={{ marginBottom: 16 }}
                />
                <Text fontSize="$5" fontWeight="600" color={theme.color?.val || '#000000'}>
                  {language === 'sv' ? 'Inga rutter hittades' : 'No routes found'}
                </Text>
                <Text
                  fontSize="$3"
                  color={theme.gray11?.val || '#666'}
                  textAlign="center"
                  marginTop="$2"
                >
                  {searchQuery.trim()
                    ? language === 'sv'
                      ? `Inga rutter matchar "${searchQuery}"`
                      : `No routes match "${searchQuery}"`
                    : hasActiveFilters
                      ? language === 'sv'
                        ? 'Försök justera dina filter'
                        : 'Try adjusting your filters'
                      : language === 'sv'
                        ? 'Inga rutter tillgängliga'
                        : 'No routes available'}
                </Text>
                {(searchQuery.trim() || hasActiveFilters) && (
                  <TouchableOpacity
                    onPress={() => {
                      if (searchQuery.trim()) {
                        handleClearSearch();
                      }
                      if (hasActiveFilters && onClearFilters) {
                        onClearFilters();
                      }
                    }}
                    style={{
                      marginTop: 16,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      backgroundColor: theme.blue9?.val || '#007AFF',
                      borderRadius: 8,
                    }}
                  >
                    <Text fontSize="$3" fontWeight="600" color="#FFFFFF">
                      {language === 'sv' ? 'Rensa sök & filter' : 'Clear search & filters'}
                    </Text>
                  </TouchableOpacity>
                )}
              </YStack>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

RoutesDrawer.displayName = 'RoutesDrawer';
