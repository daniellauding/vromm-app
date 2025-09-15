import React, { useState, useEffect, useRef } from 'react';
import { Alert, Modal, Pressable, Animated, useColorScheme } from 'react-native';
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
  const colorScheme = useColorScheme();
  
  const [invitations, setInvitations] = useState<CollectionInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  // Animation refs (matching AddToPresetSheet pattern)
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible && user?.id) {
      loadPendingInvitations();
    }
  }, [visible, user?.id]);

  // Show/hide functions (matching AddToPresetSheet pattern)
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
    if (visible) {
      showSheet();
    } else {
      hideSheet();
    }
  }, [visible]);

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
      await collectionSharingService.acceptCollectionInvitation(invitationId, user.id);
      
      showToast({
        title: t('collectionSharing.invitationAccepted') || 'Invitation Accepted',
        message: t('collectionSharing.invitationAcceptedMessage') || 'You have been added to the collection',
        type: 'success'
      });

      // Remove the invitation from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Call the callback to notify parent
      onInvitationHandled?.();
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
      await collectionSharingService.rejectCollectionInvitation(invitationId, user.id);
      
      showToast({
        title: t('collectionSharing.invitationRejected') || 'Invitation Rejected',
        message: t('collectionSharing.invitationRejectedMessage') || 'Invitation has been declined',
        type: 'success'
      });

      // Remove the invitation from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Call the callback to notify parent
      onInvitationHandled?.();
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

  const handleDismissAll = async () => {
    if (!user?.id || invitations.length === 0) return;

    Alert.alert(
      t('collectionSharing.dismissAll') || 'Dismiss All',
      t('collectionSharing.dismissAllConfirm') || 'Are you sure you want to dismiss all invitations?',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel'
        },
        {
          text: t('common.dismiss') || 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              // Reject all invitations
              await Promise.all(
                invitations.map(inv => 
                  collectionSharingService.rejectCollectionInvitation(inv.id, user.id)
                )
              );
              
              showToast({
                title: t('collectionSharing.allDismissed') || 'All Dismissed',
                message: t('collectionSharing.allDismissedMessage') || 'All invitations have been dismissed',
                type: 'success'
              });

              setInvitations([]);
              onInvitationHandled?.();
            } catch (error) {
              console.error('Error dismissing all invitations:', error);
              showToast({
                title: t('common.error') || 'Error',
                message: t('collectionSharing.failedToDismissAll') || 'Failed to dismiss all invitations',
                type: 'error'
              });
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
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
                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center" flex={1}>
                  {t('collectionSharing.collectionInvitations') || 'Collection Invitations'}
                </Text>
                <Pressable
                  onPress={hideSheet}
                  style={{
                    padding: 8,
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                    borderRadius: 8,
                  }}
                >
                  <Feather name="x" size={20} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
                </Pressable>
              </XStack>

              {/* Loading State */}
              {loading && (
                <XStack alignItems="center" justifyContent="center" padding="$4">
                  <Spinner size="large" color="$color" />
                  <Text
                    marginLeft="$3"
                    color="$color"
                    opacity={0.7}
                  >
                    {t('common.loading') || 'Loading...'}
                  </Text>
                </XStack>
              )}

              {/* Empty State */}
              {!loading && invitations.length === 0 && (
                <YStack alignItems="center" justifyContent="center" padding="$4" flex={1}>
                  <Feather name="inbox" size={48} color="$gray10" />
                  <Text
                    fontSize="$5"
                    color="$gray10"
                    textAlign="center"
                    marginTop="$3"
                  >
                    {t('collectionSharing.noInvitations') || 'No pending invitations'}
                  </Text>
                  <Text
                    fontSize="$3"
                    color="$gray11"
                    textAlign="center"
                    marginTop="$2"
                  >
                    {t('collectionSharing.noInvitationsDescription') || 'You don\'t have any pending collection invitations'}
                  </Text>
                </YStack>
              )}

              {/* Invitations List */}
              {!loading && invitations.length > 0 && (
                <ScrollView flex={1} showsVerticalScrollIndicator={false}>
                  <YStack gap="$3">
                    {invitations.map((invitation) => (
                      <Card
                        key={invitation.id}
                        padding="$4"
                        backgroundColor="$backgroundHover"
                        borderWidth={1}
                        borderColor="$borderColor"
                        borderRadius="$4"
                        shadowColor="$shadowColor"
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
                              color="$color"
                              flex={1}
                            >
                              {invitation.collection_name}
                            </Text>
                          </XStack>

                          {/* Inviter Info */}
                          <XStack alignItems="center" gap="$2">
                            <Text
                              fontSize="$3"
                              color="$gray11"
                            >
                              {t('collectionSharing.invitedBy') || 'Invited by'}:
                            </Text>
                            <Text
                              fontSize="$3"
                              fontWeight="500"
                              color="$color"
                            >
                              {invitation.invited_by_name}
                            </Text>
                          </XStack>

                          {/* Custom Message */}
                          {invitation.message && (
                            <YStack>
                              <Text
                                fontSize="$3"
                                color="$gray11"
                                marginBottom="$2"
                              >
                                {t('collectionSharing.message') || 'Message'}:
                              </Text>
                              <Text
                                fontSize="$3"
                                color="$color"
                                backgroundColor="$background"
                                padding="$3"
                                borderRadius="$3"
                                borderWidth={1}
                                borderColor="$borderColor"
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
                              borderColor="$borderColor"
                              color="$color"
                            >
                              {processingInvitation === invitation.id ? (
                                <Spinner size="small" color="$color" />
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
              )}

              {/* Bulk Actions */}
              {invitations.length > 1 && (
                <Button
                  variant="outlined"
                  size="$3"
                  onPress={handleDismissAll}
                  backgroundColor="transparent"
                  borderColor="$borderColor"
                  color="$color"
                >
                  {t('collectionSharing.dismissAll') || 'Dismiss All'}
                </Button>
              )}
            </YStack>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}