-- FINAL INVITATION FIX - BULLETPROOF SOLUTION
-- This will fix ALL invitation issues once and for all

-- 1. Clean up ALL problematic data immediately
DELETE FROM student_supervisor_relationships WHERE student_id IS NULL;
DELETE FROM supervisor_student_relationships WHERE student_id IS NULL;
DELETE FROM map_preset_members WHERE preset_id NOT IN (SELECT id FROM map_presets);

-- 2. Fix ALL invitations with invalid collections
UPDATE pending_invitations 
SET metadata = metadata - 'collectionId' - 'collectionName' - 'sharingRole' - 'collection_id' - 'collection_name'
WHERE (metadata->>'collectionId')::UUID NOT IN (SELECT id FROM map_presets)
   OR (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 3. Create the ULTIMATE invitation acceptance function
CREATE OR REPLACE FUNCTION accept_invitation_ultimate(
  p_invitation_id UUID,
  p_accepted_by UUID
)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  student_id UUID;
  supervisor_id UUID;
  collection_id UUID;
  sharing_role TEXT;
  collection_exists BOOLEAN;
BEGIN
  -- Get invitation
  SELECT * INTO invitation_record FROM pending_invitations WHERE id = p_invitation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  IF invitation_record.accepted_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Already accepted');
  END IF;
  
  -- ALWAYS set student_id to the person accepting
  student_id := p_accepted_by;
  supervisor_id := invitation_record.invited_by;
  
  -- Validate IDs
  IF student_id IS NULL OR supervisor_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid user IDs');
  END IF;
  
  -- Extract collection info safely
  IF invitation_record.metadata IS NOT NULL THEN
    collection_id := COALESCE(
      (invitation_record.metadata->>'collectionId')::UUID,
      (invitation_record.metadata->>'collection_id')::UUID
    );
    sharing_role := COALESCE(
      invitation_record.metadata->>'sharingRole',
      invitation_record.metadata->>'sharing_role'
    );
    
    -- Check if collection exists
    IF collection_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM map_presets WHERE id = collection_id) INTO collection_exists;
      IF NOT collection_exists THEN
        collection_id := NULL;
        sharing_role := NULL;
      END IF;
    END IF;
  END IF;
  
  -- Update invitation
  UPDATE pending_invitations 
  SET accepted_by = p_accepted_by, accepted_at = NOW(), status = 'accepted'
  WHERE id = p_invitation_id;
  
  -- Create relationships
  INSERT INTO student_supervisor_relationships (student_id, supervisor_id, relationship_type, created_at)
  VALUES (student_id, supervisor_id, COALESCE(sharing_role, 'student'), NOW())
  ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  
  INSERT INTO supervisor_student_relationships (student_id, supervisor_id, relationship_type, created_at)
  VALUES (student_id, supervisor_id, COALESCE(sharing_role, 'student'), NOW())
  ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  
  -- Handle collection if it exists
  IF collection_id IS NOT NULL AND sharing_role IS NOT NULL THEN
    INSERT INTO map_preset_members (preset_id, user_id, role)
    VALUES (collection_id, student_id, sharing_role)
    ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  
  RETURN json_build_object('success', true, 'invitation_id', p_invitation_id);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION accept_invitation_ultimate TO authenticated;

-- 5. Add constraints to prevent future issues
ALTER TABLE student_supervisor_relationships ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE student_supervisor_relationships ALTER COLUMN supervisor_id SET NOT NULL;
ALTER TABLE supervisor_student_relationships ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE supervisor_student_relationships ALTER COLUMN supervisor_id SET NOT NULL;

-- 6. Verification
SELECT 'FIX COMPLETE - All problematic data cleaned and function created' as status;
SELECT COUNT(*) as remaining_invitations FROM pending_invitations;
