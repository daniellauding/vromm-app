import { XStack, YStack } from 'tamagui';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { SectionHeader } from '@/src/components/SectionHeader';
import React from 'react';
import { supabase } from '../../lib/supabase';
import { FilterCategory } from '@/src/types/navigation';

export const QuickFilters = ({
  handleFilterPress,
}: {
  handleFilterPress?: (filter: any) => void;
}) => {
  const [allFilters, setAllFilters] = React.useState<any[]>([]);
  React.useEffect(() => {
    const fetchFilters = async () => {
      const { data, error } = await supabase.rpc('get_route_filters');
      const filterMap = new Map<string, FilterCategory>();
      // Difficulty
      if (data.difficulty) {
        data.difficulty.forEach((filter: string) => {
          filterMap.set(`difficulty-${filter}`, {
            id: `difficulty-${filter}`,
            label: filter.charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'difficulty',
          });
        });
      }

      // Spot Type
      if (data.spot_type) {
        data.spot_type.forEach((filter: string) => {
          filterMap.set(`spot-${filter}`, {
            id: `spot-${filter}`,
            label: filter.replace(/_/g, ' ').charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'spot_type',
          });
        });
      }

      // Category
      if (data.category) {
        data.category.forEach((filter: string) => {
          filterMap.set(`category-${filter}`, {
            id: `category-${filter}`,
            label: filter.replace(/_/g, ' ').charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'category',
          });
        });
      }

      // Transmission Type
      if (data.transmission_type) {
        data.transmission_type.forEach((filter: string) => {
          filterMap.set(`transmission-${filter}`, {
            id: `transmission-${filter}`,
            label: filter.replace(/_/g, ' ').charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'transmission_type',
          });
        });
      }

      // Activity Level
      if (data.activity_level) {
        data.activity_level.forEach((filter: string) => {
          filterMap.set(`activity-${filter}`, {
            id: `activity-${filter}`,
            label: filter.replace(/_/g, ' ').charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'activity_level',
          });
        });
      }

      // Best Season
      if (data.best_season) {
        data.best_season.forEach((filter: string) => {
          filterMap.set(`season-${filter}`, {
            id: `season-${filter}`,
            label: filter.replace(/-/g, ' ').charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'best_season',
          });
        });
      }

      // Vehicle Types
      if (data.vehicle_types && Array.isArray(data.vehicle_types)) {
        data.vehicle_types.forEach((filter: string) => {
          filterMap.set(`vehicle-${filter}`, {
            id: `vehicle-${filter}`,
            label: filter.replace(/_/g, ' ').charAt(0).toUpperCase() + filter.slice(1),
            value: filter,
            type: 'vehicle_types',
          });
        });
      }

      setAllFilters(Array.from(filterMap.values()));
    };

    fetchFilters();
  }, []);

  return (
    <YStack gap="$2">
      <SectionHeader title="Quick Filters" />
      <XStack flexWrap="wrap" gap="$2" paddingHorizontal="$4">
        {allFilters.map((filter) => (
          <Button
            key={filter.id}
            size="sm"
            variant="secondary"
            onPress={() => handleFilterPress?.(filter)}
            marginBottom="$2"
          >
            <Text numberOfLines={1}>{filter.label}</Text>
          </Button>
        ))}
      </XStack>
    </YStack>
  );
};
