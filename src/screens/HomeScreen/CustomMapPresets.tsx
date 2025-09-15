import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, useColorScheme } from 'react-native';
import { YStack, XStack, Text, Card, Button } from 'tamagui';
import { useTheme } from '@tamagui/core';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../../contexts/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import { useStudentSwitch } from '../../context/StudentSwitchContext';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { MapPresetSheetModal } from '../../components/MapPresetSheet';
import { CollectionSharingModal } from '../../components/CollectionSharingModal';
import { AddToPresetSheet } from '../../components/AddToPresetSheet';
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
  const { showToast } = useToast();
  const navigation = useNavigation<NavigationProp>();
  const colorScheme = useColorScheme();
  const theme = useTheme();

  const [presets, setPresets] = useState<MapPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [sharingPreset, setSharingPreset] = useState<MapPreset | null>(null);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const effectiveUserId = getEffectiveUserId();

  // Load user's custom presets (owned + shared/member)
  const loadPresets = useCallback(async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    try {
      console.log('🔍 [CustomMapPresets] Loading presets for user:', effectiveUserId);
      console.log('🔍 [CustomMapPresets] User context:', { 
        authUser: user?.id, 
        effectiveUserId,
        isViewingStudent: effectiveUserId !== user?.id 
      });
      
      // Get collections where user is creator OR member
      // First get collections where user is the creator
      const { data: ownedData, error: ownedError } = await supabase
        .from('map_presets')
        .select(`
          *,
          route_count:map_preset_routes(count)
        `)
        .eq('creator_id', effectiveUserId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('❌ [CustomMapPresets] Error loading owned presets:', ownedError);
        throw ownedError;
      }

      console.log('✅ [CustomMapPresets] Owned presets:', ownedData?.length || 0, ownedData);

      // Then get collections where user is a member (but not creator)
      const { data: memberData, error: memberError } = await supabase
        .from('map_preset_members')
        .select(`
          map_presets!inner(
            *,
            route_count:map_preset_routes(count)
          )
        `)
        .eq('user_id', effectiveUserId)
        .neq('map_presets.creator_id', effectiveUserId); // Exclude ones they already own

      if (memberError) {
        console.error('❌ [CustomMapPresets] Error loading member presets:', memberError);
        throw memberError;
      }

      console.log('✅ [CustomMapPresets] Member presets raw data:', memberData?.length || 0, memberData);

      // Combine the results
      const ownedPresets = ownedData || [];
      const memberPresets = memberData?.map(item => item.map_presets).filter(Boolean) || [];
      
      const allPresets = [...ownedPresets, ...memberPresets];
      
      // Sort combined results
      const data = allPresets.sort((a, b) => {
        // Default presets first
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        // Then by creation date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }).slice(0, 10); // Limit to 10

      console.log('✅ [CustomMapPresets] Loaded presets:', data?.length || 0);

      const transformedPresets = data?.map(preset => ({
        ...preset,
        route_count: preset.route_count?.[0]?.count || 0,
        is_owner: preset.creator_id === effectiveUserId, // Add flag to identify ownership
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
    console.log('🗺️ [CustomMapPresets] Preset clicked:', {
      id: preset.id,
      name: preset.name,
      visibility: preset.visibility,
      creator_id: preset.creator_id,
      effectiveUserId: effectiveUserId
    });
    console.log('🗺️ [CustomMapPresets] Navigating to MapScreen with preset:', preset.id, preset.name);
    setSelectedPresetId(preset.id);
    (navigation as any).navigate('MainTabs', {
      screen: 'MapTab',
      params: {
        screen: 'MapScreen',
        params: {
          selectedPresetId: preset.id,
          presetName: preset.name,
          fromHomeScreen: true, // Flag to indicate this came from home screen
        },
      },
    });
  }, [navigation, effectiveUserId]);

  // Handle edit preset
  const handleEditPreset = useCallback((preset: MapPreset) => {
    showModal(
      <MapPresetSheetModal
        onEditPreset={(updatedPreset) => {
          setPresets(prev => prev.map(p => p.id === updatedPreset.id ? updatedPreset : p));
          showToast({
            title: t('routeCollections.updated') || 'Collection Updated',
            message: t('routeCollections.collectionUpdated')?.replace('{name}', updatedPreset.name) || `Collection "${updatedPreset.name}" has been updated`,
            type: 'success'
          });
        }}
        showCreateOption={false}
        showEditOption={true}
        showDeleteOption={false}
        title={t('routeCollections.editCollection') || 'Edit Collection'}
      />
    );
  }, [showModal, showToast, t]);

  // Handle delete preset
  const handleDeletePreset = useCallback(async (preset: MapPreset) => {
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
  }, [effectiveUserId, showToast, t]);

  // Handle share preset
  const handleSharePreset = useCallback((preset: MapPreset) => {
    setSharingPreset(preset);
    setShowSharingModal(true);
  }, []);

  // Handle create new preset
  const handleCreatePreset = useCallback(() => {
    showModal(
      <AddToPresetSheet
        isVisible={true}
        onClose={() => {}}
        routeId="temp-route-id"
        onPresetCreated={(preset) => {
          setPresets(prev => [preset, ...prev]);
          showToast({
            title: t('routeCollections.created') || 'Collection Created',
            message: t('routeCollections.collectionCreated')?.replace('{name}', preset.name) || `Collection "${preset.name}" has been created`,
            type: 'success'
          });
        }}
      />
    );
  }, [showModal, showToast, t]);

  // Handle manage presets
  const handleManagePresets = useCallback(() => {
    showModal(
      <AddToPresetSheet
        isVisible={true}
        onClose={() => {}}
        routeId="temp-route-id"
        onPresetCreated={(preset) => {
          setPresets(prev => [preset, ...prev]);
          showToast({
            title: t('routeCollections.created') || 'Collection Created',
            message: t('routeCollections.collectionCreated')?.replace('{name}', preset.name) || `Collection "${preset.name}" has been created`,
            type: 'success'
          });
        }}
      />
    );
  }, [showModal, showToast, t]);

  // Handle collection selection (similar to CreateRouteScreen)
  const handleSelectCollection = useCallback(() => {
    setShowCollectionSelector(true);
  }, []);

  // Handle collection selected from AddToPresetSheet
  const handleCollectionSelected = useCallback((collectionId: string, collectionName: string) => {
    setSelectedCollectionId(collectionId);
    setShowCollectionSelector(false);
    showToast({
      title: t('routeCollections.collectionSelected') || 'Collection Selected',
      message: t('routeCollections.collectionSelectedMessage')?.replace('{collectionName}', collectionName) || `Selected "${collectionName}"`,
      type: 'success'
    });
  }, [showToast, t]);

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
              {t('routeCollections.myCollections') || 'My Collections'}
            </Text>
            <TouchableOpacity onPress={handleCreatePreset}>
              <Feather name="plus" size={20} color={theme.success?.val || '#00E6C3'} />
            </TouchableOpacity>
          </XStack>
          
          <YStack alignItems="center" gap="$3" padding="$4">
            <Feather name="map" size={48} color="$gray10" />
            <Text textAlign="center" color="$gray10" fontSize="$3">
              {t('routeCollections.noCollections') || 'No custom collections yet'}
            </Text>
            <Text textAlign="center" color="$gray10" fontSize="$2">
              {t('routeCollections.createFirst') || 'Create your first collection to organize routes'}
            </Text>
            <Button
              backgroundColor={theme.success?.val || '#00E6C3'}
              color="white"
              onPress={handleCreatePreset}
              size="$4"
            >
              <Text color="white" fontWeight="600">
                {t('routeCollections.createFirst') || 'Create First Collection'}
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
            {t('routeCollections.myCollections') || 'My Collections'}
          </Text>
          <XStack gap="$2">
            <TouchableOpacity onPress={handleCreatePreset}>
              <Feather name="plus" size={20} color={theme.success?.val || '#00E6C3'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleManagePresets}>
              <Feather name="settings" size={20} color="$gray10" />
            </TouchableOpacity>
          </XStack>
        </XStack>

        <YStack gap="$2">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const canEdit = preset.creator_id === effectiveUserId;
            
            return (
              <XStack key={preset.id} alignItems="center" gap="$2">
                <TouchableOpacity
                  onPress={() => handlePresetPress(preset)}
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                >
                  <Card
                    backgroundColor={isSelected ? "$backgroundHover" : "$background"}
                    borderColor={isSelected ? (theme.success?.val || '#00E6C3') : "$borderColor"}
                    borderWidth={1}
                    padding="$3"
                    borderRadius="$3"
                    pressStyle={{
                      backgroundColor: "$backgroundHover",
                      borderColor: theme.success?.val || '#00E6C3',
                    }}
                  >
                    <XStack alignItems="center" justifyContent="space-between" flex={1}>
                      <XStack alignItems="center" gap="$3" flex={1}>
                        <Card
                          backgroundColor={isSelected ? `${theme.success?.val || '#00E6C3'}25` : `${theme.success?.val || '#00E6C3'}1A`}
                          width={32}
                          height={32}
                          borderRadius="$6"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Feather
                            name={
                              preset.visibility === 'public' ? 'globe' :
                              preset.visibility === 'shared' ? 'users' : 'lock'
                            }
                            size={16}
                            color={theme.success?.val || '#00E6C3'}
                          />
                        </Card>
                        <YStack flex={1}>
                          <XStack alignItems="center" gap="$2">
                            <Text fontWeight="600" color="$color" numberOfLines={1}>
                              {preset.name}
                            </Text>
                            {preset.is_default && (
                              <Card
                                backgroundColor={theme.success?.val || '#00E6C3'}
                                paddingHorizontal="$2"
                                paddingVertical="$1"
                                borderRadius="$2"
                              >
                                <Text fontSize="$1" fontWeight="600" color="white">
                                  {t('routeCollections.default') || 'Default'}
                                </Text>
                              </Card>
                            )}
                          </XStack>
                          {preset.description && (
                            <Text fontSize="$2" color="$gray10" numberOfLines={1}>
                              {preset.description}
                            </Text>
                          )}
                          <Text fontSize="$1" color="$gray10">
                            {preset.route_count || 0} {t('routeCollections.routes') || 'routes'}
                          </Text>
                        </YStack>
                      </XStack>
                      <Feather name="chevron-right" size={16} color="$gray10" />
                    </XStack>
                  </Card>
                </TouchableOpacity>
                
                {/* Edit, Share and Delete buttons for user's own collections */}
                {canEdit && (
                  <XStack gap="$1">
                    <TouchableOpacity
                      onPress={() => handleEditPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Card
                        backgroundColor="$backgroundHover"
                        padding="$2"
                        borderRadius="$2"
                        pressStyle={{ backgroundColor: "$backgroundStrong" }}
                      >
                        <Feather name="edit-2" size={16} color="$color" />
                      </Card>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleSharePreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Card
                        backgroundColor="$backgroundHover"
                        padding="$2"
                        borderRadius="$2"
                        pressStyle={{ backgroundColor: "$backgroundStrong" }}
                      >
                        <Feather name="share-2" size={16} color="$color" />
                      </Card>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleDeletePreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Card
                        backgroundColor={`${theme.error?.val || '#EF4444'}1A`}
                        padding="$2"
                        borderRadius="$2"
                        pressStyle={{ backgroundColor: `${theme.error?.val || '#EF4444'}33` }}
                      >
                        <Feather name="trash-2" size={16} color={theme.error?.val || '#EF4444'} />
                      </Card>
                    </TouchableOpacity>
                  </XStack>
                )}
              </XStack>
            );
          })}
        </YStack>

        {/* Collection Selector Button (similar to CreateRouteScreen) */}
        <Button
          onPress={handleSelectCollection}
          backgroundColor="transparent"
          borderColor="$borderColor"
          borderWidth={1}
          size="md"
          width="100%"
        >
          <XStack gap="$2" alignItems="center">
            <Feather name="map" size={18} color="$color" />
            <Text color="$color">
              {selectedCollectionId 
                ? t('routeCollections.collectionSelected') || 'Collection Selected'
                : t('routeCollections.selectCollection') || 'Select Collection (Optional)'
              }
            </Text>
          </XStack>
        </Button>

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
              {t('routeCollections.viewAll') || 'View All Collections'}
            </Text>
          </Button>
        )}
      </YStack>

      {/* Collection Selector Sheet (similar to CreateRouteScreen) */}
      <AddToPresetSheet
        isVisible={showCollectionSelector}
        routeId="temp-route-id" // Use temp ID since this is for selection only
        selectedCollectionId={selectedCollectionId || undefined}
        onRouteAdded={handleCollectionSelected}
        onRouteRemoved={(presetId, presetName) => {
          if (selectedCollectionId === presetId) {
            setSelectedCollectionId(null);
            showToast({
              title: t('routeCollections.collectionRemoved') || 'Collection Removed',
              message: t('routeCollections.collectionRemovedMessage')?.replace('{collectionName}', presetName) || `Removed from "${presetName}"`,
              type: 'info'
            });
          }
        }}
        onPresetCreated={(preset) => {
          setSelectedCollectionId(preset.id);
          showToast({
            title: t('routeCollections.collectionCreated') || 'Collection Created',
            message: t('routeCollections.newCollectionCreated')?.replace('{collectionName}', preset.name) || `New collection "${preset.name}" has been created`,
            type: 'success'
          });
        }}
        onClose={() => setShowCollectionSelector(false)}
      />

      {/* Collection Sharing Modal */}
      {sharingPreset && (
        <CollectionSharingModal
          isVisible={showSharingModal}
          onClose={() => {
            setShowSharingModal(false);
            setSharingPreset(null);
          }}
          collectionId={sharingPreset.id}
          collectionName={sharingPreset.name}
          onInvitationSent={() => {
            showToast({
              title: t('routeCollections.invitationsSent') || 'Invitations Sent',
              message: t('routeCollections.invitationsSentMessage')?.replace('{count}', '1') || 'Invitation sent successfully',
              type: 'success'
            });
            setShowSharingModal(false);
            setSharingPreset(null);
          }}
        />
      )}
    </Card>
  );
};

// Styles removed - now using Tamagui components for consistent theming
