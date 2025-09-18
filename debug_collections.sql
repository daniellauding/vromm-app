-- Debug collections data to see what's actually in the database
-- This will help us understand if the issue is with data retrieval or display

-- 1. Check all collections in map_presets table
SELECT 
  id,
  name,
  description,
  visibility,
  creator_id,
  created_at,
  updated_at,
  is_default,
  allow_public_edit,
  LENGTH(name) as name_length,
  pg_typeof(name) as name_type
FROM map_presets 
ORDER BY created_at DESC;

-- 2. Check if there are any NULL or empty names
SELECT 
  id,
  name,
  CASE 
    WHEN name IS NULL THEN 'NULL'
    WHEN name = '' THEN 'EMPTY_STRING'
    WHEN TRIM(name) = '' THEN 'WHITESPACE_ONLY'
    ELSE 'HAS_CONTENT'
  END as name_status,
  LENGTH(name) as name_length
FROM map_presets 
WHERE name IS NULL OR name = '' OR TRIM(name) = '';

-- 3. Check the specific collections that should be showing
SELECT 
  id,
  name,
  visibility,
  creator_id,
  is_default,
  LENGTH(name) as name_length,
  ASCII(SUBSTR(name, 1, 1)) as first_char_ascii,
  ASCII(SUBSTR(name, -1, 1)) as last_char_ascii
FROM map_presets 
WHERE visibility = 'public' 
ORDER BY created_at DESC;

-- 4. Check if there are any special characters or encoding issues
SELECT 
  id,
  name,
  ENCODE(name::bytea, 'hex') as name_hex,
  LENGTH(name) as name_length,
  LENGTH(TRIM(name)) as trimmed_length
FROM map_presets 
WHERE name IS NOT NULL;

-- 5. Check route counts for collections
SELECT 
  mp.id,
  mp.name,
  mp.visibility,
  COUNT(mpr.route_id) as route_count
FROM map_presets mp
LEFT JOIN map_preset_routes mpr ON mp.id = mpr.preset_id
GROUP BY mp.id, mp.name, mp.visibility
ORDER BY route_count DESC;