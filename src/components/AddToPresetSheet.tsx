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
  Modal,
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

// Map Preset types (same as MapPresetSheet)
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

interface AddToPresetSheetProps {
  isVisible: boolean;
  onClose: () => void;
  routeId: string;
  onRouteAdded?: (presetId: string, presetName: string) => void;
  onRouteRemoved?: (presetId: string, presetName: string) => void;
  onPresetCreated?: (preset: MapPreset) => void;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 99999,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.7,
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
    zIndex: 99998,
  },
});

export function AddToPresetSheet({
  isVisible,
  onClose,
  routeId,
  onRouteAdded,
  onRouteRemoved,
  onPresetCreated,
}: AddToPresetSheetProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId } = useStudentSwitch();

  // Force dark theme
  const backgroundColor = '#1A1A1A';
  const textColor = 'white';
  const borderColor = '#333';
  const handleColor = '#666';

  const [presets, setPresets] = useState<MapPreset[]>([]);
  const [routePresets, setRoutePresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'public' | 'private' | 'shared',
  });

  const effectiveUserId = getEffectiveUserId();

  // Load presets and check which ones contain this route
  const loadPresets = useCallback(async () => {
    if (!effectiveUserId || !routeId) return;

    setLoading(true);
    try {
      // Load user's own presets and public presets
      const { data: presetsData, error: presetsError } = await supabase
        .from('map_presets')
        .select(`
          *,
          route_count:map_preset_routes(count)
        `)
        .or(`creator_id.eq.${effectiveUserId},visibility.eq.public`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (presetsError) throw presetsError;

      // Load which presets contain this route
      const { data: routePresetsData, error: routePresetsError } = await supabase
        .from('map_preset_routes')
        .select('preset_id')
        .eq('route_id', routeId);

      if (routePresetsError) throw routePresetsError;

      const transformedPresets = presetsData?.map(preset => ({
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

      const routePresetIds = routePresetsData?.map(item => item.preset_id) || [];

      setPresets([defaultPreset, ...transformedPresets]);
      setRoutePresets(routePresetIds);
    } catch (error) {
      console.error('Error loading presets:', error);
      Alert.alert('Error', 'Failed to load map presets');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, routeId]);

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
    setShowCreateForm(false);
  };

  // Handle adding/removing route from preset
  const handleTogglePreset = async (preset: MapPreset) => {
    if (!effectiveUserId) return;

    const isInPreset = routePresets.includes(preset.id);

    try {
      if (isInPreset) {
        // Remove route from preset
        const { error } = await supabase
          .from('map_preset_routes')
          .delete()
          .eq('preset_id', preset.id)
          .eq('route_id', routeId);

        if (error) throw error;

        setRoutePresets(prev => prev.filter(id => id !== preset.id));
        onRouteRemoved?.(preset.id, preset.name);
      } else {
        // Add route to preset
        const { error } = await supabase
          .from('map_preset_routes')
          .insert({
            preset_id: preset.id,
            route_id: routeId,
            added_by: effectiveUserId,
            added_at: new Date().toISOString(),
          });

        if (error) throw error;

        setRoutePresets(prev => [...prev, preset.id]);
        onRouteAdded?.(preset.id, preset.name);
      }
    } catch (error) {
      console.error('Error toggling preset:', error);
      Alert.alert('Error', 'Failed to update preset');
    }
  };

  // Handle create new preset
  const handleCreatePreset = async () => {
    if (!formData.name.trim() || !effectiveUserId) return;

    try {
      const { data: newPreset, error: createError } = await supabase
        .from('map_presets')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          visibility: formData.visibility,
          creator_id: effectiveUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add route to the new preset
      const { error: addError } = await supabase
        .from('map_preset_routes')
        .insert({
          preset_id: newPreset.id,
          route_id: routeId,
          added_by: effectiveUserId,
          added_at: new Date().toISOString(),
        });

      if (addError) throw addError;

      setPresets(prev => [{ ...newPreset, route_count: 1 }, ...prev]);
      setRoutePresets(prev => [...prev, newPreset.id]);
      onPresetCreated?.(newPreset);
      onRouteAdded?.(newPreset.id, newPreset.name);
      resetForm();
    } catch (error) {
      console.error('Error creating preset:', error);
      Alert.alert('Error', 'Failed to create map preset');
    }
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

  console.log('🎯 AddToPresetSheet rendering with zIndex:', 99999);
  console.log('🎯 AddToPresetSheet isVisible:', isVisible);
  console.log('🎯 AddToPresetSheet container style:', styles.container);
  console.log('🎯 AddToPresetSheet sheet style:', styles.sheet);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['portrait', 'landscape']}
      onShow={() => console.log('🎯 AddToPresetSheet Modal onShow')}
      onDismiss={() => console.log('🎯 AddToPresetSheet Modal onDismiss')}
    >
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
              zIndex: 100000,
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
              {t('mapPresets.addToPreset') || 'Add to Preset'}
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
                {presets.map((preset) => {
                  const isInPreset = routePresets.includes(preset.id);
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetItem,
                        {
                          borderBottomColor: borderColor,
                          backgroundColor: isInPreset ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                        },
                      ]}
                      onPress={() => handleTogglePreset(preset)}
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
                      <View>
                        <Feather
                          name={isInPreset ? 'check-circle' : 'circle'}
                          size={24}
                          color={isInPreset ? '#00E6C3' : textColor}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
                
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
                onPress={handleCreatePreset}
                disabled={!formData.name.trim()}
              >
                <Text color="#000000" fontWeight="700">
                  {t('common.create')}
                </Text>
              </Button>
            </XStack>
          ) : (
            <XStack gap="$3">
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
    </Modal>
  );
}

export function AddToPresetSheetModal({
  routeId,
  onRouteAdded,
  onRouteRemoved,
  onPresetCreated,
  onClose,
}: Omit<AddToPresetSheetProps, 'isVisible'> & { onClose?: () => void }) {
  const { hideModal } = useModal();

  const handleClose = React.useCallback(() => {
    hideModal();
    onClose?.();
  }, [hideModal, onClose]);

  return (
    <AddToPresetSheet
      isVisible={true}
      onClose={handleClose}
      routeId={routeId}
      onRouteAdded={onRouteAdded}
      onRouteRemoved={onRouteRemoved}
      onPresetCreated={onPresetCreated}
    />
  );
}
