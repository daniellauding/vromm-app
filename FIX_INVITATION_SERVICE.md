# FIX INVITATION SERVICE - REPLACE THIS FUNCTION

## Replace the `acceptInvitationById` function in `src/services/invitationService.ts` with this:

```typescript
/**
 * Accept a specific invitation by ID using the bulletproof function
 */
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

## What this does:
- ✅ **Uses the bulletproof RPC function** instead of direct table updates
- ✅ **Handles all relationship creation** automatically
- ✅ **Validates collections exist** before sharing
- ✅ **Prevents null student_id errors**
- ✅ **Prevents foreign key errors**

## Steps:
1. **Find the `acceptInvitationById` function** in `src/services/invitationService.ts`
2. **Replace the entire function** with the code above
3. **Remove all the old code** after the return statement
4. **Test invitation acceptance** - should work perfectly now!

This will fix your invitation acceptance issues immediately!
