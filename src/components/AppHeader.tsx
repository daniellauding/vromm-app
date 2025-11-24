import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSmartFilters, FilterCategory } from '../hooks/useSmartFilters';
import { useThemePreference } from '../hooks/useThemeOverride';

const THEME = {
  brandPrimary: '#00E6C3',
  borderColor: '#333',
};

// FilterCategory is now imported from useSmartFilters hook

interface AppHeaderProps {
  onSearchFilterPress: () => void; // Combined search + filter button
  filters?: FilterCategory[];
  onFilterPress?: (filter: FilterCategory) => void;
  activeFilters?: string[]; // IDs of currently active filters
  filterCounts?: Record<string, number>; // Route count for each filter
  hasActiveFilters?: boolean; // Whether filters are currently applied
  userCollections?: Array<{ id: string; name: string }>; // User's collections for filter chips
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
  onSearchFilterPress,
  filters = [],
  onFilterPress,
  activeFilters = [],
  filterCounts = {},
  hasActiveFilters = false,
  userCollections = [],
}: AppHeaderProps) {
  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const { getSmartFilters, trackFilterUsage, addUserCollections, getAllFilters } =
    useSmartFilters();

  // Add user collections to smart filters
  React.useEffect(() => {
    if (userCollections.length > 0) {
      addUserCollections(userCollections);
    }
  }, [userCollections, addUserCollections]);

  // Get smart filter list (most relevant filters first)
  const allFilters = getAllFilters(filters);
  const smartFilters = getSmartFilters(allFilters, activeFilters);

  // Chip colors - improved styling with solid backgrounds matching ProgressScreen
  const chipColors = {
    inactive: {
      background: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
      border: colorScheme === 'dark' ? '#333333' : '#E0E0E0',
      text: colorScheme === 'dark' ? '#ECEDEE' : '#666666',
    },
    active: {
      background: THEME.brandPrimary,
      border: THEME.brandPrimary,
      text: '#000000',
    },
    collection: {
      background: colorScheme === 'dark' ? '#1A3A5C' : '#E3F2FD',
      border: colorScheme === 'dark' ? '#2E5A8A' : '#BBDEFB',
      text: colorScheme === 'dark' ? '#90CAF9' : '#1976D2',
    },
  };

  // Remove separate search navigation since we're merging with filter

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.content}>
          <XStack gap="$2" alignItems="center" flex={1}>
            {/* Combined Search + Filter Button */}
            <View style={{ position: 'relative' }}>
              <XStack
              // backgroundColor={buttonBackgroundColor}
              // borderRadius="$4"
              // width="$4"
              // height="$4"
              // alignItems="center"
              // justifyContent="center"
              // borderWidth={1}
              // borderColor={borderColor}
              // onPress={onSearchFilterPress}
              // pressStyle={{ opacity: 0.7 }}
              >
                <TouchableOpacity
                  style={{
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF',
                    borderRadius: 25,
                    width: 34,
                    height: 34,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                    borderWidth: 1,
                    borderColor: colorScheme === 'dark' ? '#232323' : '#E5E5E5',
                  }}
                  onPress={onSearchFilterPress}
                >
                  <Feather name="search" size={16} color={iconColor} />
                </TouchableOpacity>
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

            {/* Smart Filter Chips - Show most relevant filters */}
            {smartFilters.length > 0 && (
              <View style={{ flex: 1, position: 'relative' }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1, marginLeft: 8, marginRight: -16 }}
                  contentContainerStyle={{ paddingRight: 16 }}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled={true}
                >
                  {smartFilters.map((filter) => {
                    const isActive = activeFilters.includes(filter.id);
                    const count = filterCounts[filter.id];
                    const isCollection = filter.type === 'collection';

                    // Choose colors based on filter type and state
                    let colors;
                    if (isActive) {
                      colors = chipColors.active;
                    } else if (isCollection) {
                      colors = chipColors.collection;
                    } else {
                      colors = chipColors.inactive;
                    }

                    return (
                      <TouchableOpacity
                        key={filter.id}
                        activeOpacity={0.7}
                        style={{
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          marginRight: 8,
                          minWidth: 60,
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexDirection: 'row',
                        }}
                        onPress={() => {
                          console.log(
                            `🧠 Smart filter chip pressed:`,
                            filter.label,
                            'ID:',
                            filter.id,
                            'Type:',
                            filter.type,
                            'Active:',
                            isActive,
                          );

                          // Track filter usage for smart recommendations
                          trackFilterUsage(filter.id, filter.type);

                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onFilterPress?.(filter);
                        }}
                      >
                        {/* Collection icon for collection filters */}
                        {isCollection && (
                          <Feather
                            name="folder"
                            size={12}
                            color={colors.text}
                            style={{ marginRight: 4 }}
                          />
                        )}

                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: isActive ? '600' : '500',
                            fontSize: 14,
                          }}
                          numberOfLines={1}
                        >
                          {count !== undefined && count > 0
                            ? `${filter.label} (${count})`
                            : filter.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </XStack>
        </View>
      </SafeAreaView>
    </View>
  );
}
