import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { YStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';

const DARK_THEME = {
  text: 'white',
  secondaryText: '#AAAAAA',
  iconColor: '#666',
  brandPrimary: '#00E6C3',
  borderColor: '#333',
};

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  primaryChip: {
    backgroundColor: DARK_THEME.brandPrimary,
    borderColor: DARK_THEME.brandPrimary,
  },
  secondaryChip: {
    backgroundColor: 'transparent',
    borderColor: DARK_THEME.brandPrimary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryChipText: {
    color: '#000000',
  },
  secondaryChipText: {
    color: DARK_THEME.brandPrimary,
  },
});

interface EmptyFilterStateProps {
  onExpandSearch?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function EmptyFilterState({ 
  onExpandSearch, 
  onClearFilters, 
  hasActiveFilters = false 
}: EmptyFilterStateProps) {
  const { t } = useTranslation();

  return (
    <YStack 
      alignItems="center" 
      justifyContent="center" 
      padding="$6" 
      gap="$4"
      flex={1}
      minHeight={200}
    >
      <Feather 
        name="map-pin" 
        size={48} 
        color={DARK_THEME.iconColor} 
      />
      
      <YStack alignItems="center" gap="$2">
        <Text 
          fontSize="$5" 
          fontWeight="600" 
          color={DARK_THEME.text}
          textAlign="center"
        >
          {t('explore.noRoutesFound') || 'No routes found'}
        </Text>
        
        <Text 
          fontSize="$3" 
          color={DARK_THEME.secondaryText}
          textAlign="center"
          lineHeight="$1"
        >
          {hasActiveFilters 
            ? (t('explore.noRoutesWithFilters') || 'Try adjusting your filters or expanding your search area')
            : (t('explore.noRoutesInArea') || 'No routes available in this area')
          }
        </Text>
      </YStack>

      <YStack gap="$2" width="100%" maxWidth={280}>
        {hasActiveFilters && onClearFilters && (
          <TouchableOpacity
            style={[styles.filterChip, styles.primaryChip]}
            onPress={onClearFilters}
          >
            <Text style={[styles.chipText, styles.primaryChipText]}>
              {t('explore.clearFilters') || 'Clear filters'}
            </Text>
          </TouchableOpacity>
        )}
        
        {onExpandSearch && (
          <TouchableOpacity
            style={[styles.filterChip, styles.secondaryChip]}
            onPress={onExpandSearch}
          >
            <Text style={[styles.chipText, styles.secondaryChipText]}>
              {t('explore.expandSearch') || 'Expand search area'}
            </Text>
          </TouchableOpacity>
        )}
      </YStack>
    </YStack>
  );
}