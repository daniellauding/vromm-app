-- COMPREHENSIVE SCRIPT TO RESTORE LEARNING PATHS AND EXERCISES VISIBILITY
-- This script fixes common issues that prevent learning data from showing up

-- 1. DIAGNOSE THE CURRENT STATE
SELECT '=== DIAGNOSIS ===' as step;

-- Check learning paths count and status
SELECT 
  'Learning Paths Status:' as info,
  COUNT(*) as total_count,
  COUNT(CASE WHEN active = true THEN 1 END) as active_count,
  COUNT(CASE WHEN active = false THEN 1 END) as inactive_count,
  COUNT(CASE WHEN active IS NULL THEN 1 END) as null_active_count
FROM learning_paths;

-- Check exercises count
SELECT 
  'Learning Path Exercises Status:' as info,
  COUNT(*) as total_count
FROM learning_path_exercises;

-- 2. FIX ACTIVE STATUS
SELECT '=== FIXING ACTIVE STATUS ===' as step;

-- Ensure all learning paths are active
UPDATE learning_paths 
SET active = true 
WHERE active IS NULL OR active = false;

-- 3. CHECK AND FIX RLS POLICIES
SELECT '=== CHECKING RLS POLICIES ===' as step;

-- Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('learning_paths', 'learning_path_exercises');

-- 4. CREATE PERMISSIVE RLS POLICIES IF NEEDED
SELECT '=== CREATING RLS POLICIES ===' as step;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON learning_paths;
DROP POLICY IF EXISTS "Enable read access for all users" ON learning_path_exercises;
DROP POLICY IF EXISTS "Allow authenticated users to read learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Allow authenticated users to read learning path exercises" ON learning_path_exercises;

-- Create permissive read policies
CREATE POLICY "Enable read access for all users" ON learning_paths FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON learning_path_exercises FOR SELECT USING (true);

-- 5. VERIFY THE FIXES
SELECT '=== VERIFICATION ===' as step;

-- Show that data is now accessible
SELECT 
  'Learning Paths After Fix:' as status,
  COUNT(*) as total,
  COUNT(CASE WHEN active = true THEN 1 END) as active
FROM learning_paths;

-- Show sample learning paths
SELECT 
  'Sample Learning Paths:' as info,
  id, 
  title->>'en' as title_en,
  active,
  is_featured,
  created_at
FROM learning_paths 
ORDER BY created_at DESC 
LIMIT 5;

-- Show sample exercises
SELECT 
  'Sample Exercises:' as info,
  lpe.id,
  lpe.title->>'en' as exercise_title,
  lp.title->>'en' as path_title,
  lpe.is_featured
FROM learning_path_exercises lpe
JOIN learning_paths lp ON lpe.learning_path_id = lp.id
ORDER BY lpe.created_at DESC 
LIMIT 5;

-- 6. FINAL STATUS CHECK
SELECT '=== FINAL STATUS ===' as step;
SELECT 'Learning paths and exercises should now be visible in both admin and app!' as message;
