-- CHECK AND FIX MISSING COLLECTION

-- 1. Check if the collection exists
SELECT 'Checking collection existence:' as info;
SELECT id, name, created_at
FROM map_presets 
WHERE id = '47e86765-c619-4be5-94cf-bd499b8faee1';

-- 2. Check what collections exist
SELECT 'Available collections:' as info;
SELECT id, name, created_at
FROM map_presets 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check notifications that reference this collection
SELECT 'Notifications referencing missing collection:' as info;
SELECT id, type, metadata->>'collection_id' as collection_id, created_at
FROM notifications 
WHERE metadata->>'collection_id' = '47e86765-c619-4be5-94cf-bd499b8faee1';

-- 4. If collection doesn't exist, we can either:
--    a) Delete the problematic notifications
--    b) Create a dummy collection
--    c) Update notifications to reference an existing collection

-- Option A: Delete problematic notifications (RECOMMENDED)
DELETE FROM notifications 
WHERE metadata->>'collection_id' = '47e86765-c619-4be5-94cf-bd499b8faee1'
  AND type = 'collection_invitation';

-- 5. Verify the fix
SELECT 'Remaining collection invitations:' as info;
SELECT id, type, metadata->>'collection_id' as collection_id
FROM notifications 
WHERE type = 'collection_invitation'
  AND metadata->>'collection_id' IS NOT NULL;
