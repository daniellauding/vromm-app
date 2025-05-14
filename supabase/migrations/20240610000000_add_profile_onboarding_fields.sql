-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS license_plan_completed BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_license_plan_completed ON public.profiles(license_plan_completed);

-- Update existing profiles to have default values
UPDATE public.profiles 
SET 
  onboarding_completed = FALSE,
  license_plan_completed = FALSE
WHERE 
  onboarding_completed IS NULL OR
  license_plan_completed IS NULL;

-- Update the Database types - this is informational only, you'll need to run 'supabase gen types typescript' separately
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the full onboarding process';
COMMENT ON COLUMN public.profiles.license_plan_completed IS 'Whether the user has completed the license plan setup'; 