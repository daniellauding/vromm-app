-- =====================================================
-- ROUTE DETAIL TRANSLATIONS UPDATE
-- =====================================================
-- This SQL adds the missing translations for RouteDetailSheet
-- including the exercises start/review button and additional info section
-- =====================================================

-- Add Swedish translations for route detail
INSERT INTO translations (key, language, value, created_at, updated_at)
VALUES 
  -- Additional Information section
  ('routeDetail.additionalInfo', 'sv', 'Ytterligare information', NOW(), NOW()),
  
  -- Exercise button translations
  ('routeDetail.startExercises', 'sv', 'Starta övningar', NOW(), NOW()),
  ('routeDetail.reviewExercises', 'sv', 'Granska övningar', NOW(), NOW()),
  
  -- Reviews and Comments accordion headers
  ('routeDetail.reviews', 'sv', 'Recensioner', NOW(), NOW()),
  ('routeDetail.comments', 'sv', 'Kommentarer', NOW(), NOW())

ON CONFLICT (key, language) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Add English translations for route detail
INSERT INTO translations (key, language, value, created_at, updated_at)
VALUES 
  -- Additional Information section
  ('routeDetail.additionalInfo', 'en', 'Additional Information', NOW(), NOW()),
  
  -- Exercise button translations
  ('routeDetail.startExercises', 'en', 'Start Exercises', NOW(), NOW()),
  ('routeDetail.reviewExercises', 'en', 'Review Exercises', NOW(), NOW()),
  
  -- Reviews and Comments accordion headers
  ('routeDetail.reviews', 'en', 'Reviews', NOW(), NOW()),
  ('routeDetail.comments', 'en', 'Comments', NOW(), NOW())

ON CONFLICT (key, language) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the translations were added correctly

-- Check Swedish translations
SELECT key, language, value 
FROM translations 
WHERE key IN (
  'routeDetail.additionalInfo',
  'routeDetail.startExercises', 
  'routeDetail.reviewExercises',
  'routeDetail.reviews',
  'routeDetail.comments'
) 
AND language = 'sv'
ORDER BY key;

-- Check English translations
SELECT key, language, value 
FROM translations 
WHERE key IN (
  'routeDetail.additionalInfo',
  'routeDetail.startExercises', 
  'routeDetail.reviewExercises',
  'routeDetail.reviews',
  'routeDetail.comments'
) 
AND language = 'en'
ORDER BY key;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This SQL adds the following translations:
-- 
-- Swedish (sv):
-- - routeDetail.additionalInfo: "Ytterligare information"
-- - routeDetail.startExercises: "Starta övningar" 
-- - routeDetail.reviewExercises: "Granska övningar"
-- - routeDetail.reviews: "Recensioner"
-- - routeDetail.comments: "Kommentarer"
--
-- English (en):
-- - routeDetail.additionalInfo: "Additional Information"
-- - routeDetail.startExercises: "Start Exercises"
-- - routeDetail.reviewExercises: "Review Exercises" 
-- - routeDetail.reviews: "Reviews"
-- - routeDetail.comments: "Comments"
--
-- These translations support:
-- 1. The accordion-style Additional Information section
-- 2. The dynamic exercise button (Start/Review based on completion)
-- 3. The new Reviews and Comments accordion headers
-- =====================================================
