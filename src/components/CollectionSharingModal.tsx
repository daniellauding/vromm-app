import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  useColorScheme,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Text, XStack, YStack, Input, useTheme } from 'tamagui';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../context/AuthContext';
import { useStudentSwitch } from '../context/StudentSwitchContext';
import { useToast } from '../contexts/ToastContext';
import { useModal } from '../contexts/ModalContext';
import { supabase } from '../lib/supabase';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const { height } = Dimensions.get('window');

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

interface CollectionSharingModalProps {
  visible: boolean;
  onClose: () => void;
  preset: MapPreset;
  onInvitationsSent?: () => void;
}

export function CollectionSharingModal({
  visible,
  onClose,
  preset,
  onInvitationsSent,
}: CollectionSharingModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getEffectiveUserId } = useStudentSwitch();
  const { showToast } = useToast();
  const { hideModal } = useModal();
  const theme = useTheme();

  const [sharingSearchQuery, setSharingSearchQuery] = useState('');
  const [sharingSearchResults, setSharingSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; full_name: string; email: string; role?: string; sharingRole?: 'viewer' | 'editor' }>>([]);
  const [sharingCustomMessage, setSharingCustomMessage] = useState('');
  const [pendingCollectionInvitations, setPendingCollectionInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Snap points for resizing (like RouteDetailSheet)
  const snapPoints = useMemo(() => {
    const points = {
      large: height * 0.1,   // Top at 10% of screen (show 90% - largest)
      medium: height * 0.4,  // Top at 40% of screen (show 60% - medium)  
      small: height * 0.7,   // Top at 70% of screen (show 30% - small)
      tiny: height * 0.85,   // Top at 85% of screen (show 15% - just title)
      dismissed: height,     // Completely off-screen
    };
    return points;
  }, [height]);
  
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints.large);
  const currentState = useSharedValue(snapPoints.large);
  const translateY = useSharedValue(snapPoints.large);
  const isDragging = React.useRef(false);

  const effectiveUserId = getEffectiveUserId();

  // Proper close function that handles both modal context and callback
  const handleClose = useCallback(() => {
    console.log('🎯 [CollectionSharingModal] handleClose called');
    hideModal();
    onClose();
  }, [hideModal, onClose]);

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
    setTimeout(() => handleClose(), 200);
  }, [handleClose, snapPoints.dismissed]);

  const snapTo = useCallback((point: number) => {
    currentState.value = point;
    setCurrentSnapPoint(point);
  }, [currentState]);

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
      
      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, snapPoints.large),
        snapPoints.tiny,
      );
      
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

  // Load pending collection invitations and current members
  const loadPendingCollectionInvitations = useCallback(async () => {
    if (!effectiveUserId || !preset?.id) return;

    try {
      setLoading(true);
      console.log('🔍 [CollectionSharingModal] Loading invitations for collection:', preset.id);

      // Load pending invitations
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('status', 'pending')
        .eq('role', 'collection_sharing')
        .or(`metadata->>collectionId.eq.${preset.id},metadata->>collectionId.eq."${preset.id}"`)
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error loading pending collection invitations:', pendingError);
        return;
      }

      // Load current members
      const { data: membersData, error: membersError } = await supabase
        .from('map_preset_members')
        .select('*')
        .eq('preset_id', preset.id)
        .order('joined_at', { ascending: false });

      console.log('🔍 [CollectionSharingModal] Fresh members data:', membersData);

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
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', preset.creator_id)
        .single();

      // Create creator entry
      const creatorEntry = creatorData ? {
        id: `creator-${preset.creator_id}`,
        email: creatorData.email,
        status: 'creator',
        created_at: preset.created_at,
        metadata: {
          targetUserName: creatorData.full_name || 'Unknown User',
          sharingRole: 'owner',
          collectionId: preset.id,
          targetUserId: preset.creator_id,
        }
      } : null;

      // Transform members data to match invitation format
      const acceptedInvitations = membersWithUsers?.map(member => ({
        id: `member-${member.id}`,
        email: member.user?.email || 'Unknown',
        status: 'accepted',
        created_at: member.joined_at,
        metadata: {
          targetUserName: member.user?.full_name || 'Unknown User',
          sharingRole: member.role,
          collectionId: preset.id,
          targetUserId: member.user_id,
        }
      })) || [];

      // Combine creator, pending, and accepted invitations
      const allInvitations = [
        ...(creatorEntry ? [creatorEntry] : []),
        ...(pendingData || []),
        ...acceptedInvitations
      ];

      setPendingCollectionInvitations(allInvitations);
      console.log('✅ [CollectionSharingModal] Loaded invitations:', allInvitations.length);
    } catch (error) {
      console.error('Error loading collection invitations:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, preset?.id]);

  // Search users for sharing
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

  // Update user role in collection
  const handleUpdateUserRole = async (userId: string, newRole: 'viewer' | 'editor') => {
    if (!preset?.id) return;

    try {
      console.log('🔄 [CollectionSharingModal] Updating role for user:', userId, 'to:', newRole);
      
      const { error } = await supabase
        .from('map_preset_members')
        .update({ role: newRole })
        .eq('preset_id', preset.id)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [CollectionSharingModal] Error updating role:', error);
        throw error;
      }

      console.log('✅ [CollectionSharingModal] Role updated successfully');

      showToast({
        title: t('routeCollections.roleUpdated') || 'Role Updated',
        message: t('routeCollections.roleUpdatedMessage') || 'User role has been updated successfully',
        type: 'success'
      });

      // Force refresh the data with a small delay to ensure database consistency
      setTimeout(async () => {
        await loadPendingCollectionInvitations();
      }, 100);
    } catch (error) {
      console.error('❌ [CollectionSharingModal] Error updating user role:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToUpdateRole') || 'Failed to update user role',
        type: 'error'
      });
    }
  };

  // Cancel pending invitation
  const handleCancelInvitation = async (userId: string, userName: string) => {
    if (!preset?.id) return;

    try {
      console.log('🚫 [CollectionSharingModal] Canceling invitation for user:', userId);
      
      // Remove pending invitation
      const { error: inviteError } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('metadata->>collectionId', preset.id)
        .eq('metadata->>targetUserId', userId)
        .eq('status', 'pending');

      if (inviteError) {
        console.error('❌ [CollectionSharingModal] Error canceling invitation:', inviteError);
        throw inviteError;
      }

      console.log('✅ [CollectionSharingModal] Invitation canceled successfully');

      showToast({
        title: t('collectionMembers.invitationCanceled') || 'Invitation Canceled',
        message: t('collectionMembers.invitationCanceledMessage')?.replace('{userName}', userName) || `Invitation for ${userName} has been canceled`,
        type: 'success'
      });

      // Refresh the data
      await loadPendingCollectionInvitations();
    } catch (error) {
      console.error('❌ [CollectionSharingModal] Error canceling invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionMembers.failedToCancelInvitation') || 'Failed to cancel invitation',
        type: 'error'
      });
    }
  };

  // Remove user from collection
  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!preset?.id) return;

    try {
      console.log('🗑️ [CollectionSharingModal] Removing user from collection:', userId);
      
      // Remove from map_preset_members
      const { error: memberError } = await supabase
        .from('map_preset_members')
        .delete()
        .eq('preset_id', preset.id)
        .eq('user_id', userId);

      if (memberError) {
        console.error('❌ [CollectionSharingModal] Error removing member:', memberError);
        throw memberError;
      }

      // Also remove any pending invitations for this user
      const { error: inviteError } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('metadata->>collectionId', preset.id)
        .eq('metadata->>targetUserId', userId)
        .eq('status', 'pending');

      if (inviteError) {
        console.warn('⚠️ [CollectionSharingModal] Error removing pending invitation:', inviteError);
        // Don't throw here, as the main operation succeeded
      }

      console.log('✅ [CollectionSharingModal] User removed successfully');

      showToast({
        title: t('routeCollections.userRemoved') || 'User Removed',
        message: t('routeCollections.userRemovedMessage')?.replace('{userName}', userName) || `${userName} has been removed from the collection`,
        type: 'success'
      });

      // Refresh the data
      await loadPendingCollectionInvitations();
    } catch (error) {
      console.error('❌ [CollectionSharingModal] Error removing user:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToRemoveUser') || 'Failed to remove user from collection',
        type: 'error'
      });
    }
  };

  // Handle user leaving collection (for non-creators)
  const handleUserLeaveCollection = async (userId: string, userName: string, customMessage?: string) => {
    if (!preset?.id) return;

    try {
      // Remove from map_preset_members
      const { error: memberError } = await supabase
        .from('map_preset_members')
        .delete()
        .eq('preset_id', preset.id)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Create notification for collection owner
      const baseMessage = `A member has left your collection "${preset.name}".`;
      const fullMessage = customMessage?.trim() 
        ? `${baseMessage}\n\nPersonal message: "${customMessage.trim()}"`
        : baseMessage;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: preset.creator_id,
          actor_id: userId,
          type: 'collection_member_left',
          title: 'Member Left Collection',
          message: fullMessage,
          metadata: {
            collection_id: preset.id,
            collection_name: preset.name,
            member_id: userId,
            member_name: userName,
            custom_message: customMessage?.trim() || null,
          },
          action_url: 'vromm://collections',
          priority: 'normal',
          is_read: false,
        });

      if (notificationError) {
        console.warn('Failed to create leave notification:', notificationError);
      }

      showToast({
        title: t('routeCollections.leftCollection') || 'Left Collection',
        message: t('routeCollections.leftCollectionSuccess') || `You have left "${preset.name}".`,
        type: 'success'
      });

      // Refresh the data
      await loadPendingCollectionInvitations();
      
      // Close the modal if current user left
      if (userId === effectiveUserId) {
        handleClose();
      }
    } catch (error) {
      console.error('Error leaving collection:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToLeaveCollection') || 'Failed to leave collection',
        type: 'error'
      });
    }
  };

  // Create collection sharing invitations
  const handleCreateCollectionSharing = async () => {
    if (!effectiveUserId || selectedUsers.length === 0) return;

    try {
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;

      // Create invitations for each selected user
      for (const targetUser of selectedUsers) {
        if (!targetUser.email) {
          failCount++;
          continue;
        }
        
        try {
          // Check if user is already a member or has pending invitation
          const { data: existingMember } = await supabase
            .from('map_preset_members')
            .select('id')
            .eq('preset_id', preset.id)
            .eq('user_id', targetUser.id)
            .single();

          if (existingMember) {
            console.log('⚠️ [CollectionSharingModal] User is already a member:', targetUser.email);
            duplicateCount++;
            continue;
          }

          // Check for existing pending invitation
          const { data: existingInvitation } = await supabase
            .from('pending_invitations')
            .select('id')
            .eq('email', targetUser.email.toLowerCase())
            .eq('invited_by', effectiveUserId)
            .eq('role', 'collection_sharing')
            .eq('metadata->>collectionId', preset.id)
            .eq('status', 'pending')
            .single();

          if (existingInvitation) {
            console.log('⚠️ [CollectionSharingModal] Pending invitation already exists:', targetUser.email);
            duplicateCount++;
            continue;
          }

          // Create pending invitation for collection sharing
          const { data: invitationData, error: inviteError } = await supabase
            .from('pending_invitations')
            .insert({
              email: targetUser.email.toLowerCase(),
              role: 'collection_sharing',
              invited_by: effectiveUserId,
              metadata: {
                collectionId: preset.id,
                collectionName: preset.name,
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

          if (inviteError) {
            console.error('Error creating collection sharing invitation:', inviteError);
            failCount++;
            continue;
          }

          const invitationId = invitationData?.id;
          if (!invitationId) {
            failCount++;
            continue;
          }

          // Create notification for the target user
          const baseMessage = `${user?.email || 'Someone'} wants to share the collection "${preset.name}" with you`;
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
                collection_name: preset.name,
                collection_id: preset.id,
                invitation_id: invitationId,
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
        let message = `${successCount} invitation(s) sent successfully`;
        if (duplicateCount > 0) {
          message += ` (${duplicateCount} already invited or member)`;
        }
        if (failCount > 0) {
          message += ` (${failCount} failed)`;
        }
        
        showToast({
          title: t('routeCollections.invitationsSent') || 'Invitations Sent',
          message: message,
          type: 'success'
        });
      } else if (duplicateCount > 0) {
        showToast({
          title: t('routeCollections.noNewInvitations') || 'No New Invitations',
          message: `${duplicateCount} user(s) already invited or member`,
          type: 'info'
        });
      }
      
      // Refresh pending invitations
      await loadPendingCollectionInvitations();
      
      // Clear selections and close modal
      setSelectedUsers([]);
      setSharingCustomMessage('');
      setSharingSearchQuery('');
      setSharingSearchResults([]);
      
      onInvitationsSent?.();
      handleClose();
      
    } catch (error) {
      console.error('Error creating collection sharing invitations:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('routeCollections.failedToSendInvitations') || 'Failed to send invitations',
        type: 'error'
      });
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (visible && preset?.id) {
      loadPendingCollectionInvitations();
    }
  }, [visible, preset?.id, loadPendingCollectionInvitations]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      // Reset gesture translateY when opening and set to large snap point
      translateY.value = withSpring(snapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentState.value = snapPoints.large;
      setCurrentSnapPoint(snapPoints.large);
    }
  }, [visible, snapPoints.large, currentState]);

  if (!visible) {
    console.log('🎯 [CollectionSharingModal] Not visible, returning null');
    return null;
  }

  console.log('🎯 [CollectionSharingModal] RENDERING MODAL - visible is TRUE!');
  console.log('🎯 [CollectionSharingModal] Preset:', preset?.name, 'ID:', preset?.id);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end',
        zIndex: 9999
      }}>
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <GestureDetector gesture={panGesture}>
          <ReanimatedAnimated.View 
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: height,
                backgroundColor: theme.background?.val || '#fff',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              },
              animatedGestureStyle
            ]}
          >
            <YStack
              padding="$3"
              paddingBottom={24}
              gap="$3"
              flex={1}
            >
              {/* Drag Handle */}
              <View style={{
                alignItems: 'center',
                paddingVertical: 8,
                paddingBottom: 16,
              }}>
                <View style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.gray8?.val || '#CCC',
                }} />
              </View>

              {/* Header */}
              <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2">
                <Text fontSize="$6" fontWeight="bold" color="$color" flex={1} textAlign="center">
                  Share Collection
          </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    padding: 8,
                    backgroundColor: theme.backgroundHover?.val || '#F5F5F5',
                    borderRadius: 6,
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={20} color={theme.color?.val || '#11181C'} />
          </TouchableOpacity>
        </XStack>

              <Text fontSize="$3" color="$gray11" textAlign="center" paddingHorizontal="$2">
                Search for users to share this collection with
              </Text>

              {/* Show content only if not in tiny mode */}
              {currentSnapPoint !== snapPoints.tiny && (
                <View style={{ flex: 1 }}>
                  <ScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                  >
        <YStack gap="$4">
          

          {/* Show current user's role and collection info */}
          {preset && (
            <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
              <XStack alignItems="center" gap="$2">
                <Feather 
                  name={preset.creator_id === effectiveUserId ? "award" : "user"} 
                  size={16} 
                  color={preset.creator_id === effectiveUserId ? "#FFD700" : "#00E6C3"} 
                />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  {preset.creator_id === effectiveUserId 
                    ? (t('routeCollections.youAreOwner') || 'You are the owner')
                    : (t('routeCollections.youAreMember') || 'You are a member')
                  }
                </Text>
              </XStack>
              <Text fontSize="$3" color="$gray11">
                {t('routeCollections.collectionName') || 'Collection'}: {preset.name}
              </Text>
              <XStack gap="$4" alignItems="center">
                <Text fontSize="$3" color="$gray11">
                  {t('routeCollections.visibility') || 'Visibility'}: {preset.visibility}
                </Text>
                {preset.route_count !== undefined && (
                  <Text fontSize="$3" color="$gray11">
                    {t('routeCollections.routeCount') || 'Routes'}: {preset.route_count}
                  </Text>
                )}
              </XStack>
            </YStack>
          )}

          {/* Show collection invitations and members */}
          {pendingCollectionInvitations.length > 0 && (
            <YStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
              <Text fontSize="$4" fontWeight="600" color="$color">
                {t('routeCollections.collectionMembers') || 'Collection Members'} ({pendingCollectionInvitations.length}):
              </Text>
              {pendingCollectionInvitations.map((invitation) => {
                const isPending = invitation.status === 'pending';
                const isAccepted = invitation.status === 'accepted';
                const isCreator = invitation.status === 'creator';
                const currentRole = invitation.metadata?.sharingRole || 'viewer';
                const isCurrentUser = invitation.metadata?.targetUserId === effectiveUserId;
                const isOwner = preset?.creator_id === effectiveUserId;
                const canManage = isOwner && !isCreator && !isCurrentUser;

                console.log('🔍 [CollectionSharingModal] User role debug:', {
                  userId: invitation.metadata?.targetUserId,
                  currentRole,
                  isCurrentUser,
                  isOwner,
                  canManage,
                  invitationStatus: invitation.status
                });
                
                return (
                  <YStack key={invitation.id} gap="$2" padding="$3" backgroundColor="$background" borderRadius="$3" borderWidth={1} borderColor="$borderColor">
                    <XStack alignItems="center" justifyContent="space-between">
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$2">
                          <Feather 
                            name={isCreator ? "award" : isPending ? "clock" : "user-check"} 
                            size={16} 
                            color={isCreator ? "#FFD700" : isPending ? "#FFA500" : "#00E6C3"} 
                          />
                          <Text fontSize="$4" fontWeight="600" color="$color">
                            {invitation.metadata?.targetUserName || invitation.email}
                          </Text>
                          {isCurrentUser && (
                            <Text fontSize="$2" color="#00E6C3" fontWeight="600">
                              ({t('routeCollections.you') || 'You'})
                            </Text>
                          )}
                        </XStack>
                        <Text fontSize="$3" color="$gray11" marginTop="$1">
                          {invitation.email}
            </Text>
                        <Text fontSize="$2" color="$gray10" marginTop="$1">
                          {new Date(invitation.created_at).toLocaleDateString()} • {currentRole}
            </Text>
          </YStack>

                      <YStack alignItems="center" gap="$1">
                        <Text fontSize="$2" color={
                          isCreator ? "#FFD700" : 
                          isPending ? "#FFA500" : 
                          "#00E6C3"
                        } fontWeight="600">
                          {isCreator ? 'OWNER' : isPending ? 'PENDING' : 'MEMBER'}
                        </Text>
                      </YStack>
                    </XStack>

                    {/* Role management for accepted members (not creator, not current user) */}
                    {isAccepted && canManage && (
                      <YStack gap="$2" marginTop="$2">
                        <Text fontSize="$3" color="$gray11" fontWeight="500">
                          {t('roleManagement.title') || 'Change Role'}:
                        </Text>
                        <XStack gap="$2" flexWrap="wrap" alignItems="center">
                          <TouchableOpacity
                            onPress={() => handleUpdateUserRole(invitation.metadata?.targetUserId, 'viewer')}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: currentRole === 'viewer' ? '#00E6C3' : 'transparent',
                              borderWidth: 2,
                              borderColor: currentRole === 'viewer' ? '#00E6C3' : '#666',
                              minWidth: 80,
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <Text 
                              color={currentRole === 'viewer' ? '#000000' : '#ECEDEE'} 
                              fontWeight={currentRole === 'viewer' ? '600' : '500'}
                              fontSize={14}
                            >
                              {t('roleManagement.viewer') || 'Viewer'}
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => handleUpdateUserRole(invitation.metadata?.targetUserId, 'editor')}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: currentRole === 'editor' ? '#00E6C3' : 'transparent',
                              borderWidth: 2,
                              borderColor: currentRole === 'editor' ? '#00E6C3' : '#666',
                              minWidth: 80,
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <Text 
                              color={currentRole === 'editor' ? '#000000' : '#ECEDEE'} 
                              fontWeight={currentRole === 'editor' ? '600' : '500'}
                              fontSize={14}
                            >
                              {t('roleManagement.editor') || 'Editor'}
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            onPress={() => handleRemoveUser(invitation.metadata?.targetUserId, invitation.metadata?.targetUserName || invitation.email)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderWidth: 1,
                              borderColor: '#EF4444',
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <Text color="#EF4444" fontWeight="500" fontSize={14}>
                              {t('collectionMembers.removeUser') || 'Remove'}
                            </Text>
                          </TouchableOpacity>
                        </XStack>
                      </YStack>
                    )}

                    {/* Leave Collection button for current user (if not creator) */}
                    {isAccepted && isCurrentUser && !isCreator && (
                      <YStack gap="$2" marginTop="$2">
                        <Text fontSize="$3" color="$gray11" fontWeight="500">
                          {t('routeCollections.yourMembership') || 'Your Membership'}:
                        </Text>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => handleUserLeaveCollection(invitation.metadata?.targetUserId, invitation.metadata?.targetUserName || invitation.email)}
                          style={{ borderColor: '#EF4444' }}
                        >
                          <XStack gap="$2" alignItems="center">
                            <Feather name="log-out" size={14} color="#EF4444" />
                            <Text color="#EF4444">
                              {t('routeCollections.leaveCollection') || 'Leave Collection'}
                            </Text>
                          </XStack>
                        </Button>
                      </YStack>
                    )}

                    {/* Pending invitation management */}
                    {isPending && canManage && (
                      <YStack gap="$2" marginTop="$2">
                        <Text fontSize="$3" color="$gray11" fontWeight="500">
                          {t('collectionMembers.pendingInvitation') || 'Pending Invitation'}:
                        </Text>
                        <XStack gap="$3" flexWrap="wrap" alignItems="center">
                          <Text fontSize="$3" color="$gray11">
                            {t('roleManagement.title') || 'Change Role'}:
                          </Text>
                          
                          {/* Role Toggle - Single toggle between Viewer/Editor */}
                          <XStack 
                            backgroundColor="$gray4" 
                            borderRadius={20} 
                            padding={2}
                            gap={0}
                          >
                            <TouchableOpacity
                              onPress={() => handleUpdateUserRole(invitation.metadata?.targetUserId, 'viewer')}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 18,
                                backgroundColor: currentRole === 'viewer' ? (theme.primary?.val || '#00E6C3') : 'transparent',
                                minWidth: 80,
                                alignItems: 'center',
                              }}
                              activeOpacity={0.7}
                            >
                              <Text 
                                color={currentRole === 'viewer' ? '#000000' : (theme.color?.val || '#666666')} 
                                fontWeight={currentRole === 'viewer' ? '600' : '500'}
                                fontSize={14}
                              >
                                {t('roleManagement.viewer') || 'Viewer'}
                              </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              onPress={() => handleUpdateUserRole(invitation.metadata?.targetUserId, 'editor')}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 18,
                                backgroundColor: currentRole === 'editor' ? (theme.primary?.val || '#00E6C3') : 'transparent',
                                minWidth: 80,
                                alignItems: 'center',
                              }}
                              activeOpacity={0.7}
                            >
                              <Text 
                                color={currentRole === 'editor' ? '#000000' : (theme.color?.val || '#666666')} 
                                fontWeight={currentRole === 'editor' ? '600' : '500'}
                                fontSize={14}
                              >
                                {t('roleManagement.editor') || 'Editor'}
                              </Text>
                            </TouchableOpacity>
                          </XStack>
                          
                          {/* Cancel Button */}
                          <TouchableOpacity
                            onPress={() => handleCancelInvitation(invitation.metadata?.targetUserId, invitation.metadata?.targetUserName || invitation.email)}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 20,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderWidth: 1,
                              borderColor: '#EF4444',
                              alignItems: 'center',
                            }}
                            activeOpacity={0.7}
                          >
                            <Text color="#EF4444" fontWeight="500" fontSize={14}>
                              {t('collectionMembers.cancelInvitation') || 'Cancel'}
                            </Text>
                          </TouchableOpacity>
                        </XStack>
                      </YStack>
                    )}
                  </YStack>
                );
              })}
            </YStack>
          )}
          
          {/* User Search Section */}
          <YStack gap="$2">
            <Text fontSize="$3" color="$gray11">{t('routeCollections.searchUsers') || 'Search for users:'}</Text>
            <Input
              placeholder={t('routeCollections.searchUsersPlaceholder') || 'Search by name or email...'}
              value={sharingSearchQuery}
              onChangeText={handleSharingSearchUsers}
              backgroundColor="$background"
              borderColor="$borderColor"
              color="$color"
              placeholderTextColor="$gray10"
            />
          </YStack>

          {/* Search Results */}
          {sharingSearchQuery.length >= 2 && (
            <ScrollView style={{ maxHeight: 200 }}>
              <YStack gap="$2">
                {sharingSearchResults.length === 0 ? (
                  <Text fontSize="$3" color="$gray11" textAlign="center" paddingVertical="$2">
                    {t('routeCollections.noUsersFound') || 'No users found'}
                  </Text>
                ) : (
                  sharingSearchResults.map((user) => {
                    const isSelected = selectedUsers.some(u => u.id === user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                          } else {
                            setSelectedUsers(prev => [...prev, { ...user, sharingRole: 'viewer' }]);
                          }
                        }}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? '#00E6C3' : '#ccc',
                          backgroundColor: isSelected ? 'rgba(0, 230, 195, 0.1)' : 'transparent',
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
                  })
                )}
              </YStack>
            </ScrollView>
          )}
          
          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <YStack gap="$2">
              <Text fontSize="$3" color="$gray11">
                {t('routeCollections.selectedUsers') || 'Selected Users'} ({selectedUsers.length}):
              </Text>
              {selectedUsers.map((user) => (
                <XStack key={user.id} alignItems="center" justifyContent="space-between" padding="$2" backgroundColor="$backgroundHover" borderRadius="$2">
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600" color="$color">
                      {user.full_name || 'Unknown User'}
                    </Text>
                    <Text fontSize="$2" color="$gray11">
                      {user.email} • {user.role}
            </Text>
                  </YStack>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
                    }}
                    style={{
                      padding: 8,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 6,
                    }}
                  >
                    <Feather name="x" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </XStack>
              ))}
            </YStack>
          )}
          
          {/* Custom Message */}
          <YStack gap="$2">
            <Text fontSize="$3" color="$gray11">{t('routeCollections.optionalMessage') || 'Optional message:'}</Text>
            <TextInput
              value={sharingCustomMessage}
              onChangeText={setSharingCustomMessage}
              placeholder={t('routeCollections.messagePlaceholder') || 'Add a personal message...'}
              multiline
              style={{
                backgroundColor: theme.background?.val || '#fff',
                color: theme.color?.val || '#11181C',
                borderColor: theme.borderColor?.val || 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={theme.gray10?.val || 'rgba(0, 0, 0, 0.3)'}
            />
          </YStack>

                      {/* Action Buttons */}
                               <YStack gap="$2">
            <Button
                                   variant="primary"
                                   size="lg"
                                   onPress={handleCreateCollectionSharing}
                                   disabled={selectedUsers.length === 0}
                                 >
                                   Send Invitations
            </Button>
            <Button
                                   variant="secondary"
                                   size="lg"
                                   onPress={handleClose}
                                 >
                                   Cancel
            </Button>
                               </YStack>
                    </YStack>
                  </ScrollView>
                </View>
              )}
        </YStack>
          </ReanimatedAnimated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}