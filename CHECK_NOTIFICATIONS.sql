-- CHECK NOTIFICATIONS - SEE WHAT'S ACTUALLY THERE

-- 1. Check all notifications for the user
SELECT 'All notifications for user:' as info;
SELECT id, type, message, metadata, created_at, is_read
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
ORDER BY created_at DESC;

-- 2. Check specific notification that's causing issues
SELECT 'Specific notification details:' as info;
SELECT id, type, message, metadata, actor_id, created_at
FROM notifications 
WHERE id = '91375139-fea6-450a-9969-59f72097c752';

-- 3. Check if any collections exist
SELECT 'Available collections:' as info;
SELECT id, name, created_at
FROM map_presets 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check what's in the metadata
SELECT 'Notification metadata analysis:' as info;
SELECT 
  id,
  type,
  metadata->>'collection_id' as collection_id,
  metadata->>'sharingRole' as sharing_role,
  metadata->>'from_user_name' as from_user_name,
  metadata
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
ORDER BY created_at DESC;
