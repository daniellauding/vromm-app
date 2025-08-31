-- Add user-specific onboarding columns to profiles table
-- This makes onboarding user-based instead of device-based

-- Add columns for interactive onboarding tracking
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "interactive_onboarding_completed" BOOLEAN DEFAULT false;

ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "interactive_onboarding_version" INTEGER DEFAULT null;

-- Add columns for tour tracking (USER-BASED)
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "tour_completed" BOOLEAN DEFAULT false;

ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "tour_content_hash" TEXT DEFAULT null;

-- Update existing users to have the current version if they haven't been set
-- This prevents existing users from seeing onboarding again
UPDATE "public"."profiles" 
SET 
  "interactive_onboarding_completed" = true,
  "interactive_onboarding_version" = 2
WHERE "interactive_onboarding_completed" IS NULL 
  OR "interactive_onboarding_version" IS NULL;

-- Query to verify the changes
SELECT 
  id,
  email,
  interactive_onboarding_completed,
  interactive_onboarding_version,
  tour_completed,
  tour_content_hash,
  created_at
FROM "public"."profiles" 
ORDER BY created_at DESC 
LIMIT 10;

-- To reset a specific user's onboarding (for testing):
-- UPDATE "public"."profiles" 
-- SET 
--   "interactive_onboarding_completed" = false,
--   "interactive_onboarding_version" = null
-- WHERE email = 'test@example.com';

-- To reset ALL users' onboarding (for testing):
-- UPDATE "public"."profiles" 
-- SET 
--   "interactive_onboarding_completed" = false,
--   "interactive_onboarding_version" = null;
