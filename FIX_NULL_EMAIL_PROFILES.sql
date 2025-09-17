-- FIX: Update profiles with NULL email fields
-- This script will populate missing email fields in profiles table

-- 1. Check how many profiles have NULL email
SELECT 
    COUNT(*) as total_profiles,
    COUNT(email) as profiles_with_email,
    COUNT(*) - COUNT(email) as profiles_with_null_email
FROM public.profiles;

-- 2. Update profiles with NULL email using auth.users data
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users as auth_users
WHERE public.profiles.id = auth_users.id 
AND public.profiles.email IS NULL 
AND auth_users.email IS NOT NULL;

-- 3. Check the results
SELECT 
    COUNT(*) as total_profiles,
    COUNT(email) as profiles_with_email,
    COUNT(*) - COUNT(email) as profiles_with_null_email
FROM public.profiles;

-- 4. Show any remaining profiles with NULL email (if any)
SELECT 
    id,
    full_name,
    email,
    created_at
FROM public.profiles 
WHERE email IS NULL;
