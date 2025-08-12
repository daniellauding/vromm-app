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
      
      // Get pending invitations for current user's email
      const { data: invitations, error } = await supabase
        .from('pending_invitations')
        .select(`
          id,
          email,
          role,
          invited_by,
          metadata,
          created_at,
          profiles!pending_invitations_invited_by_fkey (
            full_name,
            role,
            school_profiles (
              school_name
            )
          )
        `)
        .eq('email', user.email)
        .eq('status', 'pending');

      if (error) {
        console.error('Error loading invitations:', error);
        return;
      }

      const processedInvitations = invitations?.map((inv: any) => ({
        ...inv,
        inviter_details: {
          full_name: inv.profiles?.full_name || 'Unknown User',
          role: inv.profiles?.role || 'unknown',
          school_name: inv.profiles?.school_profiles?.[0]?.school_name
        }
      })) || [];

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

      // Accept the invitation
      const { error: acceptError } = await supabase.rpc('accept_invitation', {
        invitation_id: invitation.id,
        user_id: user.id
      });

      if (acceptError) {
        console.error('Error accepting invitation:', acceptError);
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
        return;
      }

      // Create the appropriate relationship based on roles
      if (invitation.role === 'student') {
        // Create student-supervisor relationship
        const { error: relationError } = await supabase
          .from('student_supervisor_relationships')
          .insert({
            student_id: user.id,
            supervisor_id: invitation.invited_by,
            status: 'active'
          });

        if (relationError) {
          console.error('Error creating student-supervisor relationship:', relationError);
        }
      } else if (['supervisor', 'teacher', 'school'].includes(invitation.role)) {
        // Create supervisor-student relationship (reverse)
        const { error: relationError } = await supabase
          .from('student_supervisor_relationships')
          .insert({
            student_id: invitation.invited_by,
            supervisor_id: user.id,
            status: 'active'
          });

        if (relationError) {
          console.error('Error creating supervisor-student relationship:', relationError);
        }
      }

      Alert.alert(
        'Success', 
        `You have successfully joined as a ${invitation.role}!`,
        [{ text: 'OK', onPress: () => handleNextInvitation() }]
      );

      onInvitationHandled();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = async (invitation: PendingInvitation) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('pending_invitations')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (error) {
        console.error('Error declining invitation:', error);
        Alert.alert('Error', 'Failed to decline invitation.');
        return;
      }

      Alert.alert(
        'Invitation Declined', 
        'You have declined the invitation.',
        [{ text: 'OK', onPress: () => handleNextInvitation() }]
      );

      onInvitationHandled();
    } catch (error) {
      console.error('Error declining invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextInvitation = () => {
    const currentIndex = pendingInvitations.findIndex(inv => inv.id === currentInvitation?.id);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < pendingInvitations.length) {
      setCurrentInvitation(pendingInvitations[nextIndex]);
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

    let message = `${inviterName} (${inviterRole}`;
    if (schoolName) {
      message += ` at ${schoolName}`;
    }
    message += `) has invited you to join as a ${yourRole}.`;

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
                <Text color="$gray11" size="xs">Invited by:</Text>
                <Text color="$color" size="xs" weight="600">
                  {currentInvitation.inviter_details?.full_name}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text color="$gray11" size="xs">Role:</Text>
                <Text color="$color" size="xs" weight="600">
                  {getRoleDisplayName(currentInvitation.inviter_details?.role || 'user')}
                </Text>
              </XStack>
              {currentInvitation.inviter_details?.school_name && (
                <XStack justifyContent="space-between">
                  <Text color="$gray11" size="xs">School:</Text>
                  <Text color="$color" size="xs" weight="600">
                    {currentInvitation.inviter_details.school_name}
                  </Text>
                </XStack>
              )}
              <XStack justifyContent="space-between">
                <Text color="$gray11" size="xs">Your role:</Text>
                <Text color="$blue11" size="xs" weight="600">
                  {getRoleDisplayName(currentInvitation.role)}
                </Text>
              </XStack>
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