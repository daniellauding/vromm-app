-- Analyze Collection Invitations System (FINAL WORKING)
-- Copy and paste these queries into your Supabase SQL editor to understand the current state

-- 1. Check all collection invitations
SELECT 
    ci.id,
    ci.preset_id,
    ci.invited_user_id,
    ci.invited_by_user_id,
    ci.role,
    ci.status,
    ci.message,
    ci.created_at,
    ci.responded_at,
    ci.expires_at,
    -- Collection details
    mp.name as collection_name,
    mp.description as collection_description,
    mp.creator_id as collection_creator_id,
    -- Invited user details
    invited_user.full_name as invited_user_name,
    invited_user.email as invited_user_email,
    invited_user.role as invited_user_role,
    -- Inviter details
    inviter.full_name as inviter_name,
    inviter.email as inviter_email,
    inviter.role as inviter_role
FROM collection_invitations ci
LEFT JOIN map_presets mp ON ci.preset_id = mp.id
LEFT JOIN profiles invited_user ON ci.invited_user_id = invited_user.id
LEFT JOIN profiles inviter ON ci.invited_by_user_id = inviter.id
ORDER BY ci.created_at DESC;

-- 2. Check collection invitations by status
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM collection_invitations
GROUP BY status
ORDER BY count DESC;

-- 3. Check what happens when collection invitations are accepted - members added
SELECT 
    mpm.id,
    mpm.preset_id,
    mpm.user_id,
    mpm.role,
    mpm.created_at,
    -- Collection details
    mp.name as collection_name,
    mp.creator_id as collection_creator_id,
    -- Member details
    member.full_name as member_name,
    member.email as member_email,
    member.role as member_role
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles member ON mpm.user_id = member.id
WHERE mpm.created_at > NOW() - INTERVAL '7 days'
ORDER BY mpm.created_at DESC
LIMIT 20;

-- 4. Check for automatic collection invitation acceptance triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('collection_invitations', 'map_preset_members')
ORDER BY event_object_table, trigger_name;

-- 5. Check if there are any automatic collection acceptance functions
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%collection%' 
   OR routine_name LIKE '%invitation%'
   OR routine_name LIKE '%preset%'
ORDER BY routine_name;

-- 6. Check recent collection invitations and their outcomes
SELECT 
    ci.id as invitation_id,
    ci.status as invitation_status,
    ci.created_at as invitation_created,
    ci.responded_at as invitation_responded,
    mp.name as collection_name,
    invited_user.full_name as invited_user_name,
    inviter.full_name as inviter_name,
    -- Check if user is now a member
    CASE 
        WHEN mpm.id IS NOT NULL THEN 'YES - Member'
        ELSE 'NO - Not Member'
    END as is_collection_member,
    mpm.role as member_role,
    mpm.created_at as member_since
FROM collection_invitations ci
LEFT JOIN map_presets mp ON ci.preset_id = mp.id
LEFT JOIN profiles invited_user ON ci.invited_user_id = invited_user.id
LEFT JOIN profiles inviter ON ci.invited_by_user_id = inviter.id
LEFT JOIN map_preset_members mpm ON (mpm.preset_id = ci.preset_id AND mpm.user_id = ci.invited_user_id)
WHERE ci.created_at > NOW() - INTERVAL '7 days'
ORDER BY ci.created_at DESC;

-- 7. Check for any automatic acceptance patterns
SELECT 
    'Automatic Acceptance Check' as analysis_type,
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN status = 'accepted' AND responded_at IS NULL THEN 1 END) as auto_accepted,
    COUNT(CASE WHEN status = 'accepted' AND responded_at IS NOT NULL THEN 1 END) as manually_accepted,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as still_pending,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined
FROM collection_invitations
WHERE created_at > NOW() - INTERVAL '7 days';
