-- Fix signup error by correcting the trigger function
-- The issue is that the trigger references a non-existent table

-- First, let's check what tables actually exist and fix the trigger
-- The trigger is trying to insert into 'student_supervisor_relationships' 
-- but the actual table is 'supervisor_relationships'

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS on_auth_user_created_invitation ON auth.users;

-- Fix the trigger function to use the correct table name
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
  
  -- Update user role if specified in invitation
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
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user_invitation: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_invitation();

-- Also ensure the profiles table has the necessary columns
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
