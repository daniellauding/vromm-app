-- FIX FILTER DATABASE INCONSISTENCIES
-- Copy-paste this SQL to clean up the learning_path_categories table

-- 1. CLEAN UP DUPLICATE "ALL" ENTRIES
-- ====================================
-- Keep only one "All" entry per category (the one with proper capitalization)

-- Delete lowercase "all" duplicates, keep proper "All" entries
DELETE FROM learning_path_categories 
WHERE value = 'all' 
  AND EXISTS (
    SELECT 1 FROM learning_path_categories lpc2 
    WHERE lpc2.category = learning_path_categories.category 
    AND lpc2.value = 'All'
  );

-- 2. FIX DEFAULT FLAGS - ENSURE ONLY ONE DEFAULT PER CATEGORY
-- ===========================================================
-- Reset all defaults first
UPDATE learning_path_categories SET is_default = false;

-- Set correct defaults based on your requirements:
-- Vehicle Type: Car (not Passenger Car)
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'vehicle_type' AND value = 'Car';

-- License Type: Standard Driving License (B) 
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'license_type' AND value = 'Standard Driving License (B)';

-- Transmission: Manual
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'transmission_type' AND value = 'Manual';

-- Experience Level: Beginner (not All)
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'experience_level' AND value = 'Beginner';

-- Purpose: Prepare for driving test
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'purpose' AND value = 'Prepare for driving test';

-- User Profile: All (the properly formatted one)
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'user_profile' AND value = 'All';

-- Platform: mobile (since this is a mobile app)
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'platform' AND value = 'mobile';

-- Type: learning (main content type)
UPDATE learning_path_categories 
SET is_default = true 
WHERE category = 'type' AND value = 'learning';

-- 3. ADD MISSING VEHICLE TYPES THAT ONBOARDING MIGHT USE
-- ======================================================
-- Add RV if it doesn't exist (your user selected this)
INSERT INTO learning_path_categories (id, category, value, label, order_index, is_default)
VALUES (
  gen_random_uuid(),
  'vehicle_type',
  'RV', 
  '{"en": "RV/Motorhome", "sv": "Husbil"}',
  8,
  false
) ON CONFLICT DO NOTHING;

-- 4. VERIFY THE FIXES
-- ===================
-- Check defaults are properly set
SELECT 
  category,
  COUNT(*) as total_options,
  COUNT(CASE WHEN is_default THEN 1 END) as default_count,
  STRING_AGG(CASE WHEN is_default THEN value END, ', ') as default_value
FROM learning_path_categories 
GROUP BY category
ORDER BY category;

-- 5. CHECK MAPPING COMPATIBILITY WITH YOUR USER DATA
-- ==================================================
SELECT 
  'COMPATIBILITY CHECK' as test_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE category = 'vehicle_type' AND value = 'RV')
    THEN '✅ RV vehicle type exists'
    ELSE '❌ RV vehicle type missing' 
  END as rv_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE category = 'transmission_type' AND value = 'Semi-Automatic')
    THEN '✅ Semi-Automatic transmission exists'
    ELSE '❌ Semi-Automatic transmission missing'
  END as transmission_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE category = 'license_type' AND value = 'Standard Driving License (B)')
    THEN '✅ Standard license type exists'
    ELSE '❌ Standard license type missing'
  END as license_check;
