-- COMPREHENSIVE FIX FOR NULL EMAILS
-- This will fix all users with null emails by copying from auth.users or generating from names

-- Step 1: Copy emails from auth.users to profiles where missing
UPDATE profiles 
SET email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE profiles.id = au.id 
  AND profiles.email IS NULL 
  AND au.email IS NOT NULL;

-- Step 2: For users still with null emails, try to extract from full_name
-- Handle "daniel+something" pattern -> "daniel+something@lauding.se"
UPDATE profiles 
SET email = CASE 
  -- If name starts with "daniel+" add @lauding.se
  WHEN full_name ILIKE 'daniel+%' THEN 
    LOWER(REPLACE(full_name, ' ', '')) || '@lauding.se'
  -- If name contains "daniel+" extract it and add @lauding.se  
  WHEN full_name ILIKE '%daniel+%' THEN 
    LOWER(REGEXP_REPLACE(full_name, '.*(daniel\+[a-zA-Z0-9]+).*', '\1', 'i')) || '@lauding.se'
  -- If name looks like an email pattern (contains @ or looks like username)
  WHEN full_name ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN 
    LOWER(full_name)
  -- If name looks like a username (alphanumeric + special chars), add @lauding.se
  WHEN full_name ~ '^[a-zA-Z0-9+._-]+$' THEN 
    LOWER(full_name) || '@lauding.se'
  -- Default: create email from name
  ELSE 
    LOWER(REPLACE(REPLACE(full_name, ' ', '.'), '''', '')) || '@generated.local'
END,
updated_at = NOW()
WHERE email IS NULL 
  AND full_name IS NOT NULL 
  AND full_name != '';

-- Step 3: Handle users with completely empty names
UPDATE profiles 
SET email = 'user.' || LOWER(SUBSTRING(id::text, 1, 8)) || '@generated.local',
    full_name = COALESCE(NULLIF(full_name, ''), 'User ' || SUBSTRING(id::text, 1, 8)),
    updated_at = NOW()
WHERE email IS NULL;

-- Step 4: Verification queries
-- Show what we fixed
SELECT 
  'Fixed emails' as status,
  COUNT(*) as count
FROM profiles 
WHERE email IS NOT NULL;

-- Show any remaining null emails (should be 0)
SELECT 
  'Remaining null emails' as status,
  COUNT(*) as count
FROM profiles 
WHERE email IS NULL;

-- Show specific users that were mentioned in the error
SELECT 
  id,
  full_name,
  email,
  role,
  'After fix' as status
FROM profiles 
WHERE id IN (
  'c16a364f-3bc4-4d60-bca9-460e977fddea',  -- daniel+student
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa'   -- daniel+handledare
);

-- Show all daniel+ users to verify the pattern worked
SELECT 
  id,
  full_name,
  email,
  role,
  'Daniel users' as category
FROM profiles 
WHERE full_name ILIKE '%daniel%' 
  OR email ILIKE '%daniel%'
ORDER BY created_at;

-- Final verification: Show users who might still need manual fixing
SELECT 
  id,
  full_name,
  email,
  role,
  'Needs review' as status
FROM profiles 
WHERE email LIKE '%@generated.local'
  OR email IS NULL
  OR full_name IS NULL
  OR full_name = '';
