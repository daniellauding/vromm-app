-- Clean up duplicate "My Routes" collections
-- Keep the newer one (with routes) and delete the older empty one

-- First, let's see which "My Routes" collection has routes
SELECT 
  id,
  name,
  created_at,
  (SELECT COUNT(*) FROM map_preset_routes WHERE preset_id = map_presets.id) as route_count
FROM map_presets 
WHERE name = 'My Routes' 
  AND creator_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
ORDER BY created_at DESC;

-- Delete the older empty "My Routes" collection (4e7736f2-8bca-4ae9-a6a8-0a2e83cfd44a)
-- This one has 0 routes and was created earlier
DELETE FROM map_presets 
WHERE id = '4e7736f2-8bca-4ae9-a6a8-0a2e83cfd44a'
  AND name = 'My Routes'
  AND creator_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- Verify the cleanup
SELECT 
  id,
  name,
  creator_id,
  visibility,
  is_default,
  created_at,
  (SELECT COUNT(*) FROM map_preset_routes WHERE preset_id = map_presets.id) as route_count
FROM map_presets 
ORDER BY name, created_at DESC;
