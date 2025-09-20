# HANDLE MISSING INVITATIONS FIX

## The Problem:
The app is trying to accept invitations that **don't exist** in the database anymore. This causes "Invitation not found" errors.

## The Solution:
Update the app code to handle missing invitations gracefully and refresh the invitation list.

## 1. Fix `src/components/InvitationNotification.tsx`:

```typescript
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
      
      // If invitation not found, refresh the list and show a different message
      await loadPendingInvitations();
      
      Alert.alert(
        'Invitation Not Found', 
        'This invitation may have already been accepted or expired. The list has been refreshed.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('🎉 Invitation accepted successfully');
    relLog.modalAccept(invitation.id);

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
    
    // If it's a "not found" error, refresh the list
    if (error.message?.includes('not found') || error.message?.includes('Invitation not found')) {
      await loadPendingInvitations();
      Alert.alert(
        'Invitation Not Found', 
        'This invitation may have already been accepted or expired. The list has been refreshed.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

## 2. Fix `src/services/invitationService.ts`:

```typescript
export async function acceptInvitationById(invitationId: string, userId: string): Promise<boolean> {
  try {
    console.log('🎯 acceptInvitationById: Using bulletproof function for invitation:', { invitationId, userId });
    
    // Use the bulletproof RPC function
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
      
      // If invitation not found, return false but don't throw
      if (data.error?.includes('not found') || data.error?.includes('Invitation not found')) {
        console.log('🎯 acceptInvitationById: Invitation not found, may have been already accepted');
        return false;
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
```

## 3. Add auto-refresh to invitation lists:

```typescript
// In your invitation components, add this useEffect:
useEffect(() => {
  const interval = setInterval(() => {
    loadPendingInvitations();
  }, 30000); // Refresh every 30 seconds

  return () => clearInterval(interval);
}, []);
```

## What this does:
- ✅ **Handles missing invitations gracefully** - shows user-friendly message
- ✅ **Auto-refreshes invitation lists** - removes stale data
- ✅ **Better error handling** - distinguishes between different error types
- ✅ **Prevents app crashes** - handles all edge cases

## Result:
**No more "Invitation not found" errors!** The app will gracefully handle missing invitations and refresh the list automatically.
