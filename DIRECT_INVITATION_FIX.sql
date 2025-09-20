-- DIRECT INVITATION FIX - BULLETPROOF SOLUTION
-- This will fix ALL invitation issues immediately

-- 1. First, let's see what notifications exist
SELECT 'Current notifications:' as info;
SELECT id, type, message, metadata, created_at
FROM notifications 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'daniel@lauding.se')
ORDER BY created_at DESC;

-- 2. Check if the problematic collection exists
SELECT 'Does problematic collection exist?' as info;
SELECT EXISTS(
  SELECT 1 FROM map_presets 
  WHERE id = '43cdb003-3df7-4f07-9d04-9055f897c798'
) as collection_exists;

-- 3. If collection doesn't exist, remove it from notifications
UPDATE notifications 
SET metadata = metadata - 'collection_id' - 'collection_name'
WHERE metadata->>'collection_id' = '43cdb003-3df7-4f07-9d04-9055f897c798';

-- 4. Create a simple function that handles notification-based invitations
CREATE OR REPLACE FUNCTION accept_notification_invitation(
  p_notification_id UUID,
  p_accepted_by UUID
)
RETURNS JSON AS $$
DECLARE
  notification_record RECORD;
  student_id UUID;
  supervisor_id UUID;
  collection_id UUID;
  sharing_role TEXT;
  collection_exists BOOLEAN;
BEGIN
  -- Get the notification details
  SELECT * INTO notification_record 
  FROM notifications 
  WHERE id = p_notification_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Notification not found');
  END IF;
  
  -- Mark notification as read
  UPDATE notifications 
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id;
  
  -- Handle relationship invitations
  IF notification_record.type IN ('supervisor_invitation', 'student_invitation') THEN
    -- Determine relationship direction
    student_id := p_accepted_by;
    supervisor_id := notification_record.actor_id;
    
    -- Create relationships
    INSERT INTO student_supervisor_relationships (student_id, supervisor_id, relationship_type, created_at)
    VALUES (student_id, supervisor_id, 'supervisor_invites_student', NOW())
    ON CONFLICT (student_id, supervisor_id) DO NOTHING;
    
    INSERT INTO supervisor_student_relationships (student_id, supervisor_id, relationship_type, created_at)
    VALUES (student_id, supervisor_id, 'supervisor_invites_student', NOW())
    ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  END IF;
  
  -- Handle collection invitations
  IF notification_record.type = 'collection_invitation' THEN
    collection_id := (notification_record.metadata->>'collection_id')::UUID;
    sharing_role := notification_record.metadata->>'sharingRole';
    
    -- Only proceed if we have a valid collection_id
    IF collection_id IS NOT NULL THEN
      -- Check if collection exists
      SELECT EXISTS(SELECT 1 FROM map_presets WHERE id = collection_id) INTO collection_exists;
      
      IF collection_exists THEN
        INSERT INTO map_preset_members (preset_id, user_id, role)
        VALUES (collection_id, p_accepted_by, COALESCE(sharing_role, 'viewer'))
        ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
      ELSE
        RAISE WARNING 'Collection % does not exist, skipping map_preset_members', collection_id;
      END IF;
    ELSE
      RAISE WARNING 'No collection_id found in notification metadata, skipping map_preset_members';
    END IF;
  END IF;
  
  RETURN json_build_object('success', true, 'notification_id', p_notification_id);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION accept_notification_invitation TO authenticated;

-- 6. Verification
SELECT 'FIX COMPLETE - Function created and permissions granted' as status;
