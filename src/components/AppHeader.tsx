import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { XStack, Input, Button, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NavigationProp } from '../types/navigation';

const THEME = {
  brandPrimary: '#00E6C3',
  borderColor: '#333',
};

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
  activeFilters?: string[]; // IDs of currently active filters
  filterCounts?: Record<string, number>; // Route count for each filter
  hasActiveFilters?: boolean; // Whether filters are currently applied
  locationLoading?: boolean; // Whether location detection is in progress
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export function AppHeader({
  onLocateMe,
  filters = [],
  onFilterPress,
  onFilterButtonPress,
  activeFilters = [],
  filterCounts = {},
  hasActiveFilters = false,
  locationLoading = false,
}: AppHeaderProps) {
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  
  // Semi-transparent backgrounds for overlay effect
  const buttonBackgroundColor = colorScheme === 'dark' 
    ? 'rgba(26, 26, 26, 0.85)' 
    : 'rgba(255, 255, 255, 0.85)';
  const borderColor = colorScheme === 'dark' 
    ? 'rgba(255, 255, 255, 0.15)' 
    : 'rgba(0, 0, 0, 0.15)';

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.content}>
          <XStack gap="$2" alignItems="center">
        {/* Search Icon Button */}
        <XStack
          backgroundColor={buttonBackgroundColor}
          borderRadius="$4"
          width="$4"
          height="$4"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor={borderColor}
          onPress={handleSearchPress}
          pressStyle={{ opacity: 0.7 }}
        >
          <Feather name="search" size={16} color={iconColor} />
        </XStack>

        {/* Filter Icon Button with Badge */}
        <View style={{ position: 'relative' }}>
          <XStack
            backgroundColor={buttonBackgroundColor}
            borderRadius="$4"
            width="$4"
            height="$4"
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor={borderColor}
            onPress={onFilterButtonPress}
            pressStyle={{ opacity: 0.7 }}
          >
            <Feather name="filter" size={16} color={iconColor} />
          </XStack>
          {hasActiveFilters && (
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: THEME.brandPrimary,
                borderWidth: 1,
                borderColor: colorScheme === 'dark' ? '#1A1A1A' : 'white',
              }}
            />
          )}
        </View>

        {/* Locate Me Button */}
        <XStack
          backgroundColor={buttonBackgroundColor}
          borderRadius="$4"
          width="$4"
          height="$4"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor={borderColor}
          onPress={onLocateMe}
          pressStyle={{ opacity: locationLoading ? 1 : 0.7 }}
          opacity={locationLoading ? 0.8 : 1}
        >
          {locationLoading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="loader" size={16} color={iconColor} style={{
                transform: [{ rotate: '45deg' }] // Simple rotation instead of animation for header
              }} />
            </View>
          ) : (
            <Feather name="navigation" size={16} color={iconColor} />
          )}
        </XStack>

        {/* Horizontal Filter Chips */}
        {filters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1, marginLeft: 8 }}
            contentContainerStyle={{ paddingRight: 16 }}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            {filters.map((filter, index) => {
              const isActive = activeFilters.includes(filter.id);
              const count = filterCounts[filter.id];
              
              console.log(`🔴 Rendering chip ${index}:`, filter.label, 'ID:', filter.id, 'Active:', isActive);
              
              return (
                <TouchableOpacity
                  key={filter.id}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isActive ? THEME.brandPrimary : buttonBackgroundColor,
                    borderColor: THEME.brandPrimary,
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: isActive ? THEME.brandPrimary : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isActive ? 0.3 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 3 : 0,
                    minWidth: 80, // Ensure minimum touchable area
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    console.log(`🔴 Filter chip ${index} pressed:`, filter.label, 'ID:', filter.id, 'Type:', filter.type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onFilterPress?.(filter);
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? '#000000' : THEME.brandPrimary,
                      fontWeight: '600',
                      fontSize: 14,
                    }}
                  >
                    {filter.label}
                  </Text>
                  {count !== undefined && count > 0 && (
                    <View
                      style={{
                        marginLeft: 6,
                        backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : THEME.brandPrimary,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive ? '#000000' : '#000000',
                          fontWeight: '600',
                          fontSize: 12,
                          lineHeight: 16,
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
          </XStack>
        </View>
      </SafeAreaView>
    </View>
  );
}
