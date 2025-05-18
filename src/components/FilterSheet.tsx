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
  sort?: 'best_match' | 'most_popular' | 'closest' | 'newly_added' | 'newest';
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
    backgroundColor: '#1A3D3D',
  },
  chipText: {
    fontSize: 14,
  },
  selectedChipText: {
    color: 'white',
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
        })
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
        })
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  // Reset filters
  const handleReset = () => {
    setFilters({});
  };

  // Apply filters and close sheet
  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  // Toggle array-based filter selection
  const toggleFilter = (type: keyof FilterOptions, value: string) => {
    setFilters(prev => {
      const arrayProp = type as keyof Pick<FilterOptions, 'difficulty' | 'spotType' | 'category' | 'transmissionType' | 'activityLevel' | 'bestSeason' | 'vehicleTypes'>;
      const currentArray = prev[arrayProp] as string[] || [];
      
      if (currentArray.includes(value)) {
        return {
          ...prev,
          [arrayProp]: currentArray.filter(v => v !== value),
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
  const setSingleFilter = (type: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  // Check if a filter chip is selected
  const isSelected = (type: keyof FilterOptions, value: string) => {
    const arrayProp = filters[type] as string[] | undefined;
    return arrayProp?.includes(value) || false;
  };

  // Handle backdrop press
  const handleBackdropPress = () => {
    onClose();
  };

  if (!isVisible && translateY._value === screenHeight) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropOpacity }
        ]} 
        pointerEvents={isVisible ? "auto" : "none"}
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
              {['best_match', 'most_popular', 'closest', 'newly_added', 'newest'].map(sort => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: filters.sort === sort ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => setSingleFilter('sort', sort)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.sort === sort ? 'white' : textColor,
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
              {['beginner', 'intermediate', 'advanced'].map(difficulty => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('difficulty', difficulty) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('difficulty', difficulty)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('difficulty', difficulty) ? 'white' : textColor,
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
              {['urban', 'highway', 'rural', 'parking'].map(spotType => (
                <TouchableOpacity
                  key={spotType}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('spotType', spotType) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('spotType', spotType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('spotType', spotType) ? 'white' : textColor,
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
              {['parking', 'incline_start'].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('category', category) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('category', category)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('category', category) ? 'white' : textColor,
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
              {['automatic', 'manual', 'both'].map(transmissionType => (
                <TouchableOpacity
                  key={transmissionType}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('transmissionType', transmissionType) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('transmissionType', transmissionType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('transmissionType', transmissionType) ? 'white' : textColor,
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
              {['moderate', 'high'].map(activityLevel => (
                <TouchableOpacity
                  key={activityLevel}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('activityLevel', activityLevel) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('activityLevel', activityLevel)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('activityLevel', activityLevel) ? 'white' : textColor,
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
              {['all', 'year-round', 'avoid-winter'].map(bestSeason => (
                <TouchableOpacity
                  key={bestSeason}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('bestSeason', bestSeason) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('bestSeason', bestSeason)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('bestSeason', bestSeason) ? 'white' : textColor,
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
              {['passenger_car', 'rv'].map(vehicleType => (
                <TouchableOpacity
                  key={vehicleType}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: isSelected('vehicleTypes', vehicleType) ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => toggleFilter('vehicleTypes', vehicleType)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected('vehicleTypes', vehicleType) ? 'white' : textColor,
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
              {['beginner', 'intermediate', 'advanced', 'expert'].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.filterChip,
                    {
                      borderColor,
                      backgroundColor: filters.experienceLevel === level ? '#1A3D3D' : 'transparent',
                    },
                  ]}
                  onPress={() => setSingleFilter('experienceLevel', level)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: filters.experienceLevel === level ? 'white' : textColor,
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
              <Slider.Thumb circular index={0} />
            </Slider>
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
          <Button
            backgroundColor="#1A3D3D"
            color="white"
            size="$5"
            onPress={handleApply}
          >
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
  initialFilters = {} 
}: Omit<FilterSheetProps, 'isVisible' | 'onClose'>) {
  const { hideModal } = useModal();
  
  // Handle closing the sheet
  const handleClose = () => {
    hideModal();
  };
  
  // Handle apply filters and close
  const handleApply = (filters: FilterOptions) => {
    onApplyFilters(filters);
    hideModal();
  };

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