-- Fix duplicate notifications for users already in collections
-- Run this in your Supabase SQL editor to clean up the notifications

-- 1. First, let's see what we're dealing with
SELECT 
    n.id,
    n.user_id,
    n.metadata->>'collection_id' as collection_id,
    n.metadata->>'collection_name' as collection_name,
    n.is_read,
    CASE 
        WHEN mpm.id IS NOT NULL THEN 'ALREADY_MEMBER'
        ELSE 'NOT_MEMBER'
    END as membership_status
FROM notifications n
LEFT JOIN map_preset_members mpm ON (
    mpm.preset_id = (n.metadata->>'collection_id')::uuid 
    AND mpm.user_id = n.user_id
)
WHERE n.type = 'collection_invitation'
AND n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' -- Your user ID
ORDER BY n.created_at DESC;

-- 2. Mark notifications as read for users who are already members
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
    AND n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' -- Your user ID
    AND n.is_read = false
    AND mpm.id IS NOT NULL -- User is already a member
);

-- 3. Verify the fix
SELECT 
    'After cleanup' as status,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = true THEN 1 END) as read_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications
FROM notifications 
WHERE type = 'collection_invitation'
AND user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea';
