import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { XStack, Input, Button, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { NavigationProp } from '../types/navigation';

interface FilterCategory {
  id: string;
  label: string;
  value: string;
  type:
    | 'difficulty'
    | 'spot_type'
    | 'category'
    | 'transmission_type'
    | 'activity_level'
    | 'best_season'
    | 'vehicle_types';
}

interface AppHeaderProps {
  onLocateMe: () => void;
  filters?: FilterCategory[];
  onFilterPress?: (filter: FilterCategory) => void;
  onFilterButtonPress?: () => void;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export function AppHeader({
  onLocateMe,
  filters = [],
  onFilterPress,
  onFilterButtonPress,
}: AppHeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  return (
    <View style={styles.container}>
      <XStack gap="$2">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={handleSearchPress}>
          <Input
            flex={1}
            placeholder="Search cities, addresses, routes..."
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$2"
            height="$10"
            paddingLeft="$3"
            fontSize="$2"
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
        <XStack
          backgroundColor="$background"
          borderRadius="$2"
          width="$10"
          height="$10"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor="$borderColor"
          onPress={onFilterButtonPress}
          pressStyle={{ opacity: 0.7 }}
        >
          <Feather name="filter" size={20} color={iconColor} />
        </XStack>
        <XStack
          backgroundColor="$background"
          borderRadius="$2"
          width="$10"
          height="$10"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor="$borderColor"
          onPress={onLocateMe}
          pressStyle={{ opacity: 0.7 }}
        >
          <Feather name="navigation" size={20} color={iconColor} />
        </XStack>
      </XStack>

      {/* Quick Filters */}
      {filters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          {filters.map((filter) => (
            <Button
              key={filter.id}
              size="$4"
              backgroundColor="#1A3D3D"
              borderRadius="$4"
              pressStyle={{ opacity: 0.8 }}
              onPress={() => onFilterPress?.(filter)}
            >
              {filter.label}
            </Button>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
