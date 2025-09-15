-- FLUSH ALL COLLECTION INVITATIONS
-- Run this in Supabase CLI SQL Editor to clean up all collection invitation data

-- 1. Delete all collection invitation notifications from notifications table
DELETE FROM notifications 
WHERE type = 'collection_invitation';

-- 2. Delete all collection sharing invitations from pending_invitations table
DELETE FROM pending_invitations 
WHERE role = 'collection_sharing' 
   OR (metadata->>'invitationType')::text = 'collection_sharing';

-- 3. Show what was deleted
SELECT 'Collection invitations flushed successfully!' as status;

-- 4. Show remaining data for verification
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
   OR (metadata->>'invitationType')::text = 'collection_sharing';
