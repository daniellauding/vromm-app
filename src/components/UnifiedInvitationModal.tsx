import React, { useState, useEffect } from 'react';
import { Modal, Pressable, useColorScheme, Image, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { ScrollView, YStack, XStack, Heading, Paragraph } from 'tamagui';
import { Button } from '../components/Button';
import { Text } from './Text';
import { useTranslation } from '@/src/contexts/TranslationContext';
import { X, User, Users, Check, X as XIcon } from '@tamagui/lucide-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserProfileSheet } from './UserProfileSheet';
import { LinearGradient } from 'expo-linear-gradient'

// 🖼️ Import static images (OPTIONAL - comment out if files don't exist yet)
/* eslint-disable @typescript-eslint/no-var-requires */
// Uncomment these when you add image files to assets/images/invitations/
const INVITATION_IMAGES = {
  supervisor: require('../../assets/images/invitations/supervisor-invite.png'),
  student: require('../../assets/images/invitations/student-invite.png'),
  collection: require('../../assets/images/invitations/collection-invite.png'),
};
// const INVITATION_IMAGES = null;
/* eslint-enable @typescript-eslint/no-var-requires */

interface UnifiedInvitationModalProps {
  visible: boolean;
  onClose: () => void;
  onInvitationHandled: () => void;
}

interface PendingInvitation {
  id: string;
  type: 'relationship' | 'collection';
  title_key?: string; // Translation key for title
  title?: string; // Fallback title
  message_key?: string; // Translation key for message
  message?: string; // Fallback message
  from_user_name: string;
  from_user_email: string;
  from_user_id?: string; // 🎨 User ID for profile link
  avatar_url?: string; // 🎨 Avatar URL
  custom_message?: string;
  role?: string;
  collection_name?: string;
  collection_id?: string; // Add collection_id for database operations
  invitation_id: string;
  created_at: string;
}

export function UnifiedInvitationModal({ 
  visible, 
  onClose, 
  onInvitationHandled 
}: UnifiedInvitationModalProps) {
  const { t, refreshTranslations, language } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const colorScheme = useColorScheme();
  
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 🎨 Profile sheet state
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const backgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = colorScheme === 'dark' ? 'white' : 'black';
  const borderColor = colorScheme === 'dark' ? '#333' : '#DDD';
  
  // DEBUG: Log translations on render
  useEffect(() => {
    console.log('🔍 [UnifiedInvitationModal] DEBUG Translation check:', {
      language,
      'invitations.newInvitations': t('invitations.newInvitations'),
      'invitations.personalMessage': t('invitations.personalMessage'),
      'invitations.supervisorInvitation': t('invitations.supervisorInvitation'),
    });
  }, [language, t]);

  // Fetch pending invitations
  useEffect(() => {
    if (visible && user) {
      // Refresh translations when modal opens to ensure we have latest
      refreshTranslations().then(() => {
        // Force a state update after translations refresh to trigger re-render
        setInvitations(prev => [...prev]);
      }).catch(() => {
        // Silent fail on translation refresh
      });
      fetchPendingInvitations();
    }
  }, [visible, user]);

  const fetchPendingInvitations = async () => {
    if (!user) return;
    
    console.log('🔍 [UnifiedInvitationModal] Fetching invitations for user:', user.email);
    setIsLoading(true);
    try {
      // Fetch relationship invitations from notifications table
      const { data: relationshipInvitations, error: relError } = await supabase
        .from('notifications')
        .select(`
          id,
          message,
          metadata,
          created_at,
          actor_id,
          profiles!notifications_actor_id_fkey(full_name, email, avatar_url)
        `)
        .eq('user_id', user.id)
        .in('type', ['supervisor_invitation', 'student_invitation'])
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      console.log('🔍 [UnifiedInvitationModal] Relationship invitations:', relationshipInvitations);
      if (relError) throw relError;

      // Filter out invitations where relationships already exist
      const filteredRelationshipInvitations = [];
      if (relationshipInvitations) {
        for (const notif of relationshipInvitations) {
          const metadata = notif.metadata || {};
          const targetUserId = metadata.targetUserId || notif.actor_id;
          
          // Check if relationship already exists
          const { data: existingRel } = await supabase
            .from('student_supervisor_relationships')
            .select('id')
            .or(`and(student_id.eq.${user.id},supervisor_id.eq.${targetUserId}),and(student_id.eq.${targetUserId},supervisor_id.eq.${user.id})`)
            .eq('status', 'active')
            .single();

          if (!existingRel) {
            filteredRelationshipInvitations.push(notif);
          } else {
            console.log('🔍 [UnifiedInvitationModal] Filtering out processed relationship invitation:', notif.id);
            // Mark notification as read since relationship already exists
            await supabase
              .from('notifications')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', notif.id);
          }
        }
      }

      // Fetch collection invitations from collection_invitations table
      const { data: collectionInvitations, error: colError } = await supabase
        .from('collection_invitations')
        .select(`
          id,
          preset_id,
          invited_user_id,
          invited_by_user_id,
          role,
          status,
          message,
          created_at,
          map_presets(name)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');

      console.log('🔍 [UnifiedInvitationModal] Collection invitations:', collectionInvitations);
      if (colError) throw colError;

      // Fetch collection invitations from notifications table
      const { data: notificationInvitations, error: notifError} = await supabase
        .from('notifications')
        .select(`
          id,
          message,
          metadata,
          created_at,
          actor_id,
          profiles!notifications_actor_id_fkey(full_name, email, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('type', 'collection_invitation')
        .eq('is_read', false);

      console.log('🔍 [UnifiedInvitationModal] Notification invitations:', notificationInvitations);
      if (notifError) throw notifError;

      // Combine and format invitations
      const formattedInvitations: PendingInvitation[] = [];
      
      console.log('🔍 [UnifiedInvitationModal] Total invitations found:', {
        relationship: relationshipInvitations?.length || 0,
        filteredRelationship: filteredRelationshipInvitations?.length || 0,
        collection: collectionInvitations?.length || 0,
        notifications: notificationInvitations?.length || 0
      });

      // Add relationship invitations from notifications
      filteredRelationshipInvitations?.forEach(notif => {
        const metadata = notif.metadata || {};
        const isSupervisorInvitation = notif.message?.includes('supervisor') || notif.message?.includes('supervise') || notif.message?.includes('handledare');
        
        formattedInvitations.push({
          id: notif.id,
          type: 'relationship',
          title_key: isSupervisorInvitation ? 'invitations.supervisorInvitation' : 'invitations.studentInvitation',
          title: isSupervisorInvitation ? 'Supervisor Invitation' : 'Student Invitation',
          message_key: isSupervisorInvitation ? 'invitations.supervisorMessage' : 'invitations.studentMessage',
          message: notif.message,
          from_user_name: notif.profiles?.full_name || metadata.from_user_name || 'Unknown',
          from_user_email: notif.profiles?.email || metadata.from_user_name || '',
          from_user_id: notif.actor_id || metadata.targetUserId, // 🎨 Add user ID
          avatar_url: notif.profiles?.avatar_url, // 🎨 Add avatar
          custom_message: metadata.customMessage || '',
          role: isSupervisorInvitation ? 'supervisor' : 'student',
          invitation_id: metadata.invitation_id || notif.id,
          created_at: notif.created_at
        });
      });

      // Add collection invitations from collection_invitations table
      collectionInvitations?.forEach(inv => {
        formattedInvitations.push({
          id: inv.id,
          type: 'collection',
          title_key: 'invitations.collectionInvitation',
          title: 'Collection Invitation',
          message_key: 'invitations.collectionMessage',
          message: 'wants to share a collection with you',
          from_user_name: 'Unknown', // We'll get this from notifications instead
          from_user_email: '',
          custom_message: inv.message,
          role: inv.role,
          collection_name: inv.map_presets?.name,
          invitation_id: inv.id,
          created_at: inv.created_at
        });
      });

      // Add collection invitations from notifications table
      notificationInvitations?.forEach(notif => {
        const metadata = notif.metadata || {};
        formattedInvitations.push({
          id: notif.id,
          type: 'collection',
          title_key: 'invitations.collectionInvitation',
          title: 'Collection Invitation',
          message_key: 'invitations.collectionMessage',
          message: notif.message,
          from_user_name: notif.profiles?.full_name || metadata.from_user_name || 'Unknown',
          from_user_email: notif.profiles?.email || metadata.from_user_name || '',
          from_user_id: notif.actor_id, // 🎨 Add user ID
          avatar_url: notif.profiles?.avatar_url, // 🎨 Add avatar
          custom_message: metadata.customMessage || '',
          role: metadata.sharingRole || 'viewer',
          collection_name: metadata.collection_name,
          collection_id: metadata.collection_id, // Add collection_id for database operations
          invitation_id: metadata.invitation_id || notif.id,
          created_at: notif.created_at
        });
      });

      setInvitations(formattedInvitations);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('invitations.loadingError') || 'Error loading pending invitations',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitations[currentIndex]) return;
    
    setIsProcessing(true);
    try {
      const invitation = invitations[currentIndex];
      
      if (invitation.type === 'relationship') {
        // Use fixed universal function for relationship invitations
        const { data, error } = await supabase.rpc('accept_any_invitation_universal', {
          p_invitation_id: invitation.invitation_id,
          p_accepted_by: user?.id
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);
      } else {
        // Accept collection invitation
        // First try to update collection_invitations table
        const { error: colError } = await supabase
          .from('collection_invitations')
          .update({ 
            status: 'accepted',
            responded_at: new Date().toISOString()
          })
          .eq('id', invitation.invitation_id);

        // If that fails, try to handle notification-based invitation
        if (colError) {
          console.log('🔍 [UnifiedInvitationModal] Collection invitation not found in collection_invitations, trying notification-based handling');
          
          // Mark notification as read
          const { error: notifError } = await supabase
            .from('notifications')
            .update({ 
              is_read: true,
              read_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

          if (notifError) throw notifError;

          // Add user to collection using collection_id from invitation
          if (invitation.collection_id) {
            const { error: memberError } = await supabase
              .from('map_preset_members')
              .insert({
                preset_id: invitation.collection_id, // Use collection_id from invitation
                user_id: user?.id,
                role: invitation.role || 'viewer'
              });

            if (memberError) {
              // If user is already a member (duplicate key), that's okay
              if (memberError.code === '23505') {
                console.log('🔍 [UnifiedInvitationModal] User already a member of collection, continuing...');
              } else {
                console.log('🔍 [UnifiedInvitationModal] Error adding to collection:', memberError);
                // Don't throw here, as the notification is already marked as read
              }
            }
          }
        } else {
          // Standard collection invitation handling
          // Add user to collection
          const { error: memberError } = await supabase
            .from('map_preset_members')
            .insert({
              preset_id: invitation.collection_id || invitation.preset_id, // Use collection_id or preset_id
              user_id: user?.id,
              role: invitation.role || 'read'
            });

          if (memberError) {
            // If user is already a member (duplicate key), that's okay
            if (memberError.code === '23505') {
              console.log('🔍 [UnifiedInvitationModal] User already a member of collection, continuing...');
            } else {
              throw memberError;
            }
          }

          // Send notification to collection owner that invitation was accepted
          const { data: collectionData } = await supabase
            .from('map_presets')
            .select('creator_id, name')
            .eq('id', invitation.collection_id || invitation.preset_id)
            .single();

          if (collectionData && collectionData.creator_id !== user?.id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: collectionData.creator_id,
                actor_id: user?.id,
                type: 'collection_invitation_accepted',
                title: 'Collection Invitation Accepted',
                message: `${user?.email || 'Someone'} accepted your invitation to join "${collectionData.name}"`,
                metadata: {
                  collection_id: invitation.collection_id || invitation.preset_id,
                  collection_name: collectionData.name,
                  accepted_by: user?.id,
                  accepted_by_name: user?.email,
                },
                action_url: 'vromm://notifications',
                priority: 'normal',
                is_read: false,
              });

            console.log('✅ [UnifiedInvitationModal] Collection acceptance notification sent to owner:', collectionData.creator_id);
          }
        }
      }

      showToast({
        title: t('invitations.accepted') || 'Invitation Accepted',
        message: invitation.type === 'relationship' 
          ? (t('invitations.youAreNowConnected') || 'You are now connected!')
          : (t('invitations.youNowHaveAccess') || 'You now have access to this collection!'),
        type: 'success',
      });

      // Move to next invitation or close
      if (currentIndex < invitations.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onInvitationHandled();
        onClose();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('invitations.failedToAccept') || 'Failed to accept invitation',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitations[currentIndex]) return;
    
    setIsProcessing(true);
    try {
      const invitation = invitations[currentIndex];
      
      if (invitation.type === 'relationship') {
        // Decline relationship invitation
        // First try to update pending_invitations table
        const { error: pendingError } = await supabase
          .from('pending_invitations')
          .update({ status: 'declined' })
          .eq('id', invitation.invitation_id);

        // If that fails, handle notification-based invitation
        if (pendingError) {
          console.log('🔍 [UnifiedInvitationModal] Relationship invitation not found in pending_invitations, trying notification-based handling');
          
          // Mark notification as read
          const { error: notifError } = await supabase
            .from('notifications')
            .update({ 
              is_read: true,
              read_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

          if (notifError) throw notifError;
        }
      } else {
        // Decline collection invitation
        // First try to update collection_invitations table
        const { error: colError } = await supabase
          .from('collection_invitations')
          .update({ 
            status: 'declined',
            responded_at: new Date().toISOString()
          })
          .eq('id', invitation.invitation_id);

        // If that fails, try to handle notification-based invitation
        if (colError) {
          console.log('🔍 [UnifiedInvitationModal] Collection invitation not found in collection_invitations, trying notification-based handling');
          
          // Mark notification as read
          const { error: notifError } = await supabase
            .from('notifications')
            .update({ 
              is_read: true,
              read_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

          if (notifError) throw notifError;
        }
      }

      showToast({
        title: t('common.success') || 'Success',
        message: t('invitations.invitationDeclined') || 'Invitation declined',
        type: 'success',
      });

      // Move to next invitation or close
      if (currentIndex < invitations.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onInvitationHandled();
        onClose();
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      showToast({
        title: t('common.error') || 'Error',
        message: t('invitations.failedToDecline') || 'Failed to decline invitation',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    // Move to next invitation or close
    if (currentIndex < invitations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onInvitationHandled();
      onClose();
    }
  };

  if (!visible || invitations.length === 0) {
    return null;
  }

  const currentInvitation = invitations[currentIndex];
  const isLastInvitation = currentIndex === invitations.length - 1;

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <BlurView
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        intensity={10}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
      />
      <Pressable 
        style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0,0,0,0.3)', 
        }} 
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <YStack
            width="90%"
            maxHeight="90%"
            backgroundColor="transparent"
            justifyContent="center"
            alignItems="center"
            flex={1}
          >

            <YStack
              backgroundColor={backgroundColor}
              paddingVertical="$4"
              paddingTop="$0"
              overflow="hidden"
              paddingHorizontal="$0"
              borderRadius="$4"
              width="100%"
              gap="$3"
              borderColor={borderColor}
              borderWidth={0}
            >

            {/* <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 0,
                margin: 0,
                gap: 0,
                justifyContent: 'center', 
                alignItems: 'center', 
              }}
              style={{
                padding: 0,
                margin: 0,
                maxWidth: '85%',
                maxHeight:'85%',
              }}
            > */}
              <YStack
                paddingVertical="$4"
                paddingTop="$0"
                // overflow="hidden"
                paddingHorizontal="$0"
                borderRadius="$4"
                width="100%"
                gap="$3"
              >
                  
                  {/* Invitation Content */}
                  <YStack gap="$3">
                    {/* 🖼️ Header Image - Only renders if INVITATION_IMAGES is set */}
                    {INVITATION_IMAGES && (
                      <YStack
                        alignItems="center"
                        marginBottom="$2"
                        backgroundColor="rgba(255,255,255,0.1)"
                        // paddingHorizontal="$2"
                        // paddingVertical="$4"
                      >
                        <Button
                          variant="icon"
                          size="xs"
                          onPress={onClose}
                          padding="$2"
                          accessibilityLabel="Close"
                          position="absolute"
                          zIndex={1}
                          top="$4"
                          right="$4"
                        >
                          <X size={20} color={textColor} />
                        </Button>
                        <YStack
                            width="100%"
                            height={230}
                            justifyContent="center"
                            alignItems="center"
                            // overflow="hidden"
                            position="relative"
                            paddingBottom={90}
                        >
                          <Image
                            source={
                              currentInvitation.type === 'collection'
                                ? INVITATION_IMAGES.collection
                                : currentInvitation.role === 'supervisor'
                                ? INVITATION_IMAGES.supervisor
                                : INVITATION_IMAGES.student
                            }
                            style={{
                              borderRadius: '8px 8px 0 0',
                              maxWidth: '100%',
                              width: '100%',
                              // aspectRatio: 306 / 325
                            }}
                            resizeMode="cover"
                          />

                        {/* 🎨 Avatar - Pressable to open profile */}
                        {currentInvitation.from_user_id && (
                          <YStack
                            alignItems="center"
                            justifyContent="center"
                            position="absolute"
                            bottom={-30} // try also -25 or -40 depending on size
                            zIndex={10}
                          >
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedUserId(currentInvitation.from_user_id || null);
                                setShowProfileSheet(true);
                              }}
                              activeOpacity={0.7}
                            >
                              {currentInvitation.avatar_url ? (
                                <Image
                                  source={{ uri: currentInvitation.avatar_url }}
                                  style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    borderWidth: 2,
                                    borderColor: colorScheme === 'dark' ? '#00FFBC' : '#00CC96',
                                  }}
                                />
                              ) : (
                                <YStack
                                  width={60}
                                  height={60}
                                  borderRadius={30}
                                  backgroundColor={colorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5'}
                                  alignItems="center"
                                  justifyContent="center"
                                  borderWidth={2}
                                  borderColor={colorScheme === 'dark' ? '#00FFBC' : '#00CC96'}
                                >
                                  <User size={30} color={textColor} />
                                </YStack>
                              )}
                            </TouchableOpacity>
                          </YStack>
                        )}

                        </YStack>
                      </YStack>
                      
                    )}

                    {/* Header */}

                    {/* 🎨 Scrollable content wrapper with fade overlay */}
                    <YStack position="relative" width="100%" paddingHorizontal="$4">
                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                          paddingBottom: 20,
                        }}
                        style={{
                          maxHeight: 250,
                        }}
                      >
                        <YStack paddingTop={24}>
                        {/* <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                          <Heading size="$5" color={textColor} flex={1} textAlign="center">
                            {(() => {
                              const translated = t('invitations.newInvitations');
                              console.log('🔍 [UnifiedInvitationModal] Header translation:', translated);
                              return translated === 'invitations.newInvitations' ? 'New Invitations' : translated;
                            })()}
                          </Heading>
                        </XStack> */}
                        <XStack alignItems="center" gap="$2" justifyContent="center">
                          <Heading size="$5" color={textColor} flex={1} textAlign="center">
                            {currentInvitation.title_key ? t(currentInvitation.title_key) : currentInvitation.title}
                          </Heading>
                        </XStack>

                        <Paragraph color={textColor} textAlign="center" lineHeight="$2">
                          <Text fontWeight="600">{currentInvitation.from_user_name}</Text>{' '}
                          {currentInvitation.message_key ? t(currentInvitation.message_key) : currentInvitation.message}
                        </Paragraph>

                        {currentInvitation.custom_message && (
                          <YStack padding="$4">
                            {/* <Text color={textColor} fontWeight="bold" fontSize="$3" marginBottom="$2">
                              {(() => {
                                const translated = t('invitations.personalMessage');
                                console.log('🔍 [UnifiedInvitationModal] PersonalMessage translation:', translated);
                                return translated === 'invitations.personalMessage' ? 'Personal message:' : translated;
                              })()}
                            </Text> */}
                            <Text color={textColor} fontSize="$4" textAlign="center">
                              "{currentInvitation.custom_message}"
                            </Text>
                            {/* <Text color={textColor} fontSize="$3">
                            asdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasja
                            sdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajd
                            asjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasad
                            sasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasj
                            asdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsaj
                            dasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasa
                            dsasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdas
                            adsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdja
                            sjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjds
                            ajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjda
                            sadsasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjd
                            asadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasd
                            jasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadj
                            dsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasj
                            dasadsasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdas
                            jdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdha
                            sdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsa
                            djdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjdasjdasadsasdhasdjasjasdjsadjdsajdasjda
                            sjdasads
                            </Text> */}
                          </YStack>
                        )}

                        {currentInvitation.collection_name && (
                          <Text color={textColor} fontSize="$3" textAlign="center">
                            {t('invitations.collectionName') || 'Collection'}: {currentInvitation.collection_name}
                          </Text>
                        )}
                        </YStack>
                      </ScrollView>

                      {/* 🔽 Faded overlay at bottom of scroll area */}
                      <LinearGradient
                        colors={['transparent', backgroundColor]}
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 40,
                          zIndex: 10,
                        }}
                        pointerEvents="none"
                      />
                    </YStack>
                  </YStack>

                  {isProcessing && (
                    <XStack alignItems="center" justifyContent="center" gap="$2" marginTop="$2">
                      <Text color={textColor} fontSize="$2">Processing...</Text>
                    </XStack>
                  )}
                  
              </YStack>

              {/* Action Buttons */}
              <XStack justifyContent="space-around" marginTop="$4" gap="$4" paddingHorizontal="$4">
                {/* <Button 
                  flex={1} 
                  variant="outline" 
                  onPress={handleDismiss}
                  disabled={isProcessing}
                >
                  {t('invitations.dismiss') || 'Dismiss'}
                </Button> */}
                <Button 
                  flex={1} 
                  variant="secondary" 
                  onPress={handleDecline}
                  disabled={isProcessing}
                  size="sm"
                >
                  {t('invitations.decline') || 'Decline'}
                </Button>
                <Button 
                  flex={1} 
                  variant="primary" 
                  onPress={handleAccept}
                  disabled={isProcessing}
                  size="sm"
                >
                  {t('invitations.accept') || 'Accept'}
                </Button>
              </XStack>
            </YStack>
            <Text color={textColor} fontSize="$2" textAlign="center" opacity={0.7} marginTop="$4">
              {currentIndex + 1} of {invitations.length}
            </Text>
          </YStack>
          </Pressable>
      </Pressable>

      {/* 🎨 User Profile Sheet - Opens when avatar is pressed */}
      <UserProfileSheet
        visible={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
        userId={selectedUserId}
        onViewAllRoutes={() => {}}
        onEditProfile={() => {}}
      />
    </Modal>
  );
}