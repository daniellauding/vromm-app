import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, XStack, YStack, Button, Input, TextArea } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from '../contexts/TranslationContext';
import { useToast } from '../contexts/ToastContext';
import { collectionSharingService, CollectionShareRequest } from '../services/collectionSharingService';
import { useAuth } from '../context/AuthContext';

interface CollectionSharingModalProps {
  isVisible: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName: string;
  onInvitationSent?: () => void;
}

export function CollectionSharingModal({
  isVisible,
  onClose,
  collectionId,
  collectionName,
  onInvitationSent,
}: CollectionSharingModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionSharing.emailRequired') || 'Email is required',
        type: 'error'
      });
      return;
    }

    if (!user?.id) {
      showToast({
        title: t('common.error') || 'Error',
        message: t('common.notAuthenticated') || 'Not authenticated',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    try {
      const request: CollectionShareRequest = {
        collectionId,
        collectionName,
        invitedUserEmail: email.trim(),
        message: message.trim() || undefined,
      };

      const result = await collectionSharingService.createCollectionInvitation(request, user.id);

      if (result.success) {
        showToast({
          title: t('collectionSharing.invitationSent') || 'Invitation Sent',
          message: t('collectionSharing.invitationSentMessage')?.replace('{email}', email) || `Invitation sent to ${email}`,
          type: 'success'
        });
        
        setEmail('');
        setMessage('');
        onInvitationSent?.();
        onClose();
      } else {
        showToast({
          title: t('common.error') || 'Error',
          message: result.error || t('collectionSharing.failedToSend') || 'Failed to send invitation',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error sending collection invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('collectionSharing.failedToSend') || 'Failed to send invitation',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setMessage('');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
          <Text fontSize="$6" fontWeight="600" color="$color">
            {t('collectionSharing.shareCollection') || 'Share Collection'}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={24} color="#666" />
          </TouchableOpacity>
        </XStack>

        <YStack gap="$4">
          <YStack>
            <Text fontSize="$4" fontWeight="500" color="$color" marginBottom="$2">
              {t('collectionSharing.collectionName') || 'Collection'}
            </Text>
            <Text fontSize="$3" color="$gray10" backgroundColor="$backgroundHover" padding="$3" borderRadius="$3">
              {collectionName}
            </Text>
          </YStack>

          <YStack>
            <Text fontSize="$4" fontWeight="500" color="$color" marginBottom="$2">
              {t('collectionSharing.inviteUser') || 'Invite User'}
            </Text>
            <Input
              placeholder={t('collectionSharing.emailPlaceholder') || 'Enter email address'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </YStack>

          <YStack>
            <Text fontSize="$4" fontWeight="500" color="$color" marginBottom="$2">
              {t('collectionSharing.message') || 'Message (Optional)'}
            </Text>
            <TextArea
              placeholder={t('collectionSharing.messagePlaceholder') || 'Add a personal message...'}
              value={message}
              onChangeText={setMessage}
              minHeight={80}
              maxLength={500}
            />
            <Text fontSize="$2" color="$gray10" textAlign="right">
              {message.length}/500
            </Text>
          </YStack>

          <XStack gap="$3" marginTop="$4">
            <Button
              flex={1}
              backgroundColor="transparent"
              borderColor="$borderColor"
              borderWidth={1}
              color="$color"
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text color="$color">{t('common.cancel')}</Text>
            </Button>
            <Button
              flex={1}
              backgroundColor="#00E6C3"
              color="#000000"
              onPress={handleSendInvitation}
              disabled={isLoading || !email.trim()}
            >
              <Text color="#000000" fontWeight="700">
                {isLoading 
                  ? (t('collectionSharing.sending') || 'Sending...') 
                  : (t('collectionSharing.sendInvitation') || 'Send Invitation')
                }
              </Text>
            </Button>
          </XStack>
        </YStack>
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
});
