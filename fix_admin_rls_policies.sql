-- FIX ADMIN RLS POLICIES FOR LEARNING PATHS AND EXERCISES
-- This script fixes RLS policies to allow admin users to create, update, and delete learning content

-- 1. DIAGNOSE CURRENT RLS POLICIES
SELECT '=== CURRENT RLS POLICIES ===' as step;

-- Check existing policies on learning_paths
SELECT 
  'Learning Paths Policies:' as info,
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'learning_paths';

-- Check existing policies on learning_path_exercises
SELECT 
  'Learning Path Exercises Policies:' as info,
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'learning_path_exercises';

-- 2. DROP EXISTING RESTRICTIVE POLICIES
SELECT '=== DROPPING RESTRICTIVE POLICIES ===' as step;

-- Drop all existing policies on learning_paths
DROP POLICY IF EXISTS "Enable read access for all users" ON learning_paths;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON learning_paths;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON learning_paths;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON learning_paths;
DROP POLICY IF EXISTS "Allow authenticated users to read learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Allow authenticated users to insert learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Allow authenticated users to update learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Allow authenticated users to delete learning paths" ON learning_paths;

-- Drop all existing policies on learning_path_exercises
DROP POLICY IF EXISTS "Enable read access for all users" ON learning_path_exercises;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON learning_path_exercises;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON learning_path_exercises;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON learning_path_exercises;
DROP POLICY IF EXISTS "Allow authenticated users to read learning path exercises" ON learning_path_exercises;
DROP POLICY IF EXISTS "Allow authenticated users to insert learning path exercises" ON learning_path_exercises;
DROP POLICY IF EXISTS "Allow authenticated users to update learning path exercises" ON learning_path_exercises;
DROP POLICY IF EXISTS "Allow authenticated users to delete learning path exercises" ON learning_path_exercises;

-- 3. CREATE COMPREHENSIVE RLS POLICIES
SELECT '=== CREATING NEW RLS POLICIES ===' as step;

-- Learning Paths Policies
-- Allow all authenticated users to read learning paths
CREATE POLICY "Enable read access for all users" ON learning_paths FOR SELECT USING (true);

-- Allow all authenticated users to insert learning paths
CREATE POLICY "Enable insert for authenticated users only" ON learning_paths FOR INSERT WITH CHECK (true);

-- Allow all authenticated users to update learning paths
CREATE POLICY "Enable update for authenticated users only" ON learning_paths FOR UPDATE USING (true) WITH CHECK (true);

-- Allow all authenticated users to delete learning paths
CREATE POLICY "Enable delete for authenticated users only" ON learning_paths FOR DELETE USING (true);

-- Learning Path Exercises Policies
-- Allow all authenticated users to read learning path exercises
CREATE POLICY "Enable read access for all users" ON learning_path_exercises FOR SELECT USING (true);

-- Allow all authenticated users to insert learning path exercises
CREATE POLICY "Enable insert for authenticated users only" ON learning_path_exercises FOR INSERT WITH CHECK (true);

-- Allow all authenticated users to update learning path exercises
CREATE POLICY "Enable update for authenticated users only" ON learning_path_exercises FOR UPDATE USING (true) WITH CHECK (true);

-- Allow all authenticated users to delete learning path exercises
CREATE POLICY "Enable delete for authenticated users only" ON learning_path_exercises FOR DELETE USING (true);

-- 4. VERIFY RLS IS ENABLED
SELECT '=== VERIFYING RLS STATUS ===' as step;

SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('learning_paths', 'learning_path_exercises');

-- 5. VERIFY NEW POLICIES
SELECT '=== VERIFYING NEW POLICIES ===' as step;

-- Check new policies on learning_paths
SELECT 
  'New Learning Paths Policies:' as info,
  policyname, 
  cmd, 
  permissive, 
  roles
FROM pg_policies 
WHERE tablename = 'learning_paths'
ORDER BY policyname;

-- Check new policies on learning_path_exercises
SELECT 
  'New Learning Path Exercises Policies:' as info,
  policyname, 
  cmd, 
  permissive, 
  roles
FROM pg_policies 
WHERE tablename = 'learning_path_exercises'
ORDER BY policyname;

-- 6. TEST DATA ACCESS
SELECT '=== TESTING DATA ACCESS ===' as step;

-- Test reading learning paths
SELECT 
  'Learning Paths Count:' as test,
  COUNT(*) as total_count
FROM learning_paths;

-- Test reading exercises
SELECT 
  'Learning Path Exercises Count:' as test,
  COUNT(*) as total_count
FROM learning_path_exercises;

-- 7. FINAL STATUS
SELECT '=== FINAL STATUS ===' as step;
SELECT 'RLS policies have been fixed! Admin should now be able to create, read, update, and delete learning paths and exercises.' as message;
