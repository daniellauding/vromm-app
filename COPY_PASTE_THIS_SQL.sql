-- 🚨 COPY AND PASTE THIS INTO SUPABASE SQL EDITOR TO FIX ONBOARDING
-- This fixes the error: Could not find the 'license_type' column of 'profiles'

-- 1. Add missing columns to profiles table
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

-- 4. Ensure all the onboarding categories exist (FIXED UUIDs)
INSERT INTO "public"."learning_path_categories" ("id", "category", "value", "label", "order_index", "is_default", "created_at", "updated_at") 
VALUES 
-- Experience levels (using proper UUIDs)
(gen_random_uuid(), 'experience_level', 'beginner', '{"en": "Beginner", "sv": "Nybörjare"}', 1, true, NOW(), NOW()),
(gen_random_uuid(), 'experience_level', 'intermediate', '{"en": "Intermediate", "sv": "Mellannivå"}', 2, false, NOW(), NOW()),
(gen_random_uuid(), 'experience_level', 'advanced', '{"en": "Advanced", "sv": "Avancerad"}', 3, false, NOW(), NOW()),
(gen_random_uuid(), 'experience_level', 'expert', '{"en": "Expert", "sv": "Expert"}', 4, false, NOW(), NOW()),

-- Vehicle types (using proper UUIDs)
(gen_random_uuid(), 'vehicle_type', 'Car', '{"en": "Car", "sv": "Bil"}', 1, true, NOW(), NOW()),
(gen_random_uuid(), 'vehicle_type', 'Motorcycle', '{"en": "Motorcycle", "sv": "Motorcykel"}', 2, false, NOW(), NOW()),
(gen_random_uuid(), 'vehicle_type', 'Truck', '{"en": "Truck", "sv": "Lastbil"}', 3, false, NOW(), NOW()),

-- Transmission types (using proper UUIDs)
(gen_random_uuid(), 'transmission_type', 'Manual', '{"en": "Manual", "sv": "Manuell"}', 1, true, NOW(), NOW()),
(gen_random_uuid(), 'transmission_type', 'Automatic', '{"en": "Automatic", "sv": "Automat"}', 2, false, NOW(), NOW()),

-- License types (using proper UUIDs)
(gen_random_uuid(), 'license_type', 'Standard Driving License (B)', '{"en": "Standard License (B)", "sv": "Standardkörkort (B)"}', 1, true, NOW(), NOW()),
(gen_random_uuid(), 'license_type', 'Motorcycle License (A)', '{"en": "Motorcycle License (A)", "sv": "Motorcykelkörkort (A)"}', 2, false, NOW(), NOW()),
(gen_random_uuid(), 'license_type', 'Truck License (C)', '{"en": "Truck License (C)", "sv": "Lastbilskörkort (C)"}', 3, false, NOW(), NOW())

-- Skip conflict check since we're using random UUIDs;

-- Done! Your OnboardingInteractive should now work without errors 🎉
