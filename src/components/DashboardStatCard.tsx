import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useThemePreference } from '../hooks/useThemeOverride';

interface DashboardStatCardProps {
  value: string | number;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
}

export function DashboardStatCard({ value, label, icon, color = '#00E6C3' }: DashboardStatCardProps) {
  const { effectiveTheme } = useThemePreference();
  const isDark = effectiveTheme === 'dark';

  return (
    <YStack
      flex={1}
      backgroundColor={isDark ? '#1A1A1A' : '#F8F8F8'}
      borderRadius="$4"
      padding="$3"
      gap="$2"
      borderWidth={1}
      borderColor={isDark ? '#333' : '#E5E5E5'}
    >
      <XStack alignItems="center" gap="$2">
        <YStack
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={color + '20'}
          justifyContent="center"
          alignItems="center"
        >
          <Feather name={icon} size={16} color={color} />
        </YStack>
      </XStack>
      <Text fontSize="$7" fontWeight="bold" color={isDark ? '#FFF' : '#000'}>
        {value}
      </Text>
      <Text fontSize="$2" color={isDark ? '#AAA' : '#666'} numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}
