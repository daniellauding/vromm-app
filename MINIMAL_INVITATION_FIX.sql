-- MINIMAL INVITATION FIX
-- Only fix what we know exists based on the database types

-- 1. Check what we're working with first
SELECT 'pending_invitations columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations'
ORDER BY ordinal_position;

-- 2. Check student_supervisor_relationships columns
SELECT 'student_supervisor_relationships columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships'
ORDER BY ordinal_position;

-- 3. Based on the database types, we know these columns exist:
-- pending_invitations: id, email, invited_by, status, created_at, updated_at, role, metadata
-- student_supervisor_relationships: id, student_id, supervisor_id, invitation_id, created_at

-- 4. Fix null student_id in student_supervisor_relationships
-- Update relationships with null student_id to use a default or delete them
UPDATE student_supervisor_relationships 
SET student_id = (
  SELECT pi.invited_by 
  FROM pending_invitations pi 
  WHERE pi.id = student_supervisor_relationships.invitation_id
)
WHERE student_id IS NULL 
AND invitation_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM pending_invitations pi 
  WHERE pi.id = student_supervisor_relationships.invitation_id 
  AND pi.invited_by IS NOT NULL
);

-- 5. Delete any remaining invalid relationships
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 6. Add NOT NULL constraint to student_id in student_supervisor_relationships  
ALTER TABLE student_supervisor_relationships 
ALTER COLUMN student_id SET NOT NULL;

-- 7. Verify the fixes worked
SELECT 'Fixed relationships with null student_id' as status, COUNT(*) as remaining_issues
FROM student_supervisor_relationships 
WHERE student_id IS NULL;
