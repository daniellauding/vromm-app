import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Text, XStack, YStack, Button, SizableText, Input } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { supabase } from '../lib/supabase';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const BOTTOM_INSET = Platform.OS === 'ios' ? 34 : 16;

// Map Preset types
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
  shared_with?: string[]; // Array of user IDs for shared presets
}

interface MapPresetSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: MapPreset) => void;
  onCreatePreset?: (preset: MapPreset) => void;
  onEditPreset?: (preset: MapPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  selectedPresetId?: string | null;
  showCreateOption?: boolean;
  showEditOption?: boolean;
  showDeleteOption?: boolean;
  title?: string;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1500,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.8,
    paddingBottom: 20 + BOTTOM_INSET,
  },
  header: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  presetItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetInfo: {
    flex: 1,
  },
  presetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createForm: {
    padding: 20,
  },
  formField: {
    marginBottom: 16,
  },
  visibilitySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  visibilityOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    paddingBottom: 16 + BOTTOM_INSET,
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
});

export function MapPresetSheet({
  isVisible,
  onClose,
  onSelectPreset,
  onCreatePreset,
  onEditPreset,
  onDeletePreset,
  selectedPresetId,
  showCreateOption = true,
  showEditOption = true,
  showDeleteOption = true,
  title = 'Map Presets',
}: MapPresetSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId } = useStudentSwitch();

  // Force dark theme
  const backgroundColor = '#1A1A1A';
  const textColor = 'white';
  const borderColor = '#333';
  const handleColor = '#666';

  const [presets, setPresets] = useState<MapPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<MapPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'public' | 'private' | 'shared',
  });

  const effectiveUserId = getEffectiveUserId();

  // Load presets
  const loadPresets = useCallback(async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    try {
      // Load user's own presets and public presets
      const { data, error } = await supabase
        .from('map_presets')
        .select(`
          *,
          route_count:map_preset_routes(count)
        `)
        .or(`creator_id.eq.${effectiveUserId},visibility.eq.public`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedPresets = data?.map(preset => ({
        ...preset,
        route_count: preset.route_count?.[0]?.count || 0,
      })) || [];

      // Always include a default "All Routes" preset at the top
      const defaultPreset: MapPreset = {
        id: 'all-routes',
        name: t('mapPresets.allRoutes') || 'All Routes',
        description: t('mapPresets.allRoutesDescription') || 'View all available routes',
        visibility: 'public',
        creator_id: effectiveUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        route_count: 0,
        is_default: true,
      };
      setPresets([defaultPreset, ...transformedPresets]);
    } catch (error) {
      console.error('Error loading presets:', error);
      Alert.alert('Error', 'Failed to load map presets');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, t]);

  // Load presets when sheet opens
  useEffect(() => {
    if (isVisible) {
      loadPresets();
    }
  }, [isVisible, loadPresets]);

  // Reset form when creating new preset
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      visibility: 'private',
    });
    setEditingPreset(null);
    setShowCreateForm(false);
  };

  // Handle create/edit preset
  const handleSavePreset = async () => {
    if (!formData.name.trim() || !effectiveUserId) return;

    try {
      const presetData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        visibility: formData.visibility,
        creator_id: effectiveUserId,
        updated_at: new Date().toISOString(),
      };

      if (editingPreset) {
        // Update existing preset
        const { data, error } = await supabase
          .from('map_presets')
          .update(presetData)
          .eq('id', editingPreset.id)
          .select()
          .single();

        if (error) throw error;

        onEditPreset?.(data);
        setPresets(prev => prev.map(p => p.id === data.id ? data : p));
      } else {
        // Create new preset
        const { data, error } = await supabase
          .from('map_presets')
          .insert({
            ...presetData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        onCreatePreset?.(data);
        setPresets(prev => [data, ...prev]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving preset:', error);
      Alert.alert('Error', 'Failed to save map preset');
    }
  };

  // Handle delete preset
  const handleDeletePreset = async (preset: MapPreset) => {
    if (preset.is_default) {
      Alert.alert('Cannot Delete', 'Default presets cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Preset',
      `Are you sure you want to delete "${preset.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('map_presets')
                .delete()
                .eq('id', preset.id);

              if (error) throw error;

              onDeletePreset?.(preset.id);
              setPresets(prev => prev.filter(p => p.id !== preset.id));
            } catch (error) {
              console.error('Error deleting preset:', error);
              Alert.alert('Error', 'Failed to delete map preset');
            }
          },
        },
      ]
    );
  };

  // Handle preset selection
  const handleSelectPreset = (preset: MapPreset) => {
    // For the default "All Routes" preset, pass null to clear preset filtering
    if (preset.id === 'all-routes') {
      onSelectPreset?.(null as any);
    } else {
      onSelectPreset?.(preset);
    }
    onClose();
  };

  // Start editing preset
  const handleEditPreset = (preset: MapPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      visibility: preset.visibility,
    });
    setShowCreateForm(true);
  };

  // Animation values
  const translateY = React.useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
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
        }),
      ]).start();
    } else {
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
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        onTouchEnd={onClose}
      />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor,
            borderColor,
            transform: [{ translateY }],
            zIndex: 1501,
            width: screenWidth,
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleColor }]} />
          <XStack width="100%" paddingHorizontal="$4" justifyContent="space-between">
            <TouchableOpacity onPress={resetForm}>
              <Text color="$blue10">{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text fontWeight="600" fontSize="$5" color={textColor}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={textColor} />
            </TouchableOpacity>
          </XStack>
        </View>

        {showCreateForm ? (
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.createForm}>
              <YStack gap="$3">
                <YStack style={styles.formField}>
                  <SizableText fontWeight="600" marginBottom="$2" color={textColor}>
                    {t('mapPresets.name') || 'Preset Name'}
                  </SizableText>
                  <Input
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    placeholder={t('mapPresets.namePlaceholder') || 'Enter preset name...'}
                    backgroundColor="$backgroundHover"
                    borderColor={borderColor}
                    color={textColor}
                    placeholderTextColor="$gray10"
                  />
                </YStack>

                <YStack style={styles.formField}>
                  <SizableText fontWeight="600" marginBottom="$2" color={textColor}>
                    {t('mapPresets.description') || 'Description (Optional)'}
                  </SizableText>
                  <Input
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder={t('mapPresets.descriptionPlaceholder') || 'Enter description...'}
                    backgroundColor="$backgroundHover"
                    borderColor={borderColor}
                    color={textColor}
                    placeholderTextColor="$gray10"
                    multiline
                    numberOfLines={3}
                  />
                </YStack>

                <YStack style={styles.formField}>
                  <SizableText fontWeight="600" marginBottom="$2" color={textColor}>
                    {t('mapPresets.visibility') || 'Visibility'}
                  </SizableText>
                  <View style={styles.visibilitySelector}>
                    {[
                      { value: 'private', label: t('mapPresets.private') || 'Private', icon: 'lock' },
                      { value: 'public', label: t('mapPresets.public') || 'Public', icon: 'globe' },
                      { value: 'shared', label: t('mapPresets.shared') || 'Shared', icon: 'users' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.visibilityOption,
                          {
                            borderColor,
                            backgroundColor: formData.visibility === option.value ? '#00E6C3' : 'transparent',
                          },
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, visibility: option.value as any }))}
                      >
                        <XStack alignItems="center" gap="$1">
                          <Feather
                            name={option.icon as any}
                            size={14}
                            color={formData.visibility === option.value ? '#000000' : textColor}
                          />
                          <Text
                            color={formData.visibility === option.value ? '#000000' : textColor}
                            fontWeight={formData.visibility === option.value ? '600' : '500'}
                            fontSize="$2"
                          >
                            {option.label}
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    ))}
                  </View>
                </YStack>
              </YStack>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {loading ? (
              <XStack padding="$4" justifyContent="center">
                <Text color={textColor}>{t('common.loading') || 'Loading...'}</Text>
              </XStack>
            ) : (
              <>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetItem,
                      {
                        borderBottomColor: borderColor,
                        backgroundColor: selectedPresetId === preset.id ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <View style={styles.presetInfo}>
                      <XStack alignItems="center" gap="$2" marginBottom="$1">
                        <Text fontWeight="600" color={textColor}>
                          {preset.name}
                        </Text>
                        {preset.is_default && (
                          <View
                            style={{
                              backgroundColor: '#00E6C3',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text fontSize="$1" fontWeight="600" color="#000000">
                              {t('mapPresets.default') || 'Default'}
                            </Text>
                          </View>
                        )}
                        <Feather
                          name={
                            preset.visibility === 'public' ? 'globe' :
                            preset.visibility === 'shared' ? 'users' : 'lock'
                          }
                          size={14}
                          color={textColor}
                        />
                      </XStack>
                      {preset.description && (
                        <Text fontSize="$2" color="$gray10" numberOfLines={2}>
                          {preset.description}
                        </Text>
                      )}
                      <Text fontSize="$1" color="$gray10" marginTop="$1">
                        {preset.route_count || 0} {t('mapPresets.routes') || 'routes'}
                      </Text>
                    </View>
                    <View style={styles.presetActions}>
                      {showEditOption && !preset.is_default && (
                        <TouchableOpacity onPress={() => handleEditPreset(preset)}>
                          <Feather name="edit-2" size={18} color={textColor} />
                        </TouchableOpacity>
                      )}
                      {showDeleteOption && !preset.is_default && (
                        <TouchableOpacity onPress={() => handleDeletePreset(preset)}>
                          <Feather name="trash-2" size={18} color="#ff4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                
                {/* Show helpful message when only default preset exists */}
                {presets.length === 1 && (
                  <View style={[styles.presetItem, { borderBottomColor: borderColor }]}>
                    <View style={styles.presetInfo}>
                      <XStack alignItems="center" gap="$2" marginBottom="$1">
                        <Feather name="info" size={16} color="#00E6C3" />
                        <Text fontWeight="500" color={textColor}>
                          {t('mapPresets.createFirstPreset') || 'Create your first custom preset'}
                        </Text>
                      </XStack>
                      <Text fontSize="$2" color="$gray10">
                        {t('mapPresets.createFirstPresetDescription') || 'Organize your routes by creating custom map presets like "Summer Routes" or "City Driving".'}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        <View
          style={[
            styles.footer,
            {
              borderColor,
              backgroundColor,
            },
          ]}
        >
          {showCreateForm ? (
            <XStack gap="$3">
              <Button
                flex={1}
                backgroundColor="transparent"
                borderColor={borderColor}
                borderWidth={1}
                color={textColor}
                onPress={resetForm}
              >
                <Text color={textColor}>{t('common.cancel')}</Text>
              </Button>
              <Button
                flex={1}
                backgroundColor="#00E6C3"
                color="#000000"
                onPress={handleSavePreset}
                disabled={!formData.name.trim()}
              >
                <Text color="#000000" fontWeight="700">
                  {editingPreset ? t('common.save') : t('common.create')}
                </Text>
              </Button>
            </XStack>
          ) : (
            <XStack gap="$3">
              {showCreateOption && (
                <Button
                  flex={1}
                  backgroundColor="transparent"
                  borderColor={borderColor}
                  borderWidth={1}
                  color={textColor}
                  onPress={() => setShowCreateForm(true)}
                >
                  <Text color={textColor}>{t('mapPresets.createNew') || 'Create New'}</Text>
                </Button>
              )}
              <Button
                flex={1}
                backgroundColor="#00E6C3"
                color="#000000"
                onPress={onClose}
              >
                <Text color="#000000" fontWeight="700">
                  {t('common.done')}
                </Text>
              </Button>
            </XStack>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export function MapPresetSheetModal({
  onSelectPreset,
  onCreatePreset,
  onEditPreset,
  onDeletePreset,
  selectedPresetId,
  showCreateOption = true,
  showEditOption = true,
  showDeleteOption = true,
  title = 'Map Presets',
}: Omit<MapPresetSheetProps, 'isVisible' | 'onClose'>) {
  const { hideModal } = useModal();

  const handleClose = React.useCallback(() => {
    hideModal();
  }, [hideModal]);

  return (
    <MapPresetSheet
      isVisible={true}
      onClose={handleClose}
      onSelectPreset={onSelectPreset}
      onCreatePreset={onCreatePreset}
      onEditPreset={onEditPreset}
      onDeletePreset={onDeletePreset}
      selectedPresetId={selectedPresetId}
      showCreateOption={showCreateOption}
      showEditOption={showEditOption}
      showDeleteOption={showDeleteOption}
      title={title}
    />
  );
}
