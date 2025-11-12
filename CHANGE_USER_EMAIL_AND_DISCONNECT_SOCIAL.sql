-- ============================================
-- CHANGE USER EMAIL AND DISCONNECT SOCIAL PROVIDERS
-- User ID: 5ee16b4f-5ef9-41bd-b571-a9dc895027c1
-- ============================================

-- STEP 1: Check current user state
SELECT 
  'CURRENT STATE' as status,
  id,
  email,
  created_at,
  is_sso_user,
  phone
FROM auth.users 
WHERE id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- STEP 2: Check current social identities
SELECT 
  'SOCIAL IDENTITIES' as status,
  id,
  user_id,
  provider,
  identity_data->>'email' as provider_email,
  created_at
FROM auth.identities
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- STEP 3: Check current profile
SELECT 
  'PROFILE' as status,
  id,
  email,
  full_name,
  role
FROM public.profiles
WHERE id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- ============================================
-- EXECUTE CHANGES
-- ============================================

DO $$
DECLARE
  target_user_id UUID := '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';
  new_email TEXT := 'NEW_EMAIL@example.com';  -- CHANGE THIS TO THE NEW EMAIL!
  social_count INTEGER;
BEGIN
  -- Step 1: Remove all social identities (Facebook, Google, Apple)
  DELETE FROM auth.identities 
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS social_count = ROW_COUNT;
  RAISE NOTICE '🔓 Disconnected % social provider(s)', social_count;
  
  -- Step 2: Update email in auth.users
  UPDATE auth.users 
  SET 
    email = new_email,
    email_confirmed_at = now(),  -- Auto-confirm the new email
    is_sso_user = false,         -- Mark as non-SSO user
    updated_at = now()
  WHERE id = target_user_id;
  
  RAISE NOTICE '📧 Updated auth.users email to: %', new_email;
  
  -- Step 3: Update email in profiles
  UPDATE public.profiles 
  SET 
    email = new_email,
    updated_at = now()
  WHERE id = target_user_id;
  
  RAISE NOTICE '👤 Updated profile email to: %', new_email;
  
  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ EMAIL & SOCIAL DISCONNECT COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', target_user_id;
  RAISE NOTICE 'New Email: %', new_email;
  RAISE NOTICE 'Social providers removed: %', social_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  USER MUST SET A NEW PASSWORD!';
  RAISE NOTICE 'Use the "Reset Password" feature with the new email.';
  RAISE NOTICE '========================================';
END $$;

-- STEP 4: Verify changes
SELECT 
  '✅ FINAL STATE' as status,
  u.id,
  u.email,
  u.is_sso_user,
  p.email as profile_email,
  (SELECT COUNT(*) FROM auth.identities WHERE user_id = u.id) as social_providers_count
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

