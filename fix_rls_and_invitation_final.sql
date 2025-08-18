-- ================================
-- COMPLETE FIX FOR RLS AND INVITATIONS
-- ================================

-- 1. FIX RLS POLICY - CORRECT LOGIC TO BLOCK DELETED USERS
-- ================================
DROP POLICY IF EXISTS "Deleted users cannot access profiles" ON public.profiles;
CREATE POLICY "Deleted users cannot access profiles" 
ON public.profiles 
FOR ALL 
USING (
  -- Allow if user is not authenticated (public access)
  auth.uid() IS NULL 
  OR 
  -- Allow if it's not the user's own profile
  auth.uid() != id 
  OR 
  -- Allow if user is accessing their own profile AND they're not deleted
  (auth.uid() = id AND account_status != 'deleted')
);

-- 2. ENABLE REQUIRED EXTENSIONS
-- ================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. FIX SQL FUNCTION FOR USER CREATION
-- ================================
CREATE OR REPLACE FUNCTION public.create_invited_user_with_password(
  p_email text,
  p_password text,
  p_full_name text,
  p_role user_role default 'student',
  p_inviter_id uuid default null
) returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_user_id uuid;
  hashed_password text;
  result json;
  existing_auth_user_id uuid;
  existing_profile_id uuid;
begin
  -- Normalize email
  p_email := lower(trim(p_email));
  
  -- Check if user already exists in auth.users
  SELECT id INTO existing_auth_user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  -- Check if profile already exists
  SELECT id INTO existing_profile_id 
  FROM public.profiles 
  WHERE email = p_email;
  
  -- If either exists, return error
  IF existing_auth_user_id IS NOT NULL OR existing_profile_id IS NOT NULL THEN
    result := json_build_object(
      'success', false,
      'error', 'User with this email already exists',
      'auth_exists', existing_auth_user_id IS NOT NULL,
      'profile_exists', existing_profile_id IS NOT NULL
    );
    return result;
  END IF;
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Hash the password using pgcrypto
  hashed_password := crypt(p_password, gen_salt('bf', 10));
  
  -- Insert into auth.users first
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    hashed_password,
    now(), -- Mark as confirmed since email confirmation is disabled
    now(),
    now(),
    '',
    '',
    '',
    ''
  );
  
  -- Insert into profiles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    location,
    experience_level,
    private_profile,
    onboarding_completed,
    license_plan_completed,
    role_confirmed,
    is_trusted,
    account_status,
    organization_number,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_full_name,
    p_role,
    'Not specified',
    'beginner',
    false,
    false,
    false,
    false,
    false, -- New invited users are not trusted
    'active',
    CASE WHEN p_role = 'school' THEN '000000-0000' ELSE NULL END,
    now(),
    now()
  );
  
  -- Return success with user details
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', p_email,
    'message', 'User created successfully with custom password'
  );
  
  return result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error information
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'detail', CASE 
        WHEN SQLSTATE = '23505' THEN 'Duplicate key constraint violation'
        WHEN SQLSTATE = '23503' THEN 'Foreign key constraint violation'
        WHEN SQLSTATE = '23514' THEN 'Check constraint violation'
        ELSE 'Database error'
      END
    );
    return result;
END;
$$;

-- 4. CLEANUP FUNCTION - Remove duplicate or orphaned records
-- ================================
CREATE OR REPLACE FUNCTION public.cleanup_user_duplicates(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  auth_count int;
  profile_count int;
BEGIN
  p_email := lower(trim(p_email));
  
  -- Count existing records
  SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = p_email;
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE email = p_email;
  
  -- If we have orphaned records, clean them up
  IF auth_count > 0 AND profile_count = 0 THEN
    -- Have auth user but no profile - remove auth user
    DELETE FROM auth.users WHERE email = p_email;
    result := json_build_object(
      'success', true,
      'action', 'removed_orphaned_auth_user',
      'email', p_email
    );
  ELSIF auth_count = 0 AND profile_count > 0 THEN
    -- Have profile but no auth user - remove profile
    DELETE FROM public.profiles WHERE email = p_email;
    result := json_build_object(
      'success', true,
      'action', 'removed_orphaned_profile',
      'email', p_email
    );
  ELSIF auth_count > 0 AND profile_count > 0 THEN
    result := json_build_object(
      'success', false,
      'error', 'Complete user exists - cannot cleanup',
      'auth_count', auth_count,
      'profile_count', profile_count
    );
  ELSE
    result := json_build_object(
      'success', true,
      'action', 'no_cleanup_needed',
      'email', p_email
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 5. TEST QUERIES
-- ================================

-- Test RLS policy (replace with actual deleted user ID)
-- This should return 0 rows when run as the deleted user
/*
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "90311cc2-0451-44f4-a5ed-a54d484603fe"}';
SELECT * FROM public.profiles WHERE id = '90311cc2-0451-44f4-a5ed-a54d484603fe';
RESET ROLE;
RESET request.jwt.claims;
*/

-- Test user creation
/*
SELECT public.create_invited_user_with_password(
  'test@example.com',
  'TestPassword123!',
  'Test User',
  'student',
  NULL
);
*/

-- Cleanup duplicates if needed
/*
SELECT public.cleanup_user_duplicates('daniel+bjuderindenna@lauding.se');
*/
