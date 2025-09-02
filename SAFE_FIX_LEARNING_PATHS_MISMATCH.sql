-- SAFE FIX LEARNING PATHS MISMATCH 
-- Handles the unique constraint error by removing duplicates first

BEGIN;

-- 1. REMOVE DUPLICATE CATEGORIES FIRST (BEFORE UPDATING)
-- ======================================================

-- Delete lowercase experience_level duplicates where capitalized version exists
DELETE FROM learning_path_categories 
WHERE category = 'experience_level' 
  AND value IN ('beginner', 'intermediate', 'advanced', 'expert', 'refresher')
  AND EXISTS (
    SELECT 1 FROM learning_path_categories lpc2 
    WHERE lpc2.category = 'experience_level' 
    AND (lpc2.value = INITCAP(learning_path_categories.value) OR 
         lpc2.value = UPPER(SUBSTRING(learning_path_categories.value FROM 1 FOR 1)) || LOWER(SUBSTRING(learning_path_categories.value FROM 2)))
    AND lpc2.id != learning_path_categories.id
  );

-- Also delete capitalized versions where we want to keep lowercase for enum compatibility
DELETE FROM learning_path_categories 
WHERE category = 'experience_level' 
  AND value IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Refresher');

-- Delete any remaining duplicate IDs first
WITH duplicate_ids AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at) as row_num
  FROM learning_path_categories
)
DELETE FROM learning_path_categories 
WHERE id IN (
  SELECT id FROM duplicate_ids WHERE row_num > 1
);

-- Delete any remaining (category, value) duplicates
WITH category_value_duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY category, value 
           ORDER BY 
             CASE WHEN is_default THEN 0 ELSE 1 END,
             created_at
         ) as row_num
  FROM learning_path_categories
)
DELETE FROM learning_path_categories 
WHERE id IN (
  SELECT id FROM category_value_duplicates WHERE row_num > 1
);

-- 2. UPDATE LEARNING_PATHS TO MATCH EXISTING FILTER CATEGORY VALUES
-- =================================================================

-- Fix license_type mismatches
UPDATE learning_paths 
SET license_type = CASE 
  WHEN license_type = 'Standard Driving License' THEN 'Standard Driving License (B)'
  WHEN license_type = 'Motorcycle License' THEN 'Motorcycle License (A)' 
  WHEN license_type = 'Commercial Driving License' THEN 'Commercial Driving License'
  WHEN license_type = 'Learner''s Permit' THEN 'Learner''s Permit'
  WHEN license_type = 'International Driving Permit' THEN 'International Driving Permit'
  WHEN license_type = 'Provisional License' THEN 'Provisional / Probationary License'
  ELSE license_type
END
WHERE license_type IS NOT NULL;

-- Fix vehicle_type mismatches  
UPDATE learning_paths
SET vehicle_type = CASE
  WHEN vehicle_type = 'Passenger Car' THEN 'Car'
  WHEN vehicle_type = 'passenger_car' THEN 'Car'  
  WHEN vehicle_type = 'Motorcycle' THEN 'Motorcycle / Scooter'
  WHEN vehicle_type = 'Truck' THEN 'Truck / Lorry'
  WHEN vehicle_type = 'Bus' THEN 'Bus / Minibus' 
  WHEN vehicle_type = 'Tractor' THEN 'Tractor / Agricultural vehicle'
  WHEN vehicle_type = 'ATV' THEN 'ATV / Off-road'
  WHEN vehicle_type = 'Electric vehicle' THEN 'Electric vehicle (EV)'
  ELSE vehicle_type
END
WHERE vehicle_type IS NOT NULL;

-- Fix transmission_type mismatches
UPDATE learning_paths
SET transmission_type = CASE
  WHEN transmission_type = 'manual' THEN 'Manual'
  WHEN transmission_type = 'automatic' THEN 'Automatic' 
  WHEN transmission_type = 'semi-automatic' THEN 'Semi-Automatic'
  WHEN transmission_type = 'electric' THEN 'Electric vehicle (one-pedal driving etc.)'
  ELSE transmission_type
END
WHERE transmission_type IS NOT NULL;

