import { supabase } from '../lib/supabase';
import { pushNotificationService } from './pushNotificationService';
import { Database } from '../lib/database.types';

type UserRole = Database['public']['Enums']['user_role'];

interface InvitationData {
  email: string;
  role?: UserRole;
  supervisorId?: string;
  supervisorName?: string;
  inviterRole?: UserRole;
  relationshipType?: 'student_invites_supervisor' | 'supervisor_invites_student';
  metadata?: Record<string, any>;
  customPassword?: string; // NEW: Allow custom password per invitation
}

interface BulkInvitationResult {
  successful: string[];
  failed: Array<{ email: string; error: string }>;
}

interface InvitationEntry {
  email: string;
  password?: string; // Optional custom password
  customMessage?: string; // Optional custom message
}

/**
 * NEW: Direct user creation with temporary password (no email confirmation needed)
 * This works with the disabled email confirmation setup
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
      targetRole = 'instructor'; // Default supervisor role
    }

    // Use custom password or generate secure temporary password
    const tempPassword = data.customPassword || `Vromm${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 100)}!`;
    
    // Create meaningful full name from email
    const emailName = email.split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const fullName = supervisorName ? 
      `${emailName} (invited by ${supervisorName})` : 
      `${emailName}`;

    console.log(`🔄 Creating user directly: ${email} as ${targetRole}`);

    // Method 1: Try our new SQL function with custom password support
    try {
      console.log('🔧 Calling SQL function with params:', {
        p_email: email.toLowerCase(),
        p_password: '***hidden***',
        p_full_name: fullName,
        p_role: targetRole,
        p_inviter_id: supervisorId || null
      });

      const { data: sqlResult, error: sqlError } = await supabase.rpc('create_invited_user_with_password', {
        p_email: email.toLowerCase(),
        p_password: tempPassword,
        p_full_name: fullName,
        p_role: targetRole,
        p_inviter_id: supervisorId || null
      });

      console.log('📊 SQL Result:', sqlResult);
      console.log('❌ SQL Error:', sqlError);

      if (sqlError) {
        console.error('🚨 SQL Function Error Details:', {
          message: sqlError.message,
          code: sqlError.code,
          details: sqlError.details,
          hint: sqlError.hint
        });
        throw new Error(`SQL function failed: ${sqlError.message} (Code: ${sqlError.code})`);
      }

      if (sqlResult?.success) {
        console.log('✅ User created successfully via SQL function');
        
        // Create supervisor relationship if needed
        if (supervisorId && relationshipType && sqlResult.user_id) {
          await createSupervisorRelationship(sqlResult.user_id, supervisorId, relationshipType);
        }

        // Send in-app notification
        try {
          await createInvitationNotification(sqlResult.user_id, supervisorId, supervisorName, relationshipType);
        } catch (notifErr) {
          console.warn('Failed to create notification:', notifErr);
        }

        return { 
          success: true, 
          note: `✅ User created! Email: ${email}, Temporary password: ${tempPassword}. They can login immediately and should change their password in settings.`,
          invitationId: sqlResult.user_id
        };
      } else {
        throw new Error(sqlResult?.error || 'SQL function returned failure');
      }

    } catch (sqlErr) {
      console.warn('SQL approach failed, trying admin API fallback...', sqlErr);
      
      // Method 2: Fallback - Check existing users first without admin API
      try {
        // Check if user already exists by checking profiles table
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', email.toLowerCase())
          .single();
        
        if (existingProfile) {
          console.log('📝 User already exists in profiles table');
          return { 
            success: false, 
            error: `User with email ${email} already exists. Cannot create duplicate account.`
          };
        }

        // Admin API not available or has permission issues
        console.error('❌ Both SQL function and admin API failed. Invitation not possible.');
        return { 
          success: false, 
          error: `Unable to create user account. Please check Supabase configuration and ensure the SQL function 'create_invited_user_with_password' exists and pgcrypto extension is enabled.`
        };

      } catch (adminErr) {
        console.error('Admin API approach also failed:', adminErr);
        return { 
          success: false, 
          error: `Failed to create user: ${adminErr instanceof Error ? adminErr.message : 'Unknown error'}` 
        };
      }
    }

  } catch (error) {
    console.error('Error in inviteNewUser:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create invitation' 
    };
  }
}

/**
 * Helper: Create supervisor relationships based on invitation type
 */
async function createSupervisorRelationship(
  studentId: string, 
  supervisorId: string, 
  relationshipType: string
): Promise<void> {
  try {
    const relationship = {
      student_id: relationshipType === 'supervisor_invites_student' ? studentId : supervisorId,
      supervisor_id: relationshipType === 'supervisor_invites_student' ? supervisorId : studentId,
    };

    const { error } = await supabase
      .from('student_supervisor_relationships')
      .insert(relationship);
    
    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
    
    console.log('✅ Supervisor relationship created');
  } catch (err) {
    console.warn('Failed to create supervisor relationship:', err);
    // Don't fail the whole invitation for this
  }
}

