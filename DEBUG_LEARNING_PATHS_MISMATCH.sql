-- DEBUG LEARNING PATHS MISMATCH
-- This will show us exactly what's wrong with the filtering

-- 1. CHECK WHAT LICENSE_TYPE VALUES EXIST IN ACTUAL LEARNING PATHS
-- ================================================================
SELECT 
  'LEARNING PATHS LICENSE TYPES' as section,
  license_type,
  COUNT(*) as path_count,
  STRING_AGG(title::jsonb->>'en', ', ') as example_paths
FROM learning_paths 
GROUP BY license_type
ORDER BY path_count DESC;

-- 2. CHECK WHAT FILTER OPTIONS EXIST FOR LICENSE_TYPE  
-- ===================================================
SELECT 
  'FILTER OPTIONS LICENSE_TYPE' as section,
  value as filter_value,
  label::jsonb->>'en' as english_label,
  is_default
FROM learning_path_categories 
WHERE category = 'license_type'
ORDER BY order_index;

-- 3. SHOW THE EXACT MISMATCH
-- ==========================
SELECT 
  'MISMATCH ANALYSIS' as section,
  'Paths have: "' || COALESCE(lp.license_type, 'NULL') || '"' as paths_have,
  'Filter expects: "' || lpc.value || '"' as filter_expects,
  CASE 
    WHEN lp.license_type = lpc.value THEN '✅ MATCH'
    ELSE '❌ MISMATCH - This causes 0 results!'
  END as status
FROM (
  SELECT DISTINCT license_type FROM learning_paths WHERE license_type IS NOT NULL
) lp
CROSS JOIN (
  SELECT value FROM learning_path_categories 
  WHERE category = 'license_type' AND value != 'all'
) lpc;

-- 4. CHECK OTHER CATEGORY MISMATCHES TOO
-- ======================================
SELECT 
  'VEHICLE TYPE MISMATCH' as section,
  'Paths have: ' || STRING_AGG(DISTINCT COALESCE(vehicle_type, 'NULL'), ', ') as paths_have,
  'Filters expect: ' || (
    SELECT STRING_AGG(value, ', ') 
    FROM learning_path_categories 
    WHERE category = 'vehicle_type' AND value != 'all'
  ) as filters_expect
FROM learning_paths;

SELECT 
  'TRANSMISSION TYPE MISMATCH' as section,
  'Paths have: ' || STRING_AGG(DISTINCT COALESCE(transmission_type, 'NULL'), ', ') as paths_have,
  'Filters expect: ' || (
    SELECT STRING_AGG(value, ', ') 
    FROM learning_path_categories 
    WHERE category = 'transmission_type' AND value != 'all'
  ) as filters_expect
FROM learning_paths;

SELECT 
  'EXPERIENCE LEVEL MISMATCH' as section,
  'Paths have: ' || STRING_AGG(DISTINCT COALESCE(experience_level, 'NULL'), ', ') as paths_have,
  'Filters expect: ' || (
    SELECT STRING_AGG(value, ', ') 
    FROM learning_path_categories 
    WHERE category = 'experience_level' AND value != 'all'
  ) as filters_expect
FROM learning_paths;

-- 5. CHECK FOR DUPLICATE IDS (CAUSING REACT KEY WARNING)
-- ======================================================
SELECT 
  'DUPLICATE ID CHECK' as section,
  id,
  COUNT(*) as duplicate_count
FROM learning_path_categories
GROUP BY id
HAVING COUNT(*) > 1;

-- 6. SHOW FIRST 5 ACTUAL LEARNING PATHS TO SEE THEIR VALUES
-- =========================================================
SELECT 
  'SAMPLE LEARNING PATHS' as section,
  title::jsonb->>'en' as path_title,
  license_type,
  vehicle_type,
  transmission_type,
  experience_level,
  purpose,
  user_profile,
  platform,
  type
FROM learning_paths 
LIMIT 5;
