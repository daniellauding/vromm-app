import React, { useCallback, useState, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XStack, YStack, Input, Text, View } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, ScrollView } from 'react-native';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '$background'
  },
  searchHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '$background',
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor'
  },
  searchResultsList: {
    flex: 1,
    backgroundColor: '$background'
  },
  searchBackButton: {
    padding: 8,
    marginLeft: -8
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '$borderColor'
  }
});

export function SearchScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

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
              text
            )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,locality,address,country,region&language=en`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Search response:', {
            status: response.status,
            resultCount: data.features?.length || 0
          });

          setSearchResults(data.features || []);
        } catch (error: any) {
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

  const handleResultSelect = (result: SearchResult) => {
    // Pass back the selected location and navigate back
    navigation.navigate('Map', { selectedLocation: result });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchHeader}>
        <XStack alignItems="center" gap="$2">
          <TouchableOpacity style={styles.searchBackButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={iconColor} />
          </TouchableOpacity>
          <Input
            ref={searchInputRef}
            flex={1}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={t('search.placeholder')}
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$2"
            height="$10"
            paddingLeft="$3"
            fontSize="$2"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </XStack>
      </View>
      <ScrollView style={styles.searchResultsList}>
        {isSearching ? (
          <XStack padding="$4" justifyContent="center">
            <Text>{t('search.searching')}</Text>
          </XStack>
        ) : searchResults.length > 0 ? (
          searchResults.map(result => (
            <XStack
              key={result.id}
              style={styles.searchResultItem}
              pressStyle={{ opacity: 0.7 }}
              onPress={() => handleResultSelect(result)}
              alignItems="center"
              gap="$2"
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
                  color={iconColor}
                />
                <YStack flex={1} marginLeft="$2">
                  <Text numberOfLines={1} fontWeight="600">
                    {result.place_name.split(',')[0]}
                  </Text>
                  <Text numberOfLines={1} fontSize="$1" color="$gray11">
                    {result.place_name.split(',').slice(1).join(',').trim()}
                  </Text>
                </YStack>
              </XStack>
            </XStack>
          ))
        ) : searchQuery.length > 0 ? (
          <XStack padding="$4" justifyContent="center">
            <Text>{t('search.noResults')}</Text>
          </XStack>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
