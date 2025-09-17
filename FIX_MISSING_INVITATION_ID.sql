-- Fix missing invitation_id in existing collection sharing notifications
-- This script finds notifications with missing invitation_id and updates them

-- 1. First, let's see what notifications have missing invitation_id
SELECT 
    n.id as notification_id,
    n.user_id,
    n.actor_id,
    n.metadata->>'collection_id' as collection_id,
    n.metadata->>'collection_name' as collection_name,
    n.metadata->>'invitation_id' as invitation_id,
    n.created_at
FROM notifications n
WHERE n.type = 'collection_invitation'
  AND (n.metadata->>'invitation_id' IS NULL OR n.metadata->>'invitation_id' = '')
ORDER BY n.created_at DESC;

-- 2. Update notifications with missing invitation_id by finding the corresponding pending_invitation
UPDATE notifications 
SET metadata = jsonb_set(
    metadata, 
    '{invitation_id}', 
    to_jsonb(pi.id::text)
)
FROM pending_invitations pi
WHERE notifications.type = 'collection_invitation'
  AND (notifications.metadata->>'invitation_id' IS NULL OR notifications.metadata->>'invitation_id' = '')
  AND notifications.metadata->>'collection_id' = pi.metadata->>'collectionId'
  AND notifications.actor_id = pi.invited_by
  AND notifications.user_id::text = pi.metadata->>'targetUserId'
  AND pi.role = 'collection_sharing'
  AND pi.status = 'pending';

-- 3. Verify the fix
SELECT 
    n.id as notification_id,
    n.user_id,
    n.actor_id,
    n.metadata->>'collection_id' as collection_id,
    n.metadata->>'collection_name' as collection_name,
    n.metadata->>'invitation_id' as invitation_id,
    n.created_at
FROM notifications n
WHERE n.type = 'collection_invitation'
ORDER BY n.created_at DESC;

-- 4. Check if there are any remaining notifications with missing invitation_id
SELECT COUNT(*) as notifications_with_missing_invitation_id
FROM notifications 
WHERE type = 'collection_invitation'
  AND (metadata->>'invitation_id' IS NULL OR metadata->>'invitation_id' = '');
