-- ============================================
-- TEST: STUDENT INVITES TEACHER SCENARIO
-- ============================================
-- This tests the reverse scenario where a student invites a teacher/instructor

-- 1. Create test invitation: Student inviting teacher
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pending_invitations 
    WHERE email = 'daniel+handledare@lauding.se' 
    AND invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  ) THEN
    INSERT INTO pending_invitations (
      id,
      email,
      role,
      invited_by,
      status,
      metadata
    ) VALUES (
      'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
      'daniel+handledare@lauding.se',
      'instructor', -- Student is inviting someone to be their instructor
      'c16a364f-3bc4-4d60-bca9-460e977fddea', -- Student ID (the inviter)
      'pending',
      '{
        "relationshipType": "student_invites_supervisor",
        "supervisorName": "daniel+student",
        "inviterRole": "student"
      }'::jsonb
    );
    RAISE NOTICE 'Created student-invites-teacher invitation';
  ELSE
    UPDATE pending_invitations SET
      status = 'pending',
      metadata = '{
        "relationshipType": "student_invites_supervisor",
        "supervisorName": "daniel+student",
        "inviterRole": "student"
      }'::jsonb,
      updated_at = NOW()
    WHERE email = 'daniel+handledare@lauding.se' 
    AND invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea';
    RAISE NOTICE 'Updated existing student-invites-teacher invitation';
  END IF;
END $$;

-- 2. Create corresponding notification for the teacher
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
    AND metadata->>'invitation_id' = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
  ) THEN
    INSERT INTO notifications (
      user_id,
      actor_id,
      type,
      message,
      metadata,
      is_read
    ) VALUES (
      '06c73e75-0ef7-442b-acd0-ee204f83d1aa', -- Teacher ID (recipient)
      'c16a364f-3bc4-4d60-bca9-460e977fddea', -- Student ID (sender)
      'supervisor_invitation'::notification_type,
      'daniel+student invited you to be their instructor',
      '{
        "invitation_id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        "inviter_name": "daniel+student",
        "relationship_type": "student_invites_supervisor"
      }'::jsonb,
      false
    );
    RAISE NOTICE 'Created supervisor invitation notification';
  ELSE
    RAISE NOTICE 'Supervisor invitation notification already exists';
  END IF;
END $$;

-- 3. Function to test acceptance (teacher accepting student's invitation)
CREATE OR REPLACE FUNCTION test_teacher_accepts_student_invitation()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  invitation_record RECORD;
  student_id UUID;
  supervisor_id UUID;
BEGIN
  -- Get the test invitation
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No pending student-invites-teacher invitation found';
    RETURN false;
  END IF;
  
  -- Update invitation status
  UPDATE pending_invitations 
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' -- Teacher accepting
  WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid;
  
  -- Determine relationship direction for student_invites_supervisor
  IF invitation_record.metadata->>'relationshipType' = 'student_invites_supervisor' THEN
    student_id := invitation_record.invited_by; -- inviter (student)
    supervisor_id := '06c73e75-0ef7-442b-acd0-ee204f83d1aa'; -- accepter (teacher)
  ELSE
    -- This shouldn't happen in this test, but fallback
    student_id := '06c73e75-0ef7-442b-acd0-ee204f83d1aa';
    supervisor_id := invitation_record.invited_by;
  END IF;
  
  -- Create relationship
  INSERT INTO student_supervisor_relationships (
    student_id,
    supervisor_id,
    status,
    created_at
  ) VALUES (
    student_id,
    supervisor_id,
    'active',
    NOW()
  ) ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
    status = 'active',
    updated_at = NOW();
  
  RAISE NOTICE 'Student-invites-teacher accepted: student=%, supervisor=%', student_id, supervisor_id;
  RETURN true;
END;
$$;

-- 4. Test the acceptance
SELECT test_teacher_accepts_student_invitation();

-- 5. Verify both scenarios work
SELECT 
  'BOTH_INVITATIONS' as scenario,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted
FROM pending_invitations 
WHERE (email = 'daniel+student@lauding.se' AND invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (email = 'daniel+handledare@lauding.se' AND invited_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea');

-- 6. Verify relationships created correctly
SELECT 
  'RELATIONSHIPS' as type,
  student_id::text as student,
  supervisor_id::text as supervisor,
  status,
  'Student: c16a364f-3bc4-4d60-bca9-460e977fddea, Teacher: 06c73e75-0ef7-442b-acd0-ee204f83d1aa' as note
FROM student_supervisor_relationships
WHERE (student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' 
       AND supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' 
       AND supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea');

-- 7. Clean up test function
DROP FUNCTION IF EXISTS test_teacher_accepts_student_invitation();

-- 8. Show summary of both notification types
SELECT 
  type::text as notification_type,
  user_id::text as recipient,
  actor_id::text as sender,
  message,
  metadata->>'relationship_type' as relationship_direction
FROM notifications 
WHERE metadata->>'invitation_id' IN (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
)
ORDER BY created_at;
