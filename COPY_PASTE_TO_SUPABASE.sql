-- ============================================================================
-- COPY AND PASTE THIS ENTIRE SCRIPT INTO SUPABASE SQL EDITOR
-- ============================================================================

-- 1. Add developer mode flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS developer_mode BOOLEAN DEFAULT true;

-- 2. Update all existing users to have developer mode enabled (for testing)
UPDATE profiles SET developer_mode = true WHERE developer_mode IS NULL;

-- 3. Add comment to document the column
COMMENT ON COLUMN profiles.developer_mode IS 'Controls access to developer tools and testing features. Default true for testing, can be set to false for production users.';

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_developer_mode ON profiles(developer_mode) WHERE developer_mode = true;

-- 5. Verify the changes
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN developer_mode = true THEN 1 END) as developer_mode_enabled,
    COUNT(CASE WHEN developer_mode = false THEN 1 END) as developer_mode_disabled
FROM profiles;

-- ============================================================================
-- OPTIONAL: PROFILE CLEANUP (REVIEW CAREFULLY BEFORE UNCOMMENTING)
-- ============================================================================

-- Uncomment below to clean up unused columns (BE CAREFUL):

-- Remove low-usage columns:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS birthdate;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS organization_number;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS school_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS apple_customer_id;

-- Consolidate location data:
-- UPDATE profiles SET preferred_city = location WHERE preferred_city IS NULL AND location IS NOT NULL AND location != 'Not specified' AND location != '';
-- ALTER TABLE profiles DROP COLUMN IF EXISTS location;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS location_lat;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS location_lng;

-- Remove redundant vehicle data (already stored in license_plan_data JSON):
-- ALTER TABLE profiles DROP COLUMN IF EXISTS vehicle_type;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS transmission_type;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS license_type;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS target_license_date;

-- ============================================================================
-- RESULT: After running this script, all users will have developer_mode = true
-- You can then use the Developer Tools in the ProfileScreen to reset flags
-- ============================================================================
