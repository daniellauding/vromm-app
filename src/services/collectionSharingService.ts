import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export interface CollectionInvitation {
  id: string;
  collection_id: string;
  collection_name: string;
  invited_user_id: string;
  invited_user_email: string;
  invited_by: string;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  message?: string;
  role?: string; // Add role for notification-based invitations
}

export interface CollectionShareRequest {
  collectionId: string;
  collectionName: string;
  invitedUserEmail: string;
  invitedUserRole?: string;
  message?: string;
}

class CollectionSharingService {
  // Create a collection invitation
  async createCollectionInvitation(
    request: CollectionShareRequest,
    inviterUserId: string,
  ): Promise<{ success: boolean; error?: string; invitationId?: string }> {
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', request.invitedUserEmail)
        .single();

      if (userError || !userData) {
        return { success: false, error: 'User not found with this email address' };
      }

      // Check if user is already a member of this collection
      const { data: existingMember, error: memberError } = await supabase
        .from('map_preset_members')
        .select('id')
        .eq('preset_id', request.collectionId)
        .eq('user_id', userData.id)
        .single();

      if (existingMember) {
        return { success: false, error: 'User is already a member of this collection' };
      }

      // Check if there's already a pending invitation
      const { data: existingInvitation, error: invitationError } = await supabase
        .from('pending_invitations')
        .select('id')
        .eq('email', request.invitedUserEmail)
        .eq('role', 'collection_sharing')
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        return {
          success: false,
          error: 'User already has a pending invitation to this collection',
        };
      }

