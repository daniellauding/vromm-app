-- 🚨 COPY AND PASTE THIS INTO SUPABASE SQL EDITOR TO FIX ONBOARDING
-- This fixes the error: Could not find the 'license_type' column of 'profiles'

-- 1. Add missing columns to profiles table (SIMPLE VERSION)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transmission_type TEXT; 
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_license_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_city_coords JSONB;

-- 2. Add onboarding completion tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interactive_onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interactive_onboarding_version INTEGER DEFAULT 1;

-- 3. Add helpful comments
COMMENT ON COLUMN profiles.vehicle_type IS 'Vehicle type from onboarding (Car, Motorcycle, etc.)';
COMMENT ON COLUMN profiles.transmission_type IS 'Transmission from onboarding (Manual, Automatic)';
COMMENT ON COLUMN profiles.license_type IS 'License type from onboarding (b, a, c)';
COMMENT ON COLUMN profiles.target_license_date IS 'When user wants their license';
COMMENT ON COLUMN profiles.role_confirmed IS 'Whether user confirmed role in onboarding';
COMMENT ON COLUMN profiles.preferred_city IS 'City selected in onboarding';
COMMENT ON COLUMN profiles.preferred_city_coords IS 'Coordinates for preferred city';

-- Done! Your OnboardingInteractive should now work without errors 🎉
-- The categories already exist in your database based on your logs
