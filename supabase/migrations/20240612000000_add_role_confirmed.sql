-- Add role_confirmed field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_confirmed BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_confirmed ON public.profiles(role_confirmed);

-- Update existing profiles to have default value
UPDATE public.profiles 
SET role_confirmed = FALSE
WHERE role_confirmed IS NULL; 