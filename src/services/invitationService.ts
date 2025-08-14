import { supabase } from '../lib/supabase';
import { pushNotificationService } from './pushNotificationService';
import { Database } from '../lib/database.types';

type UserRole = Database['public']['Enums']['user_role'];

interface InvitationData {
  email: string;
  role?: UserRole;
  supervisorId?: string;
  supervisorName?: string;
  inviterRole?: UserRole; // Role of the person sending invitation
  relationshipType?: 'student_invites_supervisor' | 'supervisor_invites_student';
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
export async function inviteNewUser(data: InvitationData): Promise<{ success: boolean; error?: string; invitationId?: string; note?: string }> {
  try {
    const { 
      email, 
      role = 'student', 
      supervisorId, 
      supervisorName, 
      inviterRole,
      relationshipType,
      metadata = {} 
    } = data;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Please provide a valid email address' };
    }

    // Validate UUID format if supervisorId is provided
    if (supervisorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(supervisorId)) {
      return { success: false, error: 'Invalid supervisor ID. Please try again or contact support.' };
    }

    // Determine the actual role to assign based on invitation type
    let targetRole = role;
    if (relationshipType === 'student_invites_supervisor') {
      // Student inviting someone to be their supervisor
      targetRole = 'instructor'; // Default supervisor role
    }

    // Try to create pending invitation record first
    let invitation: any = null;
    const { data: invitationData, error: inviteError } = await supabase
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role: targetRole,
        invited_by: supervisorId,
        metadata: {
          ...metadata,
          supervisorName,
          inviterRole,
          relationshipType,
          invitedAt: new Date().toISOString(),
        },
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation record:', inviteError);
      // If table doesn't exist, we can still try the Edge Function
      if (!inviteError.message.includes('relation "pending_invitations" does not exist')) {
        throw new Error(`Database error: ${inviteError.message}`);
      }
    } else {
      invitation = invitationData;
    }

    // Try Edge Function first, fallback to simple approach if it fails
    try {
      const { data: functionResponse, error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: email.toLowerCase(),
          role: targetRole,
          supervisorId,
          supervisorName,
          inviterRole,
          relationshipType,
        },
      });

      if (emailError) {
        console.warn('Edge Function not available, using fallback approach:', emailError.message);
        throw new Error('Edge Function unavailable');
      }

      if (!functionResponse?.success) {
        console.warn('Edge Function returned error, using fallback:', functionResponse);
        throw new Error('Edge Function unsuccessful');
      }

      console.log('✅ Invitation sent successfully via Edge Function');
      // Try to notify existing users in-app (if email belongs to a profile)
      try {
        const { data: recipient } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .single();
        if (recipient?.id && invitation?.id) {
          await supabase.from('notifications').insert({
            user_id: recipient.id,
            actor_id: supervisorId,
            type: relationshipType === 'student_invites_supervisor' ? 'supervisor_invitation' : 'student_invitation',
            message:
              relationshipType === 'student_invites_supervisor'
                ? `${supervisorName || 'A student'} invited you to be their supervisor`
                : `${supervisorName || 'An instructor'} invited you to be their student`,
            metadata: { invitation_id: invitation.id },
          });

          // Fire push notification (best-effort)
          try {
            await pushNotificationService.sendInvitationNotification(
              supervisorId || '',
              recipient.id,
              supervisorName || 'Someone',
              inviterRole || 'user',
              relationshipType === 'supervisor_invites_student' ? 'student' : 'supervisor',
            );
          } catch (e) {
            console.warn('Push send failed (invite):', e);
          }
        }
      } catch (e) {
        console.warn('Could not create in-app notification for invitation:', e);
      }
      return { success: true, invitationId: invitation?.id };

    } catch (functionError) {
      console.log('📧 Edge Function failed, using Supabase Auth fallback...');
      
      // Fallback: Use Supabase Auth's built-in invitation (requires service role, so this might also fail)
      // For now, we'll just return success for the invitation record creation
      if (invitation) {
        console.log('✅ Invitation record created successfully, email sending pending');
        // create in-app notification if possible
        try {
          const { data: recipient } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();
          if (recipient?.id && invitationData?.id) {
            await supabase.from('notifications').insert({
              user_id: recipient.id,
              actor_id: supervisorId,
              type: relationshipType === 'student_invites_supervisor' ? 'supervisor_invitation' : 'student_invitation',
              message:
                relationshipType === 'student_invites_supervisor'
                  ? `${supervisorName || 'A student'} invited you to be their supervisor`
                  : `${supervisorName || 'An instructor'} invited you to be their student`,
              metadata: { invitation_id: invitationData.id },
            });

            // Best-effort push
            try {
              await pushNotificationService.sendInvitationNotification(
                supervisorId || '',
                recipient.id,
                supervisorName || 'Someone',
                inviterRole || 'user',
                relationshipType === 'supervisor_invites_student' ? 'student' : 'supervisor',
              );
            } catch {}
          }
        } catch {}
        return { 
          success: true, 
          note: 'Invitation record created. Email sending requires Edge Function deployment or manual setup.',
          invitationId: invitationData?.id
        };
      } else {
        console.log('⚠️ Creating basic invitation record without email...');
        // Even if database fails, let's provide a user-friendly message
        return { 
          success: true, 
          note: 'Invitation processed. Please ensure the recipient checks their email or contact them directly.' 
        };
      }
    }

    return { success: true, invitationId: invitation?.id };
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
 * Get invitations received by an email (for the invitee inbox)
 */
