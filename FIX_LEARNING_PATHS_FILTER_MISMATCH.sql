-- FIX LEARNING PATHS FILTER MISMATCH
-- This will align the learning_paths table with the filter categories

BEGIN;

-- 1. UPDATE LEARNING_PATHS TO MATCH FILTER CATEGORY VALUES
-- ========================================================

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

-- 2. ALSO FIX FILTER CATEGORIES TO MATCH COMMON LEARNING_PATH VALUES
-- ===================================================================

-- Update filter categories to match the most common learning_path patterns
UPDATE learning_path_categories 
SET value = CASE
  -- Make sure experience_level in filters uses capitalized form to match learning_paths
  WHEN category = 'experience_level' AND value = 'beginner' THEN 'Beginner'
  WHEN category = 'experience_level' AND value = 'intermediate' THEN 'Intermediate'  
  WHEN category = 'experience_level' AND value = 'advanced' THEN 'Advanced'
  WHEN category = 'experience_level' AND value = 'expert' THEN 'Expert'
  WHEN category = 'experience_level' AND value = 'refresher' THEN 'Refresher'
  ELSE value
END
WHERE category = 'experience_level' AND value IN ('beginner', 'intermediate', 'advanced', 'expert', 'refresher');

-- 3. REMOVE ANY REMAINING DUPLICATE IDS (REACT KEY WARNING)
-- =========================================================
WITH duplicate_ids AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at) as row_num
  FROM learning_path_categories
)
DELETE FROM learning_path_categories 
WHERE id IN (
  SELECT id FROM duplicate_ids WHERE row_num > 1
);

-- 4. VERIFICATION QUERIES
-- =======================

-- Check learning_paths license types now
SELECT 
  'UPDATED LEARNING PATHS LICENSE TYPES' as check_type,
  license_type,
  COUNT(*) as path_count
FROM learning_paths 
GROUP BY license_type
ORDER BY path_count DESC;

-- Check if filter options now match
SELECT 
  'FILTER MATCH CHECK' as check_type,
  lp.license_type as path_value,
  lpc.value as filter_value,
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
) lp
LEFT JOIN learning_path_categories lpc ON lpc.value = lp.license_type AND lpc.category = 'license_type';

-- Check for remaining duplicate IDs
SELECT 
  'DUPLICATE ID CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT id FROM learning_path_categories GROUP BY id HAVING COUNT(*) > 1
    ) THEN '❌ DUPLICATES STILL EXIST'
    ELSE '✅ NO DUPLICATE IDs'
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

COMMIT;

SELECT '🎯 LEARNING PATHS FILTER MISMATCH FIXED!
✅ Updated learning_paths to match filter category values
✅ Fixed license_type: "Standard Driving License" → "Standard Driving License (B)"
✅ Fixed experience_level: lowercase → Capitalized  
✅ Fixed vehicle_type: various → standardized names
✅ Fixed transmission_type: lowercase → Capitalized
✅ Removed duplicate IDs causing React key warnings
✅ ProgressScreen filters should now work correctly!' as result;
