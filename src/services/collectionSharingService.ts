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
  async createCollectionInvitation(request: CollectionShareRequest, inviterUserId: string): Promise<{ success: boolean; error?: string; invitationId?: string }> {
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, name')
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
        .from('collection_invitations')
        .select('id')
        .eq('collection_id', request.collectionId)
        .eq('invited_user_id', userData.id)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        return { success: false, error: 'User already has a pending invitation to this collection' };
      }

      // Get inviter's name
      const { data: inviterData, error: inviterError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', inviterUserId)
        .single();

      const inviterName = inviterData?.name || 'Unknown User';

      // Create the invitation
      const { data: invitation, error: createError } = await supabase
        .from('collection_invitations')
        .insert({
          collection_id: request.collectionId,
          invited_user_id: userData.id,
          invited_user_email: request.invitedUserEmail,
          invited_by: inviterUserId,
          invited_by_name: inviterName,
          status: 'pending',
          message: request.message || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Send notification to the invited user
      await notificationService.createCollectionInvitationNotification(
        userData.id,
        request.collectionId,
        request.collectionName,
        inviterUserId
      );

      return { success: true, invitationId: invitation.id };
    } catch (error) {
      console.error('Error creating collection invitation:', error);
      return { success: false, error: 'Failed to create invitation' };
    }
  }

  // Accept a collection invitation
  async acceptCollectionInvitation(invitationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('collection_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found or already processed' };
      }

      // Add user to the collection
      const { error: memberError } = await supabase
        .from('map_preset_members')
        .insert({
          preset_id: invitation.collection_id,
          user_id: userId,
          added_by: invitation.invited_by,
        });

      if (memberError) {
        // If user is already a member, that's okay
        if (memberError.code !== '23505') { // Unique constraint violation
          throw memberError;
        }
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('collection_invitations')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Error accepting collection invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Reject a collection invitation
  async rejectCollectionInvitation(invitationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('collection_invitations')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('invited_user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error rejecting collection invitation:', error);
      return { success: false, error: 'Failed to reject invitation' };
    }
  }

  // Get pending invitations for a user
  async getPendingInvitations(userId: string): Promise<CollectionInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('collection_invitations')
        .select(`
          *,
          collection:map_presets(name)
        `)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(inv => ({
        id: inv.id,
        collection_id: inv.collection_id,
        collection_name: inv.collection?.name || 'Unknown Collection',
        invited_user_id: inv.invited_user_id,
        invited_user_email: inv.invited_user_email,
        invited_by: inv.invited_by,
        invited_by_name: inv.invited_by_name,
        status: inv.status,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
      })) || [];
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
        .select(`
          *,
          collection:map_presets(*)
        `)
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) throw error;

      return data?.map(member => ({
        ...member.collection,
        member_since: member.added_at,
        added_by: member.added_by,
      })) || [];
    } catch (error) {
      console.error('Error fetching shared collections:', error);
      return [];
    }
  }
}

export const collectionSharingService = new CollectionSharingService();
