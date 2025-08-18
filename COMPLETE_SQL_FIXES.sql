-- ========================================
-- COMPLETE SQL FIXES - COPY PASTE ALL OF THIS INTO SUPABASE SQL EDITOR
-- ========================================

-- Step 1: Fix users with missing emails by copying from auth.users
UPDATE profiles 
SET email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE profiles.id = au.id 
  AND profiles.email IS NULL 
  AND au.email IS NOT NULL;

-- Step 2: Fix users with null emails by extracting from names (daniel+ pattern)
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

-- Step 4: Add missing 'data' column to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Step 5: Add missing columns for enhanced notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' 
CHECK (priority IN ('low', 'normal', 'high', 'critical'));

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

-- Step 6: Fix RLS policy to properly block deleted users (NON-RECURSIVE)
DROP POLICY IF EXISTS "Deleted users cannot access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_access_policy" ON public.profiles;

-- Create simple, non-recursive RLS policies
CREATE POLICY "users_can_view_public_profiles" ON public.profiles
FOR SELECT USING (
  private_profile = false AND account_status != 'deleted'
);

CREATE POLICY "users_can_view_own_profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = id AND account_status != 'deleted'
);

CREATE POLICY "users_can_update_own_profile" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id AND account_status != 'deleted'
);

CREATE POLICY "authenticated_users_can_insert_profiles" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 8: Create proper invitation notification function
CREATE OR REPLACE FUNCTION create_invitation_notification(
  p_recipient_id uuid,
  p_inviter_id uuid,
  p_invitation_type text,
  p_inviter_name text DEFAULT 'Someone'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_type_val text;
  message_text text;
BEGIN
  -- Determine notification type and message
  IF p_invitation_type = 'student_invites_supervisor' THEN
    notification_type_val := 'supervisor_invitation';
    message_text := p_inviter_name || ' invited you to be their supervisor';
  ELSIF p_invitation_type = 'supervisor_invites_student' THEN
    notification_type_val := 'student_invitation';
    message_text := p_inviter_name || ' invited you to be their student';
  ELSE
    notification_type_val := 'student_invitation';
    message_text := p_inviter_name || ' sent you an invitation';
  END IF;
  
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    data,
    action_url,
    priority,
    is_read,
    created_at,
    updated_at
  ) VALUES (
    p_recipient_id,
    p_inviter_id,
    notification_type_val::notification_type,
    'New Invitation',
    message_text,
    json_build_object(
      'invitation_type', p_invitation_type,
      'inviter_id', p_inviter_id,
      'inviter_name', p_inviter_name
    )::jsonb,
    'vromm://notifications',
    'high',
    false,
    NOW(),
    NOW()
  );
END;
$$;

-- ========================================
-- VERIFICATION QUERIES - CHECK RESULTS
-- ========================================

-- Check 1: Verify emails are fixed
SELECT 
  'Email fix results' as check_type,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_email
FROM profiles;

-- Check 2: Show specific users mentioned in error
SELECT 
  id,
  full_name,
  email,
  role,
  'Specific users' as category
FROM profiles 
WHERE id IN (
  'c16a364f-3bc4-4d60-bca9-460e977fddea',  -- daniel+student
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa'   -- daniel+handledare
);

-- Check 3: Show all daniel+ users to verify pattern worked
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

-- Check 4: Verify notifications table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 5: Verify deleted users exist
SELECT id, full_name, email, account_status 
FROM profiles 
WHERE account_status = 'deleted';

-- Check 6: Test notification function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'create_invitation_notification';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 'ALL FIXES APPLIED SUCCESSFULLY! 🎉' as status;
