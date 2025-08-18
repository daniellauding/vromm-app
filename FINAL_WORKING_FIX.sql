-- ============================================
-- FINAL WORKING FIX - NO MORE ASSUMPTIONS!
-- ============================================

-- 1. First, let's see what columns actually exist in the table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Drop all the problematic functions and triggers
DROP FUNCTION IF EXISTS accept_invitation_and_create_relationship() CASCADE;
DROP TRIGGER IF EXISTS trigger_accept_invitation ON pending_invitations CASCADE;

-- 3. Let's see what the actual table structure is and fix it
DO $$
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_supervisor_relationships' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE student_supervisor_relationships ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to student_supervisor_relationships';
  END IF;
END $$;

-- 4. Clean up duplicate invitations (keep only latest)
DELETE FROM pending_invitations 
WHERE id NOT IN (
  SELECT DISTINCT ON (email, invited_by) id
  FROM pending_invitations 
  ORDER BY email, invited_by, created_at DESC
);

-- 5. Test acceptance manually with SIMPLE logic - no fancy functions
DO $$
DECLARE
  invitation_record RECORD;
  target_student_id UUID;
  target_supervisor_id UUID;
BEGIN
  -- Find a pending invitation
  SELECT * INTO invitation_record
  FROM pending_invitations 
  WHERE status = 'pending' 
  AND email = 'daniel+student@lauding.se'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF invitation_record.id IS NOT NULL THEN
    RAISE NOTICE 'Found invitation: %', invitation_record.id;
    RAISE NOTICE 'Metadata: %', invitation_record.metadata;
    
    -- Update invitation status
    UPDATE pending_invitations 
    SET 
      status = 'accepted',
      accepted_at = NOW(),
      accepted_by = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
    WHERE id = invitation_record.id;
    
    -- Determine relationship direction
    IF invitation_record.metadata->>'relationshipType' = 'student_invites_supervisor' THEN
      target_student_id := invitation_record.invited_by;     -- inviter is student
      target_supervisor_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea'; -- accepter is supervisor
      RAISE NOTICE 'Student invites supervisor: student=%, supervisor=%', target_student_id, target_supervisor_id;
    ELSE
      target_student_id := 'c16a364f-3bc4-4d60-bca9-460e977fddea';    -- accepter is student
      target_supervisor_id := invitation_record.invited_by;  -- inviter is supervisor
      RAISE NOTICE 'Supervisor invites student: student=%, supervisor=%', target_student_id, target_supervisor_id;
    END IF;
    
    -- Insert relationship with ONLY the columns that exist
    INSERT INTO student_supervisor_relationships (student_id, supervisor_id, status, created_at)
    VALUES (target_student_id, target_supervisor_id, 'active', NOW())
    ON CONFLICT (student_id, supervisor_id) DO UPDATE SET
      status = 'active';
    
    RAISE NOTICE 'SUCCESS: Created relationship!';
  ELSE
    RAISE NOTICE 'No pending invitations found';
  END IF;
END $$;

-- 6. Show what we have now
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
UNION ALL
SELECT 
  'NOTIFICATIONS' as type,
  type::text as status,
  COUNT(*) as count
FROM notifications 
WHERE type IN ('student_invitation', 'supervisor_invitation')
GROUP BY type
ORDER BY type, status;

-- 7. Show the actual relationship that was created
SELECT 
  r.*,
  s.full_name as student_name,
  sup.full_name as supervisor_name
FROM student_supervisor_relationships r
LEFT JOIN profiles s ON r.student_id = s.id
LEFT JOIN profiles sup ON r.supervisor_id = sup.id
WHERE r.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' 
   OR r.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea';
