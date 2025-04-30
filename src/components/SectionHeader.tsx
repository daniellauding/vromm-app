import React from 'react';
import { XStack, Button } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';

type SectionHeaderProps = {
  title: string;
  variant?: 'simple' | 'chevron' | 'dropdown';
  onAction?: () => void;
  actionLabel?: string;
  showChevron?: boolean;
};

export function SectionHeader({
  title,
  variant = 'simple',
  onAction,
  actionLabel,
  showChevron = true
}: SectionHeaderProps) {
  return (
    <XStack px="$4" justifyContent="space-between" alignItems="center">
      <Text size="xl" weight="bold">
        {title}
      </Text>
      
      {onAction && (
        <Button
          size="sm"
          variant="outlined"
          backgroundColor="transparent"
          borderWidth={0}
          onPress={onAction}
        >
          <XStack gap="$2" alignItems="center">
            <Text>{actionLabel}</Text>
            {showChevron && variant === 'chevron' && (
              <Feather name="chevron-right" size={20} color="white" />
            )}
            {variant === 'dropdown' && (
              <Feather name="chevron-down" size={20} color="white" />
            )}
          </XStack>
        </Button>
      )}
    </XStack>
  );
} 