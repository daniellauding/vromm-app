import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Pressable,
  useColorScheme,
} from 'react-native';
import { Text, XStack, YStack, Button, SizableText, Input } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { RadioButton } from './SelectButton';

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

// Styles removed - now using Tamagui components and GettingStarted.tsx pattern

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
  const { showToast } = useToast();
  const colorScheme = useColorScheme();

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

  // Animation refs (matching GettingStarted.tsx pattern)
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

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

      const routePresetIds = routePresetsData?.map(item => item.preset_id) || [];

      setPresets(transformedPresets);
      setRoutePresets(routePresetIds);
    } catch (error) {
      console.error('Error loading presets:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToLoad') || 'Failed to load collections',
        type: 'error'
      });
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
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToUpdate') || 'Failed to update collection',
        type: 'error'
      });
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
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToCreate') || 'Failed to create collection',
        type: 'error'
      });
    }
  };

  // Show/hide functions (matching GettingStarted.tsx pattern)
  const showSheet = () => {
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideSheet = () => {
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sheetTranslateY, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Add a small delay to ensure the animation is completely finished
      setTimeout(() => {
        onClose();
      }, 50);
    });
  };

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      showSheet();
    } else {
      hideSheet();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={hideSheet}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={hideSheet} />
          <Animated.View
            style={{
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <YStack
              backgroundColor="$background"
              padding="$4"
              paddingBottom={24}
              borderTopLeftRadius="$4"
              borderTopRightRadius="$4"
              gap="$4"
              minHeight="70%"
            >
              {/* Header */}
              <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                {t('routeCollections.addToCollection') || 'Add to Collection'}
              </Text>

              {showCreateForm ? (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <YStack gap="$4">
                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('routeCollections.name') || 'Collection Name'}</Text>
                      <Input
                        value={formData.name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                        placeholder={t('routeCollections.namePlaceholder') || 'Enter collection name...'}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        placeholderTextColor="$gray10"
                      />
                    </YStack>

                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('routeCollections.description') || 'Description (Optional)'}</Text>
                      <Input
                        value={formData.description}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                        placeholder={t('routeCollections.descriptionPlaceholder') || 'Enter description...'}
                        backgroundColor="$background"
                        borderColor="$borderColor"
                        color="$color"
                        placeholderTextColor="$gray10"
                        multiline
                        numberOfLines={3}
                      />
                    </YStack>

                    <YStack gap="$2">
                      <Text weight="bold" size="lg">{t('routeCollections.visibility') || 'Visibility'}</Text>
                      <YStack gap="$2">
                        {[
                          { value: 'private', label: t('routeCollections.private') || 'Private', icon: 'lock' },
                          { value: 'public', label: t('routeCollections.public') || 'Public', icon: 'globe' },
                          { value: 'shared', label: t('routeCollections.shared') || 'Shared', icon: 'users' },
                        ].map((option) => (
                          <RadioButton
                            key={option.value}
                            onPress={() => setFormData(prev => ({ ...prev, visibility: option.value as any }))}
                            title={option.label}
                            description=""
                            isSelected={formData.visibility === option.value}
                            rightElement={
                              <Feather
                                name={option.icon as any}
                                size={16}
                                color="$color"
                              />
                            }
                          />
                        ))}
                      </YStack>
                    </YStack>
                  </YStack>
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {loading ? (
                    <XStack padding="$4" justifyContent="center">
                      <Text color="$color">{t('common.loading') || 'Loading...'}</Text>
                    </XStack>
                  ) : (
                    <YStack gap="$2">
                      {presets.map((preset) => {
                        const isInPreset = routePresets.includes(preset.id);
                        
                        return (
                          <RadioButton
                            key={preset.id}
                            onPress={() => handleTogglePreset(preset)}
                            title={preset.name}
                            description={`${preset.description || ''} • ${preset.route_count || 0} ${t('routeCollections.routes') || 'routes'}`}
                            isSelected={isInPreset}
                            rightElement={
                              <XStack alignItems="center" gap="$2">
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
                                      {t('routeCollections.default') || 'Default'}
                                    </Text>
                                  </View>
                                )}
                                <Feather
                                  name={
                                    preset.visibility === 'public' ? 'globe' :
                                    preset.visibility === 'shared' ? 'users' : 'lock'
                                  }
                                  size={14}
                                  color="$color"
                                />
                              </XStack>
                            }
                          />
                        );
                      })}
                      
                      {/* Show helpful message when no custom collections exist */}
                      {presets.length === 0 && (
                        <YStack gap="$2" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4" marginTop="$2">
                          <XStack alignItems="center" gap="$2">
                            <Feather name="info" size={16} color="#00E6C3" />
                            <Text fontWeight="500" color="$color">
                              {t('routeCollections.createFirstCollection') || 'Create your first custom collection'}
                            </Text>
                          </XStack>
                          <Text fontSize="$2" color="$gray11">
                            {t('routeCollections.createFirstCollectionDescription') || 'Organize your routes by creating custom collections like "Summer Routes" or "City Driving".'}
                          </Text>
                        </YStack>
                      )}
                    </YStack>
                  )}
                </ScrollView>
              )}

              {/* Footer Buttons */}
              {showCreateForm ? (
                <YStack gap="$2">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleCreatePreset}
                    disabled={!formData.name.trim()}
                  >
                    {t('common.create')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onPress={resetForm}
                  >
                    {t('common.cancel')}
                  </Button>
                </YStack>
              ) : (
                <YStack gap="$2">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={() => setShowCreateForm(true)}
                  >
                    {t('routeCollections.createNew') || 'Create New'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onPress={hideSheet}
                  >
                    {t('common.done')}
                  </Button>
                </YStack>
              )}
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
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
