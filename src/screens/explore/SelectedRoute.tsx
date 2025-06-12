import { RoutePreviewCard } from '@/src/components/RoutePreviewCard';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@/src/types/navigation';
import { Route } from '@/src/types/route';
import { useCallback } from 'react';

const DARK_THEME = {
  background: '#1A1A1A',
  bottomSheet: '#1F1F1F',
  text: 'white',
  secondaryText: '#AAAAAA',
  borderColor: '#333',
  handleColor: '#666',
  iconColor: 'white',
  cardBackground: '#2D3130',
};

const BOTTOM_NAV_HEIGHT = 80;
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: BOTTOM_NAV_HEIGHT,
    left: 0,
    right: 0,
    backgroundColor: DARK_THEME.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});

export function SelectedRoute({
  selectedRoute,
  setSelectedRoute,
  setSelectedPin,
}: {
  selectedRoute: Route;
  setSelectedRoute: (route: Route | null) => void;
  setSelectedPin: (pin: Pin | null) => void;
}) {
  const navigation = useNavigation<NavigationProp>();

  const onPress = useCallback(() => {
    navigation.navigate('RouteDetail', { routeId: selectedRoute.id });
    setSelectedRoute(null);
    setSelectedPin(null);
  }, [navigation, selectedRoute, setSelectedRoute, setSelectedPin]);

  if (!selectedRoute) return null;

  return (
    <View style={styles.container}>
      <RoutePreviewCard route={selectedRoute} showMap={false} onPress={onPress} />
    </View>
  );
}
