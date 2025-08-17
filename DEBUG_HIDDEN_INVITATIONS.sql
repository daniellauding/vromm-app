-- Debug hidden invitations between specific users
-- This will show ALL invitations between the two users and why they might be hidden

-- User IDs from your message:
-- Supervisor (inviter): 06c73e75-0ef7-442b-acd0-ee204f83d1aa (daniel+handledare@lauding.se)
-- Student (invitee): c16a364f-3bc4-4d60-bca9-460e977fddea (daniel+student@lauding.se)

-- 1. Show ALL pending invitations for the student email
SELECT 'ALL PENDING INVITATIONS FOR STUDENT EMAIL:' as debug_section;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.updated_at,
  pi.accepted_at,
  pi.accepted_by,
  pi.metadata->>'relationshipType' as relationship_type,
  pi.metadata->>'supervisorName' as supervisor_name,
  inviter.full_name as inviter_name,
  inviter.email as inviter_email,
  inviter.role as inviter_role
FROM pending_invitations pi
LEFT JOIN profiles inviter ON pi.invited_by = inviter.id
WHERE pi.email = 'daniel+student@lauding.se'
ORDER BY pi.created_at DESC;

-- 2. Show ALL invitations FROM the supervisor TO the student
SELECT 'INVITATIONS FROM SUPERVISOR TO STUDENT:' as debug_section;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.updated_at,
  pi.metadata->>'relationshipType' as relationship_type,
  CASE 
    WHEN pi.status = 'pending' THEN '🟡 PENDING'
    WHEN pi.status = 'accepted' THEN '🟢 ACCEPTED' 
    WHEN pi.status = 'rejected' THEN '🔴 REJECTED'
    WHEN pi.status = 'cancelled' THEN '⚫ CANCELLED'
    ELSE '❓ ' || pi.status
  END as status_display
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
ORDER BY pi.created_at DESC;

-- 3. Check existing relationships between these users
SELECT 'EXISTING RELATIONSHIPS:' as debug_section;
SELECT 
  ssr.id,
  ssr.student_id,
  ssr.supervisor_id,
  ssr.status,
  ssr.created_at,
  ssr.updated_at,
  student.full_name as student_name,
  student.email as student_email,
  supervisor.full_name as supervisor_name,
  supervisor.email as supervisor_email,
  CASE 
    WHEN ssr.status = 'active' THEN '🟢 ACTIVE'
    WHEN ssr.status = 'inactive' THEN '🟡 INACTIVE'
    ELSE '❓ ' || ssr.status
  END as status_display
FROM student_supervisor_relationships ssr
LEFT JOIN profiles student ON ssr.student_id = student.id
LEFT JOIN profiles supervisor ON ssr.supervisor_id = supervisor.id
WHERE (ssr.student_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND ssr.supervisor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
   OR (ssr.student_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND ssr.supervisor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea')
ORDER BY ssr.created_at DESC;

-- 4. Check notifications for these invitations
SELECT 'RELATED NOTIFICATIONS:' as debug_section;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  n.metadata->>'invitation_id' as invitation_id,
  CASE 
    WHEN n.is_read THEN '📖 READ'
    ELSE '📩 UNREAD'
  END as read_status
FROM notifications n
WHERE n.type IN ('student_invitation', 'supervisor_invitation')
  AND ((n.user_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea' AND n.actor_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa')
    OR (n.user_id = '06c73e75-0ef7-442b-acd0-ee204f83d1aa' AND n.actor_id = 'c16a364f-3bc4-4d60-bca9-460e977fddea'))
ORDER BY n.created_at DESC;

-- 5. Find the MOST RECENT pending invitation that's causing the "already sent" message
SELECT 'MOST RECENT PENDING INVITATION:' as debug_section;
SELECT 
  pi.id,
  pi.email,
  pi.invited_by,
  pi.status,
  pi.created_at,
  pi.metadata,
  '⚠️ THIS IS LIKELY THE HIDDEN INVITATION' as warning
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
ORDER BY pi.created_at DESC
LIMIT 1;

-- 6. Check if there are duplicate invitations that should be cleaned up
SELECT 'DUPLICATE PENDING INVITATIONS:' as debug_section;
SELECT 
  COUNT(*) as duplicate_count,
  pi.invited_by,
  pi.email,
  pi.status,
  'These duplicates should be cleaned up' as action_needed
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending'
GROUP BY pi.invited_by, pi.email, pi.status
HAVING COUNT(*) > 1;

-- 7. Show what the UI queries are actually returning
SELECT 'WHAT UI SHOULD SEE (ProfileScreen checkForPendingInvitations):' as debug_section;
SELECT 
  pi.id,
  pi.invited_by,
  pi.email,
  pi.status,
  pi.created_at,
  'This is what ProfileScreen.checkForPendingInvitations sees' as note
FROM pending_invitations pi
WHERE pi.email = 'daniel+student@lauding.se'
  AND pi.status = 'pending';

-- 8. Show what RelationshipManagementModal should see
SELECT 'WHAT RELATIONSHIP MODAL SHOULD SEE (getPendingInvitations):' as debug_section;
SELECT 
  pi.id,
  pi.email,
  pi.role,
  pi.status,
  pi.created_at,
  pi.invited_by,
  'This is what RelationshipManagementModal.loadPendingInvitations sees' as note
FROM pending_invitations pi
WHERE pi.invited_by = '06c73e75-0ef7-442b-acd0-ee204f83d1aa'
  AND pi.status = 'pending';

SELECT '🔍 DEBUG COMPLETE - Check the results above to find the hidden invitation!' as summary;
