-- Comprehensive SQL queries to debug collection sharing status
-- Run these queries to understand why users aren't showing up in AddToPresetSheet

-- 0. Check enum values for pending_invitations.role
SELECT 
    '=== ENUM VALUES FOR PENDING_INVITATIONS.ROLE ===' as section,
    unnest(enum_range(NULL::user_role)) as role_value;

-- 0.1. Check what roles actually exist in pending_invitations
SELECT 
    '=== ACTUAL ROLES IN PENDING_INVITATIONS ===' as section,
    role,
    COUNT(*) as count
FROM pending_invitations 
GROUP BY role
ORDER BY count DESC;

-- 1. Check all collections and their basic info
SELECT 
    '=== ALL COLLECTIONS ===' as section,
    mp.id as collection_id,
    mp.name as collection_name,
    mp.visibility,
    mp.creator_id,
    creator.email as creator_email,
    creator.full_name as creator_name,
    mp.created_at,
    mp.updated_at
FROM map_presets mp
LEFT JOIN profiles creator ON mp.creator_id = creator.id
ORDER BY mp.created_at DESC;

-- 2. Check all pending invitations (collection sharing)
SELECT 
    '=== PENDING COLLECTION INVITATIONS ===' as section,
    pi.id as invitation_id,
    pi.email as invited_email,
    pi.status,
    pi.role,
    pi.invited_by,
    inviter.email as inviter_email,
    pi.created_at,
    pi.metadata->>'collectionId' as collection_id,
    pi.metadata->>'collectionName' as collection_name,
    pi.metadata->>'sharingRole' as sharing_role,
    pi.metadata->>'targetUserId' as target_user_id,
    pi.metadata->>'targetUserName' as target_user_name,
    pi.metadata->>'invitationType' as invitation_type
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.role = 'collection_sharing'
ORDER BY pi.created_at DESC;

-- 3. Check all collection members (accepted invitations)
SELECT 
    '=== COLLECTION MEMBERS (ACCEPTED) ===' as section,
    mpm.id as member_id,
    mpm.preset_id as collection_id,
    mp.name as collection_name,
    mpm.user_id,
    p.email as member_email,
    p.full_name as member_name,
    mpm.role as member_role,
    mpm.joined_at,
    mpm.created_at,
    mpm.updated_at
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles p ON mpm.user_id = p.id
ORDER BY mpm.joined_at DESC;

-- 4. Check specific collection "Bjuder in till kartan" (from your logs)
SELECT 
    '=== SPECIFIC COLLECTION: Bjuder in till kartan ===' as section,
    mp.id as collection_id,
    mp.name as collection_name,
    mp.visibility,
    mp.creator_id,
    creator.email as creator_email
FROM map_presets mp
LEFT JOIN profiles creator ON mp.creator_id = creator.id
WHERE mp.name = 'Bjuder in till kartan' OR mp.id = '47e86765-c619-4be5-94cf-bd499b8faee1';

-- 5. Check pending invitations for "Bjuder in till kartan"
SELECT 
    '=== PENDING INVITATIONS FOR BJUDER IN TILL KARTAN ===' as section,
    pi.id as invitation_id,
    pi.email as invited_email,
    pi.status,
    pi.role,
    pi.invited_by,
    inviter.email as inviter_email,
    pi.created_at,
    pi.metadata->>'collectionId' as collection_id,
    pi.metadata->>'collectionName' as collection_name,
    pi.metadata->>'sharingRole' as sharing_role,
    pi.metadata->>'targetUserId' as target_user_id,
    pi.metadata->>'targetUserName' as target_user_name
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE (pi.metadata->>'collectionId' = '47e86765-c619-4be5-94cf-bd499b8faee1' 
       OR pi.metadata->>'collectionName' = 'Bjuder in till kartan')
  AND pi.role = 'collection_sharing'
ORDER BY pi.created_at DESC;

-- 6. Check members for "Bjuder in till kartan"
SELECT 
    '=== MEMBERS FOR BJUDER IN TILL KARTAN ===' as section,
    mpm.id as member_id,
    mpm.preset_id as collection_id,
    mp.name as collection_name,
    mpm.user_id,
    p.email as member_email,
    p.full_name as member_name,
    mpm.role as member_role,
    mpm.joined_at
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles p ON mpm.user_id = p.id
WHERE mpm.preset_id = '47e86765-c619-4be5-94cf-bd499b8faee1'
ORDER BY mpm.joined_at DESC;

-- 7. Check your user profile
SELECT 
    '=== YOUR USER PROFILE ===' as section,
    p.id as user_id,
    p.email,
    p.full_name,
    p.role,
    p.created_at
FROM profiles p
WHERE p.id = '5ee16b4f-5ef9-41bd-b571-a9dc895027c1';

-- 8. Check all notifications related to collection sharing
SELECT 
    '=== COLLECTION SHARING NOTIFICATIONS ===' as section,
    n.id as notification_id,
    n.user_id,
    n.actor_id,
    n.type,
    n.title,
    n.message,
    n.metadata->>'collection_id' as collection_id,
    n.metadata->>'collection_name' as collection_name,
    n.metadata->>'invitation_id' as invitation_id,
    n.metadata->>'from_user_id' as from_user_id,
    n.metadata->>'sharingRole' as sharing_role,
    n.created_at,
    n.is_read
FROM notifications n
WHERE n.type = 'collection_invitation'
ORDER BY n.created_at DESC;

-- 9. Summary of collection sharing status
SELECT 
    '=== COLLECTION SHARING SUMMARY ===' as section,
    mp.name as collection_name,
    mp.id as collection_id,
    mp.visibility,
    creator.email as creator_email,
    COUNT(DISTINCT pi.id) as pending_invitations,
    COUNT(DISTINCT mpm.id) as accepted_members,
    COUNT(DISTINCT CASE WHEN pi.status = 'pending' THEN pi.id END) as pending_count,
    COUNT(DISTINCT CASE WHEN pi.status = 'accepted' THEN pi.id END) as accepted_count,
    COUNT(DISTINCT CASE WHEN pi.status = 'rejected' THEN pi.id END) as rejected_count
FROM map_presets mp
LEFT JOIN profiles creator ON mp.creator_id = creator.id
LEFT JOIN pending_invitations pi ON (pi.metadata->>'collectionId' = mp.id::text OR pi.metadata->>'collectionName' = mp.name)
LEFT JOIN map_preset_members mpm ON mpm.preset_id = mp.id
WHERE mp.visibility IN ('shared', 'public')
GROUP BY mp.id, mp.name, mp.visibility, creator.email
ORDER BY mp.created_at DESC;

-- 10. Check for any data inconsistencies
SELECT 
    '=== DATA INCONSISTENCIES CHECK ===' as section,
    'Pending invitations with NULL collectionId' as issue,
    COUNT(*) as count
FROM pending_invitations 
WHERE role = 'collection_sharing' 
  AND (metadata->>'collectionId' IS NULL OR metadata->>'collectionId' = '')

UNION ALL

SELECT 
    '=== DATA INCONSISTENCIES CHECK ===' as section,
    'Pending invitations with invalid collectionId' as issue,
    COUNT(*) as count
FROM pending_invitations pi
LEFT JOIN map_presets mp ON pi.metadata->>'collectionId' = mp.id::text
WHERE pi.role = 'collection_sharing' 
  AND pi.metadata->>'collectionId' IS NOT NULL 
  AND mp.id IS NULL

UNION ALL

SELECT 
    '=== DATA INCONSISTENCIES CHECK ===' as section,
    'Members without corresponding presets' as issue,
    COUNT(*) as count
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
WHERE mp.id IS NULL;
