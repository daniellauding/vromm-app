import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { YStack, XStack, Card, Input, Button } from 'tamagui';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRoutes } from '../hooks/useRoutes';
import { RouteCard } from './RouteCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: screenHeight } = Dimensions.get('window');

interface RouteSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedRoutes: any[];
  onRoutesChange: (routes: any[]) => void;
}

export function RouteSelector({
  visible,
  onClose,
  selectedRoutes,
  onRoutesChange,
}: RouteSelectorProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';
  const { fetchRoutes, loading } = useRoutes();

  // State
  const [routes, setRoutes] = useState<any[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());

  // Load routes on mount
  useEffect(() => {
    if (visible) {
      loadRoutes();
      // Initialize selected route IDs
      setSelectedRouteIds(new Set(selectedRoutes.map(r => r.id)));
    }
  }, [visible]);

  // Filter routes based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRoutes(routes);
    } else {
      const filtered = routes.filter(route =>
        route.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.creator?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRoutes(filtered);
    }
  }, [routes, searchQuery]);

  const loadRoutes = async () => {
    try {
      const routesData = await fetchRoutes();
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
      Alert.alert('Error', 'Failed to load routes');
    }
  };

  const toggleRouteSelection = (route: any) => {
    const newSelectedIds = new Set(selectedRouteIds);
    const currentlySelected = selectedRoutes.filter(r => selectedRouteIds.has(r.id));

    if (newSelectedIds.has(route.id)) {
      // Remove from selection
      newSelectedIds.delete(route.id);
      const newSelectedRoutes = currentlySelected.filter(r => r.id !== route.id);
      onRoutesChange(newSelectedRoutes);
    } else {
      // Add to selection
      newSelectedIds.add(route.id);
      const newSelectedRoutes = [...currentlySelected, route];
      onRoutesChange(newSelectedRoutes);
    }

    setSelectedRouteIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    const allRouteIds = new Set(filteredRoutes.map(r => r.id));
    setSelectedRouteIds(allRouteIds);
    onRoutesChange(filteredRoutes);
  };

  const handleClearAll = () => {
    setSelectedRouteIds(new Set());
    onRoutesChange([]);
  };

  const renderRouteItem = ({ item: route }: { item: any }) => {
    const isSelected = selectedRouteIds.has(route.id);

    return (
      <TouchableOpacity
        onPress={() => toggleRouteSelection(route)}
        style={{
          marginBottom: 16,
          opacity: isSelected ? 1 : 0.7,
          transform: [{ scale: isSelected ? 1 : 0.95 }],
        }}
      >
        <View style={{ position: 'relative' }}>
          <RouteCard route={route} />
          
          {/* Selection Overlay */}
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: isSelected ? '#10B981' : 'rgba(0,0,0,0.5)',
              borderRadius: 16,
              padding: 8,
              zIndex: 1,
            }}
          >
            <Feather 
              name={isSelected ? 'check' : 'plus'} 
              size={16} 
              color="white" 
            />
          </View>

          {/* Selection Border */}
          {isSelected && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderWidth: 3,
                borderColor: '#10B981',
                borderRadius: 12,
                pointerEvents: 'none',
              }}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#FFFFFF' }}>
        {/* Header */}
        <XStack
          padding={16}
          borderBottomWidth={1}
          borderBottomColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
          justifyContent="space-between"
          alignItems="center"
        >
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={iconColor} />
          </TouchableOpacity>

          <YStack alignItems="center">
            <Text fontSize={18} fontWeight="600" color="$color">
              Select Routes
            </Text>
            <Text fontSize={14} color="$gray11">
              {selectedRouteIds.size} selected
            </Text>
          </YStack>

          <Button
            onPress={onClose}
            backgroundColor="$green10"
            borderRadius={8}
            paddingHorizontal={16}
            height={36}
          >
            <Text color="white" fontSize={14} fontWeight="600">
              Done
            </Text>
          </Button>
        </XStack>

        <YStack flex={1} padding={16} gap={16}>
          {/* Search Bar */}
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search routes by name, description, or creator..."
            backgroundColor={colorScheme === 'dark' ? '#1F2937' : '#F9FAFB'}
            borderColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}
            color="$color"
            placeholderTextColor="$gray9"
          />

          {/* Selection Controls */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={14} color="$gray11">
              {filteredRoutes.length} route{filteredRoutes.length === 1 ? '' : 's'} available
            </Text>
            
            <XStack gap={12}>
              <TouchableOpacity onPress={handleSelectAll}>
                <Text fontSize={14} color="$blue10" fontWeight="600">
                  Select All
                </Text>
              </TouchableOpacity>
              <Text fontSize={14} color="$gray9">•</Text>
              <TouchableOpacity onPress={handleClearAll}>
                <Text fontSize={14} color="$red10" fontWeight="600">
                  Clear
                </Text>
              </TouchableOpacity>
            </XStack>
          </XStack>

          {/* Routes List */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#00FFBC" />
              <Text fontSize={16} color="$gray11" marginTop={16}>
                Loading routes...
              </Text>
            </View>
          ) : filteredRoutes.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Feather name="map" size={48} color="$gray9" />
              <Text fontSize={18} fontWeight="600" color="$gray11" marginTop={16}>
                No routes found
              </Text>
              <Text fontSize={14} color="$gray9" marginTop={8} textAlign="center">
                {searchQuery ? 'Try adjusting your search' : 'No routes available to select'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRoutes}
              renderItem={renderRouteItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </YStack>
      </SafeAreaView>
    </Modal>
  );
} 