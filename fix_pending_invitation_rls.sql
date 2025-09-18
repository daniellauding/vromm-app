-- Fix RLS policies for pending_invitations table to allow proper deletion
-- This script ensures that users can delete invitations they created

-- 1. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can delete their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can view their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can insert their own pending invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can update their own pending invitations" ON pending_invitations;

-- 2. Create proper RLS policies for pending_invitations
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

-- 3. Ensure RLS is enabled on the table
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Test the policies by checking if we can see the invitation
SELECT 
  'POLICY_TEST' as test_type,
  id,
  email,
  role,
  status,
  invited_by,
  auth.uid() as current_user_id,
  (auth.uid() = invited_by) as can_delete
FROM pending_invitations 
WHERE id = 'efa685a3-b352-4f2e-a1d5-23e54feec8d4';
