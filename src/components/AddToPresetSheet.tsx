import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Text, XStack, YStack, Input } from 'tamagui';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { RadioButton } from './SelectButton';
import { CollectionSharingModal } from './CollectionSharingModal';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { height: screenHeight } = Dimensions.get('window');

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
  selectedCollectionId?: string; // For showing pre-selected collection (e.g., from CreateRouteScreen)
  onRouteAdded?: (presetId: string, presetName: string) => void;
  onRouteRemoved?: (presetId: string, presetName: string) => void;
  onPresetCreated?: (preset: MapPreset) => void;
  onReopen?: () => void; // For reopening after sharing modal closes
}

// Styles removed - now using Tamagui components and GettingStarted.tsx pattern

export function AddToPresetSheet({
  isVisible,
  onClose,
  routeId,
  selectedCollectionId,
  onRouteAdded,
  onRouteRemoved,
  onPresetCreated,
  onReopen,
}: AddToPresetSheetProps) {
  const { t } = useTranslation();
  const { getEffectiveUserId } = useStudentSwitch();
  const { showToast } = useToast();
  const { showModal } = useModal();
  const colorScheme = useColorScheme();

  const [presets, setPresets] = useState<MapPreset[]>([]);
  const [routePresets, setRoutePresets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<MapPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as 'public' | 'private' | 'shared',
    allowPublicEdit: false, // New field for public collection edit permissions
  });

  // Filter and search state
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'public' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Snap points for resizing (like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: screenHeight * 0.1, // Top at 10% of screen (show 90% - largest)
      medium: screenHeight * 0.4, // Top at 40% of screen (show 60% - medium)
      small: screenHeight * 0.7, // Top at 70% of screen (show 30% - small)
      tiny: screenHeight * 0.85, // Top at 85% of screen (show 15% - just title)
      dismissed: screenHeight, // Completely off-screen
    };
    return points;
  }, []);

  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);
  const translateY = useSharedValue(snapPoints.large);
  const isDragging = useRef(false);

  const effectiveUserId = getEffectiveUserId();

  // Ensure global VROMM collection exists (shared by all users worldwide)
  const ensureGlobalVrommCollection = useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      // Check if the global VROMM collection exists
      const { data: globalCollection, error: checkError } = await supabase
        .from('map_presets')
        .select('id')
        .eq('name', 'VROMM')
        .eq('is_default', true)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw checkError;
      }

      // If no global VROMM collection exists, create it
      if (!globalCollection) {
        const { data: newGlobal, error: createError } = await supabase
          .from('map_presets')
          .insert({
            name: 'VROMM',
            description: 'Global collection shared by all VROMM users worldwide',
            visibility: 'public',
            is_default: true,
            allow_public_edit: true, // Allow all users to add routes
            creator_id: effectiveUserId, // First user to trigger creation becomes the "creator"
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
      }
    } catch (error) {
      console.error('Error ensuring global VROMM collection:', error);
    }
  }, [effectiveUserId]);

  // Filter and search presets
  const filteredPresets = useMemo(() => {
    let filtered = presets;

    // Apply filter
    switch (activeFilter) {
      case 'my':
        filtered = filtered.filter((preset) => preset.creator_id === effectiveUserId);
        break;
      case 'public':
        filtered = filtered.filter((preset) => preset.visibility === 'public');
        break;
      case 'shared':
        filtered = filtered.filter((preset) => preset.visibility === 'shared');
        break;
      case 'all':
      default:
        // Show all collections that the user has access to (their own + public)
        filtered = filtered.filter(
          (preset) => preset.creator_id === effectiveUserId || preset.visibility === 'public',
        );
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (preset) =>
          preset.name.toLowerCase().includes(query) ||
          (preset.description && preset.description.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [presets, activeFilter, searchQuery, effectiveUserId]);

  // Animation refs (matching GettingStarted.tsx pattern)
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Snap functions
  const dismissSheet = useCallback(() => {
    translateY.value = withSpring(snapPoints.dismissed, {
      damping: 20,
      mass: 1,
      stiffness: 100,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
    setTimeout(() => onClose(), 200);
  }, [onClose, snapPoints.dismissed, translateY]);

  // Pan gesture for drag-to-dismiss and snap points
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentState.value + translationY;

        // Constrain to snap points range
        const minPosition = snapPoints.large;
        const maxPosition = snapPoints.tiny + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        translateY.value = boundedPosition;
      } catch (error) {
        console.log('panGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentState.value + translationY;

      // Dismiss if dragged down past the tiny snap point with reasonable velocity
      if (currentPosition > snapPoints.tiny + 30 && velocityY > 200) {
        runOnJS(dismissSheet)();
        return;
      }

      // Determine target snap point based on position and velocity
      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = snapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = snapPoints.tiny;
      } else {
        const positions = [snapPoints.large, snapPoints.medium, snapPoints.small, snapPoints.tiny];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(Math.max(targetSnapPoint, snapPoints.large), snapPoints.tiny);

      translateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentState.value = boundedTarget;
      runOnJS(setCurrentSnapPoint)(boundedTarget);
    });

  const animatedGestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Load presets and check which ones contain this route
  const loadPresets = useCallback(async () => {
    if (!effectiveUserId || !routeId) {
      return;
    }

    setLoading(true);
    try {
      // First, ensure global VROMM collection exists
      await ensureGlobalVrommCollection();

      // Load user's own presets and public presets
      const { data: presetsData, error: presetsError } = await supabase
        .from('map_presets')
        .select(
          `
          *,
          route_count:map_preset_routes(count)
        `,
        )
        .or(`creator_id.eq.${effectiveUserId},visibility.eq.public`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (presetsError) throw presetsError;

      const transformedPresets =
        presetsData?.map((preset) => ({
          ...preset,
          route_count: preset.route_count?.[0]?.count || 0,
        })) || [];

      setPresets(transformedPresets);

      // Only check which presets contain this route if routeId is a valid UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(routeId)) {
        const { data: routePresetsData, error: routePresetsError } = await supabase
          .from('map_preset_routes')
          .select('preset_id')
          .eq('route_id', routeId);

        if (routePresetsError) throw routePresetsError;

        const routePresetIds = routePresetsData?.map((item) => item.preset_id) || [];
        setRoutePresets(routePresetIds);
      } else {
        // For temp route IDs, don't check which presets contain the route
        setRoutePresets([]);
      }
    } catch (error) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToLoad') || 'Failed to load collections',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, routeId, ensureGlobalVrommCollection, showToast, t]);

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
      visibility: 'public',
      allowPublicEdit: false,
    });
    setShowCreateForm(false);
    setEditingPreset(null);
  };

  // Start editing a preset
  const startEditingPreset = (preset: MapPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      visibility: preset.visibility,
      allowPublicEdit: (preset as any).allow_public_edit || false,
    });
    setShowCreateForm(true);
  };

  // Handle delete preset
  const handleDeletePreset = async (preset: MapPreset) => {
    if (!effectiveUserId || preset.creator_id !== effectiveUserId) return;

    try {
      // First remove all routes from this preset
      const { error: removeRoutesError } = await supabase
        .from('map_preset_routes')
        .delete()
        .eq('preset_id', preset.id);

      if (removeRoutesError) throw removeRoutesError;

      // Then delete the preset itself
      const { error: deleteError } = await supabase
        .from('map_presets')
        .delete()
        .eq('id', preset.id);

      if (deleteError) throw deleteError;

      // Update local state
      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
      setRoutePresets((prev) => prev.filter((id) => id !== preset.id));

      showToast({
        title: t('routeCollections.deleted') || 'Collection Deleted',
        message:
          t('routeCollections.collectionDeleted')?.replace('{name}', preset.name) ||
          `Collection "${preset.name}" has been deleted`,
        type: 'success',
      });
    } catch {
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToDelete') || 'Failed to delete collection',
        type: 'error',
      });
    }
  };

  // Handle leave collection (for shared collections)
  const handleLeaveCollection = async (preset: MapPreset) => {
    if (!effectiveUserId) return;

    try {
      const { error } = await supabase
        .from('map_preset_members')
        .delete()
        .eq('preset_id', preset.id)
        .eq('user_id', effectiveUserId);

      if (error) throw error;

      // Update local state - remove from presets list
      setPresets((prev) => prev.filter((p) => p.id !== preset.id));

      showToast({
        title: t('routeCollections.left') || 'Left Collection',
        message:
          t('routeCollections.leftMessage')?.replace('{name}', preset.name) ||
          `You have left "${preset.name}"`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error leaving collection:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToLeave') || 'Failed to leave collection',
        type: 'error',
      });
    }
  };

  // Handle adding/removing route from preset
  const handleTogglePreset = React.useCallback(
    async (preset: MapPreset) => {
      if (!effectiveUserId) return;

      // Check if routeId is a valid UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(routeId)) {
        // For new routes (temp-route-id), just toggle the selection without closing the sheet
        if (onRouteAdded) {
          onRouteAdded(preset.id, preset.name);
          // Don't close the sheet - allow multiple selections
          return;
        }

        showToast({
          title: t('common.info') || 'Info',
          message:
            t('routeCollections.saveRouteFirst') ||
            'Please save the route first before adding it to a collection',
          type: 'info',
        });
        return;
      }

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

          setRoutePresets((prev) => prev.filter((id) => id !== preset.id));
          onRouteRemoved?.(preset.id, preset.name);
        } else {
          // Add route to preset
          const { error } = await supabase.from('map_preset_routes').insert({
            preset_id: preset.id,
            route_id: routeId,
            added_by: effectiveUserId,
            added_at: new Date().toISOString(),
          });

          if (error) throw error;

          setRoutePresets((prev) => [...prev, preset.id]);
          onRouteAdded?.(preset.id, preset.name);
        }
      } catch {
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.failedToUpdate') || 'Failed to update collection',
          type: 'error',
        });
      }
    },
    [effectiveUserId, routeId, routePresets, onRouteAdded, onRouteRemoved, showToast, t],
  );

  // Handle create or update preset
  const handleCreateOrUpdatePreset = React.useCallback(async () => {
    if (!formData.name.trim() || !effectiveUserId) return;

    try {
      if (editingPreset) {
        // Update existing preset
        const { data: updatedPreset, error: updateError } = await supabase
          .from('map_presets')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            visibility: formData.visibility,
            allow_public_edit: formData.allowPublicEdit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPreset.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        setPresets((prev) =>
          prev.map((p) =>
            p.id === editingPreset.id ? { ...updatedPreset, route_count: p.route_count } : p,
          ),
        );

        showToast({
          title: t('routeCollections.updated') || 'Collection Updated',
          message:
            t('routeCollections.collectionUpdated')?.replace('{name}', updatedPreset.name) ||
            `Collection "${updatedPreset.name}" has been updated`,
          type: 'success',
        });
      } else {
        // Create new preset
        const { data: newPreset, error: createError } = await supabase
          .from('map_presets')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            visibility: formData.visibility,
            allow_public_edit: formData.allowPublicEdit,
            creator_id: effectiveUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add route to the new preset (only if routeId is a valid UUID)
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(routeId)) {
          const { error: addError } = await supabase.from('map_preset_routes').insert({
            preset_id: newPreset.id,
            route_id: routeId,
            added_by: effectiveUserId,
            added_at: new Date().toISOString(),
          });

          if (addError) throw addError;
        }

        setPresets((prev) => [{ ...newPreset, route_count: 1 }, ...prev]);
        setRoutePresets((prev) => [...prev, newPreset.id]);
        onPresetCreated?.(newPreset);
        onRouteAdded?.(newPreset.id, newPreset.name);

        showToast({
          title: t('routeCollections.created') || 'Collection Created',
          message:
            t('routeCollections.collectionCreated')?.replace('{name}', newPreset.name) ||
            `Collection "${newPreset.name}" has been created`,
          type: 'success',
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error creating/updating preset:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: editingPreset
          ? t('routeCollections.failedToUpdate') || 'Failed to update collection'
          : t('routeCollections.failedToCreate') || 'Failed to create collection',
        type: 'error',
      });
    }
  }, [
    effectiveUserId,
    formData,
    editingPreset,
    showToast,
    t,
    onPresetCreated,
    onRouteAdded,
    routeId,
  ]);

  // Sharing modal functions - now using useModal context
  const showSharingSheet = React.useCallback(
    (preset?: MapPreset) => {
      // Use the passed preset or the current editingPreset
      const targetPreset = preset || editingPreset;

      if (!targetPreset?.id) {
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.collectionNotFound') || 'Collection not found',
          type: 'error',
        });
        return;
      }

      // Close the current sheet first
      dismissSheet();

      // Use setTimeout to ensure the current modal is closed before showing the new one
      setTimeout(() => {
        showModal(
          <CollectionSharingModal
            visible={true}
            onClose={() => {
              setTimeout(() => {
                if (onReopen) {
                  onReopen();
                }
              }, 200);
            }}
            preset={targetPreset}
            onInvitationsSent={() => {
              // Refresh the presets list when invitations are sent
              loadPresets();
            }}
          />,
        );
      }, 500); // Wait for the close animation to complete
    },
    [dismissSheet, showModal, editingPreset, onReopen, loadPresets, t, showToast],
  );

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      // Reset gesture translateY when opening and set to large snap point
      translateY.value = withSpring(snapPoints.medium, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.medium;
      setCurrentSnapPoint(snapPoints.medium);

      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [
    isVisible,
    snapPoints.large,
    currentState,
    backdropOpacity,
    snapPoints.dismissed,
    snapPoints.medium,
    translateY,
  ]);

  if (!isVisible) return null;

  return (
    <>
      <Modal visible={isVisible} transparent animationType="none" onRequestClose={dismissSheet}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropOpacity,
          }}
        >
          <View style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={dismissSheet} />
            <GestureDetector gesture={panGesture}>
              <ReanimatedAnimated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: screenHeight,
                    backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#fff',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  },
                  animatedGestureStyle,
                ]}
              >
                <YStack padding="$3" paddingBottom={24} gap="$3" flex={1}>
                  {/* Drag Handle */}
                  <View
                    style={{
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colorScheme === 'dark' ? '#666' : '#CCC',
                      }}
                    />
                  </View>
                  {/* Header */}
                  <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2">
                    {showCreateForm && (
                      <TouchableOpacity
                        onPress={resetForm}
                        style={{
                          padding: 8,
                          backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                          borderRadius: 8,
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="arrow-left"
                          size={20}
                          color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                        />
                      </TouchableOpacity>
                    )}
                    <Text
                      fontSize="$6"
                      fontWeight="bold"
                      color="$color"
                      textAlign="center"
                      flex={1}
                    >
                      {editingPreset ? 'Edit Collection' : 'Add to Collection'}
                    </Text>
                    {showCreateForm && <View style={{ width: 36 }} />}
                  </XStack>

                  {/* Show content only if not in tiny mode */}
                  {currentSnapPoint !== snapPoints.tiny && (
                    <View style={{ flex: 1 }}>
                      {showCreateForm ? (
                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                          <YStack gap="$4">
                            {editingPreset?.is_default && (
                              <YStack
                                gap="$2"
                                padding="$3"
                                backgroundColor="$blue2"
                                borderRadius="$3"
                              >
                                <XStack alignItems="center" gap="$2">
                                  <Feather name="info" size={16} color="#3B82F6" />
                                  <Text fontSize="$3" fontWeight="500" color="#3B82F6">
                                    Global VROMM Collection
                                  </Text>
                                </XStack>
                                <Text fontSize="$2" color="$gray11">
                                  This is the global VROMM collection shared by all users worldwide.
                                  Routes are automatically saved here. You can share it but cannot
                                  change its name or visibility.
                                </Text>
                                <Text fontSize="$2" color="$gray11" marginTop="$2">
                                  <Text fontWeight="500" color="$color">
                                    Note:
                                  </Text>{' '}
                                  Users can deselect routes from this global collection if they only
                                  want them in personal collections.
                                </Text>
                              </YStack>
                            )}

                            <YStack gap="$2">
                              <Text fontWeight="bold" fontSize="$5">
                                {t('routeCollections.name') || 'Collection Name'}
                              </Text>
                              <Input
                                value={formData.name}
                                onChangeText={(text) =>
                                  setFormData((prev) => ({ ...prev, name: text }))
                                }
                                placeholder={
                                  t('routeCollections.namePlaceholder') ||
                                  'Enter collection name...'
                                }
                                backgroundColor="$background"
                                borderColor="$borderColor"
                                color="$color"
                                placeholderTextColor="$gray10"
                                editable={!editingPreset?.is_default}
                              />
                            </YStack>

                            <YStack gap="$2">
                              <Text fontWeight="bold" fontSize="$5">
                                {t('routeCollections.description') || 'Description (Optional)'}
                              </Text>
                              <Input
                                value={formData.description}
                                onChangeText={(text) =>
                                  setFormData((prev) => ({ ...prev, description: text }))
                                }
                                placeholder={
                                  t('routeCollections.descriptionPlaceholder') ||
                                  'Enter description...'
                                }
                                backgroundColor="$background"
                                borderColor="$borderColor"
                                color="$color"
                                placeholderTextColor="$gray10"
                                multiline
                                numberOfLines={3}
                              />
                            </YStack>

                            <YStack gap="$2">
                              <Text fontWeight="bold" fontSize="$5">
                                {t('routeCollections.visibility') || 'Visibility'}
                              </Text>
                              <YStack gap="$2">
                                {[
                                  {
                                    value: 'private',
                                    label: t('routeCollections.private') || 'Private',
                                    icon: 'lock',
                                  },
                                  {
                                    value: 'public',
                                    label: t('routeCollections.public') || 'Public',
                                    icon: 'globe',
                                  },
                                  {
                                    value: 'shared',
                                    label: t('routeCollections.shared') || 'Shared',
                                    icon: 'users',
                                  },
                                ].map((option) => (
                                  <RadioButton
                                    key={option.value}
                                    onPress={() => {
                                      if (!editingPreset?.is_default) {
                                        setFormData((prev) => ({
                                          ...prev,
                                          visibility: option.value as any,
                                        }));
                                      }
                                    }}
                                    title={option.label}
                                    description={
                                      option.value === 'shared'
                                        ? t('routeCollections.sharedDescription') ||
                                          'Share with specific users'
                                        : ''
                                    }
                                    isSelected={formData.visibility === option.value}
                                  />
                                ))}
                              </YStack>

                              {/* Public Edit Permission Toggle */}
                              {formData.visibility === 'public' && (
                                <YStack
                                  gap="$2"
                                  marginTop="$2"
                                  padding="$3"
                                  backgroundColor="$backgroundHover"
                                  borderRadius="$3"
                                >
                                  <XStack alignItems="center" gap="$2">
                                    <Feather
                                      name="edit"
                                      size={16}
                                      color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                                    />
                                    <Text fontSize="$4" fontWeight="500" color="$color">
                                      {t('routeCollections.allowPublicEdit') ||
                                        'Allow Public Editing'}
                                    </Text>
                                  </XStack>
                                  <Text fontSize="$3" color="$gray11">
                                    {t('routeCollections.allowPublicEditDescription') ||
                                      'Allow anyone to add/remove routes from this public collection'}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        allowPublicEdit: !prev.allowPublicEdit,
                                      }))
                                    }
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 8,
                                      paddingVertical: 8,
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <View
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        borderWidth: 2,
                                        borderColor: formData.allowPublicEdit ? '#00E6C3' : '#ccc',
                                        backgroundColor: formData.allowPublicEdit
                                          ? '#00E6C3'
                                          : 'transparent',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {formData.allowPublicEdit && (
                                        <Feather name="check" size={12} color="white" />
                                      )}
                                    </View>
                                    <Text fontSize="$3" color="$color">
                                      {formData.allowPublicEdit
                                        ? t('routeCollections.enabled') || 'Enabled'
                                        : t('routeCollections.disabled') || 'Disabled'}
                                    </Text>
                                  </TouchableOpacity>
                                </YStack>
                              )}
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
                            <YStack gap="$3">
                              {/* Filter Chips */}
                              <YStack gap="$2">
                                <Text fontSize="$3" color="$gray11" fontWeight="500">
                                  {t('routeCollections.filterBy') || 'Filter by:'}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                  <XStack gap="$2" paddingHorizontal="$1">
                                    {[
                                      {
                                        key: 'all',
                                        label: t('routeCollections.all') || 'All',
                                        icon: 'grid',
                                      },
                                      {
                                        key: 'my',
                                        label:
                                          t('routeCollections.myCollections') || 'My Collections',
                                        icon: 'user',
                                      },
                                      {
                                        key: 'public',
                                        label: t('routeCollections.public') || 'Public',
                                        icon: 'globe',
                                      },
                                      {
                                        key: 'shared',
                                        label: t('routeCollections.shared') || 'Shared',
                                        icon: 'users',
                                      },
                                    ].map((filter) => (
                                      <TouchableOpacity
                                        key={filter.key}
                                        onPress={() => {
                                          console.log(
                                            '🔍 [AddToPresetSheet] Filter changed to:',
                                            filter.key,
                                          );
                                          setActiveFilter(filter.key as any);
                                        }}
                                        style={{
                                          paddingHorizontal: 12,
                                          paddingVertical: 8,
                                          borderRadius: 20,
                                          borderWidth: 1,
                                          borderColor:
                                            activeFilter === filter.key
                                              ? '#00E6C3'
                                              : colorScheme === 'dark'
                                                ? '#666'
                                                : '#ccc',
                                          backgroundColor:
                                            activeFilter === filter.key
                                              ? 'rgba(0, 230, 195, 0.1)'
                                              : 'transparent',
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <XStack alignItems="center" gap="$1">
                                          <Feather
                                            name={filter.icon as any}
                                            size={14}
                                            color={
                                              activeFilter === filter.key
                                                ? '#00E6C3'
                                                : colorScheme === 'dark'
                                                  ? '#ECEDEE'
                                                  : '#11181C'
                                            }
                                          />
                                          <Text
                                            fontSize="$2"
                                            color={
                                              activeFilter === filter.key
                                                ? '#00E6C3'
                                                : colorScheme === 'dark'
                                                  ? '#ECEDEE'
                                                  : '#11181C'
                                            }
                                            fontWeight={activeFilter === filter.key ? '600' : '400'}
                                          >
                                            {filter.label}
                                          </Text>
                                        </XStack>
                                      </TouchableOpacity>
                                    ))}
                                  </XStack>
                                </ScrollView>
                              </YStack>

                              {/* Search Bar */}
                              <YStack gap="$2">
                                <Text fontSize="$3" color="$gray11" fontWeight="500">
                                  {t('routeCollections.search') || 'Search:'}
                                </Text>
                                <Input
                                  placeholder={
                                    t('routeCollections.searchPlaceholder') ||
                                    'Search collections...'
                                  }
                                  value={searchQuery}
                                  onChangeText={(text) => {
                                    console.log('🔍 [AddToPresetSheet] Search query:', text);
                                    setSearchQuery(text);
                                  }}
                                  backgroundColor="$background"
                                  borderColor="$borderColor"
                                  color="$color"
                                  placeholderTextColor="$gray10"
                                />
                              </YStack>

                              {/* Results Count */}
                              <XStack alignItems="center" gap="$2">
                                <Text fontSize="$2" color="$gray11">
                                  {t('routeCollections.showing') || 'Showing'}{' '}
                                  {filteredPresets.length} {t('routeCollections.of') || 'of'}{' '}
                                  {presets.length}{' '}
                                  {t('routeCollections.collections') || 'collections'}
                                </Text>
                                {(activeFilter !== 'all' || searchQuery.trim()) && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      console.log('🔍 [AddToPresetSheet] Clearing filters');
                                      setActiveFilter('all');
                                      setSearchQuery('');
                                    }}
                                    style={{
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                      borderRadius: 12,
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text fontSize="$1" color="#EF4444" fontWeight="500">
                                      {t('common.clear') || 'Clear'}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </XStack>

                              {/* Collections Info */}
                              <YStack
                                gap="$2"
                                padding="$3"
                                backgroundColor="$backgroundHover"
                                borderRadius="$3"
                              >
                                <XStack alignItems="center" gap="$2">
                                  <Feather
                                    name="info"
                                    size={16}
                                    color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                                  />
                                  <Text fontSize="$3" fontWeight="500" color="$color">
                                    How Collections Work
                                  </Text>
                                </XStack>
                                <Text fontSize="$2" color="$gray11" lineHeight="$3">
                                  •{' '}
                                  <Text fontWeight="500" color="$color">
                                    VROMM Collection
                                  </Text>
                                  : Global collection shared by all users worldwide - your routes
                                  are automatically saved here
                                </Text>
                                <Text fontSize="$2" color="$gray11" lineHeight="$3">
                                  •{' '}
                                  <Text fontWeight="500" color="$color">
                                    Personal Collections
                                  </Text>
                                  : Create your own collections to organize routes by theme,
                                  difficulty, or location
                                </Text>
                                <Text fontSize="$2" color="$gray11" lineHeight="$3">
                                  • Routes can be in multiple collections at once
                                </Text>
                                <Text fontSize="$2" color="$gray11" lineHeight="$3">
                                  •{' '}
                                  <Text fontWeight="500" color="$color">
                                    Tip
                                  </Text>
                                  : You can deselect routes from the global VROMM collection if you
                                  only want them in personal collections
                                </Text>
                              </YStack>

                              {/* Collections List */}
                              <YStack gap="$2">
                                {filteredPresets.map((preset) => {
                                  const isInPreset =
                                    routePresets.includes(preset.id) ||
                                    selectedCollectionId === preset.id;
                                  const canEdit = preset.creator_id === effectiveUserId;
                                  const isDefault = preset.is_default;

                                  return (
                                    <XStack key={preset.id} alignItems="center" gap="$2">
                                      <YStack flex={1}>
                                        <YStack>
                                          <RadioButton
                                            onPress={() => handleTogglePreset(preset)}
                                            title={preset.name}
                                            description={`${preset.description || ''} • ${preset.route_count || 0} ${t('routeCollections.routes') || 'routes'}${isDefault ? ' • Global collection - auto-saved here (tap to remove from global)' : ''}`}
                                            isSelected={isInPreset}
                                          />
                                          {isDefault && (
                                            <XStack
                                              alignItems="center"
                                              gap="$1"
                                              paddingHorizontal="$2"
                                              paddingVertical="$1"
                                              backgroundColor="$blue4"
                                              borderRadius="$2"
                                              marginTop="$1"
                                              alignSelf="flex-start"
                                            >
                                              <Feather name="star" size={12} color="#3B82F6" />
                                              <Text fontSize="$1" color="#3B82F6" fontWeight="600">
                                                Global
                                              </Text>
                                            </XStack>
                                          )}
                                        </YStack>
                                      </YStack>

                                      {canEdit && (
                                        <XStack gap="$1">
                                          {!isDefault && (
                                            <TouchableOpacity
                                              onPress={() => startEditingPreset(preset)}
                                              style={{
                                                padding: 8,
                                                backgroundColor:
                                                  colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                                borderRadius: 6,
                                              }}
                                              activeOpacity={0.7}
                                            >
                                              <Feather
                                                name="edit-2"
                                                size={16}
                                                color={
                                                  colorScheme === 'dark' ? '#ECEDEE' : '#11181C'
                                                }
                                              />
                                            </TouchableOpacity>
                                          )}

                                          <TouchableOpacity
                                            onPress={() => {
                                              console.log(
                                                '🔘 [AddToPresetSheet] Sharing button pressed for preset:',
                                                preset.name,
                                              );
                                              console.log(
                                                '🔘 [AddToPresetSheet] Preset ID:',
                                                preset.id,
                                              );
                                              showSharingSheet(preset);
                                            }}
                                            style={{
                                              padding: 8,
                                              backgroundColor:
                                                colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                              borderRadius: 6,
                                            }}
                                            activeOpacity={0.7}
                                          >
                                            <Feather
                                              name="users"
                                              size={16}
                                              color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                                            />
                                          </TouchableOpacity>

                                          {!isDefault && (
                                            <TouchableOpacity
                                              onPress={() => handleDeletePreset(preset)}
                                              style={{
                                                padding: 8,
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                borderRadius: 6,
                                              }}
                                              activeOpacity={0.7}
                                            >
                                              <Feather name="trash-2" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                          )}
                                        </XStack>
                                      )}
                                    </XStack>
                                  );
                                })}
                              </YStack>
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
                            onPress={handleCreateOrUpdatePreset}
                            disabled={!formData.name.trim()}
                          >
                            {editingPreset
                              ? t('common.update') || 'Update'
                              : t('common.create') || 'Create'}
                          </Button>
                          <Button variant="secondary" size="lg" onPress={resetForm}>
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
                          <Button variant="secondary" size="lg" onPress={dismissSheet}>
                            <Text color="white"> {t('common.done') || 'Done'}</Text>
                          </Button>
                        </YStack>
                      )}
                    </View>
                  )}
                </YStack>
              </ReanimatedAnimated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

export function AddToPresetSheetModal({
  routeId,
  selectedCollectionId,
  onRouteAdded,
  onRouteRemoved,
  onPresetCreated,
  onClose,
  onReopen,
}: Omit<AddToPresetSheetProps, 'isVisible'> & { onClose?: () => void; onReopen?: () => void }) {
  const { hideModal } = useModal();

  const handleClose = React.useCallback(() => {
    hideModal();
    onClose?.();
  }, [hideModal, onClose]);

  const handleReopen = React.useCallback(() => {
    // Reopen the modal by calling onReopen
    if (onReopen) {
      onReopen();
    }
  }, [onReopen]);

  return (
    <AddToPresetSheet
      isVisible={true}
      onClose={handleClose}
      routeId={routeId}
      selectedCollectionId={selectedCollectionId}
      onRouteAdded={onRouteAdded}
      onRouteRemoved={onRouteRemoved}
      onPresetCreated={onPresetCreated}
      onReopen={handleReopen}
    />
  );
}
