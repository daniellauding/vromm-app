-- FIX MISSING COLLECTION_ID IN NOTIFICATIONS

-- 1. Check which notifications are missing collection_id
SELECT 'Notifications missing collection_id:' as info;
SELECT id, type, metadata
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  AND type = 'collection_invitation'
  AND (metadata->>'collection_id' IS NULL OR metadata->>'collection_id' = '');

-- 2. Delete the problematic notification that's missing collection_id
DELETE FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  AND type = 'collection_invitation'
  AND (metadata->>'collection_id' IS NULL OR metadata->>'collection_id' = '');

-- 3. Verify the fix
SELECT 'Remaining collection invitations:' as info;
SELECT id, type, metadata->>'collection_id' as collection_id, metadata->>'sharingRole' as sharing_role
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  AND type = 'collection_invitation';
