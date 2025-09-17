-- Test script to create a fresh collection sharing invitation
-- Run this after flushing to test the invitation flow

-- 1. Create a test collection sharing invitation
INSERT INTO pending_invitations (
    email,
    role,
    invited_by,
    metadata,
    status
) VALUES (
    'test@example.com',  -- Replace with actual email
    'collection_sharing',
    '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',  -- Your user ID
    jsonb_build_object(
        'collectionId', '47e86765-c619-4be5-94cf-bd499b8faee1',
        'collectionName', 'Bjuder in till kartan',
        'inviterName', 'daniellauding@instinctly.com',
        'customMessage', 'Test invitation',
        'invitedAt', NOW()::text,
        'targetUserId', '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',
        'targetUserName', 'Test User',
        'invitationType', 'collection_sharing',
        'sharingRole', 'viewer'
    ),
    'pending'
);

-- 2. Create a test notification
INSERT INTO notifications (
    user_id,
    actor_id,
    type,
    title,
    message,
    metadata,
    action_url,
    priority,
    is_read
) VALUES (
    '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',  -- Target user ID
    '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',  -- Your user ID
    'collection_invitation',
    'Collection Sharing Invitation',
    'daniellauding@instinctly.com wants to share the collection "Bjuder in till kartan" with you',
    jsonb_build_object(
        'collection_name', 'Bjuder in till kartan',
        'collection_id', '47e86765-c619-4be5-94cf-bd499b8faee1',
        'invitation_id', (SELECT id FROM pending_invitations WHERE email = 'test@example.com' AND role = 'collection_sharing' ORDER BY created_at DESC LIMIT 1),
        'from_user_id', '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',
        'from_user_name', 'daniellauding@instinctly.com',
        'customMessage', 'Test invitation',
        'sharingRole', 'viewer'
    ),
    'vromm://notifications',
    'high',
    false
);

-- 3. Verify the test invitation was created
SELECT 
    '=== TEST INVITATION CREATED ===' as section,
    pi.id as invitation_id,
    pi.email as invited_email,
    pi.status,
    pi.role,
    pi.invited_by,
    pi.created_at,
    pi.metadata->>'collectionId' as collection_id,
    pi.metadata->>'collectionName' as collection_name,
    pi.metadata->>'sharingRole' as sharing_role
FROM pending_invitations pi
WHERE pi.email = 'test@example.com' 
  AND pi.role = 'collection_sharing'
ORDER BY pi.created_at DESC;

-- 4. Verify the test notification was created
SELECT 
    '=== TEST NOTIFICATION CREATED ===' as section,
    n.id as notification_id,
    n.user_id,
    n.actor_id,
    n.type,
    n.title,
    n.message,
    n.metadata->>'collection_id' as collection_id,
    n.metadata->>'collection_name' as collection_name,
    n.metadata->>'invitation_id' as invitation_id,
    n.created_at,
    n.is_read
FROM notifications n
WHERE n.type = 'collection_invitation'
  AND n.user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
ORDER BY n.created_at DESC;
