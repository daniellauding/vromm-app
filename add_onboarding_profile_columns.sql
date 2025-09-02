-- Add onboarding-related columns to profiles table if they don't exist
-- This ensures other screens can easily access the user's onboarding choices
-- RUN THIS SQL IN SUPABASE TO FIX THE ERROR: Could not find the 'license_type' column

-- Add vehicle_type column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;

-- Add transmission_type column  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transmission_type TEXT;

-- Add license_type column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_type TEXT;

-- Add target_license_date column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_license_date TIMESTAMPTZ;

-- Add role_confirmed column (boolean to track if role was explicitly selected)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_confirmed BOOLEAN DEFAULT FALSE;

-- Add preferred_city column (for location selection)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_city TEXT;

-- Add preferred_city_coords column (for location coordinates)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_city_coords JSONB;

-- Add interactive_onboarding_completed column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interactive_onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add interactive_onboarding_version column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interactive_onboarding_version INTEGER DEFAULT 1;

COMMENT ON COLUMN profiles.vehicle_type IS 'Vehicle type selected during onboarding (e.g. Car, Motorcycle, etc.)';
COMMENT ON COLUMN profiles.transmission_type IS 'Transmission type selected during onboarding (e.g. Manual, Automatic)';
COMMENT ON COLUMN profiles.license_type IS 'License type selected during onboarding (e.g. b, a, c)';
COMMENT ON COLUMN profiles.target_license_date IS 'When user wants to get their license';
COMMENT ON COLUMN profiles.role_confirmed IS 'Whether user explicitly confirmed their role during onboarding';
COMMENT ON COLUMN profiles.preferred_city IS 'City selected during onboarding or profile setup';
COMMENT ON COLUMN profiles.preferred_city_coords IS 'Coordinates for preferred city as {latitude, longitude}';
COMMENT ON COLUMN profiles.interactive_onboarding_completed IS 'Whether user completed the new interactive onboarding';
COMMENT ON COLUMN profiles.interactive_onboarding_version IS 'Version of interactive onboarding completed';
