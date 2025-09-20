-- CHECK WHAT NOTIFICATION TYPES ACTUALLY EXIST

-- 1. Check all unique notification types
SELECT 'All notification types:' as info;
SELECT DISTINCT type, COUNT(*) as count
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
GROUP BY type
ORDER BY count DESC;

-- 2. Check what notification types exist in the enum
SELECT 'Notification type enum values:' as info;
SELECT unnest(enum_range(NULL::notification_type)) as notification_type;
