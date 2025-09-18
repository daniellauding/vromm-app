-- Test Invitation Modal - Simple Test
-- Run this to create a test invitation and see the modal

-- 1. Create a test relationship invitation
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
    'daniel+student@lauding.se',  -- Target email
    'instructor',
    'pending',
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa',  -- Inviter ID
    NOW(),
    '{"custom_message": "Test invitation - would you like to be my instructor?"}'
);

-- 2. Check if the invitation was created
SELECT 
    id,
    email,
    role,
    status,
    invited_by,
    created_at,
    metadata
FROM pending_invitations 
WHERE email = 'daniel+student@lauding.se' 
AND status = 'pending'
ORDER BY created_at DESC;
