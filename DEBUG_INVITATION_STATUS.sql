-- Debug invitation system status
-- Run these queries to understand the current state

-- 1. Check all pending invitations for specific user
SELECT 
    pi.*,
    inviter.full_name as inviter_name,
    inviter.email as inviter_email
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.email = 'daniel+student@lauding.se'
ORDER BY pi.created_at DESC;

-- 2. Check existing student-supervisor relationships
SELECT 
    ssr.*,
    student.full_name as student_name,
    student.email as student_email,
    supervisor.full_name as supervisor_name,
    supervisor.email as supervisor_email
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
WHERE student.email = 'daniel+student@lauding.se' 
   OR supervisor.email = 'daniel+student@lauding.se'
ORDER BY ssr.created_at DESC;

-- 3. Check notifications for invitations
SELECT 
    n.*,
    actor.full_name as actor_name,
    actor.email as actor_email
FROM notifications n
LEFT JOIN profiles actor ON n.actor_id = actor.id
WHERE n.type IN ('supervisor_invitation', 'student_invitation')
  AND (n.user_id = (SELECT id FROM profiles WHERE email = 'daniel+student@lauding.se')
       OR n.actor_id = (SELECT id FROM profiles WHERE email = 'daniel+student@lauding.se'))
ORDER BY n.created_at DESC;

-- 4. Check if accept_invitation RPC function exists
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%invitation%';

-- 5. Check function parameters
SELECT 
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
  AND r.routine_name LIKE '%invitation%'
ORDER BY r.routine_name, p.ordinal_position;

-- 6. Clean up duplicate pending invitations (run this to clean up)
-- DELETE FROM pending_invitations 
-- WHERE id NOT IN (
--     SELECT DISTINCT ON (email, invited_by, status) id
--     FROM pending_invitations
--     WHERE status = 'pending'
--     ORDER BY email, invited_by, status, created_at DESC
-- ) AND status = 'pending';

-- 7. Check for orphaned notifications (notifications without valid invitation_id)
SELECT 
    n.*,
    CASE 
        WHEN pi.id IS NULL THEN 'ORPHANED - No matching invitation'
        ELSE 'VALID'
    END as validation_status
FROM notifications n
LEFT JOIN pending_invitations pi ON (n.metadata->>'invitation_id')::uuid = pi.id
WHERE n.type IN ('supervisor_invitation', 'student_invitation')
ORDER BY n.created_at DESC;
