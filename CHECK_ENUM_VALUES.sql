-- Check what enum values are actually defined in the database
-- Copy-paste this to Supabase SQL Editor to see valid values

SELECT enumlabel as valid_experience_levels
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'experience_level'
)
ORDER BY enumlabel;

-- Also check learning_path_categories for experience_level entries
SELECT 
  value,
  label,
  order_index,
  is_default
FROM learning_path_categories 
WHERE category = 'experience_level'
ORDER BY order_index;
