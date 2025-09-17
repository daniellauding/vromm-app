-- SQL queries to check collection sharing invitations and members

-- 1. Check all pending collection sharing invitations
SELECT 
    pi.id,
    pi.email,
    pi.status,
    pi.created_at,
    pi.updated_at,
    pi.metadata->>'collectionId' as collection_id,
    pi.metadata->>'collectionName' as collection_name,
    pi.metadata->>'targetUserName' as target_user_name,
    pi.metadata->>'sharingRole' as sharing_role,
    pi.metadata->>'customMessage' as custom_message,
    pi.invited_by,
    inviter.email as inviter_email,
    inviter.full_name as inviter_name
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.role = 'collection_sharing'
ORDER BY pi.created_at DESC;

-- 2. Check all collection members (accepted invitations)
SELECT 
    mpm.id,
    mpm.preset_id,
    mpm.user_id,
    mpm.role,
    mpm.joined_at,
    mpm.created_at,
    mpm.updated_at,
    p.email as member_email,
    p.full_name as member_name,
    mp.name as collection_name,
    mp.creator_id,
    creator.email as creator_email,
    creator.full_name as creator_name
FROM map_preset_members mpm
LEFT JOIN profiles p ON mpm.user_id = p.id
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles creator ON mp.creator_id = creator.id
ORDER BY mpm.joined_at DESC;

-- 3. Check specific collection invitations and members (replace 'YOUR_COLLECTION_ID' with actual ID)
-- SELECT 
--     'PENDING' as type,
--     pi.id,
--     pi.email,
--     pi.status,
--     pi.created_at,
--     pi.metadata->>'targetUserName' as target_user_name,
--     pi.metadata->>'sharingRole' as sharing_role,
--     pi.metadata->>'customMessage' as custom_message
-- FROM pending_invitations pi
-- WHERE pi.role = 'collection_sharing' 
--   AND pi.metadata->>'collectionId' = 'YOUR_COLLECTION_ID'
--   AND pi.status = 'pending'

-- UNION ALL

-- SELECT 
--     'ACCEPTED' as type,
--     mpm.id::text,
--     p.email,
--     'accepted' as status,
--     mpm.joined_at as created_at,
--     p.full_name as target_user_name,
--     mpm.role as sharing_role,
--     NULL as custom_message
-- FROM map_preset_members mpm
-- LEFT JOIN profiles p ON mpm.user_id = p.id
-- WHERE mpm.preset_id = 'YOUR_COLLECTION_ID'
-- ORDER BY created_at DESC;

-- 4. Check all collections with their invitation counts
SELECT 
    mp.id as collection_id,
    mp.name as collection_name,
    mp.creator_id,
    creator.email as creator_email,
    creator.full_name as creator_name,
    COUNT(DISTINCT pi.id) as pending_invitations,
    COUNT(DISTINCT mpm.id) as accepted_members
FROM map_presets mp
LEFT JOIN profiles creator ON mp.creator_id = creator.id
LEFT JOIN pending_invitations pi ON mp.id::text = pi.metadata->>'collectionId' 
    AND pi.role = 'collection_sharing' 
    AND pi.status = 'pending'
LEFT JOIN map_preset_members mpm ON mp.id = mpm.preset_id
GROUP BY mp.id, mp.name, mp.creator_id, creator.email, creator.full_name
ORDER BY mp.created_at DESC;

-- 5. Check invitations sent by specific user (replace 'YOUR_USER_ID' with actual ID)
-- SELECT 
--     pi.id,
--     pi.email,
--     pi.status,
--     pi.created_at,
--     pi.metadata->>'collectionId' as collection_id,
--     pi.metadata->>'collectionName' as collection_name,
--     pi.metadata->>'targetUserName' as target_user_name,
--     pi.metadata->>'sharingRole' as sharing_role,
--     pi.metadata->>'customMessage' as custom_message
-- FROM pending_invitations pi
-- WHERE pi.role = 'collection_sharing'
--   AND pi.invited_by = 'YOUR_USER_ID'
-- ORDER BY pi.created_at DESC;

-- 6. Check if map_preset_members table has proper foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'map_preset_members';

-- 7. Check table structure for map_preset_members
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'map_preset_members' 
ORDER BY ordinal_position;
