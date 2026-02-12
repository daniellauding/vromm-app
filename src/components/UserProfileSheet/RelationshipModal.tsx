import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View, Dimensions, ScrollView, Image, TextInput } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { Button } from '../Button';

import { useThemePreference } from '../../hooks/useThemeOverride';
import { useAuth } from '../../context/AuthContext';

import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import { Database } from '../../lib/database.types';

import { useToast } from '../../contexts/ToastContext';

// 🖼️ Import invitation images (same as UnifiedInvitationModal)
// Note: These images should be imported as ES6 modules if available
const INVITATION_IMAGES = {
  supervisor: null, // require('../../assets/images/invitations/supervisor-invite.png'),
  student: null, // require('../../assets/images/invitations/student-invite.png'),
  collection: null, // require('../../assets/images/invitations/collection-invite.png'),
};

const { height } = Dimensions.get('window');

type UserProfile = Database['public']['Tables']['profiles']['Row'] & {
  routes_created: number;
  routes_driven: number;
  routes_saved: number;
  reviews_given: number;
  average_rating: number;
  total_distance_driven: number; // in km
  total_duration_driven: number; // in seconds
  recorded_routes_created: number; // routes created using recording
  email: string | null;
  school: {
    name: string;
    id: string;
  } | null;
  supervisor: {
    id: string;
    full_name: string;
  } | null;
};

const relationshipSnapPoints = {
  large: height * 0.2, // Top at 20% of screen (show 80% - largest)
  medium: height * 0.4, // Top at 40% of screen (show 60% - medium)
  small: height * 0.6, // Top at 60% of screen (show 40% - small)
  tiny: height * 0.8, // Top at 80% of screen (show 20% - just title)
  dismissed: height, // Completely off-screen
};

