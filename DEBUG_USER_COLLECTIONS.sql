-- Debug script to check what collections exist for a specific user
-- Replace '06c73e75-0ef7-442b-acd0-ee204f83d1aa' with the actual user ID you want to check

-- Check collections where user is the creator
SELECT 
  'OWNED' as type,
  mp.id,
  mp.name,
  mp.visibility,
  mp.creator_id,
  mp.created_at,
  COUNT(mpr.route_id) as route_count
FROM map_presets mp
LEFT JOIN map_preset_routes mpr ON mp.id = mpr.preset_id
WHERE mp.creator_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
GROUP BY mp.id, mp.name, mp.visibility, mp.creator_id, mp.created_at
ORDER BY mp.is_default DESC, mp.created_at DESC;

-- Check collections where user is a member (but not creator)
SELECT 
  'MEMBER' as type,
  mp.id,
  mp.name,
  mp.visibility,
  mp.creator_id,
  mp.created_at,
  COUNT(mpr.route_id) as route_count
FROM map_preset_members mpm
JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN map_preset_routes mpr ON mp.id = mpr.preset_id
WHERE mpm.user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND mp.creator_id != '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
GROUP BY mp.id, mp.name, mp.visibility, mp.creator_id, mp.created_at
ORDER BY mp.created_at DESC;

-- Check all collections in the system (for debugging)
SELECT 
  'ALL' as type,
  mp.id,
  mp.name,
  mp.visibility,
  mp.creator_id,
  mp.created_at,
  COUNT(mpr.route_id) as route_count
FROM map_presets mp
LEFT JOIN map_preset_routes mpr ON mp.id = mpr.preset_id
GROUP BY mp.id, mp.name, mp.visibility, mp.creator_id, mp.created_at
ORDER BY mp.created_at DESC
LIMIT 20;
