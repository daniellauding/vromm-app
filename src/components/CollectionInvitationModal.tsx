import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Modal, Animated, Pressable, useColorScheme } from 'react-native';
import { Text, XStack, YStack, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { collectionSharingService } from '../services/collectionSharingService';
import { useAuth } from '../context/AuthContext';

interface CollectionInvitationModalProps {
  isVisible: boolean;
  onClose: () => void;
  invitation: {
    id: string;
    metadata: {
      collectionId: string;
      collectionName: string;
      inviterName: string;
      customMessage?: string;
    };
  };
  onInvitationProcessed?: () => void;
}

export function CollectionInvitationModal({
  isVisible,
  onClose,
  invitation,
  onInvitationProcessed,
}: CollectionInvitationModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Animation refs
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;

  // Show/hide animations
  const showModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Animate when visibility changes
  useEffect(() => {
    if (isVisible) {
      showModal();
    } else {
      hideModal();
    }
  }, [isVisible]);

  const handleAccept = async () => {
    if (!user?.id || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await collectionSharingService.acceptCollectionInvitation(invitation.id, user.id);
      
      if (result.success) {
        showToast({
          title: t('collectionInvitation.accepted') || 'Invitation Accepted',
          message: t('collectionInvitation.acceptedMessage') || 'You have been added to the collection',
          type: 'success'
        });
        onInvitationProcessed?.();
        hideModal();
      } else {
        showToast({
          title: t('collectionInvitation.error') || 'Error processing invitation',
          message: result.error || t('collectionInvitation.errorMessage') || 'Failed to process invitation. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showToast({
        title: t('collectionInvitation.error') || 'Error processing invitation',
        message: t('collectionInvitation.errorMessage') || 'Failed to process invitation. Please try again.',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user?.id || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await collectionSharingService.rejectCollectionInvitation(invitation.id, user.id);
      
      if (result.success) {
        showToast({
          title: t('collectionInvitation.rejected') || 'Invitation Rejected',
          message: t('collectionInvitation.rejectedMessage') || 'Invitation has been declined',
          type: 'info'
        });
        onInvitationProcessed?.();
        hideModal();
      } else {
        showToast({
          title: t('collectionInvitation.error') || 'Error processing invitation',
          message: result.error || t('collectionInvitation.errorMessage') || 'Failed to process invitation. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      showToast({
        title: t('collectionInvitation.error') || 'Error processing invitation',
        message: t('collectionInvitation.errorMessage') || 'Failed to process invitation. Please try again.',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={hideModal}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)',
          opacity: backdropOpacity,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Pressable style={{ flex: 1, width: '100%' }} onPress={hideModal} />
        <Animated.View
          style={{
            transform: [{ scale: modalScale }],
            width: '100%',
            maxWidth: 400,
          }}
        >
          <YStack
            backgroundColor={colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF'}
            borderRadius="$4"
            padding="$6"
            gap="$4"
            borderWidth={1}
            borderColor={colorScheme === 'dark' ? '#333333' : '#E5E5E5'}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.25}
            shadowRadius={8}
            elevation={8}
          >
            {/* Header */}
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize="$6" fontWeight="bold" color="$color" flex={1} textAlign="center">
                {t('collectionInvitation.title') || 'Collection Invitation'}
              </Text>
              <TouchableOpacity
                onPress={hideModal}
                style={{
                  padding: 8,
                  backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
                  borderRadius: 8,
                }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={20} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
              </TouchableOpacity>
            </XStack>

            {/* Collection Info */}
            <YStack
              backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F8F9FA'}
              padding="$4"
              borderRadius="$3"
              gap="$3"
            >
              <XStack alignItems="center" gap="$3">
                <YStack
                  backgroundColor="#00E6C3"
                  width={40}
                  height={40}
                  borderRadius="$6"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Feather name="users" size={20} color="#000000" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$5" fontWeight="600" color="$color">
                    {invitation.metadata.collectionName}
                  </Text>
                  <Text fontSize="$3" color="$gray11">
                    {t('collectionInvitation.invitedBy') || 'Invited by'} {invitation.metadata.inviterName}
                  </Text>
                </YStack>
              </XStack>

              {/* Custom Message */}
              {invitation.metadata.customMessage && (
                <YStack gap="$2">
                  <Text fontSize="$3" color="$gray11" fontWeight="500">
                    {t('collectionInvitation.customMessage') || 'Personal message:'}
                  </Text>
                  <Text 
                    fontSize="$4" 
                    color="$color" 
                    backgroundColor={colorScheme === 'dark' ? '#1C1C1C' : '#FFFFFF'}
                    padding="$3"
                    borderRadius="$2"
                    borderWidth={1}
                    borderColor={colorScheme === 'dark' ? '#333333' : '#E5E5E5'}
                    fontStyle="italic"
                  >
                    "{invitation.metadata.customMessage}"
                  </Text>
                </YStack>
              )}
            </YStack>

            {/* Action Buttons */}
            <YStack gap="$3">
              <Button
                backgroundColor="#00E6C3"
                color="#000000"
                size="lg"
                onPress={handleAccept}
                disabled={isProcessing}
                borderRadius="$3"
              >
                <Text color="#000000" fontWeight="700" fontSize="$4">
                  {isProcessing 
                    ? (t('collectionInvitation.accepting') || 'Accepting...')
                    : (t('collectionInvitation.accept') || 'Accept')
                  }
                </Text>
              </Button>
              
              <Button
                variant="outlined"
                size="lg"
                onPress={handleReject}
                disabled={isProcessing}
                borderColor={colorScheme === 'dark' ? '#333333' : '#E5E5E5'}
                color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'}
                borderRadius="$3"
              >
                <Text 
                  color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} 
                  fontWeight="600" 
                  fontSize="$4"
                >
                  {isProcessing 
                    ? (t('collectionInvitation.rejecting') || 'Rejecting...')
                    : (t('collectionInvitation.reject') || 'Reject')
                  }
                </Text>
              </Button>
            </YStack>
          </YStack>
        </Animated.View>
        <Pressable style={{ flex: 1, width: '100%' }} onPress={hideModal} />
      </Animated.View>
    </Modal>
  );
}
