-- Fix schools.is_active field to use proper boolean values
-- Your data has string 'true' instead of boolean true

-- First, let's see what we have
SELECT id, name, is_active, pg_typeof(is_active) as type_of_is_active 
FROM public.schools 
LIMIT 5;

-- Update string 'true' to boolean true, string 'false' to boolean false
UPDATE public.schools 
SET is_active = CASE 
  WHEN is_active::text = 'true' THEN true
  WHEN is_active::text = 'false' THEN false
  ELSE true  -- default to true for any other values
END;

-- Verify the fix
SELECT id, name, is_active, pg_typeof(is_active) as type_of_is_active 
FROM public.schools 
ORDER BY name;

SELECT 'Schools is_active field fixed - now using proper boolean values!' as status; 