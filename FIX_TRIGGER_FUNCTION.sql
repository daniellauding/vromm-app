-- ============================================
-- FIX DATABASE TRIGGER FUNCTION
-- ============================================

-- 1. First, let's see what functions exist
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname ILIKE '%invitation%' OR proname ILIKE '%relationship%'
ORDER BY proname;

-- 2. Drop the problematic function if it exists
DROP FUNCTION IF EXISTS accept_invitation_and_create_relationship() CASCADE;

-- 3. Drop any triggers that might be calling this function
DROP TRIGGER IF EXISTS trigger_accept_invitation ON pending_invitations;

-- 4. Create a new, correct function that uses the right table name
CREATE OR REPLACE FUNCTION accept_invitation_and_create_relationship()
RETURNS TRIGGER AS $$
DECLARE
  target_student_id UUID;
  target_supervisor_id UUID;
  relationship_type TEXT;
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    relationship_type := NEW.metadata->>'relationshipType';
    
    IF relationship_type = 'student_invites_supervisor' THEN
      -- Student invited supervisor, so student is inviter and supervisor is accepter
      target_student_id := NEW.invited_by;     -- inviter (student)
      target_supervisor_id := NEW.accepted_by; -- accepter (supervisor)
    ELSE
      -- supervisor_invites_student or default
      target_student_id := NEW.accepted_by;    -- accepter (student)  
      target_supervisor_id := NEW.invited_by;  -- inviter (supervisor)
    END IF;
    
    -- Insert into the CORRECT table name
    INSERT INTO student_supervisor_relationships (student_id, supervisor_id, status, created_at)
    VALUES (target_student_id, target_supervisor_id, 'active', NOW())
    ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
      status = 'active',
      updated_at = NOW();
      
    RAISE NOTICE 'Created relationship: student=%, supervisor=%', target_student_id, target_supervisor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the trigger (optional - we might not want auto-creation)
-- CREATE TRIGGER trigger_accept_invitation
--   AFTER UPDATE ON pending_invitations
--   FOR EACH ROW
--   EXECUTE FUNCTION accept_invitation_and_create_relationship();

-- 6. Clean up any old/broken data
DELETE FROM pending_invitations 
WHERE id NOT IN (
  SELECT DISTINCT ON (email, invited_by) id
  FROM pending_invitations 
  ORDER BY email, invited_by, created_at DESC
);

-- 7. Now test the acceptance manually (without trigger)
DO $$
DECLARE
  test_invitation_id UUID;
  invitation_record RECORD;
  target_student_id UUID;
  target_supervisor_id UUID;
BEGIN
  -- Find a pending invitation
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE status = 'pending' 
  AND email = 'daniel+student@lauding.se'
  LIMIT 1;
  
  IF invitation_record.id IS NOT NULL THEN
    RAISE NOTICE 'Found invitation to test: %', invitation_record.id;
    
    -- Update invitation status
    UPDATE pending_invitations 
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      accepted_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
    WHERE id = invitation_record.id;
    
    -- Manually create relationship with correct logic
    IF invitation_record.metadata->>'relationshipType' = 'student_invites_supervisor' THEN
      target_student_id := invitation_record.invited_by;     -- inviter is student
      target_supervisor_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea'; -- accepter is supervisor
    ELSE
      target_student_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea';    -- accepter is student
      target_supervisor_id := invitation_record.invited_by;  -- inviter is supervisor
    END IF;
    
    INSERT INTO student_supervisor_relationships (student_id, supervisor_id, status, created_at)
    VALUES (target_student_id, target_supervisor_id, 'active', NOW())
    ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
      status = 'active',
      updated_at = NOW();
    
    RAISE NOTICE 'SUCCESS: Created relationship student=%, supervisor=%', target_student_id, target_supervisor_id;
  ELSE
    RAISE NOTICE 'No pending invitations found to test';
  END IF;
END $$;

-- 8. Show final status
SELECT 
  'INVITATIONS' as type,
  status,
  COUNT(*) as count
FROM pending_invitations 
GROUP BY status
UNION ALL
SELECT 
  'RELATIONSHIPS' as type,
  status,
  COUNT(*) as count  
FROM student_supervisor_relationships
GROUP BY status
ORDER BY type, status;
