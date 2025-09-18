-- Analyze Relationship Invitations System (FINAL CORRECTED)
-- Copy and paste these queries into your Supabase SQL editor to understand the current state

-- 1. Check all pending relationship invitations
SELECT 
    pi.id,
    pi.email,
    pi.role,
    pi.status,
    pi.invited_by,
    pi.created_at,
    pi.metadata,
    pi.invitation_type,
    pi.custom_message,
    -- Inviter details
    inviter.full_name as inviter_name,
    inviter.email as inviter_email,
    inviter.role as inviter_role
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.invitation_type = 'relationship' OR pi.invitation_type IS NULL
ORDER BY pi.created_at DESC;

-- 2. Check relationship invitations by status
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM pending_invitations
WHERE invitation_type = 'relationship' OR invitation_type IS NULL
GROUP BY status
ORDER BY count DESC;

-- 3. Check what happens when invitations are accepted - relationships created
SELECT 
    ssr.id,
    ssr.student_id,
    ssr.supervisor_id,
    ssr.status,
    ssr.created_at,
    -- Student details
    student.full_name as student_name,
    student.email as student_email,
    student.role as student_role,
    -- Supervisor details
    supervisor.full_name as supervisor_name,
    supervisor.email as supervisor_email,
    supervisor.role as supervisor_role
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
ORDER BY ssr.created_at DESC
LIMIT 20;

-- 4. Check for automatic acceptance triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('pending_invitations', 'profiles')
ORDER BY event_object_table, trigger_name;

-- 5. Check if there are any automatic acceptance functions
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%invitation%' 
   OR routine_name LIKE '%accept%'
   OR routine_name LIKE '%relationship%'
ORDER BY routine_name;

-- 6. Check recent user signups and their relationship to invitations
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.created_at as profile_created,
    -- Check if they have any pending invitations
    pi.id as pending_invitation_id,
    pi.status as invitation_status,
    pi.invited_by,
    pi.created_at as invitation_created,
    -- Check if they have any relationships
    ssr.id as relationship_id,
    ssr.student_id,
    ssr.supervisor_id
FROM profiles p
LEFT JOIN pending_invitations pi ON LOWER(p.email) = LOWER(pi.email)
LEFT JOIN student_supervisor_relationships ssr ON (ssr.student_id = p.id OR ssr.supervisor_id = p.id)
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC;
