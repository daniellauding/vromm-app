-- FLUSH ALL COLLECTION DATA (INVITATIONS + MEMBERSHIPS)
-- Run this in Supabase CLI SQL Editor to completely clean up collection data

-- 1. Delete all collection invitation notifications from notifications table
DELETE FROM notifications 
WHERE type = 'collection_invitation';

-- 2. Delete all collection sharing invitations from pending_invitations table
DELETE FROM pending_invitations 
WHERE role = 'collection_sharing' 
   OR (metadata->>'invitationType')::text = 'collection_sharing';

-- 3. Delete all collection memberships for the current user
-- Replace '06c73e75-0ef7-442b-acd0-ee204f83d1aa' with your actual user ID
DELETE FROM map_preset_members 
WHERE user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa';

-- 4. Delete all collection routes for collections the user was a member of
-- (This removes routes from shared collections)
DELETE FROM map_preset_routes 
WHERE preset_id IN (
  SELECT preset_id FROM map_preset_members 
  WHERE user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
);

-- 5. Show what was deleted
SELECT 'All collection data flushed successfully!' as status;

-- 6. Show remaining data for verification
SELECT 
  'notifications' as table_name,
  COUNT(*) as remaining_count
FROM notifications 
WHERE type = 'collection_invitation'

UNION ALL

SELECT 
  'pending_invitations' as table_name,
  COUNT(*) as remaining_count
FROM pending_invitations 
WHERE role = 'collection_sharing' 
   OR (metadata->>'invitationType')::text = 'collection_sharing'

UNION ALL

SELECT 
  'map_preset_members' as table_name,
  COUNT(*) as remaining_count
FROM map_preset_members 
WHERE user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'

UNION ALL

SELECT 
  'map_preset_routes' as table_name,
  COUNT(*) as remaining_count
FROM map_preset_routes 
WHERE preset_id IN (
  SELECT preset_id FROM map_preset_members 
  WHERE user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
);
