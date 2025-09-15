import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Text, XStack, YStack, Button, ScrollView, Spinner, Card } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@tamagui/core';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { collectionSharingService, CollectionInvitation } from '../services/collectionSharingService';
import { useAuth } from '../context/AuthContext';

interface CollectionInvitationNotificationProps {
  visible: boolean;
  onClose: () => void;
  onInvitationHandled?: () => void;
  onCollectionPress?: (collectionId: string, collectionName: string) => void;
}

export function CollectionInvitationNotification({ 
  visible, 
  onClose, 
  onInvitationHandled,
  onCollectionPress
}: CollectionInvitationNotificationProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const theme = useTheme();
  
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
      console.log('🔍 [CollectionInvitationNotification] Loaded invitations:', pendingInvitations);
      console.log('🔍 [CollectionInvitationNotification] Setting invitations state:', pendingInvitations.length);
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

  if (!visible) return null;

  console.log('🔍 [CollectionInvitationNotification] Rendering with:', {
    visible,
    loading,
    invitationsCount: invitations.length,
    invitations: invitations.map(inv => ({ id: inv.id, collection_name: inv.collection_name }))
  });

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0, 0, 0, 0.7)"
      justifyContent="center"
      alignItems="center"
      zIndex={1000}
      onPress={onClose} // Click outside to close
    >
      <YStack
        backgroundColor={theme.background?.val || '$background'}
        borderRadius="$4"
        padding="$4"
        margin="$4"
        maxWidth={400}
        width="100%"
        borderWidth={1}
        borderColor={theme.borderColor?.val || '$borderColor'}
        shadowColor={theme.shadowColor?.val || '$shadowColor'}
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={8}
        elevation={8}
        maxHeight="80%"
        onPress={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom="$4"
          paddingBottom="$3"
          borderBottomWidth={1}
          borderBottomColor={theme.borderColor?.val || '$borderColor'}
        >
          <Text
            fontSize="$6"
            fontWeight="600"
            color={theme.color?.val || '$color'}
          >
            {t('collectionSharing.collectionInvitations') || 'Collection Invitations'}
          </Text>
          <Button
            variant="outlined"
            size="$3"
            onPress={onClose}
            backgroundColor="transparent"
            borderColor={theme.borderColor?.val || '$borderColor'}
            color={theme.color?.val || '$color'}
          >
            <Feather name="x" size={20} color={theme.color?.val || '#666'} />
          </Button>
        </XStack>

                {/* Loading State */}
                {loading && (
                  <YStack alignItems="center" justifyContent="center" flex={1}>
                    <Spinner size="large" color={theme.color?.val || '$color'} />
                    <Text
                      marginTop="$3"
                      color={theme.color?.val || '$color'}
                      opacity={0.7}
                    >
                      {t('common.loading') || 'Loading...'}
                    </Text>
                  </YStack>
                )}


                {/* Empty State */}
                {!loading && invitations.length === 0 && (
                  <YStack alignItems="center" justifyContent="center" flex={1}>
                    <Text
                      fontSize="$5"
                      color={theme.color?.val || '$color'}
                      opacity={0.7}
                      textAlign="center"
                    >
                      {t('collectionSharing.noInvitations') || 'No pending invitations'}
                    </Text>
                  </YStack>
                )}

                {/* Invitations List */}
                {!loading && invitations.length > 0 && (() => {
                  console.log('🔍 [CollectionInvitationNotification] Rendering invitations list with', invitations.length, 'invitations');
                  return (
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            <YStack gap="$3">
              {invitations.map((invitation) => (
                <Card
                  key={invitation.id}
                  padding="$4"
                  backgroundColor={theme.cardBackground?.val || '$cardBackground'}
                  borderWidth={1}
                  borderColor={theme.borderColor?.val || '$borderColor'}
                  borderRadius="$4"
                  shadowColor={theme.shadowColor?.val || '$shadowColor'}
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowOpacity={0.1}
                  shadowRadius={4}
                  elevation={2}
                  onPress={() => {
                    console.log('🔍 [CollectionInvitationNotification] Collection clicked:', {
                      invitationId: invitation.id,
                      collectionId: invitation.collection_id,
                      collectionName: invitation.collection_name
                    });
                    
                    // Call the onCollectionPress callback if provided
                    if (onCollectionPress) {
                      onCollectionPress(invitation.collection_id, invitation.collection_name);
                      console.log('🗺️ [CollectionInvitationNotification] Calling onCollectionPress with:', invitation.collection_id);
                    } else {
                      console.log('⚠️ [CollectionInvitationNotification] No onCollectionPress callback provided');
                    }
                  }}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <YStack gap="$3">
                    {/* Collection Name */}
                    <XStack alignItems="center" gap="$2">
                      <Feather name="users" size={16} color={theme.success?.val || '#00E6C3'} />
                      <Text
                        fontSize="$5"
                        fontWeight="600"
                        color={theme.color?.val || '$color'}
                        flex={1}
                      >
                        {invitation.collection_name}
                      </Text>
                    </XStack>

                    {/* Inviter Info */}
                    <XStack alignItems="center" gap="$2">
                      <Text
                        fontSize="$3"
                        color={theme.color?.val || '$color'}
                        opacity={0.7}
                      >
                        {t('collectionSharing.invitedBy') || 'Invited by'}:
                      </Text>
                      <Text
                        fontSize="$3"
                        fontWeight="500"
                        color={theme.color?.val || '$color'}
                      >
                        {invitation.invited_by_name}
                      </Text>
                    </XStack>

                    {/* Custom Message */}
                    {invitation.message && (
                      <YStack>
                        <Text
                          fontSize="$3"
                          color={theme.color?.val || '$color'}
                          opacity={0.7}
                          marginBottom="$2"
                        >
                          {t('collectionSharing.message') || 'Message'}:
                        </Text>
                        <Text
                          fontSize="$3"
                          color={theme.color?.val || '$color'}
                          backgroundColor={theme.background?.val || '$background'}
                          padding="$3"
                          borderRadius="$3"
                          borderWidth={1}
                          borderColor={theme.borderColor?.val || '$borderColor'}
                          fontStyle="italic"
                        >
                          "{invitation.message}"
                        </Text>
                      </YStack>
                    )}

                    {/* Action Buttons */}
                    <XStack gap="$3" marginTop="$2">
                      <Button
                        flex={1}
                        size="$3"
                        onPress={() => handleAcceptInvitation(invitation.id)}
                        disabled={processingInvitation === invitation.id}
                        backgroundColor={theme.success?.val || '#00E6C3'}
                        color="white"
                        fontWeight="600"
                      >
                        {processingInvitation === invitation.id ? (
                          <Spinner size="small" color="white" />
                        ) : (
                          t('common.accept') || 'Accept'
                        )}
                      </Button>
                      <Button
                        flex={1}
                        variant="outlined"
                        size="$3"
                        onPress={() => handleRejectInvitation(invitation.id)}
                        disabled={processingInvitation === invitation.id}
                        backgroundColor="transparent"
                        borderColor={theme.borderColor?.val || '$borderColor'}
                        color={theme.color?.val || '$color'}
                      >
                        {processingInvitation === invitation.id ? (
                          <Spinner size="small" color={theme.color?.val || '$color'} />
                        ) : (
                          t('common.reject') || 'Reject'
                        )}
                      </Button>
                    </XStack>
                  </YStack>
                </Card>
              ))}
            </YStack>
          </ScrollView>
                  );
                })()}

        {/* Bulk Actions */}
        {invitations.length > 1 && (
          <Button
            variant="outlined"
            size="$3"
            marginTop="$4"
            onPress={handleDismissAll}
            backgroundColor="transparent"
            borderColor={theme.borderColor?.val || '$borderColor'}
            color={theme.color?.val || '$color'}
          >
            {t('collectionSharing.dismissAll') || 'Dismiss All'}
          </Button>
        )}
      </YStack>
    </YStack>
  );
}

