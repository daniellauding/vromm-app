-- Comprehensive fix for pending invitation deletion issues
-- This script addresses RLS policies, permissions, and provides multiple deletion methods

-- 1. First, let's check the current state
SELECT 
  'CURRENT_STATE' as check_type,
  COUNT(*) as total_pending_invitations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
FROM pending_invitations;

-- 2. Check current RLS policies
SELECT 
  'CURRENT_RLS' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'pending_invitations';

-- 3. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can delete their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can view their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can insert their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can update their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Enable delete for users based on invited_by" ON pending_invitations;
DROP POLICY IF EXISTS "Enable insert for users based on invited_by" ON pending_invitations;
DROP POLICY IF EXISTS "Enable read for users based on invited_by" ON pending_invitations;
DROP POLICY IF EXISTS "Enable update for users based on invited_by" ON pending_invitations;

-- 4. Create comprehensive RLS policies
-- Allow users to view invitations they created or were invited to
CREATE POLICY "Users can view their own pending invitations" ON pending_invitations
  FOR SELECT
  USING (
    auth.uid() = invited_by OR 
    auth.uid()::text = (metadata->>'targetUserId')
  );

-- Allow users to insert invitations they create
CREATE POLICY "Users can insert their own pending invitations" ON pending_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = invited_by);

-- Allow users to update invitations they created
CREATE POLICY "Users can update their own pending invitations" ON pending_invitations
  FOR UPDATE
  USING (auth.uid() = invited_by)
  WITH CHECK (auth.uid() = invited_by);

-- Allow users to delete invitations they created
CREATE POLICY "Users can delete their own pending invitations" ON pending_invitations
  FOR DELETE
  USING (auth.uid() = invited_by);

-- 5. Create the RPC function for deletion (bypasses RLS)
CREATE OR REPLACE FUNCTION delete_pending_invitation(invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  deleted_count INTEGER := 0;
  result JSON;
BEGIN
  -- Delete from pending_invitations table
  DELETE FROM pending_invitations 
  WHERE id = invitation_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also delete from notifications table if it exists
  DELETE FROM notifications 
  WHERE id = invitation_id 
     OR metadata->>'invitation_id' = invitation_id::text;
  
  -- Return result
  result := json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'invitation_id', invitation_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'invitation_id', invitation_id
    );
END;
$$;

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_pending_invitation(UUID) TO authenticated;

-- 7. Ensure RLS is enabled
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- 8. Test the policies by checking if we can see the specific invitation
SELECT 
  'POLICY_TEST' as test_type,
  id,
  email,
  role,
  status,
  invited_by,
  auth.uid() as current_user_id,
  (auth.uid() = invited_by) as can_delete,
  (auth.uid()::text = (metadata->>'targetUserId')) as is_target_user
FROM pending_invitations 
WHERE id = 'efa685a3-b352-4f2e-a1d5-23e54feec8d4';

-- 9. Test the RPC function
SELECT 
  'RPC_TEST' as test_type,
  delete_pending_invitation('efa685a3-b352-4f2e-a1d5-23e54feec8d4') as result;

-- 10. Final verification
SELECT 
  'FINAL_VERIFICATION' as check_type,
  COUNT(*) as remaining_invitations,
  COUNT(CASE WHEN id = 'efa685a3-b352-4f2e-a1d5-23e54feec8d4' THEN 1 END) as target_invitation_exists
FROM pending_invitations;
