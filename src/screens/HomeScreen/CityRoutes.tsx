import { SectionHeader } from '@/src/components/SectionHeader';
import React from 'react';
import { Card, XStack, YStack, ScrollView } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { Text } from '../../components/Text';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';
import { Route } from '@/src/types/route';
import { useRoutes } from '@/src/hooks/useRoutes';
import { EmptyState } from './EmptyState';
import { useTranslation } from '@/src/contexts/TranslationContext';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Easing,
  useColorScheme,
  Modal,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useUserLocation } from '../explore/hooks';
import { deg2rad } from '../explore/utils';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Helper function to extract city from address
const extractCityFromAddress = (address: string): string => {
  // If the address contains a comma, take the part before the last comma
  if (address.includes(',')) {
    const parts = address.split(',');
    // Try to get the city part (usually the second to last part)
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
  }
  // If no comma or can't extract city, return the original string
  return address;
};

// Update the getCityFromWaypoints function
const getCityFromWaypoints = (route: Route): string => {
  if (!route.waypoint_details || route.waypoint_details.length === 0) {
    return 'Unknown';
  }
  const waypoint = route.waypoint_details[0];
  return extractCityFromAddress(waypoint.title || 'Unknown');
};

const getRouteImage: (route: Route) => string | null = (route) => {
  if (!route.media_attachments || !Array.isArray(route.media_attachments)) {
    return null;
  }

  for (const attachment of route.media_attachments) {
    if (
      attachment &&
      typeof attachment === 'object' &&
      'type' in attachment &&
      attachment.type === 'image' &&
      'url' in attachment &&
      typeof attachment.url === 'string'
    ) {
      return attachment.url;
    }
  }

  return null;
};

interface CityRoutesProps {
  onRoutePress?: (routeId: string) => void;
}

