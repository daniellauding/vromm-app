-- FIX INVITATION ACCEPTANCE ERRORS - CORRECTED VERSION
-- This fixes the actual database schema issues

-- 1. Fix missing map_presets entries
-- Clean up orphaned invitations with missing presets
DELETE FROM pending_invitations 
WHERE preset_id IS NOT NULL 
AND preset_id NOT IN (SELECT id FROM map_presets);

-- 2. Fix null accepted_by in pending_invitations
-- Update invitations with null accepted_by to use the inviter's ID as fallback
UPDATE pending_invitations 
SET accepted_by = invited_by 
WHERE accepted_by IS NULL 
AND invited_by IS NOT NULL;

-- For any remaining null accepted_by entries, delete them as they're invalid
DELETE FROM pending_invitations 
WHERE accepted_by IS NULL;

-- 3. Fix student_supervisor_relationships null constraint
-- Check for null student_id in relationships
UPDATE student_supervisor_relationships 
SET student_id = (
  SELECT pi.accepted_by 
  FROM pending_invitations pi 
  WHERE pi.id = student_supervisor_relationships.invitation_id
)
WHERE student_id IS NULL 
AND invitation_id IS NOT NULL;

-- Delete any remaining invalid relationships
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 4. Add constraints to prevent future issues
-- Add NOT NULL constraint to accepted_by in pending_invitations
ALTER TABLE pending_invitations 
ALTER COLUMN accepted_by SET NOT NULL;

-- Add NOT NULL constraint to student_id in student_supervisor_relationships  
ALTER TABLE student_supervisor_relationships 
ALTER COLUMN student_id SET NOT NULL;

-- 5. Verify the fixes worked
SELECT 'Fixed orphaned invitations' as status, COUNT(*) as remaining_issues
FROM pending_invitations 
WHERE accepted_by IS NULL OR (preset_id IS NOT NULL AND preset_id NOT IN (SELECT id FROM map_presets));

-- Check for any remaining issues
SELECT 
  'Orphaned invitations with missing presets' as issue,
  COUNT(*) as count
FROM pending_invitations pi 
LEFT JOIN map_presets mp ON pi.preset_id = mp.id 
WHERE mp.id IS NULL AND pi.preset_id IS NOT NULL

UNION ALL

SELECT 
  'Invitations with null accepted_by' as issue,
  COUNT(*) as count
FROM pending_invitations 
WHERE accepted_by IS NULL

UNION ALL

SELECT 
  'Relationships with null student_id' as issue,
  COUNT(*) as count
FROM student_supervisor_relationships 
WHERE student_id IS NULL;
