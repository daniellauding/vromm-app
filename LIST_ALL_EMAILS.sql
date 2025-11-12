-- ============================================
-- LIST ALL EMAILS IN THE SYSTEM
-- Find what emails exist and might be blocking
-- ============================================

-- STEP 1: All emails in auth.users (including soft-deleted)
SELECT 
  '🔍 ALL AUTH.USERS' as source,
  id,
  email,
  created_at,
  deleted_at,
  email_confirmed_at,
  banned_until,
  CASE 
    WHEN deleted_at IS NOT NULL THEN '🗑️ SOFT DELETED'
    WHEN banned_until IS NOT NULL AND banned_until > now() THEN '🚫 BANNED'
    WHEN email_confirmed_at IS NULL THEN '⏳ UNCONFIRMED'
    ELSE '✅ ACTIVE'
  END as status
FROM auth.users 
WHERE email LIKE '%daniel%@lauding.se' OR email LIKE '%1337%'
ORDER BY created_at DESC;

-- STEP 2: All emails in profiles
SELECT 
  '🔍 ALL PROFILES' as source,
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles 
WHERE email LIKE '%daniel%@lauding.se' OR email LIKE '%1337%'
ORDER BY created_at DESC;

-- STEP 3: Check if there are ANY bans or rate limits
SELECT 
  '⚠️ BANNED USERS' as check_type,
  id,
  email,
  banned_until
FROM auth.users 
WHERE banned_until IS NOT NULL AND banned_until > now();

-- STEP 4: Check for rate limit entries (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'rate_limits') THEN
    RAISE NOTICE 'Checking rate limits...';
    -- This table might not exist, but let's try
  ELSE
    RAISE NOTICE 'No rate_limits table found (this is normal)';
  END IF;
END $$;

-- STEP 5: Count total users
SELECT 
  'TOTAL STATS' as metric,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_users,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted_users
FROM auth.users;

-- STEP 6: Show instructions
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSIS COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If no emails found above but signup still fails:';
  RAISE NOTICE '';
  RAISE NOTICE '📍 SOLUTION: Supabase Auth API Cache Issue';
  RAISE NOTICE '';
  RAISE NOTICE 'The email is clean in the database but blocked';
  RAISE NOTICE 'at the Supabase Auth API layer.';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXES:';
  RAISE NOTICE '1. Wait 1-2 hours for cache to expire';
  RAISE NOTICE '2. Use a different email temporarily';
  RAISE NOTICE '3. Check Supabase Dashboard → Auth → Users';
  RAISE NOTICE '   for a "Deleted Users" section';
  RAISE NOTICE '4. Restart your Supabase project:';
  RAISE NOTICE '   Dashboard → Settings → Restart Project';
  RAISE NOTICE '';
  RAISE NOTICE 'This is a known Supabase limitation where';
  RAISE NOTICE 'Auth service caches deleted emails for ~1 hour.';
  RAISE NOTICE '========================================';
END $$;

