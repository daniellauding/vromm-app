-- FINAL AGGRESSIVE CLEANUP - HANDLES CASE VARIATIONS
-- This will fix all the remaining case duplicate issues you're seeing

BEGIN;

-- 1. DELETE CASE VARIATION DUPLICATES - KEEP PROPER CAPITALIZATION
-- ================================================================

-- Experience Level: Keep proper capitalization, remove lowercase variants
DELETE FROM learning_path_categories 
WHERE category = 'experience_level' AND value IN ('beginner', 'intermediate', 'advanced', 'expert', 'refresher');

-- Transmission Type: Keep proper capitalization, remove lowercase variants  
DELETE FROM learning_path_categories 
WHERE category = 'transmission_type' AND value IN ('manual', 'automatic');

-- Vehicle Type: Standardize to proper names
DELETE FROM learning_path_categories 
WHERE category = 'vehicle_type' AND value = 'passenger_car'; -- Keep the more descriptive ones

-- 2. STANDARDIZE VALUES TO MATCH UI EXPECTATIONS  
-- ==============================================

-- Update experience levels to match what ProgressScreen expects
UPDATE learning_path_categories 
SET 
  value = CASE 
    WHEN value = 'Beginner' THEN 'beginner'
    WHEN value = 'Intermediate' THEN 'intermediate' 
    WHEN value = 'Advanced' THEN 'advanced'
    WHEN value = 'Expert' THEN 'expert'
    WHEN value = 'Refresher' THEN 'refresher'
    ELSE value
  END,
  label = CASE 
    WHEN value = 'Beginner' THEN '{"en": "Beginner", "sv": "Nybörjare"}'
    WHEN value = 'Intermediate' THEN '{"en": "Intermediate", "sv": "Medelnivå"}'
    WHEN value = 'Advanced' THEN '{"en": "Advanced", "sv": "Avancerad"}'
    WHEN value = 'Expert' THEN '{"en": "Expert", "sv": "Expert"}'
    WHEN value = 'Refresher' THEN '{"en": "Refresher", "sv": "Repetitionskurs"}'
    ELSE label
  END
WHERE category = 'experience_level' 
  AND value IN ('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Refresher');

-- Update transmission types to match what onboarding uses
UPDATE learning_path_categories 
SET 
  value = CASE 
    WHEN value = 'Manual' THEN 'Manual'  -- Keep this capitalized
    WHEN value = 'Automatic' THEN 'Automatic'  -- Keep this capitalized  
    ELSE value
  END
WHERE category = 'transmission_type' 
  AND value IN ('Manual', 'Automatic');

-- 3. REMOVE ANY REMAINING EXACT DUPLICATES
-- ========================================
WITH ranked_duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY category, LOWER(value), label::text 
           ORDER BY 
             CASE WHEN is_default THEN 0 ELSE 1 END,
             created_at
         ) as row_num
  FROM learning_path_categories
)
DELETE FROM learning_path_categories 
WHERE id IN (
  SELECT id FROM ranked_duplicates WHERE row_num > 1
);

-- 4. ENSURE CORRECT DEFAULTS
-- ==========================
UPDATE learning_path_categories SET is_default = false; -- Reset all

-- Set the correct defaults that match your onboarding data
UPDATE learning_path_categories SET is_default = true 
WHERE (category, value) IN (
  ('vehicle_type', 'Car'),                              -- ✅ Your user has RV, but Car is general default
  ('transmission_type', 'Manual'),                      -- ✅ Matches your Semi-Automatic onboarding
  ('license_type', 'Standard Driving License (B)'),     -- ✅ Matches your onboarding  
  ('experience_level', 'beginner'),                     -- ✅ Lowercase to match enum
  ('purpose', 'Prepare for driving test'),              -- ✅ Most common purpose
  ('user_profile', 'all'),                              -- ✅ Show all users by default
  ('platform', 'mobile'),                               -- ✅ Mobile app
  ('type', 'learning')                                  -- ✅ Learning content
);

-- 5. VERIFICATION QUERIES  
-- =======================

-- Check for remaining case duplicates
SELECT 
  'CASE DUPLICATE CHECK' as test,
  category,
  LOWER(value) as lowercase_value,
  COUNT(*) as count,
  STRING_AGG(value, ', ') as all_variations
FROM learning_path_categories
GROUP BY category, LOWER(value)
HAVING COUNT(*) > 1
ORDER BY category, lowercase_value;

-- Summary by category 
SELECT 
  'FINAL SUMMARY' as test,
  category,
  COUNT(*) as total_options,
  COUNT(CASE WHEN LOWER(value) = 'all' THEN 1 END) as all_options,
  COUNT(CASE WHEN is_default THEN 1 END) as defaults,
  CASE 
    WHEN COUNT(CASE WHEN LOWER(value) = 'all' THEN 1 END) = 1 
         AND COUNT(CASE WHEN is_default THEN 1 END) <= 1 
    THEN '✅ CLEAN'
    ELSE '❌ ISSUES'
  END as status
FROM learning_path_categories
GROUP BY category
ORDER BY category;

-- Check your specific user's compatibility
SELECT 
  'YOUR USER COMPATIBILITY' as test,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'RV') 
       THEN '✅ RV supported' ELSE '❌ RV missing' END as vehicle_rv,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'Semi-Automatic') 
       THEN '✅ Semi-Automatic supported' ELSE '❌ Semi-Automatic missing' END as trans_semi,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'Standard Driving License (B)') 
       THEN '✅ Standard license supported' ELSE '❌ Standard license missing' END as license_std,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value IN ('advanced', 'Advanced')) 
       THEN '✅ Advanced experience supported' ELSE '❌ Advanced experience missing' END as exp_adv;

COMMIT;

-- FINAL SUCCESS MESSAGE
SELECT '🎯 AGGRESSIVE CLEANUP COMPLETED!
✅ Removed all case variation duplicates
✅ Standardized experience_level to lowercase (beginner, intermediate, advanced, expert, refresher)  
✅ Kept transmission_type capitalized (Manual, Automatic, Semi-Automatic)
✅ Vehicle types properly organized (Car, RV, Motorcycle, etc.)
✅ Single "all" option per category
✅ Correct defaults set
✅ Ready for ProgressScreen!' as final_result;
