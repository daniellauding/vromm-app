-- =====================================================
-- QUICK TEST: Verify Delete Account Function Works
-- =====================================================
-- Run this to test if the function exists and works

-- 1. Check if function exists
SELECT 
  routine_name,
  routine_type,
  '✅ Function Exists' as status
FROM information_schema.routines 
WHERE routine_name = 'process_user_account_deletion'
AND routine_schema = 'public';

-- 2. Test the function with a simple call (dry run)
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID from your test
-- This will show what the function returns without actually deleting

SELECT process_user_account_deletion(
  'cbdef5cc-63fe-4b6a-a967-6e9e2ab7855c'::uuid,  -- Your test user ID
  false,  -- don't delete private routes
  false,  -- don't delete public routes
  false,  -- don't delete events
  false,  -- don't delete exercises
  false,  -- don't delete reviews
  NULL    -- don't transfer
);

-- 3. Check current account status
SELECT 
  id,
  full_name,
  email,
  account_status,
  updated_at
FROM profiles 
WHERE id = 'cbdef5cc-63fe-4b6a-a967-6e9e2ab7855c';
