-- Fix users with null emails in profiles table
-- This script updates profiles that have null emails with the email from auth.users

-- First, let's see how many profiles have null emails
SELECT 
  COUNT(*) as profiles_with_null_email,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as null_email_count
FROM profiles;

-- Update profiles with null emails using the email from auth.users
UPDATE profiles 
SET email = auth_users.email
FROM auth.users as auth_users
WHERE profiles.id = auth_users.id 
  AND profiles.email IS NULL 
  AND auth_users.email IS NOT NULL;

-- Verify the fix
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as still_null_emails,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email
FROM profiles;

-- Show some examples of fixed profiles
SELECT 
  id, 
  email, 
  full_name, 
  created_at
FROM profiles 
WHERE email IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
