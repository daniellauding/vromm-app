-- Check for duplicate collections and legacy VROMM collections
SELECT 
  id,
  name,
  creator_id,
  visibility,
  is_default,
  created_at,
  (SELECT COUNT(*) FROM map_preset_routes WHERE preset_id = map_presets.id) as route_count
FROM map_presets 
ORDER BY 
  name,
  created_at DESC;

-- Check for collections with similar names (potential duplicates)
SELECT 
  name,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids,
  STRING_AGG(creator_id::text, ', ') as creators
FROM map_presets 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Check for VROMM collections (legacy)
SELECT 
  id,
  name,
  creator_id,
  visibility,
  is_default,
  created_at
FROM map_presets 
WHERE name ILIKE '%vromm%' 
ORDER BY created_at DESC;

-- Check total public routes (should be 149)
SELECT COUNT(*) as total_public_routes
FROM routes 
WHERE visibility = 'public' OR visibility IS NULL;
