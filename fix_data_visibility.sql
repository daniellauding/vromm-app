-- Fix data visibility issues for learning paths and exercises
-- This script addresses common RLS and permission issues

-- 1. First, let's see what we're working with
SELECT 'Before fixes - Learning Paths:' as status;
SELECT COUNT(*) as total, COUNT(CASE WHEN active = true THEN 1 END) as active FROM learning_paths;

-- 2. Ensure all learning paths are active (they should be visible)
UPDATE learning_paths 
SET active = true 
WHERE active IS NULL OR active = false;

-- 3. Check if there are any RLS policies blocking access
-- If RLS is too restrictive, we might need to adjust policies

-- 4. Ensure we can see the data by temporarily disabling RLS if needed
-- (Only run this if the above queries show data exists but admin can't see it)
-- ALTER TABLE learning_paths DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE learning_path_exercises DISABLE ROW LEVEL SECURITY;

-- 5. Or create permissive RLS policies if they don't exist
-- Allow all authenticated users to read learning paths
DO $$
BEGIN
    -- Check if policy exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'learning_paths' 
        AND policyname = 'Allow authenticated users to read learning paths'
    ) THEN
        CREATE POLICY "Allow authenticated users to read learning paths"
        ON learning_paths FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Allow all authenticated users to read learning path exercises
DO $$
BEGIN
    -- Check if policy exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'learning_path_exercises' 
        AND policyname = 'Allow authenticated users to read learning path exercises'
    ) THEN
        CREATE POLICY "Allow authenticated users to read learning path exercises"
        ON learning_path_exercises FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- 6. Verify the fixes
SELECT 'After fixes - Learning Paths:' as status;
SELECT COUNT(*) as total, COUNT(CASE WHEN active = true THEN 1 END) as active FROM learning_paths;

SELECT 'Sample Learning Paths:' as status;
SELECT id, title->>'en' as title, active, is_featured FROM learning_paths ORDER BY created_at DESC LIMIT 3;

SELECT 'Sample Exercises:' as status;
SELECT lpe.id, lpe.title->>'en' as exercise_title, lp.title->>'en' as path_title 
FROM learning_path_exercises lpe
JOIN learning_paths lp ON lpe.learning_path_id = lp.id
ORDER BY lpe.created_at DESC LIMIT 3;
