import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Text, XStack, YStack, Slider, Button, Checkbox, Switch, SizableText } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';

export type FilterOptions = {
  difficulty?: string[];
  spotType?: string[];
  category?: string[];
  transmissionType?: string[];
  activityLevel?: string[];
  bestSeason?: string[];
  vehicleTypes?: string[];
  maxDistance?: number;
  sort?:
    | 'best_match'
    | 'most_popular'
    | 'closest'
    | 'newly_added'
    | 'newest'
    | 'my_created'
    | 'best_review'
    | 'has_image';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
};

interface FilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  routeCount: number;
  initialFilters?: FilterOptions;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;
const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1500, // Higher than TabNavigator's 100
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.9,
    paddingBottom: 20 + BOTTOM_INSET, // Add extra padding to account for bottom inset
  },
  header: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedChip: {
    backgroundColor: '#00E6C3',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedChipText: {
    color: '#000000',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    paddingBottom: 16 + BOTTOM_INSET, // Extra padding to ensure button is above home indicator
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -TAB_BAR_HEIGHT - BOTTOM_INSET, // Extend beyond bottom nav to fully cover it
    backgroundColor: 'rgba(0,0,0,0.7)', // Make it more opaque
  },
});

export function FilterSheet({
  isVisible,
  onClose,
  onApplyFilters,
  routeCount,
  initialFilters = {},
}: FilterSheetProps) {
  const { t } = useTranslation();
  // Force dark theme
  const backgroundColor = '#1A1A1A';
  const textColor = 'white';
  const borderColor = '#333';
  const handleColor = '#666';

  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: screenHeight,
          damping: 20,
          mass: 1,
          stiffness: 100,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  // Reset filters
  const handleReset = React.useCallback(() => {
    setFilters({});
  }, []);

  // Apply filters and close sheet
  const handleApply = React.useCallback(() => {
    onApplyFilters(filters);
    onClose();
  }, [onApplyFilters, filters, onClose]);

  // Toggle array-based filter selection
  const toggleFilter = (type: keyof FilterOptions, value: string) => {
    setFilters((prev) => {
      const arrayProp = type as keyof Pick<
        FilterOptions,
        | 'difficulty'
        | 'spotType'
        | 'category'
        | 'transmissionType'
        | 'activityLevel'
        | 'bestSeason'
        | 'vehicleTypes'
      >;
      const currentArray = (prev[arrayProp] as string[]) || [];

      if (currentArray.includes(value)) {
        return {
          ...prev,
          [arrayProp]: currentArray.filter((v) => v !== value),
        };
      } else {
        return {
          ...prev,
          [arrayProp]: [...currentArray, value],
        };
      }
    });
  };

  // Set single value filter
  const setSingleFilter = React.useCallback((type: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [type]: value,
    }));
  }, []);

  // Check if a filter chip is selected
  const isSelected = React.useCallback(
    (type: keyof FilterOptions, value: string) => {
      const arrayProp = filters[type] as string[] | undefined;
      return arrayProp?.includes(value) || false;
    },
    [filters],
  );

  // Handle backdrop press
  const handleBackdropPress = React.useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isVisible && translateY._value === screenHeight) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        onTouchEnd={handleBackdropPress}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderColor,
            transform: [{ translateY }],
            zIndex: 1501, // Above backdrop
            width: screenWidth,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          <XStack width="100%" paddingHorizontal="$4" justifyContent="space-between">
            <TouchableOpacity onPress={handleReset}>
              <Text color="$blue10">{t('common.reset')}</Text>
            </TouchableOpacity>
            <Text fontWeight="600" fontSize="$5" color={textColor}>
              {t('map.filters')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={textColor} />
            </TouchableOpacity>
          </XStack>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Sort Options */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.sortBy')}
            </SizableText>
            <View style={styles.filterRow}>
              {[
                'best_match',
                'most_popular',
                'closest',
                'newly_added',
                'newest',
                'my_created',
                'best_review',
                'has_image',
              ].map((sort) => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: filters.sort === sort ? '#00E6C3' : 'transparent',
                    },
                  ]}
                  onPress={() => setSingleFilter('sort', sort)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.sort === sort ? '#000000' : textColor,
                      fontWeight: filters.sort === sort ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.sort.${sort}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Difficulty */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.difficulty')}
            </SizableText>
            <View style={styles.filterRow}>
              {['beginner', 'intermediate', 'advanced'].map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('difficulty', difficulty)
                        ? '#00E6C3'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('difficulty', difficulty)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('difficulty', difficulty) ? '#000000' : textColor,
                        fontWeight: isSelected('difficulty', difficulty) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.difficulty.${difficulty}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Spot Type */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.spotType')}
            </SizableText>
            <View style={styles.filterRow}>
              {['urban', 'highway', 'rural', 'parking'].map((spotType) => (
                <TouchableOpacity
                  key={spotType}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('spotType', spotType) ? '#00E6C3' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('spotType', spotType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('spotType', spotType) ? '#000000' : textColor,
                        fontWeight: isSelected('spotType', spotType) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.spotType.${spotType}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Category */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.category')}
            </SizableText>
            <View style={styles.filterRow}>
              {['parking', 'incline_start'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('category', category) ? '#00E6C3' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('category', category)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('category', category) ? '#000000' : textColor,
                        fontWeight: isSelected('category', category) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.category.${category}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Transmission Type */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.transmissionType')}
            </SizableText>
            <View style={styles.filterRow}>
              {['automatic', 'manual', 'both'].map((transmissionType) => (
                <TouchableOpacity
                  key={transmissionType}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('transmissionType', transmissionType)
                        ? '#00E6C3'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('transmissionType', transmissionType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('transmissionType', transmissionType)
                          ? '#000000'
                          : textColor,
                        fontWeight: isSelected('transmissionType', transmissionType) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.transmissionType.${transmissionType}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Activity Level */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.activityLevel')}
            </SizableText>
            <View style={styles.filterRow}>
              {['moderate', 'high'].map((activityLevel) => (
                <TouchableOpacity
                  key={activityLevel}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('activityLevel', activityLevel)
                        ? '#00E6C3'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('activityLevel', activityLevel)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('activityLevel', activityLevel) ? '#000000' : textColor,
                        fontWeight: isSelected('activityLevel', activityLevel) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.activityLevel.${activityLevel}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Best Season */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.bestSeason')}
            </SizableText>
            <View style={styles.filterRow}>
              {['all', 'year-round', 'avoid-winter'].map((bestSeason) => (
                <TouchableOpacity
                  key={bestSeason}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('bestSeason', bestSeason)
                        ? '#00E6C3'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('bestSeason', bestSeason)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('bestSeason', bestSeason) ? '#000000' : textColor,
                        fontWeight: isSelected('bestSeason', bestSeason) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.bestSeason.${bestSeason}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Vehicle Types */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.vehicleTypes')}
            </SizableText>
            <View style={styles.filterRow}>
              {['passenger_car', 'rv'].map((vehicleType) => (
                <TouchableOpacity
                  key={vehicleType}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('vehicleTypes', vehicleType)
                        ? '#00E6C3'
                        : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('vehicleTypes', vehicleType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('vehicleTypes', vehicleType) ? '#000000' : textColor,
                        fontWeight: isSelected('vehicleTypes', vehicleType) ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.vehicleTypes.${vehicleType}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Experience Level */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.experienceLevel')}
            </SizableText>
            <View style={styles.filterRow}>
              {['beginner', 'intermediate', 'advanced', 'expert'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor:
                        filters.experienceLevel === level ? '#00E6C3' : 'transparent',
                    },
                  ]}
                  onPress={() => setSingleFilter('experienceLevel', level)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.experienceLevel === level ? '#000000' : textColor,
                      fontWeight: filters.experienceLevel === level ? '600' : '500',
                      },
                    ]}
                  >
                    {t(`filters.experienceLevel.${level}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YStack>

          {/* Distance Range */}
          <YStack style={styles.filterSection}>
            <SizableText fontWeight="600" style={styles.sectionTitle}>
              {t('filters.maxDistance')}
            </SizableText>
            <XStack alignItems="center" justifyContent="space-between">
              <Text>{filters.maxDistance || 100} km</Text>
            </XStack>
            <Slider
              defaultValue={[filters.maxDistance || 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={(value) => {
                setSingleFilter('maxDistance', value[0]);
              }}
            >
              <Slider.Track>
                <Slider.TrackActive />
              </Slider.Track>
              <Slider.Thumb circular index={0}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: '#00E6C3',
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="move" size={14} color="#000000" />
                </View>
              </Slider.Thumb>
            </Slider>
            <XStack marginTop="$2" alignItems="center" justifyContent="space-between">
              <Text color="$gray10" fontSize="$1">
                0 km
              </Text>
              <Text color="$gray10" fontSize="$1">
                100 km
              </Text>
            </XStack>
          </YStack>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderColor,
              backgroundColor,
            },
          ]}
        >
          <Button backgroundColor="#00E6C3" color="#000000" size="$5" onPress={handleApply}>
            {t('filters.seeRoutes', { count: routeCount })}
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}

export function FilterSheetModal({
  onApplyFilters,
  routeCount,
  initialFilters = {},
}: Omit<FilterSheetProps, 'isVisible' | 'onClose'>) {
  const { hideModal } = useModal();

  // Handle closing the sheet
  const handleClose = React.useCallback(() => {
    hideModal();
  }, [hideModal]);

  // Handle apply filters and close
  const handleApply = React.useCallback(
    (filters: FilterOptions) => {
      onApplyFilters(filters);
      hideModal();
    },
    [onApplyFilters, hideModal],
  );

  return (
    <FilterSheet
      isVisible={true}
      onClose={handleClose}
      onApplyFilters={handleApply}
      routeCount={routeCount}
      initialFilters={initialFilters}
    />
  );
}
