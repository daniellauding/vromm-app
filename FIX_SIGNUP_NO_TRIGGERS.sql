-- Fix signup without creating triggers on system tables
-- This approach fixes the database structure without touching auth.users

-- First, let's create a simple version of the problematic trigger function that won't fail
CREATE OR REPLACE FUNCTION public.handle_new_user_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Just return NEW without doing anything that could fail
  -- This prevents the trigger from breaking user creation
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user_invitation: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the profiles table exists and has the right structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role user_role DEFAULT 'student',
  location TEXT,
  experience_level experience_level DEFAULT 'beginner',
  private_profile BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  license_plan_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any missing columns
DO $$
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'student';
    END IF;
    
    -- Add onboarding_completed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add license_plan_completed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'license_plan_completed'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN license_plan_completed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure the pending_invitations table exists
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role DEFAULT 'student',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  metadata JSONB DEFAULT '{}',
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on pending_invitations
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pending_invitations
DROP POLICY IF EXISTS "Users can view own invitations" ON public.pending_invitations;
DROP POLICY IF EXISTS "Users can view invitations to them" ON public.pending_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.pending_invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON public.pending_invitations;

CREATE POLICY "Users can view own invitations" ON public.pending_invitations
  FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "Users can view invitations to them" ON public.pending_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations" ON public.pending_invitations
  FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update own invitations" ON public.pending_invitations
  FOR UPDATE USING (auth.uid() = invited_by);

-- Create a function to manually create profiles (to be called from the app)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT,
  user_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
BEGIN
  -- Create profile for user
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    role, 
    location, 
    experience_level, 
    private_profile
  )
  VALUES (
    user_id,
    COALESCE(user_metadata->>'full_name', split_part(user_email, '@', 1)),
    user_email,
    COALESCE((user_metadata->>'role')::user_role, 'student'),
    COALESCE(user_metadata->>'location', 'Unknown'),
    COALESCE((user_metadata->>'experience_level')::experience_level, 'beginner'),
    COALESCE((user_metadata->>'private_profile')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    location = EXCLUDED.location,
    experience_level = EXCLUDED.experience_level,
    private_profile = EXCLUDED.private_profile,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