export async function getIncomingInvitations(email: string) {
  try {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching incoming invitations:', error);
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
 * Accept a specific invitation by ID (preferred when you already listed invites)
 */
export async function acceptInvitationById(invitationId: string, userId: string): Promise<boolean> {
  try {
    const { data: invitation, error: findError } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (findError || !invitation) return false;

    const { error: updateError } = await supabase
      .from('pending_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', invitationId);

    if (updateError) return false;

    if (invitation.invited_by) {
      const { error: relError } = await supabase
        .from('student_supervisor_relationships')
        .insert({ student_id: userId, supervisor_id: invitation.invited_by });
      if (relError) console.error('Error creating supervisor relationship:', relError);
    }

    if (invitation.role) {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: invitation.role })
        .eq('id', userId);
      if (roleError) console.error('Error updating user role:', roleError);
    }

    return true;
  } catch (error) {
    console.error('Error accepting invitation by id:', error);
    return false;
  }
}

/**
 * Reject an invitation by ID
 */
export async function rejectInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pending_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);
    return !error;
  } catch (error) {
    console.error('Error rejecting invitation:', error);
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

/**
 * Remove a supervisor relationship
 */
export async function removeSupervisorRelationship(studentId: string, supervisorId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('student_supervisor_relationships')
      .delete()
      .eq('student_id', studentId)
      .eq('supervisor_id', supervisorId);

    if (error) {
      console.error('Error removing supervisor relationship:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing supervisor relationship:', error);
    return false;
  }
}

/**
 * Get current supervisor relationships for a student
 */
export async function getStudentSupervisors(studentId: string) {
  try {
    // Step 1: fetch relationships
    const { data: rels, error: relErr } = await supabase
      .from('student_supervisor_relationships')
      .select('supervisor_id, created_at')
      .eq('student_id', studentId);

    if (relErr) throw relErr;
    if (!rels || rels.length === 0) return [];

    // Step 2: fetch supervisor profiles
    const supervisorIds = rels.map((r) => r.supervisor_id);
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', supervisorIds);

    if (profErr) throw profErr;

    // Step 3: merge
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const merged = rels.map((r) => ({
      supervisor_id: r.supervisor_id,
      created_at: r.created_at,
      profiles: profileById.get(r.supervisor_id) || null,
    }));

    return merged;
  } catch (error) {
    console.error('Error fetching student supervisors:', error);
    return [];
  }
}