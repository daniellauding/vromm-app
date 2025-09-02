-- DEBUG FILTER ISSUES
-- Copy-paste this SQL to see what's causing the problems

-- 1. CHECK FOR DUPLICATE IDs (causing React key warning)
-- =====================================================
SELECT 
  id,
  category,
  value,
  label::jsonb->>'en' as english_label,
  COUNT(*) OVER (PARTITION BY id) as duplicate_count,
  CASE WHEN COUNT(*) OVER (PARTITION BY id) > 1 THEN '❌ DUPLICATE ID' ELSE '✅ UNIQUE ID' END as status
FROM learning_path_categories
WHERE COUNT(*) OVER (PARTITION BY id) > 1 OR category = 'vehicle_type'
ORDER BY duplicate_count DESC, category, value;

-- 2. CHECK FOR MULTIPLE "ALL" ENTRIES (causing duplicate All, All, all)
-- =====================================================================
SELECT 
  category,
  value,
  label::jsonb->>'en' as english_label,
  COUNT(*) as entries_count,
  STRING_AGG(id::text, ', ') as all_ids
FROM learning_path_categories
WHERE LOWER(value) LIKE '%all%' OR value = 'All' OR value = 'all'
GROUP BY category, value, label
HAVING COUNT(*) >= 1
ORDER BY category, value;

-- 3. CHECK VEHICLE_TYPE SPECIFICALLY (your main issue)
-- ====================================================
SELECT 
  'VEHICLE_TYPE ANALYSIS' as section,
  id,
  value,
  label::jsonb->>'en' as english_label,
  is_default,
  order_index,
  CASE 
    WHEN LOWER(value) LIKE '%all%' THEN '🔧 Filter Option'
    WHEN is_default THEN '⭐ Default'
    ELSE '📋 Regular'
  END as entry_type
FROM learning_path_categories
WHERE category = 'vehicle_type'
ORDER BY 
  CASE WHEN LOWER(value) LIKE '%all%' THEN 0 ELSE 1 END,
  order_index;

-- 4. CHECK LICENSE_TYPE SPECIFICALLY (filtering not working)
-- ========================================================
SELECT 
  'LICENSE_TYPE ANALYSIS' as section,
  id,
  value,
  label::jsonb->>'en' as english_label,
  is_default,
  order_index
FROM learning_path_categories
WHERE category = 'license_type'
ORDER BY 
  CASE WHEN LOWER(value) LIKE '%all%' THEN 0 ELSE 1 END,
  order_index;

-- 5. NUCLEAR CLEANUP - RUN ONLY IF NEEDED
-- =======================================
-- Uncomment these if you want to completely clean up duplicates:

/*
-- Delete all duplicate "All" variants, keep only one per category
WITH ranked_entries AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY category, LOWER(value) 
           ORDER BY 
             CASE WHEN value = 'all' THEN 1 
                  WHEN value = 'All' THEN 2 
                  ELSE 3 END,
             created_at
         ) as row_num
  FROM learning_path_categories
  WHERE LOWER(value) LIKE '%all%'
)
DELETE FROM learning_path_categories 
WHERE id IN (
  SELECT id FROM ranked_entries WHERE row_num > 1
);
*/
