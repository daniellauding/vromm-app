import React, { useState, useEffect } from 'react';
import { Alert, Modal } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Feather } from '@expo/vector-icons';

interface PendingInvitation {
  id: string;
  email: string;
  role: 'student' | 'supervisor' | 'teacher' | 'school';
  invited_by: string;
  inviter_name?: string;
  inviter_details?: {
    full_name: string;
    role: string;
    school_name?: string;
  };
  metadata: any;
  created_at: string;
}

interface InvitationNotificationProps {
  visible: boolean;
  onClose: () => void;
  onInvitationHandled: () => void;
}

export function InvitationNotification({ 
  visible, 
  onClose, 
  onInvitationHandled 
}: InvitationNotificationProps) {
  const { user, profile } = useAuth();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [currentInvitation, setCurrentInvitation] = useState<PendingInvitation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user?.email) {
      loadPendingInvitations();
    }
  }, [visible, user?.email]);

  const loadPendingInvitations = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      // Get pending invitations for current user's email, excluding already handled ones
      const { data: invitations, error } = await supabase
        .from('pending_invitations')
        .select(`
          id,
          email,
          role,
          invited_by,
          metadata,
          created_at,
          inviter:profiles!pending_invitations_invited_by_fkey (
            full_name,
            role
          )
        `)
        .eq('email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading invitations:', error);
        return;
      }

      // Filter out invitations where relationship already exists
      const filteredInvitations = [];
      for (const inv of invitations || []) {
        // Check if relationship already exists
        const { data: existingRelationship } = await supabase
          .from('student_supervisor_relationships')
          .select('id')
          .or(`and(student_id.eq.${user.id},supervisor_id.eq.${inv.invited_by}),and(student_id.eq.${inv.invited_by},supervisor_id.eq.${user.id})`)
          .limit(1);

        if (!existingRelationship || existingRelationship.length === 0) {
          filteredInvitations.push(inv);
        } else {
          console.log('🔄 Skipping invitation - relationship already exists:', inv.id);
        }
      }

      // Deduplicate by invited_by (keep only the latest from each inviter)
      const deduplicatedInvitations = filteredInvitations.reduce((acc: any[], inv: any) => {
        const existingIndex = acc.findIndex(existing => existing.invited_by === inv.invited_by);
        if (existingIndex === -1) {
          acc.push(inv);
        } else if (new Date(inv.created_at) > new Date(acc[existingIndex].created_at)) {
          acc[existingIndex] = inv;
        }
        return acc;
      }, []);

      const processedInvitations = deduplicatedInvitations.map((inv: any) => ({
        ...inv,
        inviter_details: {
          full_name: inv.inviter?.full_name || 'Unknown User',
          role: inv.inviter?.role || 'unknown',
          school_name: undefined
        }
      }));

      console.log('📥 Processed invitations:', processedInvitations.length, 'out of', invitations?.length || 0);
      setPendingInvitations(processedInvitations);
      
      // Show first invitation
      if (processedInvitations.length > 0) {
        setCurrentInvitation(processedInvitations[0]);
      }
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('✅ Accepting invitation:', invitation.id, 'from:', invitation.inviter_details?.full_name);

      // Use the acceptInvitationById function from invitation service
      const { acceptInvitationById } = await import('../services/invitationService');
      const success = await acceptInvitationById(invitation.id, user.id);

      if (!success) {
        console.error('❌ Failed to accept invitation');
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
        return;
      }

      console.log('🎉 Invitation accepted successfully');

      // Also clean up any related notifications
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .delete()
          .eq('metadata->>invitation_id', invitation.id);
        
        if (notificationError) {
          console.warn('⚠️ Could not delete related notification:', notificationError);
        } else {
          console.log('🗑️ Related notification deleted after acceptance');
        }
      } catch (notificationCleanupError) {
        console.warn('⚠️ Error cleaning up notification:', notificationCleanupError);
      }

      // Remove the accepted invitation from local state
      setPendingInvitations(prev => {
        const updated = prev.filter(inv => inv.id !== invitation.id);
        console.log('📝 Updated pending invitations count:', updated.length);
        return updated;
      });

      Alert.alert(
        'Success', 
        `You have successfully joined as a ${invitation.role}!`,
        [{ text: 'OK', onPress: () => handleNextInvitation() }]
      );

      onInvitationHandled();
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = async (invitation: PendingInvitation) => {
    try {
      setLoading(true);
      console.log('🚫 Declining invitation:', invitation.id, 'from:', invitation.inviter_details?.full_name);

      // Instead of updating status, delete the invitation to avoid constraint conflicts
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) {
        console.error('❌ Error declining invitation:', error);
        Alert.alert('Error', `Failed to decline invitation: ${error.message}`);
        return;
      }

      console.log('✅ Invitation declined successfully');
      
      // Also clean up any related notifications
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .delete()
          .eq('metadata->>invitation_id', invitation.id);
        
        if (notificationError) {
          console.warn('⚠️ Could not delete related notification:', notificationError);
        } else {
          console.log('🗑️ Related notification deleted after decline');
        }
      } catch (notificationCleanupError) {
        console.warn('⚠️ Error cleaning up notification:', notificationCleanupError);
      }
      
      // Remove the declined invitation from local state
      setPendingInvitations(prev => {
        const updated = prev.filter(inv => inv.id !== invitation.id);
        console.log('📝 Updated pending invitations count:', updated.length);
        return updated;
      });

      Alert.alert(
        'Invitation Declined', 
        'You have declined the invitation.',
        [{ text: 'OK', onPress: () => handleNextInvitation() }]
      );

      onInvitationHandled();
    } catch (error) {
      console.error('❌ Error declining invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextInvitation = () => {
    // Since we remove invitations from state when they're handled,
    // just show the first remaining invitation
    if (pendingInvitations.length > 0) {
      setCurrentInvitation(pendingInvitations[0]);
    } else {
      // No more invitations, close modal
      setCurrentInvitation(null);
      onClose();
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'supervisor': return 'Supervisor';
      case 'teacher': return 'Teacher';
      case 'school': return 'School Representative';
      case 'student': return 'Student';
      default: return role;
    }
  };

  const getInvitationMessage = (invitation: PendingInvitation) => {
    const inviterName = invitation.inviter_details?.full_name || 'Someone';
    const inviterRole = getRoleDisplayName(invitation.inviter_details?.role || 'user');
    const yourRole = getRoleDisplayName(invitation.role);
    const schoolName = invitation.inviter_details?.school_name;
    const customMessage = invitation.metadata?.customMessage;

    let message = `${inviterName} (${inviterRole}`;
    if (schoolName) {
      message += ` at ${schoolName}`;
    }
    message += `) has invited you to join as a ${yourRole}.`;

    // Add custom message if provided
    if (customMessage) {
      message += `\n\n💬 Personal message:\n"${customMessage}"`;
    }

    if (invitation.role === 'student') {
      message += '\n\nAccepting will allow them to view your learning progress and help guide your development.';
    } else {
      message += '\n\nAccepting will allow you to supervise their learning progress and provide guidance.';
    }

    return message;
  };

  if (!visible || !currentInvitation) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <YStack
        flex={1}
        backgroundColor="rgba(0,0,0,0.8)"
        justifyContent="center"
        alignItems="center"
        padding="$4"
      >
        <YStack
          backgroundColor="$background"
          padding="$4"
          borderRadius="$4"
          gap="$4"
          maxWidth={350}
          width="100%"
        >
          {/* Header */}
          <XStack alignItems="center" gap="$3">
            <YStack
              backgroundColor="$blue3"
              padding="$2"
              borderRadius="$2"
            >
              <Feather name="users" size={24} color="#0EA5E9" />
            </YStack>
            <YStack flex={1}>
              <Text size="lg" weight="bold" color="$color">
                Invitation Received
              </Text>
              <Text size="sm" color="$gray11">
                {pendingInvitations.length > 1 && 
                  `${pendingInvitations.findIndex(inv => inv.id === currentInvitation.id) + 1} of ${pendingInvitations.length}`
                }
              </Text>
            </YStack>
          </XStack>

          {/* Content */}
          <YStack gap="$3">
            <Text color="$color" size="sm" lineHeight={20}>
              {getInvitationMessage(currentInvitation)}
            </Text>

            {/* Invitation Details */}
            <YStack
              backgroundColor="$backgroundStrong"
              padding="$3"
              borderRadius="$2"
              gap="$2"
            >
              <XStack justifyContent="space-between">
                <Text color="$gray11" fontSize={12}>Invited by:</Text>
                <Text color="$color" fontSize={12} fontWeight="600">
                  {currentInvitation.inviter_details?.full_name}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11" fontSize={12}>Role:</Text>
                <Text color="$color" fontSize={12} fontWeight="600">
                  {getRoleDisplayName(currentInvitation.inviter_details?.role || 'user')}
                </Text>
              </XStack>
              {currentInvitation.inviter_details?.school_name && (
                <XStack justifyContent="space-between">
                  <Text color="$gray11" fontSize={12}>School:</Text>
                  <Text color="$color" fontSize={12} fontWeight="600">
                    {currentInvitation.inviter_details.school_name}
                  </Text>
                </XStack>
              )}
              <XStack justifyContent="space-between">
                <Text color="$gray11" fontSize={12}>Your role:</Text>
                <Text color="$blue11" fontSize={12} fontWeight="600">
                  {getRoleDisplayName(currentInvitation.role)}
                </Text>
              </XStack>
              
              {/* Show custom message if available */}
              {currentInvitation.metadata?.customMessage && (
                <YStack gap="$1" marginTop="$2" padding="$2" backgroundColor="$blue3" borderRadius="$2">
                  <Text color="$blue11" fontSize={12} fontWeight="600">💬 Personal Message:</Text>
                  <Text color="$blue12" fontSize={12} fontStyle="italic">
                    "{currentInvitation.metadata.customMessage}"
                  </Text>
                </YStack>
              )}
            </YStack>
          </YStack>

          {/* Actions */}
          <YStack gap="$2">
            <Button
              onPress={() => handleAcceptInvitation(currentInvitation)}
              variant="primary"
              size="lg"
              disabled={loading}
            >
              <XStack alignItems="center" gap="$2">
                <Feather name="check" size={16} />
                <Text>Accept Invitation</Text>
              </XStack>
            </Button>

            <Button
              onPress={() => handleDeclineInvitation(currentInvitation)}
              variant="outline"
              size="lg"
              disabled={loading}
            >
              <XStack alignItems="center" gap="$2">
                <Feather name="x" size={16} />
                <Text>Decline</Text>
              </XStack>
            </Button>

            {pendingInvitations.length > 1 && (
              <Button
                onPress={handleNextInvitation}
                variant="ghost"
                size="sm"
              >
                Skip for now ({pendingInvitations.length - pendingInvitations.findIndex(inv => inv.id === currentInvitation.id) - 1} remaining)
              </Button>
            )}
          </YStack>

          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
          >
            Close
          </Button>
        </YStack>
      </YStack>
    </Modal>
  );
}