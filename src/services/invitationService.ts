import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type UserRole = Database['public']['Enums']['user_role'];

interface InvitationData {
  email: string;
  role?: UserRole;
  supervisorId?: string;
  supervisorName?: string;
  metadata?: Record<string, any>;
}

interface BulkInvitationResult {
  successful: string[];
  failed: Array<{ email: string; error: string }>;
}

/**
 * Send invitation to a new user using Supabase Auth
 * This will trigger Supabase's invitation email template
 */
export async function inviteNewUser(data: InvitationData): Promise<{ success: boolean; error?: string }> {
  try {
    const { email, role = 'student', supervisorId, supervisorName, metadata = {} } = data;

    // Create pending invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        invited_by: supervisorId,
        metadata: {
          ...metadata,
          supervisorName,
          invitedAt: new Date().toISOString(),
        },
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation record:', inviteError);
      // Continue even if record creation fails - email is more important
    }

    // Call Supabase Edge Function to send invitation email
    const { data: functionResponse, error: emailError } = await supabase.functions.invoke('send-invitation', {
      body: {
        email: email.toLowerCase(),
        role,
        supervisorId,
        supervisorName,
      },
    });

    if (emailError || !functionResponse?.success) {
      throw new Error(functionResponse?.error || emailError?.message || 'Failed to send invitation');
    }

    return { success: true };
  } catch (error) {
    console.error('Error inviting user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitation' 
    };
  }
}

/**
 * Send invitations to multiple users at once
 */
export async function inviteMultipleUsers(
  emails: string[],
  role: UserRole = 'student',
  supervisorId?: string,
  supervisorName?: string
): Promise<BulkInvitationResult> {
  const successful: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  // Process invitations in parallel with rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(
      batch.map(async (email) => {
        const result = await inviteNewUser({
          email,
          role,
          supervisorId,
          supervisorName,
        });
        
        if (result.success) {
          successful.push(email);
        } else {
          failed.push({ email, error: result.error || 'Unknown error' });
        }
        
        return result;
      })
    );
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { successful, failed };
}

/**
 * Check if an email already has a pending invitation
 */
export async function checkPendingInvitation(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Get all pending invitations sent by a user
 */
export async function getPendingInvitations(userId: string) {
  try {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('invited_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return [];
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pending_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    return !error;
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return false;
  }
}

/**
 * Accept an invitation and create supervisor relationship
 */
export async function acceptInvitation(email: string, userId: string): Promise<boolean> {
  try {
    // Find pending invitation
    const { data: invitation, error: findError } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (findError || !invitation) {
      console.log('No pending invitation found for', email);
      return false;
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('pending_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: userId
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return false;
    }

    // Create supervisor relationship if invited by someone
    if (invitation.invited_by) {
      const { error: relError } = await supabase
        .from('student_supervisor_relationships')
        .insert({
          student_id: userId,
          supervisor_id: invitation.invited_by,
        });

      if (relError) {
        console.error('Error creating supervisor relationship:', relError);
        // Don't fail the whole process if relationship creation fails
      }
    }

    // Update user role if specified
    if (invitation.role) {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: invitation.role })
        .eq('id', userId);

      if (roleError) {
        console.error('Error updating user role:', roleError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return false;
  }
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string): Promise<boolean> {
  try {
    const { data: invitation, error: findError } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (findError || !invitation) return false;

    // Resend the invitation email
    const result = await inviteNewUser({
      email: invitation.email,
      role: invitation.role,
      supervisorId: invitation.invited_by,
      supervisorName: invitation.metadata?.supervisorName,
      metadata: {
        ...invitation.metadata,
        resent: true,
        resentAt: new Date().toISOString(),
      },
    });

    return result.success;
  } catch (error) {
    console.error('Error resending invitation:', error);
    return false;
  }
}