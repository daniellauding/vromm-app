import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useModal } from '../../contexts/ModalContext';
import { MapPresetSheetModal } from '../../components/MapPresetSheet';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';

interface MapPreset {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'shared';
  creator_id: string;
  created_at: string;
  updated_at: string;
  route_count?: number;
  is_default?: boolean;
  shared_with?: string[];
}

interface CustomMapPresetsProps {
  onRoutePress?: (routeId: string) => void;
}

export const CustomMapPresets = ({ onRoutePress }: CustomMapPresetsProps = {}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId } = useStudentSwitch();
  const { showModal } = useModal();
  const navigation = useNavigation<NavigationProp>();

  const [presets, setPresets] = useState<MapPreset[]>([]);
  const [loading, setLoading] = useState(false);

  const effectiveUserId = getEffectiveUserId();

  // Load user's custom presets
  const loadPresets = useCallback(async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('map_presets')
        .select(`
          *,
          route_count:map_preset_routes(count)
        `)
        .eq('creator_id', effectiveUserId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5); // Show only first 5 presets

      if (error) throw error;

      const transformedPresets = data?.map(preset => ({
        ...preset,
        route_count: preset.route_count?.[0]?.count || 0,
      })) || [];

      setPresets(transformedPresets);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Handle preset press - navigate to map with preset selected
  const handlePresetPress = useCallback((preset: MapPreset) => {
    navigation.navigate('MainTabs', {
      screen: 'MapTab',
      params: {
        screen: 'MapScreen',
        params: {
          selectedPresetId: preset.id,
          presetName: preset.name,
        },
      },
    });
  }, [navigation]);

  // Handle create new preset
  const handleCreatePreset = useCallback(() => {
    showModal(
      <MapPresetSheetModal
        onCreatePreset={(preset) => {
          setPresets(prev => [preset, ...prev]);
          Alert.alert(
            'Preset Created',
            `"${preset.name}" has been created successfully`,
            [{ text: 'OK' }]
          );
        }}
        showCreateOption={true}
        showEditOption={true}
        showDeleteOption={true}
        title={t('mapPresets.createNew') || 'Create New Preset'}
      />
    );
  }, [showModal, t]);

  // Handle manage presets
  const handleManagePresets = useCallback(() => {
    showModal(
      <MapPresetSheetModal
        onEditPreset={(preset) => {
          setPresets(prev => prev.map(p => p.id === preset.id ? preset : p));
        }}
        onDeletePreset={(presetId) => {
          setPresets(prev => prev.filter(p => p.id !== presetId));
        }}
        showCreateOption={true}
        showEditOption={true}
        showDeleteOption={true}
        title={t('mapPresets.manage') || 'Manage Presets'}
      />
    );
  }, [showModal, t]);

  if (loading) {
    return (
      <Card backgroundColor="$backgroundStrong" bordered padding="$4">
        <XStack alignItems="center" justifyContent="center" padding="$4">
          <Text color="$gray10">{t('common.loading') || 'Loading...'}</Text>
        </XStack>
      </Card>
    );
  }

  if (presets.length === 0) {
    return (
      <Card backgroundColor="$backgroundStrong" bordered padding="$4">
        <YStack gap="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontWeight="600" fontSize="$5" color="$color">
              {t('mapPresets.myPresets') || 'My Map Presets'}
            </Text>
            <TouchableOpacity onPress={handleCreatePreset}>
              <Feather name="plus" size={20} color="#00E6C3" />
            </TouchableOpacity>
          </XStack>
          
          <YStack alignItems="center" gap="$3" padding="$4">
            <Feather name="map" size={48} color="$gray10" />
            <Text textAlign="center" color="$gray10" fontSize="$3">
              {t('mapPresets.noPresets') || 'No custom map presets yet'}
            </Text>
            <Text textAlign="center" color="$gray10" fontSize="$2">
              {t('mapPresets.createFirst') || 'Create your first preset to organize routes'}
            </Text>
            <Button
              backgroundColor="#00E6C3"
              color="#000000"
              onPress={handleCreatePreset}
              size="$4"
            >
              <Text color="#000000" fontWeight="600">
                {t('mapPresets.createFirst') || 'Create First Preset'}
              </Text>
            </Button>
          </YStack>
        </YStack>
      </Card>
    );
  }

  return (
    <Card backgroundColor="$backgroundStrong" bordered padding="$4">
      <YStack gap="$3">
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontWeight="600" fontSize="$5" color="$color">
            {t('mapPresets.myPresets') || 'My Map Presets'}
          </Text>
          <XStack gap="$2">
            <TouchableOpacity onPress={handleCreatePreset}>
              <Feather name="plus" size={20} color="#00E6C3" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleManagePresets}>
              <Feather name="settings" size={20} color="$gray10" />
            </TouchableOpacity>
          </XStack>
        </XStack>

        <YStack gap="$2">
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              onPress={() => handlePresetPress(preset)}
              style={styles.presetItem}
            >
              <XStack alignItems="center" justifyContent="space-between" flex={1}>
                <XStack alignItems="center" gap="$3" flex={1}>
                  <View style={styles.presetIcon}>
                    <Feather
                      name={
                        preset.visibility === 'public' ? 'globe' :
                        preset.visibility === 'shared' ? 'users' : 'lock'
                      }
                      size={16}
                      color="#00E6C3"
                    />
                  </View>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text fontWeight="600" color="$color" numberOfLines={1}>
                        {preset.name}
                      </Text>
                      {preset.is_default && (
                        <View style={styles.defaultBadge}>
                          <Text fontSize="$1" fontWeight="600" color="#000000">
                            {t('mapPresets.default') || 'Default'}
                          </Text>
                        </View>
                      )}
                    </XStack>
                    {preset.description && (
                      <Text fontSize="$2" color="$gray10" numberOfLines={1}>
                        {preset.description}
                      </Text>
                    )}
                    <Text fontSize="$1" color="$gray10">
                      {preset.route_count || 0} {t('mapPresets.routes') || 'routes'}
                    </Text>
                  </YStack>
                </XStack>
                <Feather name="chevron-right" size={16} color="$gray10" />
              </XStack>
            </TouchableOpacity>
          ))}
        </YStack>

        {presets.length >= 5 && (
          <Button
            backgroundColor="transparent"
            borderColor="$borderColor"
            borderWidth={1}
            color="$color"
            onPress={handleManagePresets}
            size="$3"
          >
            <Text color="$color">
              {t('mapPresets.viewAll') || 'View All Presets'}
            </Text>
          </Button>
        )}
      </YStack>
    </Card>
  );
};

const styles = StyleSheet.create({
  presetItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 230, 195, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 195, 0.2)',
  },
  presetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 230, 195, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBadge: {
    backgroundColor: '#00E6C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
