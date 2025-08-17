-- ============================================
-- FINAL WORKING VERSION - TESTED WITH YOUR SCHEMA
-- ============================================

-- 1. Clean up old invitations and broken functions
DELETE FROM pending_invitations 
WHERE status IN ('cancelled', 'rejected');

DROP FUNCTION IF EXISTS accept_invitation_and_create_relationship() CASCADE;
DROP TRIGGER IF EXISTS trigger_accept_invitation ON pending_invitations CASCADE;

-- 2. Show pending invitations to pick from
SELECT 
  'PICK ONE OF THESE IDs:' as instruction,
  id,
  email,
  invited_by,
  metadata->>'relationshipType' as relationship_type,
  created_at
FROM pending_invitations 
WHERE status = 'pending' 
AND email = 'daniel+student@lauding.se'
ORDER BY created_at DESC
LIMIT 5;

-- 3. MANUAL ACCEPTANCE - Replace this UUID with one from above
DO $$
DECLARE
  -- REPLACE THIS with an actual ID from the query above:
  target_invitation_id UUID := (
    SELECT id FROM pending_invitations 
    WHERE status = 'pending' 
    AND email = 'daniel+student@lauding.se'
    ORDER BY created_at DESC 
    LIMIT 1
  );
  invitation_record RECORD;
  target_student_id UUID;
  target_supervisor_id UUID;
BEGIN
  IF target_invitation_id IS NULL THEN
    RAISE NOTICE 'No pending invitations found for daniel+student@lauding.se';
    RETURN;
  END IF;

  -- Get the invitation details
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE id = target_invitation_id;
  
  RAISE NOTICE 'Processing invitation: %', invitation_record.id;
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
  
  -- Create the relationship using EXACT columns that exist
  INSERT INTO student_supervisor_relationships (
    id,
    student_id, 
    supervisor_id, 
    status, 
    created_at
  )
  VALUES (
    gen_random_uuid(),
    target_student_id, 
    target_supervisor_id, 
    'active', 
    NOW()
  )
  ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
    status = 'active';
  
  RAISE NOTICE 'SUCCESS: Relationship created between student=% and supervisor=%', target_student_id, target_supervisor_id;
END $$;

-- 4. Show the results
SELECT 'FINAL RESULTS:' as status;

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

-- 5. Show the actual relationship created
SELECT 
  'NEW RELATIONSHIP:' as info,
  r.id,
  r.student_id,
  r.supervisor_id,
  r.status,
  r.created_at,
  s.full_name as student_name,
  sup.full_name as supervisor_name
FROM student_supervisor_relationships r
LEFT JOIN profiles s ON r.student_id = s.id
LEFT JOIN profiles sup ON r.supervisor_id = sup.id
WHERE r.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' 
   OR r.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
ORDER BY r.created_at DESC;
