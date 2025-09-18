-- Debug what useUserCollections hook should be returning
-- This simulates the exact queries used in the hook

-- 1. Check owned collections (where user is creator)
-- Replace 'c16a364f-3bc4-4d60-bca9-460e977fddea' with your actual user ID
SELECT 
  'OWNED' as collection_type,
  id,
  name,
  description,
  visibility,
  creator_id,
  created_at,
  is_default,
  LENGTH(name) as name_length
FROM map_presets 
WHERE creator_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
ORDER BY is_default DESC, created_at DESC;

-- 2. Check public collections (where user is NOT creator)
SELECT 
  'PUBLIC' as collection_type,
  id,
  name,
  description,
  visibility,
  creator_id,
  created_at,
  is_default,
  LENGTH(name) as name_length
FROM map_presets 
WHERE visibility = 'public' 
  AND creator_id != 'c16a364f-3bc4-4d60-bca9-460e977fddea'
ORDER BY created_at DESC;

-- 3. Check member collections (where user is a member)
SELECT 
  'MEMBER' as collection_type,
  mp.id,
  mp.name,
  mp.description,
  mp.visibility,
  mp.creator_id,
  mp.created_at,
  mp.is_default,
  mpm.role as member_role,
  LENGTH(mp.name) as name_length
FROM map_preset_members mpm
JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mpm.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND mp.creator_id != 'c16a364f-3bc4-4d60-bca9-460e977fddea'
ORDER BY mp.created_at DESC;

-- 4. Check route counts for all collections
SELECT 
  mp.id,
  mp.name,
  mp.visibility,
  COUNT(mpr.route_id) as route_count
FROM map_presets mp
LEFT JOIN map_preset_routes mpr ON mp.id = mpr.preset_id
WHERE mp.visibility = 'public' OR mp.creator_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
GROUP BY mp.id, mp.name, mp.visibility
ORDER BY route_count DESC;

-- 5. Check if there are any collections with problematic names
SELECT 
  id,
  name,
  LENGTH(name) as name_length,
  CASE 
    WHEN name IS NULL THEN 'NULL'
    WHEN name = '' THEN 'EMPTY'
    WHEN TRIM(name) = '' THEN 'WHITESPACE'
    WHEN name LIKE '%\0%' THEN 'NULL_CHAR'
    WHEN name LIKE '%\r%' OR name LIKE '%\n%' THEN 'LINE_BREAK'
    ELSE 'OK'
  END as name_status,
  ENCODE(name::bytea, 'hex') as name_hex
FROM map_presets 
WHERE visibility = 'public' OR creator_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea';