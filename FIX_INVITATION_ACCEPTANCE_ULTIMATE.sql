-- ULTIMATE INVITATION ACCEPTANCE FIX
-- This addresses BOTH the student_id null error AND the preset_id foreign key error

-- 1. First, let's clean up ALL problematic data
SELECT 'Step 1: Cleaning up all problematic data...' as status;

-- Clean up null student_id records
DELETE FROM student_supervisor_relationships WHERE student_id IS NULL;
DELETE FROM supervisor_student_relationships WHERE student_id IS NULL;

-- Clean up orphaned map_preset_members (this fixes the preset_id error)
DELETE FROM map_preset_members 
WHERE preset_id NOT IN (SELECT id FROM map_presets);

-- Clean up any pending invitations that reference non-existent collections
UPDATE pending_invitations 
SET metadata = metadata - 'collection_id'
WHERE (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);

-- 2. Create a bulletproof invitation acceptance function
CREATE OR REPLACE FUNCTION bulletproof_accept_invitation(
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
  
  -- ALWAYS set student_id to the person accepting (this fixes the null error)
  student_id := p_accepted_by;
  supervisor_id := invitation_record.invited_by;
  
  -- Validate both IDs exist
  IF student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'student_id is null');
  END IF;
  
  IF supervisor_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'supervisor_id is null');
  END IF;
  
  -- Extract collection info safely
  IF invitation_record.metadata IS NOT NULL THEN
    collection_id := (invitation_record.metadata->>'collection_id')::UUID;
    sharing_role := invitation_record.metadata->>'sharingRole';
    
    -- Check if collection exists (this fixes the preset_id error)
    IF collection_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM map_presets WHERE id = collection_id) INTO collection_exists;
      
      -- If collection doesn't exist, skip the map_preset_members part
      IF NOT collection_exists THEN
        RAISE WARNING 'Collection % does not exist, skipping map_preset_members', collection_id;
        collection_id := NULL;
      END IF;
    END IF;
  END IF;
  
  -- Update the invitation as accepted
  UPDATE pending_invitations 
  SET accepted_by = p_accepted_by,
      accepted_at = NOW(),
      status = 'accepted'
  WHERE id = p_invitation_id;
  
  -- Create student_supervisor_relationships (with explicit NOT NULL check)
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
  
  -- Create supervisor_student_relationships (with explicit NOT NULL check)
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
  
  -- Handle map_preset_members ONLY if collection exists
  IF collection_id IS NOT NULL AND sharing_role IS NOT NULL THEN
    INSERT INTO map_preset_members (preset_id, user_id, role)
    VALUES (collection_id, student_id, sharing_role)
    ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'invitation_id', p_invitation_id,
    'student_id', student_id,
    'supervisor_id', supervisor_id,
    'collection_handled', collection_id IS NOT NULL
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error and return failure
  RAISE WARNING 'Error in bulletproof_accept_invitation: %', SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION bulletproof_accept_invitation TO authenticated;

-- 4. Create a trigger to prevent future null student_id insertions
CREATE OR REPLACE FUNCTION prevent_null_ids_trigger()
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

-- Drop existing triggers
DROP TRIGGER IF EXISTS prevent_null_student_id ON student_supervisor_relationships;
DROP TRIGGER IF EXISTS prevent_null_supervisor_id ON student_supervisor_relationships;
DROP TRIGGER IF EXISTS prevent_null_student_id_supervisor ON supervisor_student_relationships;
DROP TRIGGER IF EXISTS prevent_null_supervisor_id_supervisor ON supervisor_student_relationships;

-- Create new triggers
CREATE TRIGGER prevent_null_student_id
  BEFORE INSERT OR UPDATE ON student_supervisor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_ids_trigger();

CREATE TRIGGER prevent_null_supervisor_id
  BEFORE INSERT OR UPDATE ON student_supervisor_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_ids_trigger();

CREATE TRIGGER prevent_null_student_id_supervisor
  BEFORE INSERT OR UPDATE ON supervisor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_ids_trigger();

CREATE TRIGGER prevent_null_supervisor_id_supervisor
  BEFORE INSERT OR UPDATE ON supervisor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_null_ids_trigger();

-- 5. Add NOT NULL constraints
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

-- 6. Create a workaround function for the app to use
CREATE OR REPLACE FUNCTION accept_invitation_safe(
  p_invitation_id UUID,
  p_accepted_by UUID
)
RETURNS JSON AS $$
BEGIN
  -- Use the bulletproof function
  RETURN bulletproof_accept_invitation(p_invitation_id, p_accepted_by);
EXCEPTION WHEN OTHERS THEN
  -- Ultimate fallback
  RETURN json_build_object('success', false, 'error', 'Ultimate fallback: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_invitation_safe TO authenticated;

-- 7. Verification
SELECT 'Final verification:' as status;
SELECT 'student_supervisor_relationships' as table_name, 
       COUNT(*) as total, 
       COUNT(student_id) as non_null_student_id, 
       COUNT(supervisor_id) as non_null_supervisor_id
FROM student_supervisor_relationships
UNION ALL
SELECT 'supervisor_student_relationships' as table_name, 
       COUNT(*) as total, 
       COUNT(student_id) as non_null_student_id, 
       COUNT(supervisor_id) as non_null_supervisor_id
FROM supervisor_student_relationships;

-- 8. Show any remaining problematic invitations
SELECT 'Problematic invitations (missing collections):' as status;
SELECT id, email, metadata->>'collection_id' as collection_id
FROM pending_invitations 
WHERE metadata->>'collection_id' IS NOT NULL 
  AND (metadata->>'collection_id')::UUID NOT IN (SELECT id FROM map_presets);
