import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // Filter and search state
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'public' | 'shared'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  // Sharing state (similar to GettingStarted.tsx)
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [sharingSearchQuery, setSharingSearchQuery] = useState('');
  const [sharingSearchResults, setSharingSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; full_name: string; email: string; role?: string; sharingRole?: 'viewer' | 'editor' }>>([]);
  const [sharingCustomMessage, setSharingCustomMessage] = useState('');
  const [pendingCollectionInvitations, setPendingCollectionInvitations] = useState<any[]>([]);

  const effectiveUserId = getEffectiveUserId();

  // Filter and search presets
  const filteredPresets = useMemo(() => {
    let filtered = presets;

    // Apply filter
    switch (activeFilter) {
      case 'my':
        filtered = filtered.filter(preset => preset.creator_id === effectiveUserId);
        break;
      case 'public':
        filtered = filtered.filter(preset => preset.visibility === 'public');
        break;
      case 'shared':
        filtered = filtered.filter(preset => preset.visibility === 'shared');
        break;
      case 'all':
      default:
        // No filter
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(preset => 
        preset.name.toLowerCase().includes(query) ||
        (preset.description && preset.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [presets, activeFilter, searchQuery, effectiveUserId]);

  // Animation refs (matching GettingStarted.tsx pattern)
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;
  
  // Sharing modal animation refs
  const sharingBackdropOpacity = useRef(new Animated.Value(0)).current;
  const sharingSheetTranslateY = useRef(new Animated.Value(300)).current;

  // Load presets and check which ones contain this route
  const loadPresets = useCallback(async () => {
    console.log('🔍 [AddToPresetSheet] loadPresets called');
    console.log('🔍 [AddToPresetSheet] effectiveUserId:', effectiveUserId);
    console.log('🔍 [AddToPresetSheet] routeId:', routeId);
    
    if (!effectiveUserId || !routeId) {
      console.log('❌ [AddToPresetSheet] Missing effectiveUserId or routeId, returning');
      return;
    }

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

      console.log('🔍 [AddToPresetSheet] Loaded presets:', transformedPresets.length);
      console.log('🔍 [AddToPresetSheet] Presets data:', transformedPresets.map(p => ({ name: p.name, id: p.id, creator_id: p.creator_id, visibility: p.visibility })));
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
    console.log('🔍 [AddToPresetSheet] useEffect triggered - isVisible:', isVisible);
    if (isVisible) {
      console.log('🔍 [AddToPresetSheet] Sheet is visible, loading presets...');
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
      setPresets(prev => prev.filter(p => p.id !== preset.id));

      showToast({
        title: t('routeCollections.left') || 'Left Collection',
        message: t('routeCollections.leftMessage')?.replace('{name}', preset.name) || `You have left "${preset.name}"`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error leaving collection:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToLeave') || 'Failed to leave collection',
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

      // Add route to the new preset (only if routeId is a valid UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(routeId)) {
      const { error: addError } = await supabase
        .from('map_preset_routes')
        .insert({
          preset_id: newPreset.id,
          route_id: routeId,
          added_by: effectiveUserId,
          added_at: new Date().toISOString(),
        });

      if (addError) throw addError;
      }

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
  const showSharingSheet = (preset?: MapPreset) => {
    console.log('🎯 [AddToPresetSheet] showSharingSheet called');
    console.log('🎯 [AddToPresetSheet] editingPreset:', editingPreset?.name);
    console.log('🎯 [AddToPresetSheet] preset parameter:', preset?.name);
    console.log('🎯 [AddToPresetSheet] formData:', formData);
    console.log('🎯 [AddToPresetSheet] effectiveUserId:', effectiveUserId);
    console.log('🎯 [AddToPresetSheet] user:', user?.email);
    
    // Use the passed preset or the current editingPreset
    const targetPreset = preset || editingPreset;
    console.log('🎯 [AddToPresetSheet] targetPreset:', targetPreset?.name, 'ID:', targetPreset?.id);
    console.log('🎯 [AddToPresetSheet] targetPreset creator_id:', targetPreset?.creator_id);
    console.log('🎯 [AddToPresetSheet] Is current user creator?', targetPreset?.creator_id === effectiveUserId);
    
    // Ensure we have a collection ID
    if (!targetPreset?.id) {
      console.error('❌ [AddToPresetSheet] No collection ID available for sharing');
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.collectionNotFound') || 'Collection not found',
        type: 'error'
      });
      return;
    }
    
    // Set the editing preset if it wasn't already set
    if (!editingPreset && preset) {
      setEditingPreset(preset);
      setFormData({
        name: preset.name,
        description: preset.description || '',
        visibility: preset.visibility,
      });
    }
    
    console.log('🎯 [AddToPresetSheet] Setting showSharingModal to true');
    setShowSharingModal(true);
    // Load pending invitations for the current collection with the target preset
    console.log('🎯 [AddToPresetSheet] Loading pending invitations for collection:', targetPreset.id);
    loadPendingCollectionInvitations(targetPreset);
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

  // Load pending collection invitations and current members
  const loadPendingCollectionInvitations = async (preset?: MapPreset) => {
    console.log('🔍 [AddToPresetSheet] loadPendingCollectionInvitations called');
    console.log('🔍 [AddToPresetSheet] effectiveUserId:', effectiveUserId);
    console.log('🔍 [AddToPresetSheet] preset parameter:', preset?.name, 'ID:', preset?.id);
    console.log('🔍 [AddToPresetSheet] editingPreset:', editingPreset?.name, 'ID:', editingPreset?.id);
    
    if (!effectiveUserId) {
      console.log('❌ [AddToPresetSheet] No effectiveUserId, returning');
      return;
    }
    
    try {
      // Get the collection ID - use passed preset, editingPreset, or fallback
      const targetPreset = preset || editingPreset;
      const collectionId = targetPreset?.id;
      
      console.log('🔍 [AddToPresetSheet] targetPreset:', targetPreset?.name, 'ID:', collectionId);
      console.log('🔍 [AddToPresetSheet] targetPreset creator_id:', targetPreset?.creator_id);
      console.log('🔍 [AddToPresetSheet] Is current user creator?', targetPreset?.creator_id === effectiveUserId);
      
      if (!collectionId) {
        console.log('⚠️ [AddToPresetSheet] No collection ID available for loading invitations');
        console.log('⚠️ [AddToPresetSheet] preset parameter:', preset?.name);
        console.log('⚠️ [AddToPresetSheet] editingPreset:', editingPreset?.name);
        setPendingCollectionInvitations([]);
        return;
      }

      console.log('🔍 [AddToPresetSheet] Loading invitations for collection:', collectionId);
      console.log('🔍 [AddToPresetSheet] Current user ID:', effectiveUserId);

      // Load pending invitations - invitations sent BY the current user FOR this collection
      // OR invitations sent TO the current user FOR this collection
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('status', 'pending')
        .eq('role', 'collection_sharing')
        .or(`metadata->>collectionId.eq.${collectionId},metadata->>collectionId.eq."${collectionId}"`)
        .order('created_at', { ascending: false });

      console.log('🔍 [AddToPresetSheet] Pending invitations query result:', { pendingData, pendingError });

      if (pendingError) {
        console.error('Error loading pending collection invitations:', pendingError);
        return;
      }

      // Load current members (accepted invitations) - separate queries to avoid foreign key issues
      const { data: membersData, error: membersError } = await supabase
        .from('map_preset_members')
        .select('*')
        .eq('preset_id', collectionId)
        .order('joined_at', { ascending: false });

      // Get user details for each member
      let membersWithUsers = [];
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(member => member.user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (!usersError && usersData) {
          membersWithUsers = membersData.map(member => ({
            ...member,
            user: usersData.find(user => user.id === member.user_id)
          }));
        }
      }

      // Get creator information
      console.log('🔍 [AddToPresetSheet] Loading creator information for:', targetPreset.creator_id);
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', targetPreset.creator_id)
        .single();

      console.log('🔍 [AddToPresetSheet] Creator data:', creatorData);
      console.log('🔍 [AddToPresetSheet] Creator error:', creatorError);

      // Create creator entry
      const creatorEntry = creatorData ? {
        id: `creator-${targetPreset.creator_id}`,
        email: creatorData.email,
        status: 'creator',
        created_at: targetPreset.created_at,
        metadata: {
          targetUserName: creatorData.full_name || 'Unknown User',
          sharingRole: 'owner',
          collectionId: collectionId,
          targetUserId: targetPreset.creator_id,
        }
      } : null;

      console.log('🔍 [AddToPresetSheet] Creator entry:', creatorEntry);

      if (membersError) {
        console.error('Error loading collection members:', membersError);
        return;
      }

      // Transform members data to match invitation format for display
      const acceptedInvitations = membersWithUsers?.map(member => ({
        id: `member-${member.id}`,
        email: member.user?.email || 'Unknown',
        status: 'accepted',
        created_at: member.joined_at,
        metadata: {
          targetUserName: member.user?.full_name || 'Unknown User',
          sharingRole: member.role,
          collectionId: collectionId,
          targetUserId: member.user_id,
        }
      })) || [];

      // Combine creator, pending, and accepted invitations
      const allInvitations = [
        ...(creatorEntry ? [creatorEntry] : []),
        ...(pendingData || []),
        ...acceptedInvitations
      ];

      console.log('🔍 [AddToPresetSheet] Combined invitations:', {
        creator: creatorEntry ? 1 : 0,
        pending: pendingData?.length || 0,
        accepted: acceptedInvitations.length,
        total: allInvitations.length
      });
      console.log('🔍 [AddToPresetSheet] Pending data details:', pendingData);
      console.log('🔍 [AddToPresetSheet] Accepted invitations:', acceptedInvitations);

      setPendingCollectionInvitations(allInvitations);
      console.log('✅ [AddToPresetSheet] Loaded invitations:', {
        pending: pendingData?.length || 0,
        accepted: acceptedInvitations.length,
        total: allInvitations.length
      });
      console.log('✅ [AddToPresetSheet] Pending data details:', pendingData);
      console.log('✅ [AddToPresetSheet] All invitations:', allInvitations);
      console.log('✅ [AddToPresetSheet] Creator entry in final list:', creatorEntry);
    } catch (error) {
      console.error('Error loading collection invitations:', error);
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
        .or(`full_name.ilike.*${query}*,email.ilike.*${query}*`)
        .neq('id', effectiveUserId)
        .limit(10);

      if (error) throw error;
      setSharingSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users for sharing:', error);
    }
  };

  // Update invitation role
  const updateInvitationRole = async (invitationId: string, newRole: string) => {
    try {
      // Get current metadata first
      const { data: currentData, error: fetchError } = await supabase
        .from('pending_invitations')
        .select('metadata')
        .eq('id', invitationId)
        .single();

      if (fetchError) {
        console.error('Error fetching current invitation:', fetchError);
        return;
      }

      const currentMetadata = currentData?.metadata || {};
      const updatedMetadata = { ...currentMetadata, sharingRole: newRole };

      const { error } = await supabase
        .from('pending_invitations')
        .update({ 
          metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        console.error('Error updating invitation role:', error);
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.failedToUpdateRole') || 'Failed to update role',
          type: 'error'
        });
        return;
      }

      await loadPendingCollectionInvitations();
      showToast({
        title: t('routeCollections.roleUpdated') || 'Role Updated',
        message: t('routeCollections.roleUpdatedMessage') || 'Role has been updated',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating invitation role:', error);
    }
  };

  // Update member role
  const updateMemberRole = async (collectionId: string, userEmail: string, newRole: string) => {
    try {
      // First get the user ID from email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        console.error('Error finding user:', userError);
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.userNotFound') || 'User not found',
          type: 'error'
        });
        return;
      }

      // Update the member role
      const { error } = await supabase
        .from('map_preset_members')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('preset_id', collectionId)
        .eq('user_id', userData.id);

      if (error) {
        console.error('Error updating member role:', error);
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.failedToUpdateRole') || 'Failed to update role',
          type: 'error'
        });
        return;
      }

      await loadPendingCollectionInvitations();
      showToast({
        title: t('routeCollections.roleUpdated') || 'Role Updated',
        message: t('routeCollections.roleUpdatedMessage') || 'Role has been updated',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating member role:', error);
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

      if (!collectionId) {
        console.error('❌ [AddToPresetSheet] No collection ID available for sharing');
        showToast({
          title: t('common.error') || 'Error',
          message: t('routeCollections.collectionNotFound') || 'Collection not found - please save the collection first',
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
          const { data: invitationData, error: inviteError } = await supabase
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
                sharingRole: targetUser.sharingRole || 'viewer',
              },
              status: 'pending',
            })
            .select('id')
            .single();

          let invitationId = invitationData?.id;

          // If there was a duplicate key error, try to find the existing invitation
          if (inviteError && inviteError.code === '23505') {
            console.log('⚠️ [AddToPresetSheet] Duplicate invitation, finding existing one for:', targetUser.email);
            const { data: existingInvitation, error: findError } = await supabase
              .from('pending_invitations')
              .select('id')
              .eq('email', targetUser.email.toLowerCase())
              .eq('invited_by', effectiveUserId)
              .eq('role', 'collection_sharing')
              .eq('metadata->>collectionId', collectionId)
              .eq('status', 'pending')
              .single();

            if (!findError && existingInvitation) {
              invitationId = existingInvitation.id;
              console.log('✅ [AddToPresetSheet] Found existing invitation ID:', invitationId);
            }
          } else if (inviteError) {
            console.error('Error creating collection sharing invitation:', inviteError);
            failCount++;
            continue;
          }

          if (!invitationId) {
            console.error('❌ [AddToPresetSheet] No invitation ID available for notification');
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
                collection_id: collectionId,
                invitation_id: invitationId, // Store the invitation ID
                from_user_id: effectiveUserId,
                from_user_name: user?.email,
                customMessage: sharingCustomMessage.trim() || undefined,
                sharingRole: targetUser.sharingRole || 'viewer',
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
                      <Text fontWeight="bold" fontSize="$5">{t('routeCollections.name') || 'Collection Name'}</Text>
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
                      <Text fontWeight="bold" fontSize="$5">{t('routeCollections.description') || 'Description (Optional)'}</Text>
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
                      <Text fontWeight="bold" fontSize="$5">{t('routeCollections.visibility') || 'Visibility'}</Text>
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
                            }}
                            title={option.label}
                            description={option.value === 'shared' ? (t('routeCollections.sharedDescription') || 'Share with specific users') : ''}
                            isSelected={formData.visibility === option.value}
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
                    <YStack gap="$3">
                      {/* Filter Chips */}
                      <YStack gap="$2">
                        <Text fontSize="$3" color="$gray11" fontWeight="500">
                          {t('routeCollections.filterBy') || 'Filter by:'}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <XStack gap="$2" paddingHorizontal="$1">
                            {[
                              { key: 'my', label: t('routeCollections.myCollections') || 'My Collections', icon: 'user' },
                              { key: 'public', label: t('routeCollections.public') || 'Public', icon: 'globe' },
                              { key: 'shared', label: t('routeCollections.shared') || 'Shared', icon: 'users' },
                              { key: 'all', label: t('routeCollections.all') || 'All', icon: 'grid' },
                            ].map((filter) => (
                              <TouchableOpacity
                                key={filter.key}
                                onPress={() => {
                                  console.log('🔍 [AddToPresetSheet] Filter changed to:', filter.key);
                                  setActiveFilter(filter.key as any);
                                }}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  borderRadius: 20,
                                  borderWidth: 1,
                                  borderColor: activeFilter === filter.key ? '#00E6C3' : (colorScheme === 'dark' ? '#666' : '#ccc'),
                                  backgroundColor: activeFilter === filter.key ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                                }}
                                activeOpacity={0.7}
                              >
                                <XStack alignItems="center" gap="$1">
                                  <Feather 
                                    name={filter.icon as any} 
                                    size={14} 
                                    color={activeFilter === filter.key ? '#00E6C3' : (colorScheme === 'dark' ? '#ECEDEE' : '#11181C')} 
                                  />
                                  <Text 
                                    fontSize="$2" 
                                    color={activeFilter === filter.key ? '#00E6C3' : (colorScheme === 'dark' ? '#ECEDEE' : '#11181C')}
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
                          placeholder={t('routeCollections.searchPlaceholder') || 'Search collections...'}
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
                          {t('routeCollections.showing') || 'Showing'} {filteredPresets.length} {t('routeCollections.of') || 'of'} {presets.length} {t('routeCollections.collections') || 'collections'}
                        </Text>
                        {(activeFilter !== 'all' || searchQuery.trim()) && (
                          <TouchableOpacity
                            onPress={() => {
                              console.log('🔍 [AddToPresetSheet] Clearing filters');
                              setActiveFilter('my');
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

                      {/* Collections List */}
                      <YStack gap="$2">
                        {filteredPresets.map((preset) => {
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
                                />
                              </YStack>
                              
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
                                    onPress={() => showSharingSheet(preset)}
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
                      </YStack>
                    </YStack>
                  )}
                </ScrollView>
              )}

              {/* Footer Buttons */}
              {showCreateForm ? (
                <YStack gap="$2">
                  <Button
                    variant="outlined"
                    size="lg"
                    onPress={handleCreateOrUpdatePreset}
                    disabled={!formData.name.trim()}
                  >
                    {editingPreset ? (t('common.update') || 'Update') : (t('common.create') || 'Create')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="lg"
                    onPress={resetForm}
                  >
                    {t('common.cancel')}
                  </Button>
                </YStack>
              ) : (
                <YStack gap="$2">
                  <Button
                    variant="outlined"
                    size="lg"
                    onPress={() => setShowCreateForm(true)}
                  >
                    {t('routeCollections.createNew') || 'Create New'}
                  </Button>
                  <Button
                    variant="outlined"
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
      console.log('🎯 [AddToPresetSheet] showSharingModal:', showSharingModal);
      console.log('🎯 [AddToPresetSheet] editingPreset:', editingPreset?.name, 'ID:', editingPreset?.id);
      console.log('🎯 [AddToPresetSheet] pendingCollectionInvitations count:', pendingCollectionInvitations.length);
      console.log('🎯 [AddToPresetSheet] effectiveUserId:', effectiveUserId);
      console.log('🎯 [AddToPresetSheet] user:', user?.email);
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

                {/* Show current user's role and collection info */}
                {editingPreset && (
                  <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                    <XStack alignItems="center" gap="$2">
                      <Feather 
                        name={editingPreset.creator_id === effectiveUserId ? "award" : "user"} 
                        size={16} 
                        color={editingPreset.creator_id === effectiveUserId ? "#FFD700" : "#00E6C3"} 
                      />
                      <Text fontSize="$4" fontWeight="600" color="$color">
                        {editingPreset.creator_id === effectiveUserId 
                          ? (t('routeCollections.youAreOwner') || 'You are the owner')
                          : (t('routeCollections.youAreMember') || 'You are a member')
                        }
                      </Text>
                    </XStack>
                    <Text fontSize="$3" color="$gray11">
                      {t('routeCollections.collectionName') || 'Collection'}: {editingPreset.name}
                    </Text>
                    <Text fontSize="$3" color="$gray11">
                      {t('routeCollections.visibility') || 'Visibility'}: {editingPreset.visibility}
                    </Text>
                    
                    {/* Show leave collection button if user is not the creator */}
                    {editingPreset.creator_id !== effectiveUserId && (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            const { error } = await supabase
                              .from('map_preset_members')
                              .delete()
                              .eq('preset_id', editingPreset.id)
                              .eq('user_id', effectiveUserId);

                            if (error) {
                              console.error('Error leaving collection:', error);
                              showToast({
                                title: t('common.error') || 'Error',
                                message: t('routeCollections.failedToLeave') || 'Failed to leave collection',
                                type: 'error'
                              });
                              return;
                            }

                            showToast({
                              title: t('routeCollections.left') || 'Left Collection',
                              message: t('routeCollections.leftMessage')?.replace('{name}', editingPreset.name) || `You have left "${editingPreset.name}"`,
                              type: 'success'
                            });
                            
                            // Close the sharing modal and refresh the main sheet
                            hideSharingSheet();
                            loadPresets();
                          } catch (error) {
                            console.error('Error leaving collection:', error);
                            showToast({
                              title: t('common.error') || 'Error',
                              message: t('routeCollections.failedToLeave') || 'Failed to leave collection',
                              type: 'error'
                            });
                          }
                        }}
                        style={{
                          marginTop: 8,
                          padding: 12,
                          backgroundColor: 'rgba(255, 193, 7, 0.1)',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#FFC107',
                        }}
                        activeOpacity={0.7}
                      >
                        <XStack alignItems="center" gap="$2" justifyContent="center">
                          <Feather name="log-out" size={16} color="#FFC107" />
                          <Text fontSize="$3" color="#FFC107" fontWeight="600">
                            {t('routeCollections.leaveCollection') || 'Leave Collection'}
                          </Text>
                        </XStack>
                      </TouchableOpacity>
                    )}
                  </YStack>
                )}

                {/* Show collection invitations and members */}
                {pendingCollectionInvitations.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text fontSize="$4" fontWeight="600" color="$color">
                      {t('routeCollections.collectionMembers') || 'Collection Members'} ({pendingCollectionInvitations.length}):
                    </Text>
                    {pendingCollectionInvitations.map((invitation) => {
                      console.log('🎯 [AddToPresetSheet] Rendering invitation:', invitation.id, 'Status:', invitation.status, 'Email:', invitation.email);
                      const isPending = invitation.status === 'pending';
                      const isAccepted = invitation.status === 'accepted';
                      const isCreator = invitation.status === 'creator';
                      const currentRole = invitation.metadata?.sharingRole || 'viewer';
                      const isCurrentUser = invitation.metadata?.targetUserId === effectiveUserId;
                      
                      return (
                        <XStack key={invitation.id} gap="$2" alignItems="center" padding="$2" backgroundColor="$background" borderRadius="$3">
                          <YStack flex={1}>
                            <Text fontSize="$4" fontWeight="600" color="$color">
                              {invitation.metadata?.targetUserName || invitation.email}
                            </Text>
                            <Text fontSize="$3" color="$gray11">
                              {invitation.email} • {new Date(invitation.created_at).toLocaleDateString()}
                            </Text>
                            <Text fontSize="$2" color="$gray10">
                              {isCreator 
                                ? (t('routeCollections.statusCreator') || 'Status: Creator/Owner')
                                : isPending 
                                  ? (t('routeCollections.statusPending') || 'Status: Pending')
                                  : (t('routeCollections.statusAccepted') || 'Status: Accepted')
                              } • {t('routeCollections.currentRole') || 'Current Role'}: {currentRole}
                              {isCurrentUser && (
                                <Text fontSize="$2" color="#00E6C3" fontWeight="600"> • {t('routeCollections.you') || 'You'}</Text>
                              )}
                            </Text>
                            {invitation.metadata?.customMessage && (
                              <Text fontSize="$2" color="$gray9" fontStyle="italic">
                                Message: "{invitation.metadata.customMessage}"
                              </Text>
                            )}
                            
                            {/* Role Selection for pending and accepted (not for creator) */}
                            {!isCreator && (
                              <YStack gap="$1" marginTop="$2">
                                <Text fontSize="$2" color="$gray11">
                                  {t('routeCollections.role') || 'Role'}:
                                </Text>
                                <XStack gap="$2">
                                  <TouchableOpacity
                                    onPress={async () => {
                                      if (isPending) {
                                        // Update pending invitation role
                                        await updateInvitationRole(invitation.id, 'viewer');
                                      } else if (isAccepted) {
                                        // Update member role
                                        await updateMemberRole(invitation.metadata?.collectionId, invitation.email, 'viewer');
                                      }
                                    }}
                                    style={{
                                      padding: 6,
                                      borderRadius: 4,
                                      borderWidth: 1,
                                      borderColor: currentRole === 'viewer' ? '#00E6C3' : '#ccc',
                                      backgroundColor: currentRole === 'viewer' ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text fontSize="$2" color="$color" textAlign="center">
                                      {t('routeCollections.roleViewer') || 'Viewer'}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={async () => {
                                      if (isPending) {
                                        // Update pending invitation role
                                        await updateInvitationRole(invitation.id, 'editor');
                                      } else if (isAccepted) {
                                        // Update member role
                                        await updateMemberRole(invitation.metadata?.collectionId, invitation.email, 'editor');
                                      }
                                    }}
                                    style={{
                                      padding: 6,
                                      borderRadius: 4,
                                      borderWidth: 1,
                                      borderColor: currentRole === 'editor' ? '#00E6C3' : '#ccc',
                                      backgroundColor: currentRole === 'editor' ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text fontSize="$2" color="$color" textAlign="center">
                                      {t('routeCollections.roleEditor') || 'Editor'}
                                    </Text>
                                  </TouchableOpacity>
                                </XStack>
                              </YStack>
                            )}
                          </YStack>
                          
                          <YStack alignItems="center" gap="$2">
                            <Text fontSize="$3" color={
                              isCreator ? "#FFD700" : 
                              isPending ? "$orange10" : 
                              "$green10"
                            } fontWeight="600">
                              {isCreator ? 'CREATOR' : isPending ? 'PENDING' : 'ACCEPTED'}
                            </Text>
                            
                            {/* Action buttons - only for non-creator members */}
                            {!isCreator && (
                              <XStack gap="$1">
                                {isPending && (
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
                                        showToast({
                                          title: t('common.error') || 'Error',
                                          message: t('routeCollections.failedToCancelInvitation') || 'Failed to cancel invitation',
                                          type: 'error'
                                        });
                                        return;
                                      }

                                      await loadPendingCollectionInvitations();
                                      showToast({
                                        title: t('routeCollections.invitationCancelled') || 'Invitation Cancelled',
                                        message: t('routeCollections.invitationCancelledMessage') || 'Invitation has been cancelled',
                                        type: 'success'
                                      });
                                    } catch (error) {
                                      console.error('Error removing invitation:', error);
                                    }
                                  }}
                                  style={{ 
                                    padding: 8,
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 6,
                                  }}
                                  activeOpacity={0.6}
                                >
                                  <Feather name="x" size={14} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                              
                              {isAccepted && (
                                <TouchableOpacity
                                  onPress={async () => {
                                    try {
                                      // Remove from collection members
                                      const { error } = await supabase
                                        .from('map_preset_members')
                                        .delete()
                                        .eq('preset_id', invitation.metadata?.collectionId)
                                        .eq('user_id', invitation.metadata?.targetUserId);

                                      if (error) {
                                        console.error('Error removing member:', error);
                                        showToast({
                                          title: t('common.error') || 'Error',
                                          message: t('routeCollections.failedToRemoveMember') || 'Failed to remove member',
                                          type: 'error'
                                        });
                                        return;
                                      }

                                      await loadPendingCollectionInvitations();
                                      showToast({
                                        title: t('routeCollections.memberRemoved') || 'Member Removed',
                                        message: t('routeCollections.memberRemovedMessage') || 'Member has been removed from collection',
                                        type: 'success'
                                      });
                                    } catch (error) {
                                      console.error('Error removing member:', error);
                                    }
                                  }}
                                  style={{ 
                                    padding: 8,
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 6,
                                  }}
                                  activeOpacity={0.6}
                                >
                                  <Feather name="user-minus" size={14} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                              </XStack>
                            )}
                          </YStack>
                        </XStack>
                      );
                    })}
                  </YStack>
                )}
                
                {/* Show selected users */}
                {selectedUsers.length > 0 && (
                  <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
                    <Text fontSize="$4" fontWeight="600" color="$color">
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
                        <Text fontSize="$3" color="$gray11" fontWeight="600">Your message:</Text>
                        <Text fontSize="$3" color="$color" fontStyle="italic">
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
                    variant="outlined"
                    size="lg"
                    onPress={handleCreateCollectionSharing}
                    disabled={selectedUsers.length === 0}
                  >
                    {t('routeCollections.sendInvitations') || 'Send Invitations'}
                  </Button>
                  <Button
                    variant="outlined"
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
