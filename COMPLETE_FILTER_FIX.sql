-- COMPLETE FILTER MAPPING FIX
-- Copy-paste this SQL to fix all filter database issues

-- 1. REMOVE DUPLICATE AND INCONSISTENT "ALL" ENTRIES
-- ==================================================
-- Delete problematic "All" entries, keep only lowercase "all" as the universal filter option

-- Remove capitalized "All" duplicates where lowercase "all" exists
DELETE FROM learning_path_categories 
WHERE value = 'All' 
  AND EXISTS (
    SELECT 1 FROM learning_path_categories lpc2 
    WHERE lpc2.category = learning_path_categories.category 
    AND lpc2.value = 'all'
  );

-- Remove other inconsistent "All" variants 
DELETE FROM learning_path_categories 
WHERE value IN ('All Levels', 'All License Types', 'All Purposes', 'All Users', 'All Vehicles', 'All Transmissions', 'All Platforms', 'All Content');

-- 2. ENSURE CONSISTENT "all" ENTRIES FOR EACH CATEGORY
-- ====================================================
-- Add missing "all" entries where needed (safe with ON CONFLICT)

INSERT INTO learning_path_categories (id, category, value, label, order_index, is_default) 
VALUES 
  (gen_random_uuid(), 'vehicle_type', 'all', '{"en": "All Vehicles", "sv": "Alla Fordon"}', 0, false),
  (gen_random_uuid(), 'transmission_type', 'all', '{"en": "All Transmissions", "sv": "Alla Växellådor"}', 0, false),  
  (gen_random_uuid(), 'license_type', 'all', '{"en": "All License Types", "sv": "Alla Körkorttyper"}', 0, false),
  (gen_random_uuid(), 'experience_level', 'all', '{"en": "All Experience Levels", "sv": "Alla Erfarenhetsnivåer"}', 0, false),
  (gen_random_uuid(), 'purpose', 'all', '{"en": "All Purposes", "sv": "Alla Syften"}', 0, false),
  (gen_random_uuid(), 'user_profile', 'all', '{"en": "All Users", "sv": "Alla Användare"}', 0, false),
  (gen_random_uuid(), 'platform', 'all', '{"en": "All Platforms", "sv": "Alla Plattformar"}', 0, false),
  (gen_random_uuid(), 'type', 'all', '{"en": "All Content Types", "sv": "Alla Innehållstyper"}', 0, false)
ON CONFLICT DO NOTHING;

-- 3. RESET ALL DEFAULTS AND SET CORRECT ONES
-- ===========================================
UPDATE learning_path_categories SET is_default = false;

-- Set your specified defaults:
UPDATE learning_path_categories SET is_default = true WHERE category = 'vehicle_type' AND value = 'Car';
UPDATE learning_path_categories SET is_default = true WHERE category = 'license_type' AND value = 'Standard Driving License (B)';
UPDATE learning_path_categories SET is_default = true WHERE category = 'transmission_type' AND value = 'Manual';
UPDATE learning_path_categories SET is_default = true WHERE category = 'experience_level' AND value = 'Beginner';
UPDATE learning_path_categories SET is_default = true WHERE category = 'purpose' AND value = 'Prepare for driving test';
UPDATE learning_path_categories SET is_default = true WHERE category = 'user_profile' AND value = 'All'; -- Keep the capitalized "All" as default for user_profile
UPDATE learning_path_categories SET is_default = true WHERE category = 'platform' AND value = 'mobile';
UPDATE learning_path_categories SET is_default = true WHERE category = 'type' AND value = 'learning';

-- 4. ADD MISSING VALUES THAT ONBOARDING MIGHT USE
-- ================================================
-- Add missing values that users might select in onboarding

INSERT INTO learning_path_categories (id, category, value, label, order_index, is_default) 
VALUES 
  -- Add RV if missing (your user selected this)
  (gen_random_uuid(), 'vehicle_type', 'RV', '{"en": "RV/Motorhome", "sv": "Husbil"}', 8, false),
  
  -- Add passenger_car mapping (in case onboarding uses this)
  (gen_random_uuid(), 'vehicle_type', 'passenger_car', '{"en": "Passenger Car", "sv": "Personbil"}', 9, false),
  
  -- Ensure Semi-Automatic exists (your user selected this)
  (gen_random_uuid(), 'transmission_type', 'Semi-Automatic', '{"en": "Semi-Automatic", "sv": "Halvautomatisk"}', 3, false),
  
  -- Add lowercase versions for enum compatibility if needed
  (gen_random_uuid(), 'experience_level', 'beginner', '{"en": "Beginner", "sv": "Nybörjare"}', 10, false),
  (gen_random_uuid(), 'experience_level', 'intermediate', '{"en": "Intermediate", "sv": "Medelnivå"}', 11, false),
  (gen_random_uuid(), 'experience_level', 'advanced', '{"en": "Advanced", "sv": "Avancerad"}', 12, false)
ON CONFLICT DO NOTHING;

-- 5. VERIFY THE FIXES
-- ===================
SELECT 
  category,
  value,
  label::jsonb->>'en' as english_label,
  is_default,
  order_index,
  CASE 
    WHEN value = 'all' THEN '🔧 Universal Filter'
    WHEN is_default THEN '⭐ Default Value'
    ELSE '📋 Regular Option'
  END as entry_type
FROM learning_path_categories 
ORDER BY category, order_index;

-- 6. CHECK YOUR USER'S COMPATIBILITY
-- ==================================
-- Verify your onboarding data will work with the cleaned database
SELECT 
  'ONBOARDING COMPATIBILITY' as test_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'RV')
    THEN '✅ RV vehicle type supported'
    ELSE '❌ RV not found'
  END as vehicle_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'Semi-Automatic') 
    THEN '✅ Semi-Automatic transmission supported'
    ELSE '❌ Semi-Automatic not found'
  END as transmission_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'Standard Driving License (B)')
    THEN '✅ Standard license supported'
    ELSE '❌ Standard license not found'
  END as license_check;
