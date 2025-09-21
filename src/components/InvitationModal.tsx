import React, { useState, useEffect } from 'react';
import { Modal, Pressable } from 'react-native';
import { YStack, XStack, Heading, useTheme } from 'tamagui';
import { Button } from './Button';
import { Text } from './Text';
import { useTranslation } from '../contexts/TranslationContext';
import { X, User, Users, Check, X as XIcon } from '@tamagui/lucide-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface InvitationModalProps {
  visible: boolean;
  onClose: () => void;
  onInvitationHandled: () => void;
}

interface PendingInvitation {
  id: string;
  type: 'relationship' | 'collection';
  title: string;
  message: string;
  from_user_name: string;
  from_user_email: string;
  custom_message?: string;
  role?: string;
  collection_name?: string;
  invitation_id: string;
  created_at: string;
}

export function InvitationModal({ visible, onClose, onInvitationHandled }: InvitationModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  
  const backgroundColor = theme.background?.val || '#FFFFFF';
  const textColor = theme.color?.val || '#000000';
  const borderColor = theme.borderColor?.val || '#DDD';
  
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user?.id) {
      loadPendingInvitations();
    }
  }, [visible, user?.id]);

  const loadPendingInvitations = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Load relationship invitations
      const { data: relationshipInvitations } = await supabase
        .from('pending_invitations')
        .select(`
          id,
          email,
          role,
          status,
          invited_by,
          created_at,
          metadata
        `)
        .eq('email', user.email?.toLowerCase())
        .eq('status', 'pending');

      // Load collection invitations
      const { data: collectionInvitations } = await supabase
        .from('collection_invitations')
        .select(`
          id,
          preset_id,
          invited_user_id,
          invited_by_user_id,
          role,
          status,
          custom_message,
          created_at,
          map_presets!inner(name)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');

      // Get inviter details for relationship invitations
      const relationshipInvitationsWithDetails = await Promise.all(
        (relationshipInvitations || []).map(async (inv) => {
          const { data: inviter } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', inv.invited_by)
            .single();

          return {
            id: inv.id,
            type: 'relationship' as const,
            title: inv.role === 'instructor' 
              ? t('invitations.supervisorInvitation') || 'Supervisor Invitation'
              : t('invitations.studentInvitation') || 'Student Invitation',
            message: inv.metadata?.customMessage || 
              (inv.role === 'instructor' 
                ? t('invitations.supervisorMessage') || 'wants you to be their supervisor'
                : t('invitations.studentMessage') || 'wants you to be their student'),
            from_user_name: inviter?.full_name || 'Unknown User',
            from_user_email: inviter?.email || '',
            custom_message: inv.metadata?.customMessage,
            role: inv.role,
            invitation_id: inv.id,
            created_at: inv.created_at,
          };
        })
      );

      // Get inviter details for collection invitations
      const collectionInvitationsWithDetails = await Promise.all(
        (collectionInvitations || []).map(async (inv) => {
          const { data: inviter } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', inv.invited_by_user_id)
            .single();

          return {
            id: inv.id,
            type: 'collection' as const,
            title: t('invitations.collectionInvitation') || 'Collection Invitation',
            message: t('invitations.collectionMessage') || 'wants to share a collection with you',
            from_user_name: inviter?.full_name || 'Unknown User',
            from_user_email: inviter?.email || '',
            custom_message: inv.custom_message,
            role: inv.role,
            collection_name: (inv as any).map_presets?.name || 'Unknown Collection',
            invitation_id: inv.id,
            created_at: inv.created_at,
          };
        })
      );

      setInvitations([...relationshipInvitationsWithDetails, ...collectionInvitationsWithDetails]);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    setProcessing(invitation.id);
    try {
      if (invitation.type === 'relationship') {
        // Use fixed universal function for relationship invitations
        const { data, error } = await supabase.rpc('accept_any_invitation_universal', {
          p_invitation_id: invitation.invitation_id,
          p_accepted_by: user?.id
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        showToast({
          title: t('invitations.accepted') || 'Invitation Accepted',
          message: t('invitations.relationshipAccepted') || 'You are now connected!',
          type: 'success'
        });
      } else if (invitation.type === 'collection') {
        // Accept collection invitation
        const { error } = await supabase
          .from('collection_invitations')
          .update({ 
            status: 'accepted',
            responded_at: new Date().toISOString()
          })
          .eq('id', invitation.invitation_id);

        if (error) throw error;

        showToast({
          title: t('invitations.accepted') || 'Invitation Accepted',
          message: t('invitations.collectionAccepted') || 'You now have access to this collection!',
          type: 'success'
        });
      }

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      onInvitationHandled();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('invitations.acceptError') || 'Failed to accept invitation',
        type: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDeclineInvitation = async (invitation: PendingInvitation) => {
    setProcessing(invitation.id);
    try {
      if (invitation.type === 'relationship') {
        // Decline relationship invitation
        const { error } = await supabase
          .from('pending_invitations')
          .update({ 
            status: 'declined',
            accepted_at: new Date().toISOString(),
            accepted_by: user?.id
          })
          .eq('id', invitation.invitation_id);

        if (error) throw error;
      } else if (invitation.type === 'collection') {
        // Decline collection invitation
        const { error } = await supabase
          .from('collection_invitations')
          .update({ 
            status: 'declined',
            responded_at: new Date().toISOString()
          })
          .eq('id', invitation.invitation_id);

        if (error) throw error;
      }

      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      onInvitationHandled();
    } catch (error) {
      console.error('Error declining invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('invitations.declineError') || 'Failed to decline invitation',
        type: 'error'
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDismissAll = () => {
    setInvitations([]);
    onClose();
  };

  if (!visible || invitations.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: 20 
        }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            backgroundColor={backgroundColor}
            borderRadius="$4"
            padding="$6"
            width="100%"
            maxWidth={400}
            borderWidth={1}
            borderColor={borderColor}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.25}
            shadowRadius={12}
            elevation={8}
          >
            {/* Header */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$4">
              <XStack alignItems="center" gap="$3">
                <Users size={20} color={textColor} />
                <Heading size="$5" color={textColor}>
                  {t('invitations.newInvitations') || 'New Invitations'}
                </Heading>
              </XStack>
              <Button
                variant="ghost"
                size="sm"
                onPress={onClose}
                padding="$2"
                accessibilityLabel="Close"
              >
                <X size={16} color={textColor} />
              </Button>
            </XStack>

            {/* Invitations List */}
            <YStack gap="$3" marginBottom="$6" maxHeight={300}>
              {invitations.map((invitation) => (
                <YStack
                  key={invitation.id}
                  backgroundColor="$backgroundHover"
                  borderRadius="$3"
                  padding="$4"
                  borderWidth={1}
                  borderColor={borderColor}
                >
                  <XStack alignItems="center" gap="$2" marginBottom="$2">
                    {invitation.type === 'relationship' ? (
                      <User size={16} color={textColor} />
                    ) : (
                      <Users size={16} color={textColor} />
                    )}
                    <Text size="md" fontWeight="600" color={textColor}>
                      {invitation.title}
                    </Text>
                  </XStack>
                  
                  <Text size="sm" color={textColor} marginBottom="$2">
                    <Text fontWeight="600">{invitation.from_user_name}</Text> {invitation.message}
                  </Text>
                  
                  {invitation.collection_name && (
                    <Text size="sm" color="$gray11" marginBottom="$2">
                      Collection: {invitation.collection_name}
                    </Text>
                  )}
                  
                  {invitation.custom_message && (
                    <YStack backgroundColor="$background" borderRadius="$2" padding="$2" marginBottom="$2">
                      <Text size="xs" color="$gray11" marginBottom="$1">
                        {t('invitations.personalMessage') || 'Personal message:'}
                      </Text>
                      <Text size="sm" color={textColor} fontStyle="italic">
                        "{invitation.custom_message}"
                      </Text>
                    </YStack>
                  )}
                  
                  <XStack gap="$2" justifyContent="flex-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => handleDeclineInvitation(invitation)}
                      disabled={processing === invitation.id}
                    >
                      <XIcon size={14} />
                      <Text size="sm">{t('common.decline') || 'Decline'}</Text>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => handleAcceptInvitation(invitation)}
                      disabled={processing === invitation.id}
                    >
                      <Check size={14} />
                      <Text size="sm">{t('common.accept') || 'Accept'}</Text>
                    </Button>
                  </XStack>
                </YStack>
              ))}
            </YStack>

            {/* Actions */}
            <XStack gap="$3" justifyContent="space-between">
              <Button
                variant="tertiary"
                size="md"
                onPress={handleDismissAll}
                flex={1}
              >
                {t('invitations.dismissAll') || 'Dismiss All'}
              </Button>
              <Button
                variant="primary"
                size="md"
                onPress={onClose}
                flex={1}
              >
                {t('common.close') || 'Close'}
              </Button>
            </XStack>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
