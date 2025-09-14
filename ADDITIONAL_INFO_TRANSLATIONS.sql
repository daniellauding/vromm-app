-- =====================================================
-- ADDITIONAL INFO TRANSLATIONS
-- =====================================================
-- This SQL ensures the "Additional Information" section
-- translations are properly added to the database
-- =====================================================

-- Add Swedish translations for additional info section
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- Additional Information section
  ('routeDetail.additionalInfo', 'sv', 'Ytterligare information', 'mobile', NOW(), NOW()),
  
  -- Reviews and Comments accordion headers
  ('routeDetail.reviews', 'sv', 'Recensioner', 'mobile', NOW(), NOW()),
  ('routeDetail.comments', 'sv', 'Kommentarer', 'mobile', NOW(), NOW()),
  
  -- Exercise button translations
  ('routeDetail.startExercises', 'sv', 'Starta övningar', 'mobile', NOW(), NOW()),
  ('routeDetail.reviewExercises', 'sv', 'Granska övningar', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Add English translations for additional info section
INSERT INTO translations (key, language, value, platform, created_at, updated_at)
VALUES 
  -- Additional Information section
  ('routeDetail.additionalInfo', 'en', 'Additional Information', 'mobile', NOW(), NOW()),
  
  -- Reviews and Comments accordion headers
  ('routeDetail.reviews', 'en', 'Reviews', 'mobile', NOW(), NOW()),
  ('routeDetail.comments', 'en', 'Comments', 'mobile', NOW(), NOW()),
  
  -- Exercise button translations
  ('routeDetail.startExercises', 'en', 'Start Exercises', 'mobile', NOW(), NOW()),
  ('routeDetail.reviewExercises', 'en', 'Review Exercises', 'mobile', NOW(), NOW())
ON CONFLICT (key, language, platform) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the translations were added
SELECT key, language, value 
FROM translations 
WHERE key IN (
  'routeDetail.additionalInfo',
  'routeDetail.reviews', 
  'routeDetail.comments',
  'routeDetail.startExercises',
  'routeDetail.reviewExercises'
)
ORDER BY key, language;
