import React, { useState } from 'react';
import { View, StyleSheet, Modal, Alert } from 'react-native';
import { Text, YStack, XStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { useUserCollections } from '../hooks/useUserCollections';

interface CollectionInvitation {
  id: string;
  preset_id: string;
  collection_name: string;
  invited_by_name: string;
  role: string;
  message?: string;
  created_at: string;
}

interface CollectionInvitationModalProps {
  visible: boolean;
  onClose: () => void;
  invitation: CollectionInvitation | null;
  onInvitationHandled: () => void;
}

export function CollectionInvitationModal({
  visible,
  onClose,
  invitation,
  onInvitationHandled,
}: CollectionInvitationModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refetch: loadCollections } = useUserCollections();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!invitation) return null;

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      console.log('✅ [CollectionInvitationModal] Accepting invitation:', invitation.id);
      
      // Update invitation status to accepted
      const { error: updateError } = await supabase
        .from('collection_invitations')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('❌ [CollectionInvitationModal] Error accepting invitation:', updateError);
        throw updateError;
      }

      // The trigger will automatically add the user to the collection
      console.log('✅ [CollectionInvitationModal] Invitation accepted successfully');
      
      showToast({
        type: 'success',
        message: t('collections.invitationAccepted') || 'Invitation accepted! You are now a member of this collection.',
      });

      // Refresh collections data
      await loadCollections();
      
      onInvitationHandled();
      onClose();
    } catch (error) {
      console.error('❌ [CollectionInvitationModal] Error accepting invitation:', error);
      showToast({
        type: 'error',
        message: t('collections.invitationAcceptError') || 'Failed to accept invitation. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      console.log('❌ [CollectionInvitationModal] Declining invitation:', invitation.id);
      
      // Update invitation status to declined
      const { error: updateError } = await supabase
        .from('collection_invitations')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('❌ [CollectionInvitationModal] Error declining invitation:', updateError);
        throw updateError;
      }

      console.log('✅ [CollectionInvitationModal] Invitation declined successfully');
      
      showToast({
        type: 'info',
        message: t('collections.invitationDeclined') || 'Invitation declined.',
      });

      onInvitationHandled();
      onClose();
    } catch (error) {
      console.error('❌ [CollectionInvitationModal] Error declining invitation:', error);
      showToast({
        type: 'error',
        message: t('collections.invitationDeclineError') || 'Failed to decline invitation. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      console.log('📁 [CollectionInvitationModal] Archiving invitation:', invitation.id);
      
      // Update invitation status to archived
      const { error: updateError } = await supabase
        .from('collection_invitations')
        .update({ 
          status: 'archived',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('❌ [CollectionInvitationModal] Error archiving invitation:', updateError);
        throw updateError;
      }

      console.log('✅ [CollectionInvitationModal] Invitation archived successfully');
      
      showToast({
        type: 'info',
        message: t('collections.invitationArchived') || 'Invitation archived.',
      });

      onInvitationHandled();
      onClose();
    } catch (error) {
      console.error('❌ [CollectionInvitationModal] Error archiving invitation:', error);
      showToast({
        type: 'error',
        message: t('collections.invitationArchiveError') || 'Failed to archive invitation. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'read': return t('collections.roleRead') || 'Read Only';
      case 'write': return t('collections.roleWrite') || 'Read & Write';
      case 'admin': return t('collections.roleAdmin') || 'Administrator';
      default: return role;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <YStack space={20} padding={24}>
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$6" fontWeight="700" color="white">
                {t('collections.invitationTitle') || 'Collection Invitation'}
              </Text>
              <Button
                size="$2"
                backgroundColor="rgba(255,255,255,0.1)"
                onPress={onClose}
                disabled={isProcessing}
              >
                <Feather name="x" size={20} color="white" />
              </Button>
            </XStack>

            {/* Invitation Details */}
            <YStack space={16}>
              <View style={styles.invitationCard}>
                <YStack space={12}>
                  <Text fontSize="$5" fontWeight="600" color="white">
                    {invitation.collection_name}
                  </Text>
                  
                  <Text fontSize="$3" color="$gray10">
                    {t('collections.invitedBy') || 'Invited by'}: {invitation.invited_by_name}
                  </Text>
                  
                  <Text fontSize="$3" color="$gray10">
                    {t('collections.role') || 'Role'}: {getRoleDisplayName(invitation.role)}
                  </Text>
                  
                  {invitation.message && (
                    <Text fontSize="$3" color="$gray10" fontStyle="italic">
                      "{invitation.message}"
                    </Text>
                  )}
                  
                  <Text fontSize="$2" color="$gray11">
                    {t('collections.invitedOn') || 'Invited on'}: {new Date(invitation.created_at).toLocaleDateString()}
                  </Text>
                </YStack>
              </View>
            </YStack>

            {/* Action Buttons */}
            <YStack space={12}>
              <XStack space={12}>
                <Button
                  backgroundColor="#00E6C3"
                  color="#000000"
                  onPress={handleAccept}
                  disabled={isProcessing}
                  flex={1}
                  size="$4"
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="check" size={16} color="#000000" />
                    <Text color="#000000" fontWeight="600">
                      {isProcessing ? (t('common.processing') || 'Processing...') : (t('collections.accept') || 'Accept')}
                    </Text>
                  </XStack>
                </Button>

                <Button
                  backgroundColor="#CC4400"
                  color="white"
                  onPress={handleDecline}
                  disabled={isProcessing}
                  flex={1}
                  size="$4"
                >
                  <XStack gap="$2" alignItems="center">
                    <Feather name="x" size={16} color="white" />
                    <Text color="white" fontWeight="600">
                      {t('collections.decline') || 'Decline'}
                    </Text>
                  </XStack>
                </Button>
              </XStack>

              <Button
                backgroundColor="rgba(255,255,255,0.1)"
                color="white"
                onPress={handleArchive}
                disabled={isProcessing}
                size="$3"
              >
                <XStack gap="$2" alignItems="center">
                  <Feather name="archive" size={14} color="white" />
                  <Text color="white">
                    {t('collections.archive') || 'Archive'}
                  </Text>
                </XStack>
              </Button>
            </YStack>
          </YStack>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  invitationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});