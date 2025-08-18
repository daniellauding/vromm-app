-- ============================================
-- WORKING FIX BASED ON YOUR REAL DATA
-- ============================================

-- 1. Clean up duplicate/old invitations (keep only latest pending ones)
DELETE FROM pending_invitations 
WHERE status IN ('cancelled', 'rejected')
OR (status = 'pending' AND id NOT IN (
  SELECT DISTINCT ON (email, invited_by) id
  FROM pending_invitations 
  WHERE status = 'pending'
  ORDER BY email, invited_by, created_at DESC
));

-- 2. Drop any problematic functions/triggers
DROP FUNCTION IF EXISTS accept_invitation_and_create_relationship() CASCADE;
DROP TRIGGER IF EXISTS trigger_accept_invitation ON pending_invitations CASCADE;

-- 3. Find a pending invitation to test with
SELECT 
  id,
  email,
  invited_by,
  status,
  metadata->>'relationshipType' as relationship_type,
  created_at
FROM pending_invitations 
WHERE status = 'pending' 
AND email = 'daniel+student@lauding.se'
ORDER BY created_at DESC
LIMIT 3;

-- 4. Manual acceptance test (replace the ID with actual one from above)
DO $$
DECLARE
  target_invitation_id UUID := 'REPLACE_WITH_ACTUAL_ID_FROM_ABOVE'; -- You'll need to update this
  invitation_record RECORD;
  target_student_id UUID;
  target_supervisor_id UUID;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE id = target_invitation_id
  AND status = 'pending';
  
  IF invitation_record.id IS NOT NULL THEN
    RAISE NOTICE 'Found invitation: %', invitation_record.id;
    RAISE NOTICE 'Email: %', invitation_record.email;
    RAISE NOTICE 'Invited by: %', invitation_record.invited_by;
    RAISE NOTICE 'Relationship type: %', invitation_record.metadata->>'relationshipType';
    
    -- Determine who is student and who is supervisor
    IF invitation_record.metadata->>'relationshipType' = 'student_invites_supervisor' THEN
      target_student_id := invitation_record.invited_by;     -- inviter is student
      target_supervisor_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea'; -- accepter is supervisor
      RAISE NOTICE 'Student invites supervisor: student=%, supervisor=%', target_student_id, target_supervisor_id;
    ELSE
      target_student_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea';    -- accepter is student
      target_supervisor_id := invitation_record.invited_by;  -- inviter is supervisor
      RAISE NOTICE 'Supervisor invites student: student=%, supervisor=%', target_student_id, target_supervisor_id;
    END IF;
    
    -- Update invitation to accepted
    UPDATE pending_invitations 
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      accepted_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
    WHERE id = target_invitation_id;
    
    -- Create the relationship (using only columns that exist)
    INSERT INTO student_supervisor_relationships (student_id, supervisor_id, created_at)
    VALUES (target_student_id, target_supervisor_id, NOW())
    ON CONFLICT (student_id, supervisor_id) DO NOTHING;
    
    RAISE NOTICE 'SUCCESS: Relationship created!';
  ELSE
    RAISE NOTICE 'Invitation not found with ID: %', target_invitation_id;
  END IF;
END $$;

-- 5. Show results
SELECT 'After fix:' as status;

SELECT 
  'INVITATIONS' as type,
  status,
  COUNT(*) as count
FROM pending_invitations 
GROUP BY status
UNION ALL
SELECT 
  'RELATIONSHIPS' as type,
  'active' as status,
  COUNT(*) as count  
FROM student_supervisor_relationships
ORDER BY type, status;
