-- COMPREHENSIVE INVITATION ACCEPTANCE FIX
-- This addresses the "student_id cannot be null" error comprehensively

-- 1. First, let's check the current state and clean up any problematic data
SELECT 'Cleaning up problematic data...' as status;

-- Clean up any existing null student_id records
DELETE FROM student_supervisor_relationships WHERE student_id IS NULL;
DELETE FROM supervisor_student_relationships WHERE student_id IS NULL;

-- Clean up orphaned map_preset_members
DELETE FROM map_preset_members 
WHERE preset_id NOT IN (SELECT id FROM map_presets);

-- 2. Create a comprehensive function to handle invitation acceptance safely
CREATE OR REPLACE FUNCTION safe_accept_invitation_comprehensive(
  p_invitation_id UUID,
  p_accepted_by UUID
)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  result JSON;
  student_id UUID;
  supervisor_id UUID;
  collection_id UUID;
  sharing_role TEXT;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record 
  FROM pending_invitations 
  WHERE id = p_invitation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Check if already accepted
  IF invitation_record.accepted_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation already accepted');
  END IF;
  
  -- Determine student_id and supervisor_id based on the invitation
  -- The person accepting is always the student_id
  -- The person who sent the invitation is the supervisor_id
  student_id := p_accepted_by;
  supervisor_id := invitation_record.invited_by;
  
  -- Validate that we have both IDs
  IF student_id IS NULL OR supervisor_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid student_id or supervisor_id');
  END IF;
  
  -- Extract collection info if present
  IF invitation_record.metadata IS NOT NULL THEN
    collection_id := (invitation_record.metadata->>'collection_id')::UUID;
    sharing_role := invitation_record.metadata->>'sharingRole';
  END IF;
  
  -- Update the invitation as accepted
  UPDATE pending_invitations 
  SET accepted_by = p_accepted_by,
      accepted_at = NOW(),
      status = 'accepted'
  WHERE id = p_invitation_id;
  
  -- Create student_supervisor_relationships
  INSERT INTO student_supervisor_relationships (
    student_id,
    supervisor_id,
    relationship_type,
    created_at
  ) VALUES (
    student_id,
    supervisor_id,
    COALESCE(sharing_role, 'student'),
    NOW()
  ) ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  
  -- Create supervisor_student_relationships
  INSERT INTO supervisor_student_relationships (
    student_id,
    supervisor_id,
    relationship_type,
    created_at
  ) VALUES (
    student_id,
    supervisor_id,
    COALESCE(sharing_role, 'student'),
    NOW()
  ) ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  
  -- Handle map_preset_members if collection_id is present
  IF collection_id IS NOT NULL AND sharing_role IS NOT NULL THEN
    INSERT INTO map_preset_members (preset_id, user_id, role)
    VALUES (collection_id, student_id, sharing_role)
    ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  
  RETURN json_build_object('success', true, 'invitation_id', p_invitation_id);
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error and return failure
  RAISE WARNING 'Error in safe_accept_invitation_comprehensive: %', SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION safe_accept_invitation_comprehensive TO authenticated;

-- 4. Create a trigger to prevent future null student_id insertions
CREATE OR REPLACE FUNCTION prevent_null_student_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for null student_id
  IF NEW.student_id IS NULL THEN
    RAISE EXCEPTION 'student_id cannot be null';
  END IF;
  
  -- Check for null supervisor_id
  IF NEW.supervisor_id IS NULL THEN
    RAISE EXCEPTION 'supervisor_id cannot be null';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS check_student_id_not_null ON student_supervisor_relationships;
DROP TRIGGER IF EXISTS check_supervisor_id_not_null ON student_supervisor_relationships;
DROP TRIGGER IF EXISTS check_student_id_not_null_supervisor ON supervisor_student_relationships;
DROP TRIGGER IF EXISTS check_supervisor_id_not_null_supervisor ON supervisor_student_relationships;

-- Create triggers for both tables
CREATE TRIGGER check_student_id_not_null
  BEFORE INSERT OR UPDATE ON student_supervisor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_student_id_trigger();

CREATE TRIGGER check_supervisor_id_not_null
  BEFORE INSERT OR UPDATE ON student_supervisor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_student_id_trigger();

CREATE TRIGGER check_student_id_not_null_supervisor
  BEFORE INSERT OR UPDATE ON supervisor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_student_id_trigger();

CREATE TRIGGER check_supervisor_id_not_null_supervisor
  BEFORE INSERT OR UPDATE ON supervisor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_student_id_trigger();

-- 5. Add NOT NULL constraints if they don't exist
DO $$
BEGIN
  -- Add NOT NULL constraint to student_id in student_supervisor_relationships
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='student_supervisor_relationships' 
             AND column_name='student_id' 
             AND is_nullable='YES') THEN
    ALTER TABLE student_supervisor_relationships ALTER COLUMN student_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL constraint added to student_id in student_supervisor_relationships';
  END IF;
  
  -- Add NOT NULL constraint to supervisor_id in student_supervisor_relationships
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='student_supervisor_relationships' 
             AND column_name='supervisor_id' 
             AND is_nullable='YES') THEN
    ALTER TABLE student_supervisor_relationships ALTER COLUMN supervisor_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL constraint added to supervisor_id in student_supervisor_relationships';
  END IF;
  
  -- Add NOT NULL constraint to student_id in supervisor_student_relationships
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='supervisor_student_relationships' 
             AND column_name='student_id' 
             AND is_nullable='YES') THEN
    ALTER TABLE supervisor_student_relationships ALTER COLUMN student_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL constraint added to student_id in supervisor_student_relationships';
  END IF;
  
  -- Add NOT NULL constraint to supervisor_id in supervisor_student_relationships
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='supervisor_student_relationships' 
             AND column_name='supervisor_id' 
             AND is_nullable='YES') THEN
    ALTER TABLE supervisor_student_relationships ALTER COLUMN supervisor_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL constraint added to supervisor_id in supervisor_student_relationships';
  END IF;
END $$;

-- 6. Verification
SELECT 'Final verification - checking for null values:' as status;
SELECT 'student_supervisor_relationships' as table_name, COUNT(*) as total, COUNT(student_id) as non_null_student_id, COUNT(supervisor_id) as non_null_supervisor_id
FROM student_supervisor_relationships
UNION ALL
SELECT 'supervisor_student_relationships' as table_name, COUNT(*) as total, COUNT(student_id) as non_null_student_id, COUNT(supervisor_id) as non_null_supervisor_id
FROM supervisor_student_relationships;

-- 7. Test the function (optional - comment out if not needed)
-- SELECT safe_accept_invitation_comprehensive('test-invitation-id', 'test-user-id');
