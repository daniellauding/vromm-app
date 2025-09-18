-- Clean up notifications for users who are already members of collections
-- This will mark notifications as read for users who are already in the collections

-- 1. Find notifications where the user is already a member of the collection
SELECT 
    n.id as notification_id,
    n.user_id,
    n.metadata->>'collection_id' as collection_id,
    n.metadata->>'collection_name' as collection_name,
    n.is_read,
    mpm.id as membership_id,
    mpm.role as membership_role
FROM notifications n
LEFT JOIN map_preset_members mpm ON (
    mpm.preset_id = (n.metadata->>'collection_id')::uuid 
    AND mpm.user_id = n.user_id
)
WHERE n.type = 'collection_invitation'
AND n.is_read = false
AND mpm.id IS NOT NULL; -- User is already a member

-- 2. Mark these notifications as read
UPDATE notifications 
SET 
    is_read = true,
    read_at = NOW()
WHERE id IN (
    SELECT n.id
    FROM notifications n
    LEFT JOIN map_preset_members mpm ON (
        mpm.preset_id = (n.metadata->>'collection_id')::uuid 
        AND mpm.user_id = n.user_id
    )
    WHERE n.type = 'collection_invitation'
    AND n.is_read = false
    AND mpm.id IS NOT NULL -- User is already a member
);

-- 3. Check the results
SELECT 
    'After cleanup' as status,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = true THEN 1 END) as read_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications
FROM notifications 
WHERE type = 'collection_invitation';
