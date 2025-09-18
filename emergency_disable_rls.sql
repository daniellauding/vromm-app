-- EMERGENCY FIX: DISABLE RLS TEMPORARILY FOR ADMIN ACCESS
-- Use this if the comprehensive RLS policy fix doesn't work

-- 1. DISABLE RLS ON LEARNING PATHS TABLE
ALTER TABLE learning_paths DISABLE ROW LEVEL SECURITY;

-- 2. DISABLE RLS ON LEARNING PATH EXERCISES TABLE  
ALTER TABLE learning_path_exercises DISABLE ROW LEVEL SECURITY;

-- 3. VERIFY RLS IS DISABLED
SELECT 
  'RLS Status After Disable:' as status,
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('learning_paths', 'learning_path_exercises');

-- 4. TEST ACCESS
SELECT 'Testing access to learning_paths...' as test;
SELECT COUNT(*) as learning_paths_count FROM learning_paths;

SELECT 'Testing access to learning_path_exercises...' as test;
SELECT COUNT(*) as exercises_count FROM learning_path_exercises;

SELECT 'RLS has been disabled! Admin should now be able to create, read, update, and delete learning paths and exercises.' as message;
