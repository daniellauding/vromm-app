-- Safe fix for signup error without dropping system triggers
-- This approach fixes the function without touching the auth.users table

-- Fix the trigger function to use the correct table name and add error handling
CREATE OR REPLACE FUNCTION public.handle_new_user_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a pending invitation for this email
  UPDATE public.pending_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = NEW.id
  WHERE 
    email = LOWER(NEW.email)
    AND status = 'pending';
  
  -- Create supervisor relationship if invitation exists
  -- Use the correct table name: supervisor_relationships (not student_supervisor_relationships)
  -- Only insert if the table exists
  BEGIN
    INSERT INTO public.supervisor_relationships (student_id, supervisor_id, status)
    SELECT 
      NEW.id,
      invited_by,
      'active'
    FROM public.pending_invitations
    WHERE 
      email = LOWER(NEW.email)
      AND status = 'accepted'
      AND invited_by IS NOT NULL
    ON CONFLICT (supervisor_id, student_id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      -- If supervisor_relationships table doesn't exist, just skip this step
      RAISE WARNING 'supervisor_relationships table does not exist, skipping relationship creation';
    WHEN OTHERS THEN
      -- Log other errors but don't fail
      RAISE WARNING 'Error creating supervisor relationship: %', SQLERRM;
  END;
  
  -- Update user role if specified in invitation
  -- Only update if the role column exists
  BEGIN
    UPDATE public.profiles
    SET role = (
      SELECT role 
      FROM public.pending_invitations 
      WHERE email = LOWER(NEW.email) 
      AND status = 'accepted'
      LIMIT 1
    )
    WHERE id = NEW.id
    AND EXISTS (
      SELECT 1 
      FROM public.pending_invitations 
      WHERE email = LOWER(NEW.email) 
      AND status = 'accepted'
      AND role IS NOT NULL
    );
  EXCEPTION
    WHEN undefined_column THEN
      -- If role column doesn't exist, just skip this step
      RAISE WARNING 'role column does not exist in profiles table, skipping role update';
    WHEN OTHERS THEN
      -- Log other errors but don't fail
      RAISE WARNING 'Error updating user role: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user_invitation: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the profiles table has the necessary columns
-- Check if role column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'student';
    END IF;
END $$;

-- Ensure the profiles table has proper RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create proper RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Also ensure the supervisor_relationships table exists with proper structure
CREATE TABLE IF NOT EXISTS public.supervisor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supervisor_id, student_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_supervisor_id ON public.supervisor_relationships(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_student_id ON public.supervisor_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_relationships_status ON public.supervisor_relationships(status);

-- Enable RLS on supervisor_relationships
ALTER TABLE public.supervisor_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for supervisor_relationships
DROP POLICY IF EXISTS "Users can view own relationships" ON public.supervisor_relationships;
DROP POLICY IF EXISTS "Users can create relationships" ON public.supervisor_relationships;
DROP POLICY IF EXISTS "Users can update own relationships" ON public.supervisor_relationships;

CREATE POLICY "Users can view own relationships" ON public.supervisor_relationships
  FOR SELECT USING (auth.uid() = supervisor_id OR auth.uid() = student_id);

CREATE POLICY "Users can create relationships" ON public.supervisor_relationships
  FOR INSERT WITH CHECK (auth.uid() = supervisor_id OR auth.uid() = student_id);

CREATE POLICY "Users can update own relationships" ON public.supervisor_relationships
  FOR UPDATE USING (auth.uid() = supervisor_id OR auth.uid() = student_id);
