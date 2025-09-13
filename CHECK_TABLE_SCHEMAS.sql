-- =====================================================
-- CHECK TABLE SCHEMAS FOR DELETE ACCOUNT FUNCTION
-- =====================================================
-- This will show us the actual column names in each table

-- 1. Check learning_path_exercise_completions table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'learning_path_exercise_completions'
ORDER BY ordinal_position;

-- 2. Check reviews table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'reviews'
ORDER BY ordinal_position;

-- 3. Check comments table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'comments'
ORDER BY ordinal_position;

-- 4. Check saved_routes table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'saved_routes'
ORDER BY ordinal_position;

-- 5. Check driven_routes table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'driven_routes'
ORDER BY ordinal_position;

-- 6. Check events table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

-- 7. Check routes table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'routes'
ORDER BY ordinal_position;
