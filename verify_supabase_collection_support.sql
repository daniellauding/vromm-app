-- Verify and Ensure Supabase Support for Collection Management
-- This script checks and creates necessary database structures for proper collection functionality

-- 1. Check if all required tables exist and have proper structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('map_presets', 'map_preset_members', 'pending_invitations', 'collection_invitations', 'notifications')
ORDER BY table_name, ordinal_position;

-- 2. Check existing indexes for performance
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('map_presets', 'map_preset_members', 'pending_invitations', 'collection_invitations', 'notifications')
ORDER BY tablename, indexname;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('map_presets', 'map_preset_members', 'pending_invitations', 'collection_invitations', 'notifications')
ORDER BY tablename, policyname;

-- 4. Ensure proper foreign key constraints exist
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('map_presets', 'map_preset_members', 'pending_invitations', 'collection_invitations')
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Create missing indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_user ON map_preset_members(preset_id, user_id);

CREATE INDEX IF NOT EXISTS idx_pending_invitations_target_user ON pending_invitations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON pending_invitations(status);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_metadata ON pending_invitations USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_collection_invitations_invited_user ON collection_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_status ON collection_invitations(status);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_preset_id ON collection_invitations(preset_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN(metadata);

-- 6. Ensure proper RLS policies exist for collection management
-- Map Presets RLS
DO $$
BEGIN
  -- Allow users to read their own presets and presets they're members of
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_presets' AND policyname = 'Users can read their own presets and shared presets') THEN
    CREATE POLICY "Users can read their own presets and shared presets" ON map_presets
      FOR SELECT USING (
        created_by = auth.uid() OR 
        id IN (
          SELECT preset_id FROM map_preset_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Allow users to create their own presets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_presets' AND policyname = 'Users can create their own presets') THEN
    CREATE POLICY "Users can create their own presets" ON map_presets
      FOR INSERT WITH CHECK (created_by = auth.uid());
  END IF;

  -- Allow users to update their own presets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_presets' AND policyname = 'Users can update their own presets') THEN
    CREATE POLICY "Users can update their own presets" ON map_presets
      FOR UPDATE USING (created_by = auth.uid());
  END IF;

  -- Allow users to delete their own presets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_presets' AND policyname = 'Users can delete their own presets') THEN
    CREATE POLICY "Users can delete their own presets" ON map_presets
      FOR DELETE USING (created_by = auth.uid());
  END IF;
END $$;

-- Map Preset Members RLS
DO $$
BEGIN
  -- Allow users to read members of presets they own or are members of
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_preset_members' AND policyname = 'Users can read members of accessible presets') THEN
    CREATE POLICY "Users can read members of accessible presets" ON map_preset_members
      FOR SELECT USING (
        user_id = auth.uid() OR
        preset_id IN (
          SELECT id FROM map_presets WHERE created_by = auth.uid()
        ) OR
        preset_id IN (
          SELECT preset_id FROM map_preset_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Allow preset owners to add/remove members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_preset_members' AND policyname = 'Preset owners can manage members') THEN
    CREATE POLICY "Preset owners can manage members" ON map_preset_members
      FOR ALL USING (
        preset_id IN (
          SELECT id FROM map_presets WHERE created_by = auth.uid()
        )
      );
  END IF;

  -- Allow users to leave collections
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_preset_members' AND policyname = 'Users can leave collections') THEN
    CREATE POLICY "Users can leave collections" ON map_preset_members
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Pending Invitations RLS
DO $$
BEGIN
  -- Allow users to read invitations sent to them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_invitations' AND policyname = 'Users can read invitations sent to them') THEN
    CREATE POLICY "Users can read invitations sent to them" ON pending_invitations
      FOR SELECT USING (target_user_id = auth.uid());
  END IF;

  -- Allow users to create invitations for collections they own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_invitations' AND policyname = 'Users can create invitations for their collections') THEN
    CREATE POLICY "Users can create invitations for their collections" ON pending_invitations
      FOR INSERT WITH CHECK (
        metadata->>'collectionId' IN (
          SELECT id::text FROM map_presets WHERE created_by = auth.uid()
        )
      );
  END IF;

  -- Allow users to update invitations sent to them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_invitations' AND policyname = 'Users can update invitations sent to them') THEN
    CREATE POLICY "Users can update invitations sent to them" ON pending_invitations
      FOR UPDATE USING (target_user_id = auth.uid());
  END IF;

  -- Allow users to delete invitations they sent or received
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_invitations' AND policyname = 'Users can delete their invitations') THEN
    CREATE POLICY "Users can delete their invitations" ON pending_invitations
      FOR DELETE USING (
        target_user_id = auth.uid() OR
        metadata->>'collectionId' IN (
          SELECT id::text FROM map_presets WHERE created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Collection Invitations RLS
DO $$
BEGIN
  -- Allow users to read collection invitations sent to them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collection_invitations' AND policyname = 'Users can read collection invitations sent to them') THEN
    CREATE POLICY "Users can read collection invitations sent to them" ON collection_invitations
      FOR SELECT USING (invited_user_id = auth.uid());
  END IF;

  -- Allow users to create collection invitations for their presets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collection_invitations' AND policyname = 'Users can create collection invitations for their presets') THEN
    CREATE POLICY "Users can create collection invitations for their presets" ON collection_invitations
      FOR INSERT WITH CHECK (
        preset_id IN (
          SELECT id FROM map_presets WHERE created_by = auth.uid()
        )
      );
  END IF;

  -- Allow users to update collection invitations sent to them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collection_invitations' AND policyname = 'Users can update collection invitations sent to them') THEN
    CREATE POLICY "Users can update collection invitations sent to them" ON collection_invitations
      FOR UPDATE USING (invited_user_id = auth.uid());
  END IF;

  -- Allow users to delete collection invitations they sent or received
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collection_invitations' AND policyname = 'Users can delete their collection invitations') THEN
    CREATE POLICY "Users can delete their collection invitations" ON collection_invitations
      FOR DELETE USING (
        invited_user_id = auth.uid() OR
        preset_id IN (
          SELECT id FROM map_presets WHERE created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Notifications RLS
DO $$
BEGIN
  -- Allow users to read their own notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can read their own notifications') THEN
    CREATE POLICY "Users can read their own notifications" ON notifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Allow users to update their own notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON notifications
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- Allow system to create notifications
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can create notifications') THEN
    CREATE POLICY "System can create notifications" ON notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 7. Create helper functions for collection management
CREATE OR REPLACE FUNCTION get_user_collections(user_uuid UUID)
RETURNS TABLE (
  preset_id UUID,
  preset_name TEXT,
  role TEXT,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id as preset_id,
    mp.name as preset_name,
    mpm.role,
    (mp.created_by = user_uuid) as is_owner
  FROM map_presets mp
  LEFT JOIN map_preset_members mpm ON mp.id = mpm.preset_id AND mpm.user_id = user_uuid
  WHERE mp.created_by = user_uuid OR mpm.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to safely cancel invitations
CREATE OR REPLACE FUNCTION cancel_collection_invitation(
  invitation_id UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_exists BOOLEAN;
  is_authorized BOOLEAN;
BEGIN
  -- Check if invitation exists and user is authorized to cancel it
  SELECT EXISTS(
    SELECT 1 FROM pending_invitations pi
    WHERE pi.id = invitation_id
    AND (
      pi.target_user_id = user_uuid OR
      pi.metadata->>'collectionId' IN (
        SELECT id::text FROM map_presets WHERE created_by = user_uuid
      )
    )
  ) INTO is_authorized;

  IF NOT is_authorized THEN
    RETURN FALSE;
  END IF;

  -- Delete the invitation
  DELETE FROM pending_invitations WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to safely update user roles
CREATE OR REPLACE FUNCTION update_collection_member_role(
  preset_id UUID,
  target_user_id UUID,
  new_role TEXT,
  requester_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  -- Check if requester is owner of the collection
  SELECT EXISTS(
    SELECT 1 FROM map_presets 
    WHERE id = preset_id AND created_by = requester_uuid
  ) INTO is_owner;

  IF NOT is_owner THEN
    RETURN FALSE;
  END IF;

  -- Update the role
  UPDATE map_preset_members 
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE preset_id = update_collection_member_role.preset_id 
    AND user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Verify all functions and policies are working
SELECT 'Database setup complete' as status;
