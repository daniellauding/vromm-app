-- ANALYZE FILTER MAPPING ISSUES
-- Run this to see what values are being used vs expected

-- 1. CHECK CURRENT FILTER DATA AND DUPLICATES
-- =============================================
SELECT 
  category,
  value,
  label,
  is_default,
  order_index,
  'DATABASE VALUE' as source
FROM learning_path_categories 
ORDER BY category, order_index;

-- 2. IDENTIFY DUPLICATE "ALL" ENTRIES
-- ===================================
SELECT 
  category,
  COUNT(*) as count,
  STRING_AGG(value, ', ') as all_values,
  STRING_AGG(CASE WHEN is_default THEN value END, ', ') as default_values
FROM learning_path_categories 
WHERE LOWER(value) LIKE '%all%'
GROUP BY category
ORDER BY category;

-- 3. CHECK WHAT ONBOARDING IS SAVING VS DATABASE EXPECTATIONS
-- ===========================================================
-- Your user's saved values from onboarding:
SELECT 
  email,
  vehicle_type as onboarding_vehicle,
  transmission_type as onboarding_transmission,  
  license_type as onboarding_license,
  experience_level as onboarding_experience
FROM profiles 
WHERE id IN (
  '6ad39ba7-f8f6-46f4-87a3-116e3c7d025d',  -- daniel+skaparny
  'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a'   -- daniel+freshkonto
);

-- 4. MAPPING COMPATIBILITY CHECK
-- ==============================
-- Check if onboarding values match database categories
WITH user_values AS (
  SELECT 
    'vehicle_type' as category,
    'RV' as user_value  -- From your onboarding data
  UNION ALL
  SELECT 'transmission_type', 'Semi-Automatic'
  UNION ALL  
  SELECT 'license_type', 'Standard Driving License (B)'
  UNION ALL
  SELECT 'experience_level', 'advanced'  -- After mapping
)
SELECT 
  uv.category,
  uv.user_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM learning_path_categories lpc 
      WHERE lpc.category = uv.category 
      AND lpc.value = uv.user_value
    ) 
    THEN '✅ EXACT MATCH FOUND'
    ELSE '❌ NO MATCH - NEED MAPPING FIX'
  END as compatibility_status,
  
  -- Show closest matches
  (
    SELECT STRING_AGG(lpc.value, ', ') 
    FROM learning_path_categories lpc 
    WHERE lpc.category = uv.category 
    AND LOWER(lpc.value) LIKE '%' || LOWER(LEFT(uv.user_value, 3)) || '%'
    LIMIT 3
  ) as possible_matches
FROM user_values uv;
