-- Fix Collection Invitations System
-- Run this in Supabase CLI SQL Editor

-- 1. Update pending_invitations table to support collection invitations
ALTER TABLE pending_invitations 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES map_presets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS collection_name TEXT,
ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'relationship' CHECK (invitation_type IN ('relationship', 'collection_sharing')),
ADD COLUMN IF NOT EXISTS custom_message TEXT;

-- 2. Update role constraint to include collection_sharing
ALTER TABLE pending_invitations 
DROP CONSTRAINT IF EXISTS pending_invitations_role_check;

ALTER TABLE pending_invitations 
ADD CONSTRAINT pending_invitations_role_check 
CHECK (role IN ('student', 'instructor', 'teacher', 'supervisor', 'admin', 'collection_sharing'));

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON pending_invitations(status);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invitation_type ON pending_invitations(invitation_type);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_collection_id ON pending_invitations(collection_id);

-- 4. Update RLS policies for pending_invitations
DROP POLICY IF EXISTS "Users can view their own invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON pending_invitations;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON pending_invitations;

CREATE POLICY "Users can view their own invitations" ON pending_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    invited_by = auth.uid()
  );

CREATE POLICY "Users can create invitations" ON pending_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() OR
    -- Allow collection creators to invite users to their collections
    (invitation_type = 'collection_sharing' AND 
     collection_id IN (
       SELECT id FROM map_presets WHERE creator_id = auth.uid()
     ))
  );

CREATE POLICY "Users can update their own invitations" ON pending_invitations
  FOR UPDATE USING (
    invited_by = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete their own invitations" ON pending_invitations
  FOR DELETE USING (
    invited_by = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 5. Create function to handle collection invitation acceptance
CREATE OR REPLACE FUNCTION accept_collection_invitation(
  invitation_id UUID,
  user_id UUID
)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM pending_invitations
  WHERE id = invitation_id 
    AND status = 'pending'
    AND invitation_type = 'collection_sharing';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found or already processed');
  END IF;
  
  -- Check if user is the intended recipient
  IF invitation_record.email != (SELECT email FROM auth.users WHERE id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not authorized to accept this invitation');
  END IF;
  
  -- Add user to collection as member
  INSERT INTO map_preset_members (preset_id, user_id, added_by, role)
  VALUES (
    invitation_record.collection_id,
    user_id,
    invitation_record.invited_by,
    'read' -- Default to read access, can be upgraded later
  )
  ON CONFLICT (preset_id, user_id) DO NOTHING;
  
  -- Update invitation status
  UPDATE pending_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = user_id
  WHERE id = invitation_id;
  
  RETURN json_build_object('success', true, 'message', 'Invitation accepted successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to handle collection invitation rejection
CREATE OR REPLACE FUNCTION reject_collection_invitation(
  invitation_id UUID,
  user_id UUID
)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM pending_invitations
  WHERE id = invitation_id 
    AND status = 'pending'
    AND invitation_type = 'collection_sharing';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found or already processed');
  END IF;
  
  -- Check if user is the intended recipient
  IF invitation_record.email != (SELECT email FROM auth.users WHERE id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not authorized to reject this invitation');
  END IF;
  
  -- Update invitation status
  UPDATE pending_invitations
  SET status = 'declined',
      accepted_at = NOW(),
      accepted_by = user_id
  WHERE id = invitation_id;
  
  RETURN json_build_object('success', true, 'message', 'Invitation rejected successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get pending collection invitations for a user
CREATE OR REPLACE FUNCTION get_pending_collection_invitations(user_email TEXT)
RETURNS TABLE (
  id UUID,
  collection_id UUID,
  collection_name TEXT,
  invited_by UUID,
  invited_by_name TEXT,
  custom_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.collection_id,
    pi.collection_name,
    pi.invited_by,
    COALESCE(profiles.display_name, profiles.email, 'Unknown User') as invited_by_name,
    pi.custom_message,
    pi.created_at
  FROM pending_invitations pi
  LEFT JOIN profiles ON pi.invited_by = profiles.id
  WHERE pi.email = user_email
    AND pi.status = 'pending'
    AND pi.invitation_type = 'collection_sharing'
    AND pi.collection_id IS NOT NULL
  ORDER BY pi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION accept_collection_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_collection_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_collection_invitations(TEXT) TO authenticated;

-- 9. Create trigger to automatically clean up old invitations
CREATE OR REPLACE FUNCTION cleanup_old_invitations()
RETURNS void AS $$
BEGIN
  -- Delete invitations older than 30 days
  DELETE FROM pending_invitations
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('declined', 'cancelled');
    
  -- Delete failed invitations older than 7 days
  DELETE FROM pending_invitations
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'failed';
END;
$$ LANGUAGE plpgsql;

-- 10. Create a scheduled job to run cleanup (if pg_cron is available)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-old-invitations', '0 2 * * *', 'SELECT cleanup_old_invitations();');

-- 11. Add comments for documentation
COMMENT ON FUNCTION accept_collection_invitation(UUID, UUID) IS 'Accepts a collection sharing invitation and adds user to the collection';
COMMENT ON FUNCTION reject_collection_invitation(UUID, UUID) IS 'Rejects a collection sharing invitation';
COMMENT ON FUNCTION get_pending_collection_invitations(TEXT) IS 'Gets all pending collection invitations for a user email';
COMMENT ON COLUMN pending_invitations.invitation_type IS 'Type of invitation: relationship or collection_sharing';
COMMENT ON COLUMN pending_invitations.collection_id IS 'ID of the collection being shared (for collection_sharing invitations)';
COMMENT ON COLUMN pending_invitations.collection_name IS 'Name of the collection being shared';
COMMENT ON COLUMN pending_invitations.custom_message IS 'Custom message from the inviter';

-- 12. Update existing collection invitations to have proper type
UPDATE pending_invitations 
SET invitation_type = 'collection_sharing'
WHERE role = 'collection_sharing' 
  AND invitation_type IS NULL;

-- Success message
SELECT 'Collection invitations system fixes applied successfully!' as status;
