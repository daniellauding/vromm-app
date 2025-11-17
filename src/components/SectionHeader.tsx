import React from 'react';
import { XStack, Button } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';

type SectionHeaderProps = {
  title: string;
  variant?: 'simple' | 'chevron' | 'dropdown';
  onAction?: () => void;
  actionLabel?: string;
  showChevron?: boolean;
  showAction?: boolean;
  showActionLabel?: boolean;
};

export function SectionHeader({
  title,
  variant = 'simple',
  onAction,
  actionLabel,
  showChevron = true,
  showAction,
  showActionLabel = true,
}: SectionHeaderProps) {
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';

  // Show action if explicitly set to true, or if onAction is provided (can show icon-only if showActionLabel is false)
  const shouldShowAction =
    showAction !== undefined ? showAction : !!(onAction && (showActionLabel ? actionLabel : true));
  return (
    <XStack px="$4" pr="$3" py="$0" justifyContent="space-between" alignItems="center">
      <Text size="xl" weight="bold">
        {title}
      </Text>

      {shouldShowAction && onAction && (
        <Button
          size="sm"
          variant="outlined"
          backgroundColor="transparent"
          borderWidth={0}
          paddingVertical={0}
          paddingHorizontal={0}
          minHeight={0}
          onPress={onAction}
        >
          <XStack gap="$2" alignItems="center">
            {showActionLabel && actionLabel && <Text>{actionLabel}</Text>}
            {showChevron && variant === 'chevron' && (
              <Feather
                name="chevron-right"
                size={20}
                color={colorScheme === 'dark' ? '#CCC' : '#666'}
              />
            )}
            {variant === 'dropdown' && (
              <Feather
                name="chevron-down"
                size={20}
                color={colorScheme === 'dark' ? '#CCC' : '#666'}
              />
            )}
          </XStack>
        </Button>
      )}
    </XStack>
  );
}
