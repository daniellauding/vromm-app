-- Add test featured content to the database
-- This script will mark some existing learning paths and exercises as featured

-- First, let's see what learning paths exist
SELECT id, title, is_featured, active FROM learning_paths LIMIT 5;

-- Mark some specific learning paths as featured (based on your data)
UPDATE learning_paths 
SET is_featured = true 
WHERE id IN (
  '8bcec2ae-5ea3-4e0e-97ae-cb4e80fd14da', -- Signs & Situations
  '6b4856cf-77fc-4e62-a7bd-224221dcf4ce', -- Driving Position
  '5ce8797e-df4d-4da0-94b4-3e76eb3f0d2a'  -- Driving on a Motorway
);

-- Let's see what exercises exist
SELECT id, title, learning_path_id, is_featured FROM learning_path_exercises LIMIT 5;

-- Mark some specific exercises as featured (based on your data)
UPDATE learning_path_exercises 
SET is_featured = true 
WHERE id IN (
  '5483df72-83d9-4cb6-ae78-5dddaa5e26e1', -- Spot the Sign
  'd3ef2361-26a6-445b-81c8-8cce90ac63a1', -- Gentle Acceleration
  '507ab070-c7ad-4a2e-a410-e48b1c672b84'  -- Steering Wheel Grip
);

-- Verify the changes
SELECT 'Featured Learning Paths:' as type, id, title->>'en' as title, is_featured 
FROM learning_paths 
WHERE is_featured = true AND active = true
UNION ALL
SELECT 'Featured Exercises:' as type, id, title->>'en' as title, is_featured 
FROM learning_path_exercises 
WHERE is_featured = true;
