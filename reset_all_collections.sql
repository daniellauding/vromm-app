-- Reset All Collections and Related Database Entries
-- This script will completely reset all collection-related data

-- 1. Remove all collection members
DELETE FROM map_preset_members;

-- 2. Remove all pending invitations
DELETE FROM pending_invitations;

-- 3. Remove all collection invitations
DELETE FROM collection_invitations;

-- 4. Remove all collection-related notifications
DELETE FROM notifications 
WHERE type IN ('collection_invitation', 'collection_sharing', 'collection_member_added', 'collection_member_removed');

-- 5. Remove all map presets (collections)
DELETE FROM map_presets;

-- 6. Reset any collection-related user preferences
UPDATE profiles 
SET 
  total_routes_created = 0,
  updated_at = NOW()
WHERE total_routes_created > 0;

-- 7. Clean up any orphaned data
-- Remove any notifications that reference non-existent collections
DELETE FROM notifications 
WHERE metadata->>'collection_id' IS NOT NULL 
AND metadata->>'collection_id' NOT IN (SELECT id::text FROM map_presets);

-- 8. Reset sequences if they exist (optional)
-- ALTER SEQUENCE map_presets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE map_preset_members_id_seq RESTART WITH 1;
-- ALTER SEQUENCE pending_invitations_id_seq RESTART WITH 1;

-- 9. Verify cleanup
SELECT 
  'map_presets' as table_name, COUNT(*) as count FROM map_presets
UNION ALL
SELECT 
  'map_preset_members' as table_name, COUNT(*) as count FROM map_preset_members
UNION ALL
SELECT 
  'pending_invitations' as table_name, COUNT(*) as count FROM pending_invitations
UNION ALL
SELECT 
  'collection_invitations' as table_name, COUNT(*) as count FROM collection_invitations
UNION ALL
SELECT 
  'collection_notifications' as table_name, COUNT(*) as count FROM notifications 
  WHERE type IN ('collection_invitation', 'collection_sharing', 'collection_member_added', 'collection_member_removed');

-- 10. Show remaining users for reference
SELECT 
  id, 
  email, 
  full_name, 
  role,
  total_routes_created
FROM profiles 
ORDER BY created_at;
