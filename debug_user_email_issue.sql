-- Debug why users have null email addresses
-- Run these queries in Supabase SQL Editor

-- 1. Check users with null emails
SELECT id, full_name, email, role, account_status, created_at
FROM profiles 
WHERE email IS NULL 
ORDER BY created_at DESC;

-- 2. Check if auth.users has emails for these profiles
SELECT 
  p.id,
  p.full_name,
  p.email as profile_email,
  au.email as auth_email,
  p.role,
  p.account_status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.email IS NULL
ORDER BY p.created_at DESC;

-- 3. Fix profiles with missing emails by copying from auth.users
UPDATE profiles 
SET email = auth_users.email,
    updated_at = NOW()
FROM auth.users 
WHERE profiles.id = auth_users.id 
  AND profiles.email IS NULL 
  AND auth_users.email IS NOT NULL;

-- 4. Check the specific user mentioned in the error
SELECT id, full_name, email, role, account_status
FROM profiles 
WHERE id = 'c16a364f-3bc4-4d60-bca9-460e977fddea';

-- 5. Check auth.users for the same user
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE id = 'c16a364f-3bc4-4d60-bca9-460e977fddea';

-- 6. If needed, manually fix this specific user
UPDATE profiles 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND email IS NULL;
