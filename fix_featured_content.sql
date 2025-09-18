-- Quick fix to set some learning paths and exercises as featured
-- This will make them appear in the mobile app's FeaturedContent section

-- Set some learning paths as featured
UPDATE learning_paths 
SET is_featured = true 
WHERE id IN (
  '5ce8797e-df4d-4da0-94b4-3e76eb3f0d2a', -- Driving on a Motorway
  '6b36d32b-6723-459a-9f25-5fd70828ea2d', -- Night Driving  
  '5e796162-7e41-4d4e-860e-6bb36be01b50'  -- Driving Test
);

-- Set some exercises as featured
UPDATE learning_path_exercises 
SET is_featured = true 
WHERE id IN (
  'd3ef2361-26a6-445b-81c8-8cce90ac63a1', -- Gentle Acceleration
  '507ab070-c7ad-4a2e-a410-e48b1c672b84', -- Steering Wheel Grip
  'e6550e7f-767f-49f8-a275-e73d5c62ebe3'  -- Action Decision
);

-- Verify the changes
SELECT 'Featured Learning Paths:' as status;
SELECT id, title->>'en' as title, is_featured FROM learning_paths WHERE is_featured = true;

SELECT 'Featured Exercises:' as status;  
SELECT id, title->>'en' as title, learning_path_id, is_featured FROM learning_path_exercises WHERE is_featured = true;
