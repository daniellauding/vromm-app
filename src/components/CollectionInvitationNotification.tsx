import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, XStack, YStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { collectionSharingService, CollectionInvitation } from '../services/collectionSharingService';
import { useAuth } from '../context/AuthContext';

interface CollectionInvitationNotificationProps {
  visible: boolean;
  onClose: () => void;
  onInvitationHandled?: () => void;
}

export function CollectionInvitationNotification({ 
  visible, 
  onClose, 
  onInvitationHandled 
}: CollectionInvitationNotificationProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [invitations, setInvitations] = useState<CollectionInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user?.id) {
      loadPendingInvitations();
    }
  }, [visible, user?.id]);

  const loadPendingInvitations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const pendingInvitations = await collectionSharingService.getPendingInvitations(user.id);
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user?.id) return;
    
    setProcessingInvitation(invitationId);
    try {
      const result = await collectionSharingService.acceptCollectionInvitation(invitationId, user.id);
      
      if (result.success) {
        showToast({
          title: t('collectionSharing.invitationAccepted') || 'Invitation Accepted',
          message: t('collectionSharing.youCanNowAccess') || 'You can now access this collection',
          type: 'success'
        });
        
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        onInvitationHandled?.();
      } else {
        showToast({
          title: t('common.error') || 'Error',
          message: result.error || t('collectionSharing.failedToAccept') || 'Failed to accept invitation',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionSharing.failedToAccept') || 'Failed to accept invitation',
        type: 'error'
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    if (!user?.id) return;
    
    setProcessingInvitation(invitationId);
    try {
      const result = await collectionSharingService.rejectCollectionInvitation(invitationId, user.id);
      
      if (result.success) {
        showToast({
          title: t('collectionSharing.invitationRejected') || 'Invitation Rejected',
          message: t('collectionSharing.invitationDeclined') || 'Invitation declined',
          type: 'info'
        });
        
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        onInvitationHandled?.();
      } else {
        showToast({
          title: t('common.error') || 'Error',
          message: result.error || t('collectionSharing.failedToReject') || 'Failed to reject invitation',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionSharing.failedToReject') || 'Failed to reject invitation',
        type: 'error'
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDismissAll = () => {
    Alert.alert(
      t('collectionSharing.dismissAll') || 'Dismiss All',
      t('collectionSharing.dismissAllConfirm') || 'Are you sure you want to dismiss all pending invitations?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('common.dismiss') || 'Dismiss', 
          style: 'destructive',
          onPress: () => {
            setInvitations([]);
            onClose();
          }
        }
      ]
    );
  };

  if (!visible || invitations.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <Text fontSize="$6" fontWeight="600" color="$color">
            {t('collectionSharing.collectionInvitations') || 'Collection Invitations'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#666" />
          </TouchableOpacity>
        </XStack>

        <YStack gap="$4" maxHeight={400}>
          {loading ? (
            <YStack alignItems="center" padding="$4">
              <Text color="$gray10">{t('common.loading') || 'Loading...'}</Text>
            </YStack>
          ) : (
            invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <Feather name="users" size={16} color="#00E6C3" />
                    <Text fontSize="$4" fontWeight="600" color="$color" flex={1}>
                      {invitation.collection_name}
                    </Text>
                  </XStack>
                  
                  <Text fontSize="$3" color="$gray10">
                    {t('collectionSharing.invitedBy')?.replace('{name}', invitation.invited_by_name) || 
                     `Invited by ${invitation.invited_by_name}`}
                  </Text>
                  
                  {invitation.message && (
                    <Text fontSize="$3" color="$gray10" fontStyle="italic">
                      "{invitation.message}"
                    </Text>
                  )}
                  
                  <XStack gap="$2" marginTop="$2">
                    <Button
                      flex={1}
                      backgroundColor="#00E6C3"
                      color="#000000"
                      size="$3"
                      onPress={() => handleAcceptInvitation(invitation.id)}
                      disabled={processingInvitation === invitation.id}
                    >
                      <Text color="#000000" fontWeight="600" fontSize="$3">
                        {processingInvitation === invitation.id 
                          ? (t('common.processing') || 'Processing...')
                          : (t('common.accept') || 'Accept')
                        }
                      </Text>
                    </Button>
                    
                    <Button
                      flex={1}
                      backgroundColor="transparent"
                      borderColor="$borderColor"
                      borderWidth={1}
                      color="$color"
                      size="$3"
                      onPress={() => handleRejectInvitation(invitation.id)}
                      disabled={processingInvitation === invitation.id}
                    >
                      <Text color="$color" fontWeight="600" fontSize="$3">
                        {t('common.reject') || 'Reject'}
                      </Text>
                    </Button>
                  </XStack>
                </YStack>
              </View>
            ))
          )}
        </YStack>

        {invitations.length > 1 && (
          <Button
            backgroundColor="transparent"
            borderColor="$borderColor"
            borderWidth={1}
            color="$color"
            marginTop="$4"
            onPress={handleDismissAll}
          >
            <Text color="$color">{t('collectionSharing.dismissAll') || 'Dismiss All'}</Text>
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  invitationCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
});
