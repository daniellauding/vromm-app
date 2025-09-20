-- FIX INVITATION ERRORS - CORRECT VERSION
-- Based on the actual database structure we can see

-- 1. Check the actual columns in map_preset_members table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'map_preset_members'
ORDER BY ordinal_position;

-- 2. Check the actual columns in pending_invitations table  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations'
ORDER BY ordinal_position;

-- 3. Check the actual columns in student_supervisor_relationships table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships'
ORDER BY ordinal_position;

-- 4. The error was about map_preset_members.preset_id foreign key
-- Let's check if there are orphaned records in map_preset_members
SELECT COUNT(*) as orphaned_preset_members
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mp.id IS NULL;

-- 5. Clean up orphaned map_preset_members records
DELETE FROM map_preset_members 
WHERE preset_id NOT IN (SELECT id FROM map_presets);

-- 6. Fix null student_id in student_supervisor_relationships
-- Update relationships with null student_id to use invited_by from pending_invitations
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

-- 7. Delete any remaining invalid relationships
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 8. Add constraints to prevent future issues
-- Add NOT NULL constraint to student_id in student_supervisor_relationships  
ALTER TABLE student_supervisor_relationships 
ALTER COLUMN student_id SET NOT NULL;

-- 9. Verify the fixes worked
SELECT 'Fixed orphaned map_preset_members' as status, COUNT(*) as remaining_issues
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mp.id IS NULL;

SELECT 'Fixed relationships with null student_id' as status, COUNT(*) as remaining_issues
FROM student_supervisor_relationships 
WHERE student_id IS NULL;
