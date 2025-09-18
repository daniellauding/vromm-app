-- Test Unified Invitation Modal - Debug Version
-- This will create a test invitation and help us debug why the modal isn't showing

-- 1. First, let's check what users exist
SELECT 
    id,
    full_name,
    email,
    role,
    created_at
FROM profiles 
WHERE email IN ('daniel+student@lauding.se', 'daniel+handledare@lauding.se')
ORDER BY created_at DESC;

-- 2. Create a test relationship invitation for the student
-- This should trigger the UnifiedInvitationModal when daniel+student@lauding.se logs in
INSERT INTO pending_invitations (
    id,
    email,
    role,
    status,
    invited_by,
    created_at,
    metadata
) VALUES (
    gen_random_uuid(),
    'daniel+student@lauding.se',  -- Target: student user
    'instructor',                 -- Role: student will become instructor
    'pending',
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa',  -- Inviter: daniel+handledare
    NOW(),
    '{"custom_message": "Test invitation - would you like to be my instructor?"}'
);

-- 3. Create a test collection invitation for the student
-- First, let's find a collection to invite them to
SELECT 
    id,
    name,
    creator_id
FROM map_presets 
WHERE creator_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'  -- daniel+handledare's collections
LIMIT 1;

-- 4. Insert collection invitation (replace YOUR_COLLECTION_ID with actual ID from step 3)
-- INSERT INTO collection_invitations (
--     id,
--     preset_id,
--     invited_user_id,
--     invited_by_user_id,
--     role,
--     status,
--     message,
--     created_at,
--     expires_at
-- ) VALUES (
--     gen_random_uuid(),
--     'YOUR_COLLECTION_ID_HERE',  -- Replace with actual collection ID
--     'c16a364f-3bc4-4d60-bca9-460e977fddea',  -- daniel+student user ID
--     '06c73e75-0ef7-442b-acd0-ee204f83d1aa',  -- daniel+handledare user ID
--     'member',
--     'pending',
--     'Join my awesome driving collection!',
--     NOW(),
--     NOW() + INTERVAL '7 days'
-- );

-- 5. Check what invitations exist for the student
SELECT 
    'RELATIONSHIP' as invitation_type,
    pi.id,
    pi.email,
    pi.role,
    pi.status,
    pi.invited_by,
    pi.created_at,
    pi.metadata::text as metadata,
    inviter.full_name as inviter_name,
    inviter.email as inviter_email
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.email = 'daniel+student@lauding.se'
AND pi.status = 'pending'

UNION ALL

SELECT 
    'COLLECTION' as invitation_type,
    ci.id,
    invited_user.email as email,
    ci.role,
    ci.status,
    ci.invited_by_user_id as invited_by,
    ci.created_at,
    ci.message as metadata,
    inviter.full_name as inviter_name,
    inviter.email as inviter_email
FROM collection_invitations ci
LEFT JOIN profiles invited_user ON ci.invited_user_id = invited_user.id
LEFT JOIN profiles inviter ON ci.invited_by_user_id = inviter.id
WHERE invited_user.email = 'daniel+student@lauding.se'
AND ci.status = 'pending'
ORDER BY created_at DESC;
