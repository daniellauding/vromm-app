-- ========================================
-- COMPLETE ONBOARDING SETUP SQL
-- Copy-paste this entire script to Supabase SQL Editor
-- ========================================

-- 1. ADD PROFILE COLUMNS (IF NOT EXISTS)
-- ========================================

-- Add onboarding columns to profiles table
DO $$ 
BEGIN
  -- Add vehicle_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'vehicle_type') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "vehicle_type" TEXT;
    COMMENT ON COLUMN "public"."profiles"."vehicle_type" IS 'Vehicle type preference from onboarding (passenger_car, motorcycle, truck, etc.)';
  END IF;

  -- Add transmission_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'transmission_type') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "transmission_type" TEXT;
    COMMENT ON COLUMN "public"."profiles"."transmission_type" IS 'Transmission preference from onboarding (manual, automatic)';
  END IF;

  -- Add license_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'license_type') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "license_type" TEXT;
    COMMENT ON COLUMN "public"."profiles"."license_type" IS 'License type goal from onboarding (b, a, c, etc.)';
  END IF;

  -- Add target_license_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'target_license_date') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "target_license_date" TIMESTAMPTZ;
    COMMENT ON COLUMN "public"."profiles"."target_license_date" IS 'Target date for getting license from onboarding';
  END IF;

  -- Add role_confirmed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role_confirmed') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "role_confirmed" BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN "public"."profiles"."role_confirmed" IS 'Whether user has confirmed their role in onboarding';
  END IF;

  -- Add preferred_city column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_city') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "preferred_city" TEXT;
    COMMENT ON COLUMN "public"."profiles"."preferred_city" IS 'Preferred city from onboarding location selection';
  END IF;

  -- Add preferred_city_coords column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_city_coords') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "preferred_city_coords" JSONB;
    COMMENT ON COLUMN "public"."profiles"."preferred_city_coords" IS 'Coordinates of preferred city {latitude, longitude}';
  END IF;

  -- Add interactive_onboarding_completed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interactive_onboarding_completed') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "interactive_onboarding_completed" BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN "public"."profiles"."interactive_onboarding_completed" IS 'Whether user completed interactive onboarding flow';
  END IF;

  -- Add interactive_onboarding_version column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interactive_onboarding_version') THEN
    ALTER TABLE "public"."profiles" ADD COLUMN "interactive_onboarding_version" INTEGER DEFAULT 1;
    COMMENT ON COLUMN "public"."profiles"."interactive_onboarding_version" IS 'Version of onboarding completed by user';
  END IF;

END $$;

-- 2. ONBOARDING TRANSLATIONS (CORE KEYS)
-- ========================================

INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  -- Step Titles
  (gen_random_uuid(), 'onboarding.location.title', 'en', 'Enable Location Access', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.title', 'sv', 'Aktivera platsåtkomst', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.licensePlan.title', 'en', 'Your License Journey', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.licensePlan.title', 'sv', 'Din körkortsresa', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.role.title', 'en', 'Select Your Role', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.role.title', 'sv', 'Välj din roll', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.relationships.title', 'en', 'Connect with Others', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.relationships.title', 'sv', 'Anslut med andra', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.complete.title', 'en', 'Ready for Your Journey!', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.complete.title', 'sv', 'Redo för din resa!', 'mobile', NOW(), NOW()),

  -- Action Buttons
  (gen_random_uuid(), 'onboarding.location.enableLocation', 'en', 'Enable Location Access', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.enableLocation', 'sv', 'Aktivera platsåtkomst', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.detectingLocation', 'en', 'Detecting Location...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.detectingLocation', 'sv', 'Identifierar plats...', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.locationEnabled', 'en', 'Location Enabled', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.locationEnabled', 'sv', 'Plats aktiverad', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.orSelectCity', 'en', 'Or Select Your City', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.orSelectCity', 'sv', 'Eller välj din stad', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.saveContinue', 'en', 'Save Location & Continue', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.location.saveContinue', 'sv', 'Spara plats & fortsätt', 'mobile', NOW(), NOW()),

  (gen_random_uuid(), 'onboarding.licensePlan.savePreferences', 'en', 'Save My Preferences', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.licensePlan.savePreferences', 'sv', 'Spara mina inställningar', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.licensePlan.wantLicenseOn', 'en', 'Want my license on:', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.licensePlan.wantLicenseOn', 'sv', 'Vill ha mitt körkort den:', 'mobile', NOW(), NOW()),

  (gen_random_uuid(), 'onboarding.role.saveRole', 'en', 'Save Role & Continue', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.role.saveRole', 'sv', 'Spara roll & fortsätt', 'mobile', NOW(), NOW()),

  (gen_random_uuid(), 'onboarding.complete.startJourney', 'en', 'Start Using Vromm!', 'mobile', NOW(), NOW()),
  (gen_random_uuid(), 'onboarding.complete.startJourney', 'sv', 'Börja använda Vromm!', 'mobile', NOW(), NOW())

ON CONFLICT (key, language, platform) DO NOTHING;

-- 3. VERIFY DATA FLOW SETUP
-- ========================================
-- This query shows what profile data should be available after onboarding:

/*
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.role_confirmed,
  p.vehicle_type,
  p.transmission_type, 
  p.license_type,
  p.experience_level,
  p.target_license_date,
  p.preferred_city,
  p.preferred_city_coords,
  p.license_plan_data,
  p.license_plan_completed,
  p.interactive_onboarding_completed,
  p.interactive_onboarding_version
FROM profiles p 
WHERE p.email = 'YOUR_EMAIL_HERE';
*/
