-- Test script to set some learning paths and exercises as featured
-- This will help you test the new featured sections on the home screen

-- First, let's see what learning paths we have
SELECT 
  id, 
  title->>'en' as title_en, 
  title->>'sv' as title_sv,
  is_featured,
  active,
  created_at
FROM learning_paths 
ORDER BY created_at DESC 
LIMIT 10;

-- Set some learning paths as featured (replace IDs with actual ones from your database)
-- You can run this after checking the IDs above
UPDATE learning_paths 
SET is_featured = true 
WHERE id IN (
  -- Replace these with actual IDs from your database
  SELECT id FROM learning_paths 
  WHERE active = true 
  ORDER BY created_at DESC 
  LIMIT 3
);

-- Check learning path exercises
SELECT 
  lpe.id,
  lpe.title->>'en' as title_en,
  lpe.title->>'sv' as title_sv,
  lpe.is_featured,
  lp.title->>'en' as path_title
FROM learning_path_exercises lpe
JOIN learning_paths lp ON lpe.learning_path_id = lp.id
WHERE lp.active = true
ORDER BY lpe.created_at DESC
LIMIT 10;

-- Set some exercises as featured (replace IDs with actual ones)
UPDATE learning_path_exercises 
SET is_featured = true 
WHERE id IN (
  -- Replace these with actual IDs from your database
  SELECT lpe.id 
  FROM learning_path_exercises lpe
  JOIN learning_paths lp ON lpe.learning_path_id = lp.id
  WHERE lp.active = true 
  ORDER BY lpe.created_at DESC 
  LIMIT 5
);

-- Verify the featured content
SELECT 
  'Learning Paths' as type,
  COUNT(*) as featured_count
FROM learning_paths 
WHERE is_featured = true AND active = true

UNION ALL

SELECT 
  'Exercises' as type,
  COUNT(*) as featured_count
FROM learning_path_exercises lpe
JOIN learning_paths lp ON lpe.learning_path_id = lp.id
WHERE lpe.is_featured = true AND lp.active = true;

-- Show featured learning paths
SELECT 
  'Featured Learning Paths:' as info,
  title->>'en' as title,
  description->>'en' as description,
  is_featured
FROM learning_paths 
WHERE is_featured = true AND active = true
ORDER BY created_at DESC;

-- Show featured exercises
SELECT 
  'Featured Exercises:' as info,
  lpe.title->>'en' as exercise_title,
  lp.title->>'en' as path_title,
  lpe.is_featured
FROM learning_path_exercises lpe
JOIN learning_paths lp ON lpe.learning_path_id = lp.id
WHERE lpe.is_featured = true AND lp.active = true
ORDER BY lpe.created_at DESC;