/**
 * Helper: Create in-app notification for invitation
 */
async function createInvitationNotification(
  recipientId: string,
  inviterId: string | undefined,
  inviterName: string | undefined,
  relationshipType: string | undefined
): Promise<void> {
  if (!inviterId || !relationshipType) return;

  try {
    const notificationType = relationshipType === 'student_invites_supervisor' ? 'supervisor_invitation' : 'student_invitation';
    const message = relationshipType === 'student_invites_supervisor'
      ? `${inviterName || 'A student'} invited you to be their supervisor`
      : `${inviterName || 'An instructor'} invited you to be their student`;

    // Create in-app notification if notifications table exists
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: recipientId,
      actor_id: inviterId,
      type: notificationType as Database['public']['Enums']['notification_type'],
      title: relationshipType === 'student_invites_supervisor' ? 'New Supervision Request' : 'New Student Invitation',
      message,
      metadata: { relationshipType, inviterName },
      action_url: 'vromm://notifications',
      priority: 'high',
      is_read: false,
    });

    if (notifError && !notifError.message.includes('does not exist')) {
      console.warn('Notification creation failed:', notifError);
    } else if (!notifError) {
      console.log('✅ In-app notification created');
    }

    // Send push notification (best effort)
    try {
      await pushNotificationService.sendInvitationNotification(
        inviterId,
        recipientId,
        inviterName || 'Someone',
        'instructor', // inviter role
        relationshipType === 'supervisor_invites_student' ? 'student' : 'supervisor'
      );
      console.log('✅ Push notification sent');
    } catch (pushErr) {
      console.warn('Push notification failed:', pushErr);
    }

  } catch (err) {
    console.warn('Failed to create invitation notification:', err);
  }
}

/**
 * Send invitations to multiple users at once (legacy version)
 */
export async function inviteMultipleUsers(
  emails: string[],
  role: UserRole = 'student',
  supervisorId?: string,
  supervisorName?: string
): Promise<BulkInvitationResult> {
  const successful: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  // Process invitations in small batches to avoid rate limiting
  const BATCH_SIZE = 3;
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
    
    // Small delay between batches
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { successful, failed };
}

/**
 * NEW: Send invitations with custom passwords for each user
 */
export async function inviteUsersWithPasswords(
  invitations: InvitationEntry[],
  role: UserRole = 'student',
  supervisorId?: string,
  supervisorName?: string,
  inviterRole?: UserRole,
  relationshipType?: 'student_invites_supervisor' | 'supervisor_invites_student',
  globalCustomMessage?: string
): Promise<BulkInvitationResult> {
  const successful: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  // Process invitations in small batches to avoid rate limiting
  const BATCH_SIZE = 3;
  for (let i = 0; i < invitations.length; i += BATCH_SIZE) {
    const batch = invitations.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(
      batch.map(async (invitation) => {
        const result = await inviteNewUser({
          email: invitation.email,
          role,
          supervisorId,
          supervisorName,
          inviterRole,
          relationshipType,
          customPassword: invitation.password, // Use custom password if provided
          metadata: {
            customMessage: invitation.customMessage || globalCustomMessage, // Use per-invitation or global message
          },
        });
        
        if (result.success) {
          successful.push(invitation.email);
        } else {
          failed.push({ email: invitation.email, error: result.error || 'Unknown error' });
        }
        
        return result;
      })
    );
    
    // Small delay between batches
    if (i + BATCH_SIZE < invitations.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { successful, failed };
}

/**
 * Get pending invitations for a user (compatibility with old system)
 */
export async function getPendingInvitations(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('invited_by', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error && !error.message.includes('does not exist')) {
      console.error('Error fetching invitations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingInvitations:', error);
    return [];
  }
}

/**
 * Cancel invitation (compatibility function)
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
 * Resend invitation (compatibility function)
 */
export async function resendInvitation(invitationId: string): Promise<boolean> {
  // With direct user creation, we don't need to resend
  // Users are created immediately
  console.log('Resend not needed with direct user creation');
  return true;
}

/**
 * Accept invitation (compatibility function)
 */
export async function acceptInvitation(email: string, userId: string): Promise<boolean> {
  // With direct user creation and no email confirmation,
  // users are automatically "accepted" when created
  console.log('Auto-acceptance with direct user creation');
  return true;
}

/**
 * Check if email has pending invitation (compatibility function)
 */
export async function checkPendingInvitation(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .limit(1);

    return !error && (data?.length || 0) > 0;
  } catch (error) {
    return false;
  }
}