export const CityRoutes = ({ onRoutePress }: CityRoutesProps = {}) => {
  const { t } = useTranslation();
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [cityRoutes, setCityRoutes] = React.useState<{ [key: string]: Route[] }>({});
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const navigation = useNavigation<NavigationProp>();
  const { fetchRoutes } = useRoutes();
  const [isCityMenuVisible, setIsCityMenuVisible] = React.useState(false);
  const colorScheme = useColorScheme();
  const cityBackdropOpacity = React.useRef(new Animated.Value(0)).current;
  const citySheetTranslateY = React.useRef(new Animated.Value(300)).current;

  const userLocation = useUserLocation();

  React.useEffect(() => {
    const fetchCityRoutes = async () => {
      const routes = await fetchRoutes();
      const cityMap: { [key: string]: Route[] } = {};
      routes.forEach((route) => {
        const city = getCityFromWaypoints(route);
        if (!cityMap[city]) {
          cityMap[city] = [];
        }
        cityMap[city].push(route);
      });
      setCityRoutes(cityMap);
    };
    fetchCityRoutes();
  }, [routes, fetchRoutes]);

  React.useEffect(() => {
    if (!selectedCity && cityRoutes && userLocation) {
      const cities = Object.keys(cityRoutes);
      let closestCity = null;
      let shortestDistance = Infinity;

      cities.forEach((city) => {
        const routes = cityRoutes[city];
        if (routes && routes.length > 0) {
          const route = routes[0];
          if (route.waypoint_details && route.waypoint_details.length > 0) {
            const waypoint = route.waypoint_details[0];
            const distance = calculateDistance(
              userLocation.coords.latitude,
              userLocation.coords.longitude,
              waypoint.lat,
              waypoint.lng,
            );
            if (distance < shortestDistance) {
              shortestDistance = distance;
              closestCity = city;
            }
          }
        }
      });

      if (closestCity) {
        setSelectedCity(closestCity);
      } else if (cities.length > 0) {
        setSelectedCity(cities[0]);
      }
    }
  }, [cityRoutes, userLocation, selectedCity]);

  React.useEffect(() => {
    if (selectedCity && cityRoutes) {
      setRoutes(cityRoutes[selectedCity] || []);
    } else {
      setRoutes([]);
    }
  }, [selectedCity, cityRoutes]);

  // Modal handlers
  const showCityModal = React.useCallback(() => {
    setIsCityMenuVisible(true);
    Animated.timing(cityBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(citySheetTranslateY, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [cityBackdropOpacity, citySheetTranslateY]);

  const hideCityModal = React.useCallback(() => {
    Animated.timing(cityBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(citySheetTranslateY, {
      toValue: 300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsCityMenuVisible(false);
    });
  }, [cityBackdropOpacity, citySheetTranslateY]);

  const handleCitySelect = React.useCallback(
    (city: string) => {
      setSelectedCity(city);
      hideCityModal();
    },
    [hideCityModal, setSelectedCity],
  );

  return (
    <YStack gap="$4">
      <SectionHeader
        title={
          selectedCity ||
          (() => {
            const translated = t('home.cityRoutes.selectCity');
            return translated === 'home.cityRoutes.selectCity' ? 'Select a city' : translated;
          })()
        }
        variant="dropdown"
        onAction={showCityModal}
        actionLabel={selectedCity || 'Select'}
      />
      <YStack gap="$3" px="$4">
        {routes.length > 0 ? (
          routes.slice(0, 3).map((route) => (
            <Card
              key={route.id}
              bordered
              elevate
              backgroundColor="$backgroundStrong"
              width="100%"
              height={280}
              onPress={() => {
                if (onRoutePress) {
                  onRoutePress(route.id);
                } else {
                  navigation.navigate('RouteDetail', { routeId: route.id });
                }
              }}
            >
              <YStack f={1}>
                {getRouteImage(route) ? (
                  <Image
                    source={{ uri: getRouteImage(route) } as ImageSourcePropType}
                    style={{
                      width: '100%',
                      height: 180,
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <YStack
                    height={180}
                    backgroundColor="$gray5"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Feather name="image" size={32} color="$gray11" />
                  </YStack>
                )}
                <YStack padding="$3" gap="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text size="lg" weight="bold" numberOfLines={1} ellipsizeMode="tail">
                        {route.name}
                      </Text>
                      <XStack space="$1" alignItems="center" marginTop="$1">
                        <Feather
                          name="user"
                          size={14}
                          color={colorScheme === 'dark' ? 'white' : 'black'}
                        />
                        <Text
                          color="$gray11"
                          size="xs"
                          onPress={() => {
                            if (route.creator?.id) {
                              navigation.navigate('PublicProfile', {
                                userId: route.creator.id,
                              });
                            }
                          }}
                          pressStyle={{ opacity: 0.7 }}
                        >
                          {route.creator?.full_name || 'Unknown'}
                        </Text>
                      </XStack>
                      <Text size="sm" color="$gray11">
                        {route.difficulty?.toUpperCase()}
                      </Text>
                    </YStack>
                    {userLocation && route.waypoint_details?.[0] && (
                      <Text size="sm" color="$gray11">
                        {calculateDistance(
                          userLocation.coords.latitude,
                          userLocation.coords.longitude,
                          route.waypoint_details[0].lat,
                          route.waypoint_details[0].lng,
                        ).toFixed(1)}{' '}
                        {t('common.kmAway') || 'km away'}
                      </Text>
                    )}
                  </XStack>
                  {route.description && (
                    <Text size="sm" color="$gray11" numberOfLines={2} ellipsizeMode="tail">
                      {route.description}
                    </Text>
                  )}
                </YStack>
              </YStack>
            </Card>
          ))
        ) : (
          <EmptyState
            title={(() => {
              const translated = t('home.cityRoutes.noRoutesInCity');
              return translated === 'home.cityRoutes.noRoutesInCity'
                ? 'No Routes in This City'
                : translated;
            })()}
            message={(() => {
              const translated = t('home.cityRoutes.noRoutesMessage');
              if (translated && translated !== 'home.cityRoutes.noRoutesMessage') {
                return translated.replace('{city}', selectedCity || '');
              }
              return `No practice routes found in ${selectedCity}. Be the first to create one or explore other cities!`;
            })()}
            icon="map-pin"
            variant="warning"
            actionLabel={(() => {
              const translated = t('home.cityRoutes.createRouteHere');
              return translated === 'home.cityRoutes.createRouteHere'
                ? 'Create Route Here'
                : translated;
            })()}
            actionIcon="plus"
            onAction={() => navigation.navigate('CreateRoute')}
            secondaryLabel={(() => {
              const translated = t('home.cityRoutes.changeCity');
              return translated === 'home.cityRoutes.changeCity' ? 'Change City' : translated;
            })()}
            secondaryIcon="map"
            onSecondaryAction={showCityModal}
          />
        )}
      </YStack>

      {/* City Selection Modal */}
      <Modal
        visible={isCityMenuVisible}
        transparent
        animationType="none"
        onRequestClose={hideCityModal}
      >
        <View style={{ flex: 1 }}>
          <Animated.View
            style={[
              {
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
              },
              {
                opacity: cityBackdropOpacity,
              },
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={hideCityModal} />
          </Animated.View>
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#000',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              },
              {
                transform: [{ translateY: citySheetTranslateY }],
              },
            ]}
          >
            <YStack
              backgroundColor="$background"
              padding="$4"
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
            >
              {/* Sheet Handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  alignSelf: 'center',
                  marginBottom: 12,
                }}
              />

              <Text size="xl" weight="bold" color="white" textAlign="center">
                {(() => {
                  const translated = t('home.cityRoutes.selectCity');
                  return translated === 'home.cityRoutes.selectCity' ? 'Select City' : translated;
                })()}
              </Text>

              <ScrollView style={{ maxHeight: '70%' }}>
                <YStack gap="$2">
                  {Object.keys(cityRoutes).map((city) => (
                    <TouchableOpacity key={city} onPress={() => handleCitySelect(city)}>
                      <XStack
                        backgroundColor={
                          selectedCity === city ? 'rgba(255, 255, 255, 0.1)' : undefined
                        }
                        padding="$2"
                        borderRadius="$2"
                        alignItems="center"
                        gap="$2"
                      >
                        <Text color="white" size="lg">
                          {city}
                        </Text>
                        {selectedCity === city && (
                          <Feather
                            name="check"
                            size={16}
                            color="white"
                            style={{ marginLeft: 'auto' }}
                          />
                        )}
                      </XStack>
                    </TouchableOpacity>
                  ))}
                </YStack>
              </ScrollView>
            </YStack>
          </Animated.View>
        </View>
      </Modal>
    </YStack>
  );
};
