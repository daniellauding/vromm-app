import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1500,
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
    marginLeft: -8
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1400,
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
  },
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
  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const borderColor = colorScheme === 'dark' ? '#333333' : '#DDDDDD';
  const handleColor = colorScheme === 'dark' ? '#666666' : '#CCCCCC';
  
  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

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
  }, [translateY, backdropOpacity]);

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
    // Animate out first
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight,
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Pass back the selected location and navigate back
      navigation.navigate('Map', { selectedLocation: result });
    });
  };

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight,
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      navigation.goBack();
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropOpacity }
        ]} 
      />
      <Animated.View
        style={[
          styles.contentContainer,
          {
            backgroundColor,
            transform: [{ translateY }],
            zIndex: 1501,
          },
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
            <XStack width="100%" paddingHorizontal="$4" justifyContent="space-between">
              <View style={{ width: 60 }} />
              <Text fontWeight="600" fontSize="$5" color={iconColor}>
                {t('search.title') || 'Search'}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Feather name="x" size={24} color={iconColor} />
              </TouchableOpacity>
            </XStack>
          </View>
          <View style={[styles.searchHeader, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
            <XStack alignItems="center" gap="$2">
              <Input
                ref={searchInputRef}
                flex={1}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder={t('search.placeholder')}
                backgroundColor="$background"
                borderWidth={1}
                borderColor={borderColor}
                borderRadius="$2"
                height="$10"
                paddingLeft="$3"
                fontSize={16}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={20} color={iconColor} />
                </TouchableOpacity>
              )}
            </XStack>
          </View>
          <ScrollView style={[styles.searchResultsList, { backgroundColor }]}>
            {isSearching ? (
              <XStack padding="$4" justifyContent="center">
                <Text>{t('search.searching')}</Text>
              </XStack>
            ) : searchResults.length > 0 ? (
              searchResults.map(result => (
                <TouchableOpacity
                  key={result.id}
                  style={[styles.searchResultItem, { borderBottomColor: borderColor }]}
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
                </TouchableOpacity>
              ))
            ) : searchQuery.length > 0 ? (
              <XStack padding="$4" justifyContent="center">
                <Text>{t('search.noResults')}</Text>
              </XStack>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
