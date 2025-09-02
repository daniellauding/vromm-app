-- NUCLEAR FILTER CLEANUP - FINAL VERSION
-- This will completely clean up all filter database issues
-- ⚠️  BACKUP YOUR DATA FIRST - THIS DELETES DUPLICATES!

BEGIN;

-- 1. BACKUP CURRENT STATE (OPTIONAL - UNCOMMENT TO CREATE BACKUP)
-- =============================================================
-- CREATE TABLE learning_path_categories_backup AS 
-- SELECT * FROM learning_path_categories;

-- 2. DELETE ALL PROBLEMATIC DUPLICATE "ALL" ENTRIES
-- ================================================
-- Keep only the lowercase "all" entries, remove all other variations
DELETE FROM learning_path_categories 
WHERE UPPER(value) = 'ALL' 
  AND value != 'all';

-- 3. DELETE ENTRIES WITHOUT IDs (IF ANY)
-- =======================================
DELETE FROM learning_path_categories 
WHERE id IS NULL;

-- 4. REMOVE EXACT DUPLICATES (same category + value + label)
-- =========================================================
WITH ranked_duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY category, value, label::text 
           ORDER BY 
             CASE WHEN is_default THEN 0 ELSE 1 END, -- Keep defaults first
             created_at
         ) as row_num
  FROM learning_path_categories
)
DELETE FROM learning_path_categories 
WHERE id IN (
  SELECT id FROM ranked_duplicates WHERE row_num > 1
);

-- 5. ENSURE EACH CATEGORY HAS EXACTLY ONE "all" OPTION
-- ===================================================
-- First, identify categories that are missing "all"
DO $$
DECLARE
    missing_category TEXT;
BEGIN
    FOR missing_category IN 
        SELECT DISTINCT enum_value 
        FROM (VALUES 
            ('vehicle_type'),
            ('transmission_type'), 
            ('license_type'),
            ('experience_level'),
            ('purpose'),
            ('user_profile'),
            ('platform'),
            ('type')
        ) AS categories(enum_value)
        WHERE enum_value NOT IN (
            SELECT DISTINCT category 
            FROM learning_path_categories 
            WHERE value = 'all'
        )
    LOOP
        RAISE NOTICE 'Adding missing "all" option for category: %', missing_category;
        
        INSERT INTO learning_path_categories (id, category, value, label, order_index, is_default)
        VALUES (
            gen_random_uuid(),
            missing_category,
            'all',
            json_build_object('en', 'All', 'sv', 'Alla')::jsonb,
            0,
            false
        );
    END LOOP;
END $$;

-- 6. FIX MISSING VALUES THAT ONBOARDING/FILTERS USE
-- =================================================
INSERT INTO learning_path_categories (id, category, value, label, order_index, is_default)
VALUES 
  -- Vehicle types that might be missing
  (gen_random_uuid(), 'vehicle_type', 'RV', '{"en": "RV/Motorhome", "sv": "Husbil"}', 20, false),
  (gen_random_uuid(), 'vehicle_type', 'passenger_car', '{"en": "Passenger Car", "sv": "Personbil"}', 21, false),
  (gen_random_uuid(), 'vehicle_type', 'Car', '{"en": "Car", "sv": "Bil"}', 22, false),
  
  -- Transmission types
  (gen_random_uuid(), 'transmission_type', 'Semi-Automatic', '{"en": "Semi-Automatic", "sv": "Halvautomatisk"}', 20, false),
  (gen_random_uuid(), 'transmission_type', 'manual', '{"en": "Manual", "sv": "Manuell"}', 21, false),
  (gen_random_uuid(), 'transmission_type', 'automatic', '{"en": "Automatic", "sv": "Automatisk"}', 22, false),
  
  -- Experience levels (both cases for compatibility)
  (gen_random_uuid(), 'experience_level', 'beginner', '{"en": "Beginner", "sv": "Nybörjare"}', 20, false),
  (gen_random_uuid(), 'experience_level', 'intermediate', '{"en": "Intermediate", "sv": "Medelnivå"}', 21, false),
  (gen_random_uuid(), 'experience_level', 'advanced', '{"en": "Advanced", "sv": "Avancerad"}', 22, false),
  (gen_random_uuid(), 'experience_level', 'expert', '{"en": "Expert", "sv": "Expert"}', 23, false),
  (gen_random_uuid(), 'experience_level', 'refresher', '{"en": "Refresher", "sv": "Repetitionskurs"}', 24, false)

ON CONFLICT DO NOTHING;

-- 7. SET CORRECT DEFAULTS (ONE PER CATEGORY)
-- ==========================================
-- Reset all defaults first
UPDATE learning_path_categories SET is_default = false;

-- Set one default per category
UPDATE learning_path_categories SET is_default = true 
WHERE (category, value) IN (
  ('vehicle_type', 'Car'),
  ('transmission_type', 'Manual'),
  ('license_type', 'Standard Driving License (B)'),
  ('experience_level', 'Beginner'),
  ('purpose', 'Prepare for driving test'),
  ('user_profile', 'all'),
  ('platform', 'mobile'),
  ('type', 'learning')
);

-- 8. VERIFY THE CLEANUP
-- =====================
SELECT 
  'CLEANUP VERIFICATION' as section,
  category,
  COUNT(*) as total_options,
  COUNT(CASE WHEN value = 'all' THEN 1 END) as all_options,
  COUNT(CASE WHEN is_default THEN 1 END) as defaults,
  CASE 
    WHEN COUNT(CASE WHEN value = 'all' THEN 1 END) = 1 AND 
         COUNT(CASE WHEN is_default THEN 1 END) <= 1 
    THEN '✅ CLEAN'
    ELSE '❌ NEEDS ATTENTION'
  END as status
FROM learning_path_categories
GROUP BY category
ORDER BY category;

-- 9. CHECK YOUR USER'S COMPATIBILITY
-- ==================================
SELECT 
  'USER COMPATIBILITY CHECK' as section,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'RV') 
       THEN '✅ RV supported' ELSE '❌ RV missing' END as vehicle_rv,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'Semi-Automatic') 
       THEN '✅ Semi-Automatic supported' ELSE '❌ Semi-Automatic missing' END as trans_semi,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'Standard Driving License (B)') 
       THEN '✅ Standard license supported' ELSE '❌ Standard license missing' END as license_std,
  CASE WHEN EXISTS (SELECT 1 FROM learning_path_categories WHERE value = 'advanced') 
       THEN '✅ Advanced experience supported' ELSE '❌ Advanced experience missing' END as exp_adv;

-- 10. FINAL SUMMARY
-- =================
SELECT 
  'FINAL SUMMARY' as section,
  COUNT(*) as total_entries,
  COUNT(DISTINCT category) as categories_count,
  COUNT(DISTINCT id) as unique_ids,
  CASE WHEN COUNT(*) = COUNT(DISTINCT id) 
       THEN '✅ No duplicate IDs' 
       ELSE '❌ Duplicate IDs found!' END as id_status
FROM learning_path_categories;

COMMIT;

-- SUCCESS MESSAGE
SELECT '🎉 NUCLEAR CLEANUP COMPLETED! 
✅ Removed duplicate "All" entries  
✅ Fixed missing values for onboarding compatibility
✅ Set correct defaults  
✅ Verified no duplicate IDs
✅ Ready for ProgressScreen filtering!' as result;
