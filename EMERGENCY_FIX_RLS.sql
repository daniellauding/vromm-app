-- ========================================
-- EMERGENCY FIX - RLS INFINITE RECURSION
-- RUN THIS IMMEDIATELY IN SUPABASE SQL EDITOR
-- ========================================

-- Drop the problematic RLS policy causing infinite recursion
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

-- Verify policies are working
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test basic profile access
SELECT COUNT(*) as total_profiles FROM profiles;
SELECT COUNT(*) as active_profiles FROM profiles WHERE account_status = 'active';
SELECT COUNT(*) as deleted_profiles FROM profiles WHERE account_status = 'deleted';

-- SUCCESS MESSAGE
SELECT '🚨 EMERGENCY RLS FIX APPLIED - APP SHOULD WORK NOW!' as status;
