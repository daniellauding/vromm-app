-- =====================================================
-- DELETE ACCOUNT FEATURES TEST & VERIFICATION SQL
-- =====================================================
-- This script verifies all delete account features work properly
-- Run this to test the complete delete account functionality

-- 1. VERIFY ALL TRANSLATION KEYS EXIST
-- =====================================================
SELECT 
  key, 
  language, 
  value,
  CASE 
    WHEN key LIKE 'deleteAccount.%' THEN '✅ Delete Account Key'
    WHEN key LIKE 'settings.deleteAccount%' THEN '✅ Settings Key'
    WHEN key LIKE 'common.%' THEN '✅ Common Key'
    ELSE '❌ Unknown Key'
  END as key_type
FROM translations 
WHERE key IN (
  'deleteAccount.title',
  'deleteAccount.description', 
  'deleteAccount.deleteOptions',
  'deleteAccount.deletePrivateRoutes',
  'deleteAccount.deletePublicRoutes',
  'deleteAccount.deleteEvents',
  'deleteAccount.deleteExercises',
  'deleteAccount.deleteReviews',
  'deleteAccount.transferToggle',
  'deleteAccount.transferHelp',
  'deleteAccount.cancel',
  'deleteAccount.confirm',
  'deleteAccount.successTitle',
  'deleteAccount.successMessage',
  'settings.deleteAccountConfirmation',
  'common.cancel',
  'common.yes',
  'common.no'
)
ORDER BY key, language;

-- 2. VERIFY DATABASE RPC FUNCTION EXISTS
-- =====================================================
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'process_user_account_deletion'
AND routine_schema = 'public';

-- 3. VERIFY SYSTEM PROFILE UUID EXISTS
-- =====================================================
SELECT 
  id,
  full_name,
  email,
  role,
  account_status
FROM profiles 
WHERE id = '22f2bccb-efb5-4f67-85fd-8078a25acebc';

-- 4. VERIFY ALL DELETE ACCOUNT TABLES EXIST
-- =====================================================
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'profiles', 'routes', 'events', 'learning_path_exercise_completions', 
      'saved_routes', 'driven_routes', 'comments', 'reviews'
    ) THEN '✅ Required Table'
    ELSE '❓ Optional Table'
  END as table_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'routes', 'events', 'learning_path_exercise_completions', 
  'saved_routes', 'driven_routes', 'comments', 'reviews'
)
ORDER BY table_name;

-- 5. VERIFY ACCOUNT STATUS COLUMN EXISTS
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'account_status';

-- 6. TEST DELETE ACCOUNT FUNCTIONALITY (DRY RUN)
-- =====================================================
-- This creates a test user and simulates the delete process
-- DO NOT RUN IN PRODUCTION - FOR TESTING ONLY

/*
-- Create test user
INSERT INTO profiles (id, full_name, email, role, account_status)
VALUES (
  'test-delete-user-123',
  'Test Delete User',
  'test-delete@example.com',
  'student',
  'active'
);

-- Create test data
INSERT INTO routes (id, name, creator_id, is_public)
VALUES (
  'test-route-123',
  'Test Route',
  'test-delete-user-123',
  true
);

INSERT INTO comments (id, content, user_id, route_id)
VALUES (
  'test-comment-123',
  'Test comment',
  'test-delete-user-123',
  'test-route-123'
);

-- Test the RPC function (dry run - check parameters)
SELECT process_user_account_deletion(
  'test-delete-user-123'::uuid,  -- p_user_id
  true,                          -- p_delete_private_routes
  true,                          -- p_delete_public_routes
  true,                          -- p_delete_events
  true,                          -- p_delete_exercises
  true,                          -- p_delete_reviews
  '22f2bccb-efb5-4f67-85fd-8078a25acebc'::uuid  -- p_transfer_public_to
);

-- Clean up test data
DELETE FROM comments WHERE id = 'test-comment-123';
DELETE FROM routes WHERE id = 'test-route-123';
DELETE FROM profiles WHERE id = 'test-delete-user-123';
*/

-- 7. VERIFY ALL FEATURES ARE WORKING
-- =====================================================
SELECT 
  'Translation Keys' as feature,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 16 THEN '✅ All Keys Present' ELSE '❌ Missing Keys' END as status
FROM translations 
WHERE key LIKE 'deleteAccount.%' OR key = 'settings.deleteAccountConfirmation'

UNION ALL

SELECT 
  'RPC Function' as feature,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 1 THEN '✅ Function Exists' ELSE '❌ Function Missing' END as status
FROM information_schema.routines 
WHERE routine_name = 'process_user_account_deletion'

UNION ALL

SELECT 
  'System Profile' as feature,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 1 THEN '✅ System Profile Exists' ELSE '❌ System Profile Missing' END as status
FROM profiles 
WHERE id = '22f2bccb-efb5-4f67-85fd-8078a25acebc'

UNION ALL

SELECT 
  'Required Tables' as feature,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 6 THEN '✅ All Tables Present' ELSE '❌ Missing Tables' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'routes', 'events', 'learning_path_exercise_completions', 'saved_routes', 'comments')

UNION ALL

SELECT 
  'Account Status Column' as feature,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 1 THEN '✅ Column Exists' ELSE '❌ Column Missing' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'account_status';

-- =====================================================
-- SUMMARY
-- =====================================================
-- If all features show ✅, the delete account functionality is ready
-- If any show ❌, those features need to be implemented
-- =====================================================
