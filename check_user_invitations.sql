-- Check Invitations for Specific Users
-- Let's see what invitations exist for the users you mentioned

-- 1. Check user details
SELECT 
    id,
    full_name,
    email,
    role,
    created_at
FROM profiles 
WHERE id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY created_at DESC;

-- 2. Check pending relationship invitations for these users
SELECT 
    pi.id,
    pi.email,
    pi.role,
    pi.status,
    pi.invited_by,
    pi.created_at,
    pi.metadata,
    -- Inviter details
    inviter.full_name as inviter_name,
    inviter.email as inviter_email
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.email IN (
    SELECT email FROM profiles 
    WHERE id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'c16a364f-3bc4-4d60-bca9-460e977fddea')
)
ORDER BY pi.created_at DESC;

-- 3. Check collection invitations for these users
SELECT 
    ci.id,
    ci.preset_id,
    ci.invited_user_id,
    ci.invited_by_user_id,
    ci.role,
    ci.status,
    ci.message,
    ci.created_at,
    -- Collection details
    mp.name as collection_name,
    mp.creator_id as collection_creator_id,
    -- Invited user details
    invited_user.full_name as invited_user_name,
    invited_user.email as invited_user_email,
    -- Inviter details
    inviter.full_name as inviter_name,
    inviter.email as inviter_email
FROM collection_invitations ci
LEFT JOIN map_presets mp ON ci.preset_id = mp.id
LEFT JOIN profiles invited_user ON ci.invited_user_id = invited_user.id
LEFT JOIN profiles inviter ON ci.invited_by_user_id = inviter.id
WHERE ci.invited_user_id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY ci.created_at DESC;

-- 4. Check if there are any existing relationships for these users
SELECT 
    ssr.id,
    ssr.student_id,
    ssr.supervisor_id,
    ssr.status,
    ssr.created_at,
    student.full_name as student_name,
    student.email as student_email,
    supervisor.full_name as supervisor_name,
    supervisor.email as supervisor_email
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
WHERE ssr.student_id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'c16a364f-3bc4-4d60-bca9-460e977fddea')
   OR ssr.supervisor_id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY ssr.created_at DESC;

-- 5. Check collection memberships for these users
SELECT 
    mpm.id,
    mpm.preset_id,
    mpm.user_id,
    mpm.role,
    mpm.created_at,
    mp.name as collection_name,
    member.full_name as member_name,
    member.email as member_email
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles member ON mpm.user_id = member.id
WHERE mpm.user_id IN ('06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY mpm.created_at DESC;
