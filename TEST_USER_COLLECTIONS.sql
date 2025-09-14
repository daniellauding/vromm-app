-- Test script to verify collections exist for the specific user
-- User ID: 5ee16b4f-5ef9-41bd-b571-a9dc895027c1

-- Test 1: Check if collections exist for this user as creator
SELECT 
  'OWNED TEST' as test_type,
  COUNT(*) as count,
  array_agg(name) as collection_names
FROM map_presets 
WHERE creator_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- Test 2: Check if user is a member of any collections
SELECT 
  'MEMBER TEST' as test_type,
  COUNT(*) as count,
  array_agg(mp.name) as collection_names
FROM map_preset_members mpm
JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mpm.user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- Test 3: Check all collections for this user (owned + member)
SELECT 
  'COMBINED TEST' as test_type,
  COUNT(*) as count,
  array_agg(DISTINCT mp.name) as collection_names
FROM (
  -- Owned collections
  SELECT id, name, creator_id, 'owned' as type
  FROM map_presets 
  WHERE creator_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  
  UNION
  
  -- Member collections
  SELECT mp.id, mp.name, mp.creator_id, 'member' as type
  FROM map_preset_members mpm
  JOIN map_presets mp ON mpm.preset_id = mp.id
  WHERE mpm.user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
) mp;

-- Test 4: Check if there are any RLS issues
SELECT 
  'RLS TEST' as test_type,
  COUNT(*) as count
FROM map_presets 
WHERE creator_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  OR id IN (
    SELECT preset_id 
    FROM map_preset_members 
    WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  );
