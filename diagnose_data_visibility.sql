-- Diagnose why learning paths and exercises exist in database but not visible in admin/app

-- 1. Check if learning paths exist and their status
SELECT 
  'Learning Paths Count' as check_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN active = true THEN 1 END) as active_count,
  COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_count
FROM learning_paths;

-- 2. Check learning path exercises
SELECT 
  'Learning Path Exercises Count' as check_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_count
FROM learning_path_exercises;

-- 3. Check RLS policies on learning_paths table
SELECT 
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

-- 4. Check RLS policies on learning_path_exercises table  
SELECT 
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

-- 5. Check if RLS is enabled on these tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('learning_paths', 'learning_path_exercises');

-- 6. Show sample learning paths data
SELECT 
  'Sample Learning Paths' as info,
  id, 
  title->>'en' as title_en,
  active,
  is_featured,
  created_at
FROM learning_paths 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Show sample exercises data
SELECT 
  'Sample Exercises' as info,
  lpe.id,
  lpe.title->>'en' as exercise_title,
  lp.title->>'en' as path_title,
  lpe.is_featured
FROM learning_path_exercises lpe
JOIN learning_paths lp ON lpe.learning_path_id = lp.id
ORDER BY lpe.created_at DESC 
LIMIT 5;
