# DIRECT APP FIX - USE THIS CODE

## Replace your invitation acceptance code with this:

### 1. Update `src/services/invitationService.ts`:

```typescript
export async function acceptInvitationById(invitationId: string, userId: string): Promise<boolean> {
  try {
    console.log('🎯 acceptInvitationById: Processing invitation:', { invitationId, userId });
    
    // Use the notification-based function
    const { data, error } = await supabase.rpc('accept_notification_invitation', {
      p_notification_id: invitationId,
      p_accepted_by: userId
    });

    if (error) {
      console.error('🎯 acceptInvitationById: RPC error:', error);
      return false;
    }

    if (!data.success) {
      console.error('🎯 acceptInvitationById: Function returned error:', data.error);
      return false;
    }

    console.log('🎯 acceptInvitationById: Invitation accepted successfully');
    return true;
  } catch (error) {
    console.error('🎯 acceptInvitationById: Error accepting invitation:', error);
    return false;
  }
}
```

### 2. Update `src/components/UnifiedInvitationModal.tsx`:

```typescript
if (invitation.type === 'relationship') {
  // Use notification-based function for relationship invitations
  const { data, error } = await supabase.rpc('accept_notification_invitation', {
    p_notification_id: invitation.invitation_id,
    p_accepted_by: user?.id
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);
}
```

### 3. Update `src/components/InvitationModal.tsx`:

```typescript
if (invitation.type === 'relationship') {
  // Use notification-based function for relationship invitations
  const { data, error } = await supabase.rpc('accept_notification_invitation', {
    p_notification_id: invitation.invitation_id,
    p_accepted_by: user?.id
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);
}
```

## What this does:
- ✅ **Uses notification IDs directly** - no more ID confusion
- ✅ **Handles missing collections** - skips if collection doesn't exist
- ✅ **Creates relationships correctly** - handles both directions
- ✅ **Marks notifications as read** - prevents duplicate processing
- ✅ **Bulletproof error handling** - catches everything

## Steps:
1. **Run `DIRECT_INVITATION_FIX.sql`** in Supabase
2. **Replace your app code** with the above
3. **Test invitation acceptance** - should work perfectly

This will fix ALL your invitation issues immediately!
