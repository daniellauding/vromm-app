import React from 'react';
import {
  Modal as RNModal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Category types for filtering
export type CategoryType =
  | 'vehicle_type'
  | 'transmission_type'
  | 'license_type'
  | 'experience_level'
  | 'purpose'
  | 'user_profile'
  | 'platform'
  | 'type';

export interface CategoryOption {
  id: string;
  category: CategoryType;
  value: string;
  label: { en: string; sv: string };
  order_index: number;
  is_default: boolean;
}

interface LearningPathsFilterModalProps {
  // Modal visibility and control
  visible: boolean;
  onClose: () => void;
  
  // Filter data and handlers
  categoryFilters: Record<CategoryType, string>;
  categoryOptions: Record<CategoryType, CategoryOption[]>;
  onFilterSelect: (filterType: CategoryType, value: string) => void;
  
  // Display settings
  language: string;
  colorScheme: string;
  
  // Modal mode - 'single' for single filter type, 'drawer' for full filter drawer
  mode?: 'single' | 'drawer';
  activeFilterType?: CategoryType | null; // Only used in 'single' mode
  
  // Translation function
  t?: (key: string, fallback?: string) => string;
  
  // Category labels for single mode
  categoryLabels?: Record<CategoryType, string>;
  
  // Advanced reset and save functionality (optional)
  onResetToDefaults?: () => void;
  onSaveFilters?: () => void;
  
  // Loading state for suggested filters
  loadingSuggestions?: boolean;
}

export function LearningPathsFilterModal({
  visible,
  onClose,
  categoryFilters,
  categoryOptions,
  onFilterSelect,
  language,
  colorScheme,
  mode = 'drawer',
  activeFilterType = null,
  t = (key: string, fallback?: string) => {
    const translated = t(key);
    return (translated && translated !== key) ? translated : (fallback || key);
  },
  categoryLabels,
  onResetToDefaults,
  onSaveFilters,
  loadingSuggestions = false,
}: LearningPathsFilterModalProps) {
  const insets = useSafeAreaInsets();

  // Single filter type modal (ProgressScreen style)
  if (mode === 'single' && activeFilterType) {
    const options = categoryOptions[activeFilterType] || [];
    const filterTitle = categoryLabels?.[activeFilterType] || activeFilterType;

    return (
      <RNModal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={onClose}
        >
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor="$background"
            padding="$4"
            borderTopLeftRadius="$4"
            borderTopRightRadius="$4"
            gap="$4"
          >
            <Text fontSize={20} fontWeight="bold" color="$color">
              {filterTitle}
            </Text>
            <YStack gap="$2">
              {options.map((option, optionIndex) => (
                <TouchableOpacity
                  key={`filter-${activeFilterType}-${option.id}-${optionIndex}`}
                  onPress={() => onFilterSelect(activeFilterType, option.value)}
                  style={{
                    backgroundColor:
                      categoryFilters[activeFilterType] === option.value ? '#00E6C3' : '#222',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    fontSize={16}
                    color={categoryFilters[activeFilterType] === option.value ? '#000' : '#fff'}
                  >
                    {option.label[language] || option.label.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </YStack>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#333',
                padding: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text fontSize={16} color="#fff">
                {t('common.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
          </YStack>
        </Pressable>
      </RNModal>
    );
  }

  // Full filter drawer (LearningPathsSheet style)
  if (mode === 'drawer') {
    const handleResetFilters = () => {
      if (onResetToDefaults) {
        // Use advanced reset function if provided (for ProgressScreen)
        onResetToDefaults();
      } else {
        // Fallback to simple reset (for LearningPathsSheet)
        const resetFilters: Record<CategoryType, string> = {
          vehicle_type: '',
          transmission_type: '',
          license_type: '',
          experience_level: '',
          purpose: '',
          user_profile: '',
          platform: '',
          type: '',
        };
        
        Object.keys(resetFilters).forEach((key) => {
          onFilterSelect(key as CategoryType, '');
        });
      }
    };


    const renderFilterSection = (
      filterType: CategoryType,
      titleKey: string,
      fallbackTitle: string
    ) => {
      const options = categoryOptions[filterType];
      if (!options || options.length === 0) return null;

      return (
        <YStack marginBottom={16} key={filterType}>
          <Text fontWeight="600" fontSize={16} color={colorScheme === 'dark' ? '#fff' : '#000'} marginBottom={8}>
            {t(titleKey, fallbackTitle)}
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {/* All option */}
            <TouchableOpacity
              onPress={() => onFilterSelect(filterType, '')}
              style={{
                backgroundColor: 
                  (categoryFilters[filterType] === '' || categoryFilters[filterType] === 'all') 
                    ? '#00E6C3' 
                    : '#333',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text
                fontSize={14}
                color={
                  (categoryFilters[filterType] === '' || categoryFilters[filterType] === 'all') 
                    ? '#000' 
                    : '#fff'
                }
              >
                {t('common.all', 'All')}
              </Text>
            </TouchableOpacity>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => onFilterSelect(filterType, option.value)}
                style={{
                  backgroundColor:
                    categoryFilters[filterType] === option.value ? '#00E6C3' : '#333',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  fontSize={14}
                  color={categoryFilters[filterType] === option.value ? '#000' : '#fff'}
                >
                  {option.label?.[language] || option.label?.en || option.value}
                </Text>
              </TouchableOpacity>
            ))}
          </XStack>
        </YStack>
      );
    };

    return (
      <RNModal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'flex-end',
          }}
          onPress={onClose}
        >
          <YStack
            backgroundColor={colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF'}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={20}
            paddingBottom={insets.bottom + 20}
            maxHeight="80%"
          >
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
              <TouchableOpacity onPress={handleResetFilters}>
                <Text color="#00E6C3">{t('filters.reset', 'Reset')}</Text>
              </TouchableOpacity>

              <Text fontWeight="600" fontSize={18} color={colorScheme === 'dark' ? '#fff' : '#000'}>
                {t('filters.filterLearningPaths', 'Filter Learning Paths')}
              </Text>

              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
              </TouchableOpacity>
            </XStack>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              {loadingSuggestions ? (
                <YStack alignItems="center" justifyContent="center" padding={40} gap={16}>
                  <Spinner size="large" color="#00E6C3" />
                  <Text
                    fontSize={14}
                    color={colorScheme === 'dark' ? '#999' : '#666'}
                    textAlign="center"
                  >
                    {t('filters.loadingSuggestions', 'Loading suggested filters...')}
                  </Text>
                </YStack>
              ) : (
                <>
                  {renderFilterSection('vehicle_type', 'filters.vehicleType', 'Vehicle Type')}
                  {renderFilterSection('transmission_type', 'filters.transmissionType', 'Transmission Type')}
                  {renderFilterSection('license_type', 'filters.licenseType', 'License Type')}
                  {renderFilterSection('experience_level', 'filters.experienceLevel', 'Experience Level')}
                  {renderFilterSection('purpose', 'filters.purpose', 'Purpose')}
                  {renderFilterSection('user_profile', 'filters.userProfile', 'User Profile')}
                  {renderFilterSection('platform', 'filters.platform', 'Platform')}
                  {renderFilterSection('type', 'filters.contentType', 'Content Type')}
                </>
              )}
            </ScrollView>
          </YStack>
        </Pressable>
      </RNModal>
    );
  }

  return null;
}