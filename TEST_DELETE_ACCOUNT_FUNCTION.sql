-- =====================================================
-- TEST DELETE ACCOUNT FUNCTION
-- =====================================================
-- Run this AFTER creating the function to test it works

-- 1. Check if function exists
SELECT 
  routine_name,
  routine_type,
  '✅ Function Exists' as status
FROM information_schema.routines 
WHERE routine_name = 'process_user_account_deletion'
AND routine_schema = 'public';

-- 2. Check system profile exists
SELECT 
  id,
  full_name,
  email,
  '✅ System Profile Exists' as status
FROM profiles 
WHERE id = '22f2bccb-efb5-4f67-85fd-8078a25acebc';

-- 3. Test with a real user (REPLACE WITH ACTUAL USER ID)
-- WARNING: This will actually delete the user!
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID you want to test

/*
SELECT process_user_account_deletion(
  'YOUR_USER_ID_HERE'::uuid,  -- Replace with actual user ID
  true,   -- delete private routes
  true,   -- delete public routes
  true,   -- delete events
  true,   -- delete exercises
  true,   -- delete reviews
  '22f2bccb-efb5-4f67-85fd-8078a25acebc'::uuid  -- transfer to system
);
*/

-- 4. Check account status after deletion
-- Replace 'YOUR_USER_ID_HERE' with the actual user ID
/*
SELECT 
  id,
  full_name,
  email,
  account_status,
  updated_at
FROM profiles 
WHERE id = 'YOUR_USER_ID_HERE';
*/
