-- CRITICAL FIXES FOR INVITATION SYSTEM
-- Run these in Supabase SQL Editor in order

-- ==============================================
-- 1. FIX DELETED USER ACCESS (HIGHEST PRIORITY)
-- ==============================================

-- First, check current deleted user
SELECT id, email, full_name, account_status, role 
FROM profiles 
WHERE account_status = 'deleted';

-- Fix RLS policy to properly block deleted users
DROP POLICY IF EXISTS "Deleted users cannot access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;

-- Create comprehensive RLS policy that blocks deleted users
CREATE POLICY "profiles_access_policy" ON public.profiles
FOR ALL USING (
  -- Allow public access to non-private, non-deleted profiles
  (private_profile = false AND account_status != 'deleted')
  OR
  -- Allow users to access their own profile ONLY if not deleted
  (auth.uid() = id AND account_status != 'deleted')
  OR
  -- Allow access to other profiles if the current user is not deleted
  (auth.uid() != id AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND account_status != 'deleted'
  ))
);

-- Also disable auth access for deleted users at the auth level
-- This requires updating the user in auth.users table
UPDATE auth.users 
SET email_confirmed_at = NULL,
    updated_at = NOW()
WHERE id IN (
  SELECT id FROM profiles WHERE account_status = 'deleted'
);

-- ==============================================
-- 2. FIX NOTIFICATIONS TABLE STRUCTURE
-- ==============================================

-- Add missing 'data' column to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add missing columns for enhanced notifications
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

-- Update notification types to include all needed types
DO $$
BEGIN
  -- Drop existing type if it exists
  DROP TYPE IF EXISTS notification_type CASCADE;
  
  -- Create comprehensive notification type enum
  CREATE TYPE notification_type AS ENUM (
    'route_reviewed',
    'route_driven', 
    'route_saved',
    'follow_new_route',
    'follow_drove_route', 
    'follow_saved_route',
    'new_follower',
    'new_message',
    'student_invitation',
    'supervisor_invitation',
    'school_invitation',
    'teacher_invitation',
    'admin_invitation',
    'event_invitation',
    'event_invite',
    'event_reminder',
    'event_updated',
    'route_liked',
    'route_completed',
    'exercise_completed',
    'learning_path_completed',
    'quiz_completed',
    'conversation_created',
    'message_received',
    'like',
    'follow',
    'user_follow'
  );
END $$;

-- Update the notifications table to use the enum (if not already)
-- Note: This might fail if there are existing notifications with different types
-- In that case, clean up the data first

-- ==============================================
-- 3. FIX INVITATION CREATION FUNCTION
-- ==============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate the user creation function with better error handling
DROP FUNCTION IF EXISTS create_invited_user_with_password(text, text, text, user_role, uuid);

CREATE OR REPLACE FUNCTION create_invited_user_with_password(
  p_email text,
  p_password text,
  p_full_name text,
  p_role user_role DEFAULT 'student',
  p_inviter_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
  result json;
  existing_user_id uuid;
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));
  
  -- Check if user already exists in auth.users
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE email = p_email;
  
  IF existing_user_id IS NOT NULL THEN
    -- User already exists in auth
    SELECT id INTO existing_user_id 
    FROM profiles 
    WHERE id = existing_user_id;
    
    IF existing_user_id IS NOT NULL THEN
      -- User exists in both auth and profiles
      RETURN json_build_object(
        'success', false,
        'error', 'User with email ' || p_email || ' already exists. Cannot create duplicate account.',
        'user_id', existing_user_id
      );
    ELSE
      -- User exists in auth but not in profiles - create profile
      INSERT INTO profiles (
        id, full_name, role, email, account_status, created_at, updated_at
      ) VALUES (
        existing_user_id, p_full_name, p_role, p_email, 'active', NOW(), NOW()
      );
      
      RETURN json_build_object(
        'success', true,
        'user_id', existing_user_id,
        'note', 'Profile created for existing auth user'
      );
    END IF;
  END IF;
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Create user in auth.users (simplified approach)
  -- Note: This requires proper auth setup and might need to be done via Supabase Admin API
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      raw_app_meta_data
    ) VALUES (
      new_user_id,
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      json_build_object('full_name', p_full_name, 'role', p_role),
      json_build_object('role', p_role)
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'duplicate key value violates unique constraint "users_email_partial_key"'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to create auth user: ' || SQLERRM
    );
  END;
  
  -- Create profile
  BEGIN
    INSERT INTO profiles (
      id, full_name, role, email, account_status, created_at, updated_at
    ) VALUES (
      new_user_id, p_full_name, p_role, p_email, 'active', NOW(), NOW()
    );
  EXCEPTION WHEN unique_violation THEN
    -- Clean up auth user if profile creation fails
    DELETE FROM auth.users WHERE id = new_user_id;
    RETURN json_build_object(
      'success', false,
      'error', 'duplicate key value violates unique constraint "profiles_pkey"'
    );
  WHEN OTHERS THEN
    -- Clean up auth user if profile creation fails
    DELETE FROM auth.users WHERE id = new_user_id;
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to create profile: ' || SQLERRM
    );
  END;
  
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id
  );
END;
$$;

-- ==============================================
-- 4. CREATE PROPER INVITATION NOTIFICATION FUNCTION
-- ==============================================

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
  notification_type_val notification_type;
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
    notification_type_val,
    'New Invitation',
    message_text,
    json_build_object(
      'invitation_type', p_invitation_type,
      'inviter_id', p_inviter_id,
      'inviter_name', p_inviter_name
    ),
    'vromm://notifications',
    'high',
    false,
    NOW(),
    NOW()
  );
END;
$$;

-- ==============================================
-- 5. CLEAN UP EXISTING DUPLICATE DATA
-- ==============================================

-- Remove duplicate pending invitations for the same email
DELETE FROM pending_invitations 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM pending_invitations 
  GROUP BY email, status
);

-- ==============================================
-- 6. VERIFICATION QUERIES
-- ==============================================

-- Verify fixes
SELECT 'Notifications table structure:' as check_type;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Deleted users:' as check_type;
SELECT id, email, account_status 
FROM profiles 
WHERE account_status = 'deleted';

SELECT 'Function exists:' as check_type;
SELECT proname 
FROM pg_proc 
WHERE proname = 'create_invited_user_with_password';

SELECT 'Extensions enabled:' as check_type;
SELECT extname 
FROM pg_extension 
WHERE extname = 'pgcrypto';