      // Get inviter's name
      const { data: inviterData, error: inviterError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', inviterUserId)
        .single();

      const inviterName = inviterData?.full_name || 'Unknown User';

      // Create the invitation using the correct schema
      // Try with collection_sharing role first, fallback to student if not supported
      let invitation, createError;

      try {
        const result = await supabase
          .from('pending_invitations')
          .insert({
            email: request.invitedUserEmail,
            role: 'collection_sharing',
            invited_by: inviterUserId,
            status: 'pending',
            metadata: {
              collectionId: request.collectionId,
              collectionName: request.collectionName,
              inviterName: inviterName,
              customMessage: request.message || null,
              invitedAt: new Date().toISOString(),
              targetUserId: userData.id,
              targetUserName: userData.full_name,
              invitationType: 'collection_sharing', // Mark this as a collection sharing invitation
            },
          })
          .select()
          .single();

        invitation = result.data;
        createError = result.error;
      } catch (error) {
        // If collection_sharing role is not supported, fallback to student role
        console.warn('Collection sharing role not supported, falling back to student role:', error);

        const result = await supabase
          .from('pending_invitations')
          .insert({
            email: request.invitedUserEmail,
            role: 'student', // Fallback to student role
            invited_by: inviterUserId,
            status: 'pending',
            metadata: {
              collectionId: request.collectionId,
              collectionName: request.collectionName,
              inviterName: inviterName,
              customMessage: request.message || null,
              invitedAt: new Date().toISOString(),
              targetUserId: userData.id,
              targetUserName: userData.full_name,
              invitationType: 'collection_sharing', // Mark this as a collection sharing invitation
            },
          })
          .select()
          .single();

        invitation = result.data;
        createError = result.error;
      }

      if (createError) throw createError;

      // Send notification to the invited user
      await notificationService.createCollectionInvitationNotification(
        userData.id,
        request.collectionId,
        request.collectionName,
        inviterUserId,
      );

      return { success: true, invitationId: invitation.id };
    } catch (error) {
      console.error('Error creating collection invitation:', error);
      return { success: false, error: 'Failed to create invitation' };
    }
  }

  // Accept a collection invitation
  async acceptCollectionInvitation(
    invitationId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's email first
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData?.email) {
        return { success: false, error: 'User not found' };
      }

      // Get the invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('email', userData.email)
        .eq('status', 'pending')
        .eq('role', 'collection_sharing')
        .single();

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found or already processed' };
      }

      const collectionId = invitation.metadata?.collectionId;
      if (!collectionId) {
        return { success: false, error: 'Invalid invitation data' };
      }

      // Add user to the collection
      const { error: memberError } = await supabase.from('map_preset_members').insert({
        preset_id: collectionId,
        user_id: userId,
        added_by: invitation.invited_by,
      });

      if (memberError) {
        // If user is already a member, that's okay
        if (memberError.code !== '23505') {
          // Unique constraint violation
          throw memberError;
        }
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('pending_invitations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) {
        // If it's a duplicate key error, that's okay - invitation was already processed
        if (updateError.code === '23505') {
          console.log('Invitation already processed, continuing...');
        } else {
          throw updateError;
        }
      }

      // Also clean up any related notifications
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .delete()
          .eq('metadata->>invitation_id', invitationId)
          .or(
            `metadata->>collection_id.eq.${collectionId},metadata->>collection_name.eq.${invitation.metadata?.collectionName}`,
          );

        if (notificationError) {
          console.warn('⚠️ Could not delete related notification:', notificationError);
        } else {
          console.log('🗑️ Related notification deleted after acceptance');
        }
      } catch (notificationCleanupError) {
        console.warn('⚠️ Error cleaning up notification:', notificationCleanupError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting collection invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Leave a collection
  async leaveCollection(
    collectionId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove user from the collection
      const { error: removeError } = await supabase
        .from('map_preset_members')
        .delete()
        .eq('preset_id', collectionId)
        .eq('user_id', userId);

      if (removeError) {
        // If user is not a member, that's okay
        if (removeError.code === 'PGRST116') {
          // No rows found
          return { success: true };
        }
        throw removeError;
      }

      return { success: true };
    } catch (error) {
      console.error('Error leaving collection:', error);
      return { success: false, error: 'Failed to leave collection' };
    }
  }

  // Reject a collection invitation
  async rejectCollectionInvitation(
    invitationId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user's email first
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData?.email) {
        return { success: false, error: 'User not found' };
      }

      const { error } = await supabase
        .from('pending_invitations')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId)
        .eq('email', userData.email)
        .eq('status', 'pending')
        .eq('role', 'collection_sharing');

      if (error) throw error;

      // Also clean up any related notifications
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .delete()
          .eq('metadata->>invitation_id', invitationId);

        if (notificationError) {
          console.warn('⚠️ Could not delete related notification:', notificationError);
        } else {
          console.log('🗑️ Related notification deleted after rejection');
        }
      } catch (notificationCleanupError) {
        console.warn('⚠️ Error cleaning up notification:', notificationCleanupError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting collection invitation:', error);
      return { success: false, error: 'Failed to reject invitation' };
    }
  }

  // Get pending invitations for a user
  async getPendingInvitations(userId: string): Promise<CollectionInvitation[]> {
    try {
      // Get user's email first
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData?.email) {
        console.error('Error fetching user email:', userError);
        console.log('🔧 [CollectionSharingService] User data:', userData);
        console.log('🔧 [CollectionSharingService] User error:', userError);

        // Try to get email from auth user as fallback
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.email) {
          console.log(
            '🔧 [CollectionSharingService] Using auth user email as fallback:',
            authUser.user.email,
          );
          // Continue with auth user email
          const userEmail = authUser.user.email;

          // Get pending invitations sent to this user's email
          const { data: invitations, error: invitationsError } = await supabase
            .from('collection_invitations')
            .select('*')
            .eq('invited_user_email', userEmail)
            .eq('status', 'pending');

          if (invitationsError) {
            console.error('Error fetching invitations:', invitationsError);
            return [];
          }

          return invitations || [];
        }

        return [];
      }

      // Get pending invitations sent to this user's email
      // Look for both collection_sharing role and invitations with invitationType metadata
      const { data: invitations, error: invitationsError } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('email', userData.email)
        .eq('status', 'pending')
        .or('role.eq.collection_sharing,metadata->>invitationType.eq.collection_sharing')
        .order('created_at', { ascending: false });

      console.log('🔍 [CollectionSharingService] Raw invitations query result:', {
        userId,
        email: userData.email,
        invitationsCount: invitations?.length || 0,
        invitations: invitations?.map((inv) => ({
          id: inv.id,
          status: inv.status,
          role: inv.role,
          metadata: inv.metadata,
        })),
      });

      if (invitationsError) throw invitationsError;

      if (!invitations || invitations.length === 0) {
        return [];
      }

      // Filter for collection sharing invitations and extract data from metadata
      const collectionInvitations = invitations.filter(
        (inv) =>
          inv.role === 'collection_sharing' &&
          inv.metadata?.collectionName &&
          inv.status === 'pending', // Double-check status is pending
      );

      console.log('🔍 [CollectionSharingService] Filtered collection invitations:', {
        totalInvitations: invitations.length,
        collectionInvitations: collectionInvitations.length,
        filteredInvitations: collectionInvitations.map((inv) => ({
          id: inv.id,
          collectionName: inv.metadata?.collectionName,
          status: inv.status,
          created_at: inv.created_at,
        })),
      });

      return collectionInvitations.map((inv) => ({
        id: inv.id,
        collection_id: inv.metadata?.collectionId || '',
        collection_name: inv.metadata?.collectionName || 'Unknown Collection',
        invited_user_id: userId,
        invited_user_email: inv.email,
        invited_by: inv.invited_by,
        invited_by_name: inv.metadata?.inviterName || 'Unknown',
        status: inv.status,
        message: inv.metadata?.customMessage || '',
        created_at: inv.created_at,
        updated_at: inv.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }

  // Get shared collections for a user (collections they're a member of)
  async getSharedCollections(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('map_preset_members')
        .select(
          `
          *,
          collection:map_presets(*)
        `,
        )
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) throw error;

      return (
        data?.map((member) => ({
          ...member.collection,
          member_since: member.added_at,
          added_by: member.added_by,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching shared collections:', error);
      return [];
    }
  }
}

export const collectionSharingService = new CollectionSharingService();
