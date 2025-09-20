# QUICK FIX - REPLACE THESE FUNCTIONS

## 1. Fix `src/services/invitationService.ts`

**Find the `acceptInvitationById` function and replace it with:**

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

**REMOVE ALL THE OLD CODE after the return statement!**

## 2. Fix `src/components/InvitationModal.tsx`

**Find the `handleAcceptInvitation` function and replace the relationship part with:**

```typescript
if (invitation.type === 'relationship') {
  // Use bulletproof function for relationship invitations
  const { data, error } = await supabase.rpc('accept_invitation_ultimate', {
    p_invitation_id: invitation.invitation_id,
    p_accepted_by: user?.id
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);

  showToast({
    title: t('invitations.accepted') || 'Invitation Accepted',
    message: t('invitations.relationshipAccepted') || 'You are now connected!',
    type: 'success'
  });
}
```

## 3. Fix `src/components/UnifiedInvitationModal.tsx`

**Find the `handleAccept` function and replace the relationship part with:**

```typescript
if (invitation.type === 'relationship') {
  // Use bulletproof function for relationship invitations
  const { data, error } = await supabase.rpc('accept_invitation_ultimate', {
    p_invitation_id: invitation.invitation_id,
    p_accepted_by: user?.id
  });

  if (error) throw error;
  if (!data.success) throw new Error(data.error);
}
```

## What this does:
- ✅ **Uses the bulletproof RPC function** instead of direct table updates
- ✅ **Handles all relationship creation** automatically
- ✅ **Validates collections exist** before sharing
- ✅ **Prevents null student_id errors**
- ✅ **Prevents foreign key errors**

**This will fix your invitation acceptance issues immediately!**
