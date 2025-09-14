import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  Modal,
  Pressable,
  useColorScheme,
  TextInput,
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
  selectedCollectionId?: string; // For showing pre-selected collection (e.g., from CreateRouteScreen)
  onRouteAdded?: (presetId: string, presetName: string) => void;
  onRouteRemoved?: (presetId: string, presetName: string) => void;
  onPresetCreated?: (preset: MapPreset) => void;
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
  const [editingPreset, setEditingPreset] = useState<MapPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'public' | 'private' | 'shared',
  });

  // Sharing state (similar to GettingStarted.tsx)
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [sharingSearchQuery, setSharingSearchQuery] = useState('');
  const [sharingSearchResults, setSharingSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; full_name: string; email: string; role?: string }>>([]);
  const [sharingCustomMessage, setSharingCustomMessage] = useState('');
  const [pendingCollectionInvitations, setPendingCollectionInvitations] = useState<any[]>([]);

  const effectiveUserId = getEffectiveUserId();

  // Animation refs (matching GettingStarted.tsx pattern)
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // Sharing modal animation refs
  const sharingBackdropOpacity = useRef(new Animated.Value(0)).current;
  const sharingSheetTranslateY = useRef(new Animated.Value(300)).current;

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

      const transformedPresets = presetsData?.map(preset => ({
        ...preset,
        route_count: preset.route_count?.[0]?.count || 0,
      })) || [];

      setPresets(transformedPresets);

      // Only check which presets contain this route if routeId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(routeId)) {
      const { data: routePresetsData, error: routePresetsError } = await supabase
        .from('map_preset_routes')
        .select('preset_id')
        .eq('route_id', routeId);

      if (routePresetsError) throw routePresetsError;

      const routePresetIds = routePresetsData?.map(item => item.preset_id) || [];
      setRoutePresets(routePresetIds);
      } else {
        // For temp route IDs, don't check which presets contain the route
        console.log('⚠️ [AddToPresetSheet] Using temp routeId, skipping route preset check:', routeId);
        setRoutePresets([]);
      }
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
    setEditingPreset(null);
    // Reset sharing state
    setSelectedUsers([]);
    setSharingSearchQuery('');
    setSharingSearchResults([]);
    setSharingCustomMessage('');
  };

  // Start editing a preset
  const startEditingPreset = (preset: MapPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      visibility: preset.visibility,
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
      setPresets(prev => prev.filter(p => p.id !== preset.id));
      setRoutePresets(prev => prev.filter(id => id !== preset.id));

      showToast({
        title: t('routeCollections.deleted') || 'Collection Deleted',
        message: t('routeCollections.collectionDeleted')?.replace('{name}', preset.name) || `Collection "${preset.name}" has been deleted`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting preset:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToDelete') || 'Failed to delete collection',
        type: 'error'
      });
    }
  };

  // Handle adding/removing route from preset
  const handleTogglePreset = async (preset: MapPreset) => {
    if (!effectiveUserId) return;

    // Check if routeId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      // For new routes (temp-route-id), just toggle the selection without closing the sheet
      if (onRouteAdded) {
        onRouteAdded(preset.id, preset.name);
        // Don't close the sheet - allow multiple selections
        return;
      }
      
      showToast({
        title: t('common.info') || 'Info',
        message: t('routeCollections.saveRouteFirst') || 'Please save the route first before adding it to a collection',
        type: 'info'
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

  // Handle create or update preset
  const handleCreateOrUpdatePreset = async () => {
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
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPreset.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        setPresets(prev => prev.map(p => p.id === editingPreset.id ? { ...updatedPreset, route_count: p.route_count } : p));

        showToast({
          title: t('routeCollections.updated') || 'Collection Updated',
          message: t('routeCollections.collectionUpdated')?.replace('{name}', updatedPreset.name) || `Collection "${updatedPreset.name}" has been updated`,
          type: 'success'
        });
      } else {
        // Create new preset
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

        showToast({
          title: t('routeCollections.created') || 'Collection Created',
          message: t('routeCollections.collectionCreated')?.replace('{name}', newPreset.name) || `Collection "${newPreset.name}" has been created`,
          type: 'success'
        });
      }
      
      // If visibility is 'shared' and we have selected users, create sharing invitations
      if (formData.visibility === 'shared' && selectedUsers.length > 0) {
        await handleCreateCollectionSharing();
      }
      
      resetForm();
    } catch (error) {
      console.error('Error creating/updating preset:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: editingPreset 
          ? (t('routeCollections.failedToUpdate') || 'Failed to update collection')
          : (t('routeCollections.failedToCreate') || 'Failed to create collection'),
        type: 'error'
      });
    }
  };

  // Sharing modal functions (similar to GettingStarted.tsx)
  const showSharingSheet = () => {
    console.log('🎯 [AddToPresetSheet] showSharingSheet called');
    console.log('🎯 [AddToPresetSheet] editingPreset:', editingPreset?.name);
    console.log('🎯 [AddToPresetSheet] formData:', formData);
    setShowSharingModal(true);
    // Load pending invitations for the current collection
    loadPendingCollectionInvitations();
    Animated.timing(sharingBackdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sharingSheetTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    console.log('🎯 [AddToPresetSheet] showSharingModal set to true, animations started');
  };

  const hideSharingSheet = () => {
    Animated.timing(sharingBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(sharingSheetTranslateY, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSharingModal(false);
    });
  };

  // Load pending collection invitations
  const loadPendingCollectionInvitations = async () => {
    if (!effectiveUserId) return;
    
    try {
      // Get the collection ID - use editingPreset if available (for existing collections)
      const collectionId = editingPreset?.id;
      
      let query = supabase
        .from('pending_invitations')
        .select('*')
        .eq('invited_by', effectiveUserId)
        .eq('status', 'pending')
        .eq('role', 'collection_sharing');

      // If we're sharing a specific collection, filter by that collection
      if (collectionId) {
        query = query.eq('metadata->>collectionId', collectionId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending collection invitations:', error);
        return;
      }

      setPendingCollectionInvitations(data || []);
    } catch (error) {
      console.error('Error loading pending collection invitations:', error);
    }
  };

  // Search users for sharing (similar to GettingStarted.tsx)
  const handleSharingSearchUsers = async (query: string) => {
    setSharingSearchQuery(query);
    if (query.length < 2) {
      setSharingSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', effectiveUserId)
        .limit(10);

      if (error) throw error;
      setSharingSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users for sharing:', error);
    }
  };

  // Create collection sharing invitations
  const handleCreateCollectionSharing = async () => {
    if (!effectiveUserId || selectedUsers.length === 0) return;

    try {
      let successCount = 0;
      let failCount = 0;

      // Get the collection info - use editingPreset if available (for existing collections), otherwise use formData (for new collections)
      const collectionId = editingPreset?.id;
      const collectionName = editingPreset?.name || formData.name;

      if (!collectionId && !formData.name) {
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.collectionNotFound') || 'Collection not found',
          type: 'error'
        });
        return;
      }

      // Create invitations for each selected user
      for (const targetUser of selectedUsers) {
        if (!targetUser.email) {
          failCount++;
          continue;
        }
        
        try {
          // Create pending invitation for collection sharing
          const { error: inviteError } = await supabase
            .from('pending_invitations')
            .insert({
              email: targetUser.email.toLowerCase(),
              role: 'collection_sharing',
              invited_by: effectiveUserId,
              metadata: {
                collectionId: collectionId,
                collectionName: collectionName,
                inviterName: user?.email || 'Someone',
                customMessage: sharingCustomMessage.trim() || undefined,
                invitedAt: new Date().toISOString(),
                targetUserId: targetUser.id,
                targetUserName: targetUser.full_name,
                invitationType: 'collection_sharing',
              },
              status: 'pending',
            });

          if (inviteError && inviteError.code !== '23505') {
            console.error('Error creating collection sharing invitation:', inviteError);
            failCount++;
            continue;
          }

          // Create notification for the target user
          const baseMessage = `${user?.email || 'Someone'} wants to share the collection "${collectionName}" with you`;
          const fullMessage = sharingCustomMessage.trim() 
            ? `${baseMessage}\n\nPersonal message: "${sharingCustomMessage.trim()}"`
            : baseMessage;
          
          await supabase
            .from('notifications')
            .insert({
              user_id: targetUser.id,
              actor_id: effectiveUserId,
              type: 'collection_invitation' as any,
              title: 'Collection Sharing Invitation',
              message: fullMessage,
              metadata: {
                collection_name: formData.name,
                from_user_id: effectiveUserId,
                from_user_name: user?.email,
                customMessage: sharingCustomMessage.trim() || undefined,
              },
              action_url: 'vromm://notifications',
              priority: 'high',
              is_read: false,
            });

          successCount++;
        } catch (error) {
          console.error('Error processing collection sharing invitation for:', targetUser.email, error);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        showToast({
          title: t('routeCollections.invitationsSent') || 'Invitations Sent',
          message: t('routeCollections.invitationsSentMessage')?.replace('{count}', successCount.toString()) || `${successCount} invitation(s) sent successfully`,
          type: 'success'
        });
      }
      
      // Refresh pending invitations
      await loadPendingCollectionInvitations();
      
      // Clear selections and close modal
      setSelectedUsers([]);
      setSharingCustomMessage('');
      setSharingSearchQuery('');
      setSharingSearchResults([]);
      hideSharingSheet();
      
    } catch (error) {
      console.error('Error creating collection sharing invitations:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToSendInvitations') || 'Failed to send invitations',
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
    <>
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
              <XStack alignItems="center" justifyContent="space-between">
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
                    <Feather name="arrow-left" size={20} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                  </TouchableOpacity>
                )}
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center" flex={1}>
                  {editingPreset 
                    ? (t('routeCollections.editCollection') || 'Edit Collection')
                    : (t('routeCollections.addToCollection') || 'Add to Collection')
                  }
              </Text>
                {showCreateForm && <View style={{ width: 36 }} />}
              </XStack>

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
                            onPress={() => {
                              setFormData(prev => ({ ...prev, visibility: option.value as any }));
                              // If shared is selected, show the sharing modal
                              if (option.value === 'shared') {
                                showSharingSheet();
                              }
                            }}
                            title={option.label}
                            description={option.value === 'shared' ? (t('routeCollections.sharedDescription') || 'Share with specific users') : ''}
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
                        // Check if preset is selected either by being in routePresets (for existing routes) 
                        // or by being the selectedCollectionId (for new routes)
                        const isInPreset = routePresets.includes(preset.id) || selectedCollectionId === preset.id;
                        const canEdit = preset.creator_id === effectiveUserId;
                        
                        return (
                          <XStack key={preset.id} alignItems="center" gap="$2">
                            <YStack flex={1}>
                          <RadioButton
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
                            </YStack>
                            
                            {/* Edit, Share, and Delete buttons for user's own collections */}
                            {canEdit && (
                              <XStack gap="$1">
                                <TouchableOpacity
                                  onPress={() => startEditingPreset(preset)}
                                  style={{
                                    padding: 8,
                                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                    borderRadius: 6,
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Feather name="edit-2" size={16} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  onPress={() => {
                                    console.log('🔘 [AddToPresetSheet] Sharing button pressed for preset:', preset.name);
                                    // Set the current preset for sharing and show sharing modal
                                    setEditingPreset(preset);
                                    setFormData({
                                      name: preset.name,
                                      description: preset.description || '',
                                      visibility: preset.visibility,
                                    });
                                    console.log('🔘 [AddToPresetSheet] Calling showSharingSheet()');
                                    showSharingSheet();
                                  }}
                                  style={{
                                    padding: 8,
                                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                                    borderRadius: 6,
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Feather name="users" size={16} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                                </TouchableOpacity>
                                
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
                              </XStack>
                            )}
                          </XStack>
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
                    onPress={handleCreateOrUpdatePreset}
                    disabled={!formData.name.trim()}
                  >
                    {editingPreset ? (t('common.update') || 'Update') : (t('common.create') || 'Create')}
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

    {/* Collection Sharing Modal */}
    {showSharingModal && (() => {
      console.log('🎯 [AddToPresetSheet] Rendering Collection Sharing Modal');
      return (
      <Modal
        visible={showSharingModal}
        transparent
        animationType="none"
        onRequestClose={hideSharingSheet}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: sharingBackdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={hideSharingSheet}>
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                transform: [{ translateY: sharingSheetTranslateY }],
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
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {t('routeCollections.shareCollection') || 'Share Collection'}
                </Text>
                
                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {t('routeCollections.shareCollectionDescription') || 'Search for users to share this collection with'}
                </Text>

                {/* Show pending collection invitations */}
                {pendingCollectionInvitations.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text size="md" fontWeight="600" color="$color">
                      {t('routeCollections.pendingInvitations') || 'Pending Invitations'} ({pendingCollectionInvitations.length}):
                    </Text>
                    {pendingCollectionInvitations.map((invitation) => (
                      <XStack key={invitation.id} gap="$2" alignItems="center">
                        <YStack flex={1}>
                          <Text fontSize="$4" fontWeight="600" color="$color">
                            {invitation.metadata?.targetUserName || invitation.email}
                          </Text>
                          <Text fontSize="$3" color="$gray11">
                            {invitation.email} • {new Date(invitation.created_at).toLocaleDateString()}
                          </Text>
                          {invitation.metadata?.customMessage && (
                            <Text fontSize="$2" color="$gray9" fontStyle="italic">
                              Message: "{invitation.metadata.customMessage}"
                            </Text>
                          )}
                        </YStack>
                        <Text fontSize="$3" color="$orange10" fontWeight="600">
                          PENDING
                        </Text>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const { error } = await supabase
                                .from('pending_invitations')
                                .update({ 
                                  status: 'cancelled',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', invitation.id);

                              if (error) {
                                console.error('Error cancelling invitation:', error);
                                return;
                              }

                              await loadPendingCollectionInvitations();
                            } catch (error) {
                              console.error('Error removing invitation:', error);
                            }
                          }}
                          style={{ 
                            padding: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 8,
                            marginLeft: 8
                          }}
                          activeOpacity={0.6}
                        >
                          <Feather name="trash-2" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </XStack>
                    ))}
                  </YStack>
                )}
                
                {/* Show selected users */}
                {selectedUsers.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text size="md" fontWeight="600" color="$color">
                      {t('routeCollections.selectedUsers') || 'Selected Users'} ({selectedUsers.length}):
                    </Text>
                    {selectedUsers.map((user) => (
                      <RadioButton
                        key={user.id}
                        onPress={() => {
                          setSelectedUsers(prev => 
                            prev.filter(u => u.id !== user.id)
                          );
                        }}
                        title={user.full_name || user.email}
                        description={`${user.email} • ${user.role || 'user'} • ${t('routeCollections.tapToRemove') || 'Tap to remove'}`}
                        isSelected={true}
                      />
                    ))}
                    
                    {/* Show custom message if provided */}
                    {sharingCustomMessage.trim() && (
                      <YStack gap="$1" marginTop="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                        <Text size="sm" color="$gray11" fontWeight="600">Your message:</Text>
                        <Text size="sm" color="$color" fontStyle="italic">
                          "{sharingCustomMessage.trim()}"
                        </Text>
                      </YStack>
                    )}
                  </YStack>
                )}
                
                {/* Custom message input */}
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray11">{t('routeCollections.optionalMessage') || 'Optional message:'}</Text>
                  <TextInput
                    value={sharingCustomMessage}
                    onChangeText={setSharingCustomMessage}
                    placeholder={t('routeCollections.messagePlaceholder') || 'Add a personal message...'}
                    multiline
                    style={{
                      backgroundColor: colorScheme === 'dark' ? '#1C1C1C' : '#fff',
                      color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C',
                      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 60,
                      textAlignVertical: 'top',
                    }}
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
                  />
                </YStack>
                
                <Input
                  placeholder={t('routeCollections.searchUsers') || 'Search by name or email...'}
                  value={sharingSearchQuery}
                  onChangeText={handleSharingSearchUsers}
                  backgroundColor="$background"
                  borderColor="$borderColor"
                  color="$color"
                  placeholderTextColor="$gray10"
                />
                
                <ScrollView style={{ flex: 1, maxHeight: 200 }}>
                  <YStack gap="$2">
                    {sharingSearchResults.length === 0 && sharingSearchQuery.length >= 2 && (
                      <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                        {t('routeCollections.noUsersFound') || 'No users found'}
                      </Text>
                    )}
                    
                    {sharingSearchResults.length === 0 && sharingSearchQuery.length < 2 && (
                      <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$4">
                        {t('routeCollections.startTyping') || 'Start typing to search for users'}
                      </Text>
                    )}
                    
                    {sharingSearchResults.map((user) => {
                      const isSelected = selectedUsers.some(u => u.id === user.id);
                      return (
                        <TouchableOpacity
                          key={user.id}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                            } else {
                              setSelectedUsers(prev => [...prev, user]);
                            }
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? '#00E6C3' : '#ccc',
                            backgroundColor: isSelected ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                            marginVertical: 4,
                          }}
                        >
                          <XStack gap={8} alignItems="center">
                            <YStack flex={1}>
                              <Text color="$color" fontSize={14} fontWeight="600">
                                {user.full_name || 'Unknown User'}
                              </Text>
                              <Text fontSize={12} color="$gray11">
                                {user.email} • {user.role}
                              </Text>
                            </YStack>
                            {isSelected ? (
                              <Feather name="check" size={16} color="#00E6C3" />
                            ) : (
                              <Feather name="plus-circle" size={16} color="#ccc" />
                            )}
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                </ScrollView>
                
                <YStack gap="$2">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleCreateCollectionSharing}
                    disabled={selectedUsers.length === 0}
                  >
                    {t('routeCollections.sendInvitations') || 'Send Invitations'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onPress={hideSharingSheet}
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                </YStack>
              </YStack>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
      );
    })()}
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
      selectedCollectionId={selectedCollectionId}
      onRouteAdded={onRouteAdded}
      onRouteRemoved={onRouteRemoved}
      onPresetCreated={onPresetCreated}
    />
  );
}
