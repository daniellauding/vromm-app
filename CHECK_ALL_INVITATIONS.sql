-- CHECK ALL INVITATION TYPES IN NOTIFICATIONS

-- 1. Check all invitation-related notifications
SELECT 'All invitation notifications:' as info;
SELECT 
    id, 
    type, 
    message,
    metadata->>'collection_id' as collection_id,
    metadata->>'sharingRole' as sharing_role,
    metadata->>'from_user_name' as from_user_name,
    metadata->>'relationshipType' as relationship_type,
    metadata->>'invitation_id' as invitation_id,
    created_at
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  AND type IN ('collection_invitation', 'student_invitation', 'supervisor_invitation', 'event_invitation')
ORDER BY created_at DESC;

-- 2. Check for collection invitations specifically
SELECT 'Collection invitations:' as info;
SELECT 
    id, 
    type, 
    metadata->>'collection_id' as collection_id,
    metadata->>'sharingRole' as sharing_role,
    metadata->>'from_user_name' as from_user_name,
    metadata
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  AND type = 'collection_invitation';

-- 3. Check for relationship invitations
SELECT 'Relationship invitations:' as info;
SELECT 
    id, 
    type, 
    message,
    metadata->>'relationshipType' as relationship_type,
    metadata->>'from_user_name' as from_user_name,
    metadata->>'invitation_id' as invitation_id,
    metadata
FROM notifications 
WHERE user_id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
  AND type IN ('student_invitation', 'supervisor_invitation', 'event_invitation');

-- 4. Check what's in pending_invitations table
SELECT 'Pending invitations table:' as info;
SELECT 
    id,
    email,
    role,
    status,
    invited_by,
    metadata
FROM pending_invitations 
WHERE invited_by = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1'
ORDER BY created_at DESC;
