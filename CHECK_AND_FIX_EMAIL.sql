-- ============================================
-- AUTOMATIC EMAIL CLEANUP - FINDS ALL PROBLEMATIC EMAILS
-- Use this to free up ALL blocked emails for re-registration
-- ============================================

-- STEP 1: Find all orphaned auth.users (users without profiles)
-- These are blocking re-registration!
SELECT 
  '🔍 ORPHANED AUTH RECORDS (blocking re-registration)' as status,
  u.id, 
  u.email, 
  u.created_at,
  u.is_sso_user
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- STEP 2: Find all orphaned profiles (profiles without auth)
SELECT 
  '🔍 ORPHANED PROFILES (shouldn''t exist)' as status,
  p.id, 
  p.email, 
  p.full_name,
  p.created_at
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL
ORDER BY p.created_at DESC;

-- STEP 3: AUTOMATIC CLEANUP - Delete all orphaned records
DO $$
DECLARE
  user_record RECORD;
  profile_record RECORD;
  auth_count INTEGER := 0;
  profile_count INTEGER := 0;
  total_freed INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 SCANNING FOR ORPHANED RECORDS...';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Clean up orphaned auth.users (no matching profile)
  FOR user_record IN 
    SELECT u.id, u.email 
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    RAISE NOTICE '🗑️  Deleting orphaned auth record: % (%)', user_record.email, user_record.id;
    
    -- Use safe delete function to clean everything
    PERFORM safe_delete_user(user_record.id);
    
    auth_count := auth_count + 1;
    RAISE NOTICE '   ✅ Email freed: %', user_record.email;
  END LOOP;
  
  -- Clean up orphaned profiles (no matching auth)
  FOR profile_record IN 
    SELECT p.id, p.email, p.full_name
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE u.id IS NULL
  LOOP
    RAISE NOTICE '🗑️  Deleting orphaned profile: % - % (%)', 
      profile_record.full_name, profile_record.email, profile_record.id;
    
    -- Temporarily disable triggers to avoid cascade issues
    SET LOCAL session_replication_role = replica;
    DELETE FROM public.profiles WHERE id = profile_record.id;
    SET LOCAL session_replication_role = DEFAULT;
    
    profile_count := profile_count + 1;
    RAISE NOTICE '   ✅ Profile cleaned: %', profile_record.email;
  END LOOP;
  
  total_freed := auth_count + profile_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AUTOMATIC CLEANUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Orphaned auth records deleted: %', auth_count;
  RAISE NOTICE 'Orphaned profiles deleted: %', profile_count;
  RAISE NOTICE 'Total emails freed: %', total_freed;
  RAISE NOTICE '';
  
  IF total_freed = 0 THEN
    RAISE NOTICE '✨ Database is clean! No orphaned records found.';
  ELSE
    RAISE NOTICE '🎉 % email(s) can now be used for signup!', total_freed;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- STEP 4: Verify cleanup - should show 0 orphaned records
SELECT 
  '✅ VERIFICATION - Orphaned Auth Records' as check_type,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
UNION ALL
SELECT 
  '✅ VERIFICATION - Orphaned Profiles' as check_type,
  COUNT(*) as count
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;

-- STEP 5: Optional - Check specific email pattern (like daniel+%@lauding.se)
-- Uncomment and modify if you want to see specific pattern:
/*
SELECT 
  'All emails matching pattern' as status,
  u.id,
  u.email,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ Has profile (OK)'
    ELSE '❌ No profile (BLOCKING)'
  END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE 'daniel+%@lauding.se'
ORDER BY u.created_at DESC;
*/

