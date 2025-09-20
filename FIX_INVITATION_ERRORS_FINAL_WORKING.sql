-- FIX INVITATION ERRORS - FINAL WORKING VERSION
-- Based on the actual database structure we can see

-- 1. Check the actual columns in student_supervisor_relationships
SELECT 'student_supervisor_relationships columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'student_supervisor_relationships'
ORDER BY ordinal_position;

-- 2. Check the actual columns in supervisor_student_relationships  
SELECT 'supervisor_student_relationships columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'supervisor_student_relationships'
ORDER BY ordinal_position;

-- 3. Check the actual columns in pending_invitations
SELECT 'pending_invitations columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations'
ORDER BY ordinal_position;

-- 4. Clean up orphaned map_preset_members records (this was the main error)
DELETE FROM map_preset_members 
WHERE preset_id NOT IN (SELECT id FROM map_presets);

-- 5. Check for null student_id in student_supervisor_relationships
SELECT 'null student_id count in student_supervisor_relationships:' as info, COUNT(*) as count
FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 6. Check for null student_id in supervisor_student_relationships
SELECT 'null student_id count in supervisor_student_relationships:' as info, COUNT(*) as count
FROM supervisor_student_relationships 
WHERE student_id IS NULL;

-- 7. Delete any invalid relationships with null student_id
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

DELETE FROM supervisor_student_relationships 
WHERE student_id IS NULL;

-- 8. Add NOT NULL constraints to prevent future issues
-- This will only work if the columns exist
DO $$
BEGIN
    -- Add constraint to student_supervisor_relationships if student_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_supervisor_relationships' 
               AND column_name = 'student_id') THEN
        ALTER TABLE student_supervisor_relationships 
        ALTER COLUMN student_id SET NOT NULL;
    END IF;
    
    -- Add constraint to supervisor_student_relationships if student_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'supervisor_student_relationships' 
               AND column_name = 'student_id') THEN
        ALTER TABLE supervisor_student_relationships 
        ALTER COLUMN student_id SET NOT NULL;
    END IF;
END $$;

-- 9. Verify the fixes worked
SELECT 'Fixed orphaned map_preset_members' as status, COUNT(*) as remaining_issues
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mp.id IS NULL;

SELECT 'Remaining null student_id in student_supervisor_relationships' as status, COUNT(*) as remaining_issues
FROM student_supervisor_relationships 
WHERE student_id IS NULL;

SELECT 'Remaining null student_id in supervisor_student_relationships' as status, COUNT(*) as remaining_issues
FROM supervisor_student_relationships 
WHERE student_id IS NULL;
