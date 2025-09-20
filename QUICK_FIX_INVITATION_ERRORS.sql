-- Quick fix for invitation acceptance errors
-- Run this first to fix immediate issues

-- 1. Clean up orphaned invitations with missing presets
DELETE FROM collection_invitations 
WHERE preset_id IS NOT NULL 
AND preset_id NOT IN (SELECT id FROM map_presets);

-- 2. Fix null student_id in collection_invitations
UPDATE collection_invitations 
SET student_id = inviter_id 
WHERE student_id IS NULL 
AND inviter_id IS NOT NULL;

-- Delete any remaining invalid invitations
DELETE FROM collection_invitations 
WHERE student_id IS NULL;

-- 3. Fix null student_id in student_supervisor_relationships
UPDATE student_supervisor_relationships 
SET student_id = (
  SELECT ci.student_id 
  FROM collection_invitations ci 
  WHERE ci.id = student_supervisor_relationships.invitation_id
)
WHERE student_id IS NULL 
AND invitation_id IS NOT NULL;

-- Delete any remaining invalid relationships
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 4. Verify the fixes worked
SELECT 'Fixed orphaned invitations' as status, COUNT(*) as remaining_issues
FROM collection_invitations 
WHERE student_id IS NULL OR (preset_id IS NOT NULL AND preset_id NOT IN (SELECT id FROM map_presets));
