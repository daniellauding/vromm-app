-- Create Test Invitations to Test the Unified Invitation Modal
-- Run these queries to create test data for testing the unified invitation modal

-- 1. First, let's see what users we have available
SELECT 
    id,
    full_name,
    email,
    role,
    created_at
FROM profiles 
WHERE role IN ('student', 'instructor', 'admin')
ORDER BY created_at DESC
LIMIT 10;

-- 2. Create a test relationship invitation (student inviting instructor)
-- This will create an invitation for daniel+student@lauding.se to be invited by daniel+handledare@lauding.se
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
    'daniel+student@lauding.se',  -- Target email (the student)
    'instructor',
    'pending',
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa',  -- Inviter ID (daniel+handledare@lauding.se)
    NOW(),
    '{"custom_message": "Would you like to be my instructor? I need help with my driving lessons."}'
);

-- 3. Create another test relationship invitation (instructor inviting student)
-- This will create an invitation for daniel+handledare@lauding.se to be invited by daniel+student@lauding.se
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
    'daniel+handledare@lauding.se',  -- Target email (the instructor)
    'student',
    'pending',
    'c16a364f-3bc4-4d60-bca9-460e977fddea',  -- Inviter ID (daniel+student@lauding.se)
    NOW(),
    '{"custom_message": "Would you like to be my student? I need a driving instructor."}'
);

-- 4. Let's see what collections exist to create collection invitations
SELECT 
    id,
    name,
    description,
    creator_id,
    created_at
FROM map_presets 
ORDER BY created_at DESC
LIMIT 5;

-- 5. Create a test collection invitation
-- Replace 'your-preset-id-here' with an actual preset ID from the query above
INSERT INTO collection_invitations (
    id,
    preset_id,
    invited_user_id,
    invited_by_user_id,
    role,
    status,
    message,
    created_at,
    expires_at
) VALUES (
    gen_random_uuid(),
    'your-preset-id-here',  -- Replace with actual preset ID from step 4
    'c16a364f-3bc4-4d60-bca9-460e977fddea',  -- Invited user ID (daniel+student@lauding.se)
    '06c73e75-0ef7-442b-acd0-ee204f83d1aa',  -- Inviter user ID (daniel+handledare@lauding.se)
    'member',
    'pending',
    'Would you like to join my driving practice collection?',
    NOW(),
    NOW() + INTERVAL '7 days'
);

-- 6. Check if we have any existing relationships
SELECT 
    ssr.id,
    ssr.student_id,
    ssr.supervisor_id,
    ssr.status,
    ssr.created_at,
    student.full_name as student_name,
    supervisor.full_name as supervisor_name
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
ORDER BY ssr.created_at DESC;

-- 7. Check if we have any collection memberships
SELECT 
    mpm.id,
    mpm.preset_id,
    mpm.user_id,
    mpm.role,
    mpm.created_at,
    mp.name as collection_name,
    member.full_name as member_name
FROM map_preset_members mpm
LEFT JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles member ON mpm.user_id = member.id
ORDER BY mpm.created_at DESC;
