-- FIX INVITATION ACCEPTANCE - FINAL COMPREHENSIVE FIX
-- This addresses the remaining null student_id constraint violation

-- 1. First, let's see what's happening with the invitation acceptance
-- Check the current state of student_supervisor_relationships
SELECT 'Current student_supervisor_relationships state:' as info;
SELECT COUNT(*) as total_records, 
       COUNT(student_id) as non_null_student_id,
       COUNT(*) - COUNT(student_id) as null_student_id
FROM student_supervisor_relationships;

-- 2. Check if there are any pending invitations that might be causing issues
SELECT 'Pending invitations with metadata:' as info;
SELECT id, email, metadata, created_at
FROM pending_invitations 
WHERE metadata IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. The issue is likely in the invitation acceptance logic
-- Let's check what happens when we try to accept an invitation
-- We need to ensure that when accepting an invitation, we have a valid student_id

-- 4. Create a function to safely accept invitations
CREATE OR REPLACE FUNCTION safe_accept_invitation(
  p_invitation_id UUID,
  p_accepted_by UUID
)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record 
  FROM pending_invitations 
  WHERE id = p_invitation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Check if the invitation is already accepted
  IF invitation_record.accepted_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation already accepted');
  END IF;
  
  -- Update the invitation as accepted
  UPDATE pending_invitations 
  SET accepted_by = p_accepted_by,
      accepted_at = NOW(),
      status = 'accepted'
  WHERE id = p_invitation_id;
  
  -- Only create relationship if we have valid data
  IF invitation_record.metadata IS NOT NULL THEN
    -- Extract metadata safely
    DECLARE
      metadata_json JSON;
      from_user_id UUID;
      sharing_role TEXT;
    BEGIN
      metadata_json := invitation_record.metadata::JSON;
      from_user_id := (metadata_json->>'from_user_id')::UUID;
      sharing_role := metadata_json->>'sharingRole';
      
      -- Only insert if we have valid from_user_id
      IF from_user_id IS NOT NULL THEN
        INSERT INTO student_supervisor_relationships (
          student_id,
          supervisor_id,
          relationship_type,
          created_at
        ) VALUES (
          p_accepted_by,  -- student_id is the person accepting
          from_user_id,  -- supervisor_id is the person who sent the invitation
          COALESCE(sharing_role, 'student'),
          NOW()
        ) ON CONFLICT (student_id, supervisor_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If metadata parsing fails, just log and continue
      RAISE WARNING 'Failed to parse invitation metadata: %', SQLERRM;
    END;
  END IF;
  
  RETURN json_build_object('success', true, 'invitation_id', p_invitation_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION safe_accept_invitation TO authenticated;

-- 6. Clean up any existing problematic records
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 7. Add a trigger to prevent future null student_id insertions
CREATE OR REPLACE FUNCTION prevent_null_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    RAISE EXCEPTION 'student_id cannot be null';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_student_id_not_null ON student_supervisor_relationships;

-- Create the trigger
CREATE TRIGGER check_student_id_not_null
  BEFORE INSERT OR UPDATE ON student_supervisor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_student_id();

-- 8. Verify the fix
SELECT 'Final verification:' as info;
SELECT COUNT(*) as total_records,
       COUNT(student_id) as non_null_student_id,
       COUNT(*) - COUNT(student_id) as null_student_id
FROM student_supervisor_relationships;
