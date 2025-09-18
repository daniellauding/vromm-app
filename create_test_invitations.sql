-- Create Test Invitations and Relationships
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
-- Replace the UUIDs with actual user IDs from your profiles table
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
    'daniel+flow@lauding.se',  -- Replace with target email
    'instructor',
    'pending',
    '5fa123ad-4717-40b6-8961-e397a8e1d33e',  -- Replace with inviter ID
    NOW(),
    '{"custom_message": "Would you like to be my instructor?"}'
);

-- 3. Create a test collection invitation
-- First, let's see what collections exist
SELECT 
    id,
    name,
    description,
    creator_id,
    created_at
FROM map_presets 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Create a test collection invitation
-- Replace the UUIDs with actual IDs from your tables
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
    'your-preset-id-here',  -- Replace with actual preset ID
    '5fa123ad-4717-40b6-8961-e397a8e1d33e',  -- Replace with invited user ID
    'your-inviter-id-here',  -- Replace with inviter user ID
    'member',
    'pending',
    'Would you like to join my collection?',
    NOW(),
    NOW() + INTERVAL '7 days'
);

-- 5. Check if we have any existing relationships
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

-- 6. Check if we have any collection memberships
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