export const RelationshipModal = ({
  visible,
  onClose,
  userId,
  profile,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  profile: UserProfile | null;
}) => {
  const { user, profile: currentUserProfile } = useAuth();
  const { showToast } = useToast();
  const isDragging = useRef(false);
  const [currentRelationshipSnapPoint, setCurrentRelationshipSnapPoint] = useState(
    relationshipSnapPoints.large,
  );
  const relationshipTranslateY = useSharedValue(height);
  const currentRelationshipState = useSharedValue(relationshipSnapPoints.large);

  const { effectiveTheme } = useThemePreference();
  const colorScheme = effectiveTheme || 'light';
  const theme = useTheme();

  const backgroundColor = colorScheme === 'dark' ? '#1a1a1a' : '#FFFFFF';

  // Pending invitation states
  const [hasPendingInvitation, setHasPendingInvitation] = useState(false);
  const [pendingInvitationType, setPendingInvitationType] = useState<'sent' | 'received' | null>(
    null,
  );
  const [pendingInvitationData, setPendingInvitationData] = useState<any>(null);
  const [relationshipCustomMessage, setRelationshipCustomMessage] = useState('');

  const checkPendingInvitations = React.useCallback(async () => {
    if (!user?.id || !userId || !profile?.email || !user.email) {
      return;
    }

    try {
      // Check if current user sent invitation to this profile
      const { data: sentInvitations } = await supabase
        .from('pending_invitations')
        .select('id, email, status, metadata, created_at')
        .eq('invited_by', user.id)
        .eq('email', profile.email.toLowerCase())
        .eq('status', 'pending');

      // Check if this profile sent invitation to current user
      const { data: receivedInvitations } = await supabase
        .from('pending_invitations')
        .select('id, email, status, metadata, created_at')
        .eq('invited_by', userId)
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending');

      if (sentInvitations && sentInvitations.length > 0) {
        setHasPendingInvitation(true);
        setPendingInvitationType('sent');
        setPendingInvitationData(sentInvitations[0]);
      } else if (receivedInvitations && receivedInvitations.length > 0) {
        setHasPendingInvitation(true);
        setPendingInvitationType('received');
        setPendingInvitationData(receivedInvitations[0]);
      } else {
        setHasPendingInvitation(false);
        setPendingInvitationType(null);
        setPendingInvitationData(null);
      }
    } catch (error) {
      console.error('🔍 [UserProfileSheet] Error checking pending invitations:', error);
    }
  }, [user?.id, profile?.email, user?.email, userId]);

  useEffect(() => {
    if (visible) {
      checkPendingInvitations();
    }
  }, [visible, checkPendingInvitations]);

  const handleCreateConnection = React.useCallback(async () => {
    if (!user?.id || !profile || !currentUserProfile) return;

    try {
      console.log('🔗 [UserProfileSheet] Creating connection with user:', profile.full_name);

      // Check if relationship already exists
      const { data: existingRelationship } = await supabase
        .from('student_supervisor_relationships')
        .select('id')
        .or(
          `and(student_id.eq.${user.id},supervisor_id.eq.${userId}),and(student_id.eq.${userId},supervisor_id.eq.${user.id})`,
        )
        .single();

      if (existingRelationship) {
        showToast({
          title: 'Already Connected',
          message: 'Relationship already exists with this user',
          type: 'info',
        });
        return;
      }

      // Check if pending invitation already exists
      const { data: existingInvitation } = await supabase
        .from('pending_invitations')
        .select('id')
        .eq('invited_by', user.id)
        .eq('email', profile.email!.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        console.log(
          '🔗 [UserProfileSheet] Found existing invitation, setting pending state and showing modal',
        );

        // Update the pending invitation state immediately
        setHasPendingInvitation(true);
        setPendingInvitationType('sent');
        setPendingInvitationData(existingInvitation);

        showToast({
          title: 'Already Pending',
          message: 'Invitation already exists for this user - you can manage it in the modal',
          type: 'info',
        });

        // The modal will be shown by the IconButton onPress handler
        return;
      }

      // Determine relationship type and target role
      const relationshipType =
        profile.role === 'instructor' ? 'student_invites_supervisor' : 'supervisor_invites_student';
      const targetRole = profile.role === 'instructor' ? 'instructor' : 'student';

      // Create pending invitation (same as GettingStarted.tsx)
      const { data: invitationData, error: inviteError } = await supabase
        .from('pending_invitations')
        .insert({
          email: profile.email!.toLowerCase(),
          role: targetRole,
          invited_by: user.id,
          metadata: {
            supervisorName: currentUserProfile.full_name || user.email,
            inviterRole: currentUserProfile.role,
            relationshipType,
            invitedAt: new Date().toISOString(),
            targetUserId: userId,
            targetUserName: profile?.full_name || 'Unknown User',
            customMessage: relationshipCustomMessage.trim() || undefined,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (inviteError && inviteError.code !== '23505') {
        console.error('🔗 [UserProfileSheet] Error creating invitation:', inviteError);
        throw inviteError;
      }

      // Create notification (same as GettingStarted.tsx)
      const notificationType =
        profile.role === 'instructor' ? 'supervisor_invitation' : 'student_invitation';
      const baseMessage =
        profile.role === 'instructor'
          ? `${currentUserProfile.full_name || user.email} wants you to be their supervisor`
          : `${currentUserProfile.full_name || user.email} wants you to be their student`;

      const fullMessage = relationshipCustomMessage.trim()
        ? `${baseMessage}\n\nPersonal message: "${relationshipCustomMessage.trim()}"`
        : baseMessage;

      await supabase.from('notifications').insert({
        user_id: userId!,
        actor_id: user.id,
        type: notificationType as any,
        title: 'New Connection Request',
        message: fullMessage,
        metadata: {
          relationship_type: relationshipType,
          from_user_id: user.id,
          from_user_name: currentUserProfile.full_name || user.email,
          customMessage: relationshipCustomMessage.trim() || undefined,
          invitation_id: invitationData.id,
        },
        action_url: 'vromm://notifications',
        priority: 'high',
        is_read: false,
      });

      showToast({
        title: 'Request Sent!',
        message: `Connection request sent to ${profile?.full_name || 'the user'}. They will receive a notification.`,
        type: 'success',
      });

      // Update pending invitation status
      setHasPendingInvitation(true);
      setPendingInvitationType('sent');
      setPendingInvitationData(invitationData); // Set the invitation data
      setRelationshipCustomMessage('');
      onClose();
    } catch (error) {
      console.error('🔗 [UserProfileSheet] Error creating connection:', error);
      showToast({
        title: 'Error',
        message: 'Failed to send connection request',
        type: 'error',
      });
    }
  }, [user, relationshipCustomMessage, showToast, onClose, currentUserProfile, profile, userId]);

  // Cancel pending invitation function
  const handleCancelPendingInvitation = React.useCallback(async () => {
    if (!pendingInvitationData || !user?.id) return;

    try {
      console.log('🚫 [UserProfileSheet] Canceling pending invitation:', pendingInvitationData.id);

      // Remove pending invitation
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', pendingInvitationData.id);

      if (error) throw error;

      // Remove related notification
      await supabase
        .from('notifications')
        .delete()
        .eq('metadata->>invitation_id', pendingInvitationData.id);

      showToast({
        title: 'Invitation Canceled',
        message: `Connection request to ${profile?.full_name || 'this user'} has been canceled.`,
        type: 'success',
      });

      // Reset pending state
      setHasPendingInvitation(false);
      setPendingInvitationType(null);
      setPendingInvitationData(null);

      onClose();
    } catch (error) {
      console.error('🚫 [UserProfileSheet] Error canceling invitation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to cancel invitation',
        type: 'error',
      });
    }
  }, [pendingInvitationData, user?.id, profile?.full_name, showToast, onClose]);

  // Accept invitation function (copied from UnifiedInvitationModal)
  const handleAcceptInvitation = React.useCallback(async () => {
    if (!pendingInvitationData || !user?.id) return;

    try {
      console.log('✅ [UserProfileSheet] Accepting invitation:', pendingInvitationData.id);

      // Use the same universal function as UnifiedInvitationModal
      const { data, error } = await supabase.rpc('accept_any_invitation_universal', {
        p_invitation_id: pendingInvitationData.id,
        p_accepted_by: user.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      showToast({
        title: 'Invitation Accepted!',
        message: `You are now connected with ${profile?.full_name || 'this user'}.`,
        type: 'success',
      });

      // Reset pending state and refresh relationship status
      setHasPendingInvitation(false);
      setPendingInvitationType(null);
      setPendingInvitationData(null);

      onClose();
    } catch (error) {
      console.error('✅ [UserProfileSheet] Error accepting invitation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to accept invitation',
        type: 'error',
      });
    }
  }, [pendingInvitationData, user?.id, profile?.full_name, showToast, onClose]);

  // Decline invitation function (copied from UnifiedInvitationModal)
  const handleDeclineInvitation = React.useCallback(async () => {
    if (!pendingInvitationData || !user?.id) return;

    try {
      console.log('❌ [UserProfileSheet] Declining invitation:', pendingInvitationData.id);

      // Remove pending invitation (same as UnifiedInvitationModal)
      await supabase.from('pending_invitations').delete().eq('id', pendingInvitationData.id);

      // Remove related notification
      await supabase
        .from('notifications')
        .delete()
        .eq('metadata->>invitation_id', pendingInvitationData.id);

      showToast({
        title: 'Invitation Declined',
        message: `Connection request from ${profile?.full_name || 'this user'} has been declined.`,
        type: 'success',
      });

      // Reset pending state
      setHasPendingInvitation(false);
      setPendingInvitationType(null);
      setPendingInvitationData(null);
      onClose();
    } catch (error) {
      console.error('❌ [UserProfileSheet] Error declining invitation:', error);
      showToast({
        title: 'Error',
        message: 'Failed to decline invitation',
        type: 'error',
      });
    }
  }, [pendingInvitationData, user?.id, profile?.full_name, showToast, onClose]);

  // Relationship modal gesture handler
  const relationshipPanGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      isDragging.current = true;
    })
    .onUpdate((event) => {
      try {
        const { translationY } = event;
        const newPosition = currentRelationshipState.value + translationY;

        const minPosition = relationshipSnapPoints.large;
        const maxPosition = relationshipSnapPoints.tiny + 100;
        const boundedPosition = Math.min(Math.max(newPosition, minPosition), maxPosition);

        relationshipTranslateY.value = boundedPosition;
      } catch (error) {
        console.log('relationshipPanGesture error', error);
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      isDragging.current = false;

      const currentPosition = currentRelationshipState.value + translationY;

      if (currentPosition > relationshipSnapPoints.tiny + 30 && velocityY > 200) {
        runOnJS(onClose)();
        return;
      }

      let targetSnapPoint;
      if (velocityY < -500) {
        targetSnapPoint = relationshipSnapPoints.large;
      } else if (velocityY > 500) {
        targetSnapPoint = relationshipSnapPoints.tiny;
      } else {
        const positions = [
          relationshipSnapPoints.large,
          relationshipSnapPoints.medium,
          relationshipSnapPoints.small,
          relationshipSnapPoints.tiny,
        ];
        targetSnapPoint = positions.reduce((prev, curr) =>
          Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev,
        );
      }

      const boundedTarget = Math.min(
        Math.max(targetSnapPoint, relationshipSnapPoints.large),
        relationshipSnapPoints.tiny,
      );

      relationshipTranslateY.value = withSpring(boundedTarget, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      currentRelationshipState.value = boundedTarget;
      runOnJS(setCurrentRelationshipSnapPoint)(boundedTarget);
    });

  const relationshipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: relationshipTranslateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      relationshipTranslateY.value = withSpring(relationshipSnapPoints.large, {
        damping: 20,
        mass: 1,
        stiffness: 100,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      currentRelationshipState.value = relationshipSnapPoints.large;
      setCurrentRelationshipSnapPoint(relationshipSnapPoints.large);
    }
  }, [visible, currentRelationshipState, relationshipTranslateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'flex-end',
          zIndex: 999999,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <GestureDetector gesture={relationshipPanGesture}>
          <ReanimatedAnimated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: height,
                backgroundColor: backgroundColor,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              },
              relationshipAnimatedStyle,
            ]}
          >
            <YStack padding="$3" paddingBottom={24} gap="$3" flex={1}>
              {/* Drag Handle */}
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.gray8?.val || '#CCC',
                  }}
                />
              </View>

              {/* Header with image */}
              <YStack alignItems="center" gap="$3" paddingHorizontal="$2">
                {/* Role-specific image - using same images as UnifiedInvitationModal */}
                <View
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {INVITATION_IMAGES &&
                  INVITATION_IMAGES.supervisor &&
                  INVITATION_IMAGES.student ? (
                    <Image
                      source={
                        hasPendingInvitation
                          ? profile?.role === 'instructor'
                            ? INVITATION_IMAGES.supervisor
                            : INVITATION_IMAGES.student
                          : profile?.role === 'instructor'
                            ? INVITATION_IMAGES.supervisor
                            : INVITATION_IMAGES.student
                      }
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    // Fallback colored background if images not available
                    <View
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: hasPendingInvitation
                          ? '#F59E0B' // Orange for pending
                          : profile?.role === 'instructor'
                            ? '#4F46E5' // Purple for instructor
                            : '#059669', // Green for student
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Feather
                        name={
                          hasPendingInvitation
                            ? 'clock'
                            : profile?.role === 'instructor'
                              ? 'user-check'
                              : 'users'
                        }
                        size={40}
                        color="white"
                      />
                    </View>
                  )}
                </View>

                <Text fontSize="$6" fontWeight="bold" color="$color" textAlign="center">
                  {(() => {
                    return hasPendingInvitation
                      ? 'Pending Connection'
                      : profile?.role === 'instructor'
                        ? 'Request Supervision'
                        : 'Invite as Student';
                  })()}
                </Text>

                <Text fontSize="$3" color="$gray11" textAlign="center">
                  {hasPendingInvitation
                    ? `Manage your ${pendingInvitationType === 'sent' ? 'sent' : 'received'} connection request`
                    : profile?.role === 'instructor'
                      ? `Ask ${profile?.full_name || 'this user'} to be your driving instructor`
                      : `Invite ${profile?.full_name || 'this user'} to supervise their driving progress`}
                </Text>
              </YStack>

              {/* Show content only if not in tiny mode */}
              {currentRelationshipSnapPoint !== relationshipSnapPoints.tiny && (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                >
                  <YStack gap="$4">
                    {/* User info card */}
                    <YStack
                      gap="$2"
                      padding="$3"
                      backgroundColor="$backgroundHover"
                      borderRadius="$3"
                    >
                      <XStack alignItems="center" gap="$2">
                        <Feather
                          name="user"
                          size={16}
                          color={profile?.role === 'instructor' ? '#4F46E5' : '#059669'}
                        />
                        <Text fontSize="$4" fontWeight="600" color="$color">
                          {profile?.full_name || 'Unknown User'}
                        </Text>
                      </XStack>
                      <Text fontSize="$3" color="$gray11">
                        {profile?.email || 'No email'} •{' '}
                        {profile?.role === 'instructor' ? 'Instructor' : 'Student'}
                      </Text>
                      {profile?.location && (
                        <Text fontSize="$3" color="$gray11">
                          📍 {profile.location}
                        </Text>
                      )}
                    </YStack>

                    {/* Pending Invitation Status */}
                    {(() => {
                      return hasPendingInvitation;
                    })() && (
                      <YStack
                        gap="$2"
                        padding="$3"
                        backgroundColor={pendingInvitationType === 'sent' ? '$orange5' : '$blue5'}
                        borderRadius="$3"
                      >
                        <XStack alignItems="center" gap="$2">
                          <Feather
                            name="clock"
                            size={16}
                            color={pendingInvitationType === 'sent' ? '#F59E0B' : '#3B82F6'}
                          />
                          <Text fontSize="$4" fontWeight="600" color="$color">
                            {pendingInvitationType === 'sent'
                              ? 'Invitation Sent'
                              : 'Invitation Received'}
                          </Text>
                        </XStack>
                        <Text fontSize="$3" color="$gray11">
                          {pendingInvitationType === 'sent'
                            ? `You have sent a connection request to ${profile?.full_name || 'this user'}`
                            : `${profile?.full_name || 'This user'} has sent you a connection request`}
                        </Text>
                        {pendingInvitationType === 'sent' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={async () => {
                              try {
                                // Cancel pending invitation
                                const { error } = await supabase
                                  .from('pending_invitations')
                                  .delete()
                                  .eq('invited_by', user?.id)
                                  .eq('email', profile?.email?.toLowerCase())
                                  .eq('status', 'pending');

                                if (error) throw error;

                                showToast({
                                  title: 'Cancelled',
                                  message: 'Connection request has been cancelled',
                                  type: 'success',
                                });

                                onClose();
                              } catch (error) {
                                console.error('Error cancelling invitation:', error);
                                showToast({
                                  title: 'Error',
                                  message: 'Failed to cancel invitation',
                                  type: 'error',
                                });
                              }
                            }}
                            backgroundColor="$red5"
                          >
                            <XStack gap="$2" alignItems="center">
                              <Feather name="x" size={14} color="#EF4444" />
                              <Text color="#EF4444" fontWeight="500">
                                Cancel Request
                              </Text>
                            </XStack>
                          </Button>
                        )}
                      </YStack>
                    )}

                    {/* Custom Message - only show if not pending */}
                    {!hasPendingInvitation && (
                      <YStack gap="$2">
                        <Text fontSize="$4" color="$color" fontWeight="500">
                          Personal Message (Optional):
                        </Text>
                        <TextInput
                          value={relationshipCustomMessage}
                          onChangeText={setRelationshipCustomMessage}
                          placeholder={
                            profile?.role === 'instructor'
                              ? 'Tell them why you want them as your instructor...'
                              : 'Tell them why you want to supervise them...'
                          }
                          multiline
                          style={{
                            backgroundColor: theme.background?.val || '#fff',
                            color: theme.color?.val || '#11181C',
                            borderColor: theme.borderColor?.val || 'rgba(0, 0, 0, 0.1)',
                            borderWidth: 1,
                            borderRadius: 8,
                            padding: 12,
                            minHeight: 80,
                            textAlignVertical: 'top',
                          }}
                          placeholderTextColor={theme.gray10?.val || 'rgba(0, 0, 0, 0.3)'}
                        />
                      </YStack>
                    )}

                    {/* Action Buttons */}
                    <YStack gap="$2">
                      {(() => {
                        console.log('🎯 [UserProfileSheet] Action buttons render check:', {
                          hasPendingInvitation,
                          pendingInvitationType,
                          willShowSendButton: !hasPendingInvitation,
                          willShowCancelButton:
                            hasPendingInvitation && pendingInvitationType === 'sent',
                          willShowAcceptDeclineButtons:
                            hasPendingInvitation && pendingInvitationType === 'received',
                        });
                        return !hasPendingInvitation;
                      })() ? (
                        <Button
                          onPress={handleCreateConnection}
                          backgroundColor={profile?.role === 'instructor' ? '$blue10' : '$green10'}
                        >
                          <XStack gap="$2" alignItems="center">
                            <Feather name="send" size={16} color="white" />
                            <Text color="white" fontWeight="600">
                              {profile?.role === 'instructor'
                                ? 'Send Supervision Request'
                                : 'Send Student Invitation'}
                            </Text>
                          </XStack>
                        </Button>
                      ) : pendingInvitationType === 'sent' ? (
                        <Button onPress={handleCancelPendingInvitation} backgroundColor="$red5">
                          <XStack gap="$2" alignItems="center">
                            <Feather name="x" size={16} color="#EF4444" />
                            <Text color="#EF4444" fontWeight="600">
                              Cancel Request
                            </Text>
                          </XStack>
                        </Button>
                      ) : (
                        // Received invitation - show accept/decline buttons (UnifiedInvitationModal style)
                        <XStack gap="$3" justifyContent="space-around">
                          <Button
                            flex={1}
                            onPress={handleDeclineInvitation}
                            backgroundColor="$gray5"
                          >
                            <Text color="$color" fontWeight="600">
                              Decline
                            </Text>
                          </Button>
                          <Button
                            flex={1}
                            onPress={handleAcceptInvitation}
                            backgroundColor="$green10"
                          >
                            <Text color="white" fontWeight="600">
                              Accept
                            </Text>
                          </Button>
                        </XStack>
                      )}
                      <Button onPress={onClose} backgroundColor="$gray5">
                        <Text color="$color">Close</Text>
                      </Button>
                    </YStack>
                  </YStack>
                </ScrollView>
              )}
            </YStack>
          </ReanimatedAnimated.View>
        </GestureDetector>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
};