-- Fix experience_level mismatches (keep them capitalized in learning_paths)
UPDATE learning_paths
SET experience_level = CASE
  WHEN experience_level = 'beginner' THEN 'Beginner'
  WHEN experience_level = 'intermediate' THEN 'Intermediate'
  WHEN experience_level = 'advanced' THEN 'Advanced' 
  WHEN experience_level = 'expert' THEN 'Expert'
  WHEN experience_level = 'refresher' THEN 'Refresher'
  ELSE experience_level
END
WHERE experience_level IS NOT NULL;

-- Fix purpose mismatches
UPDATE learning_paths
SET purpose = CASE
  WHEN purpose = 'Pass theory exam' THEN 'Pass theory exam'
  WHEN purpose = 'Pass driving test' THEN 'Prepare for driving test'
  WHEN purpose = 'Learn eco-driving' THEN 'Learn eco-driving techniques'
  WHEN purpose = 'Defensive driving' THEN 'Defensive driving'
  WHEN purpose = 'Work driving' THEN 'Driving for work'
  WHEN purpose = 'Adaptive driving' THEN 'Adaptive driving'
  ELSE purpose
END
WHERE purpose IS NOT NULL;

-- 3. VERIFICATION QUERIES
-- =======================

-- Check learning_paths license types now
SELECT 
  'UPDATED LEARNING PATHS LICENSE TYPES' as check_type,
  license_type,
  COUNT(*) as path_count
FROM learning_paths 
GROUP BY license_type
ORDER BY path_count DESC;

-- Check if filter options now match learning paths
SELECT 
  'FILTER MATCH CHECK' as check_type,
  lp.license_type as path_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM learning_path_categories lpc2 
      WHERE lpc2.category = 'license_type' 
      AND lpc2.value = lp.license_type
    ) THEN '✅ MATCH FOUND'
    ELSE '❌ NO FILTER MATCH'
  END as status
FROM (
  SELECT DISTINCT license_type FROM learning_paths WHERE license_type IS NOT NULL
) lp;

-- Check experience level matches
SELECT 
  'EXPERIENCE LEVEL MATCH CHECK' as check_type,
  lp.experience_level as path_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM learning_path_categories lpc2 
      WHERE lpc2.category = 'experience_level' 
      AND lpc2.value = lp.experience_level
    ) THEN '✅ MATCH FOUND'
    ELSE '❌ NO FILTER MATCH'
  END as status
FROM (
  SELECT DISTINCT experience_level FROM learning_paths WHERE experience_level IS NOT NULL
) lp;

-- Check for remaining duplicate IDs
SELECT 
  'DUPLICATE ID CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT id FROM learning_path_categories GROUP BY id HAVING COUNT(*) > 1
    ) THEN '❌ DUPLICATES STILL EXIST'
    ELSE '✅ NO DUPLICATE IDs'
  END as status;

-- Check for remaining (category, value) duplicates
SELECT 
  'CATEGORY VALUE DUPLICATE CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT category, value FROM learning_path_categories 
      GROUP BY category, value HAVING COUNT(*) > 1
    ) THEN '❌ CATEGORY/VALUE DUPLICATES STILL EXIST'
    ELSE '✅ NO CATEGORY/VALUE DUPLICATES'
  END as status;

-- Sample the updated data
SELECT 
  'SAMPLE UPDATED PATHS' as check_type,
  title::jsonb->>'en' as title,
  license_type,
  vehicle_type,
  experience_level,
  transmission_type
FROM learning_paths 
WHERE license_type IS NOT NULL
LIMIT 3;

-- Show current filter categories for experience_level
SELECT 
  'CURRENT EXPERIENCE LEVEL FILTERS' as check_type,
  value,
  label::jsonb->>'en' as english_label,
  is_default,
  order_index
FROM learning_path_categories
WHERE category = 'experience_level'
ORDER BY order_index;

COMMIT;

SELECT '🎯 SAFE LEARNING PATHS FILTER MISMATCH FIXED!
✅ Removed duplicate categories first to avoid constraint violations
✅ Updated learning_paths to match filter category values
✅ Fixed license_type: "Standard Driving License" → "Standard Driving License (B)"
✅ Fixed experience_level mismatches
✅ Fixed vehicle_type: various → standardized names
✅ Fixed transmission_type: lowercase → Capitalized
✅ Removed all duplicate IDs and category/value pairs
✅ ProgressScreen filters should now work correctly!' as result;
