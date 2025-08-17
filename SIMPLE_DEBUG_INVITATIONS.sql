-- Simple debug script to find hidden invitations (no updated_at references)
-- Run this to see what's blocking your invitation

-- 1. Check ALL pending invitations from supervisor to student
SELECT 'PENDING INVITATIONS FROM SUPERVISOR TO STUDENT:' as info;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / 3600 as hours_old,
  pi.metadata->>'relationshipType' as relationship_type
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
ORDER BY pi.created_at DESC;

-- 2. Check if relationship already exists
SELECT 'EXISTING RELATIONSHIPS:' as info;
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
WHERE (ssr.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND ssr.supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (ssr.student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND ssr.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY ssr.created_at DESC;

-- 3. Check related notifications
SELECT 'RELATED NOTIFICATIONS:' as info;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.is_read,
  n.created_at,
  n.metadata->>'invitation_id' as invitation_id
FROM notifications n
WHERE n.type = 'student_invitation'
  AND n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'
  AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
ORDER BY n.created_at DESC;

-- 4. QUICK FIX: Cancel old pending invitations (older than 1 hour) to allow new ones
UPDATE pending_invitations 
SET 
  status = 'cancelled',
  updated_at = NOW()
WHERE invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND email = 'daniel+student@lauding.se'
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';

-- 5. Show what's left
SELECT 'AFTER CLEANUP - REMAINING PENDING:' as info;
SELECT 
  pi.id,
  pi.email,
  pi.status,
  pi.created_at,
  EXTRACT(EPOCH FROM (NOW() - pi.created_at)) / 3600 as hours_old
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
ORDER BY pi.created_at DESC;

SELECT 'DEBUG COMPLETE - You should now be able to send invitation!' as result;
