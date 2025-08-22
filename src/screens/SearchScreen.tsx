import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XStack, YStack, Input, Text, View, ScrollView } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useTranslation } from '../contexts/TranslationContext';

const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiZGFuaWVsbGF1ZGluZyIsImEiOiJjbTV3bmgydHkwYXAzMmtzYzh2NXBkOWYzIn0.n4aKyM2uvZD5Snou2OHF7w';

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

const { height: screenHeight } = Dimensions.get('window');
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

// Dark theme colors
const DARK_THEME = {
  background: '#1A1A1A',
  input: '#333',
  text: 'white',
  secondaryText: '#AAAAAA',
  borderColor: '#333333',
  handleColor: '#666666',
  iconColor: 'white',
};

// Popular cities for quick selection
const POPULAR_CITIES = [
  { name: 'New York', country: 'USA' },
  { name: 'London', country: 'UK' },
  { name: 'Paris', country: 'France' },
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Berlin', country: 'Germany' },
  { name: 'Sydney', country: 'Australia' },
  { name: 'Rome', country: 'Italy' },
  { name: 'Barcelona', country: 'Spain' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  contentContainer: {
    flex: 1,
  },
  searchHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchResultsList: {
    flex: 1,
  },
  searchBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
    backgroundColor: DARK_THEME.handleColor,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: '600',
    color: DARK_THEME.text,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.borderColor,
  },
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: DARK_THEME.borderColor,
  },
  nearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.borderColor,
  },
  cityName: {
    fontWeight: '500',
    color: DARK_THEME.text,
  },
  cityCountry: {
    fontSize: 12,
    color: DARK_THEME.secondaryText,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: DARK_THEME.text,
  },
  searchInput: {
    backgroundColor: DARK_THEME.input,
    borderWidth: 1,
    borderColor: DARK_THEME.borderColor,
    borderRadius: 4,
    height: 40,
    paddingLeft: 12,
    fontSize: 16,
    color: DARK_THEME.text,
  },
});

export function SearchScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<React.ElementRef<typeof Input>>(null);

  // Use useEffect to focus input on mount
  useEffect(() => {
    // Auto focus the search input
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 300);

    return () => {
      // Clean up timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const handleSearch = useCallback((text: string) => {
    console.log('Search input:', text);
    setSearchQuery(text);

    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set a new timeout for search
    const timeout = setTimeout(async () => {
      if (text.length > 0) {
        setIsSearching(true);
        try {
          console.log('Fetching search results for:', text);
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              text,
            )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,address,country,region&language=en`,
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Search response:', {
            status: response.status,
            resultCount: data.features?.length || 0,
          });

          setSearchResults(data.features || []);
        } catch (error: unknown) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    searchTimeout.current = timeout;
  }, []);

  const handleCitySelect = (city: string, country: string) => {
    // Set the city name as search query and trigger search
    const query = `${city}, ${country}`;
    setSearchQuery(query);

    // Manually trigger search with timeout to ensure UI updates first
    setTimeout(() => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      setIsSearching(true);
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality&language=en`,
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data.features && data.features.length > 0) {
            handleResultSelect(data.features[0]);
          }
        })
        .catch((error) => {
          console.error('Error selecting city:', error);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 100);
  };

  const handleNearMe = () => {
    // TODO: Get user's current location and navigate back with it
    handleClose();
  };

  const handleResultSelect = (result: SearchResult) => {
    console.log('[Search] navigating to Map with selectedLocation', {
      id: result?.id,
      place: result?.place_name,
      center: result?.center,
    });
    // @ts-ignore
    navigation.navigate('MainTabs', {
      screen: 'MapTab',
      params: { selectedLocation: result, fromSearch: true, ts: Date.now() },
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const renderContent = () => {
    if (isSearching) {
      return (
        <XStack padding="$4" justifyContent="center">
          <Text color={DARK_THEME.text}>{t('search.searching')}</Text>
        </XStack>
      );
    }

    if (searchResults.length > 0) {
      return searchResults.map((result) => (
        <TouchableOpacity
          key={result.id}
          style={styles.searchResultItem}
          onPress={() => handleResultSelect(result)}
        >
          <XStack flex={1} alignItems="center">
            <Feather
              name={
                result.place_type[0] === 'country'
                  ? 'flag'
                  : result.place_type[0] === 'region'
                    ? 'map'
                    : result.place_type[0] === 'place'
                      ? 'map-pin'
                      : 'navigation'
              }
              size={16}
              color={DARK_THEME.iconColor}
            />
            <YStack flex={1} marginLeft="$2">
              <Text numberOfLines={1} fontWeight="600" color={DARK_THEME.text}>
                {result.place_name.split(',')[0]}
              </Text>
              <Text numberOfLines={1} fontSize="$1" color={DARK_THEME.secondaryText}>
                {result.place_name.split(',').slice(1).join(',').trim()}
              </Text>
            </YStack>
          </XStack>
        </TouchableOpacity>
      ));
    }

    if (searchQuery.length > 0) {
      return (
        <XStack padding="$4" justifyContent="center">
          <Text color={DARK_THEME.text}>{t('search.noResults')}</Text>
        </XStack>
      );
    }

    // Default content when no search is active
    return (
      <>
        {/* Near Me Button */}
        <TouchableOpacity style={styles.nearMeButton} onPress={handleNearMe}>
          <Feather
            name="navigation"
            size={20}
            color={DARK_THEME.iconColor}
            style={{ marginRight: 12 }}
          />
          <Text style={styles.cityName}>{t('search.nearMe') || 'Near Me'}</Text>
        </TouchableOpacity>

        {/* Popular Cities Section */}
        <Text style={styles.sectionTitle}>{t('search.popularCities') || 'Popular Cities'}</Text>

        {POPULAR_CITIES.map((city, index) => (
          <TouchableOpacity
            key={index}
            style={styles.cityItem}
            onPress={() => handleCitySelect(city.name, city.country)}
          >
            <Feather
              name="map-pin"
              size={16}
              color={DARK_THEME.iconColor}
              style={{ marginRight: 12 }}
            />
            <YStack>
              <Text style={styles.cityName}>{city.name}</Text>
              <Text style={styles.cityCountry}>{city.country}</Text>
            </YStack>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  // Force dark theme
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
        <XStack width="100%" paddingHorizontal="$4" justifyContent="space-between">
          <View style={{ width: 60 }} />
          <Text style={styles.headerTitle}>{t('search.title') || 'Search'}</Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={24} color={DARK_THEME.iconColor} />
          </TouchableOpacity>
        </XStack>
      </View>
      <View
        style={[
          styles.searchHeader,
          { borderBottomColor: DARK_THEME.borderColor, borderBottomWidth: 1 },
        ]}
      >
        <XStack alignItems="center" gap="$2">
          <Input
            ref={searchInputRef}
            flex={1}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={t('search.placeholder')}
            style={styles.searchInput}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color={DARK_THEME.iconColor} />
            </TouchableOpacity>
          )}
        </XStack>
      </View>
      <ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
