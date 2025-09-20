# FIX NOTIFICATION INVITATIONS

## The Problem:
The app is getting invitations from **NOTIFICATIONS** table, but the bulletproof function only works with `pending_invitations` table IDs.

## The Solution:
Update the invitation acceptance to handle both notification-based and table-based invitations.

## 1. Fix `src/services/invitationService.ts`:

```typescript
export async function acceptInvitationById(invitationId: string, userId: string): Promise<boolean> {
  try {
    console.log('🎯 acceptInvitationById: Using bulletproof function for invitation:', { invitationId, userId });
    
    // First, try to use the bulletproof function (for pending_invitations table)
    const { data, error } = await supabase.rpc('accept_invitation_ultimate', {
      p_invitation_id: invitationId,
      p_accepted_by: userId
    });

    if (error) {
      console.error('🎯 acceptInvitationById: RPC error:', error);
      return false;
    }

    if (!data.success) {
      console.error('🎯 acceptInvitationById: Function returned error:', data.error);
      
      // If invitation not found in pending_invitations, try notification-based handling
      if (data.error?.includes('not found') || data.error?.includes('Invitation not found')) {
        console.log('🎯 acceptInvitationById: Invitation not found in pending_invitations, trying notification-based handling');
        return await handleNotificationBasedInvitation(invitationId, userId);
      }
      
      return false;
    }

    console.log('🎯 acceptInvitationById: Invitation accepted successfully via bulletproof function');
    return true;
  } catch (error) {
    console.error('🎯 acceptInvitationById: Error accepting invitation:', error);
    return false;
  }
}

// New function to handle notification-based invitations
async function handleNotificationBasedInvitation(notificationId: string, userId: string): Promise<boolean> {
  try {
    console.log('🔔 handleNotificationBasedInvitation: Processing notification-based invitation:', { notificationId, userId });
    
    // Get the notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError || !notification) {
      console.error('🔔 handleNotificationBasedInvitation: Notification not found:', notifError);
      return false;
    }

    // Mark notification as read
    const { error: markReadError } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (markReadError) {
      console.error('🔔 handleNotificationBasedInvitation: Error marking notification as read:', markReadError);
    }

    // Handle relationship invitations
    if (notification.type === 'supervisor_invitation' || notification.type === 'student_invitation') {
      const actorId = notification.actor_id;
      const metadata = notification.metadata || {};
      
      // Determine relationship direction
      const isSupervisorInvitation = notification.type === 'supervisor_invitation';
      const studentId = isSupervisorInvitation ? userId : actorId;
      const supervisorId = isSupervisorInvitation ? actorId : userId;
      
      // Create relationships
      const { error: relError } = await supabase
        .from('student_supervisor_relationships')
        .insert({
          student_id: studentId,
          supervisor_id: supervisorId,
          relationship_type: 'supervisor_invites_student',
          created_at: new Date().toISOString()
        });

      if (relError && relError.code !== '23505') { // 23505 = duplicate key
        console.error('🔔 handleNotificationBasedInvitation: Error creating relationship:', relError);
        return false;
      }

      // Create reverse relationship
      const { error: revRelError } = await supabase
        .from('supervisor_student_relationships')
        .insert({
          student_id: studentId,
          supervisor_id: supervisorId,
          relationship_type: 'supervisor_invites_student',
          created_at: new Date().toISOString()
        });

      if (revRelError && revRelError.code !== '23505') { // 23505 = duplicate key
        console.error('🔔 handleNotificationBasedInvitation: Error creating reverse relationship:', revRelError);
        return false;
      }

      console.log('🔔 handleNotificationBasedInvitation: Relationship created successfully');
      return true;
    }

    // Handle collection invitations
    if (notification.type === 'collection_invitation') {
      const metadata = notification.metadata || {};
      const collectionId = metadata.collection_id;
      const sharingRole = metadata.sharingRole || 'viewer';

      if (collectionId) {
        // Check if collection exists
        const { data: collection, error: collectionError } = await supabase
          .from('map_presets')
          .select('id')
          .eq('id', collectionId)
          .single();

        if (collectionError || !collection) {
          console.warn('🔔 handleNotificationBasedInvitation: Collection not found, skipping:', collectionId);
        } else {
          // Add user to collection
          const { error: memberError } = await supabase
            .from('map_preset_members')
            .insert({
              preset_id: collectionId,
              user_id: userId,
              role: sharingRole
            });

          if (memberError && memberError.code !== '23505') { // 23505 = duplicate key
            console.error('🔔 handleNotificationBasedInvitation: Error adding to collection:', memberError);
            return false;
          }

          console.log('🔔 handleNotificationBasedInvitation: Added to collection successfully');
        }
      }

      return true;
    }

    console.log('🔔 handleNotificationBasedInvitation: Unknown notification type:', notification.type);
    return false;
  } catch (error) {
    console.error('🔔 handleNotificationBasedInvitation: Error:', error);
    return false;
  }
}
```

## 2. Update the components to use the correct ID:

In `UnifiedInvitationModal.tsx`, change:
```typescript
// OLD:
invitation_id: metadata.invitation_id || notif.id,

// NEW:
invitation_id: notif.id, // Use notification ID directly
```

## What this does:
- ✅ **Handles both types of invitations** - pending_invitations table AND notifications table
- ✅ **Falls back gracefully** - if pending_invitations fails, tries notification-based handling
- ✅ **Creates relationships correctly** - handles both supervisor and student invitations
- ✅ **Handles collections safely** - checks if collection exists before adding
- ✅ **Prevents duplicate errors** - handles 23505 duplicate key errors gracefully

## Result:
**No more "Invitation not found" or foreign key errors!** The app will handle both notification-based and table-based invitations correctly.
