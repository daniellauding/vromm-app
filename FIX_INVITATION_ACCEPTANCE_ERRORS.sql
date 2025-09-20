-- Fix invitation acceptance errors
-- This will resolve the foreign key and null constraint violations

-- 1. Fix missing map_presets entries
-- First, let's see what preset_id is causing the issue
-- SELECT * FROM map_presets WHERE id = '43cdb003-3df7-4f07-9d04-9055f897c798';

-- If the preset doesn't exist, we need to either:
-- A) Create the missing preset, or
-- B) Clean up orphaned invitations

-- Check for orphaned invitations with missing presets
-- SELECT ci.* FROM collection_invitations ci 
-- LEFT JOIN map_presets mp ON ci.preset_id = mp.id 
-- WHERE mp.id IS NULL AND ci.preset_id IS NOT NULL;

-- Option A: Create missing preset (if it should exist)
-- INSERT INTO map_presets (id, name, description, created_by, created_at, updated_at)
-- VALUES (
--   '43cdb003-3df7-4f07-9d04-9055f897c798',
--   'Default Collection',
--   'Default collection for invitations',
--   (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
--   NOW(),
--   NOW()
-- );

-- Option B: Clean up orphaned invitations (RECOMMENDED)
-- Delete invitations that reference non-existent presets
DELETE FROM collection_invitations 
WHERE preset_id IS NOT NULL 
AND preset_id NOT IN (SELECT id FROM map_presets);

-- 2. Fix null student_id constraint violation
-- Check for invitations with null student_id
-- SELECT * FROM collection_invitations WHERE student_id IS NULL;

-- Update invitations with null student_id to use the inviter's ID as fallback
UPDATE collection_invitations 
SET student_id = inviter_id 
WHERE student_id IS NULL 
AND inviter_id IS NOT NULL;

-- For any remaining null student_id entries, delete them as they're invalid
DELETE FROM collection_invitations 
WHERE student_id IS NULL;

-- 3. Fix student_supervisor_relationships null constraint
-- Check for null student_id in relationships
-- SELECT * FROM student_supervisor_relationships WHERE student_id IS NULL;

-- Update relationships with null student_id
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

-- 4. Add constraints to prevent future issues
-- Add NOT NULL constraint to student_id in collection_invitations
ALTER TABLE collection_invitations 
ALTER COLUMN student_id SET NOT NULL;

-- Add NOT NULL constraint to student_id in student_supervisor_relationships  
ALTER TABLE student_supervisor_relationships 
ALTER COLUMN student_id SET NOT NULL;

-- 5. Add foreign key constraint to ensure preset_id references exist
-- First, clean up any remaining orphaned references
DELETE FROM collection_invitations 
WHERE preset_id IS NOT NULL 
AND preset_id NOT IN (SELECT id FROM map_presets);

-- Add foreign key constraint (if not already exists)
-- ALTER TABLE collection_invitations 
-- ADD CONSTRAINT collection_invitations_preset_id_fkey 
-- FOREIGN KEY (preset_id) REFERENCES map_presets(id) ON DELETE CASCADE;

-- 6. Verify the fixes
-- Check for any remaining orphaned invitations
SELECT 
  'Orphaned invitations with missing presets' as issue,
  COUNT(*) as count
FROM collection_invitations ci 
LEFT JOIN map_presets mp ON ci.preset_id = mp.id 
WHERE mp.id IS NULL AND ci.preset_id IS NOT NULL

UNION ALL

SELECT 
  'Invitations with null student_id' as issue,
  COUNT(*) as count
FROM collection_invitations 
WHERE student_id IS NULL

UNION ALL

SELECT 
  'Relationships with null student_id' as issue,
  COUNT(*) as count
FROM student_supervisor_relationships 
WHERE student_id IS NULL;
