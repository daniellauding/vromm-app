-- MINIMAL FIX - No invitation_id column
-- Only fix what we know exists

-- 1. Clean up orphaned map_preset_members records (this was the main error)
DELETE FROM map_preset_members 
WHERE preset_id NOT IN (SELECT id FROM map_presets);

-- 2. Check if student_supervisor_relationships has any null student_id
SELECT 'null student_id count:' as info, COUNT(*) as count
FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 3. If there are null student_id records, we need to either:
--    A) Delete them (if they're invalid)
--    B) Set them to a default value
--    C) Leave them as is (if they're valid)

-- Let's see what data exists first
SELECT 'sample student_supervisor_relationships:' as info;
SELECT * FROM student_supervisor_relationships LIMIT 5;

-- 4. If student_id is null and we can't fix it, delete those records
DELETE FROM student_supervisor_relationships 
WHERE student_id IS NULL;

-- 5. Add NOT NULL constraint to student_id (if the column exists)
-- This will fail if the column doesn't exist, which is fine
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_supervisor_relationships' 
               AND column_name = 'student_id') THEN
        ALTER TABLE student_supervisor_relationships 
        ALTER COLUMN student_id SET NOT NULL;
    END IF;
END $$;

-- 6. Verify the fixes worked
SELECT 'Fixed orphaned map_preset_members' as status, COUNT(*) as remaining_issues
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mp.id IS NULL;

SELECT 'Remaining null student_id' as status, COUNT(*) as remaining_issues
FROM student_supervisor_relationships 
WHERE student_id IS NULL;
