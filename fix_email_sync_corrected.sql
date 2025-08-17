-- CORRECTED: Fix users with missing emails
-- The previous query had incorrect JOIN syntax

-- First, let's see what we're dealing with
SELECT 
  p.id,
  p.full_name,
  p.email as profile_email,
  au.email as auth_email,
  p.role
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.email IS NULL
ORDER BY p.created_at DESC;

-- Now fix the missing emails by copying from auth.users
UPDATE profiles 
SET email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE profiles.id = au.id 
  AND profiles.email IS NULL 
  AND au.email IS NOT NULL;

-- Check specific users mentioned in the error
SELECT 
  p.id,
  p.full_name,
  p.email as profile_email,
  au.email as auth_email,
  p.role
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.id IN (
  'c16a364f-3bc4-4d60-bca9-460e977fddea',  -- daniel+student
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa'   -- daniel+handledare
);

-- If auth.users also has null emails, we need to check why
-- This query will show if the issue is in auth.users table too
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE id IN (
  'c16a364f-3bc4-4d60-bca9-460e977fddea',
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
);
