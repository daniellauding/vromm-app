-- Add license_plan_data JSON field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS license_plan_data JSONB DEFAULT NULL;

-- Update the Database types - this is informational only, you'll need to run 'supabase gen types typescript' separately
COMMENT ON COLUMN public.profiles.license_plan_data IS 'JSON data containing license plan information like target date, experience, etc'; 