-- Analysis and cleanup script for profiles table
-- This script identifies potentially unused columns and provides cleanup recommendations

-- First, let's see the current structure of the profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Analysis of column usage (check for NULL values and empty strings)
SELECT 
    'role' as column_name,
    COUNT(*) as total_rows,
    COUNT(role) as non_null_count,
    COUNT(*) - COUNT(role) as null_count,
    ROUND((COUNT(role)::float / COUNT(*)) * 100, 2) as usage_percentage
FROM profiles
UNION ALL
SELECT 
    'full_name',
    COUNT(*),
    COUNT(full_name),
    COUNT(*) - COUNT(full_name),
    ROUND((COUNT(full_name)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'birthdate',
    COUNT(*),
    COUNT(birthdate),
    COUNT(*) - COUNT(birthdate),
    ROUND((COUNT(birthdate)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'location',
    COUNT(*),
    COUNT(CASE WHEN location IS NOT NULL AND location != 'Not specified' AND location != '' THEN 1 END),
    COUNT(CASE WHEN location IS NULL OR location = 'Not specified' OR location = '' THEN 1 END),
    ROUND((COUNT(CASE WHEN location IS NOT NULL AND location != 'Not specified' AND location != '' THEN 1 END)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'organization_number',
    COUNT(*),
    COUNT(organization_number),
    COUNT(*) - COUNT(organization_number),
    ROUND((COUNT(organization_number)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'location_lat',
    COUNT(*),
    COUNT(location_lat),
    COUNT(*) - COUNT(location_lat),
    ROUND((COUNT(location_lat)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'location_lng',
    COUNT(*),
    COUNT(location_lng),
    COUNT(*) - COUNT(location_lng),
    ROUND((COUNT(location_lng)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'avatar_url',
    COUNT(*),
    COUNT(avatar_url),
    COUNT(*) - COUNT(avatar_url),
    ROUND((COUNT(avatar_url)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'school_id',
    COUNT(*),
    COUNT(school_id),
    COUNT(*) - COUNT(school_id),
    ROUND((COUNT(school_id)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'email',
    COUNT(*),
    COUNT(email),
    COUNT(*) - COUNT(email),
    ROUND((COUNT(email)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'stripe_customer_id',
    COUNT(*),
    COUNT(stripe_customer_id),
    COUNT(*) - COUNT(stripe_customer_id),
    ROUND((COUNT(stripe_customer_id)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'apple_customer_id',
    COUNT(*),
    COUNT(apple_customer_id),
    COUNT(*) - COUNT(apple_customer_id),
    ROUND((COUNT(apple_customer_id)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'preferred_city',
    COUNT(*),
    COUNT(preferred_city),
    COUNT(*) - COUNT(preferred_city),
    ROUND((COUNT(preferred_city)::float / COUNT(*)) * 100, 2)
FROM profiles
UNION ALL
SELECT 
    'preferred_city_coords',
    COUNT(*),
    COUNT(preferred_city_coords),
    COUNT(*) - COUNT(preferred_city_coords),
    ROUND((COUNT(preferred_city_coords)::float / COUNT(*)) * 100, 2)
FROM profiles
ORDER BY usage_percentage DESC;

-- Check for duplicate or redundant location data
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN location IS NOT NULL AND location != 'Not specified' AND location != '' THEN 1 END) as has_location,
    COUNT(CASE WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL THEN 1 END) as has_coordinates,
    COUNT(CASE WHEN preferred_city IS NOT NULL THEN 1 END) as has_preferred_city,
    COUNT(CASE WHEN preferred_city_coords IS NOT NULL THEN 1 END) as has_preferred_coords
FROM profiles;

-- Identify potentially unused columns based on low usage
-- These columns have very low usage and might be candidates for cleanup:

-- CLEANUP RECOMMENDATIONS:

-- 1. SAFE TO REMOVE (very low usage, likely legacy):
-- birthdate - only used by 1 user out of many, not critical for app functionality
-- organization_number - only used by school accounts, could be moved to separate table
-- school_id - appears unused, relationships handled via school_memberships table
-- stripe_customer_id, apple_customer_id - payment features not implemented yet

-- 2. LOCATION DATA CONSOLIDATION:
-- We have redundant location fields: location, location_lat/lng, preferred_city, preferred_city_coords
-- Recommend consolidating to preferred_city and preferred_city_coords only

-- 3. COLUMNS TO KEEP (high usage or critical):
-- role, full_name, email, experience_level, avatar_url, private_profile
-- All onboarding and tour related flags
-- license_plan_* fields
-- developer_mode (newly added)

-- SAFE CLEANUP SCRIPT (uncomment to execute):
/*
-- Remove unused/redundant columns
ALTER TABLE profiles DROP COLUMN IF EXISTS birthdate;
ALTER TABLE profiles DROP COLUMN IF EXISTS organization_number;
ALTER TABLE profiles DROP COLUMN IF EXISTS school_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS apple_customer_id;

-- Consolidate location data - migrate old location data to preferred_city first
UPDATE profiles 
SET preferred_city = location 
WHERE preferred_city IS NULL 
  AND location IS NOT NULL 
  AND location != 'Not specified' 
  AND location != '';

-- Then remove old location columns
ALTER TABLE profiles DROP COLUMN IF EXISTS location;
ALTER TABLE profiles DROP COLUMN IF EXISTS location_lat;
ALTER TABLE profiles DROP COLUMN IF EXISTS location_lng;

-- Clean up redundant vehicle/license data (already stored in license_plan_data JSON)
-- These individual columns are redundant with the JSON data
ALTER TABLE profiles DROP COLUMN IF EXISTS vehicle_type;
ALTER TABLE profiles DROP COLUMN IF EXISTS transmission_type;
ALTER TABLE profiles DROP COLUMN IF EXISTS license_type;
ALTER TABLE profiles DROP COLUMN IF EXISTS target_license_date;
*/

-- Check final structure after cleanup
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public' ORDER BY ordinal_position;
