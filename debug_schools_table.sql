-- DEBUG SCHOOLS TABLE
-- Run this in Supabase SQL editor to check what's happening

-- 1. Check if schools table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'schools'
) as schools_table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'schools' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Count total schools
SELECT COUNT(*) as total_schools FROM public.schools;

-- 4. Show all schools data
SELECT 
  id, 
  name, 
  location, 
  is_active,
  pg_typeof(is_active) as is_active_type,
  created_at,
  updated_at
FROM public.schools 
ORDER BY name;

-- 5. Check is_active values
SELECT 
  is_active,
  pg_typeof(is_active) as type,
  COUNT(*) as count
FROM public.schools 
GROUP BY is_active, pg_typeof(is_active);

-- 6. Check RLS policies on schools table
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
WHERE tablename = 'schools';

-- 7. Test the exact query the app is using
SELECT id, name, location, is_active
FROM public.schools
ORDER BY name;

-- 8. Check permissions
SELECT has_table_privilege('authenticated', 'public.schools', 'SELECT') as can_select_schools;

SELECT 'Debug complete! Check the results above.' as status; 