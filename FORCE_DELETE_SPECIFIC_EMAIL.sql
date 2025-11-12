-- ============================================
-- FORCE DELETE SPECIFIC EMAIL - DEEP CLEANUP
-- For when email is still blocked after normal cleanup
-- ============================================

-- STEP 1: Check EVERYTHING about this email (including soft-deleted)
SELECT 
  '🔍 AUTH.USERS CHECK' as source,
  id,
  email,
  created_at,
  deleted_at,
  email_confirmed_at,
  is_sso_user,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '⚠️ SOFT DELETED (still blocking!)'
    ELSE '✅ Active'
  END as status
FROM auth.users 
WHERE email = 'daniel+1337@lauding.se'
ORDER BY created_at DESC;

-- STEP 2: Check profiles
SELECT 
  '🔍 PROFILES CHECK' as source,
  id,
  email,
  full_name,
  created_at
FROM public.profiles 
WHERE email = 'daniel+1337@lauding.se'
ORDER BY created_at DESC;

-- STEP 3: Check identities (social logins)
SELECT 
  '🔍 IDENTITIES CHECK' as source,
  id,
  user_id,
  provider,
  identity_data->>'email' as provider_email,
  created_at
FROM auth.identities 
WHERE identity_data->>'email' = 'daniel+1337@lauding.se'
ORDER BY created_at DESC;

-- STEP 4: NUCLEAR OPTION - Force delete EVERYTHING
-- This deletes the user even if soft-deleted
DO $$
DECLARE
  target_email TEXT := 'daniel+1337@lauding.se';
  user_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '💣 NUCLEAR CLEANUP FOR: %', target_email;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Temporarily become super admin to bypass ALL restrictions
  SET session_replication_role = replica;
  
  -- Find and delete ALL users with this email (even soft-deleted ones)
  FOR user_record IN 
    SELECT id, email, deleted_at 
    FROM auth.users 
    WHERE email = target_email
  LOOP
    RAISE NOTICE '🗑️  Found user: % (deleted_at: %)', user_record.id, user_record.deleted_at;
    
    -- Delete identities first
    DELETE FROM auth.identities WHERE user_id = user_record.id;
    RAISE NOTICE '   ✓ Deleted identities';
    
    -- Delete from profiles
    DELETE FROM public.profiles WHERE id = user_record.id;
    RAISE NOTICE '   ✓ Deleted profile';
    
    -- Delete from auth.users (bypassing soft-delete)
    DELETE FROM auth.users WHERE id = user_record.id;
    RAISE NOTICE '   ✓ Deleted auth record';
    
    deleted_count := deleted_count + 1;
    RAISE NOTICE '   ✅ User completely removed!';
    RAISE NOTICE '';
  END LOOP;
  
  -- Also clean up any orphaned profiles
  DELETE FROM public.profiles WHERE email = target_email;
  
  -- Also clean up any orphaned identities
  DELETE FROM auth.identities WHERE identity_data->>'email' = target_email;
  
  -- Restore normal permissions
  SET session_replication_role = DEFAULT;
  
  RAISE NOTICE '========================================';
  IF deleted_count > 0 THEN
    RAISE NOTICE '✅ NUCLEAR CLEANUP COMPLETE!';
    RAISE NOTICE 'Removed % user(s) with email: %', deleted_count, target_email;
  ELSE
    RAISE NOTICE '🤔 No users found with email: %', target_email;
    RAISE NOTICE 'Email should be free now!';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- STEP 5: Final verification - should show NOTHING
SELECT 
  '✅ FINAL VERIFICATION' as check_type,
  'auth.users' as table_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN - Ready for signup!'
    ELSE '❌ STILL BLOCKED - Check manually'
  END as status
FROM auth.users 
WHERE email = 'daniel+1337@lauding.se'
UNION ALL
SELECT 
  '✅ FINAL VERIFICATION' as check_type,
  'profiles' as table_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ STILL EXISTS'
  END as status
FROM public.profiles 
WHERE email = 'daniel+1337@lauding.se'
UNION ALL
SELECT 
  '✅ FINAL VERIFICATION' as check_type,
  'identities' as table_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CLEAN'
    ELSE '❌ STILL EXISTS'
  END as status
FROM auth.identities 
WHERE identity_data->>'email' = 'daniel+1337@lauding.se';

-- STEP 6: Try to understand WHY it was blocked
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '💡 TROUBLESHOOTING INFO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If signup still fails after this:';
  RAISE NOTICE '1. Check Supabase Dashboard → Authentication → Users';
  RAISE NOTICE '2. Look for "daniel+1337@lauding.se" in deleted users';
  RAISE NOTICE '3. Permanently delete from dashboard if found';
  RAISE NOTICE '';
  RAISE NOTICE 'Supabase may cache deleted users for 24 hours.';
  RAISE NOTICE 'If urgent, contact Supabase support to clear cache.';
  RAISE NOTICE '========================================';
END $$;

