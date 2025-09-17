-- Flush all collection sharing invitations and members for testing
-- This will clean up all existing data so we can test with fresh invitations

-- 1. Delete all collection sharing notifications
DELETE FROM notifications 
WHERE type = 'collection_invitation';

-- 2. Delete all collection members (accepted invitations)
DELETE FROM map_preset_members;

-- 3. Delete all pending collection sharing invitations
DELETE FROM pending_invitations 
WHERE role = 'collection_sharing';

-- 4. Verify cleanup
SELECT 
    '=== CLEANUP VERIFICATION ===' as section,
    'Collection sharing notifications' as table_name,
    COUNT(*) as remaining_count
FROM notifications 
WHERE type = 'collection_invitation'

UNION ALL

SELECT 
    '=== CLEANUP VERIFICATION ===' as section,
    'Collection members' as table_name,
    COUNT(*) as remaining_count
FROM map_preset_members

UNION ALL

SELECT 
    '=== CLEANUP VERIFICATION ===' as section,
    'Pending collection invitations' as table_name,
    COUNT(*) as remaining_count
FROM pending_invitations 
WHERE role = 'collection_sharing';

-- 5. Show remaining collections (these should stay)
SELECT 
    '=== REMAINING COLLECTIONS ===' as section,
    mp.id as collection_id,
    mp.name as collection_name,
    mp.visibility,
    mp.creator_id,
    creator.email as creator_email
FROM map_presets mp
LEFT JOIN profiles creator ON mp.creator_id = creator.id
ORDER BY mp.created_at DESC;