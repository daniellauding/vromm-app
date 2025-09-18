-- Create a simple test invitation to trigger the UnifiedInvitationModal
-- This will create a pending relationship invitation for daniel+student@lauding.se

-- 1. First, let's check if the user exists
SELECT 
    id,
    full_name,
    email,
    role
FROM profiles 
WHERE email = 'daniel+student@lauding.se';

-- 2. Create a test relationship invitation
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
    'daniel+student@lauding.se',
    'instructor',
    'pending',
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa',  -- daniel+handledare user ID
    NOW(),
    '{"custom_message": "Test invitation - would you like to be my instructor?"}'
);

-- 3. Verify the invitation was created
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
